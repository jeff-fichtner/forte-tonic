# Feature Specification: Audit Remediation

**Feature Branch**: `015-audit-remediation`
**Created**: 2026-05-30
**Status**: Draft
**Input**: User description: "Knock out the findings from the 2026-05-30 full-project audit one by one — broken doc links, missing architecture docs, inconsistencies that bite fresh contributors, and the handful of real test gaps."

> **What this spec is.** A working checklist that turns the 2026-05-30 audit
> into independently-shippable batches. Each User Story below is one
> self-contained PR; each PR leaves the project in a better state than it
> found it. The full spec ships only when all eight User Stories merge (see
> Success Criteria — no escape hatch).
>
> **What this spec is not.** A behavior change for end users. Parents,
> instructors, and admins see no UI or workflow differences from any of these
> batches. This is internal cleanup: docs, tests, and small code consistency
> fixes that make the codebase legible to a fresh AI agent (or human) with no
> prior context.
>
> **Source.** The 2026-05-30 audit conversation. The durable artifact is
> [findings.md](findings.md), created by US8 — that file is the curated
> source of truth, not the chat transcript. Do not require reading the
> transcript to act on this spec.

## Clarifications

### Session 2026-05-30

- Q: How should the three new reference docs (`ARCHITECTURE.md`, `API.md`, `FRONTEND.md`) be kept current as the code evolves? → A: Each PR that changes affected surface area MUST update the relevant doc; enforce via a checklist item in `CONTRIBUTING.md` and call it out in the docs themselves.
- Q: What should US3 produce for the `userController.authenticateByAccessCode` `{success: true, data: null}` hotspot? → A: Document the current behavior in US3 (it's coupled to the frontend's logout-on-401 contract in `HttpService`, which would loop the login modal if changed); defer any redesign to 016.
- Q: What's the ship bar for US2's three docs? → A: Trust the eight US2 acceptance scenarios (the fresh-AI-agent test); no additional self-review checklist or reviewer-separation rule beyond normal PR review.
- Q: Policy when US6 auth-middleware tests reveal a bug in the auth ladder? → A: Always defer — document the actual behavior in the test (with a comment explaining what's wrong) and route the fix to a new spec, regardless of severity. US6 ships on test coverage, not on bug fixes.
- Q: How is FR-009 ("no audit finding may be unrouted") enforced? → A: Manual but checked-in — the audit findings get copied into `specs/015-audit-remediation/findings.md` so US8's routing-table verification is a mechanical diff against a real artifact, not against chat context. No CI script.
- Q: What should `findings.md` actually contain? → A: A curated, deduplicated list authored on this branch (not a verbatim chat paste). One short heading per finding, one-sentence summary, file:line reference. Errors in the original audit (e.g., the test-coverage agent missing nested test directories) are silently corrected before commit. Mirrors the structure of US8's routing table.
- Q: When can 015 ship without all 8 User Stories merged? → A: Never. The "OR remaining stories moved to a successor spec" escape hatch is removed. 015 ships only when all 8 User Stories merge.
- Q: What counts as a "mention" for the routing-table acceptance bar (FR-009)? → A: Each routed item must appear as a dedicated heading or bullet in the target spec's "Findings to address" section with enough context that a reader unfamiliar with the audit can act on it. Matches the existing pattern in the successor stubs.

## Scope & Non-Goals

**In scope**
- Fixing broken doc references in [README.md](../../README.md), [API_TESTING.md](../../API_TESTING.md), and [docs/](../../docs/).
- Writing the three missing reference documents (Architecture, API, Frontend) that the audit identified as the highest-value gaps.
- A small set of inline doc comments at the four "you will be surprised" hotspots.
- The handful of real test gaps the audit identified — authentication middleware, cache service, and one end-to-end summer-grade-bump assertion. Most of the audit's "untested" list turned out to be tested in nested directories (see `tests/unit/controllers/`, `services/`, `common/`, `infrastructure/`); only the actually-zero-coverage files are in scope here.
- Two small code-consistency fixes that take less than the doc work to write up: uniform trimester validation in the registration controller, and one canonical TypeScript interface for "the authenticated user" on the frontend.

**Out of scope**
- Any behavior change visible to end users.
- Any refactor that changes layer boundaries or data shapes — those belong in their own specs (e.g., the LSP violation in `RegistrationRepository.delete()` is *flagged* here but the fix is routed to [017-uniform-crud-completion](../017-uniform-crud-completion/spec.md)).
- jsdom + browser-environment Jest setup. The audit noted this gap; it's deferred because it's a multi-day infrastructure change.
- Moving hardcoded business rules (bus deadlines, 12-lesson assumption, `FORTE_PROGRAM_EMAIL`) into configurable storage. These are real tech debt but each is its own decision; they are routed to [018-business-rules-to-config](../018-business-rules-to-config/spec.md) and flagged in US3's "do not move" block so the doc-comment PR doesn't accidentally pick them up.
- The `specs/` archival problem and the `dev/plans/` status-marking problem. Project-management hygiene, routed to [020-project-hygiene](../020-project-hygiene/spec.md).
- Anything in `gas/` — its legacy/active status is itself an open question routed to [020-project-hygiene](../020-project-hygiene/spec.md).

## User Scenarios & Testing *(mandatory)*

> "User" in this spec means a developer or AI agent picking up the codebase
> fresh. Each story is sized to one PR.

### User Story 1 — Stop sending readers to dead links (Priority: P1)

A new contributor reads [README.md](../../README.md) and clicks through to learn the architecture. Today three of those links 404, two of the listed endpoints don't exist, and the version number is three minor versions stale.

**Why this priority**: Cheapest, highest-trust-impact batch. If the entry-point doc is wrong, every later doc gets read with suspicion.

**Independent Test**: Every link in [README.md](../../README.md), [API_TESTING.md](../../API_TESTING.md), and [docs/README.md](../../docs/README.md) resolves to a real file or URL. Every endpoint path mentioned in those files appears verbatim in [src/routes/api.ts](../../src/routes/api.ts). The version string in README matches `package.json`.

**Acceptance Scenarios**:
1. **Given** [README.md](../../README.md), **When** every relative link is resolved, **Then** zero 404s.
2. **Given** [API_TESTING.md](../../API_TESTING.md), **When** each documented endpoint is grepped against [src/routes/api.ts](../../src/routes/api.ts), **Then** every documented endpoint exists.
3. **Given** [README.md](../../README.md), **When** the version string is compared to [package.json](../../package.json) `version`, **Then** they match (or the README no longer carries a static version stamp at all — see "Concretely" for the choice).
4. **Given** [docs/README.md](../../docs/README.md), **When** the constitution link is followed, **Then** it resolves to [.specify/memory/constitution.md](../../.specify/memory/constitution.md).

**Concretely**
- Remove or repoint dead references to `docs/technical/ARCHITECTURE_COMPLETE.md`, `docs/technical/ARCHITECTURE.md`, `docs/technical/MIGRATION_SUMMARY.md` in [README.md](../../README.md). If US2 is shipping concurrently and creating `ARCHITECTURE.md`, point at the new file; otherwise remove the link entirely.
- Replace the "API Overview" section of [README.md](../../README.md) (lines ~92–100) with the actual endpoint list from [src/routes/api.ts](../../src/routes/api.ts), or with a pointer to the API reference (US2). Do not list endpoints that don't exist.
- Replace the fabricated endpoint examples in [API_TESTING.md](../../API_TESTING.md) (`/api/classes`, `/api/instructors`, `/api/parent/tabs/registration?parentId=P001`) with real endpoints, or replace the whole file with a pointer to the Postman collection.
- Update the static version stamp in [README.md](../../README.md) ("Version: 1.1.15 | Last Updated: October 15, 2025" — line numbers approximate, the stamp is in the footer): either remove it entirely (the build pipeline auto-increments `package.json`, so any static stamp will drift) or replace it with a one-liner that says "see `package.json` for current version."

---

### User Story 2 — Three reference docs that explain how the system actually works (Priority: P1)

The audit found that no single document explains end-to-end how a request flows, where errors actually go (stdout JSON → Cloud Logging → Error Reporting), what the cache strategy is, or how the trimester model resolves write targets. Constitution principles describe the rules but not the mechanics.

**Why this priority**: Largest unit of work in the spec, but the unit that delivers the most value. After this ships, a fresh AI agent asked "how does X work?" can answer correctly from the docs alone instead of having to read 50 source files.

**Independent Test**: A fresh AI agent (or human reader) is given only [docs/technical/ARCHITECTURE.md](../../docs/technical/ARCHITECTURE.md), [docs/technical/API.md](../../docs/technical/API.md), and [docs/technical/FRONTEND.md](../../docs/technical/FRONTEND.md), and is asked the eight questions in the verification matrix below. They can answer all eight correctly without consulting source code.

**Acceptance Scenarios**:
1. **Given** `docs/technical/ARCHITECTURE.md`, **When** a reader needs to answer "where do errors go," **Then** they can describe the full pipeline: throw → `errorResponse()` → `gcpLogger` → stdout JSON → Cloud Logging → (for 5xx) auto-aggregation in Cloud Error Reporting via the `@type` field.
2. **Given** `docs/technical/ARCHITECTURE.md`, **When** a reader needs to answer "how is caching done," **Then** they can describe the 5-min in-memory `cacheService`, per-pod scope, full-flush invalidation on writes, and the explicit exclusion of the `periods` sheet.
3. **Given** `docs/technical/ARCHITECTURE.md`, **When** a reader needs to answer "how does the system decide which trimester to write to," **Then** they can describe `PeriodService.getEnrollmentTrimesterTable()` and the summer grade-bump in `userRepository.getStudents()`.
4. **Given** `docs/technical/ARCHITECTURE.md`, **When** a reader needs to answer "how is the user authenticated," **Then** they can describe the localStorage → `x-access-code`/`x-login-type` headers → auto-detect ladder (phone vs. code) → `requireAuth` middleware flow, including the logout-on-401 / no-logout-on-403 frontend contract.
5. **Given** `docs/technical/API.md`, **When** a reader is asked to list every endpoint with auth requirements, **Then** they can produce a list that matches [src/routes/api.ts](../../src/routes/api.ts) exactly.
6. **Given** `docs/technical/FRONTEND.md`, **When** a reader is asked how a tab loads data, **Then** they can describe the `BaseTab` lifecycle (`onLoad → fetchData → render → attachEventListeners`), the `HttpResult` discriminated union, and why `TabController.cleanup()` is called on user switch.
7. **Given** `docs/technical/FRONTEND.md`, **When** a reader is asked how shared models reach the browser, **Then** they can describe both the prod path (Express static serving at `/models/shared` and `/utils/values`) and the dev path (Vite path aliases in [vite.config.ts](../../vite.config.ts)).
8. **Given** all three docs, **When** a reader is asked "what's the single source of truth on the current logged-in user," **Then** they can point at the canonical `AuthenticatedUser` interface produced by US4. (US2's docs name the interface; US4 creates it. If US2 ships before US4, the doc names the planned interface and links to US4.)

**Concretely — `docs/technical/ARCHITECTURE.md`**
Cover, in this order:
- Layer flow: controller → service → repository → `googleSheetsDbClient`. Where each layer's responsibility ends (the responsibilities are mostly described in the Constitution; this doc shows the mechanics).
- Error & log pipeline: throw → route's try/catch or global handler at [app.ts:169–172](../../src/app.ts) → `errorResponse()` ([responseHelpers.ts:131–200](../../src/common/responseHelpers.ts)) → maps `Error.name` to status, formats envelope, calls `gcpLogger`. `gcpLogger` writes structured JSON to stdout. On GCP Cloud Run, stdout is auto-ingested into Cloud Logging; 5xx entries carry the magic `@type` field ([responseHelpers.ts:165–167](../../src/common/responseHelpers.ts)) that surfaces them in Cloud Error Reporting with automatic aggregation. 4xx → WARNING severity, 5xx → ERROR. Errors are NOT written to Google Sheets — the data store and the error sink are different systems. The frontend uses `error.type` (not `error.code`) to branch.
- Cache strategy: in-memory only ([cacheService.ts](../../src/cache/cacheService.ts)), 5-min TTL, oldest-key eviction. `googleSheetsDbClient` caches per `(spreadsheetId, sheet)`; the `periods` sheet is explicitly excluded ([googleSheetsDbClient.ts:404–406](../../src/database/googleSheetsDbClient.ts)). `userRepository` adds a second enrichment cache. Writers call `clearAllCache()` (full flush, not surgical). Multi-instance deploys desync because each pod has its own cache; this is acceptable today and called out as a known limitation.
- Authentication flow: end-to-end. Frontend stores `forte_auth_session` (base64 JSON of `{accessCode, loginType, sessionId}`) in localStorage. Every request, `HttpService` reads it and sets `x-access-code` + `x-login-type` headers. [middleware/auth.ts](../../src/middleware/auth.ts) does an auto-detection ladder: 10-digit numeric → parent phone; 6-digit numeric → employee access code; falls back to the opposite if first lookup misses. On 401 the frontend clears localStorage; on 403 it shows an error but does not log out. No JWT, no session expiry.
- Trimester & period model: four trimesters (`fall`, `winter`, `spring`, `summer`), each with its own registrations sheet. Four period types per cycle: `intent`, `priorityEnrollment`, `openEnrollment`, `registration`. Current period = the `periods` row with the latest `startDate` ≤ now. `PeriodService.getEnrollmentTrimesterTable()` derives the write target. Summer is special: `userRepository.getStudents('summer')` bumps grades +1 at read time and drops students over `MAX_GRADE`; the bump is never persisted.
- DI container: lazy-singleton, infra services initialized eagerly. `ServiceKeys` is the canonical registry. One-paragraph "how to add a new service."
- Build & deploy: [src/build/Dockerfile](../../src/build/Dockerfile), [src/build/cloudbuild.yaml](../../src/build/cloudbuild.yaml), [scripts/version-manager.sh](../../scripts/version-manager.sh), [.github/workflows/](../../.github/workflows/). One paragraph per: what happens on merge to `dev`, what happens on merge to `main`.
- Migrations: discovers `src/migrations/NNN-name.ts`, diffs filenames against the `_migrations` sheet, runs pending sequentially, blocks app startup on failure ([migrationRunner.ts:121](../../src/infrastructure/migration/migrationRunner.ts)).

**Concretely — `docs/technical/API.md`**
- Hand-authored by reading [src/routes/api.ts](../../src/routes/api.ts) — no auto-generation in scope here (an automation pass would be its own spec).
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

**Maintenance contract (applies to all three docs)**
- Each doc MUST open with a short header block stating the contract: "If your PR changes code in <surface area X, Y, Z>, you MUST update this document in the same PR." The surface area is the code referenced in the doc's body:
  - `ARCHITECTURE.md`: `src/{controllers,services,repositories}/`, `src/common/{errors,errorConstants,responseHelpers,gcpLogger}.ts`, `src/cache/`, `src/middleware/auth.ts`, `src/database/`, `src/infrastructure/`, `src/config/`.
  - `API.md`: `src/routes/api.ts`, anything referenced by it (controller methods, request/response shapes).
  - `FRONTEND.md`: `src/web/js/{main,core,tabs,data,auth}/**`, `vite.config.ts`, plus the static-serving routes in `src/app.ts`.
- [CONTRIBUTING.md](../../CONTRIBUTING.md) MUST gain a checklist item under "Pre-Commit Checklist": "Did your change affect anything documented in `docs/technical/ARCHITECTURE.md`, `API.md`, or `FRONTEND.md`? If yes, update the relevant doc in this PR."
- This is the same enforcement model the Constitution already uses for the Postman collection (Testing section). No automation required for US2 — the convention plus the checklist is the contract.

---

### User Story 3 — Inline doc comments at the four hotspots (Priority: P1)

Four spots in the codebase will surprise a reader. The audit identified these as places where a comment block at the top of the function or class is the single highest-leverage doc.

**Why this priority**: Very small effort, lasts as long as the code does. Ships independently of US2.

**Independent Test**: Each of the four sites has a doc comment that a reader can use to answer the listed question without reading the rest of the function.

The four documented hotspots are listed in the Acceptance Scenarios below. The "Also flag, but do not move" block at the bottom of this User Story lists separate items that are *not* US3 deliverables — they are routed to [018-business-rules-to-config](../018-business-rules-to-config/spec.md).

**Acceptance Scenarios**:
1. **Given** [userRepository.ts](../../src/repositories/userRepository.ts) `getStudents` and `getStudentById`, **When** a reader looks at the function signature, **Then** they can answer "what changes when `period === 'summer'`" from the comment.
2. **Given** [registrationRepository.ts](../../src/repositories/registrationRepository.ts) `delete`, **When** a reader looks at the method, **Then** they can answer "why does this take a `trimester` argument that the base class doesn't" from the comment.
3. **Given** [userController.ts](../../src/controllers/userController.ts) `authenticateByAccessCode`, **When** a reader sees the `{ success: true, data: null }` response on a missed lookup, **Then** they can answer "why isn't this a 401" from the comment — specifically, that returning 401 would trigger `HttpService`'s logout-on-401 path ([httpService.ts](../../src/web/js/data/httpService.ts) `#onSessionExpired`), which would clear localStorage and loop the login modal for a user who isn't logged in yet.
4. **Given** [periodRepository.ts](../../src/repositories/periodRepository.ts), **When** a reader sees that the periods table is fetched live every call, **Then** they can answer "why isn't this cached" from the comment.

**Concretely**
- `userRepository.getStudents(period)` and `getStudentById(id, period)`: doc block explaining that `period === 'summer'` triggers a runtime grade-bump (+1 to every student's grade, drops anyone over `MAX_GRADE`) and that the bump is never persisted. Link to Constitution Principle IX.
- `registrationRepository.delete(id, deletedBy, trimester)`: doc block explaining that registrations live in per-trimester sheets, so the base CRUD signature is intentionally extended. Note the `@ts-expect-error` is a deliberate LSP carve-out, not a bug.
- `userController.authenticateByAccessCode`: doc block explaining the `data: null` contract on miss. The reason is a real frontend coupling, not historical accident: `HttpService` treats 401 as a session-expiration signal — it clears localStorage and fires `#onSessionExpired`. Returning 401 from this endpoint would log out a user who isn't even logged in yet and loop the login modal on every failed attempt. The endpoint behaves as a "lookup probe" (200 + nullable payload), not an "authenticate-or-fail" endpoint. Whether that's the right design is a question for [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md), not US3.
- `periodRepository.getAll()` or wherever the read happens: doc block explaining that periods are deliberately excluded from the cache because they control time-sensitive routing and a stale value would mis-route writes.

**Also flag, but do not move (routed to [018-business-rules-to-config](../018-business-rules-to-config/spec.md)):**
- `registrationService.ts` bus deadlines (per-day end times).
- `registrationService.ts` 12-lessons-per-trimester literal.
- `config/constants.ts` `FORTE_PROGRAM_EMAIL`.

These three are real candidates for "move to configurable storage" but each is its own decision and shouldn't sneak into a documentation PR.

---

### User Story 4 — Canonical "authenticated user" type on the frontend (Priority: P2)

The audit found three different inline interface declarations describing the same concept ([main.ts:61–69](../../src/web/js/main.ts), [loginModal.ts:14–22](../../src/web/js/auth/loginModal.ts), and the `SessionInfo` shape in [baseTab.ts:30–42](../../src/web/js/core/baseTab.ts)). Today they all happen to describe the same data, but nothing keeps them in sync.

**Why this priority**: Real consistency fix, small surface, high leverage for future frontend work. The interface this User Story produces is what US2's acceptance scenario 8 points at — the two stories support each other but neither blocks the other (US2 can describe the planned interface and link forward to US4 if US4 hasn't merged yet).

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

**Independent Test**: All three methods validate the trimester the same way (same helper, same error class, same response shape as `createRegistration` today). A new test asserts that an invalid trimester on `DELETE /registrations/:trimester/:id` produces the same error response as an invalid trimester on `POST /registrations`.

**Acceptance Scenarios**:
1. **Given** `DELETE /registrations/not-a-real-trimester/abc-123`, **When** the request is sent, **Then** the response matches `createRegistration`'s invalid-trimester response (same HTTP status, same error envelope, same error code).
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

**Why this priority**: Auth middleware coverage is the highest-impact piece (the auth ladder is security-critical); the others are gap-filling. Bundled as P2 because they share one PR and ship together.

**Independent Test**: Each of the five listed files has a corresponding test file under `tests/unit/` (in either an existing or newly-created subdirectory — see "Concretely"). `npm run test:unit` passes. `npm run test:coverage` shows nonzero coverage for each file.

**Acceptance Scenarios**:
1. **Given** the auth middleware tests, **When** an invalid 10-digit phone is sent, **Then** the ladder is exercised and `req.currentUser` ends as `null`.
2. **Given** the auth middleware tests, **When** a valid 6-digit access code is sent, **Then** the user is loaded and `req.currentUser` is populated.
3. **Given** the auth middleware tests, **When** the `loginType` header conflicts with the auto-detect heuristic, **Then** the explicit header wins (or, if it doesn't today, the test pins whichever behavior is actually current and the comment in the test explains the choice).
4. **Given** the cache service tests, **When** the TTL expires between writes and reads, **Then** the read returns undefined.
5. **Given** the cache service tests, **When** `maxSize` is exceeded, **Then** the oldest entry is evicted.

**Concretely**
- Test files (each link points at the file to be created; parent directories already exist except where noted):
  - `tests/unit/middleware/auth.test.ts` (new subdirectory: `tests/unit/middleware/`)
  - `tests/unit/cache/cacheService.test.ts` (new subdirectory: `tests/unit/cache/`)
  - `tests/unit/repositories/periodRepository.test.ts` (existing dir [tests/unit/repositories/](../../tests/unit/repositories/))
  - `tests/unit/repositories/programRepository.test.ts` (existing dir [tests/unit/repositories/](../../tests/unit/repositories/))
  - `tests/unit/utils/logger.test.ts` (existing dir [tests/unit/utils/](../../tests/unit/utils/))
- Follow the existing mocking convention: mock `googleSheetsDbClient`, never hit the real Sheets API (Constitution, Testing section).

---

### User Story 7 — One end-to-end test for the summer grade-bump (Priority: P3)

`userRepository` has unit tests for the grade-bump transform, but no test confirms that the bump flows all the way through to a parent-facing tab response. If someone deletes the `period` argument from a service call in the middle of the chain, no test will catch it.

**Why this priority**: Defensive against the highest-impact regression on the system.

**Independent Test**: An integration test calls `/api/parent/tabs/registration/summer` and asserts that returned students have grades incremented by one relative to their stored values.

**Acceptance Scenarios**:
1. **Given** a parent has a 3rd-grade student and a 6th-grade student in the mocked DB, **When** `/api/parent/tabs/registration/summer` is called, **Then** the response shows grades 4 and 7.
2. **Given** a parent has an 8th-grade student (the current `MAX_GRADE`), **When** `/api/parent/tabs/registration/summer` is called, **Then** that student does not appear in the response.
3. **Given** the same parent, **When** `/api/parent/tabs/registration/fall` is called, **Then** grades are unchanged.

**Concretely**
- New integration test at `tests/integration/summerGradeBump.test.ts` (its own file — the bump is conceptually separate from registration-controller tests).

---

### User Story 8 — Confirm the successor-spec handoff (Priority: P3)

Every audit finding that does not fit inside 015 has been routed to one of the five successor stub specs (016–020). This User Story is the cross-check: after 015 ships, verify that every audit finding still appears either as a closed item inside this spec or as a tracked item inside a successor stub.

The verification has a checked-in source of truth. The audit findings are curated into [findings.md](findings.md) (created as part of this User Story — see "Concretely" for the authoring rules). The routing table below maps each entry in `findings.md` to its owner spec. US8 closes when every row in `findings.md` has a matching row in the table AND every routing-table target spec addresses the routed item as a dedicated heading or bullet in its "Findings to address" section.

**Why this priority**: Integrity check that catches anything that fell through the cracks during 015's implementation, and produces an artifact that survives independent of chat context.

**Independent Test**: For each finding in [findings.md](findings.md), the routing table below contains a matching row, AND the spec that row points at addresses the finding as a dedicated heading or bullet in its "Findings to address" section. No finding is unrouted; no routed-to spec is missing its item.

**Acceptance Scenarios**:
1. **Given** [findings.md](findings.md), **When** each finding is matched against the routing table below, **Then** every finding has a routing-table row.
2. **Given** the routing table, **When** each "Routed to" entry is opened, **Then** the target spec addresses the finding as a dedicated heading or bullet in its "Findings to address" section, with enough context that a reader unfamiliar with the audit can act on it.
3. **Given** a future contributor asks "did we ever decide about the bus deadlines," **When** they grep, **Then** they find the row in [018-business-rules-to-config](../018-business-rules-to-config/spec.md) and know exactly where the decision will land.

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
| `authenticateByAccessCode` returns `{success:true, data:null}` on miss | 015 US3 (document the current frontend coupling) + [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md) (decide whether to redesign) |
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
- Create [findings.md](findings.md) in this spec directory. It is a curated, deduplicated list authored on this branch — NOT a verbatim chat paste. Format: one short heading per finding (e.g., `### Bus deadlines hardcoded`), a one-sentence summary, and a file:line reference. Errors in the original audit (notably the test-coverage subagent missing the nested test directories under `tests/unit/controllers/`, `tests/unit/services/`, `tests/unit/common/`, `tests/unit/infrastructure/`) are silently corrected before commit — `findings.md` reflects ground truth as of when it is written, not the chat artifact.
- The file's structure mirrors the US8 routing table: every routing-table row has a corresponding `findings.md` heading; every `findings.md` heading has a routing-table row. The two artifacts are kept in lockstep.
- Verify after authoring: every finding row in `findings.md` matches a routing-table row; every routing-table target spec addresses the routed item as a dedicated heading or bullet in its "Findings to address" section.
- If a finding is missing from a target spec, file it into the relevant successor stub before closing this User Story.
- No CI script. The convention plus the checked-in artifact is the contract — same enforcement model as the Postman collection (Constitution Testing section).

---

### Edge Cases

- **Doc PRs vs. code PRs.** US1 and US8 touch only Markdown. US2 touches Markdown plus [CONTRIBUTING.md](../../CONTRIBUTING.md). US3 edits `.ts` source files (inline doc comments only — no behavior change). US4, US5, US6, US7 touch executable code. Doc-only PRs go through normal review; PRs that touch `.ts` files (US3, US4, US5, US6, US7) MUST pass `npm run check:all` per NFR-003.
- **US2 + US1 collision.** If US2 ships before US1, then US1 just points at the new docs. If US1 ships first and the new docs don't exist yet, US1 should remove the dead links rather than leave them dangling — US2 can re-add them later.
- **US3 vs. 016.** US3 documents `userController.authenticateByAccessCode`'s `data: null` behavior. The clarifications session settled that this is a real frontend coupling (logout-on-401 contract in `HttpService`) — so US3 just writes that down. Whether the coupling is the right design at all is routed to [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md).
- **US6 auth tests revealing actual bugs.** Policy is defer-always: if a middleware test reveals that the auth ladder behaves differently from what the code looks like it should, pin the actual behavior in the test (with a comment explaining the discrepancy and any severity assessment) and open a new spec for the fix. US6 ships on coverage, not on fixes. If a finding feels critical at the moment of discovery, escalate it out of band — but the default is defer.
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
- **FR-009** — After US8 ships, [findings.md](findings.md) MUST exist in this spec directory and contain every audit finding from the 2026-05-30 audit; every finding in `findings.md` MUST have a row in the US8 routing table; every routing-table target spec MUST address the routed item as a dedicated heading or bullet in its "Findings to address" section, with enough context that a reader unfamiliar with the audit can act on it. No audit finding may be unrouted, and no chat-context dependency may survive.
- **FR-010** — After US2 ships, each of the three new docs MUST carry a "Maintenance contract" header naming the code surface area whose changes require updating the doc, and [CONTRIBUTING.md](../../CONTRIBUTING.md) MUST gain a Pre-Commit Checklist item enforcing that contract. This binds future PRs to keep the docs current without requiring tooling.

### Non-Functional Requirements
- **NFR-001** — No user-facing behavior change. Manual smoke test before each PR merge: log in as parent, log in as employee, switch users, register one lesson.
- **NFR-002** — No constitution amendments required. If the work in any User Story turns out to need one, stop and amend the constitution as a separate PR first.
- **NFR-003** — Every code-touching User Story MUST pass `npm run check:all` before merge (lint, typecheck, tests).
- **NFR-004** — Every doc-touching User Story MUST be reviewable by reading the rendered Markdown — no images, no external assets that aren't already in `docs/`.

## Success Criteria *(mandatory)*

This spec ships when all eight User Stories are merged. No escape hatch — User Stories cannot be moved to a successor spec to ship 015 early. The User Stories are deliberately small and independent so finishing all eight is achievable; if one becomes stuck, fix the blocker rather than carve it out.

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
