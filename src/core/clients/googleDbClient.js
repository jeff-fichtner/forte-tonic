class GoogleDbClient {

  constructor(settings) {
    this.settings = settings;

    this.externalSpreadsheet = SpreadsheetApp.openById(settings.externalSpreadsheetId);
    ErrorHandling.throwIfNo(this.externalSpreadsheet, 'No external spreadsheet found');


    this.workingSpreadsheet = SpreadsheetApp.openById(settings.workingSpreadsheetId);
    ErrorHandling.throwIfNo(this.workingSpreadsheet, 'No working spreadsheet found');

    const adminsSheet = this.workingSpreadsheet.getSheetByName(Keys.ADMINS);
    ErrorHandling.throwIfNo(adminsSheet, `No ${Keys.ADMINS} sheet found`);

    const instructorsSheet = this.workingSpreadsheet.getSheetByName(Keys.INSTRUCTORS);
    ErrorHandling.throwIfNo(instructorsSheet, `No ${Keys.INSTRUCTORS} sheet found`);

    const studentsSheet = this.workingSpreadsheet.getSheetByName(Keys.STUDENTS);
    ErrorHandling.throwIfNo(studentsSheet, `No ${Keys.STUDENTS} sheet found`);

    const parentsSheet = this.workingSpreadsheet.getSheetByName(Keys.PARENTS);
    ErrorHandling.throwIfNo(parentsSheet, `No ${Keys.PARENTS} sheet found`);

    const roomsSheet = this.workingSpreadsheet.getSheetByName(Keys.ROOMS);
    ErrorHandling.throwIfNo(roomsSheet, `No ${Keys.ROOMS} sheet found`);

    const classesSheet = this.workingSpreadsheet.getSheetByName(Keys.CLASSES);
    ErrorHandling.throwIfNo(classesSheet, `No ${Keys.CLASSES} sheet found`);

    const registrationsSheet = this.workingSpreadsheet.getSheetByName(Keys.REGISTRATIONS);
    ErrorHandling.throwIfNo(registrationsSheet, `No ${Keys.REGISTRATIONS} sheet found`);

    this.workingSheets = {
      [Keys.ADMINS]: adminsSheet,
      [Keys.INSTRUCTORS]: instructorsSheet,
      [Keys.STUDENTS]: studentsSheet,
      [Keys.PARENTS]: parentsSheet,
      [Keys.ROOMS]: roomsSheet,
      [Keys.CLASSES]: classesSheet,
      [Keys.REGISTRATIONS]: registrationsSheet
    }

    // TODO: set up a cache separate from working sheet
    // const workingFolder = DriveApp.getFolderById(settings.workingFolderId);
    // ErrorHandling.throwIfNo(workingFolder, 'No working folder found');

    // const cacheSpreadsheet = this.getOrCreateSpreadsheetByFolderAndName_(workingFolder, settings.cacheSpreadsheetName);
    // deleteAllSheetsExceptLast_(cacheSpreadsheet);
  }

  getAllRecords(sheetKey, mapFunc) {
    const sheet = this.workingSheets[sheetKey];
    const data = sheet.getDataRange().getValues();

    // Map the data to objects using the provided mapping function
    const mappedData =
      data.slice(1) // skip header row
        .map(row => mapFunc(row));

    return mappedData;
  }

  insertRecord(sheetKey, record) {
    // const sheet = this.getSheetByNameOrCreate_(sheetKey);
    // const lastRow = sheet.getLastRow();
    // const newRow = lastRow + 1;
    // const range = sheet.getRange(newRow, 1, 1, record.length);
    // range.setValues([record]);
  }

  deleteRecord(sheetKey, findFunc) {

  }

  getOrCreateSpreadsheetByFolderAndName_(folder, spreadsheetName) {
    let spreadsheet;

    const files = folder.getFilesByName(spreadsheetName);
    if (files.hasNext()) {
      spreadsheet = SpreadsheetApp.openById(files.next().getId());
    } else {
      spreadsheet = createSpreadsheetWithinFolder_(folder, spreadsheetName);
    }

    return spreadsheet;
  }

  createSpreadsheetWithinFolder_(folder, spreadsheetName) {
    const newSpreadsheet = SpreadsheetApp.create(spreadsheetName);
    const file = DriveApp.getFileById(newSpreadsheet.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file); // Remove from root folder
    Logger.log(`Spreadsheet "${spreadsheetName}" created and moved to folder "${folder.getName()}".`);
  }

  deleteAllSheetsExceptLast_(spreadsheet) {
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