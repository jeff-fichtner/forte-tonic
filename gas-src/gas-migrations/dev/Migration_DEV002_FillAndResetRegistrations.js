/**
 * Google Apps Script Migration DEV002: Fill and Reset Registrations
 *
 * DEVELOPMENT MIGRATION - Use only in development/testing environments!
 *
 * Features:
 * - Fill database with registrations per student:
 *   - 40% students: no registrations
 *   - 45% students: one registration
 *   - 15% students: two registrations
 *   - 80% of group classes filled, distributed (some full, some partially filled)
 *   - Optionally create audit records for registration actions
 * - Wipe/reset all registrations (and optionally audit data)
 *
 * To use:
 * 1. Open your Google Sheets document (DEVELOPMENT ONLY!)
 * 2. Go to Extensions > Apps Script
 * 3. Copy this entire file content into a new .gs file
 * 4. Configure spreadsheet ID in Config.js (loaded automatically)
 * 5. Run the main function: runFillAndResetRegistrationsMigration()
 */

function runFillAndResetRegistrationsMigration(options) {
  const migration = new FillAndResetRegistrationsMigration(getSpreadsheetId(), options);
  migration.execute();
}

function previewFillAndResetRegistrationsMigration(options) {
  const migration = new FillAndResetRegistrationsMigration(getSpreadsheetId(), options);
  migration.preview();
}

function rollbackFillAndResetRegistrationsMigration(options) {
  const migration = new FillAndResetRegistrationsMigration(getSpreadsheetId(), options);
  migration.rollback();
}

/**
 * Restore from automatic backup and delete the backup
 */
function restoreFillAndResetRegistrationsFromBackup() {
  return restoreFromBackup('Migration_DEV002_FillAndResetRegistrations');
}

/**
 * Delete backup without restoring
 */
function deleteFillAndResetRegistrationsBackup() {
  return deleteBackup('Migration_DEV002_FillAndResetRegistrations');
}

/**
 * Migration class for filling and resetting registrations
 */
