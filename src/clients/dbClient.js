class DbClient {

  constructor() {
    this.spreadsheet = this.getOrCreateSpreadsheet_("folder", "spreadsheet");
    this.adminEmails = [];
    this.users = [];
  }

  getAdminEmails() {
    const column = 1; // Column A (1-based index)

    // ensure individual sheet exists
    const sheet = this.getOrCreateSheet_("AdminEmails");

    // Get all values in the column
    const range = sheet.getRange(1, column, sheet.getLastRow(), 1); // From row 1 to the last row
    const values = range.getValues(); // Returns a 2D array

    // Flatten the 2D array into a list of strings
    const listOfStrings = values.map(row => row[0]);

    return listOfStrings;
  }

  getAllUsers() {
    // const column = 1; // Column A (1-based index)

    // // ensure individual sheet exists

    // // Open the spreadsheet and access the sheet
    // const sheet = getOrCreateSheet("Users");

    // // Get all values in the column
    // const range = sheet.getRange(1, column, sheet.getLastRow(), 1); // From row 1 to the last row
    // const values = range.getValues(); // Returns a 2D array

    // // Flatten the 2D array into a list of strings
    // const listOfStrings = values.map(row => row[0]);

    // return listOfStrings;
    return [
      {
        id: 1,
        firstName: "John",
        lastName: "Doe",
      }
    ];
  }

  getOrCreateSpreadsheet_(folderName, spreadsheetName) {
    // Find or create the folder
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
      Logger.log(`Folder "${folder.getName()}" already exists.`);

    } else {
      folder = DriveApp.createFolder(folderName);
      Logger.log(`Folder "${folderName}" created.`);
    }

    // Find or create the spreadsheet in the folder
    let spreadsheet;
    const files = folder.getFilesByName(spreadsheetName);
    if (files.hasNext()) {
      spreadsheet = SpreadsheetApp.openById(files.next().getId());
      Logger.log(`Spreadsheet "${spreadsheet.getName()}" already exists.`);

    } else {
      spreadsheet = SpreadsheetApp.create(spreadsheetName);
      const file = DriveApp.getFileById(spreadsheet.getId());
      folder.addFile(file);
      DriveApp.getRootFolder().removeFile(file); // Remove from root folder
      Logger.log(`Spreadsheet "${spreadsheetName}" created and moved to folder "${folderName}".`);
    }

    return spreadsheet;
  }

  throwIfNoSpreadsheet_() {
    if (!this.spreadsheet) {
      throw new Error('No spreadsheet found');
    }
  }

  getOrCreateSheet_(sheetName) {
    this.throwIfNoSpreadsheet_();

    // Check if the sheet exists
    let sheet = this.spreadsheet.getSheetByName(sheetName);

    // If the sheet doesn't exist, create it
    if (!sheet) {
      sheet = this.spreadsheet.insertSheet(sheetName);
      Logger.log(`Sheet "${sheetName}" created.`);
    } else {
      Logger.log(`Sheet "${sheetName}" already exists.`);
    }

    return sheet;
  }
}