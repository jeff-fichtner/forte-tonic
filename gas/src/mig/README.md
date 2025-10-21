# GAS Migrations - Simplified Pattern

## Overview

**New simplified migration pattern for reenrollment features (REEN migrations).**

This is a simpler approach than the existing complex migration system. Use this pattern for new reenrollment-related migrations.

## Pattern Philosophy

**Two functions. That's it.**

1. **`run()`** - Creates working copies with changes (MIGRATION_* sheets)
   - Safe to run multiple times
   - Deletes previous working copy each time
   - Lets you inspect changes before applying

2. **`apply()`** - Makes changes permanent (DESTRUCTIVE)
   - Deletes original tables
   - Renames working copies to original names
   - Cannot be undone
   - Only run after verifying working copies look correct

**No rollback. No backups. No complex recovery systems.**

Manual backups of your spreadsheet (File > Make a copy) are your safety net.

## Quick Start

### 1. Configure Spreadsheet ID

Edit `Config.js`:
```javascript
const SPREADSHEET_ID = "your-spreadsheet-id-here";
```

### 2. Deploy

```bash
cd gas/
clasp push
```

### 3. Run Migration

In Google Apps Script editor:
```javascript
// Step 1: Create working copies
runYourMigrationNameMigration()

// Step 2: Review MIGRATION_* sheets in your spreadsheet
// Verify the changes look correct

// Step 3: Apply (DESTRUCTIVE)
applyYourMigrationNameMigration()
```

## Example: REEN001 (Add Intent Columns)

```javascript
// Step 1: Run - creates MIGRATION_registrations and MIGRATION_registrations_audit
runAddIntentColumnsMigration()

// Inspect the MIGRATION_* sheets
// Verify columns were added correctly

// Step 2: Apply - replaces original tables
applyAddIntentColumnsMigration()
```

**What happens:**

`run()`:
- Copies `registrations` → `MIGRATION_registrations`
- Copies `registrations_audit` → `MIGRATION_registrations_audit`
- Adds 3 columns to MIGRATION_registrations
- Adds 5 columns to MIGRATION_registrations_audit

`apply()`:
- Deletes `registrations`
- Renames `MIGRATION_registrations` → `registrations`
- Deletes `registrations_audit`
- Renames `MIGRATION_registrations_audit` → `registrations_audit`

## Creating New Migrations

### Use the Template

1. Copy `TEMPLATE_Migration.js`
2. Rename to `Migration_REENXXX_Description.js`
3. Update function names and class name
4. Choose your pattern:
   - **Modify existing tables:** Use `sheetsToMigrate` array
   - **Create new table:** Use `workingSheetName` / `finalSheetName`

### Pattern A: Modify Existing Tables

For adding columns, changing data, etc.:

```javascript
class YourMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.sheetsToMigrate = [
      { original: 'table1', working: 'MIGRATION_table1' },
      { original: 'table2', working: 'MIGRATION_table2' }
    ];
  }

  #applyChangesToSheet(sheet, sheetName) {
    // Add your modification logic here
    if (sheetName === 'table1') {
      // Modify table1
    }
  }
}
```

### Pattern B: Create New Table

For creating entirely new tables:

```javascript
class YourMigration {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.workingSheetName = 'MIGRATION_newtable';
    this.finalSheetName = 'newtable';
  }

  #createNewTable(sheet) {
    // Create headers
    const headers = ['col1', 'col2', 'col3'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Seed data
    const rows = [['val1', 'val2', 'val3']];
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }
}
```

## Available Migrations (Standard Pattern)

### REEN001: Add Intent Columns
- **Status:** Ready
- **File:** `active/Migration_REEN001_AddIntentColumns.js`
- **Purpose:** Add reenrollment intent tracking to registrations
- **Functions:**
  - `runAddIntentColumnsMigration()` - Create working copies with new columns
  - `applyAddIntentColumnsMigration()` - Apply changes (DESTRUCTIVE)

### REEN002: Create Phases Table
- **Status:** Ready
- **File:** `active/Migration_REEN002_CreatePhasesTable.js`
- **Purpose:** Create phases table for reenrollment phase management
- **Functions:**
  - `runCreatePhasesTableMigration()` - Create MIGRATION_phases with data
  - `applyCreatePhasesTableMigration()` - Apply changes (DESTRUCTIVE)

## Safety Recommendations

Since this pattern has no automatic rollbacks:

1. **Always make a manual backup first**
   - File > Make a copy
   - Name it with date: "Tonic_Backup_2025-10-20"

2. **Always run `run()` first and inspect**
   - Check MIGRATION_* sheets
   - Verify changes look correct
   - Only then run `apply()`

3. **Never run `apply()` without checking first**
   - It's destructive
   - Cannot be undone
   - Your manual backup is your only recovery option

## Comparison with Legacy Pattern

### Legacy Pattern (Existing migrations like 004, 012)
- Complex backup system
- Automatic backups
- Rollback functions
- Preview/Execute/Rollback/Verify functions
- Copy-modify-replace pattern
- **Use for:** Large, complex migrations with lots of data transformation

### Standard Pattern (REEN migrations)
- Two functions: run() and apply()
- No automatic backups
- No rollback
- Manual backup recommended
- Simple copy-modify-rename pattern
- **Use for:** Straightforward migrations like adding columns, creating tables

## Files

**Standard Pattern Files:**
- `Config.js` - Simple configuration (just spreadsheet ID)
- `TEMPLATE_Migration.js` - Template for new v2 migrations
- `README.md` - This file
- `active/Migration_REEN001_AddIntentColumns.js` - Example v2 migration
- `active/Migration_REEN002_CreatePhasesTable.js` - Example v2 migration

**Legacy Pattern Files:**
- `Config.js` - Complex configuration with backup systems
- `TEMPLATE_Migration.js` - Template for legacy migrations
- `README.md` - Legacy documentation
- `active/Migration004_AttendanceToUuid.js` - Example legacy migration
- `active/Migration012_IncomingStudentsReplacement.js` - Example legacy migration

## When to Use Which Pattern?

**Use Standard Pattern (this one) when:**
- Adding/removing columns
- Creating new tables
- Simple data transformations
- Reenrollment-related features

**Use Legacy Pattern when:**
- Complex multi-table transformations
- Large dataset migrations
- Need comprehensive backup/rollback systems
- Critical production data migrations

## Questions?

Check the template file for detailed inline examples and comments.

For legacy migrations, see `README.md` and existing migrations in `active/` directory.
