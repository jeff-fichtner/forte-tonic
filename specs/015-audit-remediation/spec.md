# Feature Specification: Audit Remediation

**Feature Branch**: `015-audit-remediation`
**Created**: 2026-05-30
**Status**: Draft
**Input**: User description: "Knock out the findings from the 2026-05-30 full-project audit one by one — broken doc links, missing architecture docs, inconsistencies that bite fresh contributors, and the handful of real test gaps."

> **What this spec is.** A working checklist that turns the 2026-05-30 audit
> into independently-shippable batches. Each User Story below is one
> self-contained PR; finishing it leaves the project in a better state than
> when you started, even if the next batches never ship.
>
> **What this spec is not.** A behavior change for end users. Parents,
> instructors, and admins see no UI or workflow differences from any of these
> batches. This is internal cleanup: docs, tests, and small code consistency
> fixes that make the codebase legible to a fresh AI agent (or human) with no
> prior context.
>
> **Source.** The 2026-05-30 audit conversation. The findings are reproduced
> inline below — do not require reading the chat transcript to act on this
> spec.

## Scope & Non-Goals

**In scope**
- Fixing broken doc references in [README.md](../../README.md), [API_TESTING.md](../../API_TESTING.md), and [docs/](../../docs/).
- Writing the three missing reference documents (Architecture, API, Frontend) that the audit identified as the highest-value gaps.
- A small set of inline doc comments at the four "you will be surprised" hotspots.
- The handful of real test gaps the audit identified — authentication middleware, cache service, and one end-to-end summer-grade-bump assertion. Most of the audit's "untested" list turned out to be tested in nested directories (see `tests/unit/controllers/`, `services/`, `common/`, `infrastructure/`); only the actually-zero-coverage files are in scope here.
- Two small code-consistency fixes that take less than the doc work to write up: uniform trimester validation in the registration controller, and one canonical TypeScript interface for "the authenticated user" on the frontend.

**Out of scope**
- Any behavior change visible to end users.
- Any refactor that changes layer boundaries or data shapes — those belong in their own specs (e.g., the LSP violation in `RegistrationRepository.delete()` is *flagged* here but a fix would be a separate spec).
- jsdom + browser-environment Jest setup. The audit noted this gap; it's deferred because it's a multi-day infrastructure change.
- Moving hardcoded business rules (bus deadlines, 12-lesson assumption, `FORTE_PROGRAM_EMAIL`) into configurable storage. These are real tech debt but each is its own decision; they are documented in US3 so a future spec can pick them up.
- The `specs/` archival problem and the `dev/plans/` status-marking problem. Project-management hygiene, separate effort.
- Anything in `gas/` — its legacy/active status is itself an open question called out in US3.

## User Scenarios & Testing *(mandatory)*

> "User" in this spec means a developer or AI agent picking up the codebase
> fresh. Each story is sized to one PR.

### User Story 1 — Stop sending readers to dead links (Priority: P1)

A new contributor reads [README.md](../../README.md) and clicks through to learn the architecture. Today three of those links 404, two of the listed endpoints don't exist, and the version number is three minor versions stale.

**Why this priority**: This is the cheapest, highest-trust-impact batch. If the entry-point doc is wrong, every later doc gets read with suspicion. Probably one hour of work.

**Independent Test**: Every link in [README.md](../../README.md), [API_TESTING.md](../../API_TESTING.md), and [docs/README.md](../../docs/README.md) resolves to a real file or URL. Every endpoint path mentioned in those files appears verbatim in [src/routes/api.ts](../../src/routes/api.ts). The version string in README matches `package.json`.

**Acceptance Scenarios**:
1. **Given** [README.md], **When** every relative link is resolved, **Then** zero 404s.
2. **Given** [API_TESTING.md], **When** each documented endpoint is grepped against [src/routes/api.ts](../../src/routes/api.ts), **Then** every documented endpoint exists.
3. **Given** [README.md] line 198, **When** the version is compared to [package.json](../../package.json) `version`, **Then** they match.
4. **Given** [docs/README.md], **When** the constitution link is followed, **Then** it resolves to [.specify/memory/constitution.md](../../.specify/memory/constitution.md).

