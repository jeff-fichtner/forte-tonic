# Migration 003: All Tables to UUID

This migration converts all remaining tables to use UUID primary keys for system-wide consistency.

## Overview

This migration addresses the remaining tables that still use non-UUID primary keys:

- **admins**: Email-based IDs → UUIDs
- **instructors**: Email-based IDs → UUIDs  
- **parents**: Composite email-name IDs → UUIDs
- **students**: Numeric IDs → UUIDs
- **classes**: Alphanumeric codes → UUIDs
- **rooms**: Alphanumeric codes → UUIDs

## Features

- **Dependency-Aware Migration**: Tables are migrated in the correct order to handle foreign key relationships
- **Original ID Preservation**: All original IDs are preserved in `LegacyId` columns
- **Foreign Key Updates**: All foreign key references are automatically updated to use new UUIDs
- **Comprehensive Validation**: Ensures all UUIDs are properly formatted and all references are updated
- **Full Rollback Support**: Complete rollback capability with original ID restoration

## Before Migration

### Current ID Formats
```
admins:      email@example.com
instructors: instructor.email@example.com  
parents:     parent_email_john_doe
students:    12345
classes:     CLASS_ABC_2024
rooms:       ROOM_101
```

### Foreign Key Relationships
```
students.Parent1Id    → parents.Id
students.Parent2Id    → parents.Id
classes.InstructorId  → instructors.Id
registrations.*       → Multiple table references
```

## After Migration

### New UUID Format
```
admins:      550e8400-e29b-41d4-a716-446655440000
instructors: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
parents:     6ba7b811-9dad-11d1-80b4-00c04fd430c8
students:    550e8401-e29b-41d4-a716-446655440000
classes:     6ba7b812-9dad-11d1-80b4-00c04fd430c8
rooms:       550e8402-e29b-41d4-a716-446655440000
```

### Preserved Original IDs
```
admins.LegacyId:      email@example.com
instructors.LegacyId: instructor.email@example.com
parents.LegacyId:     parent_email_john_doe
students.LegacyId:    12345
classes.LegacyId:     CLASS_ABC_2024
rooms.LegacyId:       ROOM_101
```

## Migration Steps

### 1. Preview Migration
```javascript
previewAllTablesToUuidMigration()
```

This will analyze all tables and show:
- Number of records to migrate per table
- Current ID formats
- Foreign key dependencies
- Total impact assessment

### 2. Execute Migration
```javascript
runAllTablesToUuidMigration()
```

The migration will:
1. Create automatic backup of all affected tables
2. Migrate tables in dependency order:
   - rooms (no dependencies)
   - instructors (no dependencies)
   - parents (no dependencies)
   - students (depends on parents)
   - classes (depends on instructors and rooms)
   - admins (no dependencies)
3. Update all foreign key references
4. Validate all UUIDs and relationships
5. Provide comprehensive summary

### 3. Verify Migration
```javascript
verifyAllTablesUuidMigration()
```

Run this separate verification script to ensure:
- All IDs are valid UUIDs
- All foreign key relationships are intact
- No data was lost during migration
- All original IDs are preserved in LegacyId columns

## Safety Features

### Automatic Backup
- Complete backup of all tables before migration
- Timestamp-based backup naming
- Easy restoration if needed

### Rollback Capability
```javascript
rollbackAllTablesToUuidMigration()
```

This will:
- Restore original IDs from LegacyId columns
- Remove LegacyId columns
- Restore tables to pre-migration state

### Backup Restoration
```javascript
restoreAllTablesToUuidMigrationFromBackup()
```

Use this if rollback fails for any reason.

## Migration Order and Dependencies

The migration handles dependencies automatically:

1. **rooms** - No dependencies, migrated first
2. **instructors** - No dependencies, migrated second
3. **parents** - No dependencies, migrated third
4. **students** - Depends on parents, migrated after parents
5. **classes** - Depends on instructors and rooms, migrated after both
6. **admins** - No dependencies, migrated last

Foreign keys are updated after all primary keys are converted.

## Validation Checks

The migration includes comprehensive validation:

- **UUID Format**: Ensures all new IDs are valid RFC 4122 UUIDs
- **Foreign Key Integrity**: Verifies all foreign key references point to valid UUIDs
- **Data Preservation**: Confirms no data was lost during migration
- **Original ID Preservation**: Verifies all original IDs are in LegacyId columns

## Troubleshooting

### Common Issues

**Invalid UUIDs Generated**
- The migration uses proper UUID v4 generation
- All UUIDs are validated before saving
- Re-run the migration if validation fails

**Foreign Key Update Failures**
- Migration tracks all ID mappings
- Automatically updates all known foreign key relationships
- Check for custom foreign key columns not in the standard pattern

**Backup/Rollback Issues**
- Use the automatic backup system
- Rollback restores from LegacyId columns
- Full backup restoration available as last resort

### Getting Help

1. Check the console output for detailed error messages
2. Run the preview first to identify potential issues
3. Use the verification script to validate results
4. Contact the development team for complex issues

## Impact Assessment

### Database Changes
- All tables get consistent UUID primary keys
- LegacyId columns added to preserve original IDs
- All foreign key relationships updated

### Application Changes
- Application code should work unchanged (already uses UUIDs)
- Original IDs still available in LegacyId columns for lookups
- Improved data consistency across entire system

### Performance Impact
- UUIDs provide better distribution for large datasets
- Consistent ID format simplifies application logic
- Minimal performance impact for current data volumes

## Post-Migration Recommendations

1. **Test All Application Functions**: Verify all features work with new UUIDs
2. **Update Any Hardcoded IDs**: Replace any hardcoded references with UUID lookups
3. **Clean Up Legacy Columns**: After confirming migration success, consider removing LegacyId columns
4. **Update Documentation**: Update any documentation that references old ID formats

## Related Migrations

- **Migration 002**: Composite to UUID (registrations table)
- **Future migrations**: May clean up LegacyId columns after verification period

This migration completes the transition to a fully UUID-based primary key system across all tables.
