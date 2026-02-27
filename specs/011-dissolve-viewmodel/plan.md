# Implementation Plan: Dissolve ViewModel

**Branch**: `011-dissolve-viewmodel` | **Date**: 2026-02-27 | **Spec**: [spec.md](./spec.md)

## Summary

`viewModel.ts` (1317 lines) is a historical monolith predating the tab architecture. It contains three distinct concerns: login form UI logic (~500 lines), terms/privacy modal logic (~350 lines), and startup orchestration (~300 lines), plus ~180 lines of dead comment stubs and utility methods. This plan dissolves the class into:

1. `src/web/js/auth/loginModal.ts` — all login form state and behavior
2. `src/web/js/auth/termsModal.ts` — all terms/privacy modal state and behavior
3. `src/web/js/main.ts` — all startup orchestration as plain module-level functions
4. Surgical updates to `navTabs.ts` (add `setCurrentUser()`) and `feedback.ts` (pass plain state object)
5. Delete `viewModel.ts` and clean `global.d.ts`

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022, browser environment
**Primary Dependencies**: MaterializeCSS 1.0.0 (CDN), `ModalKeyboardHandler`, `HttpService`
**Storage**: N/A — frontend only
**Testing**: None — no frontend unit tests exist for these files
**Target Platform**: Browser (Vite-bundled ES modules)
**Project Type**: Frontend module reorganization within existing `src/web/js/` tree
**Performance Goals**: No change — pure refactor
**Constraints**: TypeScript must compile with zero new errors; all runtime behavior must be identical
**Scale/Scope**: ~1300 lines moved/reorganized across 5 files; 2 new files created; 1 deleted

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Pure code-move refactor; no new abstractions, no speculative structure |
| II. Data Consistency | PASS | No entity shape changes |
| III. Single Serialization Path | N/A | Frontend only |
| IV. Uniform API Responses | N/A | No new endpoints |
| V. Single Data Fetch Pattern | PASS | All API calls remain through `HttpService` |
| VI. No Dead Code | PASS | Dead comment stubs (lines 1102–1123) are explicitly removed |
| VII. Shared Models Are the Contract | N/A | No model changes |
| VIII. Role-Based Architecture | PASS | Role-detection logic preserved unchanged |
| IX. Trimester-Aware | N/A | No trimester logic touched |
| X. Google Sheets Is the Database | N/A | Frontend only |
| XI. Uniform CRUD Backend | N/A | Frontend only |

**Result**: No violations. No Complexity Tracking entry needed.

## Project Structure

### Documentation (this feature)

```text
specs/011-dissolve-viewmodel/
├── plan.md              # This file
├── research.md          # Phase 0 output (see below — no external research needed)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

No `data-model.md`, `contracts/`, or `quickstart.md` needed — this is a pure frontend refactor with no data model changes and no API changes.

### Source Code Changes

```text
src/web/js/
├── auth/                        # NEW directory
│   ├── loginModal.ts            # NEW — extracted from viewModel.ts
│   └── termsModal.ts            # NEW — extracted from viewModel.ts
├── components/
│   └── navTabs.ts               # MODIFY — add setCurrentUser(), remove window.viewModel refs
├── feedback.ts                  # MODIFY — remove window.viewModel, accept plain state object
├── main.ts                      # MODIFY — absorb orchestration, import auth modules
└── viewModel.ts                 # DELETE

