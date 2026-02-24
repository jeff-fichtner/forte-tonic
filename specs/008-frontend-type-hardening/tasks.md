# Tasks: Frontend Type Hardening

**Input**: Design documents from `/specs/008-frontend-type-hardening/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: No frontend unit tests — validation is `tsc --noEmit -p tsconfig.web.json` + Vite build.

**Organization**: Tasks grouped by user story. Each story produces a compilable intermediate state with monotonically decreasing error count.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Fix tsconfig)

**Purpose**: Make `tsc` actually compile web files so all subsequent type work is compiler-verified.

- [X] T001 Fix `tsconfig.web.json` to override inherited `exclude` — add `"exclude": ["node_modules", "dist"]` so all 47 web files are compiled
- [X] T002 Run `npx tsc --noEmit -p tsconfig.web.json` and record baseline error count (~1,856 errors expected)

**Checkpoint**: tsc now compiles all web files. Error count is known. All subsequent work reduces this count to zero.

---

## Phase 2: Foundational (Declarations & Prototype Extensions)

**Purpose**: Add type declarations that eliminate the ~1,141 property-not-found / cannot-find-name / unknown errors before touching any source files.

**⚠️ CRITICAL**: This phase eliminates the largest error categories by declaring types that already exist at runtime but are invisible to the compiler.

- [X] T003 [P] Add prototype extension declarations to `src/types/global.d.ts` — declare `String.prototype.capitalize(): string`, `Number.prototype.formatGrade(): string`, `Number.prototype.formatTime(): string`, `Duration.prototype.to12HourFormat(): string`, `Duration.prototype.to24HourFormat(): string`
- [X] T004 [P] Add missing window globals to `src/types/global.d.ts` — add `window.viewModel` (instance), `window.tabController`, `window.loginModal`, `window.loginModalInstance`, `window.termsModal`, `window.termsModalInstance`, `window.privacyModal`, `window.privacyModalInstance`, `window.termsOnConfirmationCallback`, `window.TONIC_ENV`, `window.overrideMaintenanceMode`, `window.clearServerCache`
- [X] T005 Strengthen `UserSessionType` in `src/types/global.d.ts` — replace `Record<string, unknown>` return types with proper `AppConfigurationResponse`/`Period` types from shared models
- [X] T006 Verify `src/types/materialize.d.ts` covers all MaterializeCSS API surface used in the codebase (FR-004), then run `npx tsc --noEmit -p tsconfig.web.json` and verify error count dropped significantly (target: ~700 remaining)

**Checkpoint**: All window globals, prototype extensions, and Materialize types are declared. Remaining errors are parameter/return type annotations and DOM null-safety.

---

## Phase 3: User Story 1 — Type Utility and Extension Files (Priority: P1) 🎯 MVP

**Goal**: All utility functions have explicit TypeScript parameter types and return types.

**Independent Test**: `tsc --noEmit -p tsconfig.web.json` shows zero errors originating from `src/web/js/utilities/` and `src/web/js/extensions/`.

### Implementation for User Story 1

- [X] T007 [P] [US1] Type `src/web/js/utilities/registrationForm/timeHelpers.ts` — add param types (`string`, `number`) and return types to all 7 exported functions (`parseTime`, `formatTimeFromMinutes`, `formatDisplayTime`, `generateTimeOptions`, `calculateEndTime`, `isTimeBefore`, `isTimeAfter`)
- [X] T008 [P] [US1] Type `src/web/js/utilities/registrationForm/messageDisplay.ts` — add param and return types to all exported functions
- [X] T009 [P] [US1] Type `src/web/js/utilities/registrationForm/registrationValidator.ts` — add param and return types to all exported validation functions
- [X] T010 [P] [US1] Type `src/web/js/utilities/formatHelpers.ts` — add param and return types to `capitalize(str)` and `formatDateTime(timestamp)`. Extract duplicated `formatDateTime` from `src/web/js/tabs/adminWaitListTab.ts` (module-level) and `src/web/js/tabs/parentWeeklyScheduleTab.ts` (private `#formatDateTime`) into this file, then update both tabs to import from here (FR-009). Note: this task only extracts and types the `formatDateTime` function — full typing of both tab files happens in T039/T044.
- [X] T011 [P] [US1] Type `src/web/js/utilities/durationHelpers.ts` — add param and return types to all methods
- [X] T012 [P] [US1] Type `src/web/js/utilities/promiseHelpers.ts` — add param and return types to `promisify`, `promisifyWithResult`, `promisifyEvent`
- [X] T013 [P] [US1] Type `src/web/js/utilities/periodHelpers.ts` — add param and return type to `isEnrollmentPeriod(period)`
- [X] T014 [P] [US1] Type `src/web/js/utilities/registrationHelpers.ts` — add param and return type to `sortRegistrations(registrations)`
- [X] T015 [P] [US1] Type `src/web/js/utilities/classNameFormatter.ts` — add param and return types to `formatClassNameForDropdown(cls)` and `formatClassNameWithGradeCorrection(cls)`
- [X] T016 [P] [US1] Type `src/web/js/extensions/numberExtensions.ts` — add param types to `formatGrade(grade)` and `formatTime(time24)` standalone functions
- [X] T017 [P] [US1] Type `src/web/js/utilities/clipboardHelpers.ts` — add param and return types to all exported functions
- [X] T018 [P] [US1] Type `src/web/js/utilities/domHelpers.ts` — add param and return types to all exported functions (e.g., `resetMaterializeSelect`)
- [X] T019 [US1] Run `npx tsc --noEmit -p tsconfig.web.json` and verify utility/extension files produce zero errors

