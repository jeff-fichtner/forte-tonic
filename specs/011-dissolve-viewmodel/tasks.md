# Tasks: Dissolve ViewModel

**Input**: Design documents from `/specs/011-dissolve-viewmodel/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓

**Tests**: No test tasks — no frontend unit tests exist for these files (spec assumption confirmed).

**Organization**: Tasks grouped by user story. US1 verifies behavioural equivalence; US2–US4 deliver structural outcomes.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: Establish the `auth/` directory and a TypeScript baseline.

- [X] T001 Create directory `src/web/js/auth/` (new module home for loginModal and termsModal)
- [X] T002 Run `npx tsc --noEmit` and record zero baseline errors before any changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update `navTabs.ts` and `global.d.ts` so downstream modules can reference `setCurrentUser()` and the ViewModel types are removed from the type system. These must be complete before the auth modules or main.ts changes, since TypeScript validation depends on them.

- [X] T003 Add `#currentUser` private field and `setCurrentUser(user)` public method to `NavTabs` class in `src/web/js/components/navTabs.ts`; replace all 6 `window.viewModel?.currentUser` reads with `this.#currentUser`
- [X] T004 Remove `ViewModelType` interface, `window.ViewModel`, and `window.viewModel` from `src/types/global.d.ts`; keep all modal instance globals unchanged

**Checkpoint**: `tsc --noEmit` must still pass (or only show errors in `viewModel.ts`/`main.ts` which reference the now-removed types — those are expected and will be fixed in later tasks)

---

## Phase 3: User Story 2 — Login Modal Extraction (Priority: P2)

**Goal**: All login form logic lives in `src/web/js/auth/loginModal.ts`. `main.ts` will call `LoginModal.init(onLoginSuccess)` and `LoginModal.open()`.

**Independent Test**: `loginModal.ts` can be read in isolation and fully describes login form behaviour. `main.ts` contains no phone formatting, no access code validation, no tab-switching logic after this phase.

- [X] T005 [US2] Create `src/web/js/auth/loginModal.ts` with module-level state (`loginModal`, `currentLoginType`) and skeleton exports (`init`, `open`)
- [X] T006 [US2] Move `#initLoginModal()` body into `loginModal.ts` `init()` — initializes Materialize modal, sets `window.loginModal` and `window.loginModalInstance`, attaches modal:opened/closed events and keyboard handlers
- [X] T007 [US2] Move `#initLoginTypeSwitching()` into `loginModal.ts` as internal function; wire into `init()`
- [X] T008 [US2] Move `#initParentPhoneInput()` into `loginModal.ts` as internal function; wire into `init()`
- [X] T009 [US2] Move `#initEmployeeCodeInput()` into `loginModal.ts` as internal function; wire into `init()`
- [X] T010 [US2] Move `#validateCurrentInput()`, `#focusCurrentInput()`, `#resetLoginModal()` into `loginModal.ts` as internal functions
- [X] T011 [US2] Move `#updateLoginButtonState()` and `#showLoginButton()` into `loginModal.ts` as **exported** functions (`updateLoginButtonState`, `showLoginButton`); they are called by `main.ts` in the startup sequence after `LoginModal.init()`, not from inside `init()` itself
- [X] T012 [US2] Merge `handleLogin()` and `#handleLogin()` into single internal `handleLogin()` in `loginModal.ts`; move `#attemptLoginWithCode()` as internal function that calls the `onLoginSuccess` callback parameter on success
- [X] T013 [US2] Implement `open()` export in `loginModal.ts` that calls `loginModal?.open()`

**Checkpoint**: `loginModal.ts` is self-contained and exports `{ init, open, closeIfOpen, updateLoginButtonState, showLoginButton }`. No login logic remains in `viewModel.ts` (it still exists but those methods are now dead).

---

## Phase 4: User Story 3 — Terms Modal Extraction (Priority: P2)

