# Tonic Google Apps Script Project

This directory contains the complete Google Apps Script (GAS) project for Tonic database migrations and utilities.

## 🚀 Quick Start

### Prerequisites
- Node.js and npm installed
- clasp CLI installed globally: `npm install -g @google/clasp`
- Authentication: `clasp login` (if not already logged in)
- Environment variable `GOOGLE_APPS_SCRIPT_ID` set in parent directory's `.env` file

### Initial Setup
1. Install clasp CLI globally:
```bash
npm install -g @google/clasp
```

2. Authenticate with Google:
```bash
clasp login
```

3. Set environment variable in `../.env`:
```bash
GOOGLE_APPS_SCRIPT_ID=your-google-apps-script-project-id
```

4. Deploy the project:
```bash
npm run deploy        # Initial deployment and subsequent updates
```

### Development Workflow
1. **Make changes** to migration files locally
2. **Deploy updates** with `clasp push` or `npm run deploy`
3. **Test migrations** in the Google Apps Script editor
4. **Run functions** directly in the GAS environment

### Running Migrations
Once deployed, all migrations are available in the Google Apps Script editor:
- Use `npm run open` to open the project in your browser
- Select and run migration functions directly in the GAS editor
- All functions include automatic backup/restore capabilities

## 📁 Project Structure

```
gas-src/
├── .clasp.json                 # Clasp configuration
├── appsscript.json            # GAS project manifest
├── Code.js                    # Main entry point with menus & utilities
├── README.md                  # This file
└── gas-migrations/            # Migration scripts
    ├── Migration001_StructuralImprovements.js
    ├── Migration002_AddClassNamesToRegistration.js
    ├── Migration003_ProcessParents.js
    ├── TEMPLATE_Migration.js
    ├── DEPLOYMENT.md
    ├── INDEX.md
    └── README.md
```

## 🔧 Main Functions

### From Google Sheets Menu
When you open a Google Sheets document, look for the **"Tonic Migrations"** menu that provides easy access to all functions.

### Direct Function Execution
In the Google Apps Script editor, you can run these functions directly:

#### Information & Health
- `getProjectInfo()` - Lists all available functions
- `validateConfiguration()` - Validates spreadsheet setup
- `listAllBackups()` - Shows all available backups

#### Migration Previews (ALWAYS RUN FIRST)
- `previewStructuralImprovements()`
- `previewFillAndResetRegistrationsMigration()`

#### Migration Execution (Creates Automatic Backups)
- `runStructuralImprovements()`
- `runFillAndResetRegistrationsMigration({createAudit: true})`
- `runFillAndResetRegistrationsMigration({reset: true, wipeAudit: true})`

#### Migration Rollbacks (Uses Automatic Backups)
- `rollbackStructuralImprovements()`
- `rollbackFillAndResetRegistrationsMigration()`

#### Backup Management
- `restoreStructuralImprovementsFromBackup()` - Restore and delete backup
- `deleteStructuralImprovementsBackup()` - Delete backup without restoring
- `restoreFillAndResetRegistrationsFromBackup()`
- `deleteFillAndResetRegistrationsBackup()`

#### Development Utilities
- `validateDevelopmentEnvironment()` - Check if safe for dev migrations

## ⚠️ Safety Guidelines

1. **Always Preview First**: Run preview functions before executing migrations
2. **Automatic Backups**: All migrations create backups automatically
3. **Use clasp for Deployment**: `npm run deploy` or `clasp push`
4. **Test on Copy**: Run migrations on a copy first to verify behavior
5. **Check Configuration**: Use `validateConfiguration()` to verify setup

## 🔄 Development Workflow

### Making Changes
1. Edit files in this `gas-src/` directory
2. Test locally if possible
3. Deploy with `clasp push`
4. Test in Google Apps Script environment

### Adding New Migrations
1. Copy `gas-migrations/TEMPLATE_Migration.js`
2. Rename to `Migration00X_DescriptiveName.js`
3. Implement your migration logic
4. Add to `.clasp.json` filePushOrder
5. Deploy with `clasp push`

## 📊 Project Configuration

