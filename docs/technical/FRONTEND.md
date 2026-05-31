# Frontend

How the Tonic SPA boots, how tabs load data, how authentication is carried, and where the moving parts live. For server-side architecture see [ARCHITECTURE.md](ARCHITECTURE.md); for the wire contract see [API.md](API.md).

## Maintenance contract

This document MUST be updated in the same PR as any change to:

- `src/web/js/main.ts` — bootstrap order or top-level state.
- `src/web/js/core/baseTab.ts`, `src/web/js/core/tabController.ts` — tab lifecycle, registration, or switching behavior.
- `src/web/js/data/httpService.ts` — the HTTP contract, headers, or error categorization.
- `src/web/js/auth/session.ts`, `src/web/js/auth/loginModal.ts` — credential storage, login flow, or the canonical `AuthenticatedUser` shape.
- `src/web/js/data/registrationService.ts` — frontend orchestration of registration submissions.
- `vite.config.ts` — bundling, path aliases, or dev-server serving rules.
- `src/app.ts` static-serving routes (where the server feeds shared models to the browser).

If your PR touches one of those surfaces and you didn't update this file, you're shipping documentation drift.

## Bootstrap order

[src/web/js/main.ts](../../src/web/js/main.ts) is the entry point loaded by `index.html`. On page load it does, in order:

1. **Fetch the version.** A non-blocking `GET /api/version` populates the version display in the UI and stores the build hash for the stale-cache detector.
2. **Fetch the configuration.** `GET /api/configuration` returns the `AppConfigurationResponse` (current period, registration config, period sequence). The response is saved into the `UserSession` singleton; everything downstream reads from there.
3. **Attempt auto-login.** If `localStorage` has a `forte_auth_session` blob, the stored access code is used to call `POST /api/auth/access-code` automatically. On success, the user is logged in without seeing the login modal.
4. **Initialize the TabController.** Each registered tab class is instantiated and bound to its DOM container ID. Tabs are not loaded yet — only registered.
5. **Show the login modal** if auto-login didn't succeed; otherwise dispatch to the first appropriate tab.

The bootstrap is sequential because the configuration drives downstream rendering (current period determines which tabs are visible, what registration UI to show, etc.). The version fetch is racing in the background and never blocks.

## Tab lifecycle

Every tab extends `BaseTab<TData>` ([src/web/js/core/baseTab.ts](../../src/web/js/core/baseTab.ts)) and implements:

- **`fetchData(sessionInfo)`** — calls the relevant API endpoint via `HttpService`, returns an `HttpResult<TData>`. Pure data acquisition; no DOM work.
- **`render()`** — given `this.data`, mutates the DOM under `this.getContainer()`. Idempotent: calling render twice with the same data must produce the same result.
- **`attachEventListeners()`** — wires interactive behavior. Listeners are tracked so they can be removed on tab unload.

The `TabController` orchestrates lifecycle:

```
onLoad(sessionInfo) → fetchData → render → attachEventListeners
                                                    ↓
                                          isLoaded = true (cached)
                                                    ↓
                                       (tab inactive, then re-activated)
                                                    ↓
                                       isLoaded already true → no-op
```

Tabs cache `isLoaded` so switching back to a tab doesn't re-fetch unless data is explicitly invalidated. An `AbortController` tied to the load aborts in-flight fetches if the tab is switched away mid-load.

On user switch (e.g., a parent logging out and an admin logging in on the same browser), `TabController.cleanup()` is called on **every registered tab**, not just the active one. Without this, a re-login with a different role would show the previous user's cached data on tabs they hadn't visited yet. The Change User button in the navbar drives this path.

## HttpService contract

[src/web/js/data/httpService.ts](../../src/web/js/data/httpService.ts) is the single chokepoint for all backend communication. It exposes a `HttpResult<T>` discriminated union:

```ts
type HttpResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { status: number; message: string; code?: string; type?: string } };
```

Methods never throw. Callers always get a result; they branch on `ok`. There is exactly one direct `fetch()` call in the entire frontend, on line 84 of `httpService.ts` — every other HTTP call goes through one of `HttpService.get`/`post`/`patch`/`delete`. This is enforced by convention; a grep for `fetch(` in `src/web/js/` should return exactly one match.

**Headers.** Every request automatically carries `x-access-code` and `x-login-type` headers pulled from `localStorage` via `AccessCodeManager.getStoredAuthData()`. Callers do not set auth headers manually.

**Envelope unwrapping.** The backend's standard `{ success: true, data: T }` envelope is unwrapped inside HttpService. Callers receive `T` directly, not the envelope.

**Error categorization.** On a non-2xx response, the result's `error.type` is set based on the server's response envelope. Two cases are handled specially:

- **401 Unauthorized** — `HttpService` clears `localStorage` (`forte_auth_session`) and shows the login modal. The session is gone; the user has to log in again.
- **403 Forbidden** — surfaces as an error result. The session is preserved; the user is logged in but lacks permission for this specific action.

This is why backend controllers throw `ForbiddenError` (403) for role failures instead of `UnauthorizedError` (401) — a 401 would force a logout on an otherwise-valid session.

## Session & Change-User flow

[src/web/js/auth/session.ts](../../src/web/js/auth/session.ts) owns three things:

- **`AccessCodeManager`** — base64-encoded credential blob in `localStorage` under `forte_auth_session`. Provides `saveAccessCodeSecurely`, `getStoredAuthData`, `clearStoredAccessCode`. The "securely" is a misnomer — it's base64, not encryption; it just keeps the credentials from being plaintext-visible to a casual peek at devtools.
- **`UserSession`** — singleton holding the current `AppConfigurationResponse` (current period, next period, registration config). Tabs read from this singleton instead of re-fetching configuration.
- **`AuthenticatedUser`** — the canonical TypeScript interface describing the shape of an authenticated user response. Used by `main.ts`, `loginModal.ts`, and `baseTab.ts`. Exactly one definition exists, imported by all three.

The Change User button triggers:

1. `AccessCodeManager.clearStoredAccessCode()` clears the localStorage blob.
2. `TabController.cleanup()` runs on every registered tab.
3. `UserSession.clear()` drops the cached configuration.
4. The login modal re-opens.

This is the same path used on 401, just initiated by the user instead of by an HTTP response.

## Shared model serving

Shared TypeScript models live in [src/models/shared/](../../src/models/shared/). They run in both Node.js (server-side) and the browser (frontend). One canonical entity shape is used everywhere — comparing IDs is always plain `===` string comparison, and there are no parallel "API shape" vs "DB shape" definitions.

There are actually two such trees: the shared models at [src/models/shared/](../../src/models/shared/) and the shared value constants (enums, helpers) at [src/utils/values/](../../src/utils/values/). Both are served to the browser through the same mechanism.

**Production**: the Express server in [src/app.ts](../../src/app.ts) serves the entire `dist/web/` directory plus two additional static mounts at `/models/shared` and `/utils/values`. Browser code imports from `/models/shared/...` or `/utils/values/...` and the server resolves it.

**Development**: Vite's dev server intercepts these imports via path aliases configured in [vite.config.ts](../../vite.config.ts). The browser still asks for `/models/shared/...` or `/utils/values/...` but Vite serves them directly from their source locations under `src/` (with HMR).

The result is the same import statement works in both environments without code changes.

## Registration form architecture

The registration form has two variants under [src/web/js/workflows/](../../src/web/js/workflows/) — `parentRegistrationForm.ts` for parents and a separate admin variant. They share the same component primitives (instructor selector, time picker, lesson-length toggle) but differ in shape:

**Parent flow** is a cascading filter:

1. Student selector (auto-skipped if parent has exactly one child).
2. Instrument chips → filters available instructors.
3. Day chips → filters available time slots.
4. Time slot grid → user picks a slot.
5. Transportation + notes → submit.

**Admin flow** is a linear form: pick a student, pick an instructor, pick a day/time, submit. No cascading; admins are trusted to know what they want.

Both flows submit to `POST /api/registrations`. The admin flow can pass an admin-only flag that bypasses some capacity checks server-side. The parent flow validates client-side that the parent owns the student before submitting (server-side check is the source of truth).

The `RegistrationService` in [src/web/js/data/registrationService.ts](../../src/web/js/data/registrationService.ts) wraps the actual HTTP submission and handles the delete-then-create replacement flow used for modifying a carried-forward registration.

## Frontend type system

The canonical `AuthenticatedUser` interface lives in [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts). It describes the shape of the response from `POST /api/auth/access-code`:

```ts
export interface AuthenticatedUser {
  email?: string;
  admin?: { id: string; [key: string]: unknown } | null;
  instructor?: { id: string; [key: string]: unknown } | null;
  parent?: { id: string; [key: string]: unknown } | null;
  systemError?: boolean;
  error?: string;
  [key: string]: unknown;
}
```

Exactly one role record is populated per response, depending on what the access code matched. The `systemError`/`error` fields exist because the auth endpoint can return a structured failure inside its success envelope — that shape is being reconsidered, but for now it's part of the contract.

The `SessionInfo` interface in [src/web/js/core/baseTab.ts](../../src/web/js/core/baseTab.ts) wraps an `AuthenticatedUser` along with the resolved `userType` string. Tabs receive a `SessionInfo` in their `onLoad` callback.
