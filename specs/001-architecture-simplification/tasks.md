# Tasks: Architecture Simplification

**Input**: Design documents from `/specs/001-architecture-simplification/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested. Test tasks are limited to running the existing test suite at phase boundaries.

**Organization**: Tasks follow the bottom-up dependency chain: models → database → API → frontend → cleanup. User stories map to these layers. Stories 1-2 (P1) are foundational — everything else depends on them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No project initialization needed — this is a refactoring of an existing codebase. This phase handles pre-work.

- [ ] T001 Create a working branch from `001-architecture-simplification` for implementation
- [ ] T002 Run existing test suite to establish green baseline: `npm test`

---

## Phase 2: User Story 1 — Consistent Entity Identity (Priority: P1) 🎯 MVP

**Goal**: All model IDs are plain strings. No value objects. No defensive unwrapping.

**Independent Test**: All existing tests pass with plain string IDs. Zero `extractStringValue`, `extractValue`, `?.value` on ID fields in model files.

### 2A: Remove value object IDs from models

- [ ] T003 [P] [US1] Remove `StudentId` wrapping from `this.id` in `src/models/shared/student.js` — store `data.id || data.studentId` as plain string
- [ ] T004 [P] [US1] Remove `Email` wrapping from `this.email` in `src/models/shared/student.js` — store as plain string
- [ ] T005 [P] [US1] Remove `Age` wrapping from `this.age` in `src/models/shared/student.js` — store as plain number
- [ ] T006 [P] [US1] Remove `RegistrationId` wrapping from `this.id`, `StudentId` from `this.studentId`, `InstructorId` from `this.instructorId` in `src/models/shared/registration.js` — store all as plain strings
- [ ] T007 [US1] Update `Registration.createNew()` in `src/models/shared/registration.js` to generate UUID directly (inline `crypto.randomUUID()` or `uuid`) instead of `new RegistrationId()`

### 2B: Remove extractStringValue / extractValue helpers

- [ ] T008 [P] [US1] Delete `extractStringValue` function and all its call sites in `src/models/shared/student.js`
- [ ] T009 [P] [US1] Delete `extractStringValue` function and all its call sites in `src/models/shared/registration.js`
- [ ] T010 [P] [US1] Delete `extractStringValue` function and all its call sites in `src/models/shared/instructor.js`
- [ ] T011 [US1] Delete `extractValue` helper inside `Registration.toDataObject()` in `src/models/shared/registration.js` — IDs are now plain strings, direct property access is sufficient
- [ ] T012 [US1] Delete `extractValue` function inside `#createRegistrationAuditRecord` and `#createAttendanceAuditRecord` in `src/database/googleSheetsDbClient.js` — replace with direct property access
- [ ] T013 [US1] Delete `extractValue` function in `src/services/registrationConflictService.js` — replace with direct property access

### 2C: Delete value object files

- [ ] T014 [P] [US1] Delete `src/utils/values/studentId.js`
- [ ] T015 [P] [US1] Delete `src/utils/values/instructorId.js`
- [ ] T016 [P] [US1] Delete `src/utils/values/registrationId.js`
- [ ] T017 [P] [US1] Delete `src/utils/values/age.js`
- [ ] T018 [P] [US1] Delete `src/utils/values/email.js`
- [ ] T019 [P] [US1] Delete `src/utils/values/lessonTime.js`
- [ ] T020 [P] [US1] Delete `src/utils/values/registrationType.js` (never imported)
- [ ] T021 [P] [US1] Delete `src/utils/values/lengthOptions.js` (never imported)
- [ ] T022 [US1] Update `src/utils/values/index.js` to remove exports for all deleted value object files
- [ ] T023 [US1] Remove all imports of deleted value objects across the codebase (search for `import.*from.*values/studentId`, `values/registrationId`, `values/instructorId`, `values/age`, `values/email`, `values/lessonTime`)

### 2D: Update tests

