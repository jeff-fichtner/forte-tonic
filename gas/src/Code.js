/**
 * Tonic Google Apps Script Project
 *
 * This project contains Google Apps Script migrations and utilities
 * for managing the Tonic Google Sheets database.
 *
 * Main Functions:
 * - Database migrations for structural improvements
 * - Data processing and cleanup utilities
 * - Parent/student relationship management
 *
 * Usage:
 * 1. Run preview functions first to see what will change
 * 2. Execute migrations to apply changes
 * 3. Use rollback functions if needed to undo changes
 */

/**
 * Project information and available functions
 */
function getProjectInfo() {
  console.log('🚀 TONIC GOOGLE APPS SCRIPT PROJECT');
  console.log('==================================');
  console.log('');
  console.log('📋 AVAILABLE MIGRATIONS:');
  console.log('');
  console.log('Migration 001: Structural Improvements');
  console.log('  • previewStructuralImprovements()');
  console.log('  • runStructuralImprovements()');
  console.log('  • rollbackStructuralImprovements()');
  console.log('  • restoreStructuralImprovementsFromBackup()');
  console.log('  • deleteStructuralImprovementsBackup()');
  console.log('');
  console.log('DEV Migration 002: Fill and Reset Registrations');
  console.log('  • previewFillAndResetRegistrationsMigration()');
  console.log('  • runFillAndResetRegistrationsMigration()');
  console.log('  • rollbackFillAndResetRegistrationsMigration()');
  console.log('  • restoreFillAndResetRegistrationsFromBackup()');
  console.log('  • deleteFillAndResetRegistrationsBackup()');
  console.log('');
  console.log('🔧 UTILITIES:');
  console.log('  • validateConfiguration()');
  console.log('  • listAllBackups()');
  console.log('  • validateDevelopmentEnvironment()');
  console.log('');
  console.log('� BACKUP MANAGEMENT:');
  console.log('  • All migrations create automatic backups');
  console.log('  • Use restore functions to recover from backups');
  console.log('  • Use delete functions to clean up old backups');
  console.log('');
  console.log('⚠️  DEPLOYMENT:');
  console.log('  • Use clasp push to deploy changes');
  console.log('  • Run npm run deploy for initial setup');
  console.log('  • Always run preview functions first!');
  console.log('');
  console.log('📖 See project documentation for detailed instructions.');
}

/**
 * Quick health check of the current spreadsheet
 */
function checkSpreadsheetHealth() {
  console.log('🔍 SPREADSHEET HEALTH CHECK');
  console.log('===========================');

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    console.log(`📊 Spreadsheet: ${spreadsheet.getName()}`);
    console.log(`🔗 URL: ${spreadsheet.getUrl()}`);

    const sheets = spreadsheet.getSheets();
    console.log(`\\n📋 Found ${sheets.length} sheets:`);

    sheets.forEach((sheet, index) => {
      const rows = sheet.getLastRow();
      const cols = sheet.getLastColumn();
      console.log(`   ${index + 1}. ${sheet.getName()} (${rows} rows × ${cols} columns)`);
    });

    // Check for key sheets
    const keySheets = ['students', 'parents', 'instructors', 'registrations', 'classes'];
    console.log('\\n🔑 Key Sheets Status:');

    keySheets.forEach(sheetName => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (sheet) {
        const dataRows = sheet.getLastRow() - 1; // Subtract header row
        console.log(`   ✅ ${sheetName}: ${dataRows} data rows`);
      } else {
        console.log(`   ❌ ${sheetName}: NOT FOUND`);
      }
    });

    console.log('\\n✅ Health check completed');
  } catch (error) {
    console.error('❌ Health check failed:', error.toString());
  }
}

/**
 * Run all migration previews to get a complete overview
 */
function previewAllMigrations() {
  console.log('🔍 PREVIEW ALL MIGRATIONS');
  console.log('=========================');

  try {
    console.log('\\n--- Migration 001: Structural Improvements ---');
    previewStructuralImprovements();

    console.log('\\n--- Migration 002: Add Class Names to Registration ---');
    previewAddClassNamesToRegistration();

    console.log('\\n--- Migration 003: Process Parents ---');
    previewProcessParents();

    console.log('\\n✅ All migration previews completed');
  } catch (error) {
    console.error('❌ Preview all migrations failed:', error.toString());
  }
}

/**
 * Safety function to create a backup notification
 */
function createBackupReminder() {
  console.log('💾 BACKUP REMINDER');
  console.log('==================');
  console.log('');
  console.log('Before running any migrations, please:');
  console.log('');
  console.log('1. 📁 Go to File > Make a copy');
  console.log('2. 📝 Name it: "Tonic_Backup_" + today\'s date');
  console.log('3. 📌 Keep the backup until migrations are verified');
  console.log('');
  console.log('This ensures you can restore your data if needed.');
  console.log('');
  console.log('✅ Once backup is created, you can safely run migrations');
}

/**
 * Menu function to add custom menu to Google Sheets
 * This will add a "Tonic Migrations" menu to the Google Sheets interface
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('Tonic Migrations')
    .addItem('📋 Project Info', 'getProjectInfo')
    .addItem('🔍 Health Check', 'checkSpreadsheetHealth')
    .addSeparator()
    .addSubMenu(
      ui
        .createMenu('Preview Migrations')
        .addItem('Preview All', 'previewAllMigrations')
        .addSeparator()
        .addItem('001: Structural Improvements', 'previewStructuralImprovements')
        .addItem('002: Add Class Names', 'previewAddClassNamesToRegistration')
        .addItem('003: Process Parents', 'previewProcessParents')
    )
    .addSeparator()
    .addSubMenu(
      ui
        .createMenu('Run Migrations')
        .addItem('⚠️ Backup Reminder', 'createBackupReminder')
        .addSeparator()
        .addItem('001: Structural Improvements', 'runStructuralImprovements')
        .addItem('002: Add Class Names', 'runAddClassNamesToRegistration')
        .addItem('003: Process Parents', 'runProcessParents')
    )
    .addSubMenu(
      ui
        .createMenu('Rollback Migrations')
        .addItem('001: Rollback Structural', 'rollbackStructuralImprovements')
        .addItem('002: Rollback Class Names', 'rollbackAddClassNamesToRegistration')
        .addItem('003: Rollback Parents', 'rollbackProcessParents')
    )
    .addToUi();
}
