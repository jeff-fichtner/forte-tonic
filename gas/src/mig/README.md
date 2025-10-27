# GAS Migrations

## Overview

Simple two-step migration pattern for all Google Sheets schema changes.

## Current Pattern (v2) - RECOMMENDED

**Two functions. That's it.**

1. **`run()`** - Creates working copies with changes (MIGRATION\_\* sheets)
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

## Legacy Pattern (v1) - DEPRECATED

**Do not use this pattern for new migrations.**

Old migrations (see `archive/` directory) used:
- `execute()` - Applied changes directly (no preview)
- `preview()` - Attempted to show what would change
- `rollback()` - Attempted to undo changes
- Complex backup/restore functions

**Why it's deprecated:**
- Changes happened immediately without visual inspection
- Rollback was unreliable and gave false confidence
- Backup systems added complexity without reliability
- No clear way to verify changes before applying

**All new migrations must use the v2 pattern (run/apply).** Legacy migrations in `archive/` are kept for reference only.

## Quick Start

### 1. Configure Spreadsheet ID

Edit `Config.js`:

```javascript
const SPREADSHEET_ID = 'your-spreadsheet-id-here';
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
runYourMigrationNameMigration();

// Step 2: Review MIGRATION_* sheets in your spreadsheet
// Verify the changes look correct

// Step 3: Apply (DESTRUCTIVE)
applyYourMigrationNameMigration();
```

## Example Workflow

```javascript
// Step 1: Create working copies with changes
runAddIntentColumnsMigration();

// Step 2: Inspect MIGRATION_* sheets in your spreadsheet
// Verify the changes look correct

// Step 3: Make it permanent (DESTRUCTIVE)
applyAddIntentColumnsMigration();
```

## Creating New Migrations

1. Copy `TEMPLATE_Migration.js` to `Migration_XXX_Description.js`
2. Update function names and class name
3. Implement your migration logic:
   - **Modify existing tables:** Use `sheetsToMigrate` array
   - **Create new table:** Use `workingSheetName` / `finalSheetName`

See `TEMPLATE_Migration.js` for detailed implementation patterns and the `active/` directory for examples.

## Safety

**There are no automatic backups or rollbacks.**

Before running any migration:

1. **Backup your spreadsheet:** File > Make a copy (name it with date: "Tonic_Backup_2025-10-20")
2. **Run `run()` first** to create MIGRATION\_\* preview sheets
3. **Verify the changes** look correct
4. **Only then run `apply()`** - this is destructive and cannot be undone

## Files

- `Config.js` - Spreadsheet ID configuration
- `TEMPLATE_Migration.js` - Template for new migrations
- `README.md` - This file
- `active/` - Current migrations ready to run
- `archive/` - Completed migrations for reference
- `dev/` - Development/testing migrations
