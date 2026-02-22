# Tasks: Backend Test Coverage

**Input**: Design documents from `/specs/006-backend-test-coverage/`
**Prerequisites**: plan.md (required), spec.md (required), research.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Create test directory structure for new test files

- [ ] T001 Create test directory structure: `tests/unit/controllers/`, `tests/unit/utils/` (services/ and repositories/ already exist)

---

## Phase 2: User Story 1 - Service Layer Tests (Priority: P1) 🎯 MVP

**Goal**: Comprehensive tests for `registrationApplicationService` and `dropRequestService` — the two core orchestration services

**Independent Test**: Run `npm test -- tests/unit/services/registrationApplicationService.test.ts tests/unit/services/dropRequestService.test.ts` and verify all tests pass with mocked dependencies

### Implementation

- [ ] T002 [US1] Write tests for `RegistrationApplicationService.processRegistration` (group registration success, duplicate conflict, private lesson success, bus restriction, Rock Band waitlist, admin skip capacity) in `tests/unit/services/registrationApplicationService.test.ts` — mock serviceContainer, registrationRepository, userRepository, programRepository, auditService, RegistrationValidationService, RegistrationConflictService
- [ ] T003 [US1] Write tests for `RegistrationApplicationService.cancelRegistration` (success with audit, missing registration) in `tests/unit/services/registrationApplicationService.test.ts`
- [ ] T004 [US1] Write tests for `RegistrationApplicationService.getRegistrations` (enrichment with batch joins for students, instructors, classes) in `tests/unit/services/registrationApplicationService.test.ts`
- [ ] T005 [US1] Write tests for `DropRequestService.createDropRequest` (success during REGISTRATION period, authorization failure for wrong parent, invalid period error, duplicate pending request) in `tests/unit/services/dropRequestService.test.ts` — mock serviceContainer, dropRequestRepository, registrationRepository, userRepository (studentRepository), periodService
- [ ] T006 [US1] Write tests for `DropRequestService.approveDropRequest` and `rejectDropRequest` (success with status transition and reviewer info, registration deletion on approve, invalid status transition from approved/rejected) in `tests/unit/services/dropRequestService.test.ts`
- [ ] T007 [US1] Write tests for `DropRequestService.getPendingDropRequests`, `getDropRequestsByParent`, `getDropRequestById` (enrichment with student/registration data, not-found error) in `tests/unit/services/dropRequestService.test.ts`
- [ ] T008 [US1] Run service layer tests and verify all pass: `npm test -- tests/unit/services/registrationApplicationService.test.ts tests/unit/services/dropRequestService.test.ts`

**Checkpoint**: Service layer tests complete — registration and drop request business logic verified

---

## Phase 3: User Story 2 - Controller Layer Tests (Priority: P2)

**Goal**: Tests for `userController`, `attendanceController`, `systemController`, `feedbackController` — verifying HTTP input handling, validation, and response formatting

**Independent Test**: Run `npm test -- tests/unit/controllers/` and verify all tests pass

### Implementation

