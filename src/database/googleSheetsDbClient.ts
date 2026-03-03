import { google, sheets_v4 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { Keys } from '../utils/values/keys.js';
import { configService, ConfigurationService } from '../services/configurationService.js';
import { BaseService } from '../infrastructure/base/baseService.js';
import { CacheService } from '../cache/cacheService.js';
import { DateHelpers } from '../utils/nativeDateTimeHelpers.js';
import { Admin } from '../models/shared/admin.js';
import { Instructor } from '../models/shared/instructor.js';
import { Parent } from '../models/shared/parent.js';
import { Student } from '../models/shared/student.js';
import { Class } from '../models/shared/class.js';
import { Room } from '../models/shared/room.js';
import { Registration } from '../models/shared/registration.js';
import { AttendanceRecord as AttendanceRecordModel } from '../models/shared/attendanceRecord.js';
import { DropRequest } from '../models/shared/dropRequest.js';
import { PERIOD_COLUMNS } from '../repositories/periodRepository.js';

/** Minimal per-sheet configuration referencing a model's column schema */
export interface SheetConfig {
  sheet: string;
  startRow: number;
  columns: readonly string[];
  mappings?: FieldMapping;
}

/** Per-field mapping applied after rowToObject, before data reaches the model */
export type FieldMapping = Record<string, (value: string, row: Record<string, string>) => unknown>;

/** Convert a positional string[] row to a named Record using a column schema */
export function rowToObject(row: string[], columns: readonly string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < columns.length; i++) {
    obj[columns[i]] = i < row.length ? (row[i] ?? '') : '';
  }
  return obj;
}

/** Convert a named Record back to a positional string[] row using a column schema.
 *  Date instances are serialized to ISO-8601 for predictable round-tripping. */
export function objectToRow(obj: Record<string, unknown>, columns: readonly string[]): string[] {
  const row: string[] = new Array(columns.length).fill('');
  for (let i = 0; i < columns.length; i++) {
    const val = obj[columns[i]];
    if (val == null) {
      row[i] = '';
    } else if (val instanceof Date) {
      row[i] = val.toISOString();
    } else {
      row[i] = String(val);
    }
  }
  return row;
}

/** Apply per-field mappings to a Record, returning a new Record with mapped values.
 *  Mappings can modify existing fields or create new computed fields. */
export function applyMappings(
  record: Record<string, string>,
  mappings: FieldMapping
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...record };
  for (const [field, mapping] of Object.entries(mappings)) {
    result[field] = mapping(record[field] ?? '', record);
  }
  return result;
}

// --- Field mapping maps: isolate Sheets-specific parsing from models ---

/** Classes: parse time strings to 24h format, length to number, isRestricted to boolean */
const classMappings: FieldMapping = {
  startTime: val => DateHelpers.parseTimeString(val).to24Hour(),
  endTime: val => DateHelpers.parseTimeString(val).to24Hour(),
  length: val => parseInt(val) || 0,
  isRestricted: val => val === 'TRUE' || val === 'true',
};

/** Instructors: isDeactivated→isActive inversion, flat fields→nested objects */
const instructorMappings: FieldMapping = {
  isActive: (_val, row) => !row.isDeactivated || row.isDeactivated.toLowerCase() === 'false',
  specialties: (_val, row) =>
    [row.instrument1, row.instrument2, row.instrument3, row.instrument4].filter(Boolean),
  availability: (_val, row) => ({
    monday: {
      isAvailable: row.isAvailableMonday === 'TRUE' || row.isAvailableMonday === 'true',
      startTime: row.mondayStartTime,
      endTime: row.mondayEndTime,
      roomId: row.mondayRoomId,
    },
    tuesday: {
      isAvailable: row.isAvailableTuesday === 'TRUE' || row.isAvailableTuesday === 'true',
      startTime: row.tuesdayStartTime,
      endTime: row.tuesdayEndTime,
      roomId: row.tuesdayRoomId,
    },
    wednesday: {
      isAvailable: row.isAvailableWednesday === 'TRUE' || row.isAvailableWednesday === 'true',
      startTime: row.wednesdayStartTime,
      endTime: row.wednesdayEndTime,
      roomId: row.wednesdayRoomId,
    },
    thursday: {
      isAvailable: row.isAvailableThursday === 'TRUE' || row.isAvailableThursday === 'true',
      startTime: row.thursdayStartTime,
      endTime: row.thursdayEndTime,
      roomId: row.thursdayRoomId,
    },
    friday: {
      isAvailable: row.isAvailableFriday === 'TRUE' || row.isAvailableFriday === 'true',
      startTime: row.fridayStartTime,
      endTime: row.fridayEndTime,
      roomId: row.fridayRoomId,
    },
  }),
  gradeRange: (_val, row) => ({ minimum: row.minimumGrade, maximum: row.maximumGrade }),
};