**Goal**: All terms/privacy modal logic lives in `src/web/js/auth/termsModal.ts`.

**Independent Test**: `termsModal.ts` describes all terms/privacy modal behaviour. No non-dismissible modal logic, keyboard handler patching, or `termsOnConfirmationCallback` remains outside this module.

- [X] T014 [US3] Create `src/web/js/auth/termsModal.ts` with module-level state (`termsModal`, `privacyModal`) and skeleton exports (`init`, `showIfNeeded`)
- [X] T015 [US3] Move `#initTermsModal()` body into `termsModal.ts` `init()` — initializes Materialize modal, sets `window.termsModal` and `window.termsModalInstance`, attaches "I Understand" click handler and keyboard handlers
- [X] T016 [US3] Move `#initPrivacyModal()` body into `termsModal.ts` `init()` — initializes Materialize modal, sets `window.privacyModal` and `window.privacyModalInstance`, attaches keyboard handlers
- [X] T017 [US3] Move `#showTermsOfService(onConfirmation)` into `termsModal.ts` as `showIfNeeded(onConfirmed)`; rename `onConfirmation` → `onConfirmed` throughout

**Checkpoint**: `termsModal.ts` exports `{ init, showIfNeeded }`. No terms/privacy modal logic remains in `viewModel.ts`.

---

## Phase 5: User Story 1 — Startup Orchestration in main.ts (Priority: P1)

> **Note on ordering**: US1 is P1 by importance (behavioural equivalence) but structurally depends on US2 and US3 being complete first — `main.ts` imports both auth modules. Phases 3 and 4 are prerequisites, not lower priority.

**Goal**: `ViewModel` is no longer instantiated. All startup logic runs as plain functions in `main.ts`. App behaves identically to before.

**Independent Test**: Load app fresh, returning user, session expiry, maintenance mode, and config failure all work identically. `main.ts` does not exceed 600 lines.

- [X] T018 [US1] Add module-level variables to `src/web/js/main.ts`: `currentUser`, `navTabs`, `feedbackManager`, `roleToClick`, `parentRegistrationForm`, `adminContentInitialized`, `instructorContentInitialized`, `parentContentInitialized`
- [X] T019 [US1] Add imports to `main.ts`: `NavTabs`, `FeedbackManager`, `* as LoginModal from './auth/loginModal.js'`, `* as TermsModal from './auth/termsModal.js'`; remove `import { ViewModel }`
- [X] T020 [US1] Move `setPageLoading()`, `showMaintenanceMode()`, `showConfigError()`, `updateEnrollmentBanner()` into `main.ts` as plain module-level functions (note: `showLoginButton` and `updateLoginButtonState` live in `loginModal.ts` — see T011)
- [X] T021 [US1] Add `closeIfOpen()` export to `src/web/js/auth/loginModal.ts` (calls `loginModal?.close()` if open); move `resetUIState()` into `main.ts` as a plain module-level function and replace `this.loginModal?.close()` with `LoginModal.closeIfOpen()`
- [X] T022 [US1] Move `resetInitializationFlags()` into `main.ts` as a plain function; update to use module-level flags and call `LoginModal`'s open via `LoginModal.open()`
- [X] T023 [US1] Move `loadUserData()` into `main.ts` as a plain async function; create `FeedbackManager` with plain state object `{ currentUser, navTabs, parentRegistrationForm }`; call `navTabs.setCurrentUser(currentUser)` after constructing `NavTabs`
- [X] T024 [US1] Rewrite `initializeApplication()` in `main.ts`: remove `new ViewModel()`, call `LoginModal.init(loadUserData)`, call `TermsModal.init()`, call `LoginModal.updateLoginButtonState()`, call `LoginModal.showLoginButton()`, inline the startup sequence (session-expiry listener, config fetch, maintenance check, stored-auth check, terms check, `LoginModal.open()`)
- [X] T025 [US1] Inline `overrideMaintenanceMode()` directly in `main.ts` `window.overrideMaintenanceMode` assignment; remove the delegation through `viewModel`
- [X] T026 [US1] Remove `window.viewModel = viewModel` assignment from `main.ts`; remove the `roleToClick` extraction hack

