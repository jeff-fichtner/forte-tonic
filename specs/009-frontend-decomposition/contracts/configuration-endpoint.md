# Contract: Configuration Endpoint Expansion

## Endpoint

`GET /api/getAppConfiguration`

No change to endpoint path, method, or authentication requirements. The response body is expanded with a new `registrationConfig` field.

## Current Response Shape

```json
{
  "success": true,
  "data": {
    "currentPeriod": { "periodType": "registration", "trimester": "spring", "targetTrimester": "spring", "startDate": "2026-01-15" },
    "nextPeriod": null,
    "rockBandClassIds": ["class-rb-1", "class-rb-2"],
    "currentTrimester": "spring",
    "nextTrimester": "fall",
    "availableTrimesters": ["fall", "winter", "spring"],
    "defaultTrimester": "spring",
    "maintenanceMode": false,
    "maintenanceMessage": null
  }
}
```

## Expanded Response Shape

```json
{
  "success": true,
  "data": {
    "currentPeriod": { "periodType": "registration", "trimester": "spring", "targetTrimester": "spring", "startDate": "2026-01-15" },
    "nextPeriod": null,
    "rockBandClassIds": ["class-rb-1", "class-rb-2"],
    "currentTrimester": "spring",
    "nextTrimester": "fall",
    "availableTrimesters": ["fall", "winter", "spring"],
    "defaultTrimester": "spring",
    "maintenanceMode": false,
    "maintenanceMessage": null,
    "registrationConfig": {
      "busDeadlines": {
        "Monday": "16:45",
        "Tuesday": "16:45",
        "Wednesday": "16:15",
        "Thursday": "16:45",
        "Friday": "16:45"
      },
      "lessonLengths": [30, 45, 60],
      "operationalHours": {
        "startHour": 14,
        "endHour": 18
      },
      "schedulingIntervalMinutes": 15,
      "defaultInstruments": ["Piano", "Guitar", "Violin", "Voice", "Drums", "Bass", "Other"],
      "defaultInstrument": "Piano",
      "rockBandDisplayConfig": {
        "timesDescription": "Monday 3-4 PM or Monday 4-5 PM or Friday 3-4 PM",
        "defaultLengthMinutes": 60
      }
    }
  }
}
```

## Backward Compatibility

- All existing fields are unchanged
- `registrationConfig` is a new additive field
- Frontend MUST handle `registrationConfig` being `null` or absent (fallback to current hardcoded defaults)
- No existing API consumers are affected — they ignore unknown fields

## Validation Rules

- `busDeadlines`: Keys must be capitalized day names (Monday-Friday). Values must be HH:MM 24-hour format strings. If a day is missing, that day has no bus deadline enforcement.
- `lessonLengths`: Non-empty array of positive integers. Values in minutes.
- `operationalHours`: `startHour` < `endHour`. Both are integers 0-23.
- `schedulingIntervalMinutes`: Positive integer. Typical values: 15 or 30.
- `defaultInstruments`: Non-empty array of non-empty strings.
- `defaultInstrument`: Non-empty string. Should be present in `defaultInstruments`.
- `rockBandDisplayConfig.timesDescription`: Non-empty string for display.
- `rockBandDisplayConfig.defaultLengthMinutes`: Positive integer.
