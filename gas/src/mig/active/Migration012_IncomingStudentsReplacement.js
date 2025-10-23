/**
 * Google Apps Script Migration 012: Replace Students and Parents from Incoming Data
 *
 * 🎯 PURPOSE:
 * Replaces the students and parents tables with data from the 'incoming-students' sheet
 * while preserving existing nicknames.
 *
 * 📋 WHAT IT DOES:
 * - Reads data from 'incoming-students' sheet
 * - Creates new students table with preserved nicknames
 * - Creates new parents table with generated access codes
 * - Maintains parent-student relationships
 *
 * 🚀 TO USE:
 * 1. Set spreadsheet ID in Config.js
 * 2. Ensure 'incoming-students' sheet exists with proper format
 * 3. Deploy with clasp push
 * 4. Run: runIncomingStudentsReplacementMigration() - Creates MIGRATION_* working copies
 * 5. Review MIGRATION_students and MIGRATION_parents sheets
 * 6. Run: applyIncomingStudentsReplacementMigration() - Makes changes permanent (DESTRUCTIVE)
 */

/**
 * Step 1: Run migration - Creates working copies with new data
 */
function runIncomingStudentsReplacementMigration() {
  const migration = new IncomingStudentsReplacementMigration(getSpreadsheetId());
  migration.run();
}

/**
 * Step 2: Apply migration - Makes changes permanent
 * WARNING: DESTRUCTIVE - Deletes original tables and renames working copies
 */
function applyIncomingStudentsReplacementMigration() {
  const migration = new IncomingStudentsReplacementMigration(getSpreadsheetId());
  migration.apply();
}

/**
 * Migration class for replacing students and parents from incoming data
 */
class IncomingStudentsReplacementMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.migrationName = 'IncomingStudentsReplacement';

    this.sheetsToMigrate = [
      { original: 'students', working: 'MIGRATION_students' },
      { original: 'parents', working: 'MIGRATION_parents' }
    ];
  }

  /**
   * Run migration - Create working copies with new data
   */
  run() {
    Logger.log(`🚀 RUNNING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));

    try {
      // Load incoming data
      Logger.log('\n📥 Loading incoming-students data...');
      const incomingSheet = this.spreadsheet.getSheetByName('incoming-students');
      if (!incomingSheet) {
        throw new Error('incoming-students sheet not found');
      }

      const incomingData = incomingSheet.getDataRange().getValues();
      const incomingRows = incomingData.slice(1).filter(row => row[0]);
      Logger.log(`   Found ${incomingRows.length} incoming student records`);

      // Load existing students to preserve nicknames
      Logger.log('\n🏷️  Loading existing student nicknames...');
      const existingStudents = this._loadExistingStudents();
      Logger.log(`   Found ${existingStudents.size} existing students`);

      // Process incoming data
      Logger.log('\n🔧 Processing incoming data...');
      const { students, parents } = this._processIncomingData(incomingRows, existingStudents);
      Logger.log(`   Prepared ${students.length} student records`);
      Logger.log(`   Prepared ${parents.length} parent records`);

      // Create working copies
      this._createWorkingStudentsSheet(students);
      this._createWorkingParentsSheet(parents);

      Logger.log('\n🎉 MIGRATION RUN COMPLETED!');
      Logger.log('\n📋 Next steps:');
      Logger.log('   1. Review MIGRATION_students and MIGRATION_parents sheets');
      Logger.log('   2. Run applyIncomingStudentsReplacementMigration() to make permanent');
      Logger.log('   ⚠️  WARNING: apply() is DESTRUCTIVE and cannot be undone!');

    } catch (error) {
      Logger.log(`\n❌ MIGRATION RUN FAILED: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply migration - Make changes permanent
   * DESTRUCTIVE: Deletes original tables and renames working copies
   */
  apply() {
    Logger.log(`⚠️  APPLYING MIGRATION: ${this.migrationName}`);
    Logger.log('='.repeat(42 + this.migrationName.length));
    Logger.log('⚠️  WARNING: This is DESTRUCTIVE and cannot be undone!');

    try {
      // Verify all working copies exist
      const missingSheets = [];
      this.sheetsToMigrate.forEach(({ working }) => {
        if (!this.spreadsheet.getSheetByName(working)) {
          missingSheets.push(working);
        }
      });

      if (missingSheets.length > 0) {
        throw new Error(`Working copies not found: ${missingSheets.join(', ')}. Run runIncomingStudentsReplacementMigration() first.`);
      }

      // Process each sheet
      this.sheetsToMigrate.forEach(({ original, working }) => {
        Logger.log(`\n📊 Processing ${original}...`);

        // Delete original
        const originalSheet = this.spreadsheet.getSheetByName(original);
        if (originalSheet) {
          Logger.log(`   🗑️  Deleting original ${original}`);
          this.spreadsheet.deleteSheet(originalSheet);
        }

        // Rename working copy to original
        const workingSheet = this.spreadsheet.getSheetByName(working);
        Logger.log(`   ✏️  Renaming ${working} → ${original}`);
        workingSheet.setName(original);
      });

      Logger.log('\n🎉 MIGRATION APPLIED SUCCESSFULLY!');
      Logger.log('   Students and parents tables replaced with incoming data');
      Logger.log('   Changes are now permanent');

    } catch (error) {
      Logger.log(`\n❌ MIGRATION APPLY FAILED: ${error.message}`);
      Logger.log('   Original tables may still exist - check manually');
      throw error;
    }
  }

  /**
   * Load existing students to preserve nicknames
   */
  _loadExistingStudents() {
    const studentsMap = new Map();
    const studentsSheet = this.spreadsheet.getSheetByName('students');

    if (!studentsSheet) {
      return studentsMap;
    }

    const data = studentsSheet.getDataRange().getValues();
    const rows = data.slice(1).filter(row => row[0]);

    rows.forEach(row => {
      const personId = row[0].toString();
      studentsMap.set(personId, {
        lastNickname: row[3] || '',
        firstNickname: row[4] || ''
      });
    });

    return studentsMap;
  }

  /**
   * Process incoming data into students and parents structures
   */
  _processIncomingData(incomingRows, existingStudents) {
    const students = [];
    const parents = [];
    const parentIdMap = new Map();

    incomingRows.forEach(row => {
      const personId = row[0].toString();
      const currentGrade = row[1];
      const fullName = row[2];
      const parent1Name = row[3];
      const parent1Email = row[4];
      const parent1Mobile = row[5];
      const parent2Name = row[6];
      const parent2Email = row[7];
      const parent2Mobile = row[8];

      // Parse student data
      const nameParts = this._parseFullName(fullName);
      const grade = this._parseGrade(currentGrade);

      // Get preserved nicknames
      const preserved = existingStudents.get(personId);

      // Process Parent 1
      let parent1Id = null;
      if (parent1Email && parent1Name) {
        const parent1Data = this._processParentData(parent1Name, parent1Email, parent1Mobile);
        if (!parentIdMap.has(parent1Data.id)) {
          parents.push(parent1Data);
          parentIdMap.set(parent1Data.id, parent1Data);
        }
        parent1Id = parent1Data.id;
      }

      // Process Parent 2
      let parent2Id = null;
      if (parent2Email && parent2Name && parent2Name !== 'None') {
        const parent2Data = this._processParentData(parent2Name, parent2Email, parent2Mobile);
        if (!parentIdMap.has(parent2Data.id)) {
          parents.push(parent2Data);
          parentIdMap.set(parent2Data.id, parent2Data);
        }
        parent2Id = parent2Data.id;
      }

      // Create student record
      students.push({
        id: personId,
        lastName: nameParts.lastName,
        firstName: nameParts.firstName,
        lastNickname: preserved?.lastNickname || '',
        firstNickname: preserved?.firstNickname || '',
        grade: grade,
        parent1Id: parent1Id || '',
        parent2Id: parent2Id || ''
      });
    });

    return { students, parents };
  }

  /**
   * Parse full name into first and last name
   */
  _parseFullName(fullName) {
    if (!fullName) return { firstName: '', lastName: '' };

    const parts = fullName.trim().split(',').map(p => p.trim());

    if (parts.length >= 2) {
      return {
        lastName: parts[0],
        firstName: parts[1]
      };
    } else {
      const spaceParts = fullName.trim().split(' ');
      return {
        firstName: spaceParts[0] || '',
        lastName: spaceParts.slice(1).join(' ') || ''
      };
    }
  }

  /**
   * Parse grade string to number
   */
  _parseGrade(gradeStr) {
    if (!gradeStr) return 0;

    const grade = gradeStr.toString().toLowerCase();

    if (grade.includes('kindergarten') || grade.includes('k')) {
      return 0;
    }

    const match = grade.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Process parent data and generate proper IDs and access codes
   */
  _processParentData(fullName, email, mobile) {
    const nameParts = this._parseFullName(fullName);
    const formattedPhone = this._formatPhoneNumber(mobile);
    const accessCode = this._generateAccessCodeFromPhone(formattedPhone);

    // Generate parent ID: Email_LastName_FirstName
    const parentId = `${email.toUpperCase()}_${nameParts.lastName.toUpperCase()}_${nameParts.firstName.toUpperCase()}`;

    return {
      id: parentId,
      email: email.toUpperCase(),
      lastName: nameParts.lastName,
      firstName: nameParts.firstName,
      phone: formattedPhone,
      accessCode: accessCode
    };
  }

  /**
   * Format phone number to XXXXXXXXXX
   */
  _formatPhoneNumber(phone) {
    if (!phone) return 'XXXXXXXXXX';

    const digits = phone.toString().replace(/\D/g, '');

    if (digits.length === 10) {
      return digits;
    }

    if (digits.length === 11 && digits.startsWith('1')) {
      return digits.substring(1);
    }

    return 'XXXXXXXXXX';
  }

  /**
   * Generate 4-digit access code from last 4 digits of phone
   */
  _generateAccessCodeFromPhone(phone) {
    if (!phone || phone === 'XXXXXXXXXX') {
      return Math.floor(Math.random() * 9000) + 1000;
    }

    const lastFour = phone.slice(-4);
    return lastFour.padStart(4, '0');
  }

  /**
   * Create working students sheet
   */
  _createWorkingStudentsSheet(students) {
    const workingName = 'MIGRATION_students';

    // Delete previous working copy if exists
    const existingWorking = this.spreadsheet.getSheetByName(workingName);
    if (existingWorking) {
      Logger.log(`   🗑️  Deleting previous ${workingName}`);
      this.spreadsheet.deleteSheet(existingWorking);
    }

    // Create new sheet
    Logger.log(`\n📊 Creating ${workingName}...`);
    const sheet = this.spreadsheet.insertSheet(workingName);

    const headers = ['Id', 'LastName', 'FirstName', 'LastNickname', 'FirstNickname', 'Grade', 'Parent1Id', 'Parent2Id'];

    const dataRows = students.map(s => [
      s.id,
      s.lastName,
      s.firstName,
      s.lastNickname,
      s.firstNickname,
      s.grade,
      s.parent1Id,
      s.parent2Id
    ]);

    const allData = [headers, ...dataRows];
    sheet.getRange(1, 1, allData.length, headers.length).setValues(allData);

    Logger.log(`   ✅ Created ${workingName} with ${students.length} records`);
  }

  /**
   * Create working parents sheet
   */
  _createWorkingParentsSheet(parents) {
    const workingName = 'MIGRATION_parents';

    // Delete previous working copy if exists
    const existingWorking = this.spreadsheet.getSheetByName(workingName);
    if (existingWorking) {
      Logger.log(`   🗑️  Deleting previous ${workingName}`);
      this.spreadsheet.deleteSheet(existingWorking);
    }

    // Create new sheet
    Logger.log(`\n📊 Creating ${workingName}...`);
    const sheet = this.spreadsheet.insertSheet(workingName);

    const headers = ['Id', 'Email', 'LastName', 'FirstName', 'Phone', 'AccessCode'];

    const dataRows = parents.map(p => [
      p.id,
      p.email,
      p.lastName,
      p.firstName,
      p.phone,
      p.accessCode
    ]);

    const allData = [headers, ...dataRows];
    sheet.getRange(1, 1, allData.length, headers.length).setValues(allData);

    // Format AccessCode column as text to preserve leading zeros
    if (dataRows.length > 0) {
      const accessCodeRange = sheet.getRange(2, 6, dataRows.length, 1);
      accessCodeRange.setNumberFormat('@');

      for (let i = 0; i < dataRows.length; i++) {
        const code = dataRows[i][5].toString().padStart(4, '0');
        sheet.getRange(i + 2, 6).setValue(code);
      }
    }

    Logger.log(`   ✅ Created ${workingName} with ${parents.length} records`);
  }
}