/** Attendance: week to number, attended to boolean */
const attendanceMappings: FieldMapping = {
  week: val => Number(val || 0),
  attended: val => (val ? val.toLowerCase() === 'true' : true),
};

/** Admins: isDirector to boolean */
const adminMappings: FieldMapping = {
  isDirector: val => val === 'TRUE' || val === 'true',
};

/** Rooms: includeRoomId to boolean */
const roomMappings: FieldMapping = {
  includeRoomId: val => val === 'TRUE' || val === 'true',
};

/** Registrations: length string to number (null if empty/NaN for waitlist classes) */
const registrationMappings: FieldMapping = {
  length: val => {
    const n = parseInt(val);
    return isNaN(n) ? null : n;
  },
};

/** Periods: trimester to lowercase, startDate to Date */
const periodMappings: FieldMapping = {
  trimester: val => (val ? val.toLowerCase() : null),
  startDate: val => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  },
};

/**
 * GoogleSheetsDbClient - Thin wrapper around Google Sheets API
 * Consolidated from multiple client versions for better maintainability
 * Implements caching at the data access layer to minimize Google Sheets API calls
 */
export class GoogleSheetsDbClient extends BaseService {
  cacheService: CacheService | null;
  cacheExpirationMs: number;
  auth: GoogleAuth;
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  workingSheetInfo: Record<string, SheetConfig>;