- [ ] T024 [US1] Update unit tests that construct models with value object IDs to pass plain strings instead — search `tests/` for `new StudentId`, `new RegistrationId`, `new InstructorId`
- [ ] T025 [US1] Run test suite to verify: `npm test`

**Checkpoint**: All IDs are plain strings. No value objects exist. Tests pass.

---

## Phase 3: User Story 2 — Single Serialization Path (Priority: P1)

**Goal**: Every model has `toJSON()` as its only serialization method. No `toDataObject()`, no `UserTransformService`.

**Independent Test**: `JSON.stringify(anyModel)` produces flat object with string IDs and one canonical name per field. Zero `toDataObject` or `UserTransformService` references.

**Depends on**: Phase 2 (IDs must be plain strings for `toJSON()` to produce clean output)

### 3A: Standardize toJSON() on each model

- [ ] T026 [P] [US2] Add `toJSON()` to Student in `src/models/shared/student.js` based on current `toDataObject()` output, then delete `toDataObject()` and `fromDataObject()`
- [ ] T027 [P] [US2] Inline `toDataObject()` logic into `toJSON()` in `src/models/shared/registration.js`, then delete `toDataObject()`. Simplify: no `extractValue` needed, IDs are plain strings
- [ ] T028 [P] [US2] Inline `toDataObject()` logic into `toJSON()` in `src/models/shared/instructor.js`, then delete `toDataObject()`. Delete `toDatabaseModel()` (dead code)
- [ ] T029 [P] [US2] Rename `phoneNumber` to `phone` in Admin constructor and `toJSON()` in `src/models/shared/admin.js` to match DB column name. Delete `toDatabaseModel()` (dead code)
- [ ] T030 [US2] Simplify `Registration.toDatabaseRow()` in `src/models/shared/registration.js` — use direct property access instead of `.getValue()` / `.value` (IDs are plain strings now)

### 3B: Delete UserTransformService

- [ ] T031 [US2] Delete `src/services/userTransformService.js`
- [ ] T032 [US2] Update `src/controllers/userController.js` — remove all `UserTransformService` imports and calls (`transformArray`, `transform`). Pass model arrays/instances directly to `successResponse()` (Express calls `toJSON()` automatically)
- [ ] T033 [US2] Verify `AuthenticatedUserResponse.toJSON()` in `src/models/shared/responses/authenticatedUserResponse.js` delegates to each model's `toJSON()` correctly with the new shapes

### 3C: Update frontend for field name changes

- [ ] T034 [US2] Update `src/web/js/tabs/employeeDirectoryTab.js` — change `admin.phoneNumber` to `admin.phone`, remove `instructor.phoneNumber || instructor.phone` fallback to just `instructor.phone`
- [ ] T035 [US2] Update `src/web/js/main.js` — change `director.phoneNumber` references to `director.phone`
- [ ] T036 [US2] Search all frontend files in `src/web/` for remaining `phoneNumber` references and update to `phone`
- [ ] T037 [US2] Run test suite to verify: `npm test`

**Checkpoint**: One serialization path per model. No dual-name fields. Tests pass.

---

## Phase 4: User Story 5 — Clean Database Layer (Priority: P2)

**Goal**: Single `appendRecord` method. Clean `fromDatabaseRow()` output. Simple string comparisons in repositories.

**Independent Test**: No `appendRecordv2` exists. All `findById` methods use `===` with no unwrapping.

**Depends on**: Phase 2 (IDs must be plain strings)

> Note: User Story 5 is implemented before Stories 3-4 because the database layer sits between models (Phase 2) and the API (Phase 5). Stories 3-4 depend on a clean database layer.

### 4A: Consolidate appendRecord

- [ ] T038 [US5] Merge `appendRecordv2` logic into `appendRecord` in `src/database/googleSheetsDbClient.js` — prefer `toDatabaseRow()` when available, fall back to `#convertObjectToRow()`, always use `valueInputOption: 'RAW'`
- [ ] T039 [US5] Update `src/repositories/registrationRepository.js` — change all `appendRecordv2` calls to `appendRecord`
- [ ] T040 [US5] Delete `appendRecordv2` method from `src/database/googleSheetsDbClient.js`

