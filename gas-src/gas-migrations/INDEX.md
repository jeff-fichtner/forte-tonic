# Google Apps Script Migrations Index

Quick reference for all available Google Apps Script migrations.

## 🚀 Quick Start

1. **Open Google Sheets** → **Extensions** → **Apps Script**
2. **Copy migration code** from the `.gs` files below
3. **Always run preview first**: `preview[MigrationName]()`
4. **Execute migration**: `run[MigrationName]()`
5. **Rollback if needed**: `rollback[MigrationName]()`

## 📋 Available Migrations

### Migration 001: Structural Improvements
**File:** `Migration001_StructuralImprovements.gs`
**Functions:**
- `previewStructuralImprovements()`
- `runStructuralImprovements()`
- `rollbackStructuralImprovements()`

**What it does:**
- Standardizes header naming (removes spaces)
- Marks deprecated columns 
- Adds email validation
- Adds grade validation dropdowns
- Freezes header rows
- Highlights duplicate IDs

---

### Migration 002: Add Class Names to Registration
**File:** `Migration002_AddClassNamesToRegistration.gs`
**Functions:**
- `previewAddClassNamesToRegistration()`
- `runAddClassNamesToRegistration()`
- `rollbackAddClassNamesToRegistration()`

**What it does:**
- Populates class names in registration records
- Creates ClassTitle column if missing
- Maps class IDs to class names
- Validates data relationships

---

### Migration 003: Process Parents
**File:** `Migration003_ProcessParents.gs`
**Functions:**
- `previewProcessParents()`
- `runProcessParents()`
- `rollbackProcessParents()`

**What it does:**
- Extracts parent information from student records
- Creates separate parent records in parents sheet
- Adds Parent1Id and Parent2Id columns to students
- Links students to their respective parents
- Handles various name formats and data inconsistencies

---

### Migration Template
**File:** `TEMPLATE_Migration.gs`
**Purpose:** Template for creating new migrations

**To use:**
1. Copy the template file
2. Rename to `Migration[XXX]_[Description].gs`
3. Replace all placeholder text
4. Test thoroughly with preview function

## 🛠️ Utilities

### Validation Functions

Each migration includes validation helpers:

```javascript
// Check if migration is needed
previewStructuralImprovements();

// Validate sheet structure
validateSpreadsheetStructure();

// Check specific requirements
validateSheetsForClassNameMigration();
```

### Safety Features

- **Preview mode** - See changes before applying
- **Error handling** - Comprehensive error catching
- **Rollback support** - Undo changes if needed
- **Progress logging** - Detailed console output

## 📖 Documentation

- **[README.md](README.md)** - Complete overview and usage guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Step-by-step setup instructions
- **[TEMPLATE_Migration.gs](TEMPLATE_Migration.gs)** - Template with detailed comments

## ⚠️ Important Notes

### Before Running Migrations

1. **Make a backup** of your Google Sheets document
2. **Run preview functions** to understand what will change
3. **Test on a copy** if possible
4. **Read migration descriptions** carefully

### Execution Order

Migrations should generally be run in numerical order:
1. Migration 001 (Structural Improvements)
2. Migration 002 (Add Class Names)
3. Migration 003 (Process Parents)
4. Future migrations...

### Rollback Limitations

- Header changes can be rolled back
- Data validation rules may need manual cleanup
- Conditional formatting may need manual removal
- New columns can be cleared but not automatically deleted

## 🔧 Development Notes

### Converting from Node.js

These migrations were converted from Node.js versions with these changes:
- `googleapis` API → `SpreadsheetApp` methods
- Authentication handled automatically
- Direct sheet manipulation instead of API calls
- Enhanced logging and user feedback

### Adding New Migrations

1. **Follow naming convention**: `Migration[XXX]_[Description].gs`
2. **Include all three functions**: preview, run, rollback
3. **Use the template** as a starting point
4. **Test thoroughly** before deployment
5. **Update this index** with the new migration

## 📞 Support

- Check console logs for detailed error messages
- Use preview functions to diagnose issues
- Refer to the main project documentation
- Contact the development team for assistance
