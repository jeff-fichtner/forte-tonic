# Tasks: Service Layer Cleanup

**Input**: Design documents from `/specs/004-service-layer-cleanup/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: Unit tests for the new EntityQueryService are included (spec requires unit-testable query methods).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Branch creation and scaffolding for new files

- [ ] T001 Create and checkout branch `004-service-layer-cleanup` from `main`
- [ ] T002 Create empty `src/services/entityQueryService.ts` with class skeleton extending `BaseService` (import from `src/infrastructure/base/baseService.ts`), constructor accepting `UserRepository`, `ProgramRepository`, `RegistrationRepository`, and `ConfigurationService`, with stub methods for `getStudents`, `getInstructors`, `getRegistrations`, `getClasses`, `getAdmins`, `getRooms` — all returning empty arrays

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Register EntityQueryService in the service container and export it — MUST be complete before tab rewiring

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Register `EntityQueryService` in `src/infrastructure/container/serviceContainer.ts`: import EntityQueryService, add `entityQueryService: EntityQueryService` to the `ServiceMap` interface, add `this.register('entityQueryService', ...)` call in `#registerServices()` passing `this.get('userRepository')`, `this.get('programRepository')`, `this.get('registrationRepository')`, and `configService`
- [ ] T004 Add `EntityQueryService` export to `src/services/index.ts`

**Checkpoint**: `entityQueryService` is resolvable from the service container, `npm test` passes, `npx tsc --noEmit` passes

---

## Phase 3: User Story 1 — Entity Query Service (Priority: P1)

**Goal**: Implement all 6 query methods with primitive filters so tabs can call them instead of inline filtering

**Independent Test**: Unit tests with mocked repositories verify all filter combinations return correct results

### Tests for User Story 1

- [ ] T005 [US1] Create `tests/unit/entityQueryService.test.ts` with test suite covering: `getStudents()` returns all when no filters; `getStudents({ parentId })` filters by `parent1Id`/`parent2Id`; `getInstructors()` returns all when no filters; `getInstructors({ instructorIds })` filters to ID set; `getRegistrations({ trimester })` fetches by trimester; `getRegistrations({ trimester, studentIds })` filters by student ID set; `getRegistrations({ trimester, instructorId })` filters by instructor; `getRegistrations({ trimester, excludeWaitlist: true })` excludes waitlist; `getClasses()` passes through to repository; `getAdmins()` passes through to repository; `getRooms()` passes through to repository. Mock all three repositories.

### Implementation for User Story 1

- [ ] T006 [US1] Implement `getStudents(filters?)` in `src/services/entityQueryService.ts`: call `userRepository.getStudents()`, if `filters.parentId` provided filter where `student.parent1Id === parentId || student.parent2Id === parentId`, return result
- [ ] T007 [US1] Implement `getInstructors(filters?)` in `src/services/entityQueryService.ts`: call `userRepository.getInstructors()`, if `filters.instructorIds` provided filter to those whose ID is in the set, return result
- [ ] T008 [US1] Implement `getRegistrations(filters)` in `src/services/entityQueryService.ts`: call `registrationRepository.getRegistrationsByTrimester(filters.trimester)`, then apply optional filters — if `filters.studentIds` filter to matching studentIds, if `filters.instructorId` filter to matching instructorId, if `filters.excludeWaitlist` exclude registrations with waitlist status — return result
- [ ] T009 [P] [US1] Implement `getClasses()` in `src/services/entityQueryService.ts`: call `programRepository.getClasses()` and return result
- [ ] T010 [P] [US1] Implement `getAdmins()` in `src/services/entityQueryService.ts`: call `userRepository.getAdmins()` and return result
- [ ] T011 [P] [US1] Implement `getRooms()` in `src/services/entityQueryService.ts`: call `userRepository.getRooms()` and return result
- [ ] T012 [US1] Verify all unit tests in `tests/unit/entityQueryService.test.ts` pass, run `npx tsc --noEmit`

**Checkpoint**: EntityQueryService fully functional with all filter combinations tested. `npm test` passes.

---

## Phase 4: User Story 2 — Tab Endpoint Rewiring (Priority: P1)

**Goal**: Rewire all 8 tab endpoints to use EntityQueryService, eliminating inline filtering in controllers