**Checkpoint**: All utility files typed. Error count significantly reduced.

---

## Phase 4: User Story 2 — Strengthen Window Global Declarations (Priority: P2)

**Goal**: All `window.*` global accesses resolve to concrete types (not `unknown` or `Record<string, unknown>`).

**Independent Test**: `tsc --noEmit -p tsconfig.web.json` shows no `TS18046` ('x' is of type 'unknown') errors for window globals.

### Implementation for User Story 2

- [X] T020 [P] [US2] Type `src/web/js/constants.ts` and `src/web/js/constants/intentConstants.ts` and `src/web/js/constants/registrationFormConstants.ts` — add explicit types to all exported constants and verify window assignments match declared types
- [X] T021 [US2] Update `unknown` placeholders in `src/types/global.d.ts` — replace `Table: unknown`, `Select: unknown`, `NavTabs: unknown`, `DomHelpers: unknown`, `DurationHelpers: unknown`, `PromiseHelpers: unknown`, `IndexedDbClient: unknown` with `typeof` class references (replaced directly since classes are already importable)
- [X] T022 [US2] Run `npx tsc --noEmit -p tsconfig.web.json` and verify zero `TS18046` (unknown) and zero `TS2304` (cannot find name) errors

**Checkpoint**: All window globals have concrete types. Remaining errors are source-file annotations.

---

## Phase 5: User Story 3 — Type Component Classes (Priority: P3)

**Goal**: All component classes have fully typed constructors, properties, methods, and DOM interactions.

**Independent Test**: `tsc --noEmit -p tsconfig.web.json` shows zero errors from `src/web/js/components/`, `src/web/js/data/indexedDbClient.ts`, and `src/web/js/feedback.ts`.

### Implementation for User Story 3

