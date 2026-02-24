# Tasks: Frontend Decomposition

**Input**: Design documents from `/specs/009-frontend-decomposition/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per plan.md — unit tests for availability engine and registration service, integration test for configuration endpoint.

**Organization**: Tasks are grouped by user story. US1 is foundational (all other stories depend on it). US2 depends on US1. US3 depends on US1. US4 depends on US2 and US3 (extracted modules must exist to parameterize them).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Branch setup and verification of starting state

- [ ] T001 Verify current build state: run `npx tsc --noEmit -p tsconfig.web.json` and `npx vite build` to confirm zero errors before any changes
- [ ] T002 Create `src/web/js/types/` directory for shared type definitions

**Checkpoint**: Build green, directory structure ready

---

## Phase 2: User Story 1 — Unified Registration Entity Types (Priority: P1)

**Goal**: Create a single shared location for registration entity types and update both forms to import from it. Zero duplicated interfaces.

**Independent Test**: `npx tsc --noEmit -p tsconfig.web.json` passes. No entity interfaces defined inline in either form file. Both forms function identically.

### Implementation for User Story 1

- [ ] T003 [US1] Create shared entity interfaces (InstructorLike, DaySchedule, StudentLike, ClassLike, RegistrationLike, RegistrationSubmitData, TimeSlot) in `src/web/js/types/registrationTypes.ts` — use the superset definitions from data-model.md, with the parent form's richer fields as optional properties
- [ ] T004 [US1] Update `src/web/js/workflows/parentRegistrationForm.ts` — remove inline interface definitions, replace with imports from `src/web/js/types/registrationTypes.ts`
- [ ] T005 [US1] Update `src/web/js/workflows/adminRegistrationForm.ts` — remove inline interface definitions, replace with imports from `src/web/js/types/registrationTypes.ts`
- [ ] T006 [US1] Verify compilation: run `npx tsc --noEmit -p tsconfig.web.json` — zero type errors

**Checkpoint**: Both forms import from shared types. Zero duplicated entity interfaces. Build green.

---

## Phase 3: User Story 2 — Parent Registration Form Decomposition (Priority: P2)

**Goal**: Extract 5 concerns from the 3,652-line parentRegistrationForm.ts into separate modules. Reduce the orchestrator to under 800 lines. Zero behavior change.

**Independent Test**: Parent registration (private lesson + group class) works identically. Filter chips show correct availability counts. Orchestrator file under 800 lines.

**Depends on**: US1 (shared types must exist for extracted modules to import)

### Step 2a: Presentation Helpers

- [ ] T007 [US2] Extract presentation helper functions (`#createFilterChip()`, `#createInstructorCard()`, `#createTimeSlotElement()`) from `src/web/js/workflows/parentRegistrationForm.ts` into `src/web/js/components/registrationForm/registrationFormElements.ts` — pure element factories that take data and return DOM elements, no `this` references
- [ ] T008 [US2] Update `src/web/js/workflows/parentRegistrationForm.ts` to import and call extracted presentation helpers instead of inline private methods
- [ ] T009 [US2] Verify compilation: `npx tsc --noEmit -p tsconfig.web.json` — zero errors after presentation helper extraction

### Step 2b: Availability Engine

- [ ] T010 [US2] Extract availability calculation functions from `src/web/js/workflows/parentRegistrationForm.ts` into `src/web/js/utilities/registrationForm/availabilityEngine.ts` — extract `#isInstructorAvailableOnDay()`, `#isInstructorGradeEligible()`, `#calculateAvailableSlotsForDay()`, `#checkTimeSlotConflict()`, `#getFilteredRegistrationsForConflictCheck()`, `#generateInstructorTimeSlots()` as pure exported functions
- [ ] T011 [US2] Consolidate the 4 near-identical cascading availability methods (`#calculateCascadingDayAvailability()`, `#calculateCascadingLengthAvailability()`, `#calculateCascadingInstructorAvailability()`, `#calculateFilteredInstrumentAvailability()`) into a single parameterized `calculateCascadingAvailability()` function with a `groupBy` dimension parameter in `src/web/js/utilities/registrationForm/availabilityEngine.ts`
- [ ] T012 [US2] Update `src/web/js/workflows/parentRegistrationForm.ts` to import and call availability engine functions instead of inline private methods
- [ ] T013 [US2] Verify compilation: `npx tsc --noEmit -p tsconfig.web.json` — zero errors after availability engine extraction

### Step 2c: Cascading Filter UI

- [ ] T014 [US2] Extract cascading filter UI into `src/web/js/components/registrationForm/cascadingFilterChips.ts` — create a class with chip generation methods (`#generateInstrumentChips()`, `#generateDayChips()`, `#generateLengthChips()`, `#generateInstructorChips()`), filter state management (`#attachFilterChipListeners()`, `#clearDownstreamSelections()`, `#updateCascadingChips()`, `#filterTimeSlots()`, `#regenerateFilteredTimeSlots()`). Constructor takes container element, availability engine reference, and presentation helpers reference.
- [ ] T015 [US2] Update `src/web/js/workflows/parentRegistrationForm.ts` to instantiate `CascadingFilterChips` and delegate filter operations to it
- [ ] T016 [US2] Verify compilation: `npx tsc --noEmit -p tsconfig.web.json` — zero errors after cascading filter extraction

### Step 2d: Group Registration

- [ ] T017 [US2] Extract group registration logic into `src/web/js/components/registrationForm/parentGroupRegistration.ts` — create a class with `#populateParentClassesDropdown()`, `#handleClassSelection()`, `#validateGroupRegistration()`, `#getCreateGroupRegistrationData()`, `#attachGroupSubmitButtonListener()`, `#clearGroupForm()`. Constructor takes classes array, registrations array, students array, container element, submit callback, and appConfig reference.
- [ ] T018 [US2] Update `src/web/js/workflows/parentRegistrationForm.ts` to instantiate `ParentGroupRegistration` and delegate group flow to it
- [ ] T019 [US2] Verify compilation: `npx tsc --noEmit -p tsconfig.web.json` — zero errors after group registration extraction

### Step 2e: Private Registration Submission

- [ ] T020 [US2] Extract private registration submission logic into `src/web/js/components/registrationForm/parentPrivateSubmission.ts` — create a class with `#validateRegistration()`, `#getCreateRegistrationData()`, `#attachSubmitButtonListener()`. Constructor takes selected lesson state, registrations, appConfig, and submit callback.
- [ ] T021 [US2] Update `src/web/js/workflows/parentRegistrationForm.ts` to instantiate `ParentPrivateSubmission` and delegate private submission flow to it
- [ ] T022 [US2] Verify compilation: `npx tsc --noEmit -p tsconfig.web.json` — zero errors after private submission extraction

### Step 2f: Reduce Orchestrator

- [ ] T023 [US2] Clean up `src/web/js/workflows/parentRegistrationForm.ts` — remove all dead code from extractions, verify remaining orchestrator has: constructor, `#initializeHybridInterface()` (instantiates sub-components), `updateData()` (passes data to sub-components), `#populateStudentSelector()`, `#attachRegistrationTypeListener()`, `clearSelection()`, `destroy()`, `_isEnrollmentPeriodActive()`, `_canAccessNextTrimester()`, `_renderRegistrationSelector()`. Target: under 800 lines.
- [ ] T024 [US2] Verify orchestrator line count is under 800 and compilation passes: `wc -l src/web/js/workflows/parentRegistrationForm.ts` and `npx tsc --noEmit -p tsconfig.web.json`

### Tests for User Story 2

- [ ] T025 [US2] Write unit tests for the availability engine in `tests/unit/web/availabilityEngine.test.ts` — test `isInstructorAvailableOnDay()`, `isInstructorGradeEligible()`, `calculateAvailableSlotsForDay()`, `checkTimeSlotConflict()`, `generateInstructorTimeSlots()`, and the consolidated `calculateCascadingAvailability()` with each groupBy dimension. Include edge case: empty/null instructor array returns zero availability across all dimensions without errors.

**Checkpoint**: parentRegistrationForm.ts under 800 lines. 5 extracted modules compile and function. Availability engine has unit tests. Build green.

---

## Phase 4: User Story 3 — Registration Service Extraction (Priority: P3)

**Goal**: Extract registration orchestration from viewModel into a standalone service. Remove vestigial state arrays.

**Independent Test**: Registration creation (regular + replacement), endpoint routing, and response enrichment work identically through the extracted service. viewModel has no registration methods or unused state arrays.

**Depends on**: US1 (shared types for service signatures)

### Implementation for User Story 3

- [ ] T026 [US3] Create `src/web/js/data/registrationService.ts` — static-method class with `create()` (endpoint routing for admin/parent + enrollment/non-enrollment, delete-then-create replacement, response enrichment with student/instructor objects), `delete()` (wraps `HttpService` delete call), and `submitIntent()`. Logic moved from `viewModel.createRegistrationWithEnrichment`, `viewModel.requestDeleteRegistrationAsync`, and `viewModel.submitIntent`.
- [ ] T027 [US3] Update `src/web/js/tabs/parentRegistrationTab.ts` to call `RegistrationService.create()` and `RegistrationService.delete()` instead of `window.viewModel.createRegistrationWithEnrichment()` and `window.viewModel.requestDeleteRegistrationAsync()`
- [ ] T028 [US3] Update `src/web/js/tabs/adminRegistrationTab.ts` to call `RegistrationService.create()` and `RegistrationService.delete()` instead of viewModel methods
- [ ] T029 [US3] Remove registration methods from `src/web/js/viewModel.ts` — delete `createRegistrationWithEnrichment()`, `requestDeleteRegistrationAsync()`, `submitIntent()` and any remaining callers
- [ ] T030 [US3] Remove vestigial state arrays from `src/web/js/viewModel.ts` — delete `admins`, `instructors`, `students`, `registrations`, `classes`, `rooms`, `nextTrimesterRegistrations` property declarations and their empty-array initializations in `loadUserData()`
- [ ] T031 [US3] No changes needed to `src/types/global.d.ts` — `ViewModelType` uses an index signature (`[key: string]: unknown`) with no specific method declarations, so removing methods from viewModel has no type impact. Skip this task.
- [ ] T032 [US3] Verify compilation: `npx tsc --noEmit -p tsconfig.web.json` — zero errors after viewModel cleanup

### Tests for User Story 3

- [ ] T033 [US3] Write unit tests for the registration service in `tests/unit/web/registrationService.test.ts` — test endpoint routing (admin vs parent, enrollment vs non-enrollment), delete-then-create replacement flow, response enrichment, and error propagation

**Checkpoint**: RegistrationService handles all registration orchestration. viewModel has zero registration methods and zero vestigial state arrays. Build green.

---

## Phase 5: User Story 4 — Backend-Served Business Configuration (Priority: P4)

**Goal**: Expand the backend configuration endpoint to serve business rules. Frontend consumes from API with fallback to current defaults. Remove hardcoded business constants from frontend.

**Independent Test**: Changing a backend config value (e.g., bus deadline) is reflected in the frontend without frontend code changes. Frontend falls back to defaults when config is absent.

**Depends on**: US2 (extracted modules must exist to parameterize), US3 (registration service exists)

### Step 5a: Backend — Expand Configuration Endpoint

- [ ] T034 [P] [US4] Add `RegistrationConfig` interface and `registrationConfig` field to `src/models/shared/responses/appConfigurationResponse.ts` — field defaults to `null` in constructor, `toJSON()` includes it. Interface shape per contracts/configuration-endpoint.md.
- [ ] T035 [US4] Populate `registrationConfig` in `src/controllers/userController.ts` `getAppConfiguration()` — initially hardcode current values (busDeadlines, lessonLengths, operationalHours, schedulingIntervalMinutes, defaultInstruments, defaultInstrument, rockBandDisplayConfig) matching contracts/configuration-endpoint.md defaults
- [ ] T036 [US4] Write integration test verifying `registrationConfig` appears in API response in `tests/integration/configuration.test.ts`

### Step 5b: Frontend — Create Config Access Helper

- [ ] T037 [US4] Create `getRegistrationConfig()` helper function (location: either in `src/web/js/utilities/registrationForm/` or alongside the types) that reads `window.UserSession.getAppConfig()?.registrationConfig` and merges with default values for any missing fields — this is the single fallback point

### Step 5c: Frontend — Update Consumers

- [ ] T038 [US4] Update `src/web/js/utilities/registrationForm/registrationValidator.ts` — `validateBusTimeRestrictions()` accepts `busDeadlines` parameter instead of importing `BusDeadlines` constant
- [ ] T039 [US4] Update `src/web/js/utilities/registrationForm/timeHelpers.ts` — `generateTimeOptions()` accepts `startHour`, `endHour`, `intervalMinutes` parameters instead of reading `TimeSlotConfig` constant
- [ ] T040 [P] [US4] Update `src/web/js/utilities/classManager.ts` — `formatClassNameWithTime()` and `getRockBandClassLength()` read from `rockBandDisplayConfig` in appConfig instead of hardcoded values
- [ ] T041 [US4] Update `src/web/js/utilities/registrationForm/availabilityEngine.ts` — slot generation functions accept lesson lengths and operational hours as parameters from config
- [ ] T042 [US4] Update `src/web/js/components/registrationForm/cascadingFilterChips.ts` — read lesson lengths from config for chip generation
- [ ] T043 [P] [US4] Update `src/web/js/components/registrationForm/parentGroupRegistration.ts` — pass bus deadlines from config to validator
- [ ] T044 [P] [US4] Update `src/web/js/components/registrationForm/parentPrivateSubmission.ts` — pass bus deadlines from config to validator
- [ ] T045 [US4] Update `src/web/js/components/registrationForm/lessonDetailsForm.ts` — read `defaultInstruments` and time options from config
- [ ] T046 [US4] Clean up `src/web/js/constants/registrationFormConstants.ts` — remove `BusDeadlines`, `TimeSlotConfig`, `LessonLengths`, `DefaultInstruments` exports. Retain `RegistrationFormText`, `WeekDays`, `DayNames`, `TransportationType`.
- [ ] T047 [US4] Verify compilation: `npx tsc --noEmit` (backend) and `npx tsc --noEmit -p tsconfig.web.json` (frontend) — zero errors

**Checkpoint**: Business config served from backend. Frontend reads from API response with fallback defaults. Hardcoded business constants removed from frontend. Build green.

---

## Phase 6: Polish & Verification

**Purpose**: Final validation across all stories

- [ ] T048 Run full backend compilation: `npx tsc --noEmit` — zero errors
- [ ] T049 Run full frontend compilation: `npx tsc --noEmit -p tsconfig.web.json` — zero errors
- [ ] T050 Run Vite build: `npx vite build` — build succeeds
- [ ] T051 Run all tests: `npm test` — all existing + new tests pass
- [ ] T052 Verify `parentRegistrationForm.ts` line count under 800: `wc -l src/web/js/workflows/parentRegistrationForm.ts`
- [ ] T053 Verify zero entity interfaces duplicated between `parentRegistrationForm.ts` and `adminRegistrationForm.ts` — grep for `interface` in both files
- [ ] T054 Verify zero vestigial state arrays in `viewModel.ts` — grep for `admins`, `instructors`, `students`, `registrations`, `classes`, `rooms`, `nextTrimesterRegistrations` property declarations
- [ ] T055 Verify zero hardcoded business constants remain in `registrationFormConstants.ts` — confirm `BusDeadlines`, `TimeSlotConfig`, `LessonLengths`, `DefaultInstruments` are removed
- [ ] T056 Verify zero-behavior-change (FR-012): run quickstart.md verification scenarios manually — confirm parent private lesson registration, group class registration, enrollment period behavior, admin registration, and configuration fallback all produce identical behavior to pre-decomposition

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Setup — creates shared types that all other stories import
- **US2 (Phase 3)**: Depends on US1 — extracted modules import shared types
- **US3 (Phase 4)**: Depends on US1 — registration service uses shared types. Can run in parallel with US2 if desired.
- **US4 (Phase 5)**: Depends on US2 and US3 — parameterizes extracted modules and service
- **Polish (Phase 6)**: Depends on all stories complete

### User Story Dependencies

```text
US1 (Shared Types)
 ├── US2 (Parent Form Decomposition)
 │    └── US4 (Backend-Served Config) ← also depends on US3
 └── US3 (Registration Service Extraction)
      └── US4 (Backend-Served Config)
```

### Within User Story 2 (Sequential)

Extractions MUST be done sequentially — each must compile before the next begins:
1. Presentation Helpers (cleanest, no dependencies)
2. Availability Engine (pure functions, no DOM)
3. Cascading Filter UI (depends on availability engine + presentation helpers)
4. Group Registration (depends on presentation helpers)
5. Private Registration Submission (depends on presentation helpers)
6. Reduce Orchestrator (remove dead code after all extractions)

### Parallel Opportunities

- **T034** (backend model change) can run in parallel with US2/US3 frontend work
- **T040** (classManager) can run in parallel with other US4 consumer updates
- **T043, T044** (group/private submission config updates) can run in parallel with each other
- **US2 and US3** can run in parallel after US1 completes (they touch different files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: US1 — Shared Types
3. **STOP and VALIDATE**: Both forms compile and function with shared types
4. This is the minimum deliverable — shared types unblock all future work

### Incremental Delivery

1. US1 (Shared Types) → Validate → Commit
2. US2 (Parent Form Decomposition) → Validate each extraction step → Commit after each
3. US3 (Registration Service) → Validate → Commit
4. US4 (Backend Config) → Validate → Commit
5. Full verification pass → Final commit

### Recommended Commit Points

- After T006: Shared types complete
- After T009: Presentation helpers extracted
- After T013: Availability engine extracted
- After T016: Cascading filter extracted
- After T019: Group registration extracted
- After T022: Private submission extracted
- After T024: Orchestrator reduced (US2 complete)
- After T033: Registration service extracted (US3 complete)
- After T047: Backend config complete (US4 complete)
- After T056: Final verification pass

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- US2 extractions are strictly sequential — each must compile before the next begins
- Commit after each extraction step to preserve rollback points
- The plan calls for `parentRegistrationForm.ts` under 800 lines — verify at T024 and T052
- All compilation checks use `npx tsc --noEmit -p tsconfig.web.json` (frontend) or `npx tsc --noEmit` (backend)
