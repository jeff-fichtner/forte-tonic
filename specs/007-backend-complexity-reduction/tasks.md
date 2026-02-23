# Tasks: Backend Complexity Reduction

**Input**: Design documents from `/specs/007-backend-complexity-reduction/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Not separately generated. Existing tests are updated inline with each implementation task to maintain zero regressions.

**Organization**: Tasks grouped by user story (P1→P4). Each story is independently implementable and verifiable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Establish baseline metrics before any changes

- [ ] T001 Record baseline metrics: run `npx tsc --noEmit` (0 errors), `npm test` (702 tests), `grep -r "as unknown as" src/ | wc -l` (18 casts)

---

## Phase 2: Foundational

**Purpose**: No foundational blocking tasks — this is pure refactoring within existing infrastructure. Each user story can proceed directly after baseline is established.

**Checkpoint**: Baseline recorded — user story implementation can now begin

---

## Phase 3: User Story 1 — Consolidate Duplicated Patterns (Priority: P1) 🎯 MVP

**Goal**: Eliminate all duplicated implementations so each pattern exists exactly once

**Independent Test**: All 702 tests pass, `npx tsc --noEmit` clean, grep confirms each pattern has one implementation

### Implementation for User Story 1

- [ ] T002 [P] [US1] Extract private `_fetchRegistrations(tableName: string)` method in `src/repositories/registrationRepository.ts` that encapsulates the `getAllRecords` + `fromDatabaseRow` + null-filter pattern, then refactor all 7 methods (`getById`, `getByStudentId`, `getByInstructorId`, `getActiveRegistrations`, `getRegistrationsForTrimester`, `getFromTable`, `updateIntent`) to delegate to it
- [ ] T003 [P] [US1] Extract private `_getAllDropRequests()` method in `src/repositories/dropRequestRepository.ts` that calls `getAllRecords('drop_requests', mapper)` once, then refactor all 5 query methods (`findById`, `findByParentId`, `findByStatus`, `findByRegistrationId`, `findAll`) to use it. Update `tests/unit/repositories/dropRequestRepository.test.ts` if mock expectations change
- [ ] T004 [P] [US1] Export `RegistrationInput` type from `src/services/registrationValidationService.ts` and import it in `src/services/registrationApplicationService.ts`, removing the duplicate definition. Update `tests/unit/services/registrationApplicationService.test.ts` if needed
- [ ] T005 [US1] Make `_getNextTrimester` and `_getPreviousTrimester` public methods on `PeriodService` in `src/services/periodService.ts` (add `_getPreviousTrimester` from the userController implementation with proper validation). Remove both methods from `src/controllers/userController.ts` and have the controller call `periodService.getNextTrimester()` / `periodService.getPreviousTrimester()` instead. The PeriodService version has input validation (throws on invalid trimester) which fixes the silent bug in the controller version
- [ ] T006 [US1] Consolidate environment config: modify `src/services/configurationService.ts` `getServerConfig()` to delegate to `src/config/environment.ts` for the 7 overlapping env vars (`NODE_ENV`, `WORKING_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `PORT`, `SERVICE_URL`, `LOG_LEVEL`) instead of reading them independently
- [ ] T007 [US1] Run `npx tsc --noEmit` and `npm test` to verify zero regressions after US1

**Checkpoint**: All duplicated patterns now have exactly one implementation. 702 tests pass.

---

## Phase 4: User Story 2 — Simplify Over-Engineered Abstractions (Priority: P2)

**Goal**: Remove unnecessary abstraction layers: error hierarchy, factory methods, dual-mode constructor, dead code

**Independent Test**: All tests pass, zero custom error classes in dropRequestService, `fromApiData` methods deleted, single constructor form on AuthenticatedUserResponse

### Implementation for User Story 2

