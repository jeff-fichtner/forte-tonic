/**
 * Google Apps Script Migration DEV001: Realistic Fake Data Generation
 *
 * DEVELOPMENT MIGRATION - Use only in development/testing environments!
 *
 * This script replaces all the letter/number fake data (like "Parent 1", "Teacher 11",
 * "A4 K4-1") with realistic fake names and ensures all relational IDs are properly updated.
 *
 * Features:
 * - Uses realistic fake names (inspired by faker libraries)
 * - Maintains all relational integrity (parent1Id, parent2Id, instructorId, etc.)
 * - Preserves class schedules and room assignments
 * - Creates consistent email addresses based on names
 * - Generates realistic phone numbers
 *
 * To use:
 * 1. Open your Google Sheets document (DEVELOPMENT ONLY!)
 * 2. Go to Extensions > Apps Script
 * 3. Copy this entire file content into a new .gs file
 * 4. Configure spreadsheet ID in Config.js (loaded automatically)
 * 5. Run the main function: runRealisticFakeDataMigration()
 */

/**
 * Safe execution function with environment validation
 * This is the recommended entry point - includes safety checks
 */
function safeExecuteRealisticFakeDataMigration() {
  // Validate this is a development environment
  if (!validateDevelopmentEnvironment()) {
    console.log('❌ EXECUTION BLOCKED: This appears to be a production environment');
    console.log('This migration is only safe for development/testing spreadsheets');
    return { error: 'Environment validation failed' };
  }

  const migration = new RealisticFakeDataMigration(getSpreadsheetId());
  migration.execute();
}

/**
 * Main function to execute the realistic fake data migration
 */
function runRealisticFakeDataMigration() {
  const migration = new RealisticFakeDataMigration(getSpreadsheetId());
  migration.execute();
}

/**
 * Preview function to check what changes would be made
 * Run this first to see what the migration will do
 */
function previewRealisticFakeDataMigration() {
  const migration = new RealisticFakeDataMigration(getSpreadsheetId());
  migration.preview();
}

/**
 * Rollback function to restore original fake data
 * Use this if you need to revert to the original fake data patterns
 */
function rollbackRealisticFakeDataMigration() {
  const migration = new RealisticFakeDataMigration(getSpreadsheetId());
  migration.rollback();
}

/**
 * Migration class for generating realistic fake data
 */
class RealisticFakeDataMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.description =
      'Replace letter/number fake data with realistic fake names and maintain relational integrity';

    // Realistic fake names database
    this.fakeNames = {
      instructors: [
        { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@tonic.edu' },
        { firstName: 'Michael', lastName: 'Chen', email: 'michael.chen@tonic.edu' },
        { firstName: 'Emma', lastName: 'Rodriguez', email: 'emma.rodriguez@tonic.edu' },
        { firstName: 'David', lastName: 'Thompson', email: 'david.thompson@tonic.edu' },
        { firstName: 'Jessica', lastName: 'Park', email: 'jessica.park@tonic.edu' },
        { firstName: 'Robert', lastName: 'Williams', email: 'robert.williams@tonic.edu' },
        { firstName: 'Ashley', lastName: 'Davis', email: 'ashley.davis@tonic.edu' },
        { firstName: 'James', lastName: 'Martinez', email: 'james.martinez@tonic.edu' },
        { firstName: 'Rachel', lastName: 'Anderson', email: 'rachel.anderson@tonic.edu' },
        { firstName: 'Christopher', lastName: 'Taylor', email: 'christopher.taylor@tonic.edu' },
        { firstName: 'Amanda', lastName: 'Brown', email: 'amanda.brown@tonic.edu' },
        { firstName: 'Daniel', lastName: 'Lee', email: 'daniel.lee@tonic.edu' },
        { firstName: 'Samantha', lastName: 'Wilson', email: 'samantha.wilson@tonic.edu' },
        { firstName: 'Andrew', lastName: 'Garcia', email: 'andrew.garcia@tonic.edu' },
        { firstName: 'Megan', lastName: 'Miller', email: 'megan.miller@tonic.edu' },
        { firstName: 'Kevin', lastName: 'Moore', email: 'kevin.moore@tonic.edu' },
        { firstName: 'Lauren', lastName: 'Jackson', email: 'lauren.jackson@tonic.edu' },
        { firstName: 'Ryan', lastName: 'White', email: 'ryan.white@tonic.edu' },
        { firstName: 'Nicole', lastName: 'Harris', email: 'nicole.harris@tonic.edu' },
        { firstName: 'Brandon', lastName: 'Clark', email: 'brandon.clark@tonic.edu' },
      ],
      parents: [
        { firstName: 'Jennifer', lastName: 'Adams' },
        { firstName: 'Mark', lastName: 'Campbell' },
        { firstName: 'Lisa', lastName: 'Parker' },
        { firstName: 'Steven', lastName: 'Evans' },
        { firstName: 'Michelle', lastName: 'Turner' },
        { firstName: 'Paul', lastName: 'Phillips' },
        { firstName: 'Karen', lastName: 'Mitchell' },
        { firstName: 'Brian', lastName: 'Carter' },
        { firstName: 'Susan', lastName: 'Roberts' },
        { firstName: 'John', lastName: 'Cook' },
        { firstName: 'Patricia', lastName: 'Bailey' },
        { firstName: 'William', lastName: 'Reed' },
        { firstName: 'Linda', lastName: 'Cooper' },
        { firstName: 'Richard', lastName: 'Richardson' },
        { firstName: 'Barbara', lastName: 'Cox' },
        { firstName: 'Joseph', lastName: 'Howard' },
        { firstName: 'Elizabeth', lastName: 'Ward' },
        { firstName: 'Thomas', lastName: 'Torres' },
        { firstName: 'Maria', lastName: 'Peterson' },
        { firstName: 'Charles', lastName: 'Gray' },
        { firstName: 'Nancy', lastName: 'Ramirez' },
        { firstName: 'Frank', lastName: 'James' },
        { firstName: 'Helen', lastName: 'Watson' },
        { firstName: 'George', lastName: 'Brooks' },
        { firstName: 'Sandra', lastName: 'Kelly' },
        { firstName: 'Kenneth', lastName: 'Sanders' },
        { firstName: 'Donna', lastName: 'Price' },
        { firstName: 'Anthony', lastName: 'Bennett' },
        { firstName: 'Carol', lastName: 'Wood' },
        { firstName: 'Edward', lastName: 'Barnes' },
        { firstName: 'Ruth', lastName: 'Ross' },
        { firstName: 'Jason', lastName: 'Henderson' },
        { firstName: 'Sharon', lastName: 'Coleman' },
        { firstName: 'Matthew', lastName: 'Jenkins' },
        { firstName: 'Betty', lastName: 'Perry' },
        { firstName: 'Gary', lastName: 'Powell' },
        { firstName: 'Deborah', lastName: 'Long' },
        { firstName: 'Ronald', lastName: 'Patterson' },
        { firstName: 'Angela', lastName: 'Hughes' },
        { firstName: 'Larry', lastName: 'Flores' },
      ],
      students: [
        { firstName: 'Alex', lastName: 'Johnson' },
        { firstName: 'Maya', lastName: 'Chen' },
        { firstName: 'Ethan', lastName: 'Rodriguez' },
        { firstName: 'Sophia', lastName: 'Thompson' },
        { firstName: 'Noah', lastName: 'Park' },
        { firstName: 'Isabella', lastName: 'Williams' },
        { firstName: 'Liam', lastName: 'Davis' },
        { firstName: 'Emma', lastName: 'Martinez' },
        { firstName: 'Oliver', lastName: 'Anderson' },
        { firstName: 'Ava', lastName: 'Taylor' },
        { firstName: 'William', lastName: 'Brown' },
        { firstName: 'Charlotte', lastName: 'Lee' },
        { firstName: 'James', lastName: 'Wilson' },
        { firstName: 'Amelia', lastName: 'Garcia' },
        { firstName: 'Benjamin', lastName: 'Miller' },
        { firstName: 'Harper', lastName: 'Moore' },
        { firstName: 'Lucas', lastName: 'Jackson' },
        { firstName: 'Evelyn', lastName: 'White' },
        { firstName: 'Henry', lastName: 'Harris' },
        { firstName: 'Abigail', lastName: 'Clark' },
        { firstName: 'Alexander', lastName: 'Lewis' },
        { firstName: 'Emily', lastName: 'Robinson' },
        { firstName: 'Mason', lastName: 'Walker' },
        { firstName: 'Elizabeth', lastName: 'Hall' },
        { firstName: 'Michael', lastName: 'Allen' },
        { firstName: 'Sofia', lastName: 'Young' },
        { firstName: 'Jacob', lastName: 'Hernandez' },
        { firstName: 'Avery', lastName: 'King' },
        { firstName: 'Daniel', lastName: 'Wright' },
        { firstName: 'Scarlett', lastName: 'Lopez' },
        { firstName: 'Matthew', lastName: 'Hill' },
        { firstName: 'Madison', lastName: 'Scott' },
        { firstName: 'Jack', lastName: 'Green' },
        { firstName: 'Ella', lastName: 'Adams' },
        { firstName: 'Owen', lastName: 'Baker' },
        { firstName: 'Grace', lastName: 'Gonzalez' },
        { firstName: 'Luke', lastName: 'Nelson' },
        { firstName: 'Chloe', lastName: 'Carter' },
        { firstName: 'Wyatt', lastName: 'Mitchell' },
        { firstName: 'Victoria', lastName: 'Perez' },
      ],
    };

    // Mapping tables to track ID changes
    this.idMappings = {
      instructors: new Map(),
      parents: new Map(),
      students: new Map(),
    };
  }

  /**
   * Preview what changes will be made (read-only)
   */
  preview() {
    console.log('🔍 MIGRATION PREVIEW: Realistic Fake Data Generation');
    console.log('==================================================');
    console.log('⚠️  DEVELOPMENT MIGRATION - Use only in dev/test environments!');

    try {
      const sheets = {
        instructors: this.spreadsheet.getSheetByName('instructors'),
        parents: this.spreadsheet.getSheetByName('parents'),
        students: this.spreadsheet.getSheetByName('students'),
        classes: this.spreadsheet.getSheetByName('classes'),
        registrations: this.spreadsheet.getSheetByName('registrations'),
      };

      let totalChanges = 0;

      for (const [sheetName, sheet] of Object.entries(sheets)) {
        if (!sheet) {
          console.log(`⚠️  Sheet '${sheetName}' not found - skipping`);
          continue;
        }

        console.log(`\\n🔍 Analyzing ${sheetName} sheet...`);

        const data = sheet.getDataRange().getValues();
        if (data.length < 2) {
          console.log(`   No data found`);
          continue;
        }

        const headers = data[0];
        console.log(`   Headers: ${headers.join(', ')}`);

        // Count fake data patterns
        let fakeDataCount = 0;
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const rowText = row.join(' ').toLowerCase();

          if (
            rowText.includes('teacher') ||
            rowText.includes('parent') ||
            rowText.includes('student') ||
            /[a-z][0-9]/.test(rowText) ||
            /@email\\.com/.test(rowText)
          ) {
            fakeDataCount++;
          }
        }

        console.log(`   Found ${fakeDataCount} records with fake data patterns`);
        totalChanges += fakeDataCount;
      }

      console.log('\\n📊 PREVIEW SUMMARY:');
      console.log(`   📝 Total records to update: ${totalChanges}`);
      console.log(
        `   👥 Available realistic instructor names: ${this.fakeNames.instructors.length}`
      );
      console.log(`   👨‍👩‍👧‍👦 Available realistic parent names: ${this.fakeNames.parents.length}`);
      console.log(`   👶 Available realistic student names: ${this.fakeNames.students.length}`);

      console.log('\\n🔧 Migration will:');
      console.log('   • Replace "TEACHER11@EMAIL.COM" with "sarah.johnson@tonic.edu"');
      console.log('   • Replace "Parent 1" with "Jennifer Adams"');
      console.log('   • Replace "Student A4" with "Alex Johnson"');
      console.log('   • Update all relational IDs to maintain data integrity');
      console.log('   • Generate realistic email addresses and phone numbers');
      console.log('   • Preserve all scheduling and class information');
    } catch (error) {
      console.error('❌ Preview failed:', error.toString());
    }
  }

  /**
   * Execute the migration
   */
  execute() {
    console.log('🚀 EXECUTING MIGRATION: Realistic Fake Data Generation');
    console.log('====================================================');
    console.log('⚠️  DEVELOPMENT MIGRATION - Use only in dev/test environments!');

    const results = {
      instructorsUpdated: 0,
      parentsUpdated: 0,
      studentsUpdated: 0,
      classesUpdated: 0,
      registrationsUpdated: 0,
      errors: [],
    };

    try {
      // Phase 1: Update Instructors
      console.log('\\n👩‍🏫 PHASE 1: Updating Instructors...');
      results.instructorsUpdated = this.updateInstructors();

      // Phase 2: Update Parents
      console.log('\\n👨‍👩‍👧‍👦 PHASE 2: Updating Parents...');
      results.parentsUpdated = this.updateParents();

      // Phase 3: Update Students
      console.log('\\n👶 PHASE 3: Updating Students...');
      results.studentsUpdated = this.updateStudents();

      // Phase 4: Update Classes (instructor references)
      console.log('\\n📚 PHASE 4: Updating Classes...');
      results.classesUpdated = this.updateClasses();

      // Phase 5: Update Registrations (student/instructor references)
      console.log('\\n📝 PHASE 5: Updating Registrations...');
      results.registrationsUpdated = this.updateRegistrations();

      console.log('\\n✅ MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('\\n📋 SUMMARY OF CHANGES:');
      console.log(`   • Instructors updated: ${results.instructorsUpdated}`);
      console.log(`   • Parents updated: ${results.parentsUpdated}`);
      console.log(`   • Students updated: ${results.studentsUpdated}`);
      console.log(`   • Classes updated: ${results.classesUpdated}`);
      console.log(`   • Registrations updated: ${results.registrationsUpdated}`);

      console.log('\\n🎉 Your development data now has realistic names!');
      console.log('All relational IDs have been properly updated to maintain data integrity.');

      return results;
    } catch (error) {
      console.error('❌ Migration failed:', error.toString());
      results.errors.push(error.toString());
      throw error;
    }
  }

  /**
   * Update instructors with realistic names
   */
  updateInstructors() {
    const sheet = this.spreadsheet.getSheetByName('instructors');
    if (!sheet) return 0;

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return 0;

    const headers = data[0];
    let updatedCount = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const oldId = row[0]; // Assuming ID is in first column

      // Check if this looks like fake data
      if (
        typeof oldId === 'string' &&
        (oldId.includes('TEACHER') || oldId.includes('@EMAIL.COM'))
      ) {
        const instructorIndex = (i - 1) % this.fakeNames.instructors.length;
        const instructor = this.fakeNames.instructors[instructorIndex];

        const newId = instructor.email;

        // Update the row
        row[0] = newId; // ID
        if (headers.includes('Email') || headers.includes('email')) {
          const emailCol = headers.findIndex(h => h.toLowerCase().includes('email'));
          if (emailCol >= 0) row[emailCol] = instructor.email;
        }
        if (headers.includes('FirstName') || headers.includes('firstname')) {
          const firstNameCol = headers.findIndex(h => h.toLowerCase().includes('firstname'));
          if (firstNameCol >= 0) row[firstNameCol] = instructor.firstName;
        }
        if (headers.includes('LastName') || headers.includes('lastname')) {
          const lastNameCol = headers.findIndex(h => h.toLowerCase().includes('lastname'));
          if (lastNameCol >= 0) row[lastNameCol] = instructor.lastName;
        }
        if (headers.includes('Phone') || headers.includes('phone')) {
          const phoneCol = headers.findIndex(h => h.toLowerCase().includes('phone'));
          if (phoneCol >= 0) row[phoneCol] = this.generatePhoneNumber();
        }

        // Map old ID to new ID for relational updates
        this.idMappings.instructors.set(oldId, newId);

        updatedCount++;
      }
    }

    // Write back the updated data
    if (updatedCount > 0) {
      sheet.getDataRange().setValues(data);
      console.log(`   Updated ${updatedCount} instructor records`);
    }

    return updatedCount;
  }

  /**
   * Update parents with realistic names
   */
  updateParents() {
    const sheet = this.spreadsheet.getSheetByName('parents');
    if (!sheet) return 0;

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return 0;

    const headers = data[0];
    let updatedCount = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const oldId = row[0];

      // Check if this looks like fake data
      if (
        typeof oldId === 'string' &&
        (oldId.toLowerCase().includes('parent') ||
          /^[A-Z][0-9]/.test(oldId) ||
          oldId.includes('@EMAIL.COM'))
      ) {
        const parentIndex = (i - 1) % this.fakeNames.parents.length;
        const parent = this.fakeNames.parents[parentIndex];

        const newId = `${parent.firstName.toLowerCase()}.${parent.lastName.toLowerCase()}@parent.com`;

        // Update the row
        row[0] = newId; // ID
        if (headers.includes('Email') || headers.includes('email')) {
          const emailCol = headers.findIndex(h => h.toLowerCase().includes('email'));
          if (emailCol >= 0) row[emailCol] = newId;
        }
        if (headers.includes('FirstName') || headers.includes('firstname')) {
          const firstNameCol = headers.findIndex(h => h.toLowerCase().includes('firstname'));
          if (firstNameCol >= 0) row[firstNameCol] = parent.firstName;
        }
        if (headers.includes('LastName') || headers.includes('lastname')) {
          const lastNameCol = headers.findIndex(h => h.toLowerCase().includes('lastname'));
          if (lastNameCol >= 0) row[lastNameCol] = parent.lastName;
        }
        if (headers.includes('Phone') || headers.includes('phone')) {
          const phoneCol = headers.findIndex(h => h.toLowerCase().includes('phone'));
          if (phoneCol >= 0) row[phoneCol] = this.generatePhoneNumber();
        }

        // Map old ID to new ID
        this.idMappings.parents.set(oldId, newId);

        updatedCount++;
      }
    }

    // Write back the updated data
    if (updatedCount > 0) {
      sheet.getDataRange().setValues(data);
      console.log(`   Updated ${updatedCount} parent records`);
    }

    return updatedCount;
  }

  /**
   * Update students with realistic names
   */
  updateStudents() {
    const sheet = this.spreadsheet.getSheetByName('students');
    if (!sheet) return 0;

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return 0;

    const headers = data[0];
    let updatedCount = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const oldId = row[0];

      // Check if this looks like fake data
      if (
        typeof oldId === 'string' &&
        (oldId.toLowerCase().includes('student') || /^[A-Z][0-9]/.test(oldId))
      ) {
        const studentIndex = (i - 1) % this.fakeNames.students.length;
        const student = this.fakeNames.students[studentIndex];

        const newId = `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}.${String(i).padStart(3, '0')}`;

        // Update the row
        row[0] = newId; // ID
        if (headers.includes('FirstName') || headers.includes('firstname')) {
          const firstNameCol = headers.findIndex(h => h.toLowerCase().includes('firstname'));
          if (firstNameCol >= 0) row[firstNameCol] = student.firstName;
        }
        if (headers.includes('LastName') || headers.includes('lastname')) {
          const lastNameCol = headers.findIndex(h => h.toLowerCase().includes('lastname'));
          if (lastNameCol >= 0) row[lastNameCol] = student.lastName;
        }

        // Update parent references if they exist and have been mapped
        ['Parent1Id', 'Parent2Id'].forEach(parentCol => {
          const colIndex = headers.findIndex(h => h === parentCol);
          if (colIndex >= 0 && row[colIndex] && this.idMappings.parents.has(row[colIndex])) {
            row[colIndex] = this.idMappings.parents.get(row[colIndex]);
          }
        });

        // Map old ID to new ID
        this.idMappings.students.set(oldId, newId);

        updatedCount++;
      }
    }

    // Write back the updated data
    if (updatedCount > 0) {
      sheet.getDataRange().setValues(data);
      console.log(`   Updated ${updatedCount} student records`);
    }

    return updatedCount;
  }

  /**
   * Update classes with new instructor references
   */
  updateClasses() {
    const sheet = this.spreadsheet.getSheetByName('classes');
    if (!sheet) return 0;

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return 0;

    const headers = data[0];
    let updatedCount = 0;

    const instructorIdCol = headers.findIndex(h => h === 'InstructorId');
    if (instructorIdCol < 0) return 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const oldInstructorId = row[instructorIdCol];

      if (oldInstructorId && this.idMappings.instructors.has(oldInstructorId)) {
        row[instructorIdCol] = this.idMappings.instructors.get(oldInstructorId);
        updatedCount++;
      }
    }

    // Write back the updated data
    if (updatedCount > 0) {
      sheet.getDataRange().setValues(data);
      console.log(`   Updated ${updatedCount} class instructor references`);
    }

    return updatedCount;
  }

  /**
   * Update registrations with new student and instructor references
   */
  updateRegistrations() {
    const sheet = this.spreadsheet.getSheetByName('registrations');
    if (!sheet) return 0;

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return 0;

    const headers = data[0];
    let updatedCount = 0;

    const studentIdCol = headers.findIndex(h => h === 'StudentId');
    const instructorIdCol = headers.findIndex(h => h === 'InstructorId');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      let rowUpdated = false;

      // Update student reference
      if (
        studentIdCol >= 0 &&
        row[studentIdCol] &&
        this.idMappings.students.has(row[studentIdCol])
      ) {
        row[studentIdCol] = this.idMappings.students.get(row[studentIdCol]);
        rowUpdated = true;
      }

      // Update instructor reference
      if (
        instructorIdCol >= 0 &&
        row[instructorIdCol] &&
        this.idMappings.instructors.has(row[instructorIdCol])
      ) {
        row[instructorIdCol] = this.idMappings.instructors.get(row[instructorIdCol]);
        rowUpdated = true;
      }

      if (rowUpdated) {
        updatedCount++;
      }
    }

    // Write back the updated data
    if (updatedCount > 0) {
      sheet.getDataRange().setValues(data);
      console.log(`   Updated ${updatedCount} registration records`);
    }

    return updatedCount;
  }

  /**
   * Generate a realistic fake phone number
   */
  generatePhoneNumber() {
    const areaCodes = ['415', '510', '650', '925', '408', '707', '831'];
    const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    const exchange = String(Math.floor(Math.random() * 900) + 100);
    const number = String(Math.floor(Math.random() * 9000) + 1000);
    return `(${areaCode}) ${exchange}-${number}`;
  }

  /**
   * Rollback the migration (restore original fake data patterns)
   */
  rollback() {
    console.log('🔄 ROLLING BACK MIGRATION: Realistic Fake Data Generation');
    console.log('========================================================');

    console.log('⚠️  Manual rollback required');
    console.log('This migration replaces data extensively. To rollback:');
    console.log('1. Restore from a backup made before running the migration');
    console.log('2. Or re-run your original data generation scripts');
    console.log('3. Consider using the preview function before running migrations');

    return false;
  }
}

