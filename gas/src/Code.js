/**
 * Tonic Google Apps Script Project
 *
 * This project contains Google Apps Script utilities
 * for managing the Tonic Google Sheets database.
 */

/**
 * One-off utility to sort all sheet names alphabetically
 * This function will reorder the sheets in the spreadsheet alphabetically by name
 */
function sortSheetNames() {
  console.log('📑 SORTING SHEET NAMES');
  console.log('=====================');

  try {
    const spreadsheetId = getSpreadsheetId();
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    console.log(`📊 Spreadsheet: ${spreadsheet.getName()}`);
    console.log(`🔗 ID: ${spreadsheet.getId()}`);

    const sheets = spreadsheet.getSheets();
    console.log(`\n📋 Found ${sheets.length} sheets`);

    // Get sheet names and current positions
    const sheetInfo = sheets.map((sheet, index) => ({
      name: sheet.getName(),
      sheet: sheet,
      originalPosition: index + 1
    }));

    // Sort by name
    sheetInfo.sort((a, b) => a.name.localeCompare(b.name));

    console.log('\n🔄 Reordering sheets:');
    sheetInfo.forEach((info, index) => {
      const newPosition = index + 1;
      console.log(`   ${info.originalPosition} → ${newPosition}: ${info.name}`);
      spreadsheet.setActiveSheet(info.sheet);
      spreadsheet.moveActiveSheet(newPosition);
    });

    console.log('\n✅ Sheets sorted alphabetically');
  } catch (error) {
    console.error('❌ Sort failed:', error.toString());
  }
}

/**
 * One-off utility to delete all backup sheets
 * This function will delete all sheets that start with "BACKUP_"
 * WARNING: This is irreversible! Make sure you have a copy of the spreadsheet before running.
 */
function deleteAllBackupSheets() {
  console.log('🗑️  DELETE ALL BACKUP SHEETS');
  console.log('============================');
  console.log('⚠️  WARNING: This will permanently delete all backup sheets!');
  console.log('');

  try {
    const spreadsheetId = getSpreadsheetId();
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    console.log(`📊 Spreadsheet: ${spreadsheet.getName()}`);
    console.log(`🔗 ID: ${spreadsheet.getId()}`);

    const sheets = spreadsheet.getSheets();
    const backupSheets = sheets.filter(sheet => sheet.getName().startsWith('BACKUP_'));

    console.log(`\n📋 Found ${sheets.length} total sheets`);
    console.log(`🗑️  Found ${backupSheets.length} backup sheets to delete`);

    if (backupSheets.length === 0) {
      console.log('\n✅ No backup sheets found');
      return;
    }

    console.log('\n🔄 Deleting backup sheets:');
    let deletedCount = 0;

    backupSheets.forEach((sheet) => {
      try {
        const sheetName = sheet.getName();
        spreadsheet.deleteSheet(sheet);
        deletedCount++;
        console.log(`   ✓ Deleted: ${sheetName}`);
      } catch (error) {
        console.error(`   ✗ Failed to delete ${sheet.getName()}: ${error.toString()}`);
      }
    });

    console.log(`\n✅ Deleted ${deletedCount} of ${backupSheets.length} backup sheets`);
    console.log(`📊 Remaining sheets: ${spreadsheet.getSheets().length}`);
  } catch (error) {
    console.error('❌ Delete operation failed:', error.toString());
  }
}