### 4B: Clean up repository ID handling

- [ ] T041 [P] [US5] Simplify `src/repositories/registrationRepository.js` — remove all `.getValue()`, `.value`, `?.value || ` patterns. Use plain `===` string comparison for all ID comparisons. Remove `RegistrationId` import and wrapping in `delete()` and `getById()`
- [ ] T042 [P] [US5] Simplify `src/repositories/userRepository.js` — remove `typeof id === 'object' && id.value` checks in `getInstructorById()` and `getStudentById()`. Use plain `===` string comparison
- [ ] T043 [US5] Run test suite to verify: `npm test`

**Checkpoint**: One write method. Simple ID comparisons. Tests pass.

---

## Phase 5: User Stories 3 & 4 — Uniform API Responses + Single Frontend Fetch (Priority: P2)

**Goal**: All endpoints return `{ success, data }` envelope. All frontend fetches go through HttpService.

**Independent Test**: No raw `res.json()` in controllers. No direct `fetch()` in frontend outside HttpService.

**Depends on**: Phases 2-4 (models, serialization, database must be clean)

> Note: Stories 3 and 4 are combined into one phase because the auth endpoint change requires coordinated backend + frontend updates.

### 5A: Fix API response envelope violations

- [ ] T044 [US3] Wrap `authenticateByAccessCode` success response in `successResponse()` and failure in `errorResponse()` in `src/controllers/userController.js` — replace `res.json(authenticatedUser)` and `res.json(null)`
- [ ] T045 [P] [US3] Wrap `testConnection` response in `successResponse()` in `src/controllers/systemController.js`
- [ ] T046 [P] [US3] Wrap `testSheetData` response in `successResponse()` in `src/controllers/systemController.js`
- [ ] T047 [P] [US3] Wrap `clearCache` response in `successResponse()` in `src/controllers/systemController.js`

### 5B: Remove defensive ID unwrapping from controllers

- [ ] T048 [P] [US3] Remove all `typeof id === 'object' && id.value ? id.value : id` patterns from `src/controllers/userController.js` (especially `getParentContactTabData`)
- [ ] T049 [P] [US3] Remove all `?.value || ` ID unwrapping patterns from `src/controllers/registrationController.js` (in `getAdminWaitListTabData`, `getInstructorWeeklyScheduleTabData`, `getParentWeeklyScheduleTabData`, `getParentRegistrationTabData`, `createNextTrimesterRegistration`)

### 5C: Remove defensive ID unwrapping from services

- [ ] T050 [P] [US3] Remove `.value` / `.getValue()` ID access in `src/services/registrationApplicationService.js` — use plain property access for `registration.studentId`, `registration.instructorId`
- [ ] T051 [P] [US3] Remove `.getValue()` / defensive unwrapping in `src/services/dropRequestService.js` — use plain property access

### 5D: Route all frontend fetches through HttpService