**Independent Test**: All existing tests pass, response shapes are identical to before

**Dependencies**: Requires US1 (EntityQueryService must be functional)

### Implementation for User Story 2

#### Admin tabs (no cross-entity filtering — parallel safe)

- [ ] T013 [P] [US2] Rewire `getAdminMasterScheduleTabData` in `src/controllers/registrationController.ts` (lines ~981-1020): replace inline fetches with `queryService.getRegistrations({ trimester })`, `queryService.getStudents()`, `queryService.getInstructors()`, `queryService.getClasses()` in parallel via `Promise.all`. Response shape unchanged.
- [ ] T014 [P] [US2] Rewire `getAdminRegistrationTabData` in `src/controllers/registrationController.ts` (lines ~1101-1151): same pattern as Admin Master Schedule — 4 parallel query service calls with `{ trimester }` filter on registrations. Response shape unchanged.
- [ ] T015 [P] [US2] Rewire `getInstructorDirectoryTabData` in `src/controllers/userController.ts` (lines ~452-483): replace inline fetches with `queryService.getAdmins()` and `queryService.getInstructors()` in parallel. Response shape unchanged.

#### Admin Wait List (has waitlist-specific filtering after fetch)

- [ ] T016 [US2] Rewire `getAdminWaitListTabData` in `src/controllers/registrationController.ts` (lines ~723-790): use `queryService.getRegistrations({ trimester })` then apply in-controller Rock Band class ID filter via `configService.getRockBandClassIds()` (this filter is waitlist-specific, not a general query pattern). Use `queryService.getStudents()` then filter to students with matching registrations. Response: `{ registrations, students }`.

#### Instructor Weekly Schedule (cross-entity: instructor → registrations → students)

- [ ] T017 [US2] Rewire `getInstructorWeeklyScheduleTabData` in `src/controllers/registrationController.ts` (lines ~797-885): use `queryService.getRegistrations({ trimester, instructorId, excludeWaitlist: true })`, extract studentIds, then `queryService.getStudents()` and filter to studentIds in-controller, `queryService.getInstructors()`, `queryService.getClasses()` — parallel where possible. Response shape unchanged.

#### Parent tabs (cross-entity: parent → students → registrations → instructors)

- [ ] T018 [US2] Rewire `getParentWeeklyScheduleTabData` in `src/controllers/registrationController.ts` (lines ~893-973): use `queryService.getStudents({ parentId })`, extract studentIds, then `queryService.getRegistrations({ trimester, studentIds })`, extract instructorIds from registrations, `queryService.getInstructors({ instructorIds })`, `queryService.getClasses()`. Response shape unchanged.
- [ ] T019 [US2] Rewire `getParentContactTabData` in `src/controllers/userController.ts` (lines ~490-594): this tab derives trimesters internally (no trimester in route). Keep `periodService.getCurrentTrimester()` and `periodService.getNextTrimester()` calls. Then use `queryService.getStudents({ parentId })`, extract studentIds, `queryService.getRegistrations({ trimester: current, studentIds })` + optional next trimester via `Promise.allSettled`, extract instructorIds, `queryService.getInstructors({ instructorIds })`, `queryService.getAdmins()`. Response returns only `{ admins, instructors }` — students/registrations are used internally for filtering but not in response.
- [ ] T020 [US2] Rewire `getParentRegistrationTabData` in `src/controllers/registrationController.ts` (lines ~1027-1092): this tab derives trimesters internally (no trimester in route). Keep `periodService.getCurrentTrimester()` call; **replace inline `TRIMESTER_SEQUENCE` math** (lines 1048-1051) with `periodService.getNextTrimester()` (the `TRIMESTER_SEQUENCE` import stays because line 244 in `getRegistrations` still uses it). Then use `queryService.getStudents({ parentId })`, `queryService.getRegistrations({ trimester: next })`, `queryService.getRegistrations({ trimester: current })` (registrations unfiltered — matches current behavior), `queryService.getInstructors()`, `queryService.getClasses()`. Response keys: `nextTrimesterRegistrations`, `currentTrimesterRegistrations`, `students`, `instructors`, `classes`.

#### Verification

- [ ] T021 [US2] Run full test suite (`npm test`) and typecheck (`npx tsc --noEmit`) to confirm no regressions after all 8 tab rewirings

