# Migration 002: Composite Keys to UUID Primary Keys

## 🎯 Purpose

This migration transforms the registration system from complex composite keys to simple UUID primary keys for better maintainability, performance, and frontend compatibility.

## ⚠️ Current Problem

**Complex Composite Keys:**
```javascript
// Private lessons
"131509_TEACHER1@EMAIL.COM_Monday_17:15"
"131509_TEACHER2@EMAIL.COM_Thursday_16:00"

// Group classes  
"72768_G002"
```

**Issues:**
- Two different key patterns (private vs group)
- Difficult to query and update
- Causes frontend relationship mapping problems
- Makes API endpoint design complex
- Complicates caching strategies

## ✅ Solution

**Simple UUID Primary Keys:**
```javascript
// After migration
"a1b2c3d4-e5f6-7890-abcd-ef1234567890"
"b2c3d4e5-f6g7-8901-bcde-f23456789012"
```

**Benefits:**
- Universal format for all registration types
- Easier database queries and relationships
- Simplified API endpoints
- Better frontend data handling
- Consistent with modern best practices

## 📋 Migration Details

### What Changes

1. **Registrations Table:**
   - `Id` column: Composite keys → UUIDs
   - `LegacyId` column: Added to preserve original keys
   - All other data preserved exactly

2. **Registrations Audit Table:**
   - `Id` column: Updated to UUIDs
   - `RegistrationId` column: Updated to reference new UUIDs
   - Historical data relationships maintained

### What's Preserved

- ✅ All registration data (students, instructors, times, etc.)
- ✅ All audit history and change tracking
- ✅ All relationships between tables
- ✅ Original composite keys in `LegacyId` column
- ✅ Complete rollback capability

## 🚀 How to Run

### Step 1: Preparation

1. **Open Google Sheets:**
   - Navigate to your Tonic spreadsheet
   - Go to Extensions > Apps Script

2. **Configure Spreadsheet ID:**
   ```javascript
   // In Config.js, update this line:
   var GLOBAL_SPREADSHEET_ID = 'YOUR_ACTUAL_SPREADSHEET_ID';
   ```

3. **Add Migration Files:**
   - Copy `Migration002_CompositeToUuid.js` content
   - Copy `Migration002_CompositeToUuid_Verification.js` content

### Step 2: Preview (ALWAYS RUN FIRST!)

```javascript
// Run this function first to see what will change
previewCompositeToUuidMigration();
```

**Expected Preview Output:**
```
📊 Current Analysis:
   - Current registrations: 6
   - Headers: Id, StudentId, InstructorId, Day, StartTime, Length, RegistrationType, RoomId, Instrument, TransportationType, Notes, ClassId, ClassTitle, ExpectedStartDate, CreatedAt, CreatedBy

🔑 Composite Key Analysis:
   - Total keys to migrate: 6
   - Private lesson pattern: 5
   - Group class pattern: 1
   - Private example: "131509_TEACHER1@EMAIL.COM_Monday_17:15"
   - Group example: "72768_G002"

📋 Planned Changes:
   1. Add new "LegacyId" column to preserve original composite keys
   2. Replace all composite key IDs with UUIDs
   3. Update registrations_audit table accordingly
   4. Maintain all data relationships and integrity
```

### Step 3: Execute Migration

```javascript
// After reviewing preview, run the actual migration
runCompositeToUuidMigration();
```

**Expected Migration Output:**
```
🚀 Starting Composite Key to UUID Migration...
📦 Creating automatic backup...
✅ Backup created: BACKUP_Migration002_CompositeToUuid_2025-08-04T20-30-00-000Z
🎼 Migrating registrations table...
✅ Migrated 6 registration records
📜 Migrating registrations_audit table...
✅ Migrated 8 audit records
🔍 Validating migration...
✅ Validation Results:
   - Valid UUIDs: 6/6
   - Preserved legacy IDs: 6/6
✅ Migration completed successfully!
📊 Migration Summary:
   - Registrations migrated: 6
   - Audit records migrated: 8
📦 Backup created for rollback if needed
```

### Step 4: Verification

```javascript
// Verify everything worked correctly
verifyUuidMigration();
```

