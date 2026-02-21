# Implementation Plan: DB Layer Simplification

**Branch**: `003-db-layer-simplification` | **Date**: 2026-02-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-db-layer-simplification/spec.md`

## Summary

Refactor the backend database layer so that (1) each model defines its column schema once, (2) the Google Sheets DB client converts rows to named fields using that schema, (3) Sheets-specific parsing is isolated in the DB client, and (4) audit trail creation moves from the DB client to repositories. The result is a uniform data pipeline where models are storage-agnostic and ready for a future SQL swap.

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022
**Primary Dependencies**: Express 4, Google Sheets API v4, googleapis
**Storage**: Google Sheets (single spreadsheet, column-index mapped)
**Testing**: Jest with ts-jest ESM preset, 544 tests across 30 suites
**Target Platform**: Node.js server (backend) + browser (shared models via Vite)
**Project Type**: Web application (Express backend + vanilla JS frontend)
**Performance Goals**: N/A (refactoring, no behavioral changes)
**Constraints**: Zero behavioral changes to API responses, data persistence, or query results
**Scale/Scope**: ~15 files modified (1 DB client, 6 repositories, ~10 models/services), ~380 lines of workingSheetInfo reduced to ~60

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Reducing code: ~380 lines → ~60 for sheet config, removing 6 duplicate column maps, removing unused methods |
| II. Data Consistency | PASS | Single column schema per entity, single conversion path |
| III. Single Serialization Path | PASS | `toJSON()` remains the only serialization method. `toDatabaseRow()` removed — DB client handles row conversion |
| IV. Uniform API Responses | N/A | No API changes |
| V. Single Data Fetch Pattern | N/A | No frontend changes |
| VI. No Dead Code | PASS | Removing 6 unused DB client methods, 1 vestigial audit sheet config, dead browser codepath in Registration.fromDatabaseRow |
| VII. Shared Models Are the Contract | PASS | Models gain `static columns` (read-only, doesn't change runtime shape). `fromDatabaseRow` signature changes from `string[]` to `Record<string, string>`. No browser callers exist. |
| VIII. Role-Based Architecture | N/A | No auth/role changes |
| IX. Trimester-Aware by Default | PASS | Trimester sheet names generated dynamically from base config + trimester name |
| X. Google Sheets Is the Database | PASS* | DB client remains the Sheets adapter, now cleaner. Column schemas move from DB client to models but still define the "migration" equivalent. See Complexity Tracking. |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-db-layer-simplification/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (speckit.tasks command)
```

### Source Code (files modified)

```text
src/
├── database/
│   └── googleSheetsDbClient.ts    # Major: rewrite workingSheetInfo, add schema-based conversion,
│                                  #   remove audit methods, remove unused methods, add field transforms
├── models/shared/
│   ├── registration.ts            # Add static columns, refactor fromDatabaseRow(Record), remove toDatabaseRow
│   ├── attendanceRecord.ts        # Add static columns, refactor fromDatabaseRow(Record), remove toDatabaseRow
│   ├── class.ts                   # Add static columns, refactor fromDatabaseRow(Record), remove DateHelpers from factory
│   ├── instructor.ts              # Add static columns, refactor fromDatabaseRow(Record)
│   ├── admin.ts                   # Add static columns, refactor fromDatabaseRow(Record)
│   ├── parent.ts                  # Add static columns, refactor fromDatabaseRow(Record)
│   ├── student.ts                 # Add static columns, refactor fromDatabaseRow(Record)
│   ├── room.ts                    # Add static columns, refactor fromDatabaseRow(Record)
│   └── dropRequest.ts             # Add static columns, refactor fromDatabaseRow(Record)
├── repositories/
│   ├── baseRepository.ts          # Simplify: remove ModelClass generics, clean up unused methods
│   ├── registrationRepository.ts  # Add audit creation (moved from DB client)
│   ├── attendanceRepository.ts    # Add audit creation (moved from DB client)
│   ├── dropRequestRepository.ts   # Simplify: use base methods where possible
│   ├── userRepository.ts          # Simplify: remove BaseRepository<Record<string, unknown>>
│   └── programRepository.ts       # Minor cleanup
├── services/
│   └── periodService.ts           # Update _parsePeriodRow to receive Record<string, string>
└── utils/values/
    └── keys.ts                    # REGISTRATIONSAUDIT key already exists — remove if vestigial (per research R4)

tests/
├── unit/
│   ├── googleSheetsDbClient.test.ts  # Update mocks for new DB client API
│   └── [model tests]                 # Update fromDatabaseRow calls: string[] → Record<string, string>
└── integration/
    └── [integration tests]           # Update DB client mocks
```

## Implementation Phases

### Phase 1: Column Schemas + DB Client Core (US1 + US2 + US6)

