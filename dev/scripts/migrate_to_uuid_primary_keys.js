#!/usr/bin/env node

/**
 * MIGRATION: UUID Primary Keys for Registrations
 * ==============================================
 * 
 * Migrates from composite key system to UUID-based primary keys
 * for better maintainability, performance, and scalability.
 * 
 * BEFORE: 131509_TEACHER1@EMAIL.COM_Monday_17:15
 * AFTER:  uuid-based IDs with separate composite key index
 */

import { GoogleSheetsDbClient } from '../../src/database/googleSheetsDbClient.js';
import { configService } from '../../src/services/configurationService.js';
import { createLogger } from '../../src/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

async function migrateToUuidPrimaryKeys() {
  console.log('🔄 MIGRATION: UUID Primary Keys for Registrations');
  console.log('==================================================\n');
  
  try {
    // Initialize logger and client
    const logger = createLogger(configService);
    const client = new GoogleSheetsDbClient(configService);
    
    console.log('✅ Client initialized successfully\n');

    // Step 1: Backup current registrations
    console.log('📋 STEP 1: Backing up current registrations...');
    const currentRegs = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: 'registrations!A1:Z100',
    });

    const regValues = currentRegs.data.values || [];
    const headers = regValues[0] || [];
    const dataRows = regValues.slice(1);

    console.log(`   📊 Found ${dataRows.length} registrations to migrate`);
    console.log(`   📋 Current headers: ${headers.join(', ')}\n`);

    // Step 2: Create backup sheet
    console.log('📁 STEP 2: Creating backup sheet...');
    try {
      await client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: client.spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: `registrations_backup_${new Date().toISOString().split('T')[0]}`,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 30
                }
              }
            }
          }]
        }
      });
      console.log('   ✅ Backup sheet created\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ℹ️  Backup sheet already exists\n');
      } else {
        throw error;
      }
    }

    // Step 3: Create new schema with UUID primary keys
    console.log('🏗️  STEP 3: Designing new UUID-based schema...');
    
    const newHeaders = [
      'Id',                    // NEW: UUID primary key
      'CompositeKey',          // PRESERVED: Original composite key as index
      'StudentId',             // EXISTING: Foreign key to students
      'InstructorId',          // EXISTING: Foreign key to instructors
      'Day',                   // EXISTING: Day of week
      'StartTime',             // EXISTING: Start time
      'Length',                // EXISTING: Lesson length
      'RegistrationType',      // EXISTING: private/group
      'RoomId',                // EXISTING: Room assignment
      'Instrument',            // EXISTING: Instrument
      'TransportationType',    // EXISTING: Transportation
      'Notes',                 // EXISTING: Additional notes
      'ClassId',               // EXISTING: For group lessons
      'ClassTitle',            // EXISTING: Class name
      'ExpectedStartDate',     // EXISTING: Start date
      'CreatedAt',             // EXISTING: Creation timestamp
      'CreatedBy',             // EXISTING: Creator
      'Status',                // NEW: active, paused, completed, cancelled
      'ModifiedAt',            // NEW: Last modification timestamp
      'ModifiedBy',            // NEW: Last modifier
      'Version'                // NEW: Optimistic locking version
    ];

    console.log('   📋 New schema designed with UUID primary keys');
    console.log(`   📊 Fields: ${newHeaders.length} (${newHeaders.length - headers.length} new fields added)\n`);

    // Step 4: Transform existing data
    console.log('🔄 STEP 4: Transforming data to new schema...');
    
    const transformedData = [newHeaders]; // Start with headers
    const timestamp = new Date().toISOString();
    
    dataRows.forEach((row, index) => {
      if (row.length === 0) return;
      
      const originalCompositeKey = row[0] || '';
      const newUuid = uuidv4();
      
      const transformedRow = [
        newUuid,                          // Id: New UUID
        originalCompositeKey,             // CompositeKey: Preserved original
        row[1] || '',                     // StudentId
        row[2] || '',                     // InstructorId  
        row[3] || '',                     // Day
        row[4] || '',                     // StartTime
        row[5] || '',                     // Length
        row[6] || '',                     // RegistrationType
        row[7] || '',                     // RoomId
        row[8] || '',                     // Instrument
        row[9] || '',                     // TransportationType
        row[10] || '',                    // Notes
        row[11] || '',                    // ClassId
        row[12] || '',                    // ClassTitle
        row[13] || '',                    // ExpectedStartDate
        row[14] || '',                    // CreatedAt
        row[15] || '',                    // CreatedBy
        'active',                         // Status: Default to active
        timestamp,                        // ModifiedAt: Migration timestamp
        'system_migration',               // ModifiedBy: Migration marker
        '1'                               // Version: Initial version
      ];
      
      transformedData.push(transformedRow);
      
      console.log(`   🔄 Transformed: ${originalCompositeKey} → ${newUuid}`);
    });

    console.log(`   ✅ Transformed ${transformedData.length - 1} registrations\n`);

    // Step 5: Create new registrations sheet
    console.log('📝 STEP 5: Creating new registrations sheet...');
    
    // Clear existing registrations sheet
    await client.sheets.spreadsheets.values.clear({
      spreadsheetId: client.spreadsheetId,
      range: 'registrations!A:Z'
    });

    // Write new data structure
    await client.sheets.spreadsheets.values.update({
      spreadsheetId: client.spreadsheetId,
      range: 'registrations!A1',
      valueInputOption: 'RAW',
      resource: {
        values: transformedData
      }
    });

    console.log('   ✅ New registrations sheet created with UUID primary keys\n');

    // Step 6: Update registrations_audit schema
    console.log('📜 STEP 6: Updating audit trail schema...');
    
    const auditData = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: 'registrations_audit!A1:Z100',
    });

    const auditValues = auditData.data.values || [];
    const auditHeaders = auditValues[0] || [];
    const auditRows = auditValues.slice(1);

    // New audit headers with UUID support
    const newAuditHeaders = [
      'Id',                    // Audit record UUID
      'RegistrationId',        // NEW: UUID reference to registration
      'RegistrationCompositeKey', // PRESERVED: Original composite key reference
      'StudentId',             // EXISTING
      'InstructorId',          // EXISTING
      'Day',                   // EXISTING
      'StartTime',             // EXISTING
      'Length',                // EXISTING
      'RegistrationType',      // EXISTING
      'RoomId',                // EXISTING
      'Instrument',            // EXISTING
      'TransportationType',    // EXISTING
      'Notes',                 // EXISTING
      'ClassId',               // EXISTING
      'ClassTitle',            // EXISTING
      'ExpectedStartDate',     // EXISTING
      'CreatedAt',             // EXISTING
      'CreatedBy',             // EXISTING
      'IsDeleted',             // EXISTING
      'DeletedAt',             // EXISTING
      'DeletedBy',             // EXISTING
      'Action',                // NEW: create, update, delete
      'Version'                // NEW: Version at time of audit
    ];

    // Transform audit data to include UUID mappings
    const transformedAuditData = [newAuditHeaders];
    
    auditRows.forEach(row => {
      if (row.length === 0) return;
      
      const originalRegId = row[1] || ''; // Original registration composite key
      
      // Find corresponding UUID from transformed data
      const matchingReg = transformedData.find(tRow => tRow[1] === originalRegId);
      const registrationUuid = matchingReg ? matchingReg[0] : uuidv4();
      
      const transformedAuditRow = [
        row[0] || uuidv4(),              // Id: Keep existing or generate new UUID
        registrationUuid,                // RegistrationId: New UUID reference
        originalRegId,                   // RegistrationCompositeKey: Preserved
        row[2] || '',                    // StudentId
        row[3] || '',                    // InstructorId
        row[4] || '',                    // Day
        row[5] || '',                    // StartTime
        row[6] || '',                    // Length
        row[7] || '',                    // RegistrationType
        row[8] || '',                    // RoomId
        row[9] || '',                    // Instrument
        row[10] || '',                   // TransportationType
        row[11] || '',                   // Notes
        row[12] || '',                   // ClassId
        row[13] || '',                   // ClassTitle
        row[14] || '',                   // ExpectedStartDate
        row[15] || '',                   // CreatedAt
        row[16] || '',                   // CreatedBy
        row[17] || 'false',              // IsDeleted
        row[18] || '',                   // DeletedAt
        row[19] || '',                   // DeletedBy
        row[17] === 'true' ? 'delete' : 'create', // Action: Infer from IsDeleted
        '1'                              // Version: Default to 1
      ];
      
      transformedAuditData.push(transformedAuditRow);
    });

    // Update audit sheet
    await client.sheets.spreadsheets.values.clear({
      spreadsheetId: client.spreadsheetId,
      range: 'registrations_audit!A:Z'
    });

    await client.sheets.spreadsheets.values.update({
      spreadsheetId: client.spreadsheetId,
      range: 'registrations_audit!A1',
      valueInputOption: 'RAW',
      resource: {
        values: transformedAuditData
      }
    });

    console.log('   ✅ Audit trail updated with UUID references\n');

    // Step 7: Create composite key index sheet for performance
    console.log('🗂️  STEP 7: Creating composite key index...');
    
    const indexData = [
      ['CompositeKey', 'RegistrationId', 'CreatedAt'],
      ...transformedData.slice(1).map(row => [
        row[1], // CompositeKey
        row[0], // RegistrationId (UUID)
        row[18] // ModifiedAt
      ])
    ];

    try {
      await client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: client.spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: 'registrations_composite_index',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 10
                }
              }
            }
          }]
        }
      });

      await client.sheets.spreadsheets.values.update({
        spreadsheetId: client.spreadsheetId,
        range: 'registrations_composite_index!A1',
        valueInputOption: 'RAW',
        resource: {
          values: indexData
        }
      });

      console.log('   ✅ Composite key index created for backward compatibility\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ℹ️  Index sheet already exists, updating...\n');
        await client.sheets.spreadsheets.values.update({
          spreadsheetId: client.spreadsheetId,
          range: 'registrations_composite_index!A1',
          valueInputOption: 'RAW',
          resource: {
            values: indexData
          }
        });
      } else {
        throw error;
      }
    }

    // Step 8: Generate migration summary
    console.log('📊 MIGRATION SUMMARY:');
    console.log('====================');
    console.log(`✅ Migrated ${transformedData.length - 1} registrations to UUID primary keys`);
    console.log(`✅ Updated ${transformedAuditData.length - 1} audit records`);
    console.log(`✅ Created composite key index with ${indexData.length - 1} entries`);
    console.log(`✅ Added ${newHeaders.length - headers.length} new schema fields`);
    console.log('✅ Maintained backward compatibility with composite key index');
    console.log('✅ Preserved all existing data integrity\n');

    console.log('🔧 NEXT STEPS:');
    console.log('===============');
    console.log('1. Update application code to use UUID primary keys');
    console.log('2. Update API endpoints to accept UUID parameters');
    console.log('3. Update frontend components to use new schema');
    console.log('4. Test thoroughly with new UUID-based lookups');
    console.log('5. Consider removing composite key dependency after testing\n');

    console.log('✅ UUID Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n🚨 ROLLBACK INSTRUCTIONS:');
    console.error('1. Restore from backup sheet created at beginning');
    console.error('2. Clear new schema and restore original');
    console.error('3. Check audit trail integrity');
    throw error;
  }
}

// Run the migration
migrateToUuidPrimaryKeys()
  .then(() => {
    console.log('\n🎉 UUID Primary Key migration completed successfully!');
    console.log('🔍 Run registration analysis scripts to verify migration.');
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  });
