# Tasks: DB Layer Simplification

**Input**: Design documents from `/specs/003-db-layer-simplification/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested — no test-first tasks included. Existing 544 tests must continue to pass (verified at checkpoints).

**Organization**: Tasks are grouped by user story. US1+US2+US6 are bundled as Phase 3 (co-dependent P1 stories per plan.md Phase 1). US3 and US4 are separate P2 phases. US5 is the final implementation phase (P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Branch verification and baseline confirmation

- [ ] T001 Verify branch `003-db-layer-simplification` is checked out and clean
- [ ] T002 Run `npm run typecheck` and `npm test` to confirm 544/544 tests pass as baseline

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and interfaces in the DB client that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Define `SheetConfig` interface and `FieldTransform` type in `src/database/googleSheetsDbClient.ts` — `SheetConfig { sheet: string; startRow: number; columns: readonly string[]; auditSheet?: string }` and `FieldTransform = Record<string, (value: string, row: Record<string, string>) => unknown>`
- [ ] T004 Implement `rowToObject(row: string[], columns: readonly string[]): Record<string, string>` utility method in `src/database/googleSheetsDbClient.ts` — converts positional array to named fields. MUST pad missing trailing columns with empty strings when row has fewer elements than schema (spec edge case: Sheets rows may be shorter than schema)
- [ ] T005 Implement `objectToRow(obj: Record<string, unknown>, columns: readonly string[]): string[]` utility method in `src/database/googleSheetsDbClient.ts` — converts named fields to positional array using column schema
- [ ] T006 Implement `applyTransforms(record: Record<string, string>, transforms: FieldTransform): Record<string, unknown>` utility method in `src/database/googleSheetsDbClient.ts` — applies per-field transforms after rowToObject conversion
- [ ] T007 Run `npm run typecheck` and `npm test` to confirm no regressions from foundational additions

**Checkpoint**: Foundation ready — utilities exist but are not yet wired into the data flow. All 544 tests still pass.

---

## Phase 3: US1 + US2 + US6 — Column Schemas, Named Fields, Registration Dedup (Priority: P1) 🎯 MVP

**Goal**: Each model defines `static columns`. The DB client uses column schemas to convert rows to `Record<string, string>`. Models receive named fields, not positional arrays. Registration config is defined once and shared across trimesters.

**Independent Test**: `npm test` passes 544/544. `grep -rn 'row\[' src/models/shared/` returns nothing. `workingSheetInfo` block is under 80 lines.

### Add static columns to all models

- [ ] T008 [P] [US1] Add `static readonly columns` to `src/models/shared/registration.ts` — 20 fields: `id, studentId, instructorId, day, startTime, length, registrationType, roomId, instrument, transportationType, notes, classId, classTitle, expectedStartDate, createdAt, createdBy, reenrollmentIntent, intentSubmittedAt, intentSubmittedBy, linkedPreviousRegistrationId`
- [ ] T009 [US1] Add `static readonly auditColumns` to `src/models/shared/registration.ts` — 26 fields extending registration columns with audit-specific fields: `id, registrationId, studentId, instructorId, day, startTime, length, registrationType, roomId, instrument, transportationType, notes, classId, classTitle, expectedStartDate, createdAt, createdBy, isDeleted, deletedAt, deletedBy, reenrollmentIntent, intentSubmittedAt, intentSubmittedBy, updatedAt, updatedBy, linkedPreviousRegistrationId` (same file as T008 — do sequentially)
- [ ] T010 [P] [US1] Add `static readonly columns` to `src/models/shared/attendanceRecord.ts` — 11 fields: `id, registrationId, week, schoolYear, trimester, attended, notes, recordedBy, recordedAt, createdAt, createdBy`
- [ ] T011 [US1] Add `static readonly auditColumns` to `src/models/shared/attendanceRecord.ts` — 9 fields: `id, action, attendanceId, registrationId, week, schoolYear, trimester, performedBy, performedAt` (same file as T010 — do sequentially)
- [ ] T012 [P] [US1] Add `static readonly columns` to `src/models/shared/admin.ts` — 10 fields: `id, email, lastName, firstName, phone, accessCode, role, displayEmail, displayPhone, isDirector`
- [ ] T013 [P] [US1] Add `static readonly columns` to `src/models/shared/instructor.ts` — 35 fields per data-model.md
- [ ] T014 [P] [US1] Add `static readonly columns` to `src/models/shared/parent.ts` — 6 fields: `id, email, lastName, firstName, phone, accessCode`
- [ ] T015 [P] [US1] Add `static readonly columns` to `src/models/shared/student.ts` — 8 fields: `id, lastName, firstName, lastNickname, firstNickname, grade, parent1Id, parent2Id`
- [ ] T016 [P] [US1] Add `static readonly columns` to `src/models/shared/room.ts` — 2 fields: `id, name`
- [ ] T017 [P] [US1] Add `static readonly columns` to `src/models/shared/class.ts` — 12 fields: `id, instructorId, day, startTime, length, endTime, instrument, title, size, minimumGrade, maximumGrade, isRestricted`
- [ ] T018 [P] [US1] Add `static readonly columns` to `src/models/shared/dropRequest.ts` — 10 fields: `id, registrationId, parentId, trimester, reason, requestedAt, status, reviewedBy, reviewedAt, adminNotes`
- [ ] T019 [US1] Define `PERIOD_COLUMNS` constant (`trimester, periodType, startDate`) in `src/services/periodService.ts` — Period is not a model class, so columns are a local constant

### Rewrite workingSheetInfo and DB client read/write paths

- [ ] T020 [US6] Rewrite `workingSheetInfo` in `src/database/googleSheetsDbClient.ts` to use `SheetConfig` entries referencing model column schemas — replace ~380 lines of inline column maps with minimal configs (sheet name, startRow, columns reference). Generate trimester-specific registration/audit sheets dynamically from base config + trimester name
- [ ] T021 [US2] Update `getAllRecords` in `src/database/googleSheetsDbClient.ts` to use `rowToObject` internally — change mapFunc signature from `(row: string[]) => T` to `(record: Record<string, string>) => T`
- [ ] T022 [US2] Update `appendRecord` in `src/database/googleSheetsDbClient.ts` to use `objectToRow` with column schemas — remove `Appendable` interface and `toDatabaseRow` codepath
- [ ] T023 [US2] Update `updateRecord` in `src/database/googleSheetsDbClient.ts` to use `objectToRow` with column schemas

### Update model fromDatabaseRow methods to accept Record<string, string>

- [ ] T024 [P] [US2] Refactor `fromDatabaseRow` in `src/models/shared/registration.ts` to accept `Record<string, string>` — replace all `row[N]` index access with named field access. Remove `typeof window !== 'undefined'` guard (move `isWaitlistClass` detection to repository per research R6)
- [ ] T025 [P] [US2] Refactor `fromDatabaseRow` in `src/models/shared/attendanceRecord.ts` to accept `Record<string, string>` — replace positional access with named field access
- [ ] T026 [P] [US2] Refactor `fromDatabaseRow` in `src/models/shared/class.ts` to accept `Record<string, string>` — replace positional access with named field access
- [ ] T027 [P] [US2] Refactor `fromDatabaseRow` in `src/models/shared/instructor.ts` to accept `Record<string, string>` — replace positional access with named field access
- [ ] T028 [P] [US2] Refactor `fromDatabaseRow` in `src/models/shared/admin.ts` to accept `Record<string, string>` — replace positional access with named field access
- [ ] T029 [P] [US2] Refactor `fromDatabaseRow` in `src/models/shared/parent.ts` to accept `Record<string, string>` — replace positional access with named field access
- [ ] T030 [P] [US2] Refactor `fromDatabaseRow` in `src/models/shared/student.ts` to accept `Record<string, string>` — replace positional access with named field access
- [ ] T031 [P] [US2] Refactor `fromDatabaseRow` in `src/models/shared/room.ts` to accept `Record<string, string>` — replace positional access with named field access
- [ ] T032 [P] [US2] Refactor `fromDatabaseRow` in `src/models/shared/dropRequest.ts` to accept `Record<string, string>` — replace positional access with named field access

### Remove toDatabaseRow from models

- [ ] T033 [P] [US2] Remove `toDatabaseRow()` method from `src/models/shared/registration.ts` — DB client handles object-to-row conversion via column schema
- [ ] T034 [P] [US2] Remove `toDatabaseRow()` method from `src/models/shared/attendanceRecord.ts` — DB client handles object-to-row conversion via column schema

### Update repositories to match new DB client signatures

- [ ] T035 [P] [US2] Update `src/repositories/registrationRepository.ts` — update all `getAllRecords` mapFunc calls to match new `(record: Record<string, string>) => T` signature. Move `isWaitlistClass` detection (title check) into repository after Registration construction
- [ ] T036 [P] [US2] Update `src/repositories/userRepository.ts` — update `getAllRecords` mapFunc calls for Admin, Instructor, Student, Parent, Room
- [ ] T037 [P] [US2] Update `src/repositories/attendanceRepository.ts` — update `getAllRecords` mapFunc calls
- [ ] T038 [P] [US2] Update `src/repositories/dropRequestRepository.ts` — update `getAllRecords` mapFunc calls
- [ ] T039 [P] [US2] Update `src/repositories/programRepository.ts` — update `getAllRecords` mapFunc calls (Class model)

### Update PeriodService

- [ ] T040 [US2] Update `_parsePeriodRow` in `src/services/periodService.ts` to accept `Record<string, string>` instead of `string[]` — replace `row[0]`, `row[1]`, `row[2]` with named field access using `PERIOD_COLUMNS`

### Update tests for new signatures

- [ ] T041 [US2] Update test mocks and fixtures in `tests/` — update any test that passes `string[]` to `fromDatabaseRow` or mocks `getAllRecords` mapFunc to use `Record<string, string>` instead. Update DB client mocks to reflect new `rowToObject`-based pipeline. Per FR-008/SC-005: change mock *input formats*, NOT expected *output assertions*
- [ ] T042 [US2] Run `npm run typecheck` and `npm test` — confirm 544/544 pass, zero type errors

**Checkpoint**: Column schemas defined on all models. DB client uses schemas for row↔object conversion. All models receive named fields. Registration config defined once. `workingSheetInfo` under 80 lines. `grep -rn 'row\[' src/models/shared/` returns nothing. All 544 tests pass.

---

## Phase 4: US3 — Sheets-Specific Parsing Hidden in DB Client (Priority: P2)

**Goal**: All Google Sheets format quirks (time parsing, boolean string conversion, date coercion, field renames) are handled in the DB client's transform layer. Models receive clean, typed-ready values.

**Independent Test**: `grep -rn 'parseTimeString\|instanceof Date' src/models/shared/` returns nothing (in `fromDatabaseRow` methods). Models can be constructed from clean test fixtures without Sheets-specific parsing.

### Define field transforms

- [ ] T043 [P] [US3] Define Classes transform map in `src/database/googleSheetsDbClient.ts` — `startTime` → 24h format via `DateHelpers.parseTimeString`, `endTime` → 24h format, `length` → number
- [ ] T044 [P] [US3] Define Instructors transform map in `src/database/googleSheetsDbClient.ts` — `isDeactivated` → rename to `isActive` + invert boolean, `instrument1-4` → collect into `specialties[]`, availability flat fields → nested `availability` object, grades → `gradeRange` object
- [ ] T045 [P] [US3] Define Attendance transform map in `src/database/googleSheetsDbClient.ts` — `week` → number, `attended` → boolean
- [ ] T046 [P] [US3] Define Admin transform map in `src/database/googleSheetsDbClient.ts` — `isDirector` → boolean
- [ ] T047 [P] [US3] Define Periods transform map in `src/database/googleSheetsDbClient.ts` — `trimester` → lowercase, `startDate` → Date

### Wire transforms into DB client pipeline

- [ ] T048 [US3] Wire transform maps into `getAllRecords` pipeline in `src/database/googleSheetsDbClient.ts` — call `applyTransforms` after `rowToObject`, before passing to mapFunc. Associate each transform map with its `SheetConfig` entry

### Remove Sheets-specific parsing from models

- [ ] T049 [P] [US3] Remove `DateHelpers.parseTimeString` call from `fromDatabaseRow` in `src/models/shared/class.ts` — model now receives pre-parsed 24h time strings and numeric length. Keep `DateHelpers` import if used by display-formatting getters (`formattedStartTime`, `formattedEndTime`)
- [ ] T050 [P] [US3] Remove `!isDeactivated` inversion and flat-to-nested restructuring from `fromDatabaseRow` in `src/models/shared/instructor.ts` — model now receives `isActive: boolean`, `specialties: string[]`, nested `availability` object, `gradeRange` object
- [ ] T051 [P] [US3] Remove boolean string parsing from `fromDatabaseRow` in `src/models/shared/attendanceRecord.ts` — `attended` arrives as boolean, `week` arrives as number
- [ ] T052 [P] [US3] Remove boolean string parsing from `fromDatabaseRow` in `src/models/shared/admin.ts` — `isDirector` arrives as boolean

### Update tests and verify

- [ ] T053 [US3] Update test mocks and fixtures in `tests/` — update any test that relies on models receiving raw Sheets strings for fields that are now pre-transformed (times, booleans, nested objects). Per FR-008/SC-005: change mock *input formats*, NOT expected *output assertions*
- [ ] T054 [US3] Run `npm run typecheck` and `npm test` — confirm 544/544 pass
- [ ] T055 [US3] Verify: `grep -rn 'parseTimeString\|instanceof Date' src/models/shared/` returns nothing in `fromDatabaseRow` methods (display getters are acceptable)

**Checkpoint**: All Sheets-specific parsing isolated in DB client transform layer. Models are storage-agnostic. Same model constructors work with both Sheets data and clean test fixtures.

---

## Phase 5: US4 — Audit Trail Migration (Priority: P2)

**Goal**: Audit record creation moves from the DB client to repositories. The DB client becomes a generic read/write adapter with no domain knowledge.

**Independent Test**: `grep -rn 'RegistrationRecord\|AttendanceRecord\|createRegistrationAudit\|createAttendanceAudit' src/database/googleSheetsDbClient.ts` returns nothing.

### Build audit creation in repositories

- [ ] T056 [P] [US4] Add audit record builder and write methods to `src/repositories/registrationRepository.ts` — create `#writeAuditRecord` that builds audit record from registration data and appends to the trimester audit sheet via DB client
- [ ] T057 [P] [US4] Add audit record builder and write methods to `src/repositories/attendanceRepository.ts` — create `#writeAuditRecord` that builds audit record from attendance data and appends to attendance audit sheet via DB client

