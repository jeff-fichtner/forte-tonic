# Migration 004: Attendance Tables to UUID

This migration converts the attendance and attendance_audit tables to use UUID primary keys for consistency with the registration system.

## Overview

This migration ensures that attendance-related tables use UUIDs for primary keys, creating consistency across the entire system.

### Tables Affected
- **attendance**: Main attendance records
- **attendance_audit**: Audit trail for attendance changes

## Current State Analysis

The migration will analyze and convert:

### attendance Table
- Convert any non-UUID IDs to proper UUIDs
- Preserve existing UUIDs if already present
- Maintain all data relationships

### attendance_audit Table  
- Ensure all audit record IDs are UUIDs
- Generate UUIDs for any missing audit IDs
- Update any foreign key references as needed

## Migration Process

### 1. Preview Migration
```javascript
previewAttendanceToUuidMigration()
```

This will show:
- Current ID formats in both tables
- Number of records to be converted
- Analysis of existing UUID vs non-UUID IDs

### 2. Execute Migration
```javascript
runAttendanceToUuidMigration()
```

The migration will:
1. Create automatic backup of both tables
2. Convert attendance table IDs to UUIDs (if needed)
3. Ensure attendance_audit table uses UUIDs
4. Validate all conversions
5. Provide comprehensive summary

### 3. Verify Migration
```javascript
verifyAttendanceToUuidMigration()
```

Performs validation to ensure:
- All IDs are valid RFC 4122 UUIDs
- No data was lost during migration
- All relationships remain intact

## Safety Features

### Automatic Backup
- Complete backup of both tables before migration
- Timestamp-based backup naming
- Easy restoration if needed

### Rollback Capability
```javascript
rollbackAttendanceToUuidMigration()
```

Since original IDs are not preserved (for simplicity), rollback uses backup restoration.

### Backup Restoration
```javascript
restoreAttendanceToUuidMigrationFromBackup()
```

Direct restoration from automatic backup if needed.

## Before/After Examples

### Before Migration
```
attendance:
Id: "ATT_001" or "12345" or already UUID
StudentId: "550e8400-e29b-41d4-a716-446655440000"
RegistrationId: "550e8401-e29b-41d4-a716-446655440000"

attendance_audit:
Id: "AUDIT_001" or empty or already UUID
RegistrationId: "550e8402-e29b-41d4-a716-446655440000"
```

### After Migration  
```
attendance:
Id: "550e8403-e29b-41d4-a716-446655440000" (UUID)
StudentId: "550e8400-e29b-41d4-a716-446655440000"
RegistrationId: "550e8401-e29b-41d4-a716-446655440000"

attendance_audit:
Id: "550e8404-e29b-41d4-a716-446655440000" (UUID)
RegistrationId: "550e8402-e29b-41d4-a716-446655440000"
```

## Migration Features

### Smart Conversion
- Only converts non-UUID IDs
- Preserves existing UUIDs
- Handles empty/missing audit IDs

### Data Integrity
- Maintains all foreign key relationships
- Preserves all data fields
- No data loss during conversion

### Comprehensive Validation
- Validates UUID format for all converted IDs
- Ensures referential integrity
- Provides detailed error reporting

## Integration with Other Migrations

This migration works in conjunction with:
- **Migration 002**: Composite to UUID (registrations)
- Creates a complete UUID-based system for all attendance-related data

### Recommended Execution Order
1. Migration 002 (registrations to UUID)
2. Migration 004 (attendance to UUID)

## Troubleshooting

### Common Issues

**No attendance table found**
- The migration will skip tables that don't exist
- This is normal if attendance tracking isn't implemented yet

**Foreign key reference issues**
- Ensure registrations migration (002) is completed first
- Check that RegistrationId values exist in registrations table

**UUID validation failures**
- Migration will report specific validation errors
- Re-run migration if validation fails

### Recovery Procedures

1. **Use built-in rollback**: `rollbackAttendanceToUuidMigration()`
2. **Restore from backup**: `restoreAttendanceToUuidMigrationFromBackup()`
3. **Manual recovery**: Use spreadsheet version history

## Post-Migration Benefits

### Consistency
- All attendance data uses UUID primary keys
- Uniform ID format across attendance system
- Simplified query patterns

### Performance
- Better indexing with UUID distribution
- Consistent join performance
- Scalable for large attendance datasets

### Maintainability
- Easier debugging with consistent ID format
- Simplified foreign key relationships
- Future-proof architecture

## Impact Assessment

### Database Changes
- attendance table: Primary key converted to UUID
- attendance_audit table: Primary key converted to UUID
- All foreign key relationships maintained

### Application Changes
- Minimal impact if application already handles UUIDs
- attendance system queries remain unchanged
- Improved consistency with registration system

### Performance Impact
- Negligible performance impact for current data volumes
- Improved distribution for large datasets
- Better join performance with uniform UUID format

## Production Deployment

### Pre-Migration Steps
1. Ensure registrations migration (002) is completed
2. Verify attendance table structure
3. Create manual backup of entire spreadsheet
4. Test migration on copy of production data

### Migration Steps
1. Preview migration to verify scope
2. Execute migration during low-usage period
3. Verify results immediately
4. Test attendance functionality
5. Monitor for any issues

### Post-Migration Steps
1. Verify all attendance features work correctly
2. Update any hardcoded attendance ID references
3. Monitor performance for 24-48 hours
4. Document any lessons learned

This migration ensures attendance data follows the same UUID standards as the registration system, creating a consistent and maintainable data architecture.