- [ ] T008 [US2] Replace all 7 custom error classes in `src/services/dropRequestService.ts` with imports from `src/common/errors.ts`: `DropRequestNotFoundError` → `NotFoundError`, `UnauthorizedDropRequestError` → `ForbiddenError`, `InvalidPeriodError`/`InvalidStatusTransitionError`/`DropRequestError` → `ValidationError`, `DuplicateDropRequestError` → `ConflictError`, `RegistrationNotFoundError` → `NotFoundError`. Update all `throw` sites and `catch` blocks to use the new classes with descriptive messages. Update `tests/unit/services/dropRequestService.test.ts` to check `instanceof` against common error classes or check `statusCode` directly
- [ ] T009 [P] [US2] Replace `Admin.fromApiData(adminData)` / `Instructor.fromApiData(instructorData)` / `Parent.fromApiData(parentData)` calls in `src/models/shared/responses/authenticatedUserResponse.ts:36-38` with `new Admin(adminData)` / `new Instructor(instructorData)` / `new Parent(parentData)`. Then remove the `fromApiData` static methods from `src/models/shared/admin.ts`, `src/models/shared/instructor.ts`, `src/models/shared/parent.ts`
- [ ] T010 [P] [US2] Replace `AppConfigurationResponse.fromApiData(data)` call in `src/web/js/viewModel.ts:28` with `new AppConfigurationResponse(data)`. Then remove the `fromApiData` static method from `src/models/shared/responses/appConfigurationResponse.ts`
- [ ] T011 [US2] Simplify `AuthenticatedUserResponse` constructor in `src/models/shared/responses/authenticatedUserResponse.ts` to accept only the object form `constructor(data: AuthenticatedUserResponseData)`. Remove the positional `(string, Admin?, Instructor?, Parent?)` branch and the `typeof data === 'object'` runtime check. Update the single caller in `src/controllers/userController.ts:292-296` to pass `{ email, admin, instructor, parent }` object form
- [ ] T012 [US2] Remove all confirmed dead code (8 items with zero callers): remove `hasCurrentPeriod()`, `getPeriodType()`, `getTrimester()`, `isMaintenanceModeEnabled()` from `src/models/shared/responses/appConfigurationResponse.ts`; remove `hasPermission()` from `src/models/shared/responses/authenticatedUserResponse.ts`; remove `IRepository<T>` interface from `src/repositories/baseRepository.ts` and its export from `src/repositories/index.ts`; remove `has()` and `getServiceNames()` methods from `src/infrastructure/container/serviceContainer.ts`
- [ ] T013 [US2] Run `npx tsc --noEmit` and `npm test` to verify zero regressions after US2

**Checkpoint**: All over-engineered abstractions simplified. Dead code removed. Tests pass.

---

## Phase 5: User Story 3 — Improve Type Safety (Priority: P3)

**Goal**: Eliminate all 18 `as unknown as` double-casts (except 1 in frontend tabController.ts which is out of scope) by fixing underlying type misalignments

**Independent Test**: `grep -r "as unknown as" src/ | wc -l` returns 1 (only tabController.ts), `npx tsc --noEmit` clean, all tests pass

### Implementation for User Story 3

- [ ] T014 [P] [US3] Fix `toJSON()` → `Record<string, unknown>` casts: in `src/repositories/registrationRepository.ts` (lines 334, 618) and `src/repositories/dropRequestRepository.ts` (line 167), replace `obj.toJSON() as unknown as Record<string, unknown>` with `{ ...obj.toJSON() }` spread or add a `Record<string, unknown>` compatible return signature to the relevant `toJSON()` methods
- [ ] T015 [P] [US3] Fix untyped-data → model casts: in `src/repositories/registrationRepository.ts` (line 289), `src/repositories/dropRequestRepository.ts` (line 162), and `src/repositories/attendanceRepository.ts` (lines 92, 117), improve the type flow from `getAllRecords` return type through mapper functions so that data arrives already typed, eliminating the need for `as unknown as` coercion
- [ ] T016 [P] [US3] Fix service-layer casts in `src/services/registrationApplicationService.ts` (lines 169, 218, 219, 274): align the interface definitions for `ConflictRegistrationData`, `DayAvailability`, and the serialized registration shape so that the types match without double-casting
- [ ] T017 [P] [US3] Fix `class.ts` Date/string mismatch: in `src/models/shared/class.ts` (lines 125, 143), change `startTime` and `endTime` property types from `Date` to `string` since the data source provides strings. Remove the `as unknown as Date` casts
- [ ] T018 [US3] Fix constructor parameter cast in `src/controllers/userController.ts` (line 57): align the `AppConfigurationResponse` constructor parameter type with what `userController` passes, removing the `as unknown as ConstructorParameters<...>` cast
- [ ] T019 [US3] Fix `BaseRepository.convertToModel` unsafe cast in `src/repositories/baseRepository.ts`: remove the `data as T` fallback and require a mapper function parameter (or make the existing `mapRecord` constructor parameter non-optional). Update `src/repositories/userRepository.ts` generic parameter from `BaseRepository<Record<string, unknown>>` to either remove the generic or use a meaningful type
- [ ] T020 [US3] Run `npx tsc --noEmit` and `npm test`, then run `grep -r "as unknown as" src/ | wc -l` to verify cast count is 1 (tabController.ts only)

**Checkpoint**: Type safety restored. 17 of 18 double-casts eliminated. Code compiles cleanly.

---

## Phase 6: User Story 4 — Address Questionable Assumptions and Vestigial Patterns (Priority: P4)

**Goal**: Fix hard-coded values, remove browser globals from backend models, clean up ServiceContainer

**Independent Test**: No hard-coded `12` in attendance repo, zero `window` references in `src/models/shared/`, ServiceContainer has no unused methods, all tests pass

### Implementation for User Story 4

- [ ] T021 [P] [US4] Replace hard-coded `12` in `src/repositories/attendanceRepository.ts:172` with a derived session count: use the total number of distinct scheduled session dates from the attendance records for that registration. Update `tests/unit/repositories/attendanceRepository.test.ts` to verify the calculation uses actual record count
- [ ] T022 [P] [US4] Remove `window` global write assignments from `src/models/shared/responses/authenticatedUserResponse.ts:113-114` and `src/models/shared/responses/appConfigurationResponse.ts:125-126`. Investigate the `window` read in `src/models/shared/class.ts:115` (`DurationHelpers`) — if `DurationHelpers` is never assigned to `window`, remove the read too
- [ ] T023 [P] [US4] Remove the `singleton` flag from `RegisterOptions` in `src/infrastructure/container/serviceContainer.ts` if all registrations use the default (true). Simplify the registration logic to always use singleton behavior
- [ ] T024 [US4] Run `npx tsc --noEmit` and `npm test`, then run `grep -r "window" src/models/shared/ | wc -l` to verify zero `window` references in shared models

**Checkpoint**: All questionable assumptions addressed. Vestigial patterns removed. Tests pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all user stories

- [ ] T025 Run full quickstart.md verification checklist from `specs/007-backend-complexity-reduction/quickstart.md`
- [ ] T026 Verify net line count decreased: compare total TypeScript lines before and after all changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: N/A — no foundational tasks for refactoring
- **US1 (Phase 3)**: Depends on baseline (Phase 1). Each task within US1 marked [P] can run in parallel (different files)
- **US2 (Phase 4)**: Can start after Phase 1 baseline. T008 (error classes) is independent of US1. T009-T010 (fromApiData) are independent. T011 (constructor) is independent. T012 (dead code) is independent
- **US3 (Phase 5)**: Benefits from US2 completion (window casts eliminated by T022, but T022 is in US4). T014-T019 can run in parallel (different files). T019 (BaseRepository) should run after T015 to avoid conflicting changes in repositories
- **US4 (Phase 6)**: Independent of US1-US3. T021-T023 can run in parallel (different files)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories. T002, T003, T004 are parallel. T005 depends on nothing. T006 depends on nothing.
- **US2 (P2)**: No hard dependencies on US1. T008 is independent. T009, T010 are parallel. T011 is independent. T012 is independent.
- **US3 (P3)**: 3 window casts (of 18) overlap with US4 T022. If US4 runs first, those 3 are already gone. Otherwise T014-T018 handle the non-window casts independently.
- **US4 (P4)**: No dependencies on US1-US3. All tasks are independent.

### Within Each User Story

- Tasks marked [P] within a story can run in parallel
- Non-[P] tasks run sequentially
- Each story ends with a verification task (typecheck + tests)

### Parallel Opportunities

Within US1: T002, T003, T004 are parallel (different repository/service files)
Within US2: T009, T010 are parallel (different model files). T008 and T012 touch different areas
Within US3: T014, T015, T016, T017 are parallel (different files)
Within US4: T021, T022, T023 are parallel (different files)
Across stories: US1 and US4 can run fully in parallel. US2 and US4 can run fully in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch all independent consolidation tasks together:
Task T002: "Extract _fetchRegistrations in src/repositories/registrationRepository.ts"
Task T003: "Extract _getAllDropRequests in src/repositories/dropRequestRepository.ts"
Task T004: "Export RegistrationInput from src/services/registrationValidationService.ts"

# Then sequentially:
Task T005: "Consolidate trimester logic into src/services/periodService.ts"
Task T006: "Consolidate env config in src/services/configurationService.ts"
Task T007: "Verify: typecheck + tests"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Record baseline
2. Complete Phase 3: US1 — Consolidate duplicated patterns
3. **STOP and VALIDATE**: All 702 tests pass, each pattern exists once
4. Commit and verify

### Incremental Delivery

1. Record baseline → ready
2. US1: Consolidate patterns → Test → Commit (MVP — highest value)
3. US2: Simplify abstractions → Test → Commit
4. US3: Type safety → Test → Commit
5. US4: Assumptions & vestigial → Test → Commit
6. Polish: Full quickstart verification → Final commit

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This is pure refactoring: zero behavioral changes, zero API contract changes
- Commit after each user story phase completion
- Run typecheck + tests after every task group to catch regressions early
- The `tabController.ts` cast (frontend) is intentionally out of scope