### Wire audit writes into repository operations

- [ ] T058 [US4] Update `create` / `createInTable` in `src/repositories/registrationRepository.ts` to write audit records after the main write
- [ ] T059 [US4] Update `updateIntent` in `src/repositories/registrationRepository.ts` to write audit records
- [ ] T060 [US4] Update `delete` / `deleteFromTable` in `src/repositories/registrationRepository.ts` to write audit records
- [ ] T061 [US4] Update `create` / `recordAttendance` / `removeAttendance` in `src/repositories/attendanceRepository.ts` to write audit records

### Remove audit logic from DB client

- [ ] T062 [US4] Remove `#createRegistrationAuditRecord` method from `src/database/googleSheetsDbClient.ts`
- [ ] T063 [US4] Remove `#createAttendanceAuditRecord` method from `src/database/googleSheetsDbClient.ts`
- [ ] T064 [US4] Remove `RegistrationRecord` and `AttendanceRecord` interfaces from `src/database/googleSheetsDbClient.ts`
- [ ] T065 [US4] Simplify `appendRecord` in `src/database/googleSheetsDbClient.ts` — remove `if (auditSheet)` branching logic
- [ ] T066 [US4] Simplify `deleteRecord` in `src/database/googleSheetsDbClient.ts` — remove the audit-writing side effect