- [X] T023 [P] [US3] Type `src/web/js/components/select.ts` — add class property declarations, constructor param types, method param and return types
- [X] T024 [P] [US3] Type `src/web/js/components/table.ts` — add class property declarations, constructor param types, method param and return types; fix DOM element typing for filter elements
- [X] T025 [P] [US3] Type `src/web/js/data/indexedDbClient.ts` — add class property declarations (`db: IDBDatabase | null`), constructor param types (`dbName: string, storeNames: string[]`), method param and return types with generics for `getAll<T>`
- [X] T026 [P] [US3] Type `src/web/js/components/registrationForm/classSelector.ts` — add constructor param types, method types, callback signature types
- [X] T027 [P] [US3] Type `src/web/js/components/registrationForm/instructorSelector.ts` — add constructor param types, method types, callback signature types
- [X] T028 [P] [US3] Type `src/web/js/components/registrationForm/lessonDetailsForm.ts` — add constructor param types, method types, callback signatures; fix `querySelector<HTMLInputElement>` for radio buttons
- [X] T029 [P] [US3] Type `src/web/js/components/registrationForm/registrationTypeSelector.ts` — add constructor param types, method types; fix `.capitalize()` usage
- [X] T030 [P] [US3] Type `src/web/js/components/registrationForm/studentSelector.ts` — add constructor param types, method types; fix `M.Autocomplete.init` typing
- [X] T031 [P] [US3] Type `src/web/js/components/registrationForm/transportationSelector.ts` — add constructor param types; fix `NodeListOf<Element>` → `NodeListOf<HTMLInputElement>` for radio buttons
- [X] T032 [P] [US3] Type `src/web/js/components/dropRequestModal.ts` — add class property declarations, constructor param types (registration, options), method param and return types
- [X] T033 [P] [US3] Type `src/web/js/components/navTabs.ts` — add class property declarations, constructor param types, method types; type `window.*` global accesses
- [X] T034 [P] [US3] Type `src/web/js/feedback.ts` — add class property declarations, constructor param type, method types; fix DOM null-safety
- [X] T035 [US3] Update `src/types/global.d.ts` — replace temporary structural types from T021 with `typeof` references to now-typed classes (`Table`, `Select`, `NavTabs`, `IndexedDbClient`, `DomHelpers`, etc.)
- [X] T036 [US3] Run `npx tsc --noEmit -p tsconfig.web.json` and verify zero errors from component files

**Checkpoint**: All components typed. Remaining errors are tabs and workflows only.

---

## Phase 6: User Story 4 — Type Tab Classes (Priority: P4)

**Goal**: All 8 tab classes have fully typed methods, properties, and DOM interactions.

**Independent Test**: `tsc --noEmit -p tsconfig.web.json` shows zero errors from `src/web/js/tabs/`.

### Implementation for User Story 4

- [X] T037 [P] [US4] Type `src/web/js/tabs/adminMasterScheduleTab.ts` — add class property declarations, `fetchData(sessionInfo)` param type, all private method param and return types, `event.target` narrowing, DOM element typing
- [X] T038 [P] [US4] Type `src/web/js/tabs/adminRegistrationTab.ts` — add class property declarations, `fetchData` param type, all method types
- [X] T039 [P] [US4] Type `src/web/js/tabs/adminWaitListTab.ts` — add class property declarations, `fetchData` param type, all method types; remove local `formatDateTime` (moved to formatHelpers in T010)
- [X] T040 [P] [US4] Type `src/web/js/tabs/employeeDirectoryTab.ts` — add class property declarations, all method types; create `EmployeeDisplay` interface for mapped employee objects
- [X] T041 [P] [US4] Type `src/web/js/tabs/instructorWeeklyScheduleTab.ts` — add class property declarations, all method types; type `Map` generics
- [X] T042 [P] [US4] Type `src/web/js/tabs/parentContactTab.ts` — add class property declarations, all method types; reuse `EmployeeDisplay` from T040
- [X] T043 [P] [US4] Type `src/web/js/tabs/parentRegistrationTab.ts` — add class property declarations, all method types
- [X] T044 [P] [US4] Type `src/web/js/tabs/parentWeeklyScheduleTab.ts` — add class property declarations, all method types; remove `#formatDateTime` (moved in T010); type `Map` generics; fix `event.target` narrowing for intent dropdowns
- [X] T045 [US4] Run `npx tsc --noEmit -p tsconfig.web.json` and verify zero errors from tab files

**Checkpoint**: All tabs typed. Remaining errors are in the 3 large workflow/viewModel files only.

---

