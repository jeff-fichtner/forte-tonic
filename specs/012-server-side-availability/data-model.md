# Data Model: Server-Side Availability Pre-Computation

**Branch**: `012-server-side-availability` | **Date**: 2026-03-02

## New Entity: AvailableTimeSlot

A pre-computed, conflict-free time slot. Plain interface (no class, no constructor, no `toJSON()`) — it is a data transfer shape, not a domain model.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| instructorId | string | ID of the instructor offering this slot |
| day | string | Lowercase day name: "monday", "tuesday", etc. |
| dayName | string | Capitalized day name: "Monday", "Tuesday", etc. |
| time | string | Start time in 24-hour format: "14:00", "15:30" |
| timeFormatted | string | Start time in 12-hour format: "2:00 PM", "3:30 PM" |
| length | number | Lesson duration in minutes: 30, 45, or 60 |
| instrument | string | Instrument name: "Piano", "Guitar", etc. |

### Location

`src/models/shared/availableTimeSlot.ts` — exported from `src/models/shared/index.ts`.

### Relationships

- **Instructor**: Each slot references an instructor by `instructorId`. The client also receives the full `instructors` array separately for rendering instructor names and cards.
- **Registration** (implicit): Slots are computed with existing registrations excluded. The server applies conflict detection during computation — the result is conflict-free by construction.

### Response Shape

The parent registration tab endpoint returns `availableTimeSlots` as a `Record<string, AvailableTimeSlot[]>` keyed by student grade:

```
{
  "3": [ { instructorId, day, dayName, time, timeFormatted, length, instrument }, ... ],
  "6": [ ... ],
  "null": [ ... ]
}
```

- Keys are `String(grade)` for each unique grade among the parent's children
- The `"null"` key covers students with no grade set (all instructors eligible)

## Existing Entities (Unchanged)

### Instructor (read-only input)

Used by the availability service to determine:
- `availability: InstructorAvailability` — per-day schedule (isAvailable, startTime, endTime)
- `specialties: string[]` — instruments the instructor teaches
- `gradeRange: { minimum, maximum }` — grade eligibility bounds

### Registration (read-only input)

Used by the availability service for conflict detection:
- `instructorId`, `day`, `startTime`, `length` — identifies time blocks that are taken

### Student (read-only input)

Used only for grade extraction:
- `grade: number | string | null` — determines which grade key to compute slots for