class FillAndResetRegistrationsMigration {
  constructor(spreadsheetId, options = {}) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.options = options;
    this.studentsSheet = this.spreadsheet.getSheetByName('students');
    this.registrationsSheet = this.spreadsheet.getSheetByName('registrations');
    this.classesSheet = this.spreadsheet.getSheetByName('classes');
    this.auditSheet = this.spreadsheet.getSheetByName('audit');
  }

  execute() {
    // Create automatic backup before starting
    console.log('📦 Creating automatic backup...');
    const sheetsToBackup = ['students', 'registrations', 'classes'];
    if (this.auditSheet && this.options.createAudit) {
      sheetsToBackup.push('audit');
    }
    
    const backupResult = createMigrationBackup('Migration_DEV002_FillAndResetRegistrations', sheetsToBackup);
    
    if (!backupResult.success) {
      console.error('❌ Failed to create backup, aborting migration');
      throw new Error(`Backup failed: ${backupResult.error}`);
    }
    
    console.log('✅ Backup created successfully');

    if (this.options && this.options.reset) {
      this.resetRegistrations(this.options.wipeAudit);
    } else {
      this.fillRegistrations(this.options.createAudit);
    }
  }

  preview() {
    // Implement preview logic if needed
    console.log('Preview not implemented for DEV002.');
  }

  rollback() {
    console.log('🔄 ROLLING BACK MIGRATION: Fill and Reset Registrations');
    console.log('====================================================');

    try {
      // First try to restore from automatic backup
      console.log('🔍 Checking for automatic backup...');
      const backupInfo = findLatestBackup('Migration_DEV002_FillAndResetRegistrations');
      
      if (backupInfo) {
        console.log('✅ Automatic backup found, restoring...');
        const restoreResult = restoreFromBackup('Migration_DEV002_FillAndResetRegistrations');
        
        if (restoreResult.success) {
          console.log('✅ ROLLBACK COMPLETED using automatic backup');
          console.log(`Restored sheets: ${restoreResult.restoredSheets.join(', ')}`);
          return { success: true, method: 'automatic_backup', restoredSheets: restoreResult.restoredSheets };
        } else {
          console.log('❌ Automatic backup restore failed, falling back to manual restoration');
        }
      } else {
        console.log('ℹ️  No automatic backup found, using manual restoration');
      }

      // Manual restoration as fallback
      console.log('📝 Performing manual restoration...');
      console.log('⚠️  Manual rollback for this migration requires clearing registrations');
      
      // Reset registrations as manual fallback
      this.resetRegistrations(true); // Clear both registrations and audit
      
      console.log('\n✅ ROLLBACK COMPLETED using manual restoration');
      console.log('\n⚠️  Note: Manual restoration cleared all registrations and audit data');
      console.log('   • For complete data restoration, use automatic backup before migration');

      return { success: true, method: 'manual_restoration' };
    } catch (error) {
      console.error('❌ Rollback failed:', error.toString());
      return { success: false, error: error.toString() };
    }
  }

  fillRegistrations(createAudit = false) {
    const students = this.getSheetData(this.studentsSheet);
    const classes = this.getSheetData(this.classesSheet);
    const registrations = [];
    const audits = [];

    // Shuffle students for random assignment
    const shuffledStudents = this.shuffleArray(students);
    const total = shuffledStudents.length;
    const noneCount = Math.floor(total * 0.4);
    const oneCount = Math.floor(total * 0.45);
    const twoCount = total - noneCount - oneCount;

    // Assign registration counts
    let idx = 0;
    for (; idx < noneCount; idx++) {
      // No registration
    }
    for (; idx < noneCount + oneCount; idx++) {
      registrations.push(...this.createRegistrationsForStudent(shuffledStudents[idx], classes, 1, createAudit, audits));
    }
    for (; idx < total; idx++) {
      registrations.push(...this.createRegistrationsForStudent(shuffledStudents[idx], classes, 2, createAudit, audits));
    }

    // Fill group classes to 80% capacity
    this.fillGroupClasses(classes, registrations, 0.8);

    // Write registrations to sheet
    this.writeSheetData(this.registrationsSheet, registrations);
    if (createAudit && audits.length > 0) {
      this.writeSheetData(this.auditSheet, audits, true);
    }
  }

  resetRegistrations(wipeAudit = false) {
    // Clear registrations sheet
    this.registrationsSheet.clearContents();
    // Optionally clear audit sheet
    if (wipeAudit && this.auditSheet) {
      this.auditSheet.clearContents();
    }
  }

  getSheetData(sheet) {
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    return data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
  }

  writeSheetData(sheet, data, append = false) {
    if (!sheet || data.length === 0) return;
    const headers = Object.keys(data[0]);
    if (!append) {
      sheet.clearContents();
      sheet.appendRow(headers);
    }
    data.forEach(obj => {
      sheet.appendRow(headers.map(h => obj[h]));
    });
  }

  createRegistrationsForStudent(student, classes, count, createAudit, audits) {
    // Randomly assign group classes
    const groupClasses = classes.filter(c => c.type === 'group');
    const selected = this.shuffleArray(groupClasses).slice(0, count);
    const regs = [];
    selected.forEach(cls => {
      const reg = {
        studentId: student.id,
        classId: cls.id,
        status: 'registered',
        timestamp: new Date().toISOString(),
      };
      regs.push(reg);
      if (createAudit) {
        audits.push({
          action: 'register',
          studentId: student.id,
          classId: cls.id,
          timestamp: reg.timestamp,
        });
      }
    });
    return regs;
  }

  fillGroupClasses(classes, registrations, fillPercent) {
    // For each group class, ensure fillPercent of capacity is reached
    const groupClasses = classes.filter(c => c.type === 'group');
    groupClasses.forEach(cls => {
      const current = registrations.filter(r => r.classId === cls.id).length;
      const target = Math.floor(cls.capacity * fillPercent);
      if (current < target) {
        // Add dummy registrations to fill up
        for (let i = current; i < target; i++) {
          registrations.push({
            studentId: `dummy_${cls.id}_${i}`,
            classId: cls.id,
            status: 'registered',
            timestamp: new Date().toISOString(),
          });
        }
      }
    });
  }

  shuffleArray(array) {
    // Fisher-Yates shuffle
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
