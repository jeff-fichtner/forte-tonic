import { google } from 'googleapis';
import { ErrorHandling } from '../common/errorHandling.js';
import { Keys } from '../utils/values/keys.js';
import { RegistrationType } from '../utils/values/registrationType.js';
import { CloneUtility } from '../utils/utilities/cloneUtility.js';
import { GuidUtility } from '../utils/utilities/guidUtility.js';
import { configService } from '../services/configurationService.js';
import { getLogger } from '../utils/utilities/logger.js';

/**
 * Enhanced GoogleSheetsDbClient with caching and performance optimizations
 * Consolidated from multiple client versions for better maintainability
 */
export class GoogleSheetsDbClient {
  /**
   * Initialize the Google Sheets client with caching capabilities
   */
  constructor(configurationService = configService) {
    this.configService = configurationService;
    this.logger = getLogger();

    // Performance optimization: Add caching
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

    // Get authentication configuration from config service
    const authConfig = this.configService.getGoogleSheetsAuth();
    const sheetsConfig = this.configService.getGoogleSheetsConfig();

    // Initialize Google API clients with service account only
    this.logger.log('🔑', 'Using service account authentication...');
    this.logger.log('📧', 'Service Account Email:', authConfig.clientEmail);
    this.logger.log(
      '🔐',
      'Private Key Length:',
      authConfig.privateKey ? authConfig.privateKey.length : 'NOT SET'
    );

    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: authConfig.clientEmail,
        private_key: authConfig.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });

    // Get spreadsheet ID from config service
    this.spreadsheetId = sheetsConfig.spreadsheetId;

    if (!this.spreadsheetId) {
      throw new Error(
        'Spreadsheet ID is required. Please set WORKING_SPREADSHEET_ID environment variable.'
      );
    }

    this.logger.log(
      '📝',
      'GoogleSheetsDbClient initialized with spreadsheet ID:',
      this.spreadsheetId
    );

    // Initialize sheet info structure
    this.workingSheetInfo = {
      [Keys.ROLES]: {
        sheet: Keys.ROLES,
        startRow: 2,
        columnMap: {
          id: 0,
          email: 1,
          admin: 2,
          instructor: 3,
          parent: 4,
        },
      },
      [Keys.ADMINS]: {
        sheet: Keys.ADMINS,
        startRow: 2,
        columnMap: {
          id: 0,
          email: 1,
          lastName: 2,
          firstName: 3,
          phone: 4,
        },
      },
      [Keys.INSTRUCTORS]: {
        sheet: Keys.INSTRUCTORS,
        startRow: 2,
        columnMap: {
          id: 0,
          email: 1,
          lastName: 2,
          firstName: 3,
          phone: 4,
        },
      },
      [Keys.PARENTS]: {
        sheet: Keys.PARENTS,
        startRow: 2,
        columnMap: {
          id: 0, // Id
          email: 1, // Email
          lastName: 2, // LastName
          firstName: 3, // FirstName
          phone: 4, // Phone
          cellPhone: 5, // CellPhone
        },
      },
      [Keys.STUDENTS]: {
        sheet: Keys.STUDENTS,
        startRow: 2,
        columnMap: {
          id: 0, // Id
          lastName: 1, // LastName (was Column C, now Column B after StudentId deletion)
          firstName: 2, // FirstName (was Column D, now Column C after StudentId deletion)
          lastNickname: 3, // LastNickname (was Column E, now Column D after StudentId deletion)
          firstNickname: 4, // FirstNickname (was Column F, now Column E after StudentId deletion)
          grade: 5, // Grade (was Column G, now Column F after StudentId deletion)
          parent1Id: 6, // Parent1Id (was Column H, now Column G after StudentId deletion)
          parent2Id: 7, // Parent2Id (was Column I, now Column H after StudentId deletion)
        },
      },
      [Keys.CLASSES]: {
        sheet: Keys.CLASSES,
        startRow: 2,
        columnMap: {
          id: 0, // Id
          instructorId: 1, // InstructorId
          day: 2, // Day
          startTime: 3, // StartTime
          length: 4, // Length
          endTime: 5, // EndTime
          instrument: 6, // Instrument
          title: 7, // Title
          size: 8, // Size
          minimumGrade: 9, // MinimumGrade
          maximumGrade: 10, // MaximumGrade
        },
      },
      [Keys.ROOMS]: {
        sheet: Keys.ROOMS,
        startRow: 2,
        columnMap: {
          id: 0,
          name: 1,
        },
      },
      [Keys.REGISTRATIONS]: {
        sheet: Keys.REGISTRATIONS,
        startRow: 2,
        columnMap: {
          id: 0, // Id
          studentId: 1, // StudentId
          instructorId: 2, // InstructorId
          day: 3, // Day
          startTime: 4, // StartTime
          length: 5, // Length
          registrationType: 6, // RegistrationType
          roomId: 7, // RoomId
          schoolYear: 8, // SchoolYear
          createdBy: 9, // CreatedBy
        },
        auditSheet: Keys.REGISTRATIONSAUDIT,
        postProcess: record => {
          record.id =
            record.registrationType === RegistrationType.GROUP
              ? `${record.studentId}_${record.classId}`
              : `${record.studentId}_${record.instructorId}_${record.day}_${record.startTime}`;
          return record;
        },
      },
      [Keys.REGISTRATIONSAUDIT]: {
        sheet: Keys.REGISTRATIONSAUDIT,
        startRow: 2,
        columnMap: {
          id: 0,
          action: 1,
          registrationId: 2,
          studentId: 3,
          instructorId: 4,
          classId: 5,
          registrationType: 6,
          schoolYear: 7,
          trimester: 8,
          performedBy: 9,
          performedAt: 10,
        },
      },
      [Keys.ATTENDANCE]: {
        sheet: Keys.ATTENDANCE,
        startRow: 2,
        columnMap: {
          id: 0,
          registrationId: 1,
          week: 2,
          schoolYear: 3,
          trimester: 4,
          recordedBy: 5,
          recordedAt: 6,
        },
        auditSheet: Keys.ATTENDANCEAUDIT,
        getArchiveSheetName: existingSheetName =>
          `${existingSheetName}_archive_${new Date().toISOString().slice(0, 10)}`,
      },
      [Keys.ATTENDANCEAUDIT]: {
        sheet: Keys.ATTENDANCEAUDIT,
        startRow: 2,
        columnMap: {
          id: 0,
          action: 1,
          attendanceId: 2,
          registrationId: 3,
          week: 4,
          schoolYear: 5,
          trimester: 6,
          performedBy: 7,
          performedAt: 8,
        },
      },
    };
  }

  /**
   *
   */

  /**
   * Get data with caching support for improved performance
   */
  async getCachedData(sheetKey, mapFunc = null) {
    const now = Date.now();
    const cachedTime = this.cacheTimestamps.get(sheetKey);

    if (cachedTime && now - cachedTime < this.CACHE_TTL) {
      this.logger.log('📦', `Using cached data for ${sheetKey}`);
      return this.cache.get(sheetKey);
    }

    // Cache miss, load fresh data
    this.logger.log('🔄', `Loading fresh data for ${sheetKey}`);
    const data = await this.getAllRecords(
      sheetKey,
      mapFunc || (row => row)
    );

    // Cache the results
    this.cache.set(sheetKey, data);
    this.cacheTimestamps.set(sheetKey, now);

    return data;
  }

  /**
   * Batch load multiple sheets in parallel for better performance
   */
  async getAllDataParallel(sheetKeys, mapFunctions = {}) {
    const startTime = Date.now();

    try {
      // Load all requested sheets in parallel
      const promises = sheetKeys.map(async sheetKey => {
        const mapFunc = mapFunctions[sheetKey] || (row => row);
        const data = await this.getCachedData(sheetKey, mapFunc);
        return { sheetKey, data };
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();

      this.logger.log(
        '🚀',
        `Parallel batch load of ${sheetKeys.length} sheets completed in ${endTime - startTime}ms`
      );

      // Convert to object format
      const dataMap = {};
      results.forEach(({ sheetKey, data }) => {
        dataMap[sheetKey] = data;
      });

      return dataMap;
    } catch (error) {
      console.error('❌ Batch load failed:', error);
      throw error;
    }
  }

  /**
   * Clear cache manually - useful for testing or forced refresh
   */
  clearCache(sheetKey = null) {
    if (sheetKey) {
      this.cache.delete(sheetKey);
      this.cacheTimestamps.delete(sheetKey);
      this.logger.log('🧹', `Cache cleared for ${sheetKey}`);
    } else {
      this.cache.clear();
      this.cacheTimestamps.clear();
      this.logger.log('🧹', 'All cache cleared');
    }
  }

  /**
   * Enhanced batch operations for writes with cache invalidation
   */
  async batchWrite(operations) {
    const batchRequest = {
      spreadsheetId: this.spreadsheetId,
      resource: {
        valueInputOption: 'RAW',
        data: operations.map(op => ({
          range: op.range,
          values: op.values,
        })),
      },
    };

    const startTime = Date.now();
    const response = await this.sheets.spreadsheets.values.batchUpdate(batchRequest);
    const endTime = Date.now();

    this.logger.log(
      '📝',
      `Batch write of ${operations.length} operations completed in ${endTime - startTime}ms`
    );

    // Invalidate cache for affected sheets
    operations.forEach(op => {
      const sheetName = op.range.split('!')[0];
      // Find the sheet key that matches this sheet name
      Object.keys(this.workingSheetInfo).forEach(key => {
        if (this.workingSheetInfo[key].sheet === sheetName) {
          this.clearCache(key);
        }
      });
    });

    return response;
  }

  /**
   *
   */
  async getAllRecords(sheetKey, mapFunc) {
    try {
      const sheetInfo = this.workingSheetInfo[sheetKey];
      if (!sheetInfo) {
        throw new Error(`Sheet info not found for key: ${sheetKey}`);
      }

      const spreadsheetId = this.spreadsheetId;

      // Use a more reasonable range - Z column should be sufficient
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetInfo.sheet}!A${sheetInfo.startRow}:Z1000`,
      });

      const rows = response.data.values || [];
      return rows.map(row => mapFunc(row));
    } catch (error) {
      console.error(`Error getting data from sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   *
   */
  async getAllFromSheet(sheetKey) {
    try {
      const sheetInfo = this.workingSheetInfo[sheetKey];
      if (!sheetInfo) {
        throw new Error(`Sheet info not found for key: ${sheetKey}`);
      }

      const spreadsheetId = this.spreadsheetId;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetInfo.sheet}!A${sheetInfo.startRow}:Z1000`,
      });

      const rows = response.data.values || [];
      return this.#convertRowsToObjects(rows, sheetInfo.columnMap);
    } catch (error) {
      console.error(`Error getting data from sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   *
   */
  async getFromSheetByColumnValue(sheetKey, columnName, value) {
    const allData = await this.getAllFromSheet(sheetKey);
    return allData.filter(item => item[columnName] === value);
  }

  /**
   *
   */
  async getFromSheetByColumnValueSingle(sheetKey, columnName, value) {
    const results = await this.getFromSheetByColumnValue(sheetKey, columnName, value);
    return results.length > 0 ? results[0] : null;
  }

  /**
   *
   */
  async appendRecord(sheetKey, record, createdBy) {
    try {
      const { auditSheet, postProcess } = this.workingSheetInfo[sheetKey];

      const clonedRecord = CloneUtility.clone(record);
      let processedRecord = this.#auditRecord(clonedRecord, createdBy);
      if (postProcess) {
        processedRecord = postProcess(processedRecord);
      }

      await this.insertIntoSheet(sheetKey, processedRecord);

      if (auditSheet) {
        const auditValues = this.#convertToAuditValues(Object.values(processedRecord));
        await this.insertIntoSheet(
          auditSheet,
          this.#convertAuditValuesToObject(auditValues, auditSheet)
        );
      } else {
        this.logger.debug(`No audit sheet defined for ${sheetKey}. Skipping audit logging.`);
      }

      return processedRecord;
    } catch (error) {
      console.error(`Error appending record to sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   * Insert data into sheet and invalidate cache
   */
  async insertIntoSheet(sheetKey, data) {
    try {
      const sheetInfo = this.workingSheetInfo[sheetKey];
      if (!sheetInfo) {
        throw new Error(`Sheet info not found for key: ${sheetKey}`);
      }

      const spreadsheetId = this.spreadsheetId;

      // Convert object to array based on column map
      const row = this.#convertObjectToRow(data, sheetInfo.columnMap);

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: `${sheetInfo.sheet}!A:A`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      });

      // Clear cache for this sheet since we modified it
      this.clearCache(sheetKey);

      return response.data;
    } catch (error) {
      console.error(`Error inserting data into sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   * Update record and invalidate cache
   */
  async updateRecord(sheetKey, record, updatedBy) {
    try {
      const sheetInfo = this.workingSheetInfo[sheetKey];
      if (!sheetInfo) {
        throw new Error(`Sheet info not found for key: ${sheetKey}`);
      }

      // Find the row to update
      const allData = await this.getAllFromSheet(sheetKey);
      const rowIndex = allData.findIndex(row => row.id === record.id);

      if (rowIndex === -1) {
        this.logger.debug(`Record with ID ${record.id} not found in ${sheetKey}.`);
        return;
      }

      await this.updateInSheet(sheetKey, rowIndex, record);
      this.logger.debug(`Record with ID ${record.id} updated in ${sheetKey}.`);

      // Clear cache for this sheet since we modified it
      this.clearCache(sheetKey);
    } catch (error) {
      console.error(`Error updating record in sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   * Update data in sheet and invalidate cache
   */
  async updateInSheet(sheetKey, rowIndex, data) {
    try {
      const sheetInfo = this.workingSheetInfo[sheetKey];
      if (!sheetInfo) {
        throw new Error(`Sheet info not found for key: ${sheetKey}`);
      }

      const spreadsheetId = this.spreadsheetId;

      const row = this.#convertObjectToRow(data, sheetInfo.columnMap);
      const actualRowIndex = sheetInfo.startRow + rowIndex;

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${sheetInfo.sheet}!A${actualRowIndex}:Z${actualRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      });

      // Clear cache for this sheet since we modified it
      this.clearCache(sheetKey);

      return response.data;
    } catch (error) {
      console.error(`Error updating data in sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   *
   */
  async deleteRecord(sheetKey, recordId, deletedBy) {
    try {
      const { auditSheet } = this.workingSheetInfo[sheetKey];

      // Find the record first
      const allData = await this.getAllFromSheet(sheetKey);
      const rowIndex = allData.findIndex(row => row.id === recordId);

      if (rowIndex === -1) {
        this.logger.debug(`Record with ID ${recordId} not found in ${sheetKey}.`);
        return;
      }

      const recordData = allData[rowIndex];
      await this.deleteFromSheet(sheetKey, rowIndex);

      if (auditSheet) {
        const auditValues = this.#convertToAuditValues(Object.values(recordData), deletedBy);
        await this.insertIntoSheet(
          auditSheet,
          this.#convertAuditValuesToObject(auditValues, auditSheet)
        );
      } else {
        this.logger.debug(`No audit sheet defined for ${sheetKey}. Skipping audit logging.`);
      }

      this.logger.debug(`Record with ID ${recordId} deleted from ${sheetKey}.`);
    } catch (error) {
      console.error(`Error deleting record from sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   *
   */
  async deleteFromSheet(sheetKey, rowIndex) {
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

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetInfo.sheet);
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
                  sheetId: sheet.properties.sheetId,
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
      console.error(`Error deleting row from sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   *
   */
  async archiveSheet(sheetKey) {
    // This would require more complex sheet manipulation - implementing basic version
    this.logger.info(`Archive functionality for ${sheetKey} needs to be implemented`);
    // Implementation would involve creating new sheet, copying data, etc.
  }

  /**
   *
   */
  #convertRowsToObjects(rows, columnMap) {
    return rows.map(row => {
      const obj = {};
      Object.keys(columnMap).forEach(key => {
        const columnIndex = columnMap[key];
        obj[key] = row[columnIndex] || '';
      });
      return obj;
    });
  }

  /**
   *
   */
  #convertObjectToRow(obj, columnMap) {
    const maxColumn = Math.max(...Object.values(columnMap));
    const row = new Array(maxColumn + 1).fill('');

    Object.keys(columnMap).forEach(key => {
      const columnIndex = columnMap[key];
      row[columnIndex] = obj[key] || '';
    });

    return row;
  }

  /**
   *
   */
  #convertAuditValuesToObject(values, auditSheetKey) {
    const auditSheetInfo = this.workingSheetInfo[auditSheetKey];
    if (!auditSheetInfo) {
      throw new Error(`Audit sheet info not found for key: ${auditSheetKey}`);
    }

    const obj = {};
    Object.keys(auditSheetInfo.columnMap).forEach((key, index) => {
      obj[key] = values[index] || '';
    });
    return obj;
  }

  /**
   *
   */
  async getMaxIdFromSheet(sheetKey) {
    try {
      const allData = await this.getAllFromSheet(sheetKey);
      if (allData.length === 0) return 0;

      const ids = allData.map(item => parseInt(item.id)).filter(id => !isNaN(id));
      return ids.length > 0 ? Math.max(...ids) : 0;
    } catch (error) {
      console.error(`Error getting max ID from sheet ${sheetKey}:`, error);
      return 0;
    }
  }

  /**
   *
   */
  #auditRecord(record, createdBy) {
    record.createdAt = new Date().toISOString();
    record.createdBy = createdBy;
    return record;
  }

  /**
   *
   */
  #convertToAuditValues(values, deletedBy = null) {
    // copy list
    values = values.slice();

    const guid = GuidUtility.generateGuid();
    // insert guid at the beginning of the values array
    values.unshift(guid);

    if (deletedBy) {
      values.push(true);
      values.push(new Date().toISOString());
      values.push(deletedBy);
    }

    return values;
  }
}
