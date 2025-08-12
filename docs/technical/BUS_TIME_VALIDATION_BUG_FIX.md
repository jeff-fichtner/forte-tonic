# Bus Time Validation Bug Fix

## Issue
Error when creating group registrations with "Late Bus" transportation:
```
HTTP 400: {"success":false,"message":"Failed to create registration","error":"Late Bus is not available for lessons ending after 16:45 on Tuesday. This lesson ends at 1550:30. Please select \"Late Pick Up\" instead or choose a different time slot."}
```

## Root Cause
The `length` field in class data was being passed as a string (potentially a malformed time string like "15:50") instead of a number representing duration in minutes. This caused the bus time validation to calculate incorrect end times.

### Problem Flow:
1. Class data loaded from Google Sheets contains `length` field
2. For group registrations, `registrationData.length = groupClass.length` copies the raw value
3. Bus validation expects `lengthMinutes` to be a number but receives a string
4. String concatenation instead of addition: `startMinutes + "15:50"` → invalid time like "1550:30"

## Solution

### 1. Fixed Class Model (`src/models/shared/class.js`)
- Added parsing of `length` field to ensure it's always a number
- Added warning log when invalid length data is detected
- Converts strings to integers: `parseInt(length) || 0`

### 2. Fixed Registration Service (`src/services/registrationApplicationService.js`)
- Added explicit number conversion before bus validation
- Enhanced logging to track data types
- Ensures `lengthMinutes` parameter is always a number

### 3. Enhanced Error Detection
- Added warning logs when length field contains invalid data (like time strings with `:`)
- Better debugging information in bus validation logs

## Code Changes

### Class.fromDatabaseRow()
```javascript
// Before:
length,

// After:
const processedLength = parseInt(length) || 0;
// Log warning if length field contains invalid data
if (isNaN(parseInt(length)) || length.toString().includes(':')) {
  console.warn(`⚠️  Class ${id} has invalid length field: "${length}". Expected duration in minutes, got: ${typeof length}. Using ${processedLength} minutes.`);
}
```

### Registration Service
```javascript
// Before:
const busValidation = this.#validateBusTimeRestrictions(
  registrationData.day,
  registrationData.startTime,
  registrationData.length
);

// After:
const lengthMinutes = parseInt(registrationData.length) || 0;
const busValidation = this.#validateBusTimeRestrictions(
  registrationData.day,
  registrationData.startTime,
  lengthMinutes
);
```

## Prevention
- Class data validation now ensures `length` is always a number
- Enhanced logging helps identify data quality issues
- Type conversion prevents string concatenation errors

## Testing
1. Server restart picks up the changes
2. Group registrations with "Late Bus" should now work correctly
3. Invalid time displays like "1550:30" should be resolved
4. Warning logs will help identify any remaining data quality issues

## Data Quality
Consider reviewing the Google Sheets source data to ensure:
- `length` column contains numeric values (30, 45, 60, etc.)
- No time strings (like "15:50") in the length field
- Consistent data format across all class records
