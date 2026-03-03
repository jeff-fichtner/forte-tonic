# API Contract: Parent Registration Tab Data

**Endpoint**: `GET /api/parent/tabs/registration/:trimester`

## Change Summary

Adds `availableTimeSlots` to the response payload and `excludeRegistrationId` as an optional query parameter. All existing fields are unchanged.

## Request

### Parameters

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| trimester | path | string | yes | Target trimester: "fall", "winter", or "spring" |
| parentId | query | string | yes | Parent's user ID |
| excludeRegistrationId | query | string | no | Registration ID to exclude from conflict checks (enrollment period modification) |

### Example

```
GET /api/parent/tabs/registration/spring?parentId=abc123
GET /api/parent/tabs/registration/spring?parentId=abc123&excludeRegistrationId=reg456
```

## Response

### Success (200)

```json
{
  "success": true,
  "data": {
    "instructors": [ /* InstructorJSON[] — unchanged */ ],
    "students": [ /* StudentJSON[] — parent's children only, unchanged */ ],
    "classes": [ /* ClassJSON[] — unchanged */ ],
    "registrations": [ /* RegistrationJSON[] — unchanged, still needed for group capacity */ ],
    "availableTimeSlots": {
      "3": [
        {
          "instructorId": "inst-001",
          "day": "monday",
          "dayName": "Monday",
          "time": "14:00",
          "timeFormatted": "2:00 PM",
          "length": 30,
          "instrument": "Piano"
        }
      ],
      "6": [ /* slots for grade 6 */ ],
      "null": [ /* slots for students with no grade */ ]
    }
  }
}
```

### Error (400/401/500)

```json
{
  "success": false,
  "error": {
    "message": "Parent ID is required",
    "code": "VALIDATION_ERROR",
    "type": "ValidationError"
  }
}
```

## Behavior Notes

- `availableTimeSlots` keys are `String(grade)` for each unique grade among the parent's children
- When `excludeRegistrationId` is provided, the specified registration is excluded from conflict detection, making its time slot (and any slots it blocked) available
- The registration set used for conflict detection follows existing trimester logic: current trimester during registration periods, next trimester during enrollment periods
- The endpoint returns the same `instructors` array as before — the client still needs it for rendering instructor names on cards and chips