The foundational change. Add `static columns` to every model. Rewrite the DB client's `workingSheetInfo` to reference model column schemas. Change `getAllRecords` to return `Record<string, string>` via schema-based conversion. Change all `fromDatabaseRow` methods to accept `Record<string, string>`.

**Order of operations**:
1. Add `static columns` to each model (no behavioral change yet — columns is just a static array)
2. Add a `rowToObject(row: string[], columns: readonly string[]): Record<string, string>` utility to the DB client
3. Add an `objectToRow(obj: Record<string, unknown>, columns: readonly string[]): string[]` utility to the DB client
4. Rewrite `workingSheetInfo` to use `SheetConfig` interface referencing model column schemas
5. Update `getAllRecords` to use `rowToObject` internally, changing the mapFunc signature from `(row: string[]) => T` to `(record: Record<string, string>) => T`
6. Update each model's `fromDatabaseRow` to accept `Record<string, string>` and use named field access
7. Update each repository's `getAllRecords` call to match the new mapFunc signature
8. Remove `toDatabaseRow()` from Registration and AttendanceRecord
9. Update write paths (`appendRecord`, `updateRecord`) to use `objectToRow` with column schemas
10. Remove the `Appendable` interface and `toDatabaseRow` codepath from DB client
11. Update `PeriodService._parsePeriodRow` to accept `Record<string, string>`

**Risk**: This is a wide change touching many files. The mitigation is that every step is mechanically verifiable — tests pass or they don't.

### Phase 2: Field Transforms + Sheets Isolation (US3)

Move Sheets-specific parsing from models into the DB client's transform layer.

**Order of operations**:
1. Define `FieldTransform` type and add transform maps for Classes (time parsing), Instructors (isDeactivated inversion, specialties, availability restructuring), Attendance (week/attended coercion), Admin (isDirector coercion), Periods (lowercase, date parsing)
2. Apply transforms in the DB client after `rowToObject`, before calling the mapFunc
3. Remove `DateHelpers.parseTimeString` call from `Class.fromDatabaseRow`
4. Remove `!isDeactivated` inversion from `Instructor.fromDatabaseRow` (now receives `isActive: boolean`)
5. Remove `window.ClassManager` check from `Registration.fromDatabaseRow` — move waitlist detection to repository
6. Remove boolean string parsing from `AttendanceRecord.fromDatabaseRow` and `Admin.fromDatabaseRow`
7. Verify: grep `src/models/shared/` for `row[`, `parseTimeString`, `instanceof Date` — zero results

### Phase 3: Audit Trail Migration (US4)

Move audit record creation from DB client to repositories.

**Order of operations**:
1. Create audit record builder functions in the registration and attendance repositories
2. Update `RegistrationRepository.create` / `createInTable` to write audit records after the main write
3. Update `RegistrationRepository.updateIntent` to write audit records
4. Update `RegistrationRepository.delete` / `deleteFromTable` to write audit records
5. Update `AttendanceRepository.create` / `recordAttendance` / `removeAttendance` to write audit records
6. Remove `#createRegistrationAuditRecord` and `#createAttendanceAuditRecord` from DB client
7. Remove `RegistrationRecord` and `AttendanceRecord` interfaces from DB client
8. Simplify `appendRecord` — remove the `if (auditSheet)` branching logic
9. Simplify `deleteRecord` — remove the audit-writing side effect

### Phase 4: BaseRepository Simplification + Cleanup (US5)

**Order of operations**:
1. Simplify `BaseRepository` to provide only: `dbClient`, `logger`, `entityName`, and default `findAll`/`findById` implementations that use the model's column schema
2. Remove `ModelClass` generic interface — models are passed as column schema references, not constructor references
3. Update `UserRepository` to extend simplified base (or stop extending if cleaner)
4. Update `DropRequestRepository` to use base `findAll`/`findById` where possible instead of overriding
5. Remove unused DB client methods: `getFromSheetByColumnValue`, `getFromSheetByColumnValueSingle`, `batchWrite`, `getAllDataParallel`, `getMaxIdFromSheet`, `archiveSheet`
6. Remove vestigial `Keys.REGISTRATIONSAUDIT` sheet config (if confirmed unused)
7. Final verification: `npm run typecheck` + `npm test` — 544/544 pass

## Complexity Tracking

| Principle | Deviation | Justification |
|-----------|-----------|---------------|
| X. Google Sheets Is the Database | Column schemas move from `googleSheetsDbClient.ts` to model classes (`static columns`). Principle X states "the column-index mapping in googleSheetsDbClient.js is the schema." After this refactoring, the migration-equivalent is a model file edit, not a DB client edit. | The spirit of Principle X (column layout changes require deliberate care) is preserved — schemas still define positional ordering, just in a different file. Moving schemas to models satisfies Principles II (Data Consistency) and VII (Shared Models Are the Contract) by making models the single source of truth for entity structure. The DB client still references these schemas for all read/write operations. Constitution Principle X should be updated post-implementation to reflect the new schema location and the `.ts` extension. |