**Checkpoint**: App starts, login works, terms flow works, auto-login works. `main.ts` has no reference to `ViewModel`.

---

## Phase 6: User Story 4 — Delete ViewModel (Priority: P3)

**Goal**: `viewModel.ts` does not exist. TypeScript compiles with zero errors.

**Independent Test**: `grep -r "viewModel" src/web/js/` returns no results. `tsc --noEmit` reports zero errors.

- [X] T027 [US4] Delete `src/web/js/viewModel.ts`
- [X] T028 [US4] Run `tsc --noEmit` and fix any type errors introduced by the refactor (expected: none if prior tasks are complete, but verify)
- [X] T029 [US4] Run `grep -r "viewModel" src/web/js/` and confirm zero results; run `grep -r "ViewModel" src/` and confirm only the deletion in `global.d.ts` removed it everywhere

---

## Phase 7: Polish

**Purpose**: Final verification and line-count check.

- [X] T030 Verify `main.ts` line count does not exceed 600 lines (SC-006); if it does, identify candidates for extraction
- [X] T031 Run full build (`npm run build:staging` or `npx tsc --noEmit`) and confirm zero errors
- [X] T032 [P] Verify `navTabs.ts` contains zero `window.viewModel` references (grep check for SC-003)
- [X] T033 [P] Verify `feedback.ts` contains zero `window.viewModel` references (grep check for SC-003)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS US phases
- **Phase 3 (US2 Login Modal)**: Depends on Phase 2
- **Phase 4 (US3 Terms Modal)**: Depends on Phase 2; independent of Phase 3 — can run in parallel with Phase 3
- **Phase 5 (US1 main.ts)**: Depends on Phases 3 AND 4 being complete (imports both auth modules)
- **Phase 6 (US4 Delete)**: Depends on Phase 5 being complete and verified
- **Phase 7 (Polish)**: Depends on Phase 6

### User Story Dependencies

- **US2 (Login Modal)** and **US3 (Terms Modal)**: Both depend only on Phase 2 — can run in parallel
- **US1 (main.ts orchestration)**: Depends on US2 + US3 — imports both auth modules
- **US4 (Delete)**: Depends on US1

### Within Each Phase

- Tasks within Phase 3 (US2) are sequential — each builds on the previous step's extracted functions
- Tasks within Phase 4 (US3) are sequential — same reason
- Tasks within Phase 5 (US1) are sequential — each step modifies the same file
- T032 and T033 in Phase 7 are [P] — different files, pure read verification

### Parallel Opportunities

```text
Phase 3 (US2 Login Modal) and Phase 4 (US3 Terms Modal) can run in parallel:
  Task: "Extract login modal to src/web/js/auth/loginModal.ts" (T005–T013)
  Task: "Extract terms modal to src/web/js/auth/termsModal.ts" (T014–T017)
```

---

## Implementation Strategy

### MVP First (US1 Behavioural Equivalence)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (navTabs + global.d.ts)
3. Complete Phase 3: US2 Login Modal extraction
4. Complete Phase 4: US3 Terms Modal extraction
5. Complete Phase 5: US1 main.ts orchestration
6. **STOP and VALIDATE**: Load app, test all five startup scenarios
7. Complete Phase 6: US4 Delete viewModel.ts
8. Complete Phase 7: Polish

### Notes

- No rollback needed — `viewModel.ts` is not deleted until all references are removed and verified
- TypeScript compiler is the primary correctness gate — run `tsc --noEmit` after each phase
- The `handleLogin` / `#handleLogin` public/private redundancy in `viewModel.ts` is intentional to clean up: merge into a single internal function in `loginModal.ts`
- Do not change any login UX, modal behaviour, or startup sequence — this is a pure code-move refactor
