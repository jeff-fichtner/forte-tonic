# Safe Copy-Modify-Replace Pattern for GAS Migrations

## Overview

All Google Apps Script migrations now use a **safe copy-modify-replace pattern** to ensure data integrity and provide rollback capabilities. This pattern creates a working copy of each sheet, applies changes to the copy, then safely replaces the original.

## How It Works

### 1. Copy Phase
- Creates a temporary working copy of the target sheet
- Working copy name: `TEMP_WORKING_{sheetName}_{timestamp}`
- Preserves all original data, formatting, and metadata

### 2. Modify Phase
- Applies all migration changes to the working copy
- Original sheet remains completely untouched
- All business logic operates on the safe copy

### 3. Replace Phase
- Renames original sheet to backup: `TEMP_ORIGINAL_{sheetName}_{timestamp}`
- Renames working copy to take over as the main sheet
- Preserves sheet position and visibility settings
- Deletes the renamed original sheet

### 4. Cleanup Phase
- Automatic cleanup of temporary sheets on success
- Error handling with cleanup on failure
- No temporary sheets left behind

## Benefits

- **Zero Data Loss Risk**: Original data is never modified until the final atomic replace
- **Instant Rollback**: Can restore from automatic backups if needed
- **Atomic Operations**: Either all changes succeed or none are applied
- **Preserves Relationships**: Sheet references and formulas remain intact
- **Maintains Performance**: No intermediate states that could cause issues

## Implementation

### Using safeSheetModification()

```javascript
// Single sheet modification
const result = safeSheetModification('sheetName', (workingSheet, originalSheet) => {
  // Your modification logic here
  // workingSheet is the copy you can safely modify
  // originalSheet is read-only reference for comparisons
  
  return {
    recordsProcessed: 100,
    modificationType: 'your_modification_type'
  };
});
```

### Using batchSafeSheetModification()

```javascript
// Multiple sheets modification
const sheetModifications = [
  {
    sheetName: 'registrations',
    modifyFunction: (workingSheet, originalSheet) => {
      return this.migrateRegistrations(workingSheet, originalSheet);
    }
  },
  {
    sheetName: 'users',
    modifyFunction: (workingSheet, originalSheet) => {
      return this.migrateUsers(workingSheet, originalSheet);
    }
  }
];

const results = batchSafeSheetModification(sheetModifications);
```

## Migration Template Structure

### Updated Execute Method

```javascript
execute() {
  console.log('🚀 EXECUTING MIGRATION: Your Migration Name');
  
  // Create automatic backup
  const backupResult = createMigrationBackup('YourMigrationName', ['sheet1', 'sheet2']);
  if (!backupResult.success) {
    throw new Error(`Backup failed: ${backupResult.error}`);
  }

  try {
    // Define safe modifications
    const sheetModifications = [
      {
        sheetName: 'sheet1',
        modifyFunction: (workingSheet, originalSheet) => {
          return this.modifySheet1(workingSheet, originalSheet);
        }
      },
      {
        sheetName: 'sheet2',
        modifyFunction: (workingSheet, originalSheet) => {
          return this.modifySheet2(workingSheet, originalSheet);
        }
      }
    ];

    // Execute safe modifications
    const modificationResults = batchSafeSheetModification(sheetModifications);
    
    if (!modificationResults.success) {
      throw new Error(`Sheet modifications failed: ${modificationResults.failedSheets.join(', ')}`);
    }

    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.toString());
    throw error;
  }
}
```

### Safe Modification Methods

```javascript
modifySheet1(workingSheet, originalSheet) {
  console.log('   🔧 Modifying sheet1...');
  
  // Get data from working sheet
  const data = workingSheet.getDataRange().getValues();
  const headers = data[0];
  const dataRows = data.slice(1);
  
  // Apply your modifications to workingSheet
  // Example: Update cell values, add columns, etc.
  
  // Update tracking data
  this.changes.sheet1.push({
    // Track changes for rollback
  });
  
  console.log(`     ✅ Processed ${dataRows.length} records`);
  
  return {
    recordsProcessed: dataRows.length,
    modificationType: 'your_modification_type'
  };
}
```