### `.clasp.json`
- **scriptId**: Points to the Google Apps Script project
- **filePushOrder**: Ensures files are uploaded in correct dependency order

### `appsscript.json`
- **timeZone**: Set to America/Los_Angeles
- **dependencies**: Includes advanced Google services if needed
- **runtimeVersion**: Uses V8 for modern JavaScript features

## 🔗 Related Documentation

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Clasp CLI Documentation](https://github.com/google/clasp)
- Migration-specific docs in `gas-migrations/` directory

## 🏗️ Architecture Notes

This is a **standalone Google Apps Script project** (not a webapp). It's designed to:
- Run database migrations on Google Sheets
- Provide utility functions for data management
- Offer a user-friendly interface through custom menus
- Maintain data integrity with preview/execute/rollback pattern

All clasp and Google Apps Script related files are contained within this directory, keeping the main Node.js application clean and separate.

## Overview

The migration system provides:

- **Safe migration execution** with validation and rollback capabilities
- **Preview functionality** to see changes before applying them
- **Comprehensive error handling** and detailed logging
- **Template-based development** for creating new migrations
- **Direct Google Sheets integration** without external dependencies

## Directory Structure

```
src/core/scripts/dbMigrations/
├── README.md                 # This overview document
└── gas-migrations/           # Google Apps Script migrations
    ├── README.md             # Detailed usage guide
    ├── DEPLOYMENT.md         # Step-by-step setup instructions
    ├── INDEX.md              # Quick reference for all migrations
    ├── TEMPLATE_Migration.gs # Template for creating new migrations
    ├── Migration001_StructuralImprovements.gs
    ├── Migration002_AddClassNamesToRegistration.gs
    └── Migration003_ProcessParents.gs
```

## Quick Start

### 1. Open Google Apps Script
1. Open your Google Sheets document
2. Go to **Extensions > Apps Script**
3. This opens the Google Apps Script editor

### 2. Add Migration Files
1. Create a new `.gs` file for each migration
2. Copy the entire content from the migration file
3. Save the project

### 3. Run Migrations
Always follow this pattern:

```javascript
// 1. Preview changes first (read-only)
previewStructuralImprovements();

// 2. Execute the migration
runStructuralImprovements();

// 3. Rollback if needed
rollbackStructuralImprovements();
```

## Available Migrations

### Migration 001: Structural Improvements
**File:** `Migration001_StructuralImprovements.gs`

**Purpose:** Standardizes column headers, adds data validation, implements frozen headers, and adds conditional formatting.

**Functions:**
- `previewStructuralImprovements()` - Preview changes
- `runStructuralImprovements()` - Execute migration  
- `rollbackStructuralImprovements()` - Undo changes

**What it does:**
- Standardizes headers: "Last Name" → "LastName", "First Name" → "FirstName"
- Marks deprecated columns (StudentId → StudentId_DEPRECATED)
- Adds email validation for parents and instructors
- Adds grade validation dropdown (K, 1-12)
- Freezes header rows for better navigation
- Highlights duplicate IDs in red

### Migration 002: Add Class Names to Registration
**File:** `Migration002_AddClassNamesToRegistration.gs`

**Purpose:** Populates class names in registration records based on class IDs.

**Functions:**
- `previewAddClassNamesToRegistration()` - Preview changes
- `runAddClassNamesToRegistration()` - Execute migration
- `rollbackAddClassNamesToRegistration()` - Undo changes

**What it does:**
- Maps class IDs to class titles
- Adds ClassTitle column to registrations if missing
- Populates class names for all registration records
- Validates data integrity before and after

### Migration 003: Process Parents
**File:** `Migration003_ProcessParents.gs`

**Purpose:** Extracts parent information from student records and creates separate parent records.

**Functions:**
- `previewProcessParents()` - Preview changes
- `runProcessParents()` - Execute migration
- `rollbackProcessParents()` - Undo changes

**What it does:**
- Extracts parent data from student records
- Creates unique parent records in parents sheet
- Adds Parent1Id and Parent2Id columns to students
- Links students to their respective parents
- Handles various name formats and data inconsistencies

## Creating New Migrations

### Using the Template

1. **Copy the template:** `gas-migrations/TEMPLATE_Migration.gs`
2. **Rename the file:** `Migration00X_YourMigrationName.gs`
3. **Update function names:**
   ```javascript
   // Replace "Template" with your migration name
   function runYourMigrationName() { ... }
   function previewYourMigrationName() { ... }
   function rollbackYourMigrationName() { ... }
   ```
4. **Implement your logic** in the migration class
5. **Test thoroughly** with preview function first

### Migration Patterns

**Always include these three functions:**
- **Preview function** - Shows what will change (read-only)
- **Execute function** - Applies the changes
- **Rollback function** - Reverts the changes

**Follow these best practices:**
- Validate prerequisites before executing
- Use comprehensive error handling
- Provide detailed console logging
- Test with sample data first
- Document what the migration does
  runner.registerMigration(Migration002AddSchoolYear); // Add here
  return runner;
- **Test with sample data first** to ensure the migration works correctly

### Example Migration Structure

```javascript
class YourMigrationMigration {
  constructor() {
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    this.description = 'Brief description of what this migration does';
  }

  preview() {
    // Analyze current state and show what would change
    console.log('Preview implementation...');
  }

  execute() {
    // Apply the actual changes
    console.log('Execution implementation...');
  }

  rollback() {
    // Undo the changes
    console.log('Rollback implementation...');
  }
}
```

## Safety Features

All migrations include comprehensive safety features:

- **Prerequisites validation** - Ensures migration should run
- **Data integrity checks** - Validates data consistency before/after
- **Preview functionality** - Shows changes before applying them
- **Error handling** - Safe failure with detailed logging
- **Rollback support** - Ability to undo changes
- **Detailed logging** - Comprehensive progress tracking

## Best Practices

### Before Running Migrations

1. **Make a backup** of your Google Sheets document
2. **Test on a copy** of your sheet first if possible  
3. **Run the preview function** to understand what will change
4. **Read the migration description** thoroughly
5. **Ensure you have editing permissions** on the spreadsheet

### During Migration Execution

1. **Monitor the console** for progress updates and errors
2. **Don't interrupt** the migration while it's running
3. **Be patient** - large datasets may take time to process
4. **Watch for authorization prompts** if running for the first time

### After Migration

1. **Verify the changes** are working as expected
2. **Test your application** to ensure compatibility
3. **Document the migration** in your change log
4. **Keep the migration functions** for potential rollback needs

## Troubleshooting

### Common Issues

**"SpreadsheetApp is not defined"**
- You're not running from Google Apps Script
- Make sure you're in Extensions > Apps Script

**"Sheet not found" errors**
- Check that sheet names match exactly (case-sensitive)
- Verify all required sheets exist in your document

**Permission errors**
- Ensure the Apps Script has access to your Google Sheets
- Try refreshing authorization if needed

**Data validation conflicts**
- Existing data might not match new validation rules
- Run preview first to identify potential issues
- Clean up data manually before running migration

### Getting Help

1. **Check the console logs** for detailed error messages
2. **Run the preview function** to diagnose issues before executing
3. **Use the rollback function** if you need to undo changes
4. **Review the migration code** to understand what it's trying to do
5. **Test on a copy** of your data if you're unsure

## Performance Considerations

- **Large datasets** may take time to process
- **Batch operations** are used where possible for efficiency
- **Google Apps Script limits** apply (6-minute execution limit)
- **Memory limitations** may affect very large spreadsheets

For very large datasets, consider:
- Breaking migrations into smaller chunks
- Running during off-peak hours
- Using the preview function to estimate execution time

## Integration Notes

These migrations are designed to work with the Tonic project's Google Sheets database structure. They complement the core application by:

- **Maintaining data integrity** during structural changes
- **Providing upgrade paths** for evolving requirements
- **Ensuring compatibility** with the main application
- **Documenting changes** for audit and rollback purposes

📖 **For detailed setup and usage instructions, see [gas-migrations/README.md](gas-migrations/README.md)**

📋 **For step-by-step deployment guide, see [gas-migrations/DEPLOYMENT.md](gas-migrations/DEPLOYMENT.md)**
