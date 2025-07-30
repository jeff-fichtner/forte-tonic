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

    const attendanceSheet = this.workingSpreadsheet.getSheetByName(Keys.ATTENDANCE);
    ErrorHandling.throwIfNo(attendanceSheet, `No '${Keys.ATTENDANCE}' sheet found`);

    this.workingSheetInfo = {
      [Keys.ADMINS]: {
        sheet: adminsSheet
      },
      [Keys.INSTRUCTORS]: {
        sheet: instructorsSheet
      },
      [Keys.STUDENTS]: {
        sheet: studentsSheet
      },
      [Keys.PARENTS]: {
        sheet: parentsSheet
      },
      [Keys.ROOMS]: {
        sheet: roomsSheet
      },
      [Keys.CLASSES]: {
        sheet: classesSheet
      },
      [Keys.REGISTRATIONS]: {
        sheet: registrationsSheet,
        id: (record) => record.id,
        extractValues: (record) => {
          return [
            record.id,
            record.studentId,
            record.instructorId,
            record.day,
            record.startTime,
            record.length,
            record.registrationType,
            record.roomId,
            record.instrument,
            record.transportationType,
            record.notes,
            record.expectedStartDate,
            record.createdAt,
            record.createdBy
          ];
        },
        process: (record, audit) => {
          record.id = `${record.studentId}_${record.instructorId}_${record.day}_${record.startTime}`;
          record.createdAt = new Date();
          record.createdBy = audit;
          return record;
        }
      },
      [Keys.ROLES]: {
        sheet: rolesSheet
      },
      [Keys.ATTENDANCE]: {
        sheet: attendanceSheet,
        archive: (existingSheetName) => `${existingSheetName}_archived_${new Date().toISOString().slice(0, 10)}`,
        extractValues: (record) => {
          return [
            record.registrationId,
            record.createdAt,
            record.createdBy
          ];
        },
        process: (record, audit) => {
          record.createdAt = new Date();
          record.createdBy = audit;
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
    const { sheet, process, extractValues } = this.workingSheetInfo[sheetKey];
    if (!process) {
      throw new Error(`No process function defined for sheet key: ${sheetKey}`);
    }

    if (!extractValues) {
      throw new Error(`No extractValues function defined for sheet key: ${sheetKey}`);
    }

    const clonedRecord = CloneUtility.clone(record, new Registration());
    const processedRecord = process(clonedRecord, audit);
    const values = extractValues(processedRecord);
    
    sheet.appendRow(values);

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

  archiveSheet(sheetKey) {
    const { sheet, archive } = this.workingSheetInfo[sheetKey];

    if (!archive) {
      throw new Error(`No archive function defined for sheet key: ${sheetKey}`);
    }

    // change the name of the sheet passing in existing sheet name
    const newSheetName = archive(sheet.getName());
    // check if the new sheet name already exists
    const existingSheets = this.workingSpreadsheet.getSheets();
    if (existingSheets.some(s => s.getName() === newSheetName)) {
      throw new Error(`A sheet with the name "${newSheetName}" already exists.`);
    }
    
    sheet.setName(newSheetName);

    // create new sheet
    const newSheet = this.workingSpreadsheet.insertSheet(sheetKey);
    // copy the header row from the archived sheet to the new sheet
    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues();
    newSheet.getRange(1, 1, 1, headerRow[0].length).setValues(headerRow);
    this.workingSheetInfo[sheetKey].sheet = newSheet;
    Logger.log(`Sheet "${newSheetName}" archived and new sheet created.`);
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