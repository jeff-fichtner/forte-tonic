# Google Apps Script Migrations

This directory contains database migrations converted to Google Apps Script format. These scripts are designed to be copied directly into a Google Apps Script project that is bound to your Google Sheets document.

## How to Use These Migrations

### Setup Instructions

1. **Open your Google Sheets document**
2. **Go to Extensions > Apps Script**
3. **Create a new `.gs` file** for each migration
4. **Copy the entire content** of the migration file into the Apps Script editor
5. **Save the project**

### Running Migrations

Each migration provides three main functions:

- **`preview[MigrationName]()`** - Shows what changes will be made (read-only)
- **`run[MigrationName]()`** - Executes the migration
- **`rollback[MigrationName]()`** - Undoes the migration changes

### Example Usage

For Migration 001 - Structural Improvements:

```javascript
// 1. First, preview the changes
previewStructuralImprovements();

// 2. If the preview looks good, run the migration
runStructuralImprovements();

// 3. If needed, rollback the changes
rollbackStructuralImprovements();
```

## Available Migrations

### Migration 001: Structural Improvements
**File:** `Migration001_StructuralImprovements.gs`

**Purpose:** Standardizes column headers, adds data validation, implements frozen headers, and adds conditional formatting.

**Changes:**
- Standardizes header naming (removes spaces)
- Marks deprecated columns
- Adds email validation for instructor and parent email fields
- Adds grade validation dropdown (K, 1-12)
- Freezes header rows for better navigation
- Highlights duplicate IDs in red

**Functions:**
- `previewStructuralImprovements()` - Preview changes
- `runStructuralImprovements()` - Execute migration
- `rollbackStructuralImprovements()` - Undo changes

### Migration 002: Add Class Names to Registration
**File:** `Migration002_AddClassNamesToRegistration.gs`

**Purpose:** Populates class names in registration records based on class IDs.

**Changes:**
- Maps class IDs to class titles from the classes sheet
- Adds ClassTitle column to registrations if missing
- Populates class names for all registration records
- Validates data integrity and handles missing references

**Functions:**
- `previewAddClassNamesToRegistration()` - Preview changes
- `runAddClassNamesToRegistration()` - Execute migration
- `rollbackAddClassNamesToRegistration()` - Undo changes

### Migration 003: Process Parents
**File:** `Migration003_ProcessParents.gs`

**Purpose:** Extracts parent information from student records and creates separate parent records.

**Changes:**
- Extracts parent data from student records (handles various name formats)
- Creates unique parent records in the parents sheet
- Adds Parent1Id and Parent2Id columns to students sheet
- Links students to their respective parents
- Handles data inconsistencies and missing information gracefully

**Functions:**
- `previewProcessParents()` - Preview changes
- `runProcessParents()` - Execute migration
- `rollbackProcessParents()` - Undo changes

## Safety Features

### Preview Mode
Always run the preview function first to see what changes will be made:
- Shows which sheets will be affected
- Lists specific changes that will be applied
- Identifies potential issues

### Rollback Support
Each migration includes a rollback function to undo changes:
- Restores original headers
- Notes which advanced features need manual cleanup
- Provides step-by-step rollback instructions

### Error Handling
- Comprehensive error catching and reporting
- Detailed console logging
- Graceful handling of missing sheets or data

## Best Practices

### Before Running Migrations

1. **Make a backup** of your Google Sheets document
2. **Run the preview function** to understand what will change
3. **Test on a copy** of your sheet first if possible
4. **Read the migration description** thoroughly

### During Migration

1. **Monitor the console** for progress updates and any errors
2. **Don't interrupt** the migration while it's running
3. **Check the results** after completion

### After Migration

1. **Verify the changes** are working as expected
2. **Test your application** to ensure compatibility
3. **Document the migration** in your change log

## Troubleshooting

### Common Issues

**"Sheet not found" errors:**
- Ensure your sheet names match exactly (case-sensitive)
- Check that all required sheets exist in your document

**Permission errors:**
- Make sure the Apps Script project has access to your Google Sheets
- Try refreshing the authorization if needed

**Validation not working:**
- Check that the data validation rules were applied correctly
- Verify the ranges are correct for your data

### Getting Help

1. **Check the console logs** for detailed error messages
2. **Run the preview function** to diagnose issues
3. **Use the rollback function** if you need to undo changes
4. **Review the original migration** in the main codebase for reference

## Development Notes

### Converting Node.js Migrations to GAS

These migrations were automatically converted from Node.js-based migrations that used the Google Sheets API. Key changes made:

1. **API Differences:**
   - Node.js `googleapis` → Google Apps Script `SpreadsheetApp`
   - Authentication handled automatically by GAS
   - Direct sheet manipulation instead of API calls

2. **Functionality Preserved:**
   - All validation logic maintained
   - Same error handling patterns
   - Identical migration outcomes

3. **Enhanced Features:**
   - Better integration with Google Sheets UI
   - Simplified execution model
   - Enhanced logging and feedback

### Adding New Migrations

When creating new GAS migrations:

1. **Follow the naming pattern:** `Migration[XXX]_[Description].gs`
2. **Include all three functions:** preview, run, rollback
3. **Add comprehensive logging** and error handling
4. **Test thoroughly** before deployment
5. **Update this README** with the new migration details

## Security Considerations

- **Backup your data** before running any migration
- **Test in a development environment** first
- **Review all code** before copying into Apps Script
- **Be cautious with data validation rules** that might block existing data
- **Understand rollback limitations** for advanced formatting features