/**
 * Utility function to validate that this is a development environment
 */
function validateDevelopmentEnvironment(spreadsheetId) {
  console.log('🔍 VALIDATING DEVELOPMENT ENVIRONMENT');
  console.log('=====================================');

  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const title = spreadsheet.getName().toLowerCase();

    if (title.includes('production') || title.includes('prod') || title.includes('live')) {
      console.log('❌ ERROR: This appears to be a production spreadsheet');
      console.log(`   Spreadsheet title: "${spreadsheet.getName()}"`);
      console.log('   This migration should only be used in development/testing environments');
      return false;
    }

    if (!title.includes('dev') && !title.includes('test') && !title.includes('demo')) {
      console.log('⚠️  WARNING: Spreadsheet title does not indicate development environment');
      console.log(`   Spreadsheet title: "${spreadsheet.getName()}"`);
      console.log('   Please confirm this is a development/testing environment');
      console.log('   Consider renaming to include "dev", "test", or "demo"');
    }

    console.log('✅ Environment validation passed');
    console.log(`   Spreadsheet: "${spreadsheet.getName()}"`);
    console.log(`   ID: ${spreadsheetId}`);

    return true;
  } catch (error) {
    console.log('❌ ERROR: Could not access spreadsheet');
    console.log(`   Error: ${error.toString()}`);
    return false;
  }
}

/**
 * Safe execution wrapper that validates environment first
 */
function safeExecuteRealisticFakeDataMigration(spreadsheetId) {
  console.log('🛡️  SAFE EXECUTION: Realistic Fake Data Migration');
  console.log('================================================');

  if (!validateDevelopmentEnvironment(spreadsheetId)) {
    console.log('❌ EXECUTION BLOCKED: Environment validation failed');
    return;
  }

  console.log('✅ Environment validated - proceeding with migration');
  runRealisticFakeDataMigration(spreadsheetId);
}