**Concretely**
- Remove or repoint dead references to `docs/technical/ARCHITECTURE_COMPLETE.md`, `docs/technical/ARCHITECTURE.md`, `docs/technical/MIGRATION_SUMMARY.md` in [README.md](../../README.md). If US2 is shipping concurrently and creating `ARCHITECTURE.md`, point at the new file; otherwise remove the link entirely.
- Replace the "API Overview" section of [README.md](../../README.md) (lines ~92–100) with the actual endpoint list from [src/routes/api.ts](../../src/routes/api.ts), or with a pointer to the API reference (US2). Do not list endpoints that don't exist.
- Replace the fabricated endpoint examples in [API_TESTING.md](../../API_TESTING.md) (`/api/classes`, `/api/instructors`, `/api/parent/tabs/registration?parentId=P001`) with real endpoints, or replace the whole file with a pointer to the Postman collection.
- Update [README.md](../../README.md) lines 198–200 ("Version: 1.1.15 | Last Updated: October 15, 2025"): either remove the static version stamp entirely (the build pipeline auto-increments `package.json`, so the README will always drift) or replace it with a one-liner that says "see package.json for current version."

---

### User Story 2 — Three reference docs that explain how the system actually works (Priority: P1)

The audit found that no single document explains end-to-end how a request flows, where errors actually go (stdout JSON → Cloud Logging → Error Reporting), what the cache strategy is, or how the trimester model resolves write targets. Constitution principles describe the rules but not the mechanics.

**Why this priority**: This is the largest unit of work in the spec, but it's also the unit that delivers the most value. After this ships, a fresh AI agent asked "how does X work?" can answer correctly from the docs alone instead of having to read 50 source files. Probably 1–2 days.

**Independent Test**: A fresh AI agent (or human reader) is given only [docs/technical/ARCHITECTURE.md](../../docs/technical/ARCHITECTURE.md), [docs/technical/API.md](../../docs/technical/API.md), and [docs/technical/FRONTEND.md](../../docs/technical/FRONTEND.md), and is asked the eight questions in the verification matrix below. They can answer all eight correctly without consulting source code.