- [ ] T052 [US4] Update `src/web/js/main.js` — replace 4 direct `fetch()` calls (lines ~212, ~255, ~336, ~396) with `HttpService.fetch()` or `HttpService.post()` calls
- [ ] T053 [US4] Update `src/web/js/viewModel.js` — replace direct `fetch()` PATCH call (line ~450) with `HttpService.patch()`
- [ ] T054 [US4] Update frontend auth handler in `src/web/js/viewModel.js` `#attemptLoginWithCode` — handle the new envelope format (auth failures now throw errors instead of returning null)
- [ ] T055 [P] [US4] Update `src/web/js/tabs/parentWeeklyScheduleTab.js` — replace direct `fetch()` with `HttpService.fetch()`, remove manual `result.data || result` unwrap
- [ ] T056 [P] [US4] Update `src/web/js/tabs/parentContactTab.js` — replace direct `fetch()` with `HttpService.fetch()`, remove manual unwrap
- [ ] T057 [P] [US4] Update `src/web/js/tabs/parentRegistrationTab.js` — replace direct `fetch()` with `HttpService.fetch()`, remove manual unwrap
- [ ] T058 [P] [US4] Update `src/web/js/tabs/employeeDirectoryTab.js` — replace direct `fetch()` with `HttpService.fetch()`, remove manual unwrap
- [ ] T059 [P] [US4] Update `src/web/js/tabs/adminRegistrationTab.js` — replace direct `fetch()` with `HttpService.fetch()`, remove manual unwrap
- [ ] T060 [P] [US4] Update `src/web/js/tabs/adminWaitListTab.js` — replace direct `fetch()` with `HttpService.fetch()`, remove manual unwrap
- [ ] T061 [P] [US4] Update `src/web/js/tabs/instructorWeeklyScheduleTab.js` — replace direct `fetch()` with `HttpService.fetch()`, remove manual unwrap
- [ ] T062 [P] [US4] Update `src/web/js/tabs/adminMasterScheduleTab.js` — replace direct `fetch()` with `HttpService.fetch()`, remove manual unwrap
- [ ] T063 [US4] Delete `src/web/js/data/apiClient.js` (empty class) and remove its import from `src/web/js/main.js`

### 5E: Remove frontend defensive ID unwrapping

- [ ] T064 [P] [US4] Remove all `?.value || ` and `typeof id === 'object' ? id.value : id` patterns from `src/web/js/viewModel.js`
- [ ] T065 [P] [US4] Remove all `?.value || ` patterns from `src/web/js/tabs/parentWeeklyScheduleTab.js` (~25 occurrences)
- [ ] T066 [P] [US4] Remove all `?.value || ` patterns from `src/web/js/tabs/adminMasterScheduleTab.js` (~25 occurrences)
- [ ] T067 [P] [US4] Remove all `?.value || ` patterns from `src/web/js/tabs/adminWaitListTab.js` (~10 occurrences)
- [ ] T068 [P] [US4] Remove all `?.value || ` patterns from `src/web/js/tabs/instructorWeeklyScheduleTab.js` (~5 occurrences)
- [ ] T069 [P] [US4] Remove all `?.value || ` and `typeof` checks from `src/web/js/workflows/parentRegistrationForm.js` (~20 occurrences)
- [ ] T070 [P] [US4] Remove all `?.value || ` patterns from `src/web/js/workflows/adminRegistrationForm.js` (~10 occurrences)
- [ ] T071 [P] [US4] Remove `typeof id === 'object' ? id.value : id` from `src/web/js/components/registrationForm/studentSelector.js`
- [ ] T072 [P] [US4] Remove all `?.value || ` patterns from `src/web/js/tabs/baseTab.js` (4 occurrences)
- [ ] T073 [P] [US4] Remove `?.value || ` pattern from `src/web/js/components/classManager.js` (1 occurrence)
- [ ] T074 [US4] Run test suite and build frontend to verify: `npm test && npm run build:frontend`

**Checkpoint**: All API responses enveloped. All frontend fetches through HttpService. No defensive unwrapping anywhere. Tests pass.

---

## Phase 6: User Stories 6 & 7 — Dead Code Removal + Constructor Standardization (Priority: P3)

**Goal**: No dead properties/methods in models. All constructors use `constructor(data)` pattern.

**Independent Test**: Every model property traces to a DB column or active caller. All constructors accept a single data object.

**Depends on**: Phases 2-5 (some dead code is only identifiable after prior cleanup)

### 6A: Remove dead model code