## Error Handling

The safe pattern includes comprehensive error handling:

- **Backup Validation**: Ensures backups are created before starting
- **Automatic Cleanup**: Removes temporary sheets on both success and failure
- **Transaction-like Behavior**: Either all sheets succeed or all fail
- **Detailed Error Reporting**: Clear error messages with context

## Best Practices

### 1. Always Use Backup + Safe Pattern
```javascript
// ✅ Correct
const backupResult = createMigrationBackup(migrationName, sheetNames);
const modifyResult = batchSafeSheetModification(modifications);
```

### 2. Track Changes for Rollback
```javascript
// ✅ Track all changes
this.changes.tableName.push({
  rowIndex: i + 2,
  originalValue: oldValue,
  newValue: newValue
});
```

### 3. Validate Before Modifying
```javascript
// ✅ Validate structure first
const headers = workingSheet.getRange(1, 1, 1, workingSheet.getLastColumn()).getValues()[0];
const requiredColumns = ['id', 'name', 'email'];
const missing = requiredColumns.filter(col => !headers.includes(col));
if (missing.length > 0) {
  throw new Error(`Missing required columns: ${missing.join(', ')}`);
}
```

### 4. Return Meaningful Results
```javascript
// ✅ Provide detailed results
return {
  recordsProcessed: dataRows.length,
  recordsModified: modifiedCount,
  modificationType: 'uuid_conversion',
  newColumnsAdded: ['LegacyId'],
  errors: []
};
```

## Rollback Strategy

The pattern supports multiple rollback options:

1. **Automatic Backup Restoration**: `restoreFromBackup(migrationName)`
2. **Manual Rollback**: Custom rollback logic in migration classes
3. **Backup Management**: List, inspect, and selectively restore backups

## Configuration Options

```javascript
const options = {
  preserveFormatting: true,      // Keep cell formatting (default: true)
  preserveHiddenStatus: true     // Keep sheet visibility (default: true)
};

safeSheetModification('sheetName', modifyFunction, options);
```

## Migration Examples

### Simple Value Updates
```javascript
migrateUserEmailsSafe(workingSheet, originalSheet) {
  const data = workingSheet.getDataRange().getValues();
  const emailColumnIndex = data[0].indexOf('email');
  
  for (let i = 1; i < data.length; i++) {
    const oldEmail = data[i][emailColumnIndex];
    const newEmail = oldEmail.toLowerCase();
    workingSheet.getRange(i + 1, emailColumnIndex + 1).setValue(newEmail);
  }
  
  return { recordsProcessed: data.length - 1, modificationType: 'email_normalization' };
}
```

### Complex Schema Changes
```javascript
migrateToUuidSafe(workingSheet, originalSheet) {
  const data = workingSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Add LegacyId column if needed
  if (!headers.includes('LegacyId')) {
    headers.push('LegacyId');
    workingSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  // Convert IDs to UUIDs
  const idIndex = headers.indexOf('id');
  const legacyIndex = headers.indexOf('LegacyId');
  
  for (let i = 1; i < data.length; i++) {
    const originalId = data[i][idIndex];
    const newId = generateUuid();
    
    workingSheet.getRange(i + 1, idIndex + 1).setValue(newId);
    workingSheet.getRange(i + 1, legacyIndex + 1).setValue(originalId);
  }
  
  return { 
    recordsProcessed: data.length - 1, 
    modificationType: 'id_to_uuid_conversion',
    columnsAdded: ['LegacyId']
  };
}
```

## Summary

The copy-modify-replace pattern ensures that all gas-migrations are:
- ✅ **Safe**: No risk of data corruption
- ✅ **Atomic**: All-or-nothing operations
- ✅ **Recoverable**: Full backup and rollback support
- ✅ **Reliable**: Consistent behavior across all migration types
- ✅ **Maintainable**: Clear patterns and error handling

This pattern is now implemented in all active migrations and should be used for all new migrations going forward.