### Update tests and verify

- [ ] T067 [US4] Update test mocks in `tests/` — DB client tests no longer expect audit side effects; repository tests now verify audit writes. Per FR-008/SC-005: change mock *input formats*, NOT expected *output assertions*
- [ ] T068 [US4] Run `npm run typecheck` and `npm test` — confirm 544/544 pass

**Checkpoint**: DB client contains zero domain-specific type references. Audit trail creation is testable at repository level. `appendRecord` and `deleteRecord` are simple, side-effect-free operations.

---

## Phase 6: US5 — BaseRepository Simplification + Cleanup (Priority: P3)

**Goal**: Simplify `BaseRepository` to provide only genuinely shared behavior. Remove unused DB client methods. Remove vestigial configs.

**Independent Test**: `npm test` passes 544/544. Each repository's public API is unchanged.

### Simplify BaseRepository

- [ ] T069 [US5] Simplify `src/repositories/baseRepository.ts` — provide only: `dbClient`, `logger`, `entityName`, and default `findAll`/`findById` implementations that use model column schemas. Remove `ModelClass` generic interface
- [ ] T070 [US5] Update `src/repositories/userRepository.ts` — adapt to simplified base (or stop extending if cleaner)
- [ ] T071 [US5] Update `src/repositories/dropRequestRepository.ts` — use base `findAll`/`findById` where possible instead of overriding every method

