# Gas Migrations Summary

This document provides an overview of all Google Apps Script migrations in this project.

## Migration System Overview

The migration system provides:
- **Structured Migrations**: Each migration is a complete, self-contained class
- **Safe Copy-Modify-Replace Pattern**: All migrations use atomic operations that create working copies, apply changes, then safely replace originals
- **Automatic Backups**: All migrations create backups before execution
- **Rollback Capability**: Full rollback support with original data restoration
- **Comprehensive Verification**: Detailed verification scripts for each migration
- **Preview Mode**: See what changes will be made before executing
- **Integrated Test Suites**: Each migration file includes comprehensive tests
- **Single File Architecture**: Everything for each migration lives in one file

## �️ NEW SAFETY FEATURES

**COPY-MODIFY-REPLACE PATTERN**

All migrations now use a safe pattern that:
- ✅ **Creates working copies** of sheets before making changes
- ✅ **Applies modifications to copies**, leaving originals untouched
- ✅ **Atomically replaces** originals only after all changes succeed
- ✅ **Provides instant rollback** with automatic cleanup
- ✅ **Eliminates data corruption risk** through atomic operations

See [COPY_MODIFY_REPLACE_PATTERN.md](./COPY_MODIFY_REPLACE_PATTERN.md) for detailed documentation.

## �🔐 SIMPLE CONFIGURATION

**JUST SET YOUR SPREADSHEET ID**

```javascript
// ✅ Open Config.js and set your spreadsheet ID:
const SPREADSHEET_ID = "your-spreadsheet-id-here";

// All migrations automatically use this ID
runCompositeToUuidMigration(); // Uses getSpreadsheetId()
runAllTablesToUuidMigration(); // Uses getSpreadsheetId()
```

## 🚀 Quick Start

**EDIT ONE LINE, DEPLOY, RUN**

1. **Install clasp CLI**: `npm install -g @google/clasp`
2. **Authenticate**: `clasp login`
3. **Set Spreadsheet ID**: Edit `SPREADSHEET_ID` constant in `Config.js`
4. **Deploy**: Run `npm run deploy` from `gas-src/` directory
5. **Run**: Execute functions directly in Google Apps Script editor

```bash
# Initial setup
npm install -g @google/clasp
clasp login

# Edit Config.js - set SPREADSHEET_ID constant

# Deploy project
cd gas-src/
npm run deploy

# Run migrations in Google Apps Script editor
```

## 📋 Available Migrations

### Migration 002: Convert Composite Keys to UUID Primary Keys
- **Purpose**: Transform registration system from complex composite keys to simple UUID primary keys
- **Status**: ✅ PROCESSED (August 6, 2025) - Successfully completed
- **Files**: `archive/Migration002_CompositeToUuid_PROCESSED.js`
- **Result**: Converted composite keys to UUIDs for better maintainability and performance

### Migration 003: Convert All Tables to UUID Primary Keys  
- **Purpose**: Convert all remaining tables to use UUID primary keys for system consistency
- **Status**: ❌ ARCHIVED (August 6, 2025) - Migration archived as per project requirements
- **Files**: `archive/Migration003_AllTablesToUuid_ARCHIVED.js`
- **Note**: Migration marked as archived

### Migration 004: Attendance UUID Migration
- **Purpose**: Convert attendance table IDs to UUID format
- **Status**: ✅ Active and production-ready
- **Files**: `Migration004_AttendanceToUuid.js`
- **Safety**: Full copy-modify-replace pattern with automatic backups

### Migration 005: Add Instructor AccessCode
- **Purpose**: Add AccessCode column to instructors table for secure login
- **Status**: ✅ Active and production-ready
- **Files**: `Migration005_AddInstructorAccessCode.js` (single file with migration, tests, and production functions)
- **Features**: Unique 6-digit codes, comprehensive testing, production deployment utilities
- **Safety**: Unique code generation with comprehensive verification and rollback support

### Migration 006: Add Admin AccessCode
- **Purpose**: Add AccessCode column to admins table for secure admin authentication
- **Status**: ✅ Active and production-ready
- **Files**: `Migration006_AddAdminAccessCode.js` (single file with migration, tests, and production functions)
- **Features**: 6-digit unique codes, export utilities, pre-flight checks, production confirmations
- **Safety**: Full verification and rollback support with production safety features

