# Feature Specification: Frontend Tab Layer Cleanup

**Feature Branch**: `010-frontend-tab-cleanup`
**Created**: 2026-02-27
**Status**: Implemented

## Overview

The frontend tab system uses a `BaseTab` class that all tab implementations extend. After an earlier HttpResult migration, several structural problems remain: duplicate code across admin tabs, error-handling gaps that produce silent failures, debug logs left in production code, and shared logic that exists in two places instead of one. Additionally, the application initialization does not gate on configuration availability — if the `getAppConfiguration` call fails, the app silently continues with null session data, causing every downstream component to fail individually with no user feedback. This is a code health cleanup — no user-visible behaviour changes are intended beyond replacing silent failures with explicit error states.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin tab gracefully handles missing trimester context (Priority: P1)

An admin loads a tab (master schedule, wait list, or registration) when no trimester is determinable — either the trimester selector has not been activated yet, or `getCurrentPeriod()` returns nothing. Previously this produced a silent unhandled promise rejection with no UI feedback. After cleanup, the tab shows the standard inline error banner with a Retry button.

**Why this priority**: This is a real crash path — unhandled promise rejections have no user-facing recovery. Any admin who loads a tab before period data is available encounters a frozen tab with no explanation.

**Independent Test**: Load any admin tab immediately after clearing session period data. The tab must show an error banner, not a blank screen or console error.

**Acceptance Scenarios**:

1. **Given** an admin tab loads and no trimester can be determined, **When** `fetchData` runs, **Then** the tab displays the inline error banner ("Could not determine trimester") and does not throw an unhandled exception.
2. **Given** an admin tab is showing an error banner, **When** the user clicks Retry after period data is available, **Then** the tab loads successfully.
3. **Given** the trimester selector has an active button, **When** any admin tab loads, **Then** that trimester value is used without error.

---

### User Story 2 — Admin trimester selector works consistently across all admin tabs (Priority: P2)

An admin switches between the master schedule, wait list, and registration tabs. Each tab reads the active trimester button and reloads when a different trimester is selected. After cleanup, all three tabs share the same trimester-reading and selector-wiring logic through a common base class instead of duplicating it.

**Why this priority**: Duplicate logic means a bug fix or behaviour change to the trimester selector must be applied in three places. A missed update causes inconsistency between tabs.

**Independent Test**: Switch the active trimester button while on any admin tab — verify the tab reloads with data for the selected trimester. Switch tabs and verify the same selector produces the same trimester in each.

**Acceptance Scenarios**:

1. **Given** the admin trimester selector shows trimester A as active, **When** any admin tab loads, **Then** it fetches data for trimester A.
2. **Given** a different trimester button is clicked, **When** the click event fires, **Then** the active tab reloads with the new trimester's data.
3. **Given** the user switches between admin tabs, **When** the trimester selector is in a given state, **Then** all three tabs read and respond to it identically.

---

### User Story 3 — Directory tabs share sort and display logic (Priority: P3)

The employee directory (visible to instructors/admins) and the parent contact tab both display a sorted list of admins and instructors. Both tabs sort employees identically: admins by priority (Director → Associate Manager → Admin), then instructors alphabetically by last name. After cleanup, this sort logic and the row-rendering function live in one place.

**Why this priority**: Duplicate sort logic diverges silently. A change to admin role naming or sort priority currently requires updating two files.

**Independent Test**: View the employee directory and the parent contact tab. Both must display admins in priority order followed by instructors alphabetically, with identical row structure (Name, Role, Email, Phone, Contact button).

**Acceptance Scenarios**:

1. **Given** both directory tabs receive the same set of admins and instructors, **When** the table is rendered, **Then** both display rows in the same order.
2. **Given** a sort key changes (e.g., a new admin role is added), **When** the shared sort function is updated, **Then** both tabs reflect the change without further edits.

---

### User Story 4 — No debug output in the browser console during normal operation (Priority: P3)

A developer opens the browser console while using the app normally. No `console.log` output appears from form validation, registration filtering, or UI helper resets. Legitimate `console.warn` entries for actual data problems (orphaned registrations, missing students) remain.

**Why this priority**: Debug logs obscure real errors, expose internal data in production, and fire in loops (once per filtered registration, once per form select reset).

**Independent Test**: Load the admin master schedule tab and observe the console. Zero `[Master Schedule]` log entries appear. Submit a registration as a parent and observe the console — no `Validating registration...` or internal state logs appear.

**Acceptance Scenarios**:

1. **Given** the admin master schedule tab renders with any number of registrations, **When** the page loads, **Then** zero `console.log` entries appear from the tab or its filter methods.
2. **Given** a parent attempts to submit a private lesson registration, **When** `#validateRegistration` runs, **Then** no `console.log` entries appear (validation still works correctly).
3. **Given** a Materialize select element is reset by `DomHelpers.resetMaterializeSelect`, **When** the reset runs, **Then** no `console.log` entries appear.
4. **Given** a registration has an orphaned student or instructor reference, **When** the table is rendered, **Then** a `console.warn` entry appears (legitimate, must be preserved).

---

### User Story 5 — Application fails fast when configuration is unavailable (Priority: P1)

A user opens the app and the server is unreachable or the configuration endpoint returns an error. Instead of proceeding to the login modal with null session data — where any action would fail silently or produce cryptic errors — the app displays a full-page error message and stops initialization.

**Why this priority**: Missing configuration is an app-wide failure, not a per-tab failure. If `appConfig` is null, `getCurrentPeriod()` returns undefined everywhere. Every tab, every selector, every enrollment check degrades silently and independently. A single early gate prevents all of that.

**Independent Test**: Block the `getAppConfiguration` network request and load the page. A full-page error must appear. The login modal must not open.

**Acceptance Scenarios**:

1. **Given** the `getAppConfiguration` request fails (network error or non-2xx response), **When** the page loads, **Then** a full-page error message is displayed and no further initialization occurs.
2. **Given** the full-page error is displayed, **When** the user reloads the page and the configuration loads successfully, **Then** the app initializes normally.
3. **Given** the configuration loads successfully, **When** the page loads, **Then** initialization proceeds as before with no change to normal behaviour.

---

### Edge Cases

- What happens when `getCurrentPeriod()` returns a period object but `.trimester` is an empty string? → `getTrimester()` returns `null` (empty string is falsy), producing an error result from `fetchData`.
- What if the trimester selector DOM element does not exist on the page? → `getTrimester()` falls back to `currentPeriod?.trimester`; if that is also absent, returns `null`.
- What if `sortEmployeesForDirectory` is called with an empty array? → Returns empty array without error.
- What if the shared row builder receives a field that one tab populates and the other does not? → The `EmployeeDisplay` shape is normalised before calling the shared builder; both tabs map their source data to this shape before any shared function is called.
- What if `getAppConfiguration` fails on first load but the user reloads? → The full-page error shows; the user reloads; the app retries the fetch from scratch. No partial state is left from the failed attempt.

---

## Requirements *(mandatory)*

### Functional Requirements

**Admin shared base class (addresses problems 1, 2, 3):**

- **FR-001**: A shared `AdminBaseTab` class MUST extend `BaseTab` and be placed at `src/web/js/core/adminBaseTab.ts`.
- **FR-002**: `AdminBaseTab` MUST provide a `getTrimester(): string | null` method that checks the active `.trimester-btn` in `#admin-trimester-buttons`, then falls back to `window.UserSession?.getCurrentPeriod()?.trimester`, returning `null` if neither yields a non-empty value.
- **FR-003**: `AdminBaseTab` MUST provide a default `attachEventListeners()` that wires the trimester selector: on click of `.trimester-btn`, toggle `.active` class and call `this.reload()`.
- **FR-004**: `AdminMasterScheduleTab`, `AdminWaitListTab`, and `AdminRegistrationTab` MUST each extend `AdminBaseTab` instead of `BaseTab`.
- **FR-005**: Each admin tab's `fetchData` MUST call `this.getTrimester()`, and if the result is `null`, return `{ ok: false, error: { message: 'Could not determine trimester: no button selected and no current period' } }`.
- **FR-006**: Admin tabs that previously defined `attachEventListeners()` solely for trimester wiring MUST remove that override and rely on the inherited implementation from `AdminBaseTab`.

**Debug log removal (addresses problem 5):**

- **FR-007**: All `console.log` calls in `AdminMasterScheduleTab.render()` MUST be removed (the render-start log and the data-count/sample-registration block).
- **FR-008**: All `console.log` calls in `AdminMasterScheduleTab.#excludeRockBandClasses()` MUST be removed, including per-registration filter logs.
- **FR-009**: All `console.log` calls in `ParentPrivateSubmission.#validateRegistration()` MUST be removed. The DOM fallback block (lines 136–172) MUST remain functionally unchanged and MUST have a comment explaining it compensates for an unresolved `selectedLesson` state sync issue.
- **FR-010**: All debug `console.log` calls and the debug `console.warn` calls for Materialize availability in `DomHelpers.resetMaterializeSelect()` MUST be removed. The `console.warn` for a missing select element (element not found) MUST be preserved.
- **FR-011**: `console.warn` calls for orphaned registrations and missing students/instructors MUST be preserved unchanged.