### Remove unused DB client methods

- [ ] T072 [P] [US5] Remove `getFromSheetByColumnValue` from `src/database/googleSheetsDbClient.ts` — zero production callers
- [ ] T073 [P] [US5] Remove `getFromSheetByColumnValueSingle` from `src/database/googleSheetsDbClient.ts` — zero production callers
- [ ] T074 [P] [US5] Remove `batchWrite` from `src/database/googleSheetsDbClient.ts` — zero production callers
- [ ] T075 [P] [US5] Remove `getAllDataParallel` from `src/database/googleSheetsDbClient.ts` — zero production callers
- [ ] T076 [P] [US5] Remove `getMaxIdFromSheet` from `src/database/googleSheetsDbClient.ts` — zero production callers
- [ ] T077 [P] [US5] Remove `archiveSheet` from `src/database/googleSheetsDbClient.ts` — zero production callers

### Remove vestigial config

- [ ] T078 [US5] Remove vestigial `Keys.REGISTRATIONSAUDIT` sheet config from `src/database/googleSheetsDbClient.ts` if confirmed unused (per research R4)

### Verify

- [ ] T079 [US5] Run `npm run typecheck` and `npm test` — confirm 544/544 pass

**Checkpoint**: BaseRepository provides only shared behavior. DB client surface area reduced by 6 methods. No vestigial configs remain.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification against all success criteria