### Migration 008: Add Parent AccessCode (Phone-Based)
- **Purpose**: Add AccessCode column to parents table using last 4 digits of phone number
- **Status**: ✅ Active and production-ready
- **Files**: `Migration008_AddParentAccessCode.js` (single file with migration, tests, and production functions)
- **Features**: Phone-based authentication, fallback codes, production deployment utilities
- **Safety**: Phone validation with fallback codes for invalid phones, full verification system

## Migration Execution Order

**Currently Active Migrations:**

**For attendance table UUID conversion**:
- **Migration 004** - Attendance table UUID migration (independent, can run anytime)

**For instructor login functionality**:
- **Migration 005** - Add instructor access codes (independent, can run anytime)

**For admin login functionality**:
- **Migration 006** - Add admin access codes (independent, can run anytime)

**For parent login functionality**:
- **Migration 008** - Add parent access codes using phone numbers (independent, can run anytime)

**Completed/Archived Migrations:**
- **Migration 002** - ✅ PROCESSED: Composite to UUID conversion completed
- **Migration 003** - ❌ ARCHIVED: All tables to UUID migration archived

## How to Run Migrations

### Step 1: Preview Migration
```javascript
// Preview what Migration 004 will do (attendance UUID)
previewAttendanceToUuidMigration()

// Preview what Migration 005 will do (instructor access codes)
previewAddInstructorAccessCodeMigration()

// Preview what Migration 006 will do (admin access codes)
previewAddAdminAccessCodeMigration()

// Preview what Migration 008 will do (parent access codes)
previewAddParentAccessCodeMigration()
```

### Step 2: Execute Migration
```javascript
// Execute Migration 004 (attendance UUID)
runAttendanceToUuidMigration()

// Run Migration 005 (instructor access codes)
runAddInstructorAccessCodeMigration()

// Run Migration 006 (admin access codes)
runAddAdminAccessCodeMigration()

// Run Migration 008 (parent access codes)
runAddParentAccessCodeMigration()
```

### For Access Code Migrations:
```javascript
// Run Migration 005 (instructor access codes)
runAddInstructorAccessCodeMigration()

// Run Migration 006 (admin access codes)
runAddAdminAccessCodeMigration()

// Run Migration 008 (parent access codes)
runAddParentAccessCodeMigration()
```

### For UUID Migrations:
```javascript
// Execute Migration 004 (attendance to UUID)
runAttendanceToUuidMigration()
```

### Step 3: Verify Migration

### For Access Code Migrations:
```javascript
// Verify Migration 005 (instructor access codes)
verifyAddInstructorAccessCodeMigration()

// Verify Migration 006 (admin access codes)
verifyAddAdminAccessCodeMigration()

// Verify Migration 008 (parent access codes)
verifyAddParentAccessCodeMigration()
```

### For UUID Migrations:
```javascript
// Verify Migration 004 (attendance UUID)
verifyAttendanceToUuidMigration()
```

### Step 4: Production Deployment (Access Code Migrations)

For production environments, use the special production functions that include safety confirmations:

```javascript
// Production deployment for instructor access codes
runAddInstructorAccessCodeProductionMigration()

// Production deployment for admin access codes  
runProductionAdminAccessCodeMigration()

// Production deployment for parent access codes
runProductionParentAccessCodeMigration()
```

**Production Features:**
- ✅ **User Confirmations**: Multiple confirmation dialogs before execution
- ✅ **Pre-flight Checks**: Validates data integrity before migration
- ✅ **Enhanced Backups**: Production-specific backup naming
- ✅ **Export Utilities**: Built-in access code export functions
- ✅ **Health Checks**: Post-migration verification and monitoring
- ✅ **Next Steps Guidance**: Clear instructions for post-migration actions

### Step 5: Access Code Export and Distribution

After successful migration, export access codes for distribution:

```javascript
// Export instructor access codes
exportInstructorAccessCodes()

// Export admin access codes
exportAdminAccessCodes()

// Export parent access codes
exportParentAccessCodes()
```

### Step 6: Test Migrations (Optional)

Each migration includes integrated test suites for comprehensive validation:

```javascript
// Test Migration 005 (instructor access codes)
runAllInstructorAccessCodeTests()          // Full test suite
testAddInstructorAccessCodeMigration()     // Basic functionality tests
quickVerifyInstructorAccessCodes()         // Quick validation

// Test Migration 006 (admin access codes)
runAdminAccessCodeMigrationTests()         // Full test suite
quickTestAdminAccessCodes()                // Quick smoke test
testAdminMigrationWithSampleData()         // Sample data test

// Test Migration 008 (parent access codes)
runParentAccessCodeMigrationTests()        // Full test suite
quickTestParentAccessCodes()               // Quick smoke test
testParentMigrationWithSampleData()        // Sample data test
```

**Test Features:**
- ✅ **Self-Contained**: All tests live within migration files
- ✅ **Comprehensive Coverage**: Environment setup, data preservation, rollback testing
- ✅ **Sample Data Creation**: Automated test data generation
- ✅ **Performance Testing**: Large dataset validation
- ✅ **Error Handling**: Edge case and failure scenario testing

### For UUID Migrations:
```javascript
// Verify Migration 002
verifyCompositeToUuidMigration()

// Verify Migration 004
verifyAttendanceToUuidMigration()

// Verify Migration 003 (optional)
verifyAllTablesUuidMigration()

// Verify Migration 005
verifyAddInstructorAccessCodeMigration()

// Quick check for Migration 005
quickVerifyInstructorAccessCodes()
```

### Step 4: Post-Migration Actions (Migration 005)
```javascript
// Export instructor access codes for distribution
exportInstructorAccessCodes()

// Run production health check
quickProductionHealthCheck()
```

## Safety Features

### Automatic Backups
Every migration creates automatic backups before execution:
- Timestamped backup sheets
- Complete data preservation
- Easy restoration if needed

### Rollback Capability
Each active migration supports full rollback:
```javascript
// Rollback Migration 004 (attendance UUID)
rollbackAttendanceToUuidMigration()

// Rollback Migration 005 (instructor access codes)
rollbackAddInstructorAccessCodeMigration()

// Rollback Migration 006 (admin access codes)  
rollbackAddAdminAccessCodeMigration()

// Rollback Migration 008 (parent access codes)
rollbackAddParentAccessCodeMigration()
```

**Note**: Processed/Archived migrations (002, 003) are no longer active and cannot be rolled back through normal means.

### Backup Restoration
If rollback fails, restore from automatic backup:
```javascript
// Restore Migration 004 backup
restoreAttendanceToUuidMigrationFromBackup()

// Restore Migration 005 backup
restoreAddInstructorAccessCodeMigrationFromBackup()

// Restore Migration 006 backup
restoreAddAdminAccessCodeMigrationFromBackup()

// Restore Migration 008 backup
restoreAddParentAccessCodeMigrationFromBackup()
```

## Before/After State

### Current System State
```
registrations: UUID format (Migration 002 PROCESSED)
attendance:    [Original format] → will become UUID (Migration 004)
admins:        email@example.com + AccessCode (Migration 006)
instructors:   instructor.email@example.com + AccessCode (Migration 005)
parents:       parent_email_john_doe + AccessCode (Migration 008)
students:      12345
classes:       CLASS_ABC_2024
rooms:         ROOM_101
```

### After Active Migrations Complete
```
attendance:    550e8407-e29b-41d4-a716-446655440000 (Migration 004)
admins:        email@example.com + 6-digit AccessCode (Migration 006)
instructors:   instructor.email@example.com + 6-digit AccessCode (Migration 005)
parents:       parent_email_john_doe + 4-digit AccessCode from phone (Migration 008)
```

**Note**: Migration 002 (registrations) was successfully PROCESSED. Migration 003 (all tables to UUID) was ARCHIVED.
- `LegacyId` for all tables (Migration 003 only)

## Migration Benefits

### Consistency
- All tables use the same UUID format
- Simplified application logic
- Reduced complexity in relationships

### Performance
- Better distribution for large datasets
- Faster lookups and joins
- Improved scalability

### Maintainability
- Easier to understand and debug
- Consistent patterns across entire system
- Future-proof architecture

## Legacy Migrations

### Migration 001: Structural Improvements ✅
- **File**: `active/Migration001_StructuralImprovements.js`
- **Status**: Completed and in production
- Standardizes headers across all sheets
- Adds data validation rules
- Implements formatting improvements

### Archived Migrations
Located in `archive/` directory:
- **Migration002**: Add Class Names to Registration (archived)
- **Migration003**: Process Parents (completed)

