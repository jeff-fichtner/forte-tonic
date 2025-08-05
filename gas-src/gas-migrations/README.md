# Gas Migrations Summary

This document provides an overview of all Google Apps Script migrations in this project.

## Migration System Overview

The migration system provides:
- **Structured Migrations**: Each migration is a complete, self-contained class
- **Automatic Backups**: All migrations create backups before execution
- **Rollback Capability**: Full rollback support with original data restoration
- **Comprehensive Verification**: Detailed verification scripts for each migration
- **Preview Mode**: See what changes will be made before executing

## 🔐 SIMPLE CONFIGURATION

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
## Available Migrations

### Migration 002: Composite to UUID (Registrations)
**File**: `active/Migration002_CompositeToUuid.js`  
**Documentation**: `active/Migration002_CompositeToUuid_README.md`  
**Verification**: `active/Migration002_CompositeToUuid_Verification.js`

**Purpose**: Convert the registrations table from composite primary keys to UUID primary keys.

**What it does**:
- Converts complex composite keys like `1234_5678_SPANISH_A_2024_FALL` to simple UUIDs
- Updates all related audit entries
- Maintains all foreign key relationships
- ⚠️ Note: Original composite keys are NOT preserved (backup restoration for rollback)

**Status**: ✅ Ready for execution

### Migration 003: All Tables to UUID
**File**: `active/Migration003_AllTablesToUuid.js`  
**Documentation**: `active/Migration003_AllTablesToUuid_README.md`  
**Verification**: `active/Migration003_AllTablesToUuid_Verification.js`

**Purpose**: Convert all remaining tables to use UUID primary keys for system-wide consistency.

**What it does**:
- Converts all main tables: admins, instructors, parents, students, classes, rooms
- Preserves original IDs in `LegacyId` columns
- Updates all foreign key references automatically
- Handles dependency order correctly

**Status**: ✅ Ready for execution

### Migration 004: Attendance Tables to UUID
**File**: `active/Migration004_AttendanceToUuid.js`  
**Documentation**: `active/Migration004_AttendanceToUuid_README.md`

**Purpose**: Convert attendance and attendance_audit tables to use UUID primary keys.

**What it does**:
- Converts attendance table IDs to UUIDs (if needed)
- Ensures attendance_audit table uses UUIDs
- Updates foreign key references to registrations
- ⚠️ Note: Original IDs are NOT preserved (backup restoration for rollback)

**Status**: ✅ Ready for execution

## Migration Execution Order

For a complete system upgrade to UUIDs:

1. **Migration 002** - Registrations table (most complex)
2. **Migration 004** - Attendance tables (dependent on registrations)
3. **Migration 003** - All other tables (dependency-aware, optional)

## How to Run Migrations

### Step 1: Preview Migration
```javascript
// Preview what Migration 002 will do
previewCompositeToUuidMigration()

// Preview what Migration 004 will do
previewAttendanceToUuidMigration()

// Preview what Migration 003 will do (optional)
previewAllTablesToUuidMigration()
```

### Step 2: Execute Migration
```javascript
// Execute Migration 002
runCompositeToUuidMigration()

// Execute Migration 004
runAttendanceToUuidMigration()

// Execute Migration 003 (optional)
runAllTablesToUuidMigration()
```

### Step 3: Verify Migration
```javascript
// Verify Migration 002
verifyCompositeToUuidMigration()

// Verify Migration 004
verifyAttendanceToUuidMigration()

// Verify Migration 003 (optional)
verifyAllTablesUuidMigration()
```

## Safety Features

### Automatic Backups
Every migration creates automatic backups before execution:
- Timestamped backup sheets
- Complete data preservation
- Easy restoration if needed

### Rollback Capability
Each migration supports full rollback:
```javascript
// Rollback Migration 002
rollbackCompositeToUuidMigration()

// Rollback Migration 003
rollbackAllTablesToUuidMigration()
```

### Backup Restoration
If rollback fails, restore from automatic backup:
```javascript
// Restore Migration 002 backup
restoreCompositeToUuidMigrationFromBackup()

// Restore Migration 003 backup
restoreAllTablesToUuidMigrationFromBackup()
```

## Before/After State

### Before Migrations
```
registrations: StudentId_InstructorId_ClassCode_RoomId_Year_Term
admins:        email@example.com
instructors:   instructor.email@example.com
parents:       parent_email_john_doe
students:      12345
classes:       CLASS_ABC_2024
rooms:         ROOM_101
```

### After Migrations
```
registrations: 550e8400-e29b-41d4-a716-446655440000
attendance:    550e8407-e29b-41d4-a716-446655440000
admins:        550e8401-e29b-41d4-a716-446655440000 (Migration 003 only)
instructors:   550e8402-e29b-41d4-a716-446655440000 (Migration 003 only)
parents:       550e8403-e29b-41d4-a716-446655440000 (Migration 003 only)
students:      550e8404-e29b-41d4-a716-446655440000 (Migration 003 only)
classes:       550e8405-e29b-41d4-a716-446655440000 (Migration 003 only)
rooms:         550e8406-e29b-41d4-a716-446655440000 (Migration 003 only)
```

**Note**: Original IDs are NOT preserved in Migrations 002 and 004. Migration 003 preserves original IDs in `LegacyId` columns:
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
