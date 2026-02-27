# Tasks: Frontend Tab Layer Cleanup

**Input**: Design documents from `/specs/010-frontend-tab-cleanup/`
**Prerequisites**: [spec.md](spec.md), [plan.md](plan.md)
**Tests**: Not requested — no frontend test infrastructure exists for affected files.

**Organization**: Tasks grouped by user story. Group A (foundational) must complete before Groups B and C. Group D is independent throughout.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Foundational — Shared Infrastructure

**Purpose**: New files that are prerequisites for user story work. No user story tasks can use these until they exist.

**⚠️ CRITICAL**: T001 must complete before Phase 3. T002 must complete before Phase 4.

- [X] T001 Create `AdminBaseTab` abstract class in `src/web/js/core/adminBaseTab.ts`: import `BaseTab` and `SessionInfo` from `./baseTab.js`; implement `getTrimester(): string | null` (query `#admin-trimester-buttons .trimester-btn.active`, fall back to `window.UserSession?.getCurrentPeriod()?.trimester`, return `null` if neither yields a non-empty string); implement `attachEventListeners()` (query `#admin-trimester-buttons`, on click of `.trimester-btn` remove `.active` from all buttons, add `.active` to clicked button, call `this.reload()`)

- [X] T002 Create shared directory helpers in `src/web/js/utilities/directoryHelpers.ts`: export `EmployeeDisplay` interface (`id`, `fullName`, `email`, `phone`, `roles`, optional `role`, `firstName`, `lastName`); export `sortEmployeesForDirectory(employees: EmployeeDisplay[]): EmployeeDisplay[]` (copied verbatim from `employeeDirectoryTab.ts` lines 213–254); export `buildDirectoryTableRow(employee: EmployeeDisplay): string` (copied verbatim from `employeeDirectoryTab.ts` lines 117–138)

---

## Phase 2: User Story 1 & 5 — Error Handling (Priority: P1)

**US1 Goal**: Admin tabs return `{ ok: false }` when no trimester is determinable, instead of throwing an unhandled exception.

**US5 Goal**: `initializeAsync()` shows a full-page error and stops if `getAppConfiguration` fails.

**Independent Test (US1)**: With `window.UserSession` returning `undefined` for `getCurrentPeriod()` and no `.trimester-btn.active` in the DOM, load any admin tab. Verify the inline error banner appears with "Could not determine trimester" and no uncaught promise rejection fires.

**Independent Test (US5)**: Block the `getAppConfiguration` network request and reload the page. Verify a full-page error message appears in the page body and the login modal does not open.

**⚠️ Depends on T001 for T003–T005**

- [X] T003 [US1] Update `src/web/js/tabs/adminMasterScheduleTab.ts`: change `extends BaseTab` to `extends AdminBaseTab`; add import for `AdminBaseTab` from `../core/adminBaseTab.js`; remove the existing `#getTrimester()` private method (lines 756–765); remove the existing `attachEventListeners()` override (lines 781–799); in `fetchData()`, replace `this.#getTrimester()` call with `const trimester = this.getTrimester(); if (!trimester) { return { ok: false, error: { message: 'Could not determine trimester: no button selected and no current period' } }; }`; in `#deleteRegistration()`, replace `this.#getTrimester()` with `this.getTrimester() ?? ''` (trimester will be present if delete is reachable from a loaded tab, but the call must not break TypeScript)

- [X] T004 [US1] Update `src/web/js/tabs/adminWaitListTab.ts`: change `extends BaseTab` to `extends AdminBaseTab`; add import for `AdminBaseTab` from `../core/adminBaseTab.js`; remove the existing `#getTrimester()` private method (lines 231–240); remove the existing `attachEventListeners()` override; in `fetchData()`, replace `this.#getTrimester()` call with `const trimester = this.getTrimester(); if (!trimester) { return { ok: false, error: { message: 'Could not determine trimester: no button selected and no current period' } }; }`; in `#deleteRegistration()`, replace `this.#getTrimester()` with `this.getTrimester() ?? ''`

- [X] T005 [US1] Update `src/web/js/tabs/adminRegistrationTab.ts`: change `extends BaseTab` to `extends AdminBaseTab`; add import for `AdminBaseTab` from `../core/adminBaseTab.js`; remove the `attachEventListeners()` override (lines 122–140); in `fetchData()`, remove the four-line inlined trimester block (lines 46–53) and replace with `const trimester = this.getTrimester(); if (!trimester) { return { ok: false, error: { message: 'Could not determine trimester: no button selected and no current period' } }; } this.currentTrimester = trimester;` so that `this.currentTrimester` is still assigned

- [X] T006 [US5] Update `src/web/js/viewModel.ts` `initializeAsync()`: immediately after `const appConfig = configResult.ok ? configResult.data : null;` (line 98), add: `if (!appConfig) { this.#showConfigError(); return; }` where `#showConfigError()` is a new private method that renders a full-page error into the main page body element (follow the same element targeting pattern as `#showMaintenanceMode`) with the text "Unable to load application configuration. Please reload the page." and a Reload button that calls `window.location.reload()`

