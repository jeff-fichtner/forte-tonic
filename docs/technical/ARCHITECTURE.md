# Architecture

How the Tonic backend is wired and what happens to a request as it travels from the network into Google Sheets and back. Frontend architecture has its own document; the API contract lives in [API.md](API.md).

## Maintenance contract

This document MUST be updated in the same PR as any change to:

- `src/controllers/`, `src/services/`, `src/repositories/` — the layer flow.
- `src/common/errors.ts`, `src/common/errorConstants.ts`, `src/common/responseHelpers.ts`, `src/common/gcpLogger.ts` — error pipeline + response envelope + logging.
- `src/cache/` — cache TTL, eviction, or invalidation rules.
- `src/middleware/auth.ts` — authentication flow.
- `src/database/googleSheetsDbClient.ts` — read/write semantics, per-sheet field mappings, cache exclusions.
- `src/infrastructure/container/serviceContainer.ts` — DI wiring or lifecycle.
- `src/infrastructure/migration/` — migration runner behavior.
- `src/services/periodService.ts` and any code in `src/repositories/periodRepository.ts` that affects which trimester is "current."
- `src/config/` — environment-variable contract.
- `src/build/Dockerfile`, `src/build/cloudbuild.yaml`, `scripts/version-manager.sh`, `.github/workflows/*` — build/deploy.

If your PR touches one of those surfaces and you didn't update this file, you're shipping documentation drift. Same enforcement model the Constitution already uses for the Postman collection.

## Layer flow

Every request that survives auth goes through the same four layers, top to bottom:

```
HTTP request → Express route → Controller → Service → Repository → googleSheetsDbClient → Google Sheets API
                                                                          ↑
                                                                  in-memory cache
```

**Controllers** ([src/controllers/](../../src/controllers/)) parse the request, check authorization (`req.currentUser`), validate input, and format the response. They do not contain business logic. Each controller method is a static method on a per-resource class: `RegistrationController.createRegistration`, `UserController.getParentContactTabData`, etc.

**Services** ([src/services/](../../src/services/)) coordinate business logic across multiple repositories: conflict detection, eligibility checks, multi-step orchestration. There are 6 services — `availabilityService`, `configurationService`, `dropRequestService`, `entityQueryService`, `periodService`, `registrationService`. They are stateless except for the configuration cache in `configurationService`.

**Repositories** ([src/repositories/](../../src/repositories/)) own data access for a single entity family. All 6 entity repositories (`userRepository`, `registrationRepository`, `attendanceRepository`, `programRepository`, `periodRepository`, `dropRequestRepository`) extend `BaseRepository<T>` which exposes a common CRUD surface (`create`, `update`, `findAll`, `findBy`, `findById`, `delete`). Entity-specific query methods are allowed when the lookup pattern is genuinely different from CRUD (e.g., `userRepository.getParentByPhone`).

**googleSheetsDbClient** ([src/database/googleSheetsDbClient.ts](../../src/database/googleSheetsDbClient.ts)) is the only place that talks to the Google Sheets API. It applies per-sheet field mappings (string → number, "TRUE" → boolean) on read, but NOT on write — callers are responsible for sending values in the sheet's expected format.