**Expected Verification Output:**
```
🔍 VERIFYING UUID MIGRATION
📊 Checking registrations table...
   ✅ Id column exists
   ✅ LegacyId column exists
   ✅ All registration IDs are valid UUIDs (6 valid, 0 invalid)
📜 Checking registrations_audit table...
   ✅ Audit table processed: 8 audit UUIDs, 8 registration references
🔗 Checking data integrity...
   ✅ No duplicate UUIDs (6 total, 6 unique)
   ✅ All records have required fields (6 complete)
🏛️  Checking legacy ID preservation...
   ✅ Legacy IDs preserved (6 total, 6 composite)
🔗 Checking relationship integrity...
   ✅ Student relationships intact (6/6)
   ✅ Instructor relationships intact (6/6)

📊 VERIFICATION SUMMARY:
✅ Total checks passed: 8
❌ Total checks failed: 0
⚠️  Warnings: 0

🎉 Migration verification PASSED! All systems go.
```

## 🔄 Rollback (If Needed)

If something goes wrong, you can rollback:

```javascript
// Option 1: Automatic rollback
rollbackCompositeToUuidMigration();

// Option 2: Restore from backup
restoreCompositeToUuidMigrationFromBackup();
```

## 📊 Before & After Comparison

### Before Migration
```javascript
// registrations table
{
  Id: "131509_TEACHER1@EMAIL.COM_Monday_17:15",
  StudentId: "131509",
  InstructorId: "TEACHER1@EMAIL.COM",
  Day: "Monday",
  StartTime: "17:15",
  // ... other fields
}
```

### After Migration
```javascript
// registrations table
{
  Id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  LegacyId: "131509_TEACHER1@EMAIL.COM_Monday_17:15",
  StudentId: "131509", 
  InstructorId: "TEACHER1@EMAIL.COM",
  Day: "Monday",
  StartTime: "17:15",
  // ... other fields (unchanged)
}
```

## 🎯 Impact on Application Code

### Frontend Changes Needed

**Before (Complex):**
```javascript
// Complex composite key parsing
const registration = registrations.find(r => 
  r.id.includes(student.id) && r.id.includes(instructor.id)
);
```

**After (Simple):**
```javascript
// Simple UUID lookup
const registration = registrations.find(r => 
  r.studentId === student.id && r.instructorId === instructor.id
);
```

### API Changes Needed

**Before:**
```javascript
GET /registrations/131509_TEACHER1@EMAIL.COM_Monday_17:15
```

**After:**
```javascript
GET /registrations/a1b2c3d4-e5f6-7890-abcd-ef1234567890
GET /registrations?studentId=131509&instructorId=TEACHER1@EMAIL.COM
```

## 🛡️ Safety Features

1. **Automatic Backup:** Complete backup created before any changes
2. **Preview Mode:** See exactly what will change before running
3. **Validation:** Comprehensive checks after migration
4. **Rollback:** Multiple rollback options if needed
5. **Legacy Preservation:** Original keys preserved in `LegacyId` column

## 🔍 Troubleshooting

### Common Issues

1. **"Spreadsheet ID not configured"**
   - Update `GLOBAL_SPREADSHEET_ID` in Config.js

2. **"registrations sheet not found"**
   - Verify sheet name is exactly "registrations"

3. **Preview shows 0 records**
   - Check that registrations sheet has data
   - Verify data starts in row 2 (row 1 should be headers)

4. **Migration fails partway through**
   - Run `rollbackCompositeToUuidMigration()`
   - Check the console for specific error messages
   - Verify you have edit permissions on the spreadsheet

### Getting Help

If the migration fails:

1. **Don't panic** - backups are automatically created
2. Run the verification script to see what succeeded
3. Check the console logs for specific error messages
4. Use rollback functions to revert changes
5. Review the troubleshooting section above

## ✅ Success Criteria

Migration is successful when:

- ✅ All registration IDs are valid UUIDs
- ✅ LegacyId column contains original composite keys
- ✅ All data relationships are intact
- ✅ Audit trail is properly updated
- ✅ Verification script passes all checks

## 📈 Expected Benefits

After successful migration:

1. **Simplified Queries:** Easier database lookups and joins
2. **Better Performance:** Faster indexing and searching
3. **Cleaner APIs:** Simpler endpoint design and caching
4. **Frontend Simplicity:** Easier relationship mapping
5. **Maintainability:** Standard UUID format across all tables
6. **Scalability:** Better prepared for future growth

---

*This migration is part of the long-term architectural improvements to make the Tonic registration system more maintainable and performant.*
