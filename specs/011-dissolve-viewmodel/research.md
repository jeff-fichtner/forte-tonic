# Research: Dissolve ViewModel

**Branch**: `011-dissolve-viewmodel` | **Date**: 2026-02-27

No external research required. All decisions are determined by the existing codebase.

## Decisions

### Module export pattern for `loginModal.ts` and `termsModal.ts`

**Decision**: Named ES module exports (`init`, `open`, `showIfNeeded`) with module-level state variables.

**Rationale**: Matches the existing pattern used by `AccessCodeManager` and `UserSession` in `main.ts` — plain objects/closures with module-level state, no classes. These modules are singletons by nature (one login modal, one terms modal per page).

**Alternatives considered**:
- Class with static methods: Rejected — no value over plain module-level functions; would reintroduce the class pattern we're removing.
- Class with instance: Rejected — singletons don't benefit from instantiation; adds ceremony.

---

### NavTabs `currentUser` coupling: push vs pull

**Decision**: Push model — `NavTabs.setCurrentUser(user)` called by `main.ts` after login.

**Rationale**: Keeps `NavTabs` self-contained with internal state. No `window` globals, no getter indirection. `main.ts` already has the natural point to call this (inside `loadUserData`, after setting `currentUser`). Aligns with Principle I (no unplanned handoffs through globals).

**Alternatives considered**:
- `window.appState.currentUser` (pull): Rejected — unplanned global; `navTabs.ts` should own its own user state.
- Getter function `() => currentUser` passed to constructor: Rejected — more indirection than needed; constructor injection is fine but push on login is cleaner.

---

### FeedbackManager state object

**Decision**: Pass `{ currentUser, navTabs, parentRegistrationForm }` as a plain object literal.

**Rationale**: `FeedbackViewModel` interface is `[key: string]: unknown` — already accepts any object. No type change needed. The vestigial data-count properties (`students`, `classes`, etc.) already return 0 today; they continue to resolve as `undefined` (treated as length 0) after the refactor — no diagnostic regression.

**Alternatives considered**:
- Pass `currentUser` only: Rejected — `#captureState` also reads `navTabs.currentSection` and `parentRegistrationForm`. Passing only what exists is cleaner than filtering in `feedback.ts`.
- Create a new `AppState` interface: Rejected — `FeedbackViewModel` already covers this without additional types.
