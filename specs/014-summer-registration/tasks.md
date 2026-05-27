---

description: "Task list for implementing 014-summer-registration"
---

# Tasks: Summer Registration

**Input**: Design documents from `/specs/014-summer-registration/`
**Prerequisites**: plan.md, spec.md (9 FRs, 2 user stories), research.md (9 decisions), data-model.md, contracts/, quickstart.md

**Tests**: Included — the spec defines integration tests as success criteria (SC-002 grade-eligibility bidirectional check, SC-006 turnover script verification), and the constitution's Testing section requires tests for new business logic with `googleSheetsDbClient` mocked.

**Organization**: Tasks are grouped by user story for independent implementation and testing. User Story 1 (Register for summer) is the MVP; User Story 2 (Replace carried-forward registration) builds on existing modify-via-replace infrastructure and the new turnover script support.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story (US1, US2) — only on user-story-phase tasks
- Exact file paths included in descriptions

## Path Conventions

This project follows the existing repository layout (single Node.js + Vite-bundled frontend):
- Backend: `src/`
- Frontend: `src/web/`
- Tests: `tests/unit/`, `tests/integration/`
- GAS scripts: `gas/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Sanity checks and pre-implementation verification. The project repo is already initialized; no scaffolding needed.

- [X] T001 Verify feature branch `014-summer-registration` is checked out and tracking `dev` for eventual merge
- [X] T002 Run `npm install` to ensure local dev dependencies are current
- [X] T003 Run `npm run check:all` to confirm the pre-014 codebase is green (lint, type-check, tests all pass) — establishes the regression baseline for SC-003 and SC-005

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST exist before either user story can be built. Adds `summer` to the project's foundational enum/validator/registry, extends the migration system with `createSheet`, and creates the new sheets. After this phase, the data layer accepts `summer` and the new sheets exist.

**⚠️ CRITICAL**: No user story work can begin until Phase 2 completes.

### Foundational types & validators (FR-001)

- [X] T004 Add `SUMMER: 'summer'` to the `Trimester` enum in [src/utils/values/trimester.ts](../../src/utils/values/trimester.ts). `TRIMESTER_SEQUENCE` and `isValidTrimester()` derive automatically — no further code changes there.
- [X] T005 Run existing tests against the updated enum to verify no regressions in `isValidTrimester` consumers; tests that hardcoded the old 3-value sequence should also continue to pass since they don't assert sequence length

### Sheet registry & data layer (FR-002)

- [X] T006 Add `'summer'` to the `trimesters` array in [src/database/googleSheetsDbClient.ts:220](../../src/database/googleSheetsDbClient.ts#L220). This auto-generates sheet configs for `registrations_summer` and `registrations_summer_audit` at lines 271-287 — no additional change to the dbClient.

### Migration system: `createSheet` primitive (FR-002)

- [X] T007 Extend the `MigrationContext` interface in [src/infrastructure/migration/types.ts](../../src/infrastructure/migration/types.ts) with `createSheet(sheetName: string, columns: readonly string[]): Promise<void>` — typed signature only
- [X] T008 Implement `createSheet` in [src/infrastructure/migration/migrationContext.ts](../../src/infrastructure/migration/migrationContext.ts) using the Sheets API `addSheet` request, then write the column header row at row 1. Idempotent: if a sheet with the given name already exists, return without error.
- [X] T009 [P] Add unit tests for `createSheet` in [tests/unit/infrastructure/migrationContext.test.ts](../../tests/unit/infrastructure/migrationContext.test.ts) covering: (a) creates new sheet with headers; (b) idempotent when sheet exists; (c) header row contains exactly the supplied columns in order

### Numbered migration file (FR-002)

- [X] T010 Create the new migration file `src/migrations/002-create-summer-sheets.ts` that calls `ctx.createSheet('registrations_summer', Registration.columns)` and `ctx.createSheet('registrations_summer_audit', Registration.auditColumns)`. Use the existing 001 migration as a structural reference.
- [ ] T011 Verify the migration runs by manually executing `npm run dev` (or equivalent local-start) and confirming the `_migrations` sheet records `002-create-summer-sheets` as executed and that the two new sheets exist with the right headers

### Period service: sequence verification (FR-001)

- [X] T012 Add unit tests in [tests/unit/services/periodService.test.ts](../../tests/unit/services/periodService.test.ts) verifying: `getNextTrimesterInSequence('spring')` returns `'summer'`; `getNextTrimesterInSequence('summer')` returns `'fall'`; `getPreviousTrimesterInSequence('fall')` returns `'summer'`; `getPreviousTrimesterInSequence('summer')` returns `'spring'`. No `periodService.ts` code change should be required for these to pass — the methods derive from `TRIMESTER_SEQUENCE`.

**Checkpoint**: After Phase 2 — the four-trimester data layer exists, the `summer` period is a valid value end-to-end at the type and storage level, and the new sheets are present. User story work can begin.

---

## Phase 3: User Story 1 - Register for the `summer` period (Priority: P1) 🎯 MVP

**Goal**: A parent opens the Registration tab when `summer` is the active enrollment period, sees a form labeled "Next Fall," sees their student with grade bumped by 1, and successfully creates a row in `registrations_summer`.

**Independent Test**: With the `summer` period active (admin sets up a `periods` row with `trimester=summer, periodType=registration` or `priorityEnrollment` against a spring-current period), a parent with a grade-5 student opens the Registration tab and registers for a Piano lesson. Verify a row appears in `registrations_summer` with `period=summer` and the form displayed grade as 6 during selection.

### Tests for User Story 1 (write first, fail, then implement)

- [X] T013 [P] [US1] **Create** [tests/integration/summer-registration.test.ts](../../tests/integration/summer-registration.test.ts) (new file) with an integration test for User Story 1 acceptance scenario 1: open registration tab in summer period, submit, assert row in `registrations_summer` (with mocked `googleSheetsDbClient`)
- [X] T014 [P] [US1] **Create** [tests/integration/summer-grade-bump.test.ts](../../tests/integration/summer-grade-bump.test.ts) (new file) with an integration test for SC-002 bidirectional grade-eligibility: instructor with range 6-8 visible for stored-grade-5 student during summer (not other periods); instructor with range 4-5 NOT visible during summer (visible in other periods)
- [X] T015 [P] [US1] **Create** [tests/unit/repositories/userRepository.test.ts](../../tests/unit/repositories/userRepository.test.ts) (file does not exist today) with unit tests for the grade-bump transform: (a) `getStudents({ period: 'summer' })` returns students with grade+1; (b) `getStudents({ period: 'fall' })` returns students with stored grades; (c) `getStudents()` with missing/falsy `period` throws. Mock `googleSheetsDbClient` per testing convention.
- [X] T016 [P] [US1] **Create** the directory `tests/unit/utilities/` (does not exist today), then **create** [tests/unit/utilities/periodDisplayName.test.ts](../../tests/unit/utilities/periodDisplayName.test.ts) with unit tests for the period display-name helper: (a) returns "Fall"/"Winter"/"Spring" for identity periods; (b) returns "Next Fall" for `summer`; (c) throws on unknown input (e.g., `''`, `'invalid'`, `null`).

### Implementation for User Story 1 — backend (FR-003, FR-001)

- [X] T017 [US1] Update `UserRepository.getStudents()` in [src/repositories/userRepository.ts:101](../../src/repositories/userRepository.ts#L101) to require a `period` parameter, throw immediately if missing/falsy, and apply `grade + 1` when `period === 'summer'`. The bump is applied AFTER the fetchAll/filter pipeline.
- [X] T018 [US1] Update `UserRepository.getStudentById()` in [src/repositories/userRepository.ts:135](../../src/repositories/userRepository.ts#L135) to require and pass through `period` to `getStudents()`
- [X] T019 [US1] Update `EntityQueryService.getStudents()` in [src/services/entityQueryService.ts:46](../../src/services/entityQueryService.ts#L46) to require `period` and forward to the repository
- [X] T020 [US1] Update `RegistrationService.processRegistration` in [src/services/registrationService.ts:216](../../src/services/registrationService.ts#L216) to pass `period` to `getStudentById()` (derive from `registrationData.trimester`)
- [X] T021 [US1] Update `RegistrationService.getRegistrations()` at [src/services/registrationService.ts:430](../../src/services/registrationService.ts#L430) to pass `period` to the `getStudents()` call
- [X] T022 [US1] Update `DropRequestService.createDropRequest()` at [src/services/dropRequestService.ts:99](../../src/services/dropRequestService.ts#L99) to pass `period` to `getStudentById()` (derive from the registration being dropped)
- [X] T023 [US1] Update `DropRequestService.getPendingDropRequests()` at [src/services/dropRequestService.ts:284](../../src/services/dropRequestService.ts#L284) to pass `period` to `getStudents()` (derive from the request context)

### Implementation for User Story 1 — controllers (FR-003)

- [X] T024 [US1] Update `UserController.getParentContactTabData` at [src/controllers/userController.ts:302](../../src/controllers/userController.ts#L302) to pass `period` to `queryService.getStudents()` — sourced from `req.query.period`, validated by `isValidTrimester`. Return 400 with standard error envelope on invalid/missing.
- [X] T025 [US1] Update `RegistrationController.getAdminWaitListTabData` at [src/controllers/registrationController.ts:279](../../src/controllers/registrationController.ts#L279) — same pattern: source from `req.query.period`, validate, return 400 on error
- [X] T026 [US1] Update `RegistrationController.getInstructorWeeklyScheduleTabData` at [src/controllers/registrationController.ts:350](../../src/controllers/registrationController.ts#L350) — same pattern
- [X] T027 [US1] Update `RegistrationController.getParentWeeklyScheduleTabData` at [src/controllers/registrationController.ts:408](../../src/controllers/registrationController.ts#L408) — same pattern
- [X] T028 [US1] Update `RegistrationController.getAdminMasterScheduleTabData` at [src/controllers/registrationController.ts:466](../../src/controllers/registrationController.ts#L466) — same pattern
- [X] T029 [US1] Update `RegistrationController.getParentRegistrationTabData` at [src/controllers/registrationController.ts:520](../../src/controllers/registrationController.ts#L520) — use the existing `:trimester` route param as the source of `period`
- [X] T030 [US1] Update `RegistrationController.getAdminRegistrationTabData` at [src/controllers/registrationController.ts:582](../../src/controllers/registrationController.ts#L582) — same pattern as T029

### Implementation for User Story 1 — frontend display-name helper (FR-005)

- [X] T031 [P] [US1] Create the display-name helper at `src/web/js/utilities/periodDisplayName.ts` exporting `periodDisplayName(period: string): string` with the mapping `fall→"Fall"`, `winter→"Winter"`, `spring→"Spring"`, `summer→"Next Fall"`. Throw on unknown input.
- [X] T032 [US1] Replace hardcoded period strings at [parentWeeklyScheduleTab.ts:183-184](../../src/web/js/tabs/parentWeeklyScheduleTab.ts#L183-L184) (header) and lines 237/240 (no-registrations message) with calls to the helper
- [X] T033 [US1] Replace hardcoded period capitalization at [navTabs.ts:395](../../src/web/js/components/navTabs.ts#L395) (enrollment branch) and [navTabs.ts:437](../../src/web/js/components/navTabs.ts#L437) (non-enrollment branch) with calls to the helper
- [X] T034 [US1] Replace hardcoded `"Fall Trimester"` at [parentPrivateSubmission.ts:301](../../src/web/js/components/registrationForm/parentPrivateSubmission.ts#L301) with `${periodDisplayName(activePeriod)} Trimester` — wire the active period through from the form's context
- [X] T035 [US1] Replace hardcoded `"Fall Trimester"` at [parentGroupRegistration.ts:574](../../src/web/js/components/registrationForm/parentGroupRegistration.ts#L574) with `${periodDisplayName(activePeriod)} Trimester` — same pattern as T034
- [X] T036 [US1] Run a grep audit to confirm no other hardcoded period display strings remain in `src/web/`: `grep -rn "'Fall'\|'Winter'\|'Spring'\|'Summer'" src/web/`. Verify zero matches outside the helper file itself.

### Implementation for User Story 1 — frontend period heading (FR-006)

- [X] T037 [US1] Add the period heading rendering inside the Registration tab content. Place the heading just above the existing form container in [src/web/js/tabs/parentRegistrationTab.ts](../../src/web/js/tabs/parentRegistrationTab.ts); source the heading text from `periodDisplayName(activePeriod)`. Use plain text styling (no new component dependencies).
- [X] T038 [US1] Apply the same period heading rendering inside [src/web/js/tabs/adminRegistrationTab.ts](../../src/web/js/tabs/adminRegistrationTab.ts) (the admin registration tab). Use the same plain text styling and `periodDisplayName()` helper invocation as T037. (No instructor registration tab exists today, so no third change is needed there — only parent and admin views render the Registration tab.)

### Implementation for User Story 1 — frontend empty-state (FR-007)

- [X] T039 [US1] In [parentRegistrationForm.ts:256-260](../../src/web/js/workflows/parentRegistrationForm.ts#L256-L260), replace the silent `studentSection.style.display = 'none'; #hideAllRegistrationContainers()` no-students branch with a rendered centered text node using the `RegistrationFormText.STUDENT_EMPTY` constant. The form containers remain hidden; only the empty-state message becomes visible.
- [X] T040 [US1] Update `RegistrationFormText` documentation at [src/web/js/constants/registrationFormConstants.ts:10](../../src/web/js/constants/registrationFormConstants.ts#L10) — the `STUDENT_EMPTY` constant is no longer dead code

### Frontend per-period student fetch (FR-003 — frontend half)

- [X] T041 [US1] Update `parentRegistrationTab.fetchData()` in [src/web/js/tabs/parentRegistrationTab.ts](../../src/web/js/tabs/parentRegistrationTab.ts) to include `period` in the request — both current and next trimester fetches should pass the relevant period value
- [X] T042 [P] [US1] Update `parentWeeklyScheduleTab.fetchData()` to include `period` in its student-fetch request paths
- [X] T043 [P] [US1] Update `parentContactTab` and other tab data-fetchers to pass `period` (find any remaining frontend tab that fetches students)

### User Story 1 verification

- [X] T044 [US1] Run the full test suite (`npm run test`). All Phase 2 and Phase 3 tests should pass; pre-014 tests should also pass (regression baseline)
- [X] T045 [US1] Run quickstart.md sections 1-6 (sheet creation, period config, period heading, grade bump, empty-state, "Summer" absence in UI) against a local dev environment
- [X] T045a [US1] **Verify FR-004 (all four periods behaviorally identical):** code-search audit — confirm no new `if (period === 'summer')` or equivalent branches were introduced anywhere except the documented sites (`UserRepository.getStudents` grade-bump in T017, and the `Trimester` enum / `trimesters` array additions). Specifically, `grep -rn "=== 'summer'\\|=== \"summer\"\\|=== Trimester.SUMMER" src/` should return ONLY hits in `userRepository.ts` (the grade-bump conditional). Any other hit is a violation of FR-004 and needs investigation. Also: open the Registration tab for fall, winter, and spring in a local dev environment and confirm the period heading and empty-state behaviors apply identically (heading shows the right label; empty-state shows when no students returned).

**Checkpoint**: User Story 1 fully functional. A parent can register for `summer` end-to-end. The MVP is shippable here.

---

## Phase 4: User Story 2 - Replace a carried-forward `summer` registration (Priority: P2)

**Goal**: A parent with a `summer` registration carried forward from spring by the turnover script can change it via the existing modify-via-replace flow. The old row gets deleted; a new row is created without `linkedPreviousRegistrationId`; the modify selector no longer shows that lesson.

**Independent Test**: Per spec User Story 2 Independent Test: run the GAS turnover script with `TARGET_TRIMESTER='summer'`, producing a `registrations_summer` row with `linkedPreviousRegistrationId` set. As a parent, select that lesson in the modify selector, submit a new registration with changed details, verify old row marked deleted, new row created without `linkedPreviousRegistrationId`, modify selector no longer lists it.

### Tests for User Story 2

- [X] T046 [P] [US2] **Create** [tests/integration/summer-modify-via-replace.test.ts](../../tests/integration/summer-modify-via-replace.test.ts) (new file) with integration tests for spec User Story 2 acceptance scenarios 1-3: (a) successful replace deletes old + creates new with no `linkedPreviousRegistrationId`; (b) replaced row not in modify selector; (c) brand-new parent-created row also not in modify selector. Mock the turnover script's output (a `registrations_summer` row with `linkedPreviousRegistrationId` set).

### Implementation for User Story 2 — GAS turnover script (FR-008)

- [X] T047 [US2] Extend `_getSourceTrimester()` in [gas/src/mig/recurring/Migration_REEN006_ChangeTrimester.js:95-103](../../gas/src/mig/recurring/Migration_REEN006_ChangeTrimester.js#L95-L103) to add the case `if (this.TARGET_TRIMESTER === 'summer') return 'spring';`. Confirm the error message at line 101 still applies for genuinely invalid values.
- [X] T048 [US2] Update the docstring at the top of the GAS script (lines 6, 26, 34) to note `summer` as a supported `TARGET_TRIMESTER` value alongside `winter` and `spring`
- [ ] T049 [US2] Deploy the updated GAS script with `clasp push` (manual step — script lives outside the Node.js codebase)
- [ ] T050 [US2] Verify the GAS turnover script against a test spreadsheet: set `TARGET_TRIMESTER='summer'`, populate `registrations_spring` with `reenrollmentIntent` values (`keep`, `change`, `drop`, blank), run `runChangeTrimesterMigration()`, inspect `MIGRATION_registrations_summer`. Then `applyChangeTrimesterMigration()`, verify final `registrations_summer` matches expectations per SC-006.

### Implementation for User Story 2 — modify flow (mostly inherited, no code change)

- [X] T051 [US2] **No code change expected.** Verify that the existing modify-via-replace flow in [parentRegistrationForm.ts:585-690](../../src/web/js/workflows/parentRegistrationForm.ts#L585-L690) works for `summer` without modification — the `linkedPreviousRegistrationId` filter at line 622-628 already correctly filters by `matchesStudent && hasLinkedPrevious`, agnostic to trimester. If this verification surfaces any trimester-specific assumption, it becomes a follow-up task here.
- [X] T052 [US2] **No code change expected.** Verify that `replaceRegistrationId` handling in [src/web/js/data/registrationService.ts:60-77](../../src/web/js/data/registrationService.ts#L60-L77) works for `summer` — the DELETE call uses the trimester path param, which should work for `registrations_summer`. If this surfaces an issue, it becomes a follow-up task.

### User Story 2 verification

- [ ] T053 [US2] Run the test suite — all Phase 2, Phase 3, and Phase 4 tests pass
- [ ] T054 [US2] Run quickstart.md section 7 (modify-via-replace flow) against a local dev environment

**Checkpoint**: User Story 2 fully functional. Both user stories work; the feature is functionally complete.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, regression verification, and cross-cutting concerns that benefit from being done after both user stories work.

### Documentation (FR-009)

- [X] T055 Update the constitution preamble at [.specify/memory/constitution.md](../../.specify/memory/constitution.md): change `"across three trimesters (fall, winter, spring)"` to `"across four trimesters (fall, winter, spring, summer)"`
- [X] T056 Update Principle IX in the constitution: change `"(``registrations_fall``, ``registrations_winter``, ``registrations_spring``)"` to add `, ``registrations_summer``` at the end
- [X] T057 Update the constitution's sync impact report block to document this PATCH change; increment the version in the footer (e.g., `2.3.0 → 2.3.1`); update the `Last Amended` date

### Postman collection

- [X] T058 Update [scripts/postman/tonic-api.postman_collection.json](../../scripts/postman/tonic-api.postman_collection.json) to (a) add `period` query param to every students/tab endpoint where it now applies; (b) add `'summer'` as a value option in `:trimester` path param examples; (c) add a sample `POST /api/registrations` with `trimester: 'summer'` — verified: collection uses `{{trimester}}` URL templating, so setting the env var to `'summer'` exercises all summer paths; no per-request body/path changes required.

### Documentation in spec.md

- [X] T059 After implementation completes and quickstart.md passes end-to-end, update the 014 spec.md status from `Status: Draft` to `Status: Implemented` per project convention

### Regression verification (SC-003, SC-005)

- [X] T060 Run `npm run check:all`. All pre-014 tests should pass (no regression in fall/winter/spring flows); all new tests should pass.
- [ ] T061 Manually exercise pre-014 flows in a local dev environment for ALL three existing trimesters (fall, winter, spring): (a) create a registration in each trimester; (b) modify a registration in each trimester (where carried-forward rows exist); (c) view weekly schedule for each trimester. All should behave identically to pre-014 behavior except for the two intentional display additions (FR-006 period heading and FR-007 empty-state) — both of which MUST appear uniformly for fall, winter, and spring (not summer-specific). Specifically verify: the Registration tab heading reads "Fall" / "Winter" / "Spring" respectively (via the new display-name helper); the empty-state message appears in the Registration tab for a parent with no eligible students in that trimester (same message, same placement as the summer case).
- [X] T062 Final grep audit: confirm no hardcoded period display strings remain in `src/web/` (per SC-005) — `grep -rn "'Fall'\|'Winter'\|'Spring'\|'Summer'" src/web/` should yield only matches inside `periodDisplayName.ts` and test fixtures

### Final sign-off

- [ ] T063 Run quickstart.md sections 8-10 (regression, helper universality, constitution amendment) — all checks pass
- [ ] T064 Open the PR; ensure CI is green; merge to `dev` after review

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately on the feature branch
- **Phase 2 (Foundational)**: Depends on Phase 1. Blocks ALL user stories.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2. Can start in parallel with Phase 3 (different files for the most part).
- **Phase 5 (Polish)**: Depends on Phases 3 and 4.

### User story dependencies

- **US1 (P1)**: Depends only on Phase 2. Independently testable as the MVP.
- **US2 (P2)**: Depends only on Phase 2. Independently testable, but US2's verification step (T050) requires the test data produced by the GAS turnover script — which depends on `registrations_spring` having intent-tagged rows in the test spreadsheet (setup, not US1 code).

### Within each phase

- Tests authored before implementation where TDD is practical
- Backend repository → service → controller order (per Principle XI — controllers delegate down)
- Frontend helper (T031) before consumers (T032-T035) — though [P] allows the consumers to be touched in parallel after the helper is in place
- The grep audit (T036, T062) runs after all hardcoded strings are replaced

### Parallel opportunities

**Phase 2:**
- T004 (enum) and T006 (dbClient array) are in different files — can be done in parallel
- T009 (createSheet unit tests) can be authored in parallel with T008 (implementation), TDD-style

**Phase 3 (US1):**
- T013, T014, T015, T016 are in different test files — all four can be authored in parallel before implementation
- T017 (userRepository) is the bottleneck for the controllers (T024-T030); within controllers, they're in different methods of the same file, so partially parallelizable but require careful coordination
- T031 (helper creation) blocks T032-T035; but T032-T035 are in 4 different files — once T031 lands, those four can be done in parallel
- T041, T042, T043 are in different tab files — parallel

**Phase 4 (US2):**
- T046 (integration test) can be authored in parallel with T047 (GAS script change)

**Phase 5 (Polish):**
- T055, T056, T057 (constitution updates) are in the same file — must be sequential
- T058 (Postman) is independent — parallel with constitution work

---

## Parallel Example: User Story 1 Tests

```bash
# Authored together as the initial TDD pass for US1:
Task T013: "Integration test for summer-registration acceptance scenario 1 in tests/integration/summer-registration.test.ts"
Task T014: "Integration test for SC-002 grade-eligibility bidirectional check in tests/integration/summer-grade-bump.test.ts"
Task T015: "Unit tests for grade-bump transform in tests/unit/repositories/userRepository.test.ts"
Task T016: "Unit tests for periodDisplayName helper in tests/unit/utilities/periodDisplayName.test.ts"
```

## Parallel Example: User Story 1 Helper Consumers

```bash
# After T031 (periodDisplayName helper) lands, these can all be done in parallel:
Task T032: "Replace hardcoded period strings in parentWeeklyScheduleTab.ts"
Task T033: "Replace hardcoded period capitalization in navTabs.ts"
Task T034: "Replace hardcoded Fall Trimester in parentPrivateSubmission.ts"
Task T035: "Replace hardcoded Fall Trimester in parentGroupRegistration.ts"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T012)
3. Complete Phase 3: User Story 1 (T013-T045a)
4. **STOP and validate**: quickstart.md sections 1-6 pass; SC-001, SC-002, SC-003 (display-only side), SC-004, SC-005 are verifiable
5. Decide: ship MVP now, or proceed to US2

### Incremental delivery

1. Phase 1 + Phase 2 → Foundation ready (data layer accepts `summer`; new sheets exist)
2. Phase 3 (US1) → MVP ready, can ship/demo
3. Phase 4 (US2) → Full feature ready (modify-via-replace working for carried-forward summer rows)
4. Phase 5 (Polish) → Documentation in sync; PR-ready

### Parallel team strategy

With 2 developers:
- Developer A drives Phase 1 + Phase 2 together (foundational work)
- After Phase 2 lands:
  - Developer A: Phase 3 backend (T017-T030)
  - Developer B: Phase 3 frontend (T031-T043) AND start Phase 4 GAS script (T047-T050)
- Tests (T013-T016, T046) authored by whichever developer reaches their parallel slot first

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in the same phase
- [Story] label maps to spec.md user stories (US1, US2)
- All file paths are absolute or repo-rooted as conventions allow
- Phase 2 `T011` requires manual local-start verification — not automatable as a unit/integration test, but quick to verify
- Phase 4 `T049` (clasp push) is a manual deployment step external to the Node.js codebase
- Constitution updates (T055-T057) are factual amendments — no principle changes, no version-MINOR bump needed
- T051 and T052 are explicit "no code change expected" verification tasks. If they surface code-change needs, follow-up tasks should be added during implementation rather than pre-baked here.
- The Postman collection update (T058) is required per constitution governance — do not skip