- [ ] T009 [US2] Write tests for `UserController.getAppConfiguration` (trimester sequencing: Intent→[prev,current], Enrollment→[current,next], no period→[fall], nextTrimester from sequence not next period; test all 3 trimesters × all period types) in `tests/unit/controllers/userController.test.ts` — mock serviceContainer (periodService, configService), successResponse, errorResponse
- [ ] T010 [US2] Write tests for `UserController.authenticateByAccessCode` (10-digit phone→parent lookup, 6-digit code→admin then instructor, no match→null data, fallback attempts) in `tests/unit/controllers/userController.test.ts`
- [ ] T011 [US2] Write tests for `UserController.getAdminByAccessCode`, `getInstructorByAccessCode`, `getParentByAccessCode` (success, NotFoundError), `getAdmins`, `getInstructors`, `getStudents` (success), `getInstructorDirectoryTabData` (returns admins+instructors), `getParentContactTabData` (scoped to parent's students, missing parentId→400, missing trimester→400) in `tests/unit/controllers/userController.test.ts`
- [ ] T012 [P] [US2] Write tests for `AttendanceController.markAttendance` (success with authenticated user email, duplicate→ConflictError, missing registrationId→ValidationError, missing week→ValidationError) and `getAttendanceSummary` (success with defaults) in `tests/unit/controllers/attendanceController.test.ts` — mock req.attendanceRepository, getAuthenticatedUserEmail, successResponse, errorResponse
- [ ] T013 [P] [US2] Write tests for `SystemController.getHealth` (returns 200 with status, environment, version, features) and `clearCache` (valid admin→clears cache, invalid admin→UnauthorizedError, missing code→ValidationError) in `tests/unit/controllers/systemController.test.ts` — mock serviceContainer (userRepository, databaseClient), configService, successResponse, errorResponse
- [ ] T014 [P] [US2] Write tests for `FeedbackController.submitFeedback` (with message and state→logs and returns success, no message→logs "(no message provided)" and returns success) in `tests/unit/controllers/feedbackController.test.ts` — mock logger, successResponse, errorResponse
- [ ] T015 [US2] Run controller layer tests and verify all pass: `npm test -- tests/unit/controllers/`

**Checkpoint**: Controller layer tests complete — API input validation and response formatting verified

---

## Phase 4: User Story 3 - Repository Layer Tests (Priority: P3)

**Goal**: Tests for `attendanceRepository` and `baseRepository` — verifying data access, ID generation, and model conversion

**Independent Test**: Run `npm test -- tests/unit/repositories/attendanceRepository.test.ts tests/unit/repositories/baseRepository.test.ts` and verify all tests pass

### Implementation

- [ ] T016 [P] [US3] Write tests for `AttendanceRepository` — composite ID generation (`generateAttendanceId`), `create` (success with audit write, duplicate prevention via `hasAttendance`), `findByRegistrationId`, `findByWeek`, `getAttendanceSummary` (totalSessions, attendanceRate out of 12, sorted records), `hasAttendance` (true/false), `getAttendanceForRegistrations` (batch fetch) in `tests/unit/repositories/attendanceRepository.test.ts` — mock dbClient (appendRecord, getAllRecords), AttendanceRecord.fromDatabaseRow
- [ ] T017 [P] [US3] Write tests for `BaseRepository` — `create` (calls appendRecord, converts via mapper), `update` (calls updateRecord, re-fetches), `findAll` (filters null mapper results), `findBy` (field value matching), `findById` (string ID comparison), `convertToModel` (with mapper, without mapper, null input) in `tests/unit/repositories/baseRepository.test.ts` — mock dbClient, create concrete subclass with test mapper
- [ ] T018 [US3] Run repository layer tests and verify all pass: `npm test -- tests/unit/repositories/attendanceRepository.test.ts tests/unit/repositories/baseRepository.test.ts`

**Checkpoint**: Repository layer tests complete — data access and model conversion verified

---

## Phase 5: User Story 4 - Utility Function Tests (Priority: P4)

**Goal**: Tests for `nativeDateTimeHelpers`, `dateHelpers`, `cloneUtility`, `uuidUtility`, `versionHash`, `errorHandling` — verifying pure functions and value objects

**Independent Test**: Run `npm test -- tests/unit/utils/` and verify all tests pass

### Implementation

- [ ] T019 [US4] Write tests for `TonicDuration` — constructor (clamps 0-1439), factories (`fromHours`, `fromMinutes`, `fromTimeString` for "3:30 PM", "15:30", "3:30"), properties (hours, minutes, totalMinutes), arithmetic (`plus`, `minus` with clamping), comparison (`equals`, `isAfter`, `isBefore`), output (`to24Hour`, `to12Hour`, `toString`, `toDate`) in `tests/unit/utils/nativeDateTimeHelpers.test.ts`
- [ ] T020 [US4] Write tests for `TonicDateTime` — constructor, factories (`now`, `fromDate`, `fromISO`, `fromGoogleSheets` with serial date), properties (year, month 1-12, day, hour, minute), `getTimeAsDuration`, arithmetic (`plusDays`, `plusHours`, `plusMinutes`, `plusDuration`), output (`toISOString`, `toDateString`, `toTimeString`, `toGoogleSheetsSerial`), Google Sheets epoch handling (1899-12-30) in `tests/unit/utils/nativeDateTimeHelpers.test.ts`
- [ ] T021 [US4] Write tests for `DateHelpers` static utilities — `parseTimeString` ("3:30 PM", "15:30", Google Sheets number, invalid input→midnight), `parseGoogleSheetsTime` (fractional time 0-1, full serial), `convertTimeFormat` (12hour/24hour/minutes/hours), `durationBetween` (normal, overnight wrap), `isTimeInRange` (in-range, out-of-range), `getStartOfCurrentDayUTC`, `getStartOfDate`, `convertTo12HourFormat` compat method in `tests/unit/utils/nativeDateTimeHelpers.test.ts`
- [ ] T022 [P] [US4] Write tests for `DateHelpers` (legacy) — `convertTo12HourFormat` ("15:30"→"3:30 PM", "0:00"→"12:00 AM", "12:00"→"12:00 PM", null→null), `getStartOfCurrentDayUTC` (returns midnight UTC), `getStartOfDate` (returns midnight UTC for given date) in `tests/unit/utils/dateHelpers.test.ts`
- [ ] T023 [P] [US4] Write tests for `CloneUtility.clone` — deep clone (nested objects independent), null→empty string conversion, undefined→empty string conversion, preserves non-null values in `tests/unit/utils/cloneUtility.test.ts`
- [ ] T024 [P] [US4] Write tests for `UuidUtility` — `generateUuid` (matches UUIDv4 regex), `isValidUuid` (valid UUID→true, invalid string→false, empty→false), `generateMultiple` (correct count, all unique, all valid format) in `tests/unit/utils/uuidUtility.test.ts`
- [ ] T025 [P] [US4] Write tests for `generateFrontendVersionHash` — BUILD_GIT_COMMIT env var (returns first 8 chars), git fallback (mock execSync), package.json version fallback, all outputs are 8 characters; `getFrontendVersionHash` caching (same value on repeated calls) in `tests/unit/utils/versionHash.test.ts` — mock child_process.execSync and fs.readFileSync for fallback paths
- [ ] T026 [P] [US4] Write tests for `throwIfNo` — non-null value passes through, null throws with message, undefined throws with message in `tests/unit/utils/errorHandling.test.ts`
- [ ] T027 [US4] Run utility layer tests and verify all pass: `npm test -- tests/unit/utils/`

**Checkpoint**: Utility layer tests complete — all foundational operations verified

---

## Phase 6: Polish & Validation

**Purpose**: Full regression validation

- [ ] T028 Run full test suite (`npm test`) and verify all existing 539 tests plus all new tests pass
- [ ] T029 Verify total new test count meets minimum 115 tests across all 14 new test files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — create directories
- **Phase 2 (US1 - Services)**: Depends on Phase 1
- **Phase 3 (US2 - Controllers)**: Depends on Phase 1 only — can run in parallel with Phase 2
- **Phase 4 (US3 - Repositories)**: Depends on Phase 1 only — can run in parallel with Phases 2-3
- **Phase 5 (US4 - Utilities)**: Depends on Phase 1 only — can run in parallel with Phases 2-4
- **Phase 6 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (Services)**: Independent — no dependency on other stories
- **US2 (Controllers)**: Independent — no dependency on other stories
- **US3 (Repositories)**: Independent — no dependency on other stories
- **US4 (Utilities)**: Independent — no dependency on other stories

All four user stories can be implemented in parallel after Phase 1.

### Within Each User Story

- Tasks within the same test file are sequential (T002→T003→T004 build up the same file)
- Tasks marked [P] across different test files can run in parallel
- Verification task runs last within each story

### Parallel Opportunities

**Maximum parallelism after Phase 1**: 4 stories simultaneously

```text
Phase 1: T001 (setup)
         ↓
    ┌────┴────┬────────┬────────┐
    ↓         ↓        ↓        ↓
  US1       US2      US3      US4
(T002-T008)(T009-T015)(T016-T018)(T019-T027)
    ↓         ↓        ↓        ↓
    └────┬────┴────────┴────────┘
         ↓
Phase 6: T028-T029 (full validation)
```

**Within US1**: T002-T004 are sequential (same file), T005-T007 are sequential (same file), but the two files can be written in parallel

**Within US2**: T012, T013, T014 can run in parallel (different test files); T009-T011 are sequential (same file)

**Within US3**: T016, T017 can run in parallel (different test files)

**Within US4**: T019-T021 are sequential (same file: nativeDateTimeHelpers.test.ts); T022-T026 can all run in parallel (5 different test files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: US1 — Service layer tests
3. **STOP and VALIDATE**: Run `npm test` to ensure no regressions
4. ~40 new tests covering the most critical business logic

### Incremental Delivery

1. Setup → US1 (services) → validate → ~40 tests
2. Add US2 (controllers) → validate → ~70 tests
3. Add US3 (repositories) → validate → ~85 tests
4. Add US4 (utilities) → validate → ~115+ tests
5. Full validation pass

---

## Notes

- All test files follow Pattern 1-4 from plan.md (direct import for utilities, jest.unstable_mockModule for services/controllers/repositories)
- Controller tests mock req/res objects directly — no supertest/HTTP
- No production code changes — test-only additions
- Each [P] task targets a different file and can truly run in parallel
- Sequential tasks within the same file build up describe blocks incrementally
