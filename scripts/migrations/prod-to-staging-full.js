/**
 * Production to Staging Migration - Full Database Migration
 *
 * Two-step migration pattern (inspired by GAS migrations):
 * 1. run()  - Creates ALL MIGRATION_* sheets in staging with transformed data
 * 2. apply() - Deletes original sheets and renames MIGRATION_* to final names
 *
 * Migration Order:
 * Pass 1: Instructors, Classes, Rooms (with PII anonymization)
 * Pass 2: Periods (exact copy)
 * Pass 3: Parents, Students (with family groupings preserved)
 * Pass 4: Registrations (all seasons + audit, randomized using staging data)
 *
 * Usage:
 *   node scripts/migrations/prod-to-staging-full.js run
 *   node scripts/migrations/prod-to-staging-full.js apply
 */

import { google } from 'googleapis';
import { faker } from '@faker-js/faker';
import { createLogger } from '../../src/utils/logger.js';
import { configService } from '../../src/services/configurationService.js';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current file's directory for loading credentials
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class FullDatabaseMigration {
  constructor() {
    this.logger = createLogger(configService);
    this.migrationName = 'FullDatabaseMigration';

    // All sheets to migrate (in order)
    this.sheetsToMigrate = [
      // Pass 1
      { original: 'instructors', working: 'MIGRATION_instructors' },
      { original: 'classes', working: 'MIGRATION_classes' },
      { original: 'rooms', working: 'MIGRATION_rooms' },
      // Pass 2
      { original: 'periods', working: 'MIGRATION_periods' },
      // Pass 3
      { original: 'parents', working: 'MIGRATION_parents' },
      { original: 'students', working: 'MIGRATION_students' },
      // Pass 4
      { original: 'registrations_fall', working: 'MIGRATION_registrations_fall' },
      { original: 'registrations_fall_audit', working: 'MIGRATION_registrations_fall_audit' },
      { original: 'registrations_winter', working: 'MIGRATION_registrations_winter' },
      { original: 'registrations_winter_audit', working: 'MIGRATION_registrations_winter_audit' },
      { original: 'registrations_spring', working: 'MIGRATION_registrations_spring' },
      { original: 'registrations_spring_audit', working: 'MIGRATION_registrations_spring_audit' },
    ];

    // Mappings
    this.instructorEmailMap = new Map(); // oldEmail → newEmail
    this.parentIdMap = new Map(); // oldParentId → newParentId
    this.studentIdMap = new Map(); // oldStudentId → newStudentId
    this.registrationIdMap = new Map(); // oldRegistrationId → newRegistrationId
    this.familyLastNames = new Map(); // family grouping → shared last name
    this.parentToFamily = new Map(); // parentId → familyKey
    this.studentParents = new Map(); // newStudentId → [parent1Id, parent2Id]

    // Transformed data storage
    this.transformedData = {};

    // Initialize Google Sheets clients
    this.prodAuth = null;
    this.stagingAuth = null;
    this.prodSheets = null;
    this.stagingSheets = null;

    // Credentials and spreadsheet IDs (loaded in initialize)
    this.config = null;
    this.prodSpreadsheetId = null;
    this.stagingSpreadsheetId = null;
  }

  /**
   * Load credentials from scripts/credentials/migration-config.json
   */
  async loadCredentials() {
    const credentialsPath = join(__dirname, '../credentials', 'migration-config.json');

    try {
      const credentialsData = await fs.readFile(credentialsPath, 'utf-8');
      this.config = JSON.parse(credentialsData);

      this.prodSpreadsheetId = this.config.production.spreadsheetId;
      this.stagingSpreadsheetId = this.config.staging.spreadsheetId;

      this.logger.log('✅ Credentials loaded from migration-config.json');
    } catch (error) {
      throw new Error(
        `Failed to load credentials from ${credentialsPath}. ` +
        `Ensure scripts/credentials/migration-config.json exists. Error: ${error.message}`
      );
    }
  }

  /**
   * Initialize Google Sheets API clients
   */
  async initialize() {
    await this.loadCredentials();

    this.logger.log('🔧 Initializing Google Sheets clients...');

    const prodCreds = this.config.production.serviceAccount;
    const stagingCreds = this.config.staging.serviceAccount;

    this.prodAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: prodCreds.clientEmail,
        private_key: prodCreds.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.stagingAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: stagingCreds.clientEmail,
        private_key: stagingCreds.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.prodSheets = google.sheets({ version: 'v4', auth: this.prodAuth });
    this.stagingSheets = google.sheets({ version: 'v4', auth: this.stagingAuth });

    this.logger.log(`   Production: ${this.prodSpreadsheetId} (${prodCreds.clientEmail})`);
    this.logger.log(`   Staging: ${this.stagingSpreadsheetId} (${stagingCreds.clientEmail})`);
    this.logger.log('✅ Clients initialized');
  }

  /**
   * Step 1: RUN - Create ALL MIGRATION_* sheets in staging
   */
  async run() {
    this.logger.log('\n🚀 RUNNING FULL DATABASE MIGRATION');
    this.logger.log('==================================================');

    await this.initialize();

    // Clean up any previous mapping files before starting
    await this.cleanupMappingFiles();

    // Pass 1: Instructors, Classes, Rooms
    await this.runPass1();

    // Pass 2: Periods
    await this.runPass2();

    // Pass 3: Parents, Students
    await this.runPass3();

    // Pass 4: Registrations
    await this.runPass4();

    // Write all MIGRATION_* sheets
    await this.writeAllSheets();

    // Save mappings
    await this.saveMappings();

    this.logger.log('\n🎉 FULL MIGRATION RUN COMPLETED!');
    this.logger.log('\n📋 Next steps:');
    this.logger.log('   1. Review ALL MIGRATION_* sheets in staging to verify changes');
    this.logger.log('   2. Run: node scripts/migrations/prod-to-staging-full.js apply');
    this.logger.log('   3. Test the migrated data');
    this.logger.log('   4. Run: node scripts/migrations/prod-to-staging-full.js commit (to make permanent)');
  }

  /**
   * Step 2: APPLY - Make MIGRATION_* sheets active (NON-DESTRUCTIVE)
   * Renames original sheets to MIGRATED_* and MIGRATION_* to original names
   */
  async apply() {
    this.logger.log('\n🔄 APPLYING FULL DATABASE MIGRATION (Non-Destructive)');
    this.logger.log('==================================================');
    this.logger.log('Original sheets will be renamed to MIGRATED_*');
    this.logger.log('MIGRATION_* sheets will become active');
    this.logger.log('You can unapply to reverse this change');
    this.logger.log('==================================================\n');

    await this.initialize();

    for (const { original, working } of this.sheetsToMigrate) {
      // Rename original to MIGRATED_*
      await this.renameSheet(original, `MIGRATED_${original}`);
      this.logger.log(`   📦 Renamed ${original} → MIGRATED_${original}`);

      // Rename MIGRATION_* to original
      await this.renameSheet(working, original);
      this.logger.log(`   ✅ Renamed ${working} → ${original}`);
    }

    this.logger.log('\n✅ MIGRATION APPLIED SUCCESSFULLY!');
    this.logger.log('\n📋 Next steps:');
    this.logger.log('   - Test the migrated data in staging');
    this.logger.log('   - If issues found: node scripts/migrations/prod-to-staging-full.js unapply');
    this.logger.log('   - If all looks good: node scripts/migrations/prod-to-staging-full.js commit');
  }

  /**
   * Step 3: UNAPPLY - Reverse the apply operation
   * Restores MIGRATED_* sheets to original names and moves new data back to MIGRATION_*
   */
  async unapply() {
    this.logger.log('\n🔄 UNAPPLYING MIGRATION (Reverting to Previous State)');
    this.logger.log('==================================================');
    this.logger.log('This will restore the original sheets');
    this.logger.log('==================================================\n');

    await this.initialize();

    for (const { original, working } of this.sheetsToMigrate) {
      // Rename current active (migrated) back to MIGRATION_*
      await this.renameSheet(original, working);
      this.logger.log(`   📦 Renamed ${original} → ${working}`);

      // Rename MIGRATED_* back to original
      await this.renameSheet(`MIGRATED_${original}`, original);
      this.logger.log(`   ✅ Renamed MIGRATED_${original} → ${original}`);
    }

    this.logger.log('\n✅ MIGRATION UNAPPLIED - Original sheets restored!');
    this.logger.log('\n📋 Next steps:');
    this.logger.log('   - Fix any issues in the migration script');
    this.logger.log('   - Run: node scripts/migrations/prod-to-staging-full.js run');
    this.logger.log('   - Then: node scripts/migrations/prod-to-staging-full.js apply');
  }

  /**
   * Step 4: COMMIT - Remove MIGRATED_* sheets (makes migration permanent)
   */
  async commit() {
    this.logger.log('\n🔒 COMMITTING MIGRATION (DESTRUCTIVE - Removing Old Data)');
    this.logger.log('==================================================');
    this.logger.log('⚠️  THIS WILL PERMANENTLY DELETE MIGRATED_* SHEETS!');
    this.logger.log('⚠️  THIS CANNOT BE UNDONE!');
    this.logger.log('==================================================\n');

    await this.initialize();

    for (const { original } of this.sheetsToMigrate) {
      const migratedSheetName = `MIGRATED_${original}`;

      try {
        await this.deleteSheet(migratedSheetName);
        this.logger.log(`   🗑️  Deleted ${migratedSheetName}`);
      } catch (error) {
        this.logger.log(`   ⚠️  ${migratedSheetName} not found (may have been deleted already)`);
      }
    }

    // Clean up mapping files
    await this.cleanupMappingFiles();

    this.logger.log('\n🔒 MIGRATION COMMITTED - Old data permanently removed!');
    this.logger.log('The migration is now permanent and cannot be reversed.');
  }

  // ============================================================================
  // PASS 1: Instructors, Classes, Rooms
  // ============================================================================

  async runPass1() {
    this.logger.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log('PASS 1: Instructors, Classes, Rooms');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Extract
    const instructors = await this.extractSheet('instructors');
    const classes = await this.extractSheet('classes');
    const rooms = await this.extractSheet('rooms');

    // Create mappings
    this.createInstructorMapping(instructors);

    // Transform
    this.transformedData.instructors = this.transformInstructors(instructors);
    this.transformedData.classes = this.transformClasses(classes);
    this.transformedData.rooms = rooms; // Exact copy

    this.logger.log(`✅ Pass 1 complete: ${instructors.length} instructors, ${classes.length} classes, ${rooms.length} rooms`);
  }

  createInstructorMapping(instructors) {
    instructors.forEach(instructor => {
      const oldEmail = instructor.Id || instructor.Email;
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const emailUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      const newEmail = `${emailUsername}@mcds.org`;
      this.instructorEmailMap.set(oldEmail, newEmail);
    });
  }

  transformInstructors(instructors) {
    return instructors.map(instructor => {
      const oldEmail = instructor.Id || instructor.Email;
      const newEmail = this.instructorEmailMap.get(oldEmail);
      const emailUsername = newEmail.split('@')[0];
      const nameParts = emailUsername.split('.');
      const firstName = this.capitalize(nameParts[0]);
      const lastName = nameParts.length > 1 ? this.capitalize(nameParts[1]) : '';
      const phone = `555${faker.string.numeric(7)}`;
      const accessCode = faker.number.int({ min: 100000, max: 999999 });

      // DisplayEmail: Always use new email
      // DisplayPhone: Only use new phone if production has a non-blank displayPhone value
      const displayEmail = newEmail;
      const displayPhone = (instructor.displayPhone && instructor.displayPhone.trim() !== '') ? phone : '';

      return {
        ...instructor,
        Id: newEmail,
        Email: newEmail,
        FirstName: firstName,
        LastName: lastName,
        Phone: phone,
        AccessCode: instructor.AccessCode ? accessCode.toString() : '',
        displayEmail: displayEmail,
        displayPhone: displayPhone,
      };
    });
  }

  transformClasses(classes) {
    return classes.map(classData => {
      const oldInstructorId = classData.InstructorId;
      const newInstructorId = this.instructorEmailMap.get(oldInstructorId) || oldInstructorId;

      return {
        ...classData,
        InstructorId: newInstructorId,
      };
    });
  }

  // ============================================================================
  // PASS 2: Periods (exact copy)
  // ============================================================================

  async runPass2() {
    this.logger.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log('PASS 2: Periods');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const periodsRows = await this.extractSheetRaw('periods');
    this.transformedData.periods = periodsRows;

    this.logger.log(`✅ Pass 2 complete: ${periodsRows.length - 1} periods (exact copy)`);
  }

  // ============================================================================
  // PASS 3: Parents, Students
  // ============================================================================

  async runPass3() {
    this.logger.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log('PASS 3: Parents, Students');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Extract
    const parents = await this.extractSheet('parents');
    const students = await this.extractSheet('students');

    // Identify families
    this.identifyFamilies(students, parents);

    // Create mappings
    this.createParentMappings(parents);
    this.createStudentMappings(students);

    // Transform
    this.transformedData.parents = this.transformParents(parents);
    this.transformedData.students = this.transformStudents(students);

    // Build student→parents lookup
    this.transformedData.students.forEach(student => {
      const parentIds = [student.Parent1Id, student.Parent2Id].filter(p => p);
      this.studentParents.set(student.Id, parentIds);
    });

    this.logger.log(`✅ Pass 3 complete: ${parents.length} parents, ${students.length} students`);
  }

  identifyFamilies(students, parents) {
    const parentToFamily = new Map();
    const familyGroups = new Map();

    students.forEach(student => {
      const parent1 = student.Parent1Id;
      const parent2 = student.Parent2Id;
      if (!parent1 && !parent2) return;

      const familyMembers = [parent1, parent2].filter(p => p).sort();
      const familyKey = familyMembers.join('|');

      if (!familyGroups.has(familyKey)) {
        familyGroups.set(familyKey, new Set(familyMembers));
      }

      familyMembers.forEach(parentId => {
        parentToFamily.set(parentId, familyKey);
      });
    });

    for (const [familyKey] of familyGroups.entries()) {
      const familyLastName = faker.person.lastName();
      this.familyLastNames.set(familyKey, familyLastName);
    }

    parents.forEach(parent => {
      const parentId = parent.Id;
      if (!parentToFamily.has(parentId)) {
        this.familyLastNames.set(parentId, faker.person.lastName());
        parentToFamily.set(parentId, parentId);
      }
    });

    this.parentToFamily = parentToFamily;
  }

  createParentMappings(parents) {
    parents.forEach(parent => {
      const oldParentId = parent.Id;
      const familyKey = this.parentToFamily.get(oldParentId);
      const lastName = this.familyLastNames.get(familyKey);
      const firstName = faker.person.firstName();
      const emailUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      const newEmail = `${emailUsername}@mcds.org`;
      const newParentId = `${newEmail.toUpperCase()}_${lastName.toUpperCase()}_${firstName.toUpperCase()}`;

      this.parentIdMap.set(oldParentId, newParentId);
    });
  }

  createStudentMappings(students) {
    students.forEach(student => {
      const oldStudentId = student.Id;
      const parent1 = student.Parent1Id;
      const parent2 = student.Parent2Id;

      let familyLastName;
      if (parent1) {
        const familyKey = this.parentToFamily.get(parent1);
        familyLastName = this.familyLastNames.get(familyKey);
      } else if (parent2) {
        const familyKey = this.parentToFamily.get(parent2);
        familyLastName = this.familyLastNames.get(familyKey);
      } else {
        familyLastName = faker.person.lastName();
      }

      const firstName = faker.person.firstName();
      const newStudentId = faker.number.int({ min: 100000, max: 999999 }).toString();

      this.studentIdMap.set(oldStudentId, newStudentId);
    });
  }

  transformParents(parents) {
    return parents.map(parent => {
      const oldId = parent.Id;
      const newId = this.parentIdMap.get(oldId);

      // Extract info from new ID format: EMAIL_LASTNAME_FIRSTNAME
      const parts = newId.split('_');
      const email = parts[0];
      const lastName = parts[1];
      const firstName = parts[2];

      const phone = `555${faker.string.numeric(7)}`;
      const accessCode = faker.number.int({ min: 1000, max: 9999 }).toString().padStart(4, '0');

      return {
        Id: newId,
        Email: email,
        LastName: this.capitalize(lastName),
        FirstName: this.capitalize(firstName),
        Phone: phone,
        AccessCode: accessCode,
      };
    });
  }

  transformStudents(students) {
    return students.map(student => {
      const oldId = student.Id;
      const newId = this.studentIdMap.get(oldId);

      // Get family last name from parent
      const parent1 = student.Parent1Id;
      const parent2 = student.Parent2Id;

      let familyLastName;
      if (parent1) {
        const familyKey = this.parentToFamily.get(parent1);
        familyLastName = this.familyLastNames.get(familyKey);
      } else if (parent2) {
        const familyKey = this.parentToFamily.get(parent2);
        familyLastName = this.familyLastNames.get(familyKey);
      } else {
        familyLastName = faker.person.lastName();
      }

      const firstName = faker.person.firstName();
      const parent1Id = student.Parent1Id ? this.parentIdMap.get(student.Parent1Id) || '' : '';
      const parent2Id = student.Parent2Id ? this.parentIdMap.get(student.Parent2Id) || '' : '';

      return {
        Id: newId,
        LastName: familyLastName,
        FirstName: firstName,
        LastNickname: student.LastNickname || '',
        FirstNickname: student.FirstNickname || '',
        Grade: student.Grade || '',
        Parent1Id: parent1Id,
        Parent2Id: parent2Id,
      };
    });
  }

  // ============================================================================
  // PASS 4: Registrations
  // ============================================================================

  async runPass4() {
    this.logger.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log('PASS 4: Registrations');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Extract all registration tables
    const regFall = await this.extractSheet('registrations_fall');
    const regFallAudit = await this.extractSheet('registrations_fall_audit');
    const regWinter = await this.extractSheet('registrations_winter');
    const regWinterAudit = await this.extractSheet('registrations_winter_audit');
    const regSpring = await this.extractSheet('registrations_spring');
    const regSpringAudit = await this.extractSheet('registrations_spring_audit');

    // Transform
    this.transformedData.registrations_fall = this.transformRegistrations(regFall);
    this.transformedData.registrations_fall_audit = this.transformRegistrationsAudit(regFallAudit);
    this.transformedData.registrations_winter = this.transformRegistrations(regWinter);
    this.transformedData.registrations_winter_audit = this.transformRegistrationsAudit(regWinterAudit);
    this.transformedData.registrations_spring = this.transformRegistrations(regSpring);
    this.transformedData.registrations_spring_audit = this.transformRegistrationsAudit(regSpringAudit);

    const totalRegs = regFall.length + regWinter.length + regSpring.length;
    const totalAudit = regFallAudit.length + regWinterAudit.length + regSpringAudit.length;
    this.logger.log(`✅ Pass 4 complete: ${totalRegs} registrations, ${totalAudit} audit records`);
  }

  transformRegistrations(registrations) {
    // First pass: create all registration ID mappings
    registrations.forEach(reg => {
      if (!this.registrationIdMap.has(reg.Id)) {
        this.registrationIdMap.set(reg.Id, faker.string.uuid());
      }
    });

    // Second pass: transform with mappings in place
    return registrations.map(reg => {
      const oldStudentId = reg.StudentId;
      const newStudentId = this.studentIdMap.get(oldStudentId) || oldStudentId;

      // Pick random class from transformed classes
      const randomClass = faker.helpers.arrayElement(this.transformedData.classes);
      const newRegistrationId = this.registrationIdMap.get(reg.Id);

      // Get parent for intentSubmittedBy
      const studentParents = this.studentParents.get(newStudentId) || [];
      const intentSubmittedBy = reg.intentSubmittedBy
        ? (studentParents.length > 0 ? faker.helpers.arrayElement(studentParents) : '')
        : '';

      // Get createdBy (could be parent or instructor)
      const createdBy = reg.CreatedBy
        ? (Math.random() > 0.5
            ? (studentParents.length > 0 ? faker.helpers.arrayElement(studentParents) : '')
            : faker.helpers.arrayElement(this.transformedData.instructors).Email)
        : '';

      const roomId = randomClass.RoomId || reg.RoomId || '';
      const linkedPrevious = reg.linkedPreviousRegistrationId
        ? (this.registrationIdMap.get(reg.linkedPreviousRegistrationId) || '')
        : '';

      return {
        Id: newRegistrationId,
        StudentId: newStudentId,
        InstructorId: randomClass.InstructorId || '',
        Day: reg.Day || '',
        StartTime: reg.StartTime || '',
        Length: reg.Length || '',
        RegistrationType: reg.RegistrationType || '',
        RoomId: roomId,
        Instrument: reg.Instrument || '',
        TransportationType: reg.TransportationType || '',
        Notes: reg.Notes || '',
        ClassId: randomClass.Id || '',
        ClassTitle: randomClass.Title || '',
        ExpectedStartDate: reg.ExpectedStartDate || '',
        CreatedAt: reg.CreatedAt || '',
        CreatedBy: createdBy,
        reenrollmentIntent: reg.reenrollmentIntent || '',
        intentSubmittedAt: reg.intentSubmittedAt || '',
        intentSubmittedBy: intentSubmittedBy,
        linkedPreviousRegistrationId: linkedPrevious,
      };
    });
  }

  transformRegistrationsAudit(auditRecords) {
    // First pass: ensure all registration IDs are mapped
    auditRecords.forEach(audit => {
      if (audit.RegistrationId && !this.registrationIdMap.has(audit.RegistrationId)) {
        this.registrationIdMap.set(audit.RegistrationId, faker.string.uuid());
      }
    });

    // Second pass: transform
    return auditRecords.map(audit => {
      const oldStudentId = audit.StudentId;
      const newStudentId = this.studentIdMap.get(oldStudentId) || oldStudentId;

      const randomClass = faker.helpers.arrayElement(this.transformedData.classes);
      const oldRegistrationId = audit.RegistrationId;
      const newRegistrationId = this.registrationIdMap.get(oldRegistrationId) || faker.string.uuid();
      const newAuditId = faker.string.uuid();

      const studentParents = this.studentParents.get(newStudentId) || [];
      const intentSubmittedBy = audit.intentSubmittedBy
        ? (studentParents.length > 0 ? faker.helpers.arrayElement(studentParents) : '')
        : '';

      const createdBy = audit.CreatedBy
        ? (Math.random() > 0.5
            ? (studentParents.length > 0 ? faker.helpers.arrayElement(studentParents) : '')
            : faker.helpers.arrayElement(this.transformedData.instructors).Email)
        : '';

      const deletedBy = audit.DeletedBy
        ? (Math.random() > 0.5
            ? (studentParents.length > 0 ? faker.helpers.arrayElement(studentParents) : '')
            : faker.helpers.arrayElement(this.transformedData.instructors).Email)
        : '';

      const updatedBy = audit.updatedBy
        ? (Math.random() > 0.5
            ? (studentParents.length > 0 ? faker.helpers.arrayElement(studentParents) : '')
            : faker.helpers.arrayElement(this.transformedData.instructors).Email)
        : '';

      const roomId = randomClass.RoomId || audit.RoomId || '';
      const linkedPrevious = audit.linkedPreviousRegistrationId
        ? (this.registrationIdMap.get(audit.linkedPreviousRegistrationId) || '')
        : '';

      return {
        Id: newAuditId,
        RegistrationId: newRegistrationId,
        StudentId: newStudentId,
        InstructorId: randomClass.InstructorId || '',
        Day: audit.Day || '',
        StartTime: audit.StartTime || '',
        Length: audit.Length || '',
        RegistrationType: audit.RegistrationType || '',
        RoomId: roomId,
        Instrument: audit.Instrument || '',
        TransportationType: audit.TransportationType || '',
        Notes: audit.Notes || '',
        ClassId: randomClass.Id || '',
        ClassTitle: randomClass.Title || '',
        ExpectedStartDate: audit.ExpectedStartDate || '',
        CreatedAt: audit.CreatedAt || '',
        CreatedBy: createdBy,
        IsDeleted: audit.IsDeleted || '',
        DeletedAt: audit.DeletedAt || '',
        DeletedBy: deletedBy,
        reenrollmentIntent: audit.reenrollmentIntent || '',
        intentSubmittedAt: audit.intentSubmittedAt || '',
        intentSubmittedBy: intentSubmittedBy,
        updatedAt: audit.updatedAt || '',
        updatedBy: updatedBy,
        linkedPreviousRegistrationId: linkedPrevious,
      };
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  async extractSheet(sheetName) {
    const response = await this.prodSheets.spreadsheets.values.get({
      spreadsheetId: this.prodSpreadsheetId,
      range: sheetName, // Unbounded range - gets all columns
    });
    return this.rowsToObjects(response.data.values || []);
  }

  async extractSheetRaw(sheetName) {
    const response = await this.prodSheets.spreadsheets.values.get({
      spreadsheetId: this.prodSpreadsheetId,
      range: sheetName, // Unbounded range - gets all columns
    });
    return response.data.values || [];
  }

  rowsToObjects(rows) {
    if (rows.length === 0) return [];
    const headers = rows[0];
    return rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }

  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  async writeAllSheets() {
    this.logger.log('\n📤 Writing ALL MIGRATION_* sheets to staging...');

    // Delete previous MIGRATION_* sheets if they exist
    const spreadsheet = await this.stagingSheets.spreadsheets.get({
      spreadsheetId: this.stagingSpreadsheetId,
    });

    for (const { working } of this.sheetsToMigrate) {
      const existingSheet = spreadsheet.data.sheets.find(s => s.properties.title === working);
      if (existingSheet) {
        await this.stagingSheets.spreadsheets.batchUpdate({
          spreadsheetId: this.stagingSpreadsheetId,
          requestBody: {
            requests: [{ deleteSheet: { sheetId: existingSheet.properties.sheetId } }],
          },
        });
        this.logger.log(`   🗑️  Deleted previous ${working}`);
      }
    }

    // Write sheets
    await this.writeSheetData('MIGRATION_instructors', this.transformedData.instructors);
    await this.writeSheetData('MIGRATION_classes', this.transformedData.classes);
    await this.writeSheetData('MIGRATION_rooms', this.transformedData.rooms);

    await this.writeSheetDataRaw('MIGRATION_periods', this.transformedData.periods);

    await this.writeSheetData('MIGRATION_parents', this.transformedData.parents);
    await this.writeSheetData('MIGRATION_students', this.transformedData.students);

    await this.writeSheetData('MIGRATION_registrations_fall', this.transformedData.registrations_fall);
    await this.writeSheetData('MIGRATION_registrations_fall_audit', this.transformedData.registrations_fall_audit);
    await this.writeSheetData('MIGRATION_registrations_winter', this.transformedData.registrations_winter);
    await this.writeSheetData('MIGRATION_registrations_winter_audit', this.transformedData.registrations_winter_audit);
    await this.writeSheetData('MIGRATION_registrations_spring', this.transformedData.registrations_spring);
    await this.writeSheetData('MIGRATION_registrations_spring_audit', this.transformedData.registrations_spring_audit);

    this.logger.log('   ✅ All MIGRATION_* sheets created');
  }

  async writeSheetData(sheetName, data) {
    if (!data || data.length === 0) {
      await this.ensureSheetExists(sheetName);
      return;
    }

    await this.ensureSheetExists(sheetName);
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(header => obj[header] || ''));
    const values = [headers, ...rows];

    await this.stagingSheets.spreadsheets.values.update({
      spreadsheetId: this.stagingSpreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }

  async writeSheetDataRaw(sheetName, rows) {
    if (!rows || rows.length === 0) {
      await this.ensureSheetExists(sheetName);
      return;
    }

    await this.ensureSheetExists(sheetName);
    await this.stagingSheets.spreadsheets.values.update({
      spreadsheetId: this.stagingSpreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
  }

  async ensureSheetExists(sheetName) {
    const spreadsheet = await this.stagingSheets.spreadsheets.get({
      spreadsheetId: this.stagingSpreadsheetId,
    });

    const sheetExists = spreadsheet.data.sheets.some(s => s.properties.title === sheetName);

    if (!sheetExists) {
      await this.stagingSheets.spreadsheets.batchUpdate({
        spreadsheetId: this.stagingSpreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
      });
    }
  }

  async deleteSheet(sheetName) {
    const spreadsheet = await this.stagingSheets.spreadsheets.get({
      spreadsheetId: this.stagingSpreadsheetId,
    });

    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`);
    }

    await this.stagingSheets.spreadsheets.batchUpdate({
      spreadsheetId: this.stagingSpreadsheetId,
      requestBody: {
        requests: [{ deleteSheet: { sheetId: sheet.properties.sheetId } }],
      },
    });
  }

  async renameSheet(oldName, newName) {
    const spreadsheet = await this.stagingSheets.spreadsheets.get({
      spreadsheetId: this.stagingSpreadsheetId,
    });

    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === oldName);
    if (!sheet) {
      throw new Error(`Sheet ${oldName} not found`);
    }

    await this.stagingSheets.spreadsheets.batchUpdate({
      spreadsheetId: this.stagingSpreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: { sheetId: sheet.properties.sheetId, title: newName },
              fields: 'title',
            },
          },
        ],
      },
    });
  }

  async cleanupMappingFiles() {
    this.logger.log('\n🗑️  Cleaning up mapping files...');
    
    try {
      // Find all full-migration-mappings-*.json files in the migrations directory
      const files = await fs.readdir(__dirname);
      const mappingFiles = files.filter(f => f.startsWith('full-migration-mappings-') && f.endsWith('.json'));
      
      for (const file of mappingFiles) {
        const filepath = join(__dirname, file);
        await fs.unlink(filepath);
        this.logger.log(`   🗑️  Deleted ${file}`);
      }
      
      if (mappingFiles.length === 0) {
        this.logger.log('   ℹ️  No mapping files found to clean up');
      }
    } catch (error) {
      this.logger.log(`   ⚠️  Error cleaning up mapping files: ${error.message}`);
    }
  }

  async saveMappings() {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = join(__dirname, `full-migration-mappings-${timestamp}.json`);

    const mappingsData = {
      migration: this.migrationName,
      timestamp: new Date().toISOString(),
      instructorEmails: Object.fromEntries(this.instructorEmailMap),
      parentIds: Object.fromEntries(this.parentIdMap),
      studentIds: Object.fromEntries(this.studentIdMap),
      registrationIds: Object.fromEntries(this.registrationIdMap),
    };

    await fs.writeFile(filename, JSON.stringify(mappingsData, null, 2));
    this.logger.log(`\n💾 All mappings saved to: ${filename}`);
    
    // Store the filename for later cleanup
    this.mappingsFilename = filename;
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  const validCommands = ['run', 'apply', 'unapply', 'commit'];

  if (!validCommands.includes(command)) {
    console.error('Usage: node scripts/migrations/prod-to-staging-full.js [run|apply|unapply|commit]');
    console.error('');
    console.error('Commands:');
    console.error('  run     - Create MIGRATION_* sheets with transformed data');
    console.error('  apply   - Rename originals to MIGRATED_*, activate MIGRATION_* sheets (reversible)');
    console.error('  unapply - Reverse apply operation, restore original sheets');
    console.error('  commit  - Delete MIGRATED_* sheets permanently (irreversible)');
    process.exit(1);
  }

  const migration = new FullDatabaseMigration();

  migration[command]()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ MIGRATION FAILED:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}