**Directory deduplication (addresses problem 6):**

- **FR-012**: A new utility file MUST be created at `src/web/js/utilities/directoryHelpers.ts` exporting: the `EmployeeDisplay` interface, `sortEmployeesForDirectory(employees: EmployeeDisplay[]): EmployeeDisplay[]`, and `buildDirectoryTableRow(employee: EmployeeDisplay): string`.
- **FR-013**: `EmployeeDirectoryTab` MUST import these three exports and remove its local duplicate definitions.
- **FR-014**: `ParentContactTab` MUST import these three exports and remove its local duplicate definitions.
- **FR-015**: Both tabs MUST retain their own `#mapAdminsToEmployees` and `#mapInstructorToEmployee` methods, since these differ by field source (internal contact fields vs. public-facing display fields).

**Application initialization gate (addresses missing config):**

- **FR-017**: If the `getAppConfiguration` request fails or returns no data, `initializeAsync()` MUST display a full-page error message and return without proceeding to modal initialization, login, or any tab activation.
- **FR-018**: The full-page error MUST be visible in the main page body (not a modal, not a console message) and MUST instruct the user to reload the page.

**Dead code removal (addresses problem 7):**

- **FR-016**: `src/web/js/utilities/registrationHelpers.ts` MUST be deleted. No file in the codebase imports it.

### Key Entities

- **AdminBaseTab**: Intermediate class at `src/web/js/core/adminBaseTab.ts`. Extends `BaseTab`. Provides `getTrimester(): string | null` and default trimester `attachEventListeners()`. All three admin tab classes extend this.
- **EmployeeDisplay**: Shared interface in `directoryHelpers.ts`. Represents a normalised admin or instructor for directory rendering. Fields: `id: string`, `fullName: string`, `email: string`, `phone: string`, `roles: string[]`, optional `firstName?: string`, `lastName?: string`.
- **directoryHelpers.ts**: New utility at `src/web/js/utilities/directoryHelpers.ts`. Three exports: `EmployeeDisplay` (interface), `sortEmployeesForDirectory` (function), `buildDirectoryTableRow` (function).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero `console.log` output appears in the browser console during normal use of the admin master schedule tab, parent registration flow, or any form with Materialize selects.
- **SC-002**: Loading any admin tab when no trimester is determinable produces a visible inline error banner in the tab container — no uncaught promise rejections, no blank screen.
- **SC-003**: Trimester-reading logic (`getTrimester`) exists in exactly one file (`adminBaseTab.ts`). The three admin tab files contain no local equivalent.
- **SC-004**: `sortEmployeesForDirectory` and `buildDirectoryTableRow` exist in exactly one file (`directoryHelpers.ts`). Both directory tabs produce identical row order and row HTML for the same input.
- **SC-005**: `registrationHelpers.ts` does not exist in the codebase after cleanup. No import statements reference it.
- **SC-006**: All existing admin tab functionality (loading, filtering, email copy, delete, trimester switching) works correctly after cleanup — no regressions.
- **SC-007**: If `getAppConfiguration` fails on page load, a full-page error is visible and the login modal does not open. No silent continuation occurs.

---

## Assumptions

- The trimester button DOM element (`#admin-trimester-buttons`) is present whenever any admin tab is active. If absent, `getTrimester()` falls back to `currentPeriod?.trimester`. If that is also absent, it is a configuration failure that the initialization gate (FR-017) should have caught — the tab-level null return is a last-resort defensive measure, not the primary protection.
- If `getAppConfiguration` fails, the cause is either a network failure or a server error — both are unrecoverable without a reload. No retry logic is needed in this spec; a clear error message with a reload instruction is sufficient.
- The `EmployeeDisplay` shape covers all fields needed by both directory tabs. No additional fields are required beyond what both tabs currently produce in their mapping methods.
- The DOM fallback block in `ParentPrivateSubmission.#validateRegistration` is preserved as-is; the root cause of `selectedLesson` being null is out of scope and requires separate investigation.
- No frontend test files exist for the affected files; this cleanup does not introduce new tests.
- `console.warn` calls for data integrity issues (orphaned records, missing lookups) are intentional operational logging, not debug noise.

---

## Out of Scope

- Root cause fix for `selectedLesson` state sync bug in `ParentPrivateSubmission`
- `String.prototype.capitalize` vs standalone `capitalize` function duplication
- `feedback.ts` vestigial viewModel property reads
- `viewModel.ts` comment stubs
- `parentRegistrationForm._isEnrollmentPeriodActive` using string literals instead of `PeriodType` enum
- `BaseTab.findStudent` / `findInstructor` verbose pattern cleanup
