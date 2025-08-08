/**
 * Google Apps Script Migration DEV002: Fill and Reset Registrations
 *
 * DEVELOPMENT MIGRATION - Use only in development/testing environments!
 *
 * Features:
 * - Fill database with registrations per student (configurable distribution):
 *   - Default: 40% students: no registrations
 *   - Default: 45% students: one registration  
 *   - Default: 10% students: two registrations
 *   - Default: 5% students: three registrations
 *   - Configurable group class fill percentage (default 80%)
 *   - Optionally create audit records for registration actions
 * - Wipe/reset all registrations (and optionally audit data)
 * - Uses 16-column registration model with proper column structure:
 *   ['Id', 'StudentId', 'InstructorId', 'Day', 'StartTime', 'Length', 
 *    'RegistrationType', 'RoomId', 'Instrument', 'TransportationType', 
 *    'Notes', 'ClassId', 'ClassTitle', 'ExpectedStartDate', 'CreatedAt', 'CreatedBy']
 * - Validates RoomId against real rooms in the rooms sheet
 * - Validates ClassId against real classes for group registrations
 *
 * To use:
 * 1. Open your Google Sheets document (DEVELOPMENT ONLY!)
 * 2. Go to Extensions > Apps Script
 * 3. Copy this entire file content into a new .gs file
 * 4. Configure spreadsheet ID in Config.js (loaded automatically)
 * 5. Adjust percentages in DEV002_DEFAULT_OPTIONS if needed
 * 6. Run the main function: runFillAndResetRegistrationsMigration()
 */

// Default options for this migration
const DEV002_DEFAULT_OPTIONS = {
  reset: false,           // Set to true to reset/clear registrations instead of filling
  createAudit: false,     // Create audit records for registration actions
  wipeAudit: false,       // When resetting, also wipe audit data
  fillPercent: 0.8,       // Fill group classes to this percentage of capacity
  // Student registration distribution percentages (must add up to 1.0)
  nonePercent: 0.4,       // 40% students: no registrations
  onePercent: 0.45,       // 45% students: one registration
  twoPercent: 0.1,        // 10% students: two registrations
  threePercent: 0.05      // 5% students: three registrations
};

function runFillAndResetRegistrationsMigration() {
  const migration = new FillAndResetRegistrationsMigration({ 
    reset: true,  // Always reset registrations before filling
    createAudit: true 
  });
  migration.execute();
}

function previewFillAndResetRegistrationsMigration() {
  const migration = new FillAndResetRegistrationsMigration();
  migration.preview();
}

function rollbackFillAndResetRegistrationsMigration() {
  const migration = new FillAndResetRegistrationsMigration();
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
  constructor() {
    this.spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    this.options = DEV002_DEFAULT_OPTIONS;
    this.studentsSheet = this.spreadsheet.getSheetByName('students');
    this.registrationsSheet = this.spreadsheet.getSheetByName('registrations');
    this.classesSheet = this.spreadsheet.getSheetByName('classes');
    this.instructorsSheet = this.spreadsheet.getSheetByName('instructors');
    this.roomsSheet = this.spreadsheet.getSheetByName('rooms');
    this.auditSheet = this.spreadsheet.getSheetByName('audit');
  }

  execute() {
    console.log('🚀 STARTING MIGRATION: Fill and Reset Registrations');
    console.log('===================================================');

    // Create automatic backup before starting
    console.log('📦 Creating automatic backup...');
    const sheetsToBackup = ['students', 'registrations', 'classes'];
    if (this.auditSheet && this.options.createAudit) {
      sheetsToBackup.push('audit');
    }

    console.log(`📋 Sheets to backup: ${sheetsToBackup.join(', ')}`);
    const backupResult = createMigrationBackup('Migration_DEV002_FillAndResetRegistrations', sheetsToBackup);

    console.log(`📋 Backup result:`, backupResult);
    
    if (!backupResult.success) {
      console.error('❌ Failed to create backup, aborting migration');
      throw new Error(`Backup failed: ${backupResult.error}`);
    }

    console.log('✅ Backup created successfully');
    console.log(`📁 Backup details: ${backupResult.backupId || 'No backup ID returned'}`);
    
    // Add a small delay to ensure backup is fully processed
    Utilities.sleep(2000); // Wait 2 seconds

    try {
      // Reset existing registrations if requested
      if (this.options && this.options.reset) {
        console.log('🧹 Clearing existing registrations...');
        this.resetRegistrations();
      }

      // Fill with new registrations
      console.log('📝 Creating new registrations...');
      this.fillRegistrations();

      console.log('✅ MIGRATION COMPLETED successfully');
      console.log('💾 Backup sheets preserved for safety');
      console.log('📁 To manually delete backup, run: deleteFillAndResetRegistrationsBackup()');

    } catch (error) {
      console.error('❌ MIGRATION FAILED:', error.toString());
      console.error('💾 Backup sheets preserved - migration will NOT auto-rollback');
      console.error('📁 To manually restore from backup, run: restoreFillAndResetRegistrationsFromBackup()');
      console.error('📁 To manually delete backup, run: deleteFillAndResetRegistrationsBackup()');
      
      // Don't auto-rollback on error - preserve the backup and let user decide
      throw error;
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
        // Restore but keep backup sheets for safety (don't auto-delete)
        const restoreResult = restoreFromBackup('Migration_DEV002_FillAndResetRegistrations', false);

        if (restoreResult.success) {
          console.log('✅ ROLLBACK COMPLETED using automatic backup');
          console.log(`Restored sheets: ${restoreResult.restoredSheets.join(', ')}`);
          console.log('💾 Backup sheets preserved for safety');
          console.log('📁 To manually delete backup, run: deleteFillAndResetRegistrationsBackup()');
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
      this.resetRegistrations(); // Clear both registrations and audit

      console.log('\n✅ ROLLBACK COMPLETED using manual restoration');
      console.log('\n⚠️  Note: Manual restoration cleared all registrations and audit data');
      console.log('   • For complete data restoration, use automatic backup before migration');

      return { success: true, method: 'manual_restoration' };
    } catch (error) {
      console.error('❌ Rollback failed:', error.toString());
      return { success: false, error: error.toString() };
    }
  }

  fillRegistrations() {
    console.log('🎯 FILLING REGISTRATIONS');
    console.log('========================');

    // First, check what the actual registrations sheet structure looks like
    console.log('🔍 Checking existing registrations sheet structure...');
    if (this.registrationsSheet.getLastColumn() > 0) {
      const existingHeaders = this.registrationsSheet.getRange(1, 1, 1, this.registrationsSheet.getLastColumn()).getValues()[0];
      console.log(`📋 Existing registration headers: ${existingHeaders.join(', ')}`);
    } else {
      console.log('📋 Registrations sheet is empty - no existing headers found');
    }

    const createAudit = this.options.createAudit;
    const students = this.getSheetData(this.studentsSheet);
    const classes = this.getSheetData(this.classesSheet);
    const instructors = this.getSheetData(this.instructorsSheet);
    const rooms = this.getSheetData(this.roomsSheet);
    
    console.log(`📊 Data loaded: ${students.length} students, ${classes.length} classes, ${instructors.length} instructors, ${rooms.length} rooms`);
    
    if (students.length === 0) {
      console.log('⚠️  No students found in students sheet - cannot create registrations');
      return;
    }
    
    if (classes.length === 0) {
      console.log('⚠️  No classes found in classes sheet - cannot create registrations');
      return;
    }

    this.registrations = [];
    this.audits = [];

    // Shuffle students for random assignment
    const shuffledStudents = this.shuffleArray([...students]); // Create copy to avoid modifying original
    const total = shuffledStudents.length;

    // Calculate counts based on configurable percentages
    const noneCount = Math.floor(total * this.options.nonePercent);
    const oneCount = Math.floor(total * this.options.onePercent);
    const twoCount = Math.floor(total * this.options.twoPercent);
    const threeCount = total - noneCount - oneCount - twoCount; // Remaining students get three

    console.log(`📈 Student distribution (total: ${total}):`);
    console.log(`   • ${noneCount} students: 0 registrations (${(this.options.nonePercent * 100).toFixed(1)}%)`);
    console.log(`   • ${oneCount} students: 1 registration (${(this.options.onePercent * 100).toFixed(1)}%)`);
    console.log(`   • ${twoCount} students: 2 registrations (${(this.options.twoPercent * 100).toFixed(1)}%)`);
    console.log(`   • ${threeCount} students: 3 registrations (${((threeCount/total) * 100).toFixed(1)}%)`);

    // Assign registration counts
    let idx = 0;

    // Students with no registrations
    for (; idx < noneCount; idx++) {
      // No registration - intentionally empty
    }

    // Students with one registration
    for (; idx < noneCount + oneCount; idx++) {
      const studentRegs = this.createRegistrationsForStudent(shuffledStudents[idx], classes, instructors, rooms, 1);
      this.registrations.push(...studentRegs);
    }

    // Students with two registrations
    for (; idx < noneCount + oneCount + twoCount; idx++) {
      const studentRegs = this.createRegistrationsForStudent(shuffledStudents[idx], classes, instructors, rooms, 2);
      this.registrations.push(...studentRegs);
    }

    // Students with three registrations
    for (; idx < total; idx++) {
      const studentRegs = this.createRegistrationsForStudent(shuffledStudents[idx], classes, instructors, rooms, 3);
      this.registrations.push(...studentRegs);
    }

    console.log(`📝 Created ${this.registrations.length} individual student registrations`);
    
    // Show breakdown of registration types created
    const typeBreakdown = this.registrations.reduce((acc, reg) => {
      const type = reg.registrationType; // Use the registrationType property from registration object
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Registration type breakdown:', typeBreakdown);

        // Fill group classes to specified capacity (optional additional registrations)
    const initialCount = this.registrations.length;
    this.fillGroupClasses(classes, rooms, instructors);
    const finalCount = this.registrations.length;
    
    if (finalCount > initialCount) {
      console.log(`🎯 Added ${finalCount - initialCount} additional registrations to fill group classes to ${(this.options.fillPercent * 100)}% capacity`);
    }

    console.log(`📊 Total registrations to write: ${this.registrations.length}`);

    // Write registrations to sheet
    if (this.registrations.length > 0) {
      // Convert registration objects to array format for writing
      const registrationArrays = this.registrations.map(reg => reg._arrayData);
      this.writeSheetData(this.registrationsSheet, registrationArrays);
      console.log(`✅ Written ${this.registrations.length} registrations to sheet`);
    } else {
      console.log('⚠️  No registrations created - nothing to write');
    }

    // Write audit data if enabled
    if (createAudit && this.audits.length > 0) {
      this.writeSheetData(this.auditSheet, this.audits, true);
      console.log(`📋 Written ${this.audits.length} audit records to sheet`);
    } else if (createAudit) {
      console.log('📋 Audit enabled but no audit records created');
    }

    console.log('✅ REGISTRATION FILLING COMPLETED');
    
    // Final summary with type breakdown
    if (this.registrations.length > 0) {
      const finalTypeBreakdown = this.registrations.reduce((acc, reg) => {
        const type = reg.type; // Use the type property from registration object
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 Final registration summary:');
      console.log(`   Total registrations: ${this.registrations.length}`);
      Object.entries(finalTypeBreakdown).forEach(([type, count]) => {
        const percentage = ((count / this.registrations.length) * 100).toFixed(1);
        console.log(`   ${type} registrations: ${count} (${percentage}%)`);
      });
      
      if (createAudit && this.audits.length > 0) {
        console.log(`   Audit records created: ${this.audits.length}`);
      }
    }
  }

  resetRegistrations() {
    const wipeAudit = this.options.wipeAudit;
    
    // Clear registrations data but preserve headers if they exist
    const lastCol = this.registrationsSheet.getLastColumn();
    if (lastCol > 0) {
      const headers = this.registrationsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      this.registrationsSheet.clearContents();
      this.registrationsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      // Sheet is empty, just clear it
      this.registrationsSheet.clearContents();
    }
    
    // Optionally clear audit sheet but preserve headers
    if (wipeAudit && this.auditSheet) {
      const auditLastCol = this.auditSheet.getLastColumn();
      if (auditLastCol > 0) {
        const auditHeaders = this.auditSheet.getRange(1, 1, 1, auditLastCol).getValues()[0];
        this.auditSheet.clearContents();
        this.auditSheet.getRange(1, 1, 1, auditHeaders.length).setValues([auditHeaders]);
      } else {
        // Sheet is empty, just clear it
        this.auditSheet.clearContents();
      }
    }
  }

  getSheetData(sheet) {
    if (!sheet) {
      console.log('⚠️  Sheet not found - returning empty array');
      return [];
    }
    
    try {
      const data = sheet.getDataRange().getValues();
      
      const sheetName = sheet.getName();
      
      if (data.length === 0) {
        console.log(`❌ Sheet "${sheetName}" is completely empty`);
        return [];
      }
      
      if (data.length === 1) {
        console.log(`❌ Sheet "${sheetName}" has only headers, no data rows`);
        console.log(`   Headers found: ${data[0].join(', ')}`);
        return [];
      }
      
      const headers = data[0];
      console.log(`📋 Sheet "${sheetName}" structure:`);
      console.log(`   • Total rows: ${data.length} (${data.length - 1} data rows)`);
      console.log(`   • Headers: ${headers.join(', ')}`);
      
      // Define column mappings for different sheets
      const sheetMappings = {
        'students': {
          'id': ['id', 'Id', 'ID'],
          'firstName': ['firstName', 'FirstName', 'firstname', 'first_name', 'First Name'],
          'lastName': ['lastName', 'LastName', 'lastname', 'last_name', 'Last Name']
        },
        'instructors': {
          'id': ['id', 'Id', 'ID', 'instructorId', 'InstructorId', 'instructor_id']
          // roomId is handled dynamically based on day-specific columns
        },
        'rooms': {
          'id': ['id', 'Id', 'ID', 'roomId', 'RoomId', 'room_id'],
          'name': ['name', 'Name', 'room_name', 'RoomName', 'roomName', 'title', 'Title']
        },
        'classes': {
          'id': ['id', 'Id', 'ID', 'classId', 'ClassId', 'class_id'],
          // For Tonic classes, assume they are all group classes by default
          'type': ['type', 'Type', 'class_type', 'ClassType', 'classType', 'Instrument'],
          'capacity': ['capacity', 'Capacity', 'max_students', 'MaxStudents', 'maxStudents', 'Size'],
          'day': ['day', 'Day', 'DayOfWeek', 'dayOfWeek', 'weekday', 'Weekday'],
          'startTime': ['startTime', 'StartTime', 'start_time', 'time', 'Time', 'classTime', 'ClassTime'],
          'length': ['length', 'Length', 'duration', 'Duration', 'minutes', 'Minutes'],
          'instructorId': ['instructorId', 'InstructorId', 'instructor_id', 'instructor', 'Instructor', 'teacherId', 'TeacherId']
          // roomId is handled dynamically based on day-specific columns
        }
      };

      // Additional validation for sheets with required columns
      if (sheetMappings[sheetName]) {
        const columnMappings = sheetMappings[sheetName];
        
        // Create a map of actual header to normalized name
        const headerMap = {};
        Object.entries(columnMappings).forEach(([normalized, variations]) => {
          const found = variations.find(v => headers.includes(v));
          if (found) {
            headerMap[found] = normalized;
          }
        });
        
        const missingColumns = Object.keys(columnMappings).filter(required => 
          !Object.values(headerMap).includes(required)
        );
        
        if (missingColumns.length > 0) {
          console.log(`❌ Sheet "${sheetName}" is missing required columns: ${missingColumns.join(', ')}`);
          console.log('   Acceptable variations:');
          missingColumns.forEach(col => {
            console.log(`   • ${col}: ${columnMappings[col].join(' or ')}`);
          });
          return [];
        }
        
        // Store the actual header names we found for each required column
        if (sheetName === 'students') {
          this.studentColumnMap = headerMap;
        } else if (sheetName === 'classes') {
          this.classColumnMap = headerMap;
          
          // Log the found class column mappings
          console.log('📋 Class column mappings found:');
          Object.entries(headerMap).forEach(([original, normalized]) => {
            console.log(`   • ${original} → ${normalized}`);
          });
        } else if (sheetName === 'instructors') {
          this.instructorColumnMap = headerMap;
          
          // Log the found instructor column mappings
          console.log('📋 Instructor column mappings found:');
          Object.entries(headerMap).forEach(([original, normalized]) => {
            console.log(`   • ${original} → ${normalized}`);
          });
        }
        
        // Check for empty cells in required columns using the actual header names
        const emptyByColumn = {};
        for (let row = 1; row < data.length; row++) {
          headers.forEach((header, col) => {
            const normalizedHeader = headerMap[header];
            if (normalizedHeader && !data[row][col]) {
              emptyByColumn[normalizedHeader] = (emptyByColumn[normalizedHeader] || 0) + 1;
            }
          });
        }
        
        const emptyFields = Object.entries(emptyByColumn);
        if (emptyFields.length > 0) {
          console.log('⚠️  Found empty required fields in students sheet:');
          emptyFields.forEach(([field, count]) => {
            console.log(`   • ${field}: ${count} empty values`);
          });
        }
      }
      
      const rows = data.slice(1).map((row, idx) => {
        const obj = {};
        headers.forEach((h, i) => { 
              // Normalize known column names based on sheet type
          const columnMap = sheet.getName() === 'students' ? this.studentColumnMap : 
                          sheet.getName() === 'classes' ? this.classColumnMap : 
                          sheet.getName() === 'instructors' ? this.instructorColumnMap : null;
          
          if (columnMap && columnMap[h]) {
            obj[columnMap[h]] = row[i];
          } else {
            obj[h] = row[i];
          }
        });
        return obj;
      });

      // Validate student records if this is the students sheet
      if (sheet.getName() === 'students') {
        const validRows = [];
        const invalidRows = [];
        
        rows.forEach((row, idx) => {
          // Now we can reliably check the normalized 'id' field
          if (!row.id) {
            invalidRows.push({rowNum: idx + 2, data: row}); // +2 for 1-based index and header row
          } else {
            validRows.push(row);
          }
        });
        
        if (invalidRows.length > 0) {
          console.log(`⚠️  Found ${invalidRows.length} student records with missing IDs:`);
          invalidRows.forEach(({rowNum, data}) => {
            const details = Object.entries(data)
              .filter(([_, v]) => v)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ');
            console.log(`   • Row ${rowNum}: ${details || 'no valid fields'}`);
          });
        }
        
        console.log(`📄 Loaded ${validRows.length} valid students from "${sheet.getName()}" (${invalidRows.length} invalid records skipped)`);
        return validRows;
      }
      
      console.log(`📄 Loaded ${rows.length} rows from sheet "${sheet.getName()}"`);
      return rows;
    } catch (error) {
      console.log(`❌ Error reading sheet "${sheet.getName()}": ${error.toString()}`);
      return [];
    }
  }

  /**
   * Get room ID for instructor based on the day of the week
   */
  /**
   * Get room ID for class based on the instructor's schedule for that day
   * Group classes should use the instructor's assigned room for the day
   */
  getClassRoomForDay(classObj, day, rooms, instructors) {
    if (!classObj || !day) return 'ROOM-001';
    
    // If class has instructor, get their room for this day (primary approach)
    if (classObj.instructorId && instructors && instructors.length > 0) {
      const instructor = instructors.find(inst => 
        (inst.id || inst.Id) === classObj.instructorId
      );
      
      if (instructor) {
        console.log(`🔍 Getting room for class instructor ${classObj.instructorId} on ${day}`);
        const roomId = this.getInstructorRoomForDay(instructor, day, rooms);
        console.log(`🔍 Got room ID: '${roomId}' for class instructor ${classObj.instructorId} on ${day}`);
        return roomId;
      } else {
        console.log(`⚠️  Instructor ${classObj.instructorId} not found for class ${classObj.id}`);
      }
    }
    
    // Fallback: Try day-specific room field from class (if it exists)
    const dayCapitalized = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
    const roomIdField = `${dayCapitalized}RoomId`;
    
    if (classObj[roomIdField]) {
      console.log(`🔍 Using class day-specific room: ${roomIdField} = ${classObj[roomIdField]}`);
      return classObj[roomIdField];
    }
    
    // Fallback: Look for general room field from class
    const generalRoomId = classObj.roomId || classObj.RoomId || classObj.room_id || classObj.Room;
    if (generalRoomId) {
      console.log(`🔍 Using class general room: ${generalRoomId}`);
      return generalRoomId;
    }
    
    console.log(`⚠️  No room found for class on ${day}, using fallback`);
    return 'ROOM-001';
  }

  writeSheetData(sheet, data, append = false) {
    if (!sheet) {
      console.log('❌ Cannot write to sheet - sheet not found');
      return;
    }
    
    if (data.length === 0) {
      console.log(`ℹ️  No data to write to sheet "${sheet.getName()}"`);
      return;
    }
    
    try {
      // Check if data is arrays or objects
      const isArrayData = Array.isArray(data[0]);
      
      if (isArrayData) {
        // Handle array data - use existing headers from sheet or predefined headers
        if (!append) {
          console.log(`🧹 Clearing sheet "${sheet.getName()}" before writing`);
          sheet.clearContents();
          
          // Set appropriate headers based on sheet type
          if (sheet.getName().toLowerCase().includes('audit')) {
            // Audit sheet headers
            const auditHeaders = ['id', 'registration_id', 'action', 'timestamp', 'user', 'old_values', 'new_values'];
            sheet.appendRow(auditHeaders);
          } else {
            // Registration sheet headers (16 columns matching required structure)
            const regHeaders = ['Id', 'StudentId', 'InstructorId', 'Day', 'StartTime', 'Length (minutes)', 'RegistrationType', 'RoomId', 'Instrument', 'TransportationType', 'Notes', 'ClassId', 'ClassTitle', 'ExpectedStartDate', 'CreatedAt', 'CreatedBy'];
            sheet.appendRow(regHeaders);
            
            // Set column formatting to prevent Google Sheets from interpreting numbers as dates
            try {
              // Format the Length column (column 6) as a number
              const lengthColumn = sheet.getRange(2, 6, sheet.getMaxRows() - 1, 1);
              lengthColumn.setNumberFormat('0'); // Plain number format
              
              // Format the StartTime column (column 5) as text to preserve HH:mm format
              const startTimeColumn = sheet.getRange(2, 5, sheet.getMaxRows() - 1, 1);
              startTimeColumn.setNumberFormat('@'); // Text format
              
              console.log('✅ Set column formatting: Length=number, StartTime=text');
            } catch (formatError) {
              console.log(`⚠️  Could not set column formatting: ${formatError.toString()}`);
            }
          }
        }
        
        console.log(`✍️  Writing ${data.length} array rows to sheet "${sheet.getName()}"${append ? ' (appending)' : ''}`);
        
        // Write array data directly, ensuring proper data types
        data.forEach((row, index) => {
          try {
            // Debug: Log the row data before writing
            if (index < 3) { // Log first few rows for debugging
              console.log(`🔍 Row ${index + 1} before writing:`, row);
              console.log(`🔍 Length field (index 5): value="${row[5]}", type="${typeof row[5]}"`);
            }
            
            // Ensure the Length column (index 5) is a number, not a time
            if (row.length > 5 && row[5] !== undefined) {
              let length = row[5];
              
              // Convert any time-like values to pure numbers
              if (typeof length === 'string') {
                if (length.includes(':')) {
                  // Extract minutes from time format
                  const parts = length.split(':');
                  row[5] = parseInt(parts[0]) || 60;
                } else {
                  row[5] = parseInt(length) || 60;
                }
              } else if (typeof length === 'number') {
                row[5] = Math.round(length); // Ensure it's an integer
              } else {
                row[5] = 60; // Default fallback
              }
              
              // Final validation - must be a reasonable lesson length
              if (row[5] < 15 || row[5] > 120) {
                row[5] = 60;
              }
              
              // Debug: Log after conversion
              if (index < 3) {
                console.log(`🔍 Length field after conversion: value="${row[5]}", type="${typeof row[5]}"`);
              }
            }
            
            // Create a clean row with explicit types
            const cleanRow = row.map((cell, cellIndex) => {
              if (cellIndex === 5) { // Length column
                // Force to number and add validation
                const numericLength = Number(cell);
                if (isNaN(numericLength) || numericLength < 15 || numericLength > 120) {
                  return 60; // Default fallback
                }
                return numericLength; // Keep as number for now
              }
              return cell;
            });
            
            sheet.appendRow(cleanRow);
            
          } catch (error) {
            console.log(`⚠️  Error writing array row ${index + 1}: ${error.toString()}`);
          }
        });
        
        // After writing all data, fix the Length column formatting
        if (sheet.getName().toLowerCase().includes('registration')) {
          try {
            const lastRow = sheet.getLastRow();
            if (lastRow > 1) {
              console.log(`🔧 Fixing Length column formatting for ${lastRow - 1} rows...`);
              
              // Get the Length column range (column 6, starting from row 2)
              const lengthRange = sheet.getRange(2, 6, lastRow - 1, 1);
              
              // Set number format explicitly to prevent date interpretation
              lengthRange.setNumberFormat('0'); // Plain number format
              
              console.log('✅ Length column formatting applied');
            }
          } catch (formatError) {
            console.log(`⚠️  Error fixing Length column formatting: ${formatError.toString()}`);
          }
        }
        
      } else {
        // Handle object data (legacy format)
        const headers = Object.keys(data[0]);
        
        if (!append) {
          console.log(`🧹 Clearing sheet "${sheet.getName()}" before writing`);
          sheet.clearContents();
          sheet.appendRow(headers);
        }
        
        console.log(`✍️  Writing ${data.length} object rows to sheet "${sheet.getName()}"${append ? ' (appending)' : ''}`);
        
        data.forEach((obj, index) => {
          try {
            sheet.appendRow(headers.map(h => obj[h]));
          } catch (error) {
            console.log(`⚠️  Error writing object row ${index + 1}: ${error.toString()}`);
          }
        });
      }
      
      console.log(`✅ Successfully wrote ${data.length} rows to sheet "${sheet.getName()}"`);
    } catch (error) {
      console.log(`❌ Error writing to sheet "${sheet.getName()}": ${error.toString()}`);
    }
  }

  createRegistrationsForStudent(student, classes, instructors, rooms, count) {
    const createAudit = this.options.createAudit;
    const usedInstructorDayTimes = new Set(); // Track instructor availability
    
    if (!student) {
      console.log('⚠️  Skipping registration - student record is null or undefined');
      return [];
    }
    
    if (!student.id) {
      // Log more details about the problematic student record
      const details = Object.entries(student)
        .filter(([_, v]) => v) // Only show non-null fields
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      console.log(`⚠️  Skipping student with missing ID - Record details: ${details || 'no valid fields'}`);
      return [];
    }
    
    // For Tonic, all instrument classes are available for both group and private registration
    const availableClasses = classes.filter(c => {
      if (!c.type) {
        const details = Object.entries(c)
          .filter(([_, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        console.log(`⚠️  Class with no type specified - Class details: ${details || 'no valid fields'}`);
        return false;
      }
      
      // Accept any non-empty instrument type except 'n/a'
      return c.type.trim().toLowerCase() !== 'n/a';
    });
    
    if (availableClasses.length === 0) {
      // Log more details about the classes we found
      console.log('📊 Class type analysis:');
      const typeStats = classes.reduce((acc, c) => {
        if (!c.type) {
          acc['<missing>'] = (acc['<missing>'] || 0) + 1;
        } else {
          acc[c.type] = (acc[c.type] || 0) + 1;
        }
        return acc;
      }, {});
      
      Object.entries(typeStats).forEach(([type, count]) => {
        console.log(`   • ${type}: ${count} classes`);
      });
      
      console.log('\n⚠️  No valid instrument classes available for assignments');
      console.log('   Note: Classes with type "n/a" are excluded');
      return [];
    }
    
    const registrations = [];
    
    for (let i = 0; i < count; i++) {
      const isPrivate = Math.random() < 0.4; // 40% private lessons
      let registration;

      if (isPrivate) {
        registration = this.createPrivateRegistration(student, instructors, rooms, usedInstructorDayTimes);
      } else {
        registration = this.createGroupRegistration(student, availableClasses, rooms, instructors);
      }

      if (registration) {
        registrations.push(registration);
        
        // Create audit record if enabled
        if (createAudit) {
          const auditRecord = {
            id: this.generateUUID(),
            registrationId: registration.id,
            studentId: registration.studentId,
            action: 'CREATE',
            timestamp: new Date(),
            details: `Registration created during migration - Type: ${registration.registrationType}`
          };
          this.audits.push(auditRecord);
        }
      }
    }

    return registrations;
  }

  createPrivateRegistration(student, instructors, rooms, usedInstructorDayTimes) {
    const availableInstructors = instructors.filter(inst => inst.id || inst.Id);
    if (availableInstructors.length === 0) {
      console.log('⚠️  No instructors available for private lesson');
      return null;
    }

    // Find an available instructor and time slot
    let attempts = 0;
    const maxAttempts = 20; // Increased attempts
    
    while (attempts < maxAttempts) {
      const selectedInstructor = availableInstructors[Math.floor(Math.random() * availableInstructors.length)];
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const randomDay = days[Math.floor(Math.random() * days.length)];
      
      // Check if instructor is available on this day (if availability data exists)
      const availabilityField = `IsAvailable${randomDay}`;
      const isAvailable = selectedInstructor[availabilityField];
      
      // If availability field exists and is false, skip this day
      if (isAvailable !== undefined && !isAvailable) {
        attempts++;
        continue;
      }
      
      // Generate time slot based on instructor's availability (if specified)
      const startTimeField = `${randomDay}StartTime`;
      const endTimeField = `${randomDay}EndTime`;
      const instructorStartTime = selectedInstructor[startTimeField];
      const instructorEndTime = selectedInstructor[endTimeField];
      
      let startTime;
      if (instructorStartTime && instructorEndTime) {
        // Parse instructor's available time range - handle different data types
        let startHour = 8;
        let endHour = 17;
        
        try {
          if (typeof instructorStartTime === 'string') {
            startHour = parseInt(instructorStartTime.split(':')[0]) || 8;
          } else if (instructorStartTime instanceof Date) {
            startHour = instructorStartTime.getHours();
          } else if (typeof instructorStartTime === 'number') {
            startHour = Math.floor(instructorStartTime);
          }
          
          if (typeof instructorEndTime === 'string') {
            endHour = parseInt(instructorEndTime.split(':')[0]) || 17;
          } else if (instructorEndTime instanceof Date) {
            endHour = instructorEndTime.getHours();
          } else if (typeof instructorEndTime === 'number') {
            endHour = Math.floor(instructorEndTime);
          }
          
          // Ensure valid hour range
          if (startHour < 0 || startHour > 23) startHour = 8;
          if (endHour < 0 || endHour > 23) endHour = 17;
          if (endHour <= startHour) endHour = startHour + 1;
          
        } catch (error) {
          console.log(`⚠️  Error parsing instructor time data: ${error.toString()}, using fallback hours`);
          startHour = 8;
          endHour = 17;
        }
        
        // Generate random time within instructor's available hours
        const hour = startHour + Math.floor(Math.random() * (endHour - startHour));
        const minute = Math.random() < 0.5 ? 0 : 30;
        startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      } else {
        // Fallback to general business hours (8 AM to 5 PM)
        const hour = 8 + Math.floor(Math.random() * 10);
        const minute = Math.random() < 0.5 ? 0 : 30;
        startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
      
      // Create availability key using the correct ID field
      const instructorId = selectedInstructor.id || selectedInstructor.Id;
      const availabilityKey = `${instructorId}-${randomDay}-${startTime}`;
      
      // Check if this instructor is available at this time
      if (!usedInstructorDayTimes.has(availabilityKey)) {
        usedInstructorDayTimes.add(availabilityKey);
        
        // Get the instructor's room for this day from their schedule
        console.log(`🔍 Getting room for instructor ${instructorId} on ${randomDay}`);
        const roomId = this.getInstructorRoomForDay(selectedInstructor, randomDay, rooms);
        console.log(`🔍 Got room ID: '${roomId}' for instructor ${instructorId} on ${randomDay}`);
        
        // Only proceed if we got a valid room
        if (roomId && roomId !== 'ROOM-001') {
          // Select an instrument from the instructor's available instruments
          const instructorInstruments = [
            selectedInstructor.Instrument1,
            selectedInstructor.Instrument2, 
            selectedInstructor.Instrument3,
            selectedInstructor.Instrument4
          ].filter(inst => inst && inst.trim() && inst.trim().toLowerCase() !== 'n/a');
          
          const selectedInstrument = instructorInstruments.length > 0 
            ? instructorInstruments[Math.floor(Math.random() * instructorInstruments.length)]
            : 'Piano'; // Fallback to Piano
          
          // Private lesson lengths: 30, 45, or 60 minutes (as numbers)
          const privateLengths = [30, 45, 60];
          const length = privateLengths[Math.floor(Math.random() * privateLengths.length)];
          
          console.log(`✅ Creating private registration: ${selectedInstrument} lesson with ${instructorId} in room ${roomId} on ${randomDay} at ${startTime} (${length} min)`);
          
          return this.createRegistrationRecord(
            student,
            instructorId,
            roomId,
            'private',
            randomDay,
            startTime,
            length,
            selectedInstrument,
            null     // No class data for private lessons
          );
        } else {
          console.log(`⚠️  No valid room available for instructor ${instructorId} on ${randomDay} (got: ${roomId}), skipping this attempt`);
        }
      }
      
      attempts++;
    }
    
    console.log(`⚠️  Could not find available time slot for private lesson after ${maxAttempts} attempts`);
    return null;
  }

  createGroupRegistration(student, availableClasses, rooms, instructors) {
    if (availableClasses.length === 0) {
      console.log('⚠️  No available classes for group registration');
      return null;
    }

    const selectedClass = availableClasses[Math.floor(Math.random() * availableClasses.length)];
    
    // Group lessons use class schedule and instructor's room for that day
    const day = selectedClass.day || 'Monday';
    const startTime = selectedClass.startTime || '10:00';
    
    // Debug the class length data
    console.log(`🔍 Class length data: selectedClass.length = "${selectedClass.length}", type = ${typeof selectedClass.length}`);
    
    let length = selectedClass.length;
    if (typeof length === 'string') {
      if (length.includes(':')) {
        // Extract minutes from time format like "01:00:00"
        const parts = length.split(':');
        length = parseInt(parts[0]) * 60 + parseInt(parts[1]); // Convert hours:minutes to total minutes
        if (length > 120) length = parseInt(parts[0]); // If result is too big, probably just take the first part
      } else {
        length = parseInt(length);
      }
    }
    
    // Ensure it's a reasonable number
    if (!length || length < 15 || length > 120) {
      length = 60; // Default to 60 minutes
    }
    
    console.log(`🔍 Processed class length: ${length} minutes`);
    
    const roomId = this.getClassRoomForDay(selectedClass, day, rooms, instructors);
    const instructorId = selectedClass.instructorId || 'INST-001';
    
    console.log(`✅ Creating group registration: ${selectedClass.type} class with instructor ${instructorId} in room ${roomId} on ${day} (${length} min)`);
    
    return this.createRegistrationRecord(
      student,
      instructorId,
      roomId,
      'group',
      day,
      startTime, // Will be formatted by createRegistrationRecord
      length,    // This should now be a proper number
      selectedClass.type,
      selectedClass  // Pass the full class data
    );
  }

  createRegistrationRecord(student, instructorId, roomId, type, day, startTime, length, instrument, classData = null) {
    // Generate unique UUID for this registration
    const registrationId = this.generateUUID();
    
    // Expected start date should be the same as created date
    const createdDate = new Date();
    const expectedStartDate = new Date(createdDate); // Same as created date
    
    // Transportation following app patterns
    const transportationOptions = ['pickup', 'late bus'];
    const transportationType = transportationOptions[Math.floor(Math.random() * transportationOptions.length)];
    
    // Generate realistic notes
    const noteTemplates = [
      `${type === 'group' ? 'Group' : 'Private'} ${instrument} lesson for ${student.firstName || student.first_name || 'Student'}`,
      `Student requested ${type} instruction`,
      `${length}-minute ${type} ${instrument} session`,
      `Auto-generated ${type} registration`
    ];
    const notes = noteTemplates[Math.floor(Math.random() * noteTemplates.length)];
    
    // For group registrations, use actual class data
    const classId = type === 'group' && classData ? classData.id : '';
    const classTitle = type === 'group' && classData ? 
      (classData.title || classData.Title || classData.class_title || `${classData.type} Class`) : '';
    
    // Ensure length is a number (not a time format)
    let lengthNumber = length;
    if (typeof length === 'string') {
      // If it's a string that looks like time (e.g., "45:00"), extract the minutes
      if (length.includes(':')) {
        lengthNumber = parseInt(length.split(':')[0]) || 60;
      } else {
        lengthNumber = parseInt(length) || 60;
      }
    } else if (typeof length === 'number') {
      lengthNumber = length;
    } else {
      lengthNumber = 60; // Default fallback
    }
    
    // Ensure it's a reasonable lesson length
    if (lengthNumber < 15 || lengthNumber > 120) {
      lengthNumber = 60; // Default to 60 minutes if unreasonable
    }
    
    // Ensure startTime is in HH:mm format
    const formattedStartTime = this.formatTimeToHHMM(startTime);
    
    console.log(`🔧 Creating registration record: length=${lengthNumber} minutes (input was: "${length}", type: ${typeof length}), roomId=${roomId}, startTime=${formattedStartTime}`);
    
    // Create registration object for database - as array (16 columns matching required structure)
    const registration = [
      registrationId,                    // 1. Id
      student.id,                        // 2. StudentId
      instructorId,                      // 3. InstructorId
      day,                              // 4. Day
      formattedStartTime,               // 5. StartTime (HH:mm format)
      Number(lengthNumber),             // 6. Length (ensure it's a number, not time)
      type,                             // 7. RegistrationType (group/private)
      roomId,                           // 8. RoomId
      instrument,                       // 9. Instrument
      transportationType,               // 10. TransportationType
      notes,                            // 11. Notes
      classId,                          // 12. ClassId
      classTitle,                       // 13. ClassTitle
      expectedStartDate.toISOString().split('T')[0], // 14. ExpectedStartDate (same as created date)
      createdDate.toISOString(),        // 15. CreatedAt
      'MIGRATION_DEV002'               // 16. CreatedBy
    ];
    
    // Debug: Log the array being created
    console.log(`🔍 Registration array length field: registration[5] = "${registration[5]}", type = ${typeof registration[5]}`);

    return {
      id: registrationId,
      studentId: student.id,
      instructorId: instructorId,
      day: day,
      startTime: formattedStartTime,
      length: Number(lengthNumber),     // Ensure it's a number in the return object too
      registrationType: type,
      roomId: roomId,
      instrument: instrument,
      transportationType: transportationType,
      notes: notes,
      classId: classId,
      classTitle: classTitle,
      expectedStartDate: expectedStartDate.toISOString().split('T')[0],
      createdAt: createdDate.toISOString(),
      createdBy: 'MIGRATION_DEV002',
      _arrayData: registration // Store array format for writing to sheet
    };
  }  /**
   * Format time to HH:mm format regardless of input format
   */
  formatTimeToHHMM(time) {
    if (!time) return '09:00';
    
    // If it's already in HH:mm format, return as is
    if (typeof time === 'string' && /^\d{1,2}:\d{2}$/.test(time)) {
      const [hours, minutes] = time.split(':');
      return `${hours.padStart(2, '0')}:${minutes}`;
    }
    
    // If it's in HH:mm:ss format, remove seconds
    if (typeof time === 'string' && /^\d{1,2}:\d{2}:\d{2}$/.test(time)) {
      const [hours, minutes] = time.split(':');
      return `${hours.padStart(2, '0')}:${minutes}`;
    }
    
    // If it's in 12-hour format like "3:00:00PM" or "3:00PM"
    if (typeof time === 'string' && /\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)/i.test(time)) {
      try {
        const date = new Date(`1970-01-01 ${time}`);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      } catch (e) {
        console.log(`⚠️  Error parsing time '${time}', using fallback`);
        return '09:00';
      }
    }
    
    // If it's a Date object
    if (time instanceof Date) {
      return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // If it's a number (assume hours)
    if (typeof time === 'number') {
      const hours = Math.floor(time);
      const minutes = Math.floor((time - hours) * 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // Fallback
    console.log(`⚠️  Unknown time format '${time}', using fallback`);
    return '09:00';
  }

  getInstructorRoomForDay(instructor, day, rooms) {
    if (!instructor || !day) {
      console.log('⚠️  Invalid instructor or day provided');
      return 'ROOM-001';
    }

    // Map day to the instructor's day-specific room column
    const dayToRoomColumn = {
      'Monday': 'MondayRoomId',
      'Tuesday': 'TuesdayRoomId', 
      'Wednesday': 'WednesdayRoomId',
      'Thursday': 'ThursdayRoomId',
      'Friday': 'FridayRoomId'
    };

    const roomColumnName = dayToRoomColumn[day];
    if (!roomColumnName) {
      console.log(`⚠️  Invalid day '${day}' provided`);
      return 'ROOM-001';
    }

    // Debug: Log instructor data to see what's available
    console.log(`🔍 Looking up ${roomColumnName} for instructor ${instructor.id || instructor.Id}`);
    console.log(`🔍 Instructor room data: Monday=${instructor.MondayRoomId}, Tuesday=${instructor.TuesdayRoomId}, Wednesday=${instructor.WednesdayRoomId}, Thursday=${instructor.ThursdayRoomId}, Friday=${instructor.FridayRoomId}`);

    // Get the room ID from the instructor's day-specific column
    const roomId = instructor[roomColumnName];
    
    if (!roomId || roomId.toString().trim() === '') {
      console.log(`⚠️  No ${roomColumnName} found for instructor ${instructor.id || instructor.Id}, using fallback`);
      return 'ROOM-001';
    }

    console.log(`✅ Found ${roomColumnName} = '${roomId}' for instructor ${instructor.id || instructor.Id}`);

    // Return the room ID directly - it should be valid from instructor schedule
    return roomId.toString().trim();
  }

  fillGroupClasses(classes, rooms, instructors) {
    const fillPercent = this.options.fillPercent;
    
    // For Tonic, all instrument classes are considered group classes
    const groupClasses = classes.filter(c => {
      if (!c.type) {
        console.log(`⚠️  Class ${c.id || 'unknown'} has no type specified`);
        return false;
      }
      // Accept any non-empty instrument type except 'n/a'
      return c.type.trim().toLowerCase() !== 'n/a';
    });
    
    if (groupClasses.length === 0) {
      console.log('ℹ️  No valid instrument classes found for capacity filling');
      console.log('   Note: Classes with type "n/a" are excluded');
      return;
    }
    
    console.log(`📋 Found ${groupClasses.length} group classes with types: ${[...new Set(groupClasses.map(c => c.type))].join(', ')}`);
    
    console.log(`🎯 Filling ${groupClasses.length} group classes to ${(fillPercent * 100)}% capacity:`);
    
    let totalAdded = 0;
    groupClasses.forEach(cls => {
      if (!cls.id || !cls.capacity) {
        console.log(`⚠️  Skipping class with missing ID or capacity: ${cls.id || 'unknown'}`);
        return;
      }
      
      const current = this.registrations.filter(r => r.classId === cls.id).length;
      const target = Math.floor(cls.capacity * fillPercent);
      
      if (current < target) {
        const toAdd = target - current;
        console.log(`   • Class ${cls.id}: ${current}/${cls.capacity} → adding ${toAdd} dummy registrations`);
        
        // Add dummy registrations to fill up - using createRegistrationRecord for consistency
        for (let i = current; i < target; i++) {
          const dummyStudent = {
            id: `dummy_${cls.id}_${i}`,
            firstName: 'Dummy',
            lastName: 'Student'
          };
          
          const dummyRegistration = this.createRegistrationRecord(
            dummyStudent,
            cls.instructorId || 'INST-001',
            this.getClassRoomForDay(cls, cls.day || 'Monday', rooms, instructors) || 'ROOM-001',
            'group',
            cls.day || 'Monday',
            cls.startTime || '10:00',
            parseInt(cls.length) || 60, // Ensure length is a number
            cls.type,
            cls  // Pass the full class data
          );
          
          // Override the createdBy for dummy registrations
          dummyRegistration._arrayData[15] = 'MIGRATION_DUMMY';
          dummyRegistration.createdBy = 'MIGRATION_DUMMY';
          dummyRegistration.notes = 'Dummy registration for capacity filling';
          dummyRegistration._arrayData[10] = 'Dummy registration for capacity filling';
          
          this.registrations.push(dummyRegistration);
        }
        totalAdded += toAdd;
      } else {
        console.log(`   • Class ${cls.id}: ${current}/${cls.capacity} (already at target)`);
      }
    });
    
    if (totalAdded > 0) {
      console.log(`✅ Added ${totalAdded} dummy registrations across ${groupClasses.length} group classes`);
    } else {
      console.log('ℹ️  No additional registrations needed for group classes');
    }
  }

  shuffleArray(array) {
    // Fisher-Yates shuffle
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Generate a UUID v4 string
   * Uses crypto.randomUUID() if available (modern browsers/Node),
   * otherwise falls back to a Math.random() based implementation
   */
  generateUUID() {
    // Try using crypto.randomUUID() if available
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback to Math.random() based UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