src/types/
└── global.d.ts                  # MODIFY — remove ViewModelType, window.viewModel, window.ViewModel
```

**Structure Decision**: Single frontend project within existing `src/web/js/` tree. The `auth/` subdirectory mirrors the existing `components/`, `tabs/`, `utilities/` pattern for grouping related modules.

---

## Phase 0: Research

No external research needed. All technical decisions are fully determined by the existing codebase:

- **Module pattern**: ES module with named exports (`init`, `open`, `showIfNeeded`). Consistent with `HttpService`, `DomHelpers`, etc.
- **State ownership**: Module-level `let` variables in each auth module (same pattern as `AccessCodeManager` and `UserSession` in `main.ts`).
- **NavTabs coupling**: `setCurrentUser(user)` push method — decided in clarification session.
- **FeedbackManager**: Constructor already accepts `FeedbackViewModel` (`[key: string]: unknown`); passing `{ currentUser, navTabs, parentRegistrationForm }` as plain object requires no interface change.
- **`overrideMaintenanceMode`**: Stays on `window` (console debugging function). Implementation moves inline to `main.ts`.
- **Modal globals** (`window.loginModal`, `window.loginModalInstance`, etc.): These window assignments exist inside viewModel today and will move to the respective auth modules. They stay in `global.d.ts` since they are set at runtime. Only `window.viewModel` and `window.ViewModel` are removed.

---

## Phase 1: Design

### New module: `src/web/js/auth/loginModal.ts`

**Exports**:
- `init(onLoginSuccess: (user: AuthenticatedUser, roleToClick: string | null) => Promise<void>): void` — initializes all login modal DOM bindings; called once after `DOMContentLoaded`.
- `open(): void` — opens the Materialize login modal instance.
- `closeIfOpen(): void` — closes the modal if currently open; used by `resetUIState()` in `main.ts` without exposing the Materialize instance.
- `updateLoginButtonState(): void` — updates navbar login button text ("Login" vs "Change User") based on stored credentials; called by `main.ts` startup and after successful login.
- `showLoginButton(): void` — makes the login button container visible after config loads; called by `main.ts` startup sequence.

**State** (module-level):
- `loginModal: MaterializeModalInstance | null`
- `currentLoginType: string` (default `'parent'`)

**Extracted from viewModel.ts**:
- `#initLoginModal()` → `init()` body
- `#initLoginTypeSwitching()` → internal function
- `#initParentPhoneInput()` → internal function
- `#initEmployeeCodeInput()` → internal function
- `#validateCurrentInput()` → internal function
- `#focusCurrentInput()` → internal function
- `#resetLoginModal()` → internal function
- `#updateLoginButtonState()` → internal function
- `#showLoginButton()` → internal function
- `handleLogin()` / `#handleLogin()` → merged into single internal `handleLogin()` function
- `#attemptLoginWithCode()` → internal function; calls `onLoginSuccess` callback on success

**Imports needed**: `HttpService`, `ServerFunctions`, `ModalKeyboardHandler` (via `window`)

---

### New module: `src/web/js/auth/termsModal.ts`

**Exports**:
- `init(): void` — initializes terms and privacy modal DOM bindings; called once alongside `LoginModal.init()`.
- `showIfNeeded(onConfirmed: () => void): void` — shows terms modal if not yet accepted; calls `onConfirmed` immediately if already accepted.

**State** (module-level):
- `termsModal: MaterializeModalInstance | null`
- `privacyModal: MaterializeModalInstance | null`

**Extracted from viewModel.ts**:
- `#initTermsModal()` → part of `init()` body
- `#initPrivacyModal()` → part of `init()` body
- `#showTermsOfService(onConfirmation)` → `showIfNeeded(onConfirmed)`

**Imports needed**: `ModalKeyboardHandler` (via `window`)

---

### Modified: `src/web/js/main.ts`

**New module-level variables** (replacing ViewModel instance fields):
```typescript
let currentUser: AuthenticatedUser | null = null;
let navTabs: NavTabs | null = null;
let feedbackManager: FeedbackManager | null = null;
let roleToClick: string | null = null;
let parentRegistrationForm: ParentRegistrationFormLike | null = null;
let adminContentInitialized = false;
let instructorContentInitialized = false;
let parentContentInitialized = false;
```

**New imports**:
```typescript
import { NavTabs } from './components/navTabs.js';
import { FeedbackManager } from './feedback.js';
import * as LoginModal from './auth/loginModal.js';
import * as TermsModal from './auth/termsModal.js';
```

