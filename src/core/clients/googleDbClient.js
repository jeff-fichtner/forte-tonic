class GoogleDbClient {

  constructor(settings) {
    this.settings = settings;

    this.externalSpreadsheet = SpreadsheetApp.openById(settings.externalSpreadsheetId);
    ErrorHandling.throwIfNo(this.externalSpreadsheet, 'No external spreadsheet found');

    this.workingSpreadsheet = SpreadsheetApp.openById(settings.workingSpreadsheetId);
    ErrorHandling.throwIfNo(this.workingSpreadsheet, 'No working spreadsheet found');

    const adminsSheet = this.workingSpreadsheet.getSheetByName(Keys.ADMINS);
    ErrorHandling.throwIfNo(adminsSheet, `No '${Keys.ADMINS}' sheet found`);

    const instructorsSheet = this.workingSpreadsheet.getSheetByName(Keys.INSTRUCTORS);
    ErrorHandling.throwIfNo(instructorsSheet, `No '${Keys.INSTRUCTORS}' sheet found`);

    const studentsSheet = this.workingSpreadsheet.getSheetByName(Keys.STUDENTS);
    ErrorHandling.throwIfNo(studentsSheet, `No '${Keys.STUDENTS}' sheet found`);

    const parentsSheet = this.workingSpreadsheet.getSheetByName(Keys.PARENTS);
    ErrorHandling.throwIfNo(parentsSheet, `No '${Keys.PARENTS}' sheet found`);

    const roomsSheet = this.workingSpreadsheet.getSheetByName(Keys.ROOMS);
    ErrorHandling.throwIfNo(roomsSheet, `No '${Keys.ROOMS}' sheet found`);

    const classesSheet = this.workingSpreadsheet.getSheetByName(Keys.CLASSES);
    ErrorHandling.throwIfNo(classesSheet, `No '${Keys.CLASSES}' sheet found`);

    const registrationsSheet = this.workingSpreadsheet.getSheetByName(Keys.REGISTRATIONS);
    ErrorHandling.throwIfNo(registrationsSheet, `No '${Keys.REGISTRATIONS}' sheet found`);

    const rolesSheet = this.workingSpreadsheet.getSheetByName(Keys.ROLES);
    ErrorHandling.throwIfNo(rolesSheet, `No '${Keys.ROLES}' sheet found`);

    this.workingSheetInfo = {
      [Keys.ADMINS]: {
        sheet: adminsSheet,
        id: (record) => record.id,
        process: (record, audit) => {
          // record.createdAt = new Date();
          // record.createdBy = audit;
          return record;
        }
      },
      [Keys.INSTRUCTORS]: {
        sheet: instructorsSheet,
        id: (record) => record.id,
        process: (record, audit) => {
          // record.createdAt = new Date();
          // record.createdBy = audit;
          return record;
        }
      },
      [Keys.STUDENTS]: {
        sheet: studentsSheet,
        id: (record) => record.id,
        process: (record, audit) => {
          // record.createdAt = new Date();
          // record.createdBy = audit;
          return record;
        }
      },
      [Keys.PARENTS]: {
        sheet: parentsSheet,
        id: (record) => record.id,
        process: (record, audit) => {
          // record.createdAt = new Date();
          // record.createdBy = audit;
          return record;
        }
      },
      [Keys.ROOMS]: {
        sheet: roomsSheet,
        id: (record) => record.id,
        process: (record, audit) => {
          // record.createdAt = new Date();
          // record.createdBy = audit;
          return record;
        }
      },
      [Keys.CLASSES]: {
        sheet: classesSheet,
        id: (record) => record.id,
        process: (record, audit) => {
          // record.createdAt = new Date();
          // record.createdBy = audit;
          return record;
        }
      },
      [Keys.REGISTRATIONS]: {
        sheet: registrationsSheet,
        id: (record) => record.id,
        process: (record, audit) => {
          record.id = `${record.studentId}_${record.instructorId}_${record.day}_${record.startTime}`;
          record.createdAt = new Date();
          record.createdBy = audit;
          return record;
        }
      },
      [Keys.ROLES]: {
        sheet: rolesSheet,
        id: (record) => record.email,
        process: (record, audit) => {
          // record.createdAt = new Date();
          // record.createdBy = audit;
          return record;
        }
      }
    }

    // TODO: set up a cache separate from working sheet
    // const workingFolder = DriveApp.getFolderById(settings.workingFolderId);
    // ErrorHandling.throwIfNo(workingFolder, 'No working folder found');

    // const cacheSpreadsheet = this._getOrCreateSpreadsheetByFolderAndName(workingFolder, settings.cacheSpreadsheetName);
    // _deleteAllSheetsExceptLast(cacheSpreadsheet);
  }

  getAllRecords(sheetKey, mapFunc) {
    const { sheet } = this.workingSheetInfo[sheetKey];
    const data = sheet.getDataRange().getValues();

    // Map the data to objects using the provided mapping function
    const mappedData =
      data.slice(1) // skip header row
        .map(row => mapFunc(row));

    return mappedData;
  }
  
  appendRecord(sheetKey, record, audit) {
    const { sheet, process } = this.workingSheetInfo[sheetKey];
    const clonedRecord = CloneUtility.clone(record, new Registration());
    const processedRecord = process(clonedRecord, audit);
    
    sheet.appendRow(Object.values(processedRecord));
    // TODO audit transaction
    return processedRecord;
  }

  deleteRecord(sheetKey, recordId, audit) {
    const { sheet, id } = this.workingSheetInfo[sheetKey];
    const data = sheet.getDataRange().getValues();
    
    // Find the row to delete based on the ID
    const rowIndex = data.findIndex(row => row[0] === recordId);
    
    if (rowIndex !== -1) {
      sheet.deleteRow(rowIndex + 1); // +1 because getDataRange() includes header
      Logger.log(`Record with ID ${id} deleted from ${sheetKey}.`);
    } else {
      Logger.log(`Record with ID ${id} not found in ${sheetKey}.`);
    }

    // TODO audit
  }

  _getOrCreateSpreadsheetByFolderAndName(folder, spreadsheetName) {
    let spreadsheet;

    const files = folder.getFilesByName(spreadsheetName);
    if (files.hasNext()) {
      spreadsheet = SpreadsheetApp.openById(files.next().getId());
    } else {
      spreadsheet = _createSpreadsheetWithinFolder(folder, spreadsheetName);
    }

    return spreadsheet;
  }

  _createSpreadsheetWithinFolder(folder, spreadsheetName) {
    const newSpreadsheet = SpreadsheetApp.create(spreadsheetName);
    const file = DriveApp.getFileById(newSpreadsheet.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file); // Remove from root folder
    Logger.log(`Spreadsheet "${spreadsheetName}" created and moved to folder "${folder.getName()}".`);
  }

  _deleteAllSheetsExceptLast(spreadsheet) {
    try {
      const sheets = spreadsheet.getSheets();

      // Loop to delete all sheets except the last one
      while (spreadsheet.getSheets().length > 1) {
        spreadsheet.deleteSheet(spreadsheet.getSheets().at(0));
      }

      // Clear and rename the last remaining sheet
      const lastSheet = spreadsheet.getSheets().at(0);
      lastSheet.clear();
      lastSheet.setName("_");
    } catch (error) {
      Logger.log(`Error: ${error.message}`);
    }
  }
}