## Phase 7: User Story 5 — Type Workflow Classes and ViewModel (Priority: P5)

**Goal**: The three largest untyped files are fully typed with zero implicit `any`.

**Independent Test**: `tsc --noEmit -p tsconfig.web.json` passes with **zero errors total**.

### Implementation for User Story 5

- [X] T046 [P] [US5] Type `src/web/js/workflows/adminRegistrationForm.ts` — add class property declarations, constructor param types (with interfaces for complex params), all method param and return types, DOM/event type narrowing
- [X] T047 [P] [US5] Type `src/web/js/viewModel.ts` — add all class property declarations with explicit types, all method param types (including callback signatures), all return types, DOM/event type narrowing; strengthen `ViewModelType` in global.d.ts to match actual class
- [X] T048 [US5] Type `src/web/js/workflows/parentRegistrationForm.ts` — add class property declarations, constructor param types (with interfaces), all ~55 method param and return types, DOM/event narrowing, inline helper typing (e.g., `isGradeEligible`)
- [X] T049 [US5] Final update to `src/types/global.d.ts` — replace `ViewModelType` escape hatch with proper ViewModel class type reference

**Checkpoint**: All web files fully typed.

---

## Phase 8: Polish & Verification

**Purpose**: Final validation that all success criteria are met.

- [X] T050 Run `npx tsc --noEmit -p tsconfig.web.json` — PASS: zero errors
- [X] T051 Run `npm run build:frontend` (Vite build) — Pre-existing failure in uuidUtility.ts (Node.js crypto import, unrelated to type hardening)
- [X] T052 Run `npm test` — PASS: 707 tests, 41 suites, all pass
- [X] T053 Verify SC-002: getElementById calls without null handling — PASS: zero violations
- [X] T054 Verify SC-003: event.target.value/checked without type narrowing — PASS: zero violations
- [X] T055 Verify SC-006: formatDateTime in exactly one location (formatHelpers.ts), imported by both tabs — PASS

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — can run in parallel with Phase 4
- **Phase 4 (US2)**: Depends on Phase 2 — can run in parallel with Phase 3
- **Phase 5 (US3)**: Depends on Phase 3 (utilities) + Phase 4 (globals)
- **Phase 6 (US4)**: Depends on Phase 5 (components)
- **Phase 7 (US5)**: Depends on Phase 6 (tabs)
- **Phase 8 (Polish)**: Depends on Phase 7

### Within Each Phase

- Tasks marked [P] can run in parallel (different files, no dependencies)
- Verification tasks (T006, T019, T022, T036, T045, T050-T055) MUST run after their phase's implementation tasks

### Parallel Opportunities

Phase 3 (US1) has 12 parallel tasks (T007-T018) — all touch different utility files.
Phase 5 (US3) has 12 parallel tasks (T023-T034) — all touch different component files.
Phase 6 (US4) has 8 parallel tasks (T037-T044) — all touch different tab files.
Phase 7 (US5) has T046+T047 in parallel (different files), then T048 sequential (largest file).

---

## Implementation Strategy

### Incremental Delivery

1. Phase 1-2: Fix tsconfig + declarations → ~1,141 errors eliminated
2. Phase 3: Type utilities → ~100 more errors eliminated
3. Phase 4: Strengthen globals → remaining unknown/name errors eliminated
4. Phase 5: Type components → component-layer errors eliminated
5. Phase 6: Type tabs → tab-layer errors eliminated
6. Phase 7: Type workflows + viewModel → **zero errors**
7. Phase 8: Final verification

Each phase commit produces a monotonically decreasing error count, converging to zero.

---

## Notes

- All tasks are types-only changes — zero behavioral modifications (except FR-009 `formatDateTime` consolidation, which is a safe refactor)
- `parentRegistrationForm.ts` (3,529 lines, T048) is by far the largest task — budget extra time
- The `as unknown as` cast in `tabController.ts` is intentionally left as-is (assessed in 007)
- Vite ignores TypeScript errors during build — `tsc` is the sole type authority