- [ ] T075 [P] [US6] Remove from Admin in `src/models/shared/admin.js`: properties `permissions`, `lastLoginDate`; methods `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`, `updateLastLogin()`, `validate()`; getters `isSuperAdmin`, `daysSinceLastLogin`; factory `fromDatabase()`
- [ ] T076 [P] [US6] Remove from Student in `src/models/shared/student.js`: properties `emergencyContactName`, `emergencyContactPhone`, `medicalNotes`, `dateOfBirth`, `createdAt`, `updatedAt`; methods `getAgeCategory()`, `canTakeAdvancedLessons()`, `needsSpecialAccommodations()`, `getRecommendedLessonDuration()`, `toEnrolledEvent()`, `updateContactInfo()`, `addMedicalNotes()`, `setActiveStatus()`, `requiresParentPermission()`; factory `createNew()`
- [ ] T077 [P] [US6] Remove from Instructor in `src/models/shared/instructor.js`: properties `bio`, `yearsExperience`, `certifications`, `hireDate`; methods `hasCertification()`, `canTeach()`, `isAvailableOnDay()`, `getDayAvailability()`, `canTeachGrade()`, `validate()`; getters `yearsOfService`, `seniorityLevel`, `formattedCertifications`, `availableDays`; factory `fromDatabase()`
- [ ] T078 [P] [US6] Remove from Parent in `src/models/shared/parent.js`: properties `alternatePhone`, `address`, `isEmergencyContact`, `relationship`, `isActive`; methods `canBeEmergencyContact()`, `validate()`; getters `allPhones`, `formattedPrimaryPhone`, `contactSummary`; factory `create()`
- [ ] T079 [P] [US6] Remove from Class in `src/models/shared/class.js`: properties `roomId` (options, not DB), `description` (not DB), `isActive` (not DB); methods `validate()`, `gradeToNumber()`; factory `create()`
- [ ] T080 [P] [US6] Remove from Room in `src/models/shared/room.js`: properties `capacity`, `location`, `equipment`, `description`, `isActive`; methods `hasEquipment()`, `addEquipment()`, `removeEquipment()`, `isSuitableForInstrument()`, `canAccommodate()`, `validate()`; getters `sizeCategory`, `fullLocation`, `formattedEquipment`; factory `create()`
- [ ] T081 [P] [US6] Remove from Registration in `src/models/shared/registration.js`: methods `isPrivateLesson()`, `isGroupClass()`, `getDurationMinutes()`, `getFormattedTime()`, `generateSchedule()`; factory `fromApiData()`
- [ ] T082 [US6] Remove unused factory methods: `Student.fromApiData()` and `fromDataObject()`, `Class.fromApiData()`, `Room.fromApiData()` — verify none are called by `AuthenticatedUserResponse` first

### 6B: Delete dead model files

- [ ] T083 [P] [US6] Delete `src/models/shared/requests/studentRequests.js`
- [ ] T084 [P] [US6] Delete `src/models/shared/responses/studentResponses.js`
- [ ] T085 [US6] Remove imports/exports of deleted files from any barrel `index.js` files in `src/models/shared/`

### 6C: Standardize constructor signatures

- [ ] T086 [P] [US7] Convert Parent constructor from positional `(id, email, lastName, firstName, options)` to `constructor(data)` in `src/models/shared/parent.js`. Update `fromDatabaseRow()` and `fromApiData()` to pass data objects.
- [ ] T087 [P] [US7] Convert Class constructor from positional `(id, instructorId, day, startTime, length, endTime, instrument, title, options)` to `constructor(data)` in `src/models/shared/class.js`. Update `fromDatabaseRow()` and `fromApiData()`.
- [ ] T088 [P] [US7] Convert Room constructor from positional `(id, name, options)` to `constructor(data)` in `src/models/shared/room.js`. Update `fromDatabaseRow()` and `fromApiData()`.
- [ ] T089 [P] [US7] Convert AttendanceRecord constructor from positional `(registrationId, createdAt, createdBy)` to `constructor(data)` in `src/models/shared/attendanceRecord.js`. Update all callers in `src/repositories/attendanceRepository.js`.
- [ ] T090 [US7] Search codebase for any direct `new Parent(`, `new Class(`, `new Room(`, `new AttendanceRecord(` calls that use positional args and update to pass data objects
- [ ] T091 [US7] Run test suite to verify: `npm test`