The rules are strict: controllers do not call repositories directly, repositories do not call services, and no layer reaches around its neighbor. The only exception is `userRepository.getStudents`, which has a hardcoded enrichment step (parent emails joined into each student) that crosses an entity boundary — see [Trimester & period model](#trimester--period-model) for why.

## Error & log pipeline

Errors thrown anywhere in the layer flow propagate up to either a controller's `try`/`catch` or the global handler at [src/app.ts](../../src/app.ts). Both paths funnel into the same helper:

```
throw → controller catch (or global handler) → errorResponse(res, error, ...)
                                                    ↓
                                              gcpLogger.error / .warning
                                                    ↓
                                             stdout (JSON line)
                                                    ↓
                                       GCP Cloud Logging (auto-ingested)
                                                    ↓
                                  GCP Cloud Error Reporting (for 5xx, via @type)
```

`errorResponse()` in [src/common/responseHelpers.ts](../../src/common/responseHelpers.ts) does five things:

1. Normalizes the thrown thing into an `Error` (handles strings, unknown types).
2. Maps the error to an HTTP status via `determineStatusCode`. Custom errors carry their own status (`ValidationError` → 400, `NotFoundError` → 404, `ConflictError` → 409, `UnauthorizedError` → 401, `ForbiddenError` → 403). Unknown errors fall through to 500.
3. Picks the log severity: 4xx → `WARNING`, 5xx → `ERROR`.
4. For 5xx, adds the `@type` field that tells GCP Cloud Error Reporting to aggregate this entry. 4xx entries do not get aggregated — they're noise from clients.
5. Sends the response envelope `{ success: false, error: { message, code, type } }`. In production, 5xx messages are replaced with a generic "internal server error" string to avoid leaking stack traces.

`gcpLogger` ([src/common/gcpLogger.ts](../../src/common/gcpLogger.ts)) writes structured JSON to stdout. On Cloud Run, stdout is auto-ingested into Cloud Logging. There is no separate log shipper. Errors are NOT written to Google Sheets — the data store and the error sink are different systems.

Frontend code branches on `error.type`, not `error.code`. The two fields exist for different audiences: `type` is a coarse category for client logic (e.g., `AUTHENTICATION`, `VALIDATION`, `CONFLICT`); `code` is a specific identifier for support / debugging.

## Cache strategy

The cache is in-memory only. There is no Redis, no Memcached, no shared cache layer. Two caches exist:

**googleSheetsDbClient cache.** Keyed by `(spreadsheetId, sheetKey)`. 5-minute TTL via `cacheService` ([src/cache/cacheService.ts](../../src/cache/cacheService.ts)). The `periods` sheet is explicitly excluded — periods drive write routing (which trimester's sheet a registration lands in), and a stale period at a boundary would misroute writes.

**userRepository enriched-students cache.** A second cache on top of the raw cache, holding students enriched with parent emails. Also 5-minute TTL. The summer grade-bump is applied *after* the cache read so the cache stays period-agnostic.

Writes invalidate via `googleSheetsDbClient.clearAllCache()` — a full flush, not surgical. The CacheService also exposes oldest-key eviction at a configurable `maxSize` (default 1000 entries).

**Per-pod scope.** Each Cloud Run instance has its own in-memory cache. A write on instance A does not invalidate instance B's cache. On the rare write paths this matters, callers may see stale data for up to 5 minutes after another pod's write. The system runs on a small enough scale that this is acceptable.

## Authentication flow

End to end:

1. **Frontend stores credentials.** On login, `AccessCodeManager` in [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts) saves `{accessCode, loginType, sessionId}` as base64 JSON in `localStorage` under the key `forte_auth_session`.
2. **Every request carries headers.** `HttpService` reads the stored credentials and sets `x-access-code` and `x-login-type` on every API call.
3. **Auth middleware extracts the user.** [src/middleware/auth.ts](../../src/middleware/auth.ts) runs `initializeRepositories` on every `/api/*` route. It reads the access code (body > header > query priority), runs a format-based lookup ladder, and sets `req.currentUser` if a match is found.

**Lookup ladder.** A 10-digit numeric is treated as a parent phone number; a 6-digit numeric is treated as an employee access code. An explicit `x-login-type` header makes the corresponding path eligible regardless of format. On the first-pass miss, the fallback block in `extractAuthenticatedUser` retries one of the paths — the exact behavior is exercised by [tests/unit/middleware/auth.test.ts](../../tests/unit/middleware/auth.test.ts), which pins several non-obvious cases.

**Frontend 401 contract.** When the server returns 401, `HttpService` clears `localStorage` and triggers a logout. When the server returns 403, the frontend shows an error but does NOT log out — the user is authenticated, they just lack permission. This is why some controllers throw `ForbiddenError` (403) instead of `UnauthorizedError` (401) for role failures: a 401 would force a logout on an otherwise-valid session.

**Auth-as-lookup-probe edge case.** `userController.authenticateByAccessCode` returns `{ success: true, data: null }` on a missed lookup, NOT a 401. If it returned 401, an unsuccessful login attempt would clear the credentials of a user who isn't even logged in yet and loop the login modal on every failed attempt. The endpoint behaves as a lookup probe, not authenticate-or-fail.

There are no JWTs, no session tokens with expiry, no refresh flow. The access code in localStorage is the entire session.

## Trimester & period model

Four trimesters: `fall`, `winter`, `spring`, `summer`. Each has its own registrations sheet (`registrations_fall`, `registrations_winter`, etc.). The sheet name mapping lives in [src/database/googleSheetsDbClient.ts](../../src/database/googleSheetsDbClient.ts).

Four period types: `intent`, `priorityEnrollment`, `openEnrollment`, `registration`. The current period is the row in the `periods` sheet with the latest `startDate ≤ now`. There are no end dates and no `isActive` flag — the model is "whichever period started most recently is current."

`PeriodService.getEnrollmentTrimesterTable()` derives which trimester's sheet a write should land in. During enrollment periods (intent, priorityEnrollment, openEnrollment), writes target the *next* trimester. During the `registration` period (active instruction), writes target the *current* trimester.

**Summer is special.** `userRepository.getStudents('summer')` applies a runtime grade-bump: every student's grade is incremented by +1, and students whose bumped grade exceeds `MAX_GRADE` (8) are dropped from the result. This is a display/filter transform — the grade is NEVER persisted back to the students sheet. The bump exists because summer registration is logically "next fall," so parents see lessons offered to their child at their post-summer grade. The transform is pinned end-to-end by [tests/integration/summerGradeBump.test.ts](../../tests/integration/summerGradeBump.test.ts).

## DI container

[src/infrastructure/container/serviceContainer.ts](../../src/infrastructure/container/serviceContainer.ts) is a hand-rolled lazy-singleton DI container. Infrastructure services (the database client, cache service, email client) are initialized eagerly at startup so misconfigured credentials fail fast. Application services and repositories are constructed lazily on first `serviceContainer.get(...)` call.

`ServiceKeys` is the canonical registry of registered services. To add a new service:

1. Add a `ServiceKeys.<name>` entry.
2. Add a getter on the container class.
3. Construct the service inside the lazy-init branch with its dependencies.
4. Update the container's `initialize()` if the service has eager-init requirements.

There is no decorator-based or reflection-based DI. The container is small enough that the wiring is hand-maintained, which is the simplest thing that works.

## Build & deploy

The repo ships to Google Cloud Run. The build pipeline:

- **Dockerfile** at [src/build/Dockerfile](../../src/build/Dockerfile) defines the runtime container. Node 18, TypeScript executed via `tsx`, frontend pre-built by Vite.
- **Cloud Build config** at [src/build/cloudbuild.yaml](../../src/build/cloudbuild.yaml) drives the build-and-deploy pipeline.
- **Version manager** at [scripts/version-manager.sh](../../scripts/version-manager.sh) auto-increments the `package.json` version during build.
- **GitHub Actions** at [.github/workflows/](../../.github/workflows/) run the test suite on push to `dev` and `main`.

On merge to **`dev`**: GitHub Actions runs `check:all` (lint + typecheck + tests). The branch is pushed to a staging Cloud Run service.

On merge to **`main`**: same checks, then the production Cloud Run service is updated. The version-manager script bumps `package.json` and commits the version increment back to `main` before deploy.

The Express server serves both the API and the bundled frontend from a single Cloud Run instance. Vite output lives at `dist/web/` with hashed filenames; the version hash is exposed via `/api/version` so the frontend can detect a stale browser cache and prompt a reload.

## Migrations

Schema evolution is managed through migration scripts at [src/migrations/](../../src/migrations/). The runner at [src/infrastructure/migration/migrationRunner.ts](../../src/infrastructure/migration/migrationRunner.ts) discovers files matching `NNN-name.ts`, compares their filenames against a `_migrations` tracking sheet in the spreadsheet, and runs only the unrun ones in numeric order.

Each migration exports an `id` (must match the filename minus extension) and a `migrate(context)` async function. The context provides direct access to the underlying `sheets` API client for batch operations.

Migrations run during `app.initializeApp()`, before `app.listen()`. A failed migration throws, blocking the server from starting. There is no automatic rollback — migrations should be idempotent so a partial-success state can be re-run safely.

There is one migration system, one tracking sheet per environment, and no concurrent-startup safety: Cloud Run's cold-start model assumes a single instance is bringing the migration up first. That assumption holds in practice; if it ever doesn't, the migration runner needs a lock.