**Checkpoint**: All 8 tabs use EntityQueryService. No inline repository calls or filtering in controller tab methods. All tests pass.

---

## Phase 5: User Story 3 — Dead Code Removal (Priority: P2)

**Goal**: Remove all unused service methods and classes identified in the plan

**Independent Test**: All tests pass after deletion, grep confirms no remaining references

### Implementation for User Story 3

- [ ] T022 [P] [US3] Delete `src/services/authenticator.ts` (entire file — 0 production callers)
- [ ] T023 [P] [US3] Delete `tests/unit/authenticator.test.ts` (test for deleted class)
- [ ] T024 [US3] Remove `getRegistrationDetails()` method (lines ~404-442) from `src/services/registrationApplicationService.ts`
- [ ] T025 [US3] Remove `getStudentRegistrations()` method (lines ~447-476) from `src/services/registrationApplicationService.ts`
- [ ] T026 [P] [US3] Remove `checkScheduleConflicts()` method (lines ~212-233) from `src/services/registrationConflictService.ts`
- [ ] T027 [P] [US3] Remove `generateRegistrationId()` method (lines ~417-423) from `src/services/registrationConflictService.ts`
- [ ] T028 [P] [US3] Remove `isUniqueRegistrationId()` method (lines ~431-433) from `src/services/registrationConflictService.ts`
- [ ] T029 [US3] Remove any remaining imports of `Authenticator` across the codebase (grep for `authenticator` in `src/` and clean up)
- [ ] T030 [US3] Run full test suite (`npm test`) and typecheck (`npx tsc --noEmit`) to confirm no breakage

**Checkpoint**: 2 files deleted, 5 dead methods removed. All tests pass. No orphaned imports.

---

## Phase 6: User Story 4 — Service Consolidation (Priority: P2)

**Goal**: Absorb ProgramValidationService into RegistrationApplicationService as a private method

**Independent Test**: Existing registration validation tests pass, ProgramValidationService file deleted

### Implementation for User Story 4

- [ ] T031 [US4] Copy `ProgramValidationService.validateRegistration()` logic into `src/services/registrationApplicationService.ts` as private method `#validateProgramRules(registrationData, groupClass)` returning `{ isValid: boolean; errors: string[] }`. Keep the `ConfigurationService.getRockBandClassIds()` static call unchanged.
- [ ] T032 [US4] Update the call site in `RegistrationApplicationService` that currently calls `ProgramValidationService.validateRegistration()` to call `this.#validateProgramRules()` instead. Remove the import of `ProgramValidationService`.
- [ ] T033 [US4] Delete `src/services/programValidationService.ts`
- [ ] T034 [US4] Grep for any remaining imports of `ProgramValidationService` across `src/` and `tests/` and remove them
- [ ] T035 [US4] Run full test suite (`npm test`) and typecheck (`npx tsc --noEmit`)

**Checkpoint**: ProgramValidationService deleted. Validation logic preserved in RegistrationApplicationService. All tests pass.

---

## Phase 7: User Story 5 — Code Quality (Priority: P3)

**Goal**: Deduplicate time parsing utilities and clean up logging levels

**Independent Test**: Tests pass, bus time validation still works, conflict check logs are debug-level

### Implementation for User Story 5

- [ ] T036 [P] [US5] In `src/services/registrationApplicationService.ts`, replace calls to `this.#parseTime(timeStr)` with `DateHelpers.parseTimeString(timeStr).totalMinutes` and calls to `this.#formatTimeFromMinutes(minutes)` with `new TonicDuration(minutes).to24Hour()` in `#validateBusTimeRestrictions()`. Add imports for `DateHelpers` from `src/utils/nativeDateTimeHelpers.ts` and `TonicDuration` from its source. Then delete the private `#parseTime()` and `#formatTimeFromMinutes()` methods.
- [ ] T037 [P] [US5] In `src/services/registrationConflictService.ts`, change per-iteration `logger.info` calls inside `.find()` callbacks in `checkDuplicateRegistration()`, `checkStudentScheduleConflict()`, and `checkInstructorScheduleConflict()` to `logger.debug`. Keep method-level entry/exit banners (`=== CONFLICT CHECK START ===`, etc.) at `info`. Keep `checkClassCapacity()` count logging at `info`.
- [ ] T038 [US5] Run full test suite (`npm test`) and typecheck (`npx tsc --noEmit`)