**Checkpoint**: No dead code. All constructors standardized. Tests pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and full verification.

- [ ] T092 Search entire codebase for any remaining references to deleted files: `StudentId`, `RegistrationId`, `InstructorId`, `UserTransformService`, `ApiClient`, `extractStringValue`, `extractValue`, `toDataObject`, `toDatabaseModel`
- [ ] T093 Search entire codebase for any remaining `?.value` or `typeof.*object.*value` patterns related to ID unwrapping
- [ ] T094 Identify and remove dead controller methods with no routes: `getStudentDetails`, `updateStudent`, `enrollStudent`, `getStudentProgressReport`, `updateRegistration`, `cancelRegistration`, `validateRegistration`, `getRegistrationConflicts`, `register` in `src/controllers/`
- [ ] T095 Run full test suite: `npm test`
- [ ] T096 Build frontend to catch import errors: `npm run build:frontend`
- [ ] T097 Run full build check: `npm run check:all`

**Checkpoint**: All success criteria met. Zero defensive unwrapping. Zero direct fetches. Zero dead code. All tests pass. Build succeeds.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup (no deps)
  └→ Phase 2: US1 - IDs (foundational, blocks everything)
       └→ Phase 3: US2 - Serialization (depends on plain string IDs)
       └→ Phase 4: US5 - Database (depends on plain string IDs)
            └→ Phase 5: US3+US4 - API + Frontend (depends on clean models, DB, serialization)
                 └→ Phase 6: US6+US7 - Dead code + Constructors (depends on all prior cleanup)
                      └→ Phase 7: Polish (depends on all stories)
```

### User Story Dependencies

- **US1 (IDs)**: No dependencies — start immediately after setup
- **US2 (Serialization)**: Depends on US1 (needs plain string IDs for clean `toJSON()`)
- **US5 (Database)**: Depends on US1 (needs plain string IDs for repository cleanup)
- **US3 (API envelope)**: Depends on US2 (needs correct serialization before wrapping in envelope)
- **US4 (Frontend fetch)**: Depends on US3 (needs envelope on all endpoints before routing through HttpService)
- **US6 (Dead code)**: Can start after US2 (model cleanup), but some dead code only visible after US3-US5
- **US7 (Constructors)**: Independent of other stories, but cleanest to do last

### Parallel Opportunities

Within each phase, tasks marked `[P]` can run in parallel:
- Phase 2: T003-T005 (model changes in different files), T008-T010 (extractStringValue removal), T014-T021 (file deletions)
- Phase 3: T026-T029 (toJSON per model)
- Phase 4: T041-T042 (repository cleanup)
- Phase 5: T045-T047 (SystemController), T048-T051 (controller/service cleanup), T055-T062 (tab files), T064-T073 (frontend unwrapping)
- Phase 6: T075-T081 (dead code per model), T083-T084 (file deletions), T086-T089 (constructors)

---

## Implementation Strategy

### MVP First (Phase 2 Only — User Story 1)

1. Complete Phase 1: Setup
2. Complete Phase 2: US1 — plain string IDs everywhere
3. **STOP and VALIDATE**: Run tests. This is the highest-value change and unblocks everything.

### Incremental Delivery

1. Phase 2 (US1: IDs) → Tests pass → Models are clean
2. Phase 3 (US2: Serialization) → Tests pass → API shapes are consistent
3. Phase 4 (US5: Database) → Tests pass → DB layer is clean
4. Phase 5 (US3+US4: API + Frontend) → Tests pass → Full stack is consistent
5. Phase 6 (US6+US7: Dead code + Constructors) → Tests pass → No cruft remains
6. Phase 7 (Polish) → Build succeeds → Ready to merge

Each phase is independently deployable — the codebase is functional after every phase.
