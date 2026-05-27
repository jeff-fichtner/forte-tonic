# Feature Specification: Dissolve ViewModel — App Startup Consolidation

**Feature Branch**: `011-dissolve-viewmodel`
**Created**: 2026-02-27
**Status**: Implemented

## Overview

`viewModel.ts` is a historical artifact from before the tab architecture existed. It was originally the entire application. Now that tabs own their own data and rendering, `ViewModel` is just the startup sequence plus login state — it should not be a class. This feature dissolves the class into `main.ts` and extracts the login and terms/privacy modal logic into dedicated modules.

---

## User Scenarios & Testing

### User Story 1 — App Starts and Behaves Identically After Refactor (Priority: P1)

A developer or end user loads the application. Every existing behaviour — config loading, maintenance mode, terms acceptance, login modal, auto-login from stored credentials, session expiry — works identically before and after this change. No user-visible behaviour changes.

**Why this priority**: This is the primary correctness requirement. The entire value of this refactor is code organisation; the app must continue to work exactly as before.

**Independent Test**: Load the app fresh (no stored credentials). Verify: loading spinner shows, config loads, terms modal appears for first-time users, login modal opens after terms acceptance, parent phone and employee code login both work, post-login tabs appear and load correctly.

**Acceptance Scenarios**:

1. **Given** a first-time user with no stored credentials, **When** the page loads, **Then** the terms modal appears, accepting it opens the login modal, and logging in successfully shows the correct role's tabs.
2. **Given** a returning user with stored credentials, **When** the page loads, **Then** auto-login completes and the user's tabs appear without the login modal opening.
3. **Given** a logged-in user whose session expires (401 from any API call), **When** the expiry is detected, **Then** the login modal reopens automatically.
4. **Given** maintenance mode is active in the config, **When** the page loads, **Then** the maintenance overlay is shown and the login modal does not open.
5. **Given** `getAppConfiguration` fails, **When** the page loads, **Then** a full-page config error is shown with a reload button.

---

### User Story 2 — Login Modal Logic Lives in Its Own Module (Priority: P2)

The login form — tab switching between parent/employee, phone formatting, access code validation, submit handling, error display — lives in `src/web/js/auth/loginModal.ts` as a self-contained module. `main.ts` calls `LoginModal.init(onLoginSuccess)` and `LoginModal.open()`.

**Why this priority**: Isolating login form logic is the primary structural goal. It makes `main.ts` readable and makes the login behaviour independently understandable and modifiable.

**Independent Test**: After extraction, `loginModal.ts` can be read in isolation and fully describes the login form behaviour. `main.ts` contains no phone formatting, no access code validation, no tab-switching logic.

**Acceptance Scenarios**:

1. **Given** the login module is initialised with an `onLoginSuccess` callback, **When** login succeeds, **Then** the callback is invoked with the authenticated user and role.
2. **Given** the login modal is open on the parent tab, **When** a valid 10-digit phone is entered and submitted, **Then** the auth request is sent and success/failure is handled correctly.
3. **Given** the login modal is open on the employee tab, **When** a 6-digit access code is entered and submitted, **Then** the auth request is sent and success/failure is handled correctly.
4. **Given** login fails, **When** the error response arrives, **Then** the appropriate error toast is shown and the modal reopens.

---

### User Story 3 — Terms and Privacy Modal Logic Lives in Its Own Module (Priority: P2)

Terms of Service and Privacy Policy modal behaviour — first-time non-dismissible mode, keyboard handler patching, acceptance state, the callback pattern — lives in `src/web/js/auth/termsModal.ts`. `main.ts` calls `TermsModal.init()` and `TermsModal.showIfNeeded(onConfirmed)`.

**Why this priority**: Same structural reason as US2 — isolates complex Materialize modal workarounds into one place.

**Independent Test**: After extraction, `termsModal.ts` describes all terms/privacy modal behaviour. `main.ts` contains no non-dismissible modal logic, no keyboard handler patching, no `termsOnConfirmationCallback` assignment.

**Acceptance Scenarios**:

1. **Given** a user who has never accepted terms, **When** `showIfNeeded` is called, **Then** the terms modal opens in non-dismissible mode (ESC blocked, overlay click blocked).
2. **Given** the non-dismissible terms modal is open, **When** the user clicks "I Understand", **Then** acceptance is recorded, the modal closes, and the `onConfirmed` callback fires.
3. **Given** a user who has already accepted terms, **When** `showIfNeeded` is called, **Then** `onConfirmed` fires immediately without showing the modal.

---

### User Story 4 — ViewModel Class Is Deleted (Priority: P3)

`src/web/js/viewModel.ts` no longer exists. `main.ts` contains all startup orchestration as plain module-level functions and variables. `window.viewModel` is removed.

**Why this priority**: Depends on US1–US3 being complete. This is the cleanup step that closes out the refactor.

**Independent Test**: `grep -r "viewModel" src/web/js/` returns no results. TypeScript compiles with no new errors.

**Acceptance Scenarios**:

1. **Given** the refactor is complete, **When** `src/web/js/viewModel.ts` is checked for, **Then** the file does not exist.
2. **Given** `navTabs.ts` previously read `window.viewModel.currentUser`, **When** the refactor is complete, **Then** `NavTabs` exposes `setCurrentUser(user)` and `main.ts` calls it after login — no `window.viewModel` reference remains.
3. **Given** `feedback.ts` previously received a ViewModel instance, **When** the refactor is complete, **Then** it receives an equivalent plain state object and captures the same diagnostic fields.

---

### Edge Cases

- What if `LoginModal.init()` is called before the DOM is ready? `main.ts` already awaits `DOMContentLoaded` before calling it — no change needed.
- What if `TermsModal.showIfNeeded` is called when terms are already accepted? `onConfirmed` fires immediately — same net behaviour as before.
- What about `navTabs.ts` reading `window.viewModel?.currentUser` to build session info? `currentUser` must be set before any nav tab click fires (which is after `loadUserData` completes). `window.appState.currentUser` satisfies this.
- What about `feedback.ts` reading vestigial `viewModel.students`, `viewModel.classes`, etc.? These properties were never populated after the tab refactor — tabs own their data. The counts already return 0 today and will continue to do so.
- What about `window.ViewModel` exposed for console debugging? It is removed. It was not used in practice after the tab migration.

---

## Requirements

### Functional Requirements

- **FR-001**: All startup orchestration currently in `ViewModel.initializeAsync()` MUST be inlined into `initializeApplication()` in `main.ts` as plain function calls — no class instantiation.
- **FR-002**: Login form logic MUST be extracted to `src/web/js/auth/loginModal.ts` and exported as module functions (`init`, `open`).
- **FR-003**: Terms and privacy modal logic MUST be extracted to `src/web/js/auth/termsModal.ts` and exported as module functions (`init`, `showIfNeeded`).
- **FR-004**: All state previously held on the ViewModel instance (`currentUser`, `navTabs`, `feedbackManager`, `roleToClick`, `parentRegistrationForm`, initialization flags) MUST become module-level variables in `main.ts`.
- **FR-005**: `navTabs.ts` MUST NOT reference `window.viewModel`. `NavTabs` MUST expose a `setCurrentUser(user)` method; `main.ts` calls it in the login-success callback after `loadUserData` completes.
- **FR-006**: `feedback.ts` MUST NOT reference `window.viewModel`. It MUST receive application state via a plain object parameter satisfying its existing `FeedbackViewModel` interface.
- **FR-007**: `src/web/js/viewModel.ts` MUST be deleted after all references are removed.
- **FR-008**: `window.viewModel` and `window.ViewModel` MUST be removed from `global.d.ts` and from all references in `main.ts`.
- **FR-009**: `window.appState` is NOT introduced. `NavTabs` owns its own `currentUser` state via `setCurrentUser()`.
- **FR-010**: The TypeScript compiler MUST report no new errors after the refactor.

### Key Entities

- **`currentUser`**: The authenticated user object (admin/instructor/parent shape). Was `ViewModel.currentUser`; becomes a module-level variable in `main.ts`, pushed into `NavTabs` via `setCurrentUser()` after login.
- **`LoginModal`**: New module encapsulating login form state and behaviour. Stateful (holds Materialize modal instance, current login type).
- **`TermsModal`**: New module encapsulating terms/privacy modal state and behaviour. Stateful (holds Materialize modal instances).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: `viewModel.ts` does not exist after the refactor — verified by file system check.
- **SC-002**: `main.ts` contains no Materialize modal initialisation code for login, terms, or privacy modals directly — those live entirely in `auth/loginModal.ts` and `auth/termsModal.ts`.
- **SC-003**: `navTabs.ts` and `feedback.ts` contain zero references to `window.viewModel` — verified by grep. `navTabs.ts` exposes `setCurrentUser()` and contains no `window.appState` references.
- **SC-004**: TypeScript compiler (`tsc --noEmit`) reports zero new errors compared to baseline.
- **SC-005**: All five startup scenarios in US1 (fresh user, returning user, session expiry, maintenance mode, config failure) continue to work correctly.
- **SC-006**: `main.ts` does not exceed 600 lines after absorbing startup orchestration.

---

## Assumptions

- `navTabs.ts` will receive `currentUser` via a new `setCurrentUser(user)` method called by `main.ts` in the login-success callback. This keeps `NavTabs` fully self-contained with no `window` globals for user state.
- `feedback.ts` already receives its state via the `FeedbackManager` constructor. The constructor argument type changes from a `ViewModel` instance to a plain state object — the existing `FeedbackViewModel` interface (`[key: string]: unknown`) already accommodates this.
- `window.ViewModel` (the class exposed for console debugging) is removed with no replacement.
- No frontend tests exist for these files, so no test changes are required.
- The vestigial `students`, `classes`, `registrations` etc. properties that `FeedbackManager.#captureState()` reads from the ViewModel already return 0 today (tabs own their data). They will continue to return 0 after the refactor — no diagnostic regression.