**Checkpoint**: Time parsing uses shared utilities. Logging levels are appropriate. All tests pass.

---

## Phase 8: Polish & Validation

**Purpose**: Final verification across all changes

- [ ] T039 Run full test suite (`npm test`) — all 534+ tests must pass
- [ ] T040 Run typecheck (`npx tsc --noEmit`) — must pass clean
- [ ] T041 Verify no orphaned imports or references: grep for `authenticator`, `ProgramValidationService`, `getRegistrationDetails`, `getStudentRegistrations`, `checkScheduleConflicts`, `generateRegistrationId`, `isUniqueRegistrationId` across `src/` — should return zero results (except plan/spec docs)
- [ ] T042 Run quickstart.md validation checklist: confirm EntityQueryService unit tests pass, existing tests pass, typecheck clean

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 — Entity Query Service (Phase 3)**: Depends on Phase 2
- **US2 — Tab Endpoint Rewiring (Phase 4)**: Depends on US1 (Phase 3)
- **US3 — Dead Code Removal (Phase 5)**: Depends on Phase 2 only — CAN run parallel with US1/US2
- **US4 — Service Consolidation (Phase 6)**: Depends on Phase 2 only — CAN run parallel with US1/US2
- **US5 — Code Quality (Phase 7)**: Depends on US3/US4 completion (methods being modified must be finalized first)
- **Polish (Phase 8)**: Depends on all phases complete

### User Story Dependencies

- **US1 (P1)**: Foundational only. No cross-story dependency.
- **US2 (P1)**: Requires US1 complete (tab endpoints call query service methods).
- **US3 (P2)**: Foundational only. Independent of US1/US2 — removes dead code from different methods than those being rewired.
- **US4 (P2)**: Foundational only. Independent — absorbs ProgramValidationService which is unrelated to tab rewiring.
- **US5 (P3)**: Requires US3 complete (dead methods removed from `registrationApplicationService.ts` before dedup changes) and US4 complete (absorption finalized before time parsing dedup).

### Parallel Opportunities

- **US3 + US4** can run in parallel with **US1 + US2** (they touch different methods/files)
- Within US2: Admin Master Schedule (T013), Admin Registration (T014), and Instructor Directory (T015) are parallel (different methods, no shared state)
- Within US3: File deletions (T022, T023) are parallel; conflict service method removals (T026, T027, T028) are parallel
- Within US5: Time parsing dedup (T036) and logging cleanup (T037) are parallel (different files)

---

## Parallel Example: Phase 4 (Tab Rewiring)

```text
# Parallel batch 1 — admin tabs + instructor directory (no cross-entity chains):
T013: Rewire Admin Master Schedule in registrationController.ts
T014: Rewire Admin Registration in registrationController.ts
T015: Rewire Instructor Directory in userController.ts

# Sequential — each has cross-entity chains to compose correctly:
T016: Rewire Admin Wait List (waitlist-specific filter)
T017: Rewire Instructor Weekly Schedule (instructor → registrations → students)
T018: Rewire Parent Weekly Schedule (parent → students → registrations → instructors)
T019: Rewire Parent Contact (parent → students → dual trimester registrations → instructors)
T020: Rewire Parent Registration (parent → students, unfiltered registrations)
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (register in container)
3. Complete Phase 3: US1 — EntityQueryService with all filter methods + tests
4. Complete Phase 4: US2 — Rewire all 8 tabs
5. **STOP and VALIDATE**: All tests pass, typecheck clean, tabs produce identical responses

### Incremental Delivery

1. Setup + Foundational → Container ready
2. US1 → Query service functional, tested
3. US2 → All 8 tabs rewired → **Core refactor complete**
4. US3 → Dead code removed
5. US4 → ProgramValidationService absorbed
6. US5 → Time parsing dedup + logging cleanup
7. Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- T013/T014/T015 are parallel within US2 because they modify different methods with no cross-entity filtering
- T016-T020 are sequential because they involve cross-entity composition and each modifies the same controller file
- Response shape preservation is the primary regression risk — verify with existing tests after each tab rewiring
- The Parent Registration tab intentionally keeps registrations unfiltered — this matches current behavior