**Checkpoint**: All three admin tabs surface a visible error banner instead of an unhandled exception when trimester context is missing. Config failure on page load shows a full-page error.

---

## Phase 3: User Story 2 — Trimester Selector Consistency (Priority: P2)

**Goal**: Trimester-wiring and trimester-reading logic exist in exactly one file (`adminBaseTab.ts`). The three admin tab files contain no local equivalent.

**Independent Test**: Switch the active trimester button while on any admin tab — verify the tab reloads. Switch tabs and confirm each reads and responds to the selector identically.

**Note**: This phase has no additional code changes beyond Phase 2. The trimester consistency requirement (SC-003) is fully satisfied by T001 (which created `AdminBaseTab` with `getTrimester()` and `attachEventListeners()`) and T003–T005 (which removed local copies from each tab). Verification of SC-003 (T007) is performed in Phase 7 alongside all other success-criteria checks.

**Checkpoint**: SC-003 is satisfied by Phase 2 completion. No new tasks in this phase.

---

## Phase 4: User Story 3 — Directory Deduplication (Priority: P3)

**Goal**: `sortEmployeesForDirectory` and `buildDirectoryTableRow` exist in exactly one file. Both directory tabs produce identical row order and HTML for the same input.

**Independent Test**: View the employee directory and the parent contact tab. Both must display admins in priority order followed by instructors alphabetically, with identical row structure.

**⚠️ Depends on T002**

- [X] T008 [P] [US3] Update `src/web/js/tabs/employeeDirectoryTab.ts`: add imports `import { EmployeeDisplay, sortEmployeesForDirectory, buildDirectoryTableRow } from '../utilities/directoryHelpers.js';`; remove the local `EmployeeDisplay` interface (lines 31–40); remove the `#sortEmployeesForDirectory` method (lines 213–255); remove the `#buildTableRow` method (lines 117–138); replace all call sites: `this.#sortEmployeesForDirectory(allEmployees)` → `sortEmployeesForDirectory(allEmployees)`, `this.#buildTableRow.bind(this)` → `buildDirectoryTableRow`

- [X] T009 [P] [US3] Update `src/web/js/tabs/parentContactTab.ts`: add imports `import { EmployeeDisplay, sortEmployeesForDirectory, buildDirectoryTableRow } from '../utilities/directoryHelpers.js';`; remove the local `EmployeeDisplay` interface (lines 14–23); remove the `#sortEmployeesForDirectory` method (lines 239–281); remove the `#buildTableRow` method (lines 137–158); replace all call sites: `this.#sortEmployeesForDirectory(allEmployees)` → `sortEmployeesForDirectory(allEmployees)`, `this.#buildTableRow.bind(this)` → `buildDirectoryTableRow`

**Checkpoint**: SC-004 satisfied — sort and row-build logic exist in exactly one file. Both tabs compile and render correctly.

---

## Phase 5: User Story 4 — Debug Log Removal (Priority: P3)

**Goal**: Zero `console.log` output during normal app use from the affected files.

**Independent Test**: Load the admin master schedule tab — no `[Master Schedule]` log entries appear. Submit a private registration — no `Validating registration...` logs appear. Trigger a Materialize select reset — no logs appear. Orphaned registration warns are still visible.

- [X] T010 [P] [US4] Remove debug logs from `src/web/js/tabs/adminMasterScheduleTab.ts`: delete lines 118–143 in `render()` (the `console.log('[Master Schedule] Render starting')` block and the sample-registration block); delete all `console.log` calls in `#excludeRockBandClasses()` (the per-registration filter logs); verify all `console.warn` calls for orphaned records remain untouched

- [X] T011 [P] [US4] Remove debug logs from `src/web/js/components/registrationForm/parentPrivateSubmission.ts`: remove all `console.log` calls in `#validateRegistration()` (lines 110, 119, 126, 132–133, 138, 150, 158, 165, 169, 185, 209, 214); at the start of the `if (!selectedLesson) {` block (line 131), add the comment: `// TODO: This DOM fallback compensates for selectedLesson being null when it should not be — likely a race condition or event handler not firing in the timeslot selection lifecycle. The root cause requires separate investigation (out of scope).`; do not change any logic

- [X] T012 [P] [US4] Remove debug logs from `src/web/js/utilities/domHelpers.ts` `resetMaterializeSelect()`: remove `console.log` at line 36–38 (resetting log); remove `console.warn` at line 45 (M undefined); remove `console.warn` at line 47 (M.FormSelect undefined); remove `console.log` at line 51 (reinitialized log); remove `console.log` at line 57 (triggered change event log); remove `console.log` at line 60 (reset complete log); preserve the `console.warn` at line 33 ("Select element not found for clearing") — that is a legitimate missing-element warning

**Checkpoint**: SC-001 satisfied — no debug console.log output during normal operation.

---

## Phase 6: Dead Code Removal

**Goal**: `registrationHelpers.ts` does not exist. No import references it.