- [ ] T080 Run full quickstart.md validation: `npm run typecheck`, `npm test` (544 expected), `grep -rn 'row\[' src/models/shared/` (zero results), `grep -rn 'parseTimeString\|instanceof Date' src/models/shared/` (zero results in fromDatabaseRow methods)
- [ ] T081 Verify SC-001: Zero column-index references (`row[N]`) in any model file under `src/models/shared/`
- [ ] T082 Verify SC-002: `workingSheetInfo` block in `src/database/googleSheetsDbClient.ts` is under 80 lines
- [ ] T083 Verify SC-003: Registration column schema appears exactly 1 time. Audit column schema appears exactly 1 time
- [ ] T084 Verify SC-004: `src/database/googleSheetsDbClient.ts` contains zero references to domain-specific types (`RegistrationRecord`, `AttendanceRecord`) and zero audit-construction logic. Field transform definitions referencing column names are acceptable
- [ ] T085 Verify SC-005: All 544 tests pass with no modifications to test assertions
- [ ] T086 Verify SC-006: No `fromDatabaseRow` in `src/models/shared/` calls Sheets-specific parsing (`DateHelpers.parseTimeString`, `instanceof Date` guards)
- [ ] T087 Verify SC-007: Adding a new column to registration schema requires changing exactly 1 file

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1+US2+US6 (Phase 3)**: Depends on Phase 2 — the foundational change
- **US3 (Phase 4)**: Depends on Phase 3 — transform layer needs named-field pipeline
- **US4 (Phase 5)**: Depends on Phase 3 — audit migration needs new DB client write paths. Can run in parallel with US3
- **US5 (Phase 6)**: Depends on Phases 3, 4, and 5 — cleanup after all functional changes
- **Polish (Phase 7)**: Depends on all previous phases

