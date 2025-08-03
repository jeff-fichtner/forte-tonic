import { google } from 'googleapis';
import { ErrorHandling } from '../../common/errorHandling.js';
import { Keys } from '../values/keys.js';
import { RegistrationType } from '../values/registrationType.js';
import { CloneUtility } from '../utilities/cloneUtility.js';
import { GuidUtility } from '../utilities/guidUtility.js';
import { configService } from '../services/configurationService.js';

/**
 *
 */
export class GoogleSheetsDbClient {
  /**
   *
   */
  constructor(configurationService = configService) {
    this.configService = configurationService;

    // Get authentication configuration from config service
    const authConfig = this.configService.getGoogleSheetsAuth();
    const sheetsConfig = this.configService.getGoogleSheetsConfig();

    // Initialize Google API clients with service account only
    console.log('🔑 Using service account authentication...');
    console.log('📧 Service Account Email:', authConfig.clientEmail);
    console.log(
      '🔐 Private Key Length:',
      authConfig.privateKey ? authConfig.privateKey.length : 'NOT SET'
    );

    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: authConfig.clientEmail,
        private_key: authConfig.privateKey,
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });

    // Get spreadsheet ID from config service
    this.spreadsheetId = sheetsConfig.spreadsheetId;

    if (!this.spreadsheetId) {
      throw new Error('Spreadsheet ID is required. Please set WORKING_SPREADSHEET_ID environment variable.');
    }

    console.log(
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
          firstName: 1,
          lastName: 2,
          email: 3,
          phone: 4,
        },
      },
      [Keys.INSTRUCTORS]: {
        sheet: Keys.INSTRUCTORS,
        startRow: 2,
        columnMap: {
          id: 0,
          firstName: 1,
          lastName: 2,
          email: 3,
          phone: 4,
        },
      },
      [Keys.PARENTS]: {
        sheet: Keys.PARENTS,
        startRow: 2,
        columnMap: {
          id: 0,
          firstName: 1,
          lastName: 2,
          email: 3,
          phone: 4,
          cellPhone: 5,
        },
      },
      [Keys.STUDENTS]: {
        sheet: Keys.STUDENTS,
        startRow: 2,
        columnMap: {
          id: 0,
          firstName: 1,
          lastName: 2,
          firstNickname: 3,
          lastNickname: 4,
          grade: 5,
          parent1Id: 6,
          parent2Id: 7,
        },
      },
      [Keys.CLASSES]: {
        sheet: Keys.CLASSES,
        startRow: 2,
        columnMap: {
          id: 0,
          name: 1,
          instructorId: 2,
          roomId: 3,
          dayOfWeek: 4,
          startTime: 5,
          endTime: 6,
          instrument: 7,
          lengthOption: 8,
          maxStudents: 9,
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
          id: 0,
          studentId: 1,
          instructorId: 2,
          classId: 3,
          registrationType: 4,
          schoolYear: 5,
          trimester: 6,
          registeredBy: 7,
          registeredAt: 8,
          className: 9,
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
      return this._convertRowsToObjects(rows, sheetInfo.columnMap);
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
      let processedRecord = this._auditRecord(clonedRecord, createdBy);
      if (postProcess) {
        processedRecord = postProcess(processedRecord);
      }

      await this.insertIntoSheet(sheetKey, processedRecord);

      if (auditSheet) {
        const auditValues = this._convertToAuditValues(Object.values(processedRecord));
        await this.insertIntoSheet(
          auditSheet,
          this._convertAuditValuesToObject(auditValues, auditSheet)
        );
      } else {
        console.log(`No audit sheet defined for ${sheetKey}. Skipping audit logging.`);
      }

      return processedRecord;
    } catch (error) {
      console.error(`Error appending record to sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   *
   */
  async insertIntoSheet(sheetKey, data) {
    try {
      const sheetInfo = this.workingSheetInfo[sheetKey];
      if (!sheetInfo) {
        throw new Error(`Sheet info not found for key: ${sheetKey}`);
      }

      const spreadsheetId = this.spreadsheetId;

      // Convert object to array based on column map
      const row = this._convertObjectToRow(data, sheetInfo.columnMap);

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: `${sheetInfo.sheet}!A:A`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error inserting data into sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   *
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
        console.log(`Record with ID ${record.id} not found in ${sheetKey}.`);
        return;
      }

      await this.updateInSheet(sheetKey, rowIndex, record);
      console.log(`Record with ID ${record.id} updated in ${sheetKey}.`);
    } catch (error) {
      console.error(`Error updating record in sheet ${sheetKey}:`, error);
      throw error;
    }
  }

  /**
   *
   */
  async updateInSheet(sheetKey, rowIndex, data) {
    try {
      const sheetInfo = this.workingSheetInfo[sheetKey];
      if (!sheetInfo) {
        throw new Error(`Sheet info not found for key: ${sheetKey}`);
      }

      const spreadsheetId = this.spreadsheetId;

      const row = this._convertObjectToRow(data, sheetInfo.columnMap);
      const actualRowIndex = sheetInfo.startRow + rowIndex;

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${sheetInfo.sheet}!A${actualRowIndex}:Z${actualRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      });

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
        console.log(`Record with ID ${recordId} not found in ${sheetKey}.`);
        return;
      }

      const recordData = allData[rowIndex];
      await this.deleteFromSheet(sheetKey, rowIndex);

      if (auditSheet) {
        const auditValues = this._convertToAuditValues(Object.values(recordData), deletedBy);
        await this.insertIntoSheet(
          auditSheet,
          this._convertAuditValuesToObject(auditValues, auditSheet)
        );
      } else {
        console.log(`No audit sheet defined for ${sheetKey}. Skipping audit logging.`);
      }

      console.log(`Record with ID ${recordId} deleted from ${sheetKey}.`);
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
    console.log(`Archive functionality for ${sheetKey} needs to be implemented`);
    // Implementation would involve creating new sheet, copying data, etc.
  }

  /**
   *
   */
  _convertRowsToObjects(rows, columnMap) {
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
  _convertObjectToRow(obj, columnMap) {
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
  _convertAuditValuesToObject(values, auditSheetKey) {
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
  _auditRecord(record, createdBy) {
    record.createdAt = new Date().toISOString();
    record.createdBy = createdBy;
    return record;
  }

  /**
   *
   */
  _convertToAuditValues(values, deletedBy = null) {
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