### Development Migrations
Located in `dev/` directory:
- **DEV001**: Realistic Fake Data Generation (development only)
- **DEV002**: Fill and Reset Registrations (development only)

## 📁 Directory Structure

```
gas-migrations/
├── active/                 # Current active migrations ready for production
│   ├── Migration001_StructuralImprovements.js
│   ├── Migration002_CompositeToUuid.js (+ README + Verification)
│   ├── Migration003_AllTablesToUuid.js (+ README + Verification)
│   └── Migration004_AttendanceToUuid.js (+ README)
├── archive/                # Completed or deprecated migrations
├── dev/                    # Development-only migrations
├── recurring/              # Recurring maintenance migrations
├── Config.js              # Global configuration
├── TEMPLATE_Migration.js  # Template for new migrations
└── README.md              # This file
```

## 📦 Automatic Backup System

**All migrations include automatic backup functionality:**

### Backup Features
- **Automatic Creation**: Backups are created before any migration runs
- **Hidden Storage**: Backup sheets are hidden with timestamped names
- **Metadata Tracking**: Each backup includes metadata for easy identification
- **Restore Functions**: Restore data and delete backup automatically
- **Cleanup Functions**: Remove backup without restoring
- **List Function**: Show all available backups

## Troubleshooting

### Common Issues
1. **Backup Creation Failed**: Check spreadsheet permissions
2. **UUID Generation Failed**: Verify migration scripts are complete
3. **Foreign Key Update Failed**: Check relationship definitions
4. **Verification Failed**: Review detailed error messages

### Recovery Options
1. **Rollback**: Use built-in rollback functions
2. **Backup Restore**: Restore from automatic backups
3. **Manual Recovery**: Use spreadsheet version history

## Production Deployment

### Pre-Migration Checklist
- [ ] Preview all migrations successfully
- [ ] Backup entire spreadsheet manually
- [ ] Verify all migration scripts are uploaded
- [ ] Confirm application is ready for UUIDs
- [ ] Plan for minimal downtime window

### Migration Day
1. Execute Migration 002 (registrations)
2. Verify Migration 002 results
3. Execute Migration 003 (all other tables)
4. Verify Migration 003 results
5. Test application functionality
6. Monitor for any issues

### Post-Migration
- Remove Legacy columns after verification period
- Update any hardcoded ID references
- Update documentation with new UUID format

## Support

For issues with migrations:
1. Check the detailed README for each migration
2. Run verification scripts for diagnostic information
3. Review console output for specific error messages
4. Use rollback functions if critical issues occur

All migrations are designed to be safe, reversible, and well-documented for production use.

## 📱 Phone-Based Access Code System

### Migration 008: Parent Access Codes

**Parent authentication uses familiar phone number-based access codes:**

**How it works:**
- Extracts last 4 digits from parent phone numbers (e.g., `1234567890` → `7890`)
- Handles multiple phone formats: `(555) 123-4567`, `555-123-4567`, `555.123.4567`
- Generates unique fallback codes for invalid/missing phone numbers
- Provides comprehensive verification to track phone-based vs fallback codes

**Phone Number Processing:**
```javascript
// Phone formats supported:
'1234567890'        → '7890'  // Standard 10-digit
'(555) 123-4567'    → '4567'  // Formatted with parentheses
'555-123-4567'      → '4567'  // Formatted with dashes
'+1-555-123-4567'   → '4567'  // International format

// Invalid phones get unique fallback codes:
'123'       → '0123'  // Padded short numbers
'invalid'   → '8472'  // Randomly generated unique code
''          → '9234'  // Empty strings get unique codes
```

**Deployment Process:**
1. Set spreadsheet ID in `Config.js`
2. Deploy with `clasp push`
3. Run `previewAddParentAccessCodeMigration()` to preview changes
4. Run `runAddParentAccessCodeMigration()` to execute
5. Run `verifyAddParentAccessCodeMigration()` to check results
6. Use `exportParentAccessCodes()` to distribute codes to parents

**Testing:**
- Comprehensive test suite: `test_parent_access_code_migration.js`
- Quick test: `quickTestParentAccessCodes()`
- Sample data test: `testParentMigrationWithSampleData()`
- Rollback test: `testParentAccessCodeRollback()`

The phone-based system provides familiar authentication for parents while maintaining security through proper fallback handling.