  /**
   * Initialize the Google Sheets client
   */
  constructor(
    configurationService: ConfigurationService = configService,
    cacheService: CacheService | null = null
  ) {
    super(configurationService); // Initialize logger via BaseService

    // Store cache service reference
    this.cacheService = cacheService;
    this.cacheExpirationMs = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Get authentication configuration from config service
    const authConfig = this.configService.getGoogleSheetsAuth();
    const sheetsConfig = this.configService.getGoogleSheetsConfig();

    // Validate authentication configuration
    if (!authConfig.clientEmail || !authConfig.privateKey) {
      throw new Error('Google Sheets authentication configuration is incomplete');
    }

    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: authConfig.clientEmail,
        private_key: authConfig.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });

    // Get spreadsheet ID from config service
    this.spreadsheetId = sheetsConfig.spreadsheetId!;

    if (!this.spreadsheetId) {
      throw new Error(
        'Spreadsheet ID is required. Please set WORKING_SPREADSHEET_ID environment variable.'
      );
    }

    this.logger.log('GoogleSheetsDbClient initialized successfully');

    // Initialize sheet info — compact configs referencing model column schemas
    const trimesters = ['fall', 'winter', 'spring'] as const;
    this.workingSheetInfo = {
      [Keys.ADMINS]: {
        sheet: Keys.ADMINS,
        startRow: 2,
        columns: Admin.columns,
        mappings: adminMappings,
      },
      [Keys.INSTRUCTORS]: {
        sheet: Keys.INSTRUCTORS,
        startRow: 2,
        columns: Instructor.columns,
        mappings: instructorMappings,
      },
      [Keys.PARENTS]: { sheet: Keys.PARENTS, startRow: 2, columns: Parent.columns },
      [Keys.STUDENTS]: { sheet: Keys.STUDENTS, startRow: 2, columns: Student.columns },
      [Keys.CLASSES]: {
        sheet: Keys.CLASSES,
        startRow: 2,
        columns: Class.columns,
        mappings: classMappings,
      },
      [Keys.ROOMS]: {
        sheet: Keys.ROOMS,
        startRow: 2,
        columns: Room.columns,
        mappings: roomMappings,
      },
      [Keys.ATTENDANCE]: {
        sheet: Keys.ATTENDANCE,
        startRow: 2,
        columns: AttendanceRecordModel.columns,
        mappings: attendanceMappings,
      },
      [Keys.ATTENDANCEAUDIT]: {
        sheet: Keys.ATTENDANCEAUDIT,
        startRow: 2,
        columns: AttendanceRecordModel.auditColumns,
      },
      [Keys.PERIODS]: {
        sheet: Keys.PERIODS,
        startRow: 2,
        columns: PERIOD_COLUMNS,
        mappings: periodMappings,
      },
      drop_requests: { sheet: 'drop_requests', startRow: 2, columns: DropRequest.columns },
      // Generate trimester-specific registration and audit sheets from shared schemas
      ...Object.fromEntries(
        trimesters.flatMap(t => [
          [
            `registrations_${t}`,
            {
              sheet: `registrations_${t}`,
              startRow: 2,
              columns: Registration.columns,
              mappings: registrationMappings,
            },
          ],
          [
            `registrations_${t}_audit`,
            { sheet: `registrations_${t}_audit`, startRow: 2, columns: Registration.auditColumns },
          ],
        ])
      ),
    };
  }

  /**
   * Get raw records from a sheet as Record<string, string> without field mappings.
   * Used internally by update/delete operations that need unmapped data for ID matching and writes.
   */
  async #getRawRecords(sheetKey: string): Promise<Record<string, string>[]> {
    return this.getAllRecords(sheetKey, rec => rec as Record<string, string>, true);
  }

  /**
   * Get all records from a sheet using an open-ended range for optimal performance.
   * Google Sheets API will automatically return only populated rows.
   * Implements caching to minimize API calls.
   * Field mappings (if configured) are applied before passing data to mapFunc.
   */
  async getAllRecords<T>(
    sheetKey: string,
    mapFunc: (record: Record<string, unknown>) => T,
    skipMappings = false
  ): Promise<T[]> {
    try {
      const sheetInfo = this.workingSheetInfo[sheetKey];

      if (!sheetInfo) {
        throw new Error(`Sheet info not found for key: ${sheetKey}`);
      }

      const spreadsheetId = this.spreadsheetId;

      // Calculate the last column letter from column schema length
      const lastColumn = GoogleSheetsDbClient.#getColumnLetter(sheetInfo.columns.length - 1);
      const range = `${sheetInfo.sheet}!A${sheetInfo.startRow}:${lastColumn}`;

      // Generate cache key based on spreadsheet ID and range
      const cacheKey = `sheets:${spreadsheetId}:${range}`;

      // CRITICAL: Periods should NEVER be cached as they control time-sensitive application behavior
      const shouldCache = sheetKey !== Keys.PERIODS;

      // Convert raw row to record, applying field mappings if configured
      const processRow = (row: string[]): Record<string, unknown> => {
        const record = rowToObject(row, sheetInfo.columns);
        return !skipMappings && sheetInfo.mappings
          ? applyMappings(record, sheetInfo.mappings)
          : record;
      };

      // Check cache if available and caching is allowed for this sheet
      if (this.cacheService && shouldCache) {
        const cached = this.cacheService.get(cacheKey) as string[][] | null;
        if (cached) {
          this.logger.info(`📦 Cache hit for ${sheetKey}`);
          return cached
            .map((row: string[]) => mapFunc(processRow(row)))
            .filter((item: T): item is NonNullable<T> => item !== null && item !== undefined);
        }
      }

      // Cache miss - fetch from Google Sheets API
      this.logger.info(`🌐 API call for ${sheetKey}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
      });

      const rows: string[][] = (response.data.values as string[][] | undefined) || [];

      // Store raw rows in cache if available and caching is allowed for this sheet
      if (this.cacheService && shouldCache) {
        this.cacheService.set(cacheKey, rows, this.cacheExpirationMs);
      }

      return rows
        .map((row: string[]) => mapFunc(processRow(row)))
        .filter((item: T): item is NonNullable<T> => item !== null && item !== undefined);
    } catch (error) {
      this.logger.error(`Error getting data from sheet ${sheetKey}:`, (error as Error).message);
      throw error;
    }
  }

  /** Convert column index to Excel-style column letter (A, B, ..., Z, AA, AB, ...) */
  static #getColumnLetter(index: number): string {
    let letter = '';
    let num = index;
    while (num >= 0) {
      letter = String.fromCharCode((num % 26) + 65) + letter;
      num = Math.floor(num / 26) - 1;
    }
    return letter;
  }

  /** Append a record to a sheet. Always uses RAW input to preserve data as-is. */
  async appendRecord(
    sheetKey: string,
    record: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const sheetInfo = this.workingSheetInfo[sheetKey];

      if (!sheetInfo) {
        throw new Error(`Sheet info not found for key: ${sheetKey}`);
      }

      const row = objectToRow(record, sheetInfo.columns);

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetInfo.sheet}!A:A`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [row],
        },
      });

      this.clearSheetCache(sheetKey);

      return record;
    } catch (error) {
      this.logger.error(`Error appending record to sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   * Update record
   */
  async updateRecord(
    sheetKey: string,
    record: Record<string, unknown>,
    updatedBy: string
  ): Promise<void> {
    try {
      const sheetInfo = this.workingSheetInfo[sheetKey];
      if (!sheetInfo) {
        throw new Error(`Sheet info not found for key: ${sheetKey}`);
      }

      // Find the row to update
      const allData = await this.#getRawRecords(sheetKey);
      const rowIndex = allData.findIndex(
        (row: Record<string, string>) => row.id === String(record.id || '')
      );

      if (rowIndex === -1) {
        this.logger.debug(`Record with ID ${record.id} not found in ${sheetKey}.`);
        return;
      }

      await this.#updateInSheet(sheetKey, rowIndex, record);
      this.logger.debug(`Record with ID ${record.id} updated in ${sheetKey}.`);

      // Clear cache after successful write
      this.clearSheetCache(sheetKey);
    } catch (error) {
      this.logger.error(`Error updating record in sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   * Update data in sheet
   */
  async #updateInSheet(
    sheetKey: string,
    rowIndex: number,
    data: Record<string, unknown>
  ): Promise<sheets_v4.Schema$UpdateValuesResponse> {
    try {
      const sheetInfo = this.workingSheetInfo[sheetKey];
      if (!sheetInfo) {
        throw new Error(`Sheet info not found for key: ${sheetKey}`);
      }

      const spreadsheetId = this.spreadsheetId;

      const row = objectToRow(data, sheetInfo.columns);
      const actualRowIndex = sheetInfo.startRow + rowIndex;
      const lastColumn = GoogleSheetsDbClient.#getColumnLetter(sheetInfo.columns.length - 1);

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${sheetInfo.sheet}!A${actualRowIndex}:${lastColumn}${actualRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [row],
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Error updating data in sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /** Delete a record by ID */
  async deleteRecord(sheetKey: string, recordId: string, _deletedBy: string): Promise<void> {
    try {
      // Find the record first
      const allData = await this.#getRawRecords(sheetKey);
      const rowIndex = allData.findIndex((row: Record<string, string>) => row.id === recordId);

      if (rowIndex === -1) {
        this.logger.debug(`Record with ID ${recordId} not found in ${sheetKey}.`);
        return;
      }

      await this.#deleteFromSheet(sheetKey, rowIndex);

      // Clear cache after successful write
      this.clearSheetCache(sheetKey);

      this.logger.debug(`Record with ID ${recordId} deleted from ${sheetKey}.`);
    } catch (error) {
      this.logger.error(`Error deleting record from sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /** Delete a row from a sheet by index */
  async #deleteFromSheet(
    sheetKey: string,
    rowIndex: number
  ): Promise<sheets_v4.Schema$BatchUpdateSpreadsheetResponse> {
    try {
      const sheetInfo = this.workingSheetInfo[sheetKey];
      if (!sheetInfo) {
        throw new Error(`Sheet info not found for key: ${sheetKey}`);
      }

      const spreadsheetId = this.spreadsheetId;

      // Get sheet ID first
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets?.find(
        (s: sheets_v4.Schema$Sheet) => s.properties?.title === sheetInfo.sheet
      );
      if (!sheet) {
        throw new Error(`Sheet not found: ${sheetInfo.sheet}`);
      }

      const actualRowIndex = sheetInfo.startRow + rowIndex;

      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheet.properties?.sheetId,
                  dimension: 'ROWS',
                  startIndex: actualRowIndex - 1,
                  endIndex: actualRowIndex,
                },
              },
            },
          ],
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Error deleting row from sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache for a specific sheet
   * Called after write operations to invalidate stale cache entries
   */
  clearSheetCache(sheetKey: string): void {
    if (!this.cacheService) {
      return;
    }

    const sheetInfo = this.workingSheetInfo[sheetKey];
    if (!sheetInfo) {
      return;
    }

    // Build the same cache key format used in getAllRecords
    const lastColumn = GoogleSheetsDbClient.#getColumnLetter(sheetInfo.columns.length - 1);
    const range = `${sheetInfo.sheet}!A${sheetInfo.startRow}:${lastColumn}`;
    const cacheKey = `sheets:${this.spreadsheetId}:${range}`;

    this.cacheService.delete(cacheKey);
    this.logger.info(`🧹 Cache cleared for ${sheetKey}`);
  }

  /**
   * Clear all cache entries
   * Used by manual cache clear operations
   */
  clearAllCache(): void {
    if (!this.cacheService) {
      return;
    }

    this.cacheService.clear();
    this.logger.info('🧹 All Google Sheets cache cleared');
  }
}