**Acceptance Scenarios**:
1. **Given** `docs/technical/ARCHITECTURE.md`, **When** a reader needs to answer "where do errors go," **Then** they can describe the full pipeline: throw → `errorResponse()` → `gcpLogger` → stdout JSON → Cloud Logging → (for 5xx) auto-aggregation in Cloud Error Reporting via the `@type` field.
2. **Given** `docs/technical/ARCHITECTURE.md`, **When** a reader needs to answer "how is caching done," **Then** they can describe the 5-min in-memory `cacheService`, per-pod scope, full-flush invalidation on writes, and the explicit exclusion of the `periods` sheet.
3. **Given** `docs/technical/ARCHITECTURE.md`, **When** a reader needs to answer "how does the system decide which trimester to write to," **Then** they can describe `PeriodService.getEnrollmentTrimesterTable()` and the summer grade-bump in `userRepository.getStudents()`.
4. **Given** `docs/technical/ARCHITECTURE.md`, **When** a reader needs to answer "how is the user authenticated," **Then** they can describe the localStorage → `x-access-code`/`x-login-type` headers → auto-detect ladder (phone vs. code) → `requireAuth` middleware flow, including the 401-vs-403 logout contract.
5. **Given** `docs/technical/API.md`, **When** a reader is asked to list every endpoint with auth requirements, **Then** they can produce a list that matches [src/routes/api.ts](../../src/routes/api.ts) exactly.
6. **Given** `docs/technical/FRONTEND.md`, **When** a reader is asked how a tab loads data, **Then** they can describe the `BaseTab` lifecycle (`onLoad → fetchData → render → attachEventListeners`), the `HttpResult` discriminated union, and why `TabController.cleanup()` is called on user switch.
7. **Given** `docs/technical/FRONTEND.md`, **When** a reader is asked how shared models reach the browser, **Then** they can describe both the prod path (Express static serving at `/models/shared` and `/utils/values`) and the dev path (Vite path aliases in [vite.config.ts](../../vite.config.ts)).
8. **Given** all three docs, **When** a reader is asked "what's the single source of truth on the current logged-in user," **Then** they can give a defensible answer (since today there isn't one — see US4, which makes there be one — this question may need a follow-up answer after US4 ships).

**Concretely — `docs/technical/ARCHITECTURE.md`**
Cover, in this order:
- Layer flow: controller → service → repository → `googleSheetsDbClient`. Where each layer's responsibility ends (the responsibilities are mostly described in the Constitution; this doc shows the mechanics).
- Error & log pipeline: throw → route's try/catch or global handler at [app.ts:169–172](../../src/app.ts) → `errorResponse()` ([responseHelpers.ts:131–200](../../src/common/responseHelpers.ts)) → maps `Error.name` to status, formats envelope, calls `gcpLogger`. `gcpLogger` writes structured JSON to stdout. On GCP Cloud Run, stdout is auto-ingested into Cloud Logging; 5xx entries carry the magic `@type` field ([responseHelpers.ts:165–167](../../src/common/responseHelpers.ts)) that surfaces them in Cloud Error Reporting with automatic aggregation. 4xx → WARNING severity, 5xx → ERROR. Errors are NOT written to Google Sheets — the data store and the error sink are different systems. The frontend uses `error.type` (not `error.code`) to branch.
- Cache strategy: in-memory only ([cacheService.ts](../../src/cache/cacheService.ts)), 5-min TTL, oldest-key eviction. `googleSheetsDbClient` caches per `(spreadsheetId, sheet)`; PERIODS is explicitly excluded ([googleSheetsDbClient.ts:404–406](../../src/database/googleSheetsDbClient.ts)). `userRepository` adds a second enrichment cache. Writers call `clearAllCache()` (full flush, not surgical). Multi-instance deploys desync because each pod has its own cache; this is acceptable today and called out as a known limitation.
- Authentication flow: end-to-end. Frontend stores `forte_auth_session` (base64 JSON of `{accessCode, loginType, sessionId}`) in localStorage. Every request, `HttpService` reads it and sets `x-access-code` + `x-login-type` headers. [middleware/auth.ts](../../src/middleware/auth.ts) does an auto-detection ladder: 10-digit numeric → parent phone; 6-digit numeric → employee access code; falls back to the opposite if first lookup misses. On 401 the frontend clears localStorage; on 403 it shows an error but does not log out. No JWT, no session expiry.
- Trimester & period model: four trimesters (`fall`, `winter`, `spring`, `summer`), each with its own registrations sheet. Four period types per cycle: `intent`, `priorityEnrollment`, `openEnrollment`, `registration`. Current period = the `periods` row with the latest `startDate` ≤ now. `PeriodService.getEnrollmentTrimesterTable()` derives the write target. Summer is special: `userRepository.getStudents('summer')` bumps grades +1 at read time and drops students over `MAX_GRADE`; the bump is never persisted.
- DI container: lazy-singleton, infra services initialized eagerly. `ServiceKeys` is the canonical registry. One-paragraph "how to add a new service."
- Build & deploy: [src/build/Dockerfile](../../src/build/Dockerfile), [src/build/cloudbuild.yaml](../../src/build/cloudbuild.yaml), [scripts/version-manager.sh](../../scripts/version-manager.sh), [.github/workflows/](../../.github/workflows/). One paragraph per: what happens on merge to `dev`, what happens on merge to `main`.
- Migrations: discovers `src/migrations/NNN-name.ts`, diffs filenames against the `_migrations` sheet, runs pending sequentially, blocks app startup on failure ([migrationRunner.ts:121](../../src/infrastructure/migration/migrationRunner.ts)).

**Concretely — `docs/technical/API.md`**
- Generated (manually for now; auto-gen is its own project) from [src/routes/api.ts](../../src/routes/api.ts).
- For each of the 16 endpoints: method, path, auth requirement (public / `requireAuth`), request shape, response shape.
- Public endpoints called out as such: `/health`, `/version`, `/configuration`, `/auth/access-code`.
- Error envelope spec (the `{success: false, error: {message, code, type}}` shape from Constitution Principle IV).

**Concretely — `docs/technical/FRONTEND.md`**
- Bootstrap order (from `main.ts`): version fetch → config fetch → auto-login attempt → `TabController` init → 8 tabs registered.
- `BaseTab<TData>` lifecycle: `onLoad(sessionInfo) → fetchData() → render() → attachEventListeners()`. `AbortController` tied to load. `isLoaded` flag short-circuit.
- `HttpService` contract: every method returns `HttpResult<T>`, never throws. One direct `fetch()` exists at [httpService.ts:84](../../src/web/js/data/httpService.ts) — that is the single chokepoint and is the intended design (Constitution Principle V).
- Session & Change-User flow: `AccessCodeManager` in [session.ts](../../src/web/js/auth/session.ts), `UserSession` singleton for the app config. User switch calls `TabController.cleanup()` on every registered tab (not just the active one) because tabs cache `isLoaded`.
- Shared model serving: prod via Express static at `/models/shared` and `/utils/values`; dev via Vite path aliases in [vite.config.ts](../../vite.config.ts).
- Registration form architecture: parent vs. admin variants share the same component primitives (`StudentSelector`, `InstructorSelector`, etc.) but differ in flow shape (parent = cascading filter chips → time-slot grid; admin = linear form).

---

### User Story 3 — Inline doc comments at the four hotspots (Priority: P1)

Four spots in the codebase will surprise a reader. The audit identified these as places where a comment block at the top of the function or class is the single highest-leverage doc.

**Why this priority**: Five minutes of writing per spot, lasts as long as the code does. Ships with US2 (or before) without dependencies.

**Independent Test**: Each of the four sites has a doc comment that a reader can use to answer the listed question without reading the rest of the function.

**Acceptance Scenarios**:
1. **Given** [userRepository.ts](../../src/repositories/userRepository.ts) `getStudents` and `getStudentById`, **When** a reader looks at the function signature, **Then** they can answer "what changes when `period === 'summer'`" from the comment.
2. **Given** [registrationRepository.ts](../../src/repositories/registrationRepository.ts) `delete`, **When** a reader looks at the method, **Then** they can answer "why does this take a `trimester` argument that the base class doesn't" from the comment.
3. **Given** [userController.ts](../../src/controllers/userController.ts) `authenticateByAccessCode`, **When** a reader sees the `{ success: true, data: null }` response on a missed lookup, **Then** they can answer "why isn't this a 401" from the comment.
4. **Given** [periodRepository.ts](../../src/repositories/periodRepository.ts), **When** a reader sees that the periods table is fetched live every call, **Then** they can answer "why isn't this cached" from the comment.

**Concretely**
- `userRepository.getStudents(period)` and `getStudentById(id, period)`: doc block explaining that `period === 'summer'` triggers a runtime grade-bump (+1 to every student's grade, drops anyone over `MAX_GRADE`) and that the bump is never persisted. Link to the constitution's Principle IX.
- `registrationRepository.delete(id, deletedBy, trimester)`: doc block explaining that registrations live in per-trimester sheets, so the base CRUD signature is intentionally extended. Note the `@ts-expect-error` is a deliberate LSP carve-out, not a bug.
- `userController.authenticateByAccessCode`: doc block explaining the `data: null` contract on miss, with the actual reason (whatever it turns out to be — if the answer is "the frontend can't currently handle a 401 here," write that; if the answer is "this was accidental," fix it instead). The current comment says "required for frontend compatibility" but doesn't say why; resolve that here.
- `periodRepository.getAll()` or wherever the read happens: doc block explaining that periods are deliberately excluded from the cache because they control time-sensitive routing and a stale value would mis-route writes.

**Also flag, but do not move (out of scope, US5 documents them):**
- `registrationService.ts` bus deadlines (per-day end times).
- `registrationService.ts` 12-lessons-per-trimester literal.
- `config/constants.ts` `FORTE_PROGRAM_EMAIL`.

These three are real candidates for "move to configurable storage" but each is its own decision and shouldn't sneak into a documentation PR.

---

### User Story 4 — Canonical "authenticated user" type on the frontend (Priority: P2)

The audit found three different inline interface declarations describing the same concept ([main.ts:61–69](../../src/web/js/main.ts), [loginModal.ts:14–22](../../src/web/js/auth/loginModal.ts), and the `SessionInfo` shape in [baseTab.ts:30–42](../../src/web/js/core/baseTab.ts)). Today they all happen to describe the same data, but nothing keeps them in sync.

**Why this priority**: Real consistency fix, small surface, high leverage for future frontend work. Shipping this also unblocks the "what's the single source of truth on the current user" question from US2 acceptance scenario 8.

**Independent Test**: A single TypeScript interface (e.g., `AuthenticatedUser`) is exported from one file and imported by `main.ts`, `loginModal.ts`, and `baseTab.ts`. The inline declarations are removed. TypeScript still compiles with `npm run typecheck`. The frontend still runs without runtime errors.

**Acceptance Scenarios**:
1. **Given** the three frontend files, **When** they each describe the authenticated user, **Then** they import the same interface from one location.
2. **Given** `npm run typecheck`, **When** run, **Then** it passes with zero new errors.
3. **Given** a manual smoke test (login as parent, switch to admin via "Change User"), **When** performed, **Then** behavior is identical to before.

**Concretely**
- Add the interface to [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts) (it's the natural home — the file already owns `AccessCodeManager` and `UserSession`). Match the most complete of the three existing shapes; if any field is contested, pick the union.
- Update the three call sites to import it.
- Note: this is not the same as the `SessionInfo` interface in `baseTab.ts`, which is a separate concept (tab-load context, includes things beyond just the user). Leave `SessionInfo` as-is but have it reference the new `AuthenticatedUser` for its user field.

---

### User Story 5 — Uniform trimester validation in the registration controller (Priority: P2)

Three methods on [registrationController.ts](../../src/controllers/registrationController.ts) accept a trimester parameter. `createRegistration` validates it with `isValidTrimester()`, `updateIntent` validates, `deleteRegistration` does not. The inconsistency is small, but it's exactly the kind of thing a fresh agent fixes "for consistency" in the wrong direction.

**Why this priority**: Real bug-shaped finding. Trivial to fix once decided. Add a test that pins the behavior so the next person doesn't undo it.

**Independent Test**: All three methods validate the trimester the same way. A new test asserts that an invalid trimester on `DELETE /registrations/:trimester/:id` returns 400 (or whatever the validator's chosen status is).

**Acceptance Scenarios**:
1. **Given** `DELETE /registrations/not-a-real-trimester/abc-123`, **When** the request is sent, **Then** the response is 400 with a clear "invalid trimester" error.
2. **Given** all three methods, **When** the trimester validation code paths are grepped, **Then** they look the same.

**Concretely**
- Add `isValidTrimester()` validation to `deleteRegistration`. Use the same error class and the same response shape as `createRegistration`.
- Add an integration test under [tests/integration/registrationController.test.ts](../../tests/integration/registrationController.test.ts).

---

### User Story 6 — Tests for the four genuinely-untested files (Priority: P2)

The audit's "zero coverage" list was overcounted (most flagged files are tested in nested subdirectories the agent didn't traverse). The actually-zero-coverage files are:

- [src/middleware/auth.ts](../../src/middleware/auth.ts) — security-critical, the auth ladder is the most important untested logic in the codebase.
- [src/cache/cacheService.ts](../../src/cache/cacheService.ts) — TTL, eviction, lazy-expiry.
- [src/repositories/periodRepository.ts](../../src/repositories/periodRepository.ts) and [src/repositories/programRepository.ts](../../src/repositories/programRepository.ts) — thin but currently unverified.
- [src/utils/logger.ts](../../src/utils/logger.ts) — log-level routing logic.

**Why this priority**: The auth middleware tests are P1 in spirit but bundled here because they ship together. If splitting, pull auth into its own PR.

**Independent Test**: Each of the listed files has a test file in the corresponding `tests/unit/` subdirectory. `npm run test:unit` passes. `npm run test:coverage` shows nonzero coverage for each file.

**Acceptance Scenarios**:
1. **Given** the auth middleware tests, **When** an invalid 10-digit phone is sent, **Then** the ladder is exercised and `req.currentUser` ends as `null`.
2. **Given** the auth middleware tests, **When** a valid 6-digit access code is sent, **Then** the user is loaded and `req.currentUser` is populated.
3. **Given** the auth middleware tests, **When** the `loginType` header conflicts with the auto-detect heuristic, **Then** the explicit header wins (or, if it doesn't today, the test pins whichever behavior is actually current and the comment in the test explains the choice).
4. **Given** the cache service tests, **When** the TTL expires between writes and reads, **Then** the read returns undefined.
5. **Given** the cache service tests, **When** `maxSize` is exceeded, **Then** the oldest entry is evicted.

**Concretely**
- Test files go in [tests/unit/middleware/auth.test.ts](../../tests/) (new subdirectory), [tests/unit/cache/cacheService.test.ts](../../tests/) (new subdirectory), [tests/unit/repositories/periodRepository.test.ts](../../tests/unit/repositories/), [tests/unit/repositories/programRepository.test.ts](../../tests/unit/repositories/), [tests/unit/utils/logger.test.ts](../../tests/unit/utils/).
- Follow the existing mocking convention: mock `googleSheetsDbClient`, never hit the real Sheets API (Constitution, Testing section).

---

### User Story 7 — One end-to-end test for the summer grade-bump (Priority: P3)

`userRepository` has unit tests for the grade-bump transform, but no test confirms that the bump flows all the way through to a parent-facing tab response. If someone deletes the `period` argument from a service call in the middle of the chain, no test will catch it.

**Why this priority**: Defensive against the highest-impact regression on the system. Small effort.

**Independent Test**: An integration test calls `/api/parent/tabs/registration/summer` and asserts that returned students have grades incremented by one relative to their stored values.

**Acceptance Scenarios**:
1. **Given** a parent has a 3rd-grade student and a 6th-grade student in the mocked DB, **When** `/api/parent/tabs/registration/summer` is called, **Then** the response shows grades 4 and 7.
2. **Given** a parent has an 8th-grade student (the current `MAX_GRADE`), **When** `/api/parent/tabs/registration/summer` is called, **Then** that student does not appear in the response.
3. **Given** the same parent, **When** `/api/parent/tabs/registration/fall` is called, **Then** grades are unchanged.

**Concretely**
- New integration test under [tests/integration/](../../tests/integration/). Probably belongs with the registration controller tests but can be its own file.

---

### User Story 8 — Confirm the successor-spec handoff (Priority: P3)

Every audit finding that does not fit inside 015 has been routed to one of the five successor stub specs (016–020). This User Story is the cross-check: after 015 ships, verify that every audit finding still appears either as a closed item inside this spec or as a tracked item inside a successor stub.

**Why this priority**: Five-minute integrity check. Catches anything that fell through the cracks during 015's implementation.

**Independent Test**: A grep of all eight specs (015–020) for keywords from the audit (e.g., "bus deadlines", "LSP", "asString", "viewModel", "gas/") returns at least one hit for each. No audit finding is unrouted.

**Acceptance Scenarios**:
1. **Given** the audit's full finding list (preserved below), **When** each finding is grep-searched across `specs/015-audit-remediation/` through `specs/020-project-hygiene/`, **Then** each finding appears in at least one spec.
2. **Given** a future contributor asks "did we ever decide about the bus deadlines," **When** they grep, **Then** they find the row in [018-business-rules-to-config](../018-business-rules-to-config/spec.md) and know exactly where the decision will land.

**Routing table — every audit finding mapped to its owner spec**

| Finding | Routed to |
| --- | --- |
| Broken doc links in `README.md` / `API_TESTING.md` / `docs/README.md` | 015 US1 |
| Missing `ARCHITECTURE.md` / `API.md` / `FRONTEND.md` | 015 US2 |
| Four "you will be surprised" hotspots need inline comments | 015 US3 |
| Three inline declarations of "authenticated user" on frontend | 015 US4 |
| Inconsistent trimester validation in `RegistrationController` | 015 US5 |
| Zero coverage on `middleware/auth.ts`, `cacheService.ts`, `periodRepository.ts`, `programRepository.ts`, `logger.ts` | 015 US6 |
| No end-to-end test for summer grade-bump | 015 US7 |
| `RegistrationRepository.delete()` breaks LSP via `@ts-expect-error` | [017-uniform-crud-completion](../017-uniform-crud-completion/spec.md) |
| Mixed not-found semantics (return `null` vs. throw `NotFoundError`) | [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md) |
| Duplicate response logging (manual + auto) | [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md) |
| `asString()` silently takes first array element | [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md) |
| Audit-trail best-effort semantics | [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md) |
| `authenticateByAccessCode` returns `{success:true, data:null}` on miss | 015 US3 (document) + [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md) (if it should be 401) |
| Bus deadlines hardcoded | [018-business-rules-to-config](../018-business-rules-to-config/spec.md) |
| 12-lessons-per-trimester literal | [018-business-rules-to-config](../018-business-rules-to-config/spec.md) |
| `FORTE_PROGRAM_EMAIL` hardcoded | [018-business-rules-to-config](../018-business-rules-to-config/spec.md) |
| `jsdom` missing from Jest setup | [019-frontend-test-infrastructure](../019-frontend-test-infrastructure/spec.md) |
| 11 registration form components have zero coverage | [019-frontend-test-infrastructure](../019-frontend-test-infrastructure/spec.md) |
| `viewModel` references survive in `feedback.ts` and `tests/unit/web/viewModel.test.ts` | [020-project-hygiene](../020-project-hygiene/spec.md) (also flagged by [019-frontend-test-infrastructure](../019-frontend-test-infrastructure/spec.md)) |
| `gas/` legacy-vs-active status unclear | [020-project-hygiene](../020-project-hygiene/spec.md) |
| `specs/` archival hygiene | [020-project-hygiene](../020-project-hygiene/spec.md) |
| `dev/plans/` status marking | [020-project-hygiene](../020-project-hygiene/spec.md) |
| `.claude/CLAUDE.md` "Recent Changes" stale | [020-project-hygiene](../020-project-hygiene/spec.md) |
| Postman collection currency unverified | [020-project-hygiene](../020-project-hygiene/spec.md) |
| Multi-instance cache desync | 015 US2 (document; no code change) |
| Audit log best-effort contract | 015 US2 (document) + [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md) (decide policy) |

**Concretely**
- This User Story produces no code or doc artifact other than the verification itself. The work is "grep and confirm." If a finding is missing, file it into the relevant successor stub before closing this User Story.

---

### Edge Cases

- **Doc PRs vs. code PRs.** US1, US2, US3, US8 are doc-only. US4, US5, US6, US7 touch code. Ship doc PRs through normal review; code PRs through `npm run check:all`. No special handling.
- **US2 + US1 collision.** If US2 ships before US1, then US1 just points at the new docs. If US1 ships first and the new docs don't exist yet, US1 should remove the dead links rather than leave them dangling — US2 can re-add them later.
- **US3 vs. US5.** US3 documents `userController.authenticateByAccessCode`'s `data: null` behavior; US5 doesn't touch that file. If while writing the US3 comment the right answer turns out to be "actually this should return 401," that's a behavior change and belongs in its own spec, not US3.
- **US6 auth tests revealing actual bugs.** If writing the middleware tests reveals that the auth ladder behaves differently from what the code looks like it does, document the actual behavior in the test (with a comment) and open a separate spec for the fix.
- **US7 fixture data.** The summer test needs students at multiple grades to verify both the bump and the `MAX_GRADE` drop. Use mocked fixture data, not seeded prod-shape data.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** — Every link in `README.md`, `API_TESTING.md`, and `docs/README.md` MUST resolve to a real file or live URL after US1 ships.
- **FR-002** — Every endpoint path mentioned in `README.md` and `API_TESTING.md` MUST appear verbatim in `src/routes/api.ts` after US1 ships.
- **FR-003** — After US2 ships, `docs/technical/` MUST contain `ARCHITECTURE.md`, `API.md`, and `FRONTEND.md`, each covering the topics listed in US2's "Concretely" sections.
- **FR-004** — After US3 ships, each of the four hotspot sites MUST have a doc comment that answers the listed question without requiring the reader to step through the function body.
- **FR-005** — After US4 ships, exactly one TypeScript interface MUST describe "authenticated user" on the frontend, imported by every place that needs it.
- **FR-006** — After US5 ships, all three trimester-accepting methods on `RegistrationController` MUST validate the trimester via the same helper, and at least one test MUST pin the validation on `deleteRegistration`.
- **FR-007** — After US6 ships, each listed zero-coverage file MUST have a corresponding test file with at least the acceptance-scenario cases.
- **FR-008** — After US7 ships, at least one integration test MUST exercise the full summer-grade-bump path from controller to response.
- **FR-009** — After US8 ships, every row in the US8 routing table MUST appear (verbatim or paraphrased) in either this spec or in one of the successor stubs ([016-error-contract-uniformization](../016-error-contract-uniformization/spec.md), [017-uniform-crud-completion](../017-uniform-crud-completion/spec.md), [018-business-rules-to-config](../018-business-rules-to-config/spec.md), [019-frontend-test-infrastructure](../019-frontend-test-infrastructure/spec.md), [020-project-hygiene](../020-project-hygiene/spec.md)). No audit finding may be unrouted.

### Non-Functional Requirements
- **NFR-001** — No user-facing behavior change. Manual smoke test before each PR merge: log in as parent, log in as employee, switch users, register one lesson.
- **NFR-002** — No constitution amendments required. If the work in any User Story turns out to need one, stop and amend the constitution as a separate PR first.
- **NFR-003** — Every code-touching User Story MUST pass `npm run check:all` before merge (lint, typecheck, tests).
- **NFR-004** — Every doc-touching User Story MUST be reviewable by reading the rendered Markdown — no images, no external assets that aren't already in `docs/`.

## Success Criteria *(mandatory)*

This spec ships when all eight User Stories are merged, OR when remaining stories are explicitly moved to a successor spec with rationale.

The "fresh AI agent" test for the overall spec: hand a new agent the project with no chat context, the constitution, and the three new reference docs (US2). Ask the eight questions from US2's acceptance scenarios. They answer all eight correctly. That is the success condition.

## Dependencies

- None on other open specs. Independent of [014-summer-registration](../014-summer-registration/spec.md) and the school-year rollover cluster ([021-school-year-rollover](../021-school-year-rollover/spec.md), [022-intent-phase-reduction](../022-intent-phase-reduction/spec.md)).
- The successor cleanup specs [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md), [017-uniform-crud-completion](../017-uniform-crud-completion/spec.md), [018-business-rules-to-config](../018-business-rules-to-config/spec.md), [019-frontend-test-infrastructure](../019-frontend-test-infrastructure/spec.md), and [020-project-hygiene](../020-project-hygiene/spec.md) each consume specific items deferred from this spec — see the US8 routing table for the mapping.
- Each User Story is independent of the others; they can ship in any order.

## Out of Scope (reiterated for clarity)

- Behavior changes visible to end users.
- The LSP fix on `RegistrationRepository.delete()` — routed to [017-uniform-crud-completion](../017-uniform-crud-completion/spec.md).
- Mixed not-found semantics, duplicate logging, `asString()` behavior, audit-log policy — routed to [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md).
- Moving hardcoded business rules (bus deadlines, 12-lessons literal, `FORTE_PROGRAM_EMAIL`) to config — routed to [018-business-rules-to-config](../018-business-rules-to-config/spec.md).
- jsdom setup and component-level frontend tests — routed to [019-frontend-test-infrastructure](../019-frontend-test-infrastructure/spec.md).
- `gas/` directory decision, `specs/` archival, `dev/plans/` status, Postman currency, `viewModel` carve-out, `.claude/CLAUDE.md` staleness — routed to [020-project-hygiene](../020-project-hygiene/spec.md).