**`initializeApplication()` changes**:
- Remove `const viewModel = new ViewModel()` and `await viewModel.initializeAsync()`
- Add session-expiry listener (moved from `ViewModel.initializeAsync`)
- Call `LoginModal.init(loadUserData)`
- Call `TermsModal.init()`
- Inline `#initializeAllModals` → `LoginModal.init()` + `TermsModal.init()` calls
- Inline startup sequence: config fetch, maintenance check, stored auth check, terms check
- After `loadUserData`, call `navTabs.setCurrentUser(currentUser)`
- Replace `window.viewModel = viewModel` with nothing (removed)
- Replace `viewModel.overrideMaintenanceMode()` delegation with direct inline implementation

**New plain functions** (inlined from ViewModel):
- `loadUserData(user, roleToClick)` — sets module-level `currentUser`, creates `NavTabs`, initializes `FeedbackManager` with plain state object, calls `navTabs.setCurrentUser(currentUser)`
- `updateEnrollmentBanner()` — identical logic
- `setPageLoading(isLoading, errorMessage?)` — identical logic
- `showMaintenanceMode(message)` — identical logic
- `showConfigError()` — identical logic
- `resetInitializationFlags()` — resets module-level flags
- `resetUIState()` — identical logic (references module-level `loginModal` via `LoginModal` module)

**Removed from main.ts**:
- `import { ViewModel } from './viewModel.js'`
- `window.viewModel = viewModel`
- The `roleToClick` extraction hack (`viewModel as unknown as Record<string, unknown>).roleToClick`)
- The `viewModel.overrideMaintenanceMode()` delegation wrapper

---

### Modified: `src/web/js/components/navTabs.ts`

**Changes**:
- Add instance field: `#currentUser: Record<string, unknown> | null = null`
- Add public method: `setCurrentUser(user: Record<string, unknown> | null): void` — stores user; called by `main.ts` after `loadUserData` completes
- Replace all 6 occurrences of `window.viewModel?.currentUser` with `this.#currentUser`
- No other changes

**navTabs.ts `window.viewModel` usage locations** (confirmed by grep):
- Line 51: `sessionInfo` construction in tab-click handler
- Line 96: `isAdmin` for admin trimester selector visibility
- Line 115: `isInstructor` for instructor trimester selector visibility
- Line 343: `isAdmin` in `#initializeSectionUI`
- Line 385: `isInstructor` in `#initializeSectionUI`
- Line 471: `sessionInfo` construction in `#activateFirstTabInSection`

---

### Modified: `src/web/js/feedback.ts`

**Changes**: None needed in `feedback.ts` itself.

The `FeedbackManager` constructor already accepts `FeedbackViewModel` (`{ [key: string]: unknown }`). In `main.ts`, instead of `new FeedbackManager(this)` (where `this` was the ViewModel), `loadUserData` will call:

```typescript
feedbackManager = new FeedbackManager({
  currentUser,
  navTabs,
  parentRegistrationForm,
});
```

The plain object satisfies `FeedbackViewModel` with no type changes needed. The vestigial properties (`students`, `classes`, etc.) that `#captureState()` reads will simply resolve to `undefined` (already return 0 today).

---

### Modified: `src/types/global.d.ts`

**Remove**:
- `interface ViewModelType { [key: string]: unknown; }`
- `ViewModel: ViewModelType;` from `Window`
- `viewModel: ViewModelType;` from `Window`
- `const ViewModel: ViewModelType;` from global declarations

**Keep** (these are set at runtime by the auth modules):
- `loginModal`, `loginModalInstance`, `termsModal`, `termsModalInstance`, `privacyModal`, `privacyModalInstance`
- `termsOnConfirmationCallback`

---

## Agent Context Update

After writing the plan, update `.claude/CLAUDE.md` agent context:
