# Research: Architecture Simplification

**Branch**: `001-architecture-simplification` | **Date**: 2026-02-18

## Decision 1: Canonical Field Name — Phone

**Decision**: `phone` is the canonical name.

**Rationale**: The database column maps for admins, instructors, and parents all use `phone` (column index 4). The `Admin` model constructor stores it as `phoneNumber`, which creates the mismatch. `UserTransformService` then produces both `phone` and `phoneNumber` as dual-name fields for API consumers.

**Action**: Admin model should store `phone` (matching DB). Frontend references to `phoneNumber` should change to `phone`. The `displayPhone` computed field is separate and stays as-is (it's a display-formatted version, not a rename).

**Alternatives considered**: Keeping `phoneNumber` as canonical would require renaming the database columns in Google Sheets, which is unnecessary complexity for no benefit.

## Decision 2: Canonical Field Name — Specialties vs Instruments

**Decision**: `specialties` is the canonical model property name. The database stores individual instrument columns (`instrument1`-`instrument4`), and the model aggregates them into a `specialties` array.

**Rationale**: The database has four separate columns (`instrument1`, `instrument2`, `instrument3`, `instrument4`). The `Instructor.fromDatabaseRow()` already aggregates these into a `specialties` array. Every frontend consumer reads `instructor.specialties`. `UserTransformService` produces both `specialties` and `instruments` as dual-name fields — after removing the transform service, only `specialties` survives.

**Action**: Keep `specialties` as the model property. Remove the `instruments` alias from `UserTransformService` (which is being deleted entirely). No frontend changes needed — frontend already uses `specialties` exclusively.

**Alternatives considered**: Renaming to `instruments` would better match the DB column names, but every consumer already uses `specialties` and the aggregation from 4 columns to 1 array is a model responsibility, not a rename.

## Decision 3: `toDataObject()` Fate

**Decision**: Remove `toDataObject()` from all models. Standardize on `toJSON()` only.

**Rationale**: Three models have `toDataObject()`: Student (only serialization), Registration (has both, `toJSON` delegates to `toDataObject`), Instructor (has both, `toJSON` delegates to `toDataObject`). After standardizing `toJSON()` on every model, `toDataObject()` becomes redundant. Registration's `toJSON()` can inline what `toDataObject()` does. Instructor's `toJSON()` can inline what `toDataObject()` does. Student gets a new `toJSON()` based on its current `toDataObject()`.

**Alternatives considered**: Keeping `toDataObject()` as an internal helper called by `toJSON()`. Rejected because it violates the "one serialization path" principle and creates confusion about which method to call.

## Decision 4: Factory Method Consolidation

**Decision**: Keep `fromDatabaseRow()` on all models. Remove `fromApiData()` and `fromDatabase()` where unused or redundant.

**Rationale**:
- `fromDatabaseRow(row)` is used by every repository as the `mapFunc` passed to `getAllRecords()`. This is essential.
- `fromApiData(data)` exists on Student, Registration, Instructor, Parent, Class, Room. It's used by `AuthenticatedUserResponse` to construct nested model instances from API data. Only the models referenced there (Admin, Instructor, Parent) need it.
- `fromDatabase(dbObj)` exists on Admin and Instructor. Never called externally by any code. Dead code — remove.
- `createNew()` / `create()` factory methods: `Registration.createNew()` is called by `registrationApplicationService.js`. Others (`Student.createNew`, `Parent.create`, `Class.create`, `Room.create`) are never called. Remove the unused ones.

**Action**:
- Keep `fromDatabaseRow()` everywhere
- Keep `fromApiData()` on Admin, Instructor, Parent (used by `AuthenticatedUserResponse`)
- Remove `fromApiData()` from Student, Class, Room if not used by `AuthenticatedUserResponse`
- Remove `fromDatabase()` from Admin and Instructor
- Remove `createNew()`/`create()` from Student, Parent, Class, Room
- Keep `Registration.createNew()` (actively used)

## Decision 5: `appendRecord` vs `appendRecordv2` Consolidation

**Decision**: Consolidate into a single `appendRecord` method that prefers `toDatabaseRow()` when available, falls back to `#convertObjectToRow()`, uses `RAW` value input, and handles audit fields consistently.

**Rationale**:
- `appendRecord` (v1): Clones record, mutates with audit fields (`createdAt`/`createdBy`), converts via `#convertObjectToRow()`, uses `USER_ENTERED` value input.
- `appendRecordv2`: Does not clone/mutate, prefers `toDatabaseRow()` on models, uses `RAW` value input.
- The `v2` approach is better — models should own their serialization, and `RAW` avoids Sheets API interpreting values as dates/numbers unexpectedly.
- The audit field behavior needs to be preserved: either the model's `toDatabaseRow()` includes audit fields (Registration already does this), or the consolidated method adds them.

**Action**: Merge into one `appendRecord` that:
1. If record has `toDatabaseRow()`, call it to get the row array
2. Otherwise, add audit fields to a clone and use `#convertObjectToRow()`
3. Always use `RAW` value input
4. Remove `appendRecordv2`

## Decision 6: SystemController Raw Responses

**Decision**: Wrap SystemController endpoints in `successResponse()` alongside the auth endpoint fix.

**Rationale**: Research revealed that `testConnection`, `testSheetData`, `clearCache`, and `getApplicationConfig` in SystemController also use raw `res.json()`. These are admin/debug endpoints but should still follow the uniform response envelope for consistency. The spec's FR-007 requires every endpoint to use the envelope.

**Alternatives considered**: Exempting debug endpoints. Rejected because it creates special cases the frontend must handle differently.

## Decision 7: Dead Value Object Files

**Decision**: Delete `StudentId`, `InstructorId`, `RegistrationId`, `Age`, `Email`, `LessonTime` value object files. Keep `Keys`, `PeriodType`, `Trimester`, `DropRequestStatus` (these are simple enum constants, not value objects).

**Rationale**: After removing value object IDs from models, the ID value objects serve no purpose. `Age` and `Email` are only used by `Student`, which wraps `data.age` and `data.email` — these can become plain values. `LessonTime` is only used internally by `Registration.generateSchedule()`, which is borderline dead code (1 caller in `registrationApplicationService`). `RegistrationType` and `LengthOptions` are already dead (never imported).

**Action**: Delete `studentId.js`, `instructorId.js`, `registrationId.js`, `age.js`, `email.js`, `lessonTime.js`, `registrationType.js`, `lengthOptions.js`. Update `src/utils/values/index.js` to remove their exports.

## Decision 8: Dead Model Files

**Decision**: Delete `studentRequests.js` and `studentResponses.js`.

**Rationale**: Both files define DTO classes (`CreateStudentRequest`, `StudentListResponse`, etc.) that are never imported or used by any controller, service, or frontend code. They are dead code from a planned but never-implemented student CRUD API.

## Decision 9: Auth Endpoint Migration Strategy

**Decision**: Update both backend and frontend in the same change to avoid a broken intermediate state.

**Rationale**: The auth endpoint currently returns raw `res.json(authenticatedUser)`. The frontend's `HttpService` auto-detects the `{ success, data }` envelope and unwraps it — if the envelope is absent, it passes through the raw response. So wrapping the auth response in `successResponse()` means `HttpService` will auto-unwrap it, and the frontend will receive the same shape it does today (the inner `data` object). The null-on-failure case needs attention: currently `res.json(null)` becomes `null` in the frontend. With the envelope, it becomes `errorResponse()` and `HttpService` will throw an error instead. The frontend login handler needs to catch this error instead of checking for null.

## Findings: Actual Scale of Changes

Research revealed the scale is larger than the spec estimated:

| Metric | Spec Estimate | Actual Count |
|--------|--------------|--------------|
| `?.value` / defensive unwrapping patterns | 20+ | ~80+ in frontend alone, plus ~15 in controllers/services |
| Direct `fetch()` outside HttpService | 4+ | 13 across 8 files |
| Dead model properties/methods | 15+ | 40+ properties/methods, plus 4 entirely dead files |
| Endpoints bypassing response envelope | 1 (auth) | 5 (auth + 4 SystemController) |
| Models needing constructor change | 2 (Parent, Class) | 4 (Parent, Class, Room, AttendanceRecord) |

## Findings: Additional Issues Discovered

1. **`Instructor.id` is already a plain string** — not wrapped in `InstructorId`, despite `InstructorId` value object existing. Only `Registration` wraps `instructorId` in `InstructorId`.

2. **`Admin.phone` vs `Admin.phoneNumber` mismatch** — DB column is `phone`, Admin model stores as `phoneNumber`. This is the root of the dual-name field issue.

3. **`Registration.toJSON()` delegates to `toDataObject()` which has its own internal `extractValue`** — a third copy of value-object unwrapping, separate from the `extractStringValue` functions in model files.

4. **`DropRequestRepository.fromDatabaseRow` column indices may not match the DB column map** — potential bug where `reason` is read from index 3 but the column map has `trimester` at index 3. Needs verification during implementation.

5. **Controller methods with no routes** — `getStudentDetails`, `updateStudent`, `enrollStudent`, `getStudentProgressReport`, `updateRegistration`, `cancelRegistration`, `validateRegistration`, `getRegistrationConflicts`, and `register` (legacy) are defined but not wired in `api.js`. These are dead code candidates.

6. **Two-tiered cache** — DB-level 5-minute cache on raw rows, plus a separate in-memory `_enrichedStudentsCache` in `UserRepository.getStudents()`. The enrichment cache may need attention if model shapes change.
