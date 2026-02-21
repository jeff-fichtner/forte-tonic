# Data Model: DB Layer Simplification

**Branch**: `003-db-layer-simplification` | **Date**: 2026-02-21

This document describes the new data structures introduced by the refactoring, not the domain entities themselves (those already exist and don't change shape).

## New Concept: Column Schema

Each model that is persisted to a Google Sheets table defines a static `columns` array. This array is the single source of truth for:
- Which fields exist on the entity in storage
- What order they appear in the spreadsheet columns
- What names map to what positions

```typescript
// On each model class
static readonly columns = ['id', 'studentId', 'instructorId', ...] as const;
```

### Column Schemas by Entity

**Registration** (20 columns):
`id, studentId, instructorId, day, startTime, length, registrationType, roomId, instrument, transportationType, notes, classId, classTitle, expectedStartDate, createdAt, createdBy, reenrollmentIntent, intentSubmittedAt, intentSubmittedBy, linkedPreviousRegistrationId`

**Registration Audit** (26 columns — extends Registration):
`id, registrationId, studentId, instructorId, day, startTime, length, registrationType, roomId, instrument, transportationType, notes, classId, classTitle, expectedStartDate, createdAt, createdBy, isDeleted, deletedAt, deletedBy, reenrollmentIntent, intentSubmittedAt, intentSubmittedBy, updatedAt, updatedBy, linkedPreviousRegistrationId`

**Attendance** (11 columns):
`id, registrationId, week, schoolYear, trimester, attended, notes, recordedBy, recordedAt, createdAt, createdBy`

**Attendance Audit** (9 columns):
`id, action, attendanceId, registrationId, week, schoolYear, trimester, performedBy, performedAt`

**Admin** (10 columns):
`id, email, lastName, firstName, phone, accessCode, role, displayEmail, displayPhone, isDirector`

**Instructor** (35 columns):
`id, email, lastName, firstName, phone, isDeactivated, minimumGrade, maximumGrade, instrument1, instrument2, instrument3, instrument4, isAvailableMonday, mondayStartTime, mondayEndTime, mondayRoomId, isAvailableTuesday, tuesdayStartTime, tuesdayEndTime, tuesdayRoomId, isAvailableWednesday, wednesdayStartTime, wednesdayEndTime, wednesdayRoomId, isAvailableThursday, thursdayStartTime, thursdayEndTime, thursdayRoomId, isAvailableFriday, fridayStartTime, fridayEndTime, fridayRoomId, accessCode, displayEmail, displayPhone`

**Parent** (6 columns):
`id, email, lastName, firstName, phone, accessCode`

**Student** (8 columns):
`id, lastName, firstName, lastNickname, firstNickname, grade, parent1Id, parent2Id`

**Room** (2 columns):
`id, name`

**Class** (12 columns):
`id, instructorId, day, startTime, length, endTime, instrument, title, size, minimumGrade, maximumGrade, isRestricted`

**Period** (3 columns — not a model class, defined as constant):
`trimester, periodType, startDate`

**DropRequest** (10 columns):
`id, registrationId, parentId, trimester, reason, requestedAt, status, reviewedBy, reviewedAt, adminNotes`

## New Concept: Sheet Config

Replaces the current `workingSheetInfo` block. Each entry is minimal:

```typescript
interface SheetConfig {
  sheet: string;              // Sheet tab name
  startRow: number;           // First data row (after header)
  columns: readonly string[]; // Reference to model's column schema
  auditSheet?: string;        // Companion audit sheet name (if any)
}
```

Sheet configs are registered in the DB client. Trimester-specific sheets are generated dynamically from a base config + trimester name, not copy-pasted.

## New Concept: Field Transform

Optional per-sheet transformation applied after `string[]` → `Record<string, string>` conversion, before data reaches the model.

```typescript
type FieldTransform = Record<string, (value: string, row: Record<string, string>) => unknown>;
```

The second parameter (`row`) allows transforms that need context from other fields (e.g., Instructor's specialties array needs instrument1-4).

### Transform Registry

| Sheet | Transforms |
|-------|-----------|
| Classes | `startTime` → 24h format, `endTime` → 24h format, `length` → number |
| Instructors | `isDeactivated` → rename to `isActive` + invert boolean, `instrument1-4` → `specialties: string[]` (filtered falsy), 20 availability flat fields → nested `availability: InstructorAvailability` (see shape below), `minimumGrade`+`maximumGrade` → `gradeRange: GradeRange` (see shape below) |
| Attendance | `week` → number, `attended` → boolean |
| Admin | `isDirector` → boolean |
| Periods | `trimester` → lowercase, `startDate` → Date |
| Registration | (none at DB level — constructor handles its own string→Date/number) |
| DropRequest | (none — all string fields) |

### Instructor Transform Output Shapes

The Instructor transform is the most complex — it restructures 35 flat columns into nested objects. The target shapes (already defined in `src/models/shared/instructor.ts`):

```typescript
interface DayAvailability {
  isAvailable: string;
  startTime: string;
  endTime: string;
  roomId: string;
}

interface InstructorAvailability {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
}

interface GradeRange {
  minimum: string;
  maximum: string;
}
```

The transform maps flat columns to these shapes:
- `isAvailableMonday, mondayStartTime, mondayEndTime, mondayRoomId` → `availability.monday: DayAvailability` (repeated for each weekday)
- `minimumGrade, maximumGrade` → `gradeRange: GradeRange`
- `instrument1, instrument2, instrument3, instrument4` → `specialties: string[]` (filtered falsy)
- `isDeactivated` → `isActive: boolean` (inverted)

Note: Registration's `length` parsing and date parsing remain in the constructor because they include validation logic (e.g., waitlist length is optional). The DB client only handles format-conversion transforms, not business-rule transforms.

## Removed Concepts

- **`toDatabaseRow()`**: Removed from Registration and AttendanceRecord. The DB client handles object→row conversion using the column schema.
- **`Appendable` interface**: Removed from DB client. All records are passed as plain objects.
- **`RegistrationRecord` / `AttendanceRecord` interfaces in DB client**: Removed. The DB client has no domain-specific type knowledge.
- **`#createRegistrationAuditRecord` / `#createAttendanceAuditRecord`**: Removed from DB client. Audit creation moves to repositories.