- [X] T013 [US4] Delete `src/web/js/utilities/registrationHelpers.ts`. Verify no file in the codebase imports from this path by grepping for `registrationHelpers` before deleting.

**Checkpoint**: SC-005 satisfied.

---

## Phase 7: Verification

**Purpose**: Confirm all success criteria are met and TypeScript compiles cleanly.

- [X] T014 Run TypeScript compiler to verify no type errors: `npx tsc --noEmit` from repo root (or equivalent build step). Fix any type errors introduced by the changes — most likely in `adminMasterScheduleTab.ts` if `getTrimester()` return type handling needs adjustment.

- [X] T007 [P] [US2] Verify SC-003: grep the codebase for `getTrimester` — confirm it appears only in `adminBaseTab.ts` and the three tab files' `fetchData` call sites (as `this.getTrimester()`). Grep for `trimester-btn` event listener wiring — confirm it appears only in `adminBaseTab.ts`.

- [X] T015 [P] Verify SC-003 (trimester logic in one file): `grep -r "getTrimester\|trimester-btn.*active" src/web/js/tabs/` — confirm only `this.getTrimester()` call sites appear in tab files, no method definitions

- [X] T016 [P] Verify SC-004 (directory helpers in one file): `grep -r "sortEmployeesForDirectory\|buildDirectoryTableRow\|buildTableRow" src/web/js/tabs/` — confirm no definitions appear in tab files, only import references

- [X] T017 [P] Verify SC-005 (registrationHelpers deleted): confirm `src/web/js/utilities/registrationHelpers.ts` does not exist; `grep -r "registrationHelpers" src/web/js/` returns no results

- [X] T018 [P] Verify SC-001 (no debug logs): `grep -rn "console\.log" src/web/js/tabs/adminMasterScheduleTab.ts src/web/js/utilities/domHelpers.ts src/web/js/components/registrationForm/parentPrivateSubmission.ts` — expect zero matches

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately; T001 and T002 are parallel
- **Phase 2 (US1 + US5)**: T003–T005 depend on T001; T006 is independent
- **Phase 3 (US2)**: No new tasks — SC-003 is satisfied by Phase 2; T007 verification runs in Phase 7
- **Phase 4 (US3)**: T008–T009 depend on T002; can run in parallel with Phase 2
- **Phase 5 (US4)**: T010–T012 are fully independent — can run at any time
- **Phase 6 (dead code)**: T013 independent — can run at any time
- **Phase 7 (verification)**: Depends on all prior phases complete

### Parallel Opportunities

```bash
# Phase 1 — run in parallel:
T001  # adminBaseTab.ts (new file)
T002  # directoryHelpers.ts (new file)

# Phase 2 — T003–T005 require T001; T006 is independent of T001:
T003  # adminMasterScheduleTab.ts (after T001)
T004  # adminWaitListTab.ts (after T001)
T005  # adminRegistrationTab.ts (after T001)
T006  # viewModel.ts (independent)

# Phase 4 — run in parallel (both require T002):
T008  # employeeDirectoryTab.ts (after T002)
T009  # parentContactTab.ts (after T002)

# Phase 5 — all three independent, run in parallel:
T010  # adminMasterScheduleTab.ts log removal
T011  # parentPrivateSubmission.ts log removal
T012  # domHelpers.ts log removal

# Phase 7 verification — T007, T015–T018 all parallel after T014:
T014  # tsc --noEmit (run first)
T007, T015, T016, T017, T018  # grep verifications (after T014)
```

### Earliest possible start

| Task | Can start after |
|------|----------------|
| T001, T002, T006, T010, T011, T012, T013 | Immediately |
| T003, T004, T005 | T001 |
| T008, T009 | T002 |
| T007, T014–T018 | All prior tasks |

---

## Implementation Strategy

### MVP (US1 + US5 only — P1 stories)

1. Complete T001 (adminBaseTab.ts)
2. Complete T003, T004, T005 in parallel (admin tab rewiring)
3. Complete T006 (config gate)
4. **Validate**: Verify no unhandled rejections from admin tabs; verify config failure shows full-page error

### Full delivery order

1. T001, T002 in parallel (foundations)
2. T003, T004, T005, T006 (P1 stories)
3. T007 (US2 verification — fast)
4. T008, T009 in parallel (US3 directory deduplication)
5. T010, T011, T012, T013 in parallel (US4 log removal + dead code)
6. T014 → T015, T016, T017, T018 (verification)

---

## Notes

- No tests are generated — the spec explicitly states no frontend test files exist for affected files and this cleanup does not introduce new tests
- T007 is a verification task, not an implementation task — it confirms Phase 2 satisfied US2 with no additional code
- `#deleteRegistration` in both master schedule and wait list tabs calls `getTrimester()` — after the change it calls `this.getTrimester()` (inherited). Since delete is only reachable from a loaded tab (which means trimester was already resolved), the non-null assertion or `?? ''` fallback is safe
- The `obscurePhone` parameter on `#mapInstructorToEmployee` in `employeeDirectoryTab.ts` is not used (always `false` default) but must be preserved — do not remove it