### User Story Dependencies

- **US1+US2+US6 (P1)**: Co-dependent — must be implemented together. Column schemas (US1) enable named fields (US2), and both enable dedup (US6)
- **US3 (P2)**: Depends on US1+US2 — transform layer needs the named-field pipeline
- **US4 (P2)**: Depends on US1+US2 — audit migration needs new write paths. **Can run in parallel with US3** (different files, no overlap)
- **US5 (P3)**: Depends on all prior — cleanup pass

### Within Phase 3 (US1+US2+US6)

1. Add `static columns` to all models (T008–T019) — parallel, no cross-file deps
2. Rewrite `workingSheetInfo` + DB client read/write paths (T020–T023) — sequential, DB client changes
3. Update model `fromDatabaseRow` methods (T024–T032) — parallel, different model files
4. Remove `toDatabaseRow` (T033–T034) — parallel, after write path updated
5. Update repositories (T035–T039) — parallel, different repository files
6. Update PeriodService (T040) — after DB client changes
7. Update tests and verify (T041–T042) — sequential, final validation

### Parallel Opportunities

**Phase 3 — Adding static columns (T008–T019)**:
```
T008 (Registration columns) | T010 (Attendance columns) | T012 (Admin columns)
T013 (Instructor columns) | T014 (Parent columns) | T015 (Student columns)
T016 (Room columns) | T017 (Class columns) | T018 (DropRequest columns)
```

**Phase 3 — Model refactors (T024–T032)**:
```
T024 (Registration) | T025 (Attendance) | T026 (Class) | T027 (Instructor)
T028 (Admin) | T029 (Parent) | T030 (Student) | T031 (Room) | T032 (DropRequest)
```

**Phase 4 + Phase 5 can run in parallel**:
```
US3 (Field Transforms) | US4 (Audit Migration)
```

**Phase 6 — Removing unused methods (T072–T077)**:
```
T072 | T073 | T074 | T075 | T076 | T077
```

---

## Implementation Strategy

### MVP First (Phase 3: US1+US2+US6)

1. Complete Phase 1: Setup (verify baseline)
2. Complete Phase 2: Foundational (add utility methods)
3. Complete Phase 3: US1+US2+US6 (column schemas, named fields, dedup)
4. **STOP and VALIDATE**: Run quickstart.md checks — this is the core refactoring
5. All models receive named fields, all column schemas defined once

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Phase 3 (US1+US2+US6) → Core refactoring complete → **Validate** (MVP!)
3. Phase 4 (US3) → Sheets parsing isolated → **Validate**
4. Phase 5 (US4) → Audit logic in repositories → **Validate**
5. Phase 6 (US5) → Cleanup and dead code removal → **Validate**
6. Phase 7 → Final verification against all success criteria

### Key Risk Mitigation

Phase 3 is the widest change (~15 files). Mitigated by:
- Each step is mechanically verifiable (tests pass or they don't)
- Static columns can be added to all models in parallel with zero risk
- Model refactors are independent per file
- Repository updates are independent per file
- Run `npm test` after each logical group of changes

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No tests are generated (not requested) — existing 544 tests serve as regression suite
- Commit after each phase or logical group within a phase
- Stop at any checkpoint to validate independently
- All verification commands are in quickstart.md
