# Tasks: Audit Remediation

**Input**: Design documents from `/specs/015-audit-remediation/`
**Prerequisites**: spec.md, plan.md

**Tests**: This spec explicitly includes test work (US6 fills zero-coverage gaps; US7 adds one E2E test). Test tasks appear only in those phases — they are not generated for stories whose deliverables are documentation or interface relocation, per Constitution Principle I (no speculative scaffolding).

**Organization**: Tasks are grouped by user story. The spec's Dependencies section establishes that all eight User Stories are independent; the order in which their phases appear here matches the plan's recommended implementation order (US1 → US3 → US5 → US4 → US2 → US6 → US7 → US8) — a recommendation, not a requirement.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which User Story this task belongs to (US1–US8) — present on User Story phase tasks only
- All file paths are repo-root-relative

## Path Conventions

This is a web app with co-located backend and frontend under `src/`:
- Backend: `src/{controllers,services,repositories,middleware,cache,common,...}/`
- Frontend: `src/web/js/{main,core,tabs,components,data,auth,...}/`
- Tests: `tests/{unit,integration}/`
- Docs: `docs/technical/`, root-level `README.md` / `CONTRIBUTING.md` / `API_TESTING.md`
- Spec-local: `specs/015-audit-remediation/findings.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the working tree is ready. This spec adds zero dependencies, zero new tools, and zero new top-level directories — so Setup is intentionally minimal. Skipping it would be acceptable; the two tasks below exist to guarantee a clean baseline before any User Story PR.

- [X] T001 Confirm `npm run check:all` passes on the current branch baseline before any User Story work begins (lint + typecheck + tests, per [package.json](../../package.json) scripts).
- [X] T002 Confirm the branch is `015-audit-remediation` and the spec restructure commit (`1e16c289`) plus clarification commit (`6c72d82e`) are present in `git log`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: There are no shared blocking prerequisites for this spec. The eight User Stories are independent by design; nothing built in one is required by another (the recommended order is for *efficiency* of doc references, not correctness).

This phase is intentionally empty. Documenting it here so a fresh reader doesn't assume something is missing.

---

## Phase 3: User Story 1 — Stop sending readers to dead links (Priority: P1)

**Story goal**: Eliminate dead links and false endpoint claims in the entry-point docs ([README.md](../../README.md), [API_TESTING.md](../../API_TESTING.md), [docs/README.md](../../docs/README.md)) so a new contributor reading them gets only true information.

**Independent test criterion** (from spec): Every link resolves; every documented endpoint exists in [src/routes/api.ts](../../src/routes/api.ts); the README's version stamp matches `package.json` *or* has been removed.

- [X] T003 [US1] Audit every relative link in [README.md](../../README.md) and verify each target file exists; record which links are dead (expected: `docs/technical/ARCHITECTURE_COMPLETE.md`, `docs/technical/ARCHITECTURE.md`, `docs/technical/MIGRATION_SUMMARY.md`). Found 5 dead targets: the 3 spec-named architecture docs plus `docs/business/TECHNICAL_HOSTING_PROPOSAL.md` and `LICENSE` (root file claimed by the MIT license footer + badge but missing from the repo).
- [X] T004 [P] [US1] Audit every link in [docs/README.md](../../docs/README.md) and verify each target resolves (notably the constitution link → [.specify/memory/constitution.md](../../.specify/memory/constitution.md)). All links resolve; no edit needed.
- [X] T005 [P] [US1] Audit every endpoint mentioned in [API_TESTING.md](../../API_TESTING.md) against [src/routes/api.ts](../../src/routes/api.ts); record which are fabricated (expected: `/api/classes`, `/api/instructors`, `/api/parent/tabs/registration?parentId=P001`). All three confirmed fabricated.
- [X] T006 [US1] Edit [README.md](../../README.md) "API Overview" section to either list the real endpoints from [src/routes/api.ts](../../src/routes/api.ts) or replace it with a single pointer line ("see `docs/technical/API.md` for the API reference" — even if US2 hasn't shipped yet, the pointer is correct as soon as US2 lands). NOTE: T006 and T007 touch overlapping regions of README.md (the API Overview section sometimes contains the dead architecture-doc links T007 handles). Do T007 first OR fold T007's link removal into the same editing pass as T006 to avoid re-editing the same lines. Listed real endpoints by category (Public, Registration, Attendance, Feedback, Tab data, Admin only); the prior list pointed at six fabricated endpoints (`/api/authenticateByAccessCode`, `/api/getStudents`, `/api/getInstructors`, `/api/getAdmins`, `/api/getClasses`, `/api/attendance/summary/:id`) plus the dead `docs/generated/` pointer line — all gone.
- [X] T007 [US1] Edit [README.md](../../README.md) to remove or repoint the three dead architecture-doc references identified in T003. If US2 has shipped concurrently, point at `docs/technical/ARCHITECTURE.md`; otherwise remove the links. May be folded into T006's editing pass per the note above. Removed all three (since US2 hasn't shipped yet), plus the `TECHNICAL_HOSTING_PROPOSAL.md` link and the `LICENSE` click-through; replaced the System Architecture line and Documentation footer with forward-pointers to spec 015 US2 and the docs/ files that DO exist (NODE_SETUP, ENVIRONMENT_VARIABLES, VERSION_DISPLAY, BRANCH_PROTECTION, PRIVACY_POLICY). LICENSE file absence routed to [020-project-hygiene](../020-project-hygiene/spec.md) in a footnote.
- [X] T008 [US1] Edit [README.md](../../README.md) static version stamp ("Version: 1.1.15 | Last Updated: October 15, 2025"): either delete it entirely or replace with "see `package.json` for current version" (the build pipeline auto-increments `package.json`, so any static stamp will drift). Deleted the stamp; kept the `Node.js: 18+` line with a pointer to `package.json` for the current app version.
- [X] T009 [P] [US1] Edit [API_TESTING.md](../../API_TESTING.md) to replace the fabricated endpoint examples with either real endpoints from [src/routes/api.ts](../../src/routes/api.ts) OR replace the whole file with a one-paragraph pointer to the Postman collection at [scripts/postman/tonic-api.postman_collection.json](../../scripts/postman/tonic-api.postman_collection.json). Replaced the whole file with a pointer to the Postman collection + route definitions + future API.md, plus a note about the auth headers (the original file's "No authentication required for local development" claim was also false — auth middleware runs locally too).
- [X] T010 [P] [US1] If T004 found dead links in [docs/README.md](../../docs/README.md), edit to fix or remove them. No-op — all links resolved.
- [X] T011 [US1] Verify acceptance: re-walk every link in the three edited files; confirm zero 404s; grep every documented endpoint against [src/routes/api.ts](../../src/routes/api.ts); confirm every match. Mark US1 ready for PR. Zero dead links remaining; every endpoint mentioned in README matches a route definition in [src/routes/api.ts](../../src/routes/api.ts).
- [X] T012 [US1] Commit US1 changes as `docs: fix dead links in README, API_TESTING, docs/README` and open PR. Committed as `3201699d` with commit message `docs: fix dead links and fabricated endpoints in entry-point docs` (no PR opened — session mode is one commit per User Story, no PRs).

---

## Phase 4: User Story 3 — Inline doc comments at the four hotspots (Priority: P1)

**Story goal**: Add JSDoc blocks at the four "you will be surprised" hotspots so a reader can answer the listed question from the comment alone without stepping through the function body.

**Independent test criterion** (from spec): Each of the four sites has a doc comment answering its listed question; behavior unchanged (per NFR-001).

- [ ] T013 [P] [US3] Edit [src/repositories/userRepository.ts](../../src/repositories/userRepository.ts) — add JSDoc block on `getStudents(period)` and `getStudentById(id, period)` explaining that `period === 'summer'` triggers a runtime grade-bump (+1 to every student's grade, drops anyone over `MAX_GRADE`) and that the bump is never persisted; link to Constitution Principle IX.
- [ ] T014 [P] [US3] Edit [src/repositories/registrationRepository.ts](../../src/repositories/registrationRepository.ts) — add JSDoc block on `delete(id, deletedBy, trimester)` explaining that registrations live in per-trimester sheets so the base CRUD signature is intentionally extended, and that the `@ts-expect-error` is a deliberate LSP carve-out (not a bug) routed to [017-uniform-crud-completion](../017-uniform-crud-completion/spec.md) for the proper fix.
- [ ] T015 [P] [US3] Edit [src/controllers/userController.ts](../../src/controllers/userController.ts) — add JSDoc block on `authenticateByAccessCode` explaining the `{ success: true, data: null }`-on-miss contract: returning 401 would trigger `HttpService`'s logout-on-401 path ([src/web/js/data/httpService.ts](../../src/web/js/data/httpService.ts) `#onSessionExpired`), clearing localStorage and looping the login modal for a user who isn't logged in yet. Note the endpoint behaves as a lookup probe, not authenticate-or-fail, and that the redesign decision is routed to [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md).
- [ ] T016 [P] [US3] Edit [src/repositories/periodRepository.ts](../../src/repositories/periodRepository.ts) — add JSDoc block on the `getAll()` method (or wherever the read happens) explaining that the `periods` sheet is deliberately excluded from the 5-min cache in `googleSheetsDbClient` (see [src/database/googleSheetsDbClient.ts](../../src/database/googleSheetsDbClient.ts) lines 404–406) because a stale period would mis-route writes between trimesters.
- [ ] T017 [US3] Run `npm run check:all` and verify zero failures (the JSDoc edits are TypeScript-parsed; ESLint and TypeScript both validate).
- [ ] T018 [US3] Verify acceptance: read each of the four edited files; confirm the doc block answers the listed acceptance-scenario question on its own without requiring the reader to step through the function body. Mark US3 ready for PR.
- [ ] T019 [US3] Commit US3 changes as `docs(code): JSDoc the four audit-flagged hotspots` and open PR.

---

## Phase 5: User Story 5 — Uniform trimester validation in the registration controller (Priority: P2)

**Story goal**: Make `RegistrationController.deleteRegistration` validate its `:trimester` route param the same way `createRegistration` and `updateIntent` do, with a pinning test that prevents future regression.

**Independent test criterion** (from spec): All three methods validate via the same helper; an invalid trimester on `DELETE /registrations/:trimester/:id` produces the same error envelope as on `POST /registrations`.

- [ ] T020 [US5] Read [src/controllers/registrationController.ts](../../src/controllers/registrationController.ts) `createRegistration` and `updateIntent` to extract the exact `isValidTrimester()` invocation pattern, error class, and response shape they use today; this is the pattern `deleteRegistration` must match.
- [ ] T021 [US5] Edit [src/controllers/registrationController.ts](../../src/controllers/registrationController.ts) `deleteRegistration` — add `isValidTrimester()` validation at the same point in the request handler that `createRegistration` validates, using the same error class and response shape.
- [ ] T022 [US5] Add an integration test case in [tests/integration/registrationController.test.ts](../../tests/integration/registrationController.test.ts) that asserts `DELETE /registrations/not-a-real-trimester/abc-123` returns the same HTTP status, error envelope, and error code as `POST /registrations` with an invalid `trimester` in the body.
- [ ] T023 [US5] Run `npm run check:all`; verify the new test passes and all existing tests still pass.
- [ ] T024 [US5] Verify acceptance: grep the three trimester-accepting methods (`createRegistration`, `updateIntent`, `deleteRegistration`) — confirm the validation code paths look the same. Mark US5 ready for PR.
- [ ] T025 [US5] Commit US5 changes as `fix(registration): validate trimester in deleteRegistration` and open PR.

---

## Phase 6: User Story 4 — Canonical "authenticated user" type on the frontend (Priority: P2)

**Story goal**: Collapse the three inline `AuthenticatedUser`-equivalent interface declarations into one canonical interface exported from [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts) and imported by the three call sites.

**Independent test criterion** (from spec): One interface, three imports, `npm run typecheck` passes, manual smoke test (login parent → switch to admin) behaves identically.

- [ ] T026 [US4] Read [src/web/js/main.ts](../../src/web/js/main.ts) lines 61–69, [src/web/js/auth/loginModal.ts](../../src/web/js/auth/loginModal.ts) lines 14–22, and [src/web/js/core/baseTab.ts](../../src/web/js/core/baseTab.ts) lines 30–42 to enumerate the three current inline interface shapes; pick the union of fields (if any field is contested, pick the superset).
- [ ] T027 [US4] Edit [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts) — add and export a single `AuthenticatedUser` interface matching the union shape from T026.
- [ ] T028 [P] [US4] Edit [src/web/js/main.ts](../../src/web/js/main.ts) — remove the inline declaration; import `AuthenticatedUser` from `./auth/session.js`; update the variable that held the inline type.
- [ ] T029 [P] [US4] Edit [src/web/js/auth/loginModal.ts](../../src/web/js/auth/loginModal.ts) — remove the inline declaration; import `AuthenticatedUser` from `./session.js`.
- [ ] T030 [P] [US4] Edit [src/web/js/core/baseTab.ts](../../src/web/js/core/baseTab.ts) — keep the `SessionInfo` interface, but change its `user` field to reference the new `AuthenticatedUser` interface imported from `../auth/session.js`.
- [ ] T031 [US4] Run `npm run typecheck` (both `tsc --noEmit` and `tsc --noEmit -p tsconfig.web.json`); verify zero new errors.
- [ ] T032 [US4] Run `npm run check:all`; verify lint + tests still pass.
- [ ] T033 [US4] Manual smoke test in a local dev server (`npm run dev`): (a) log in as a parent and confirm the parent tabs load; (b) click "Change User", log in as an employee, confirm tab swap; (c) confirm no console errors. Behavior is identical to before.
- [ ] T034 [US4] Verify acceptance: (a) grep `interface AuthenticatedUser` — exactly one definition exists in [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts); (b) grep across `src/web/js/` for the field combination `accessCode` + `loginType` (the discriminating field combination of the audit-flagged inline shapes) and confirm every match is on the canonical interface or its imports, NOT on a parallel inline structural type. The audit-flagged shapes were anonymous/differently-named inline types, so the literal name grep alone is not sufficient. Mark US4 ready for PR.
- [ ] T035 [US4] Commit US4 changes as `refactor(frontend): one canonical AuthenticatedUser interface` and open PR.

---

## Phase 7: User Story 2 — Three reference docs that explain how the system actually works (Priority: P1)

**Story goal**: Produce `docs/technical/ARCHITECTURE.md`, `API.md`, and `FRONTEND.md`, plus a `CONTRIBUTING.md` checklist line enforcing their per-PR maintenance contract. After this ships, a fresh AI agent can answer all eight US2 acceptance-scenario questions from the docs alone.

**Independent test criterion** (from spec): A fresh AI agent given only the three new docs answers all eight US2 acceptance scenarios correctly.

This is the largest User Story. Tasks are grouped per doc; the three docs can be authored in parallel, but T036 (the routes-file walkthrough) feeds T040 (API.md), and the maintenance-contract addition is shared.

- [ ] T036 [US2] Walk [src/routes/api.ts](../../src/routes/api.ts) end-to-end and assemble a scratch list of the 16 endpoints (method, path, controller method called, `requireAuth`-or-public status). No durable artifact required — the list lives in the implementer's working memory or PR description scratchpad and is consumed by T040.
- [ ] T037 [P] [US2] Author `docs/technical/ARCHITECTURE.md`. Each topic below MUST be its own `##` heading (in this order), so future PRs can reference sections by heading and the maintenance contract has stable anchors: Maintenance contract (per FR-010); Layer flow (controller → service → repository → `googleSheetsDbClient`); Error & log pipeline (throw → `errorResponse` → `gcpLogger` → stdout JSON → Cloud Logging → 5xx Error Reporting via `@type`); Cache strategy (5-min in-memory, per-pod, periods excluded, full-flush on write); Authentication flow (localStorage `forte_auth_session` → `x-access-code`/`x-login-type` headers → ladder in [src/middleware/auth.ts](../../src/middleware/auth.ts) → logout-on-401/no-logout-on-403); Trimester & period model (four trimesters, four period types, `PeriodService.getEnrollmentTrimesterTable()`, summer grade-bump); DI container ([src/infrastructure/container/serviceContainer.ts](../../src/infrastructure/container/serviceContainer.ts), `ServiceKeys`); Build & deploy (Dockerfile, cloudbuild.yaml, version-manager, GitHub workflows); Migrations ([src/infrastructure/migration/migrationRunner.ts](../../src/infrastructure/migration/migrationRunner.ts)).
- [ ] T038 [P] [US2] Author `docs/technical/FRONTEND.md`. Each topic below MUST be its own `##` heading (in this order): Maintenance contract (per FR-010); Bootstrap order ([src/web/js/main.ts](../../src/web/js/main.ts) — version → config → auto-login → TabController → tab registration); `BaseTab<TData>` lifecycle (`onLoad → fetchData → render → attachEventListeners`, `AbortController`, `isLoaded`); `HttpService` contract (returns `HttpResult<T>`, never throws, single `fetch()` at line 84); Session & Change-User flow (`AccessCodeManager`, `UserSession`, `TabController.cleanup()` on every tab); Shared model serving (prod Express static; dev Vite aliases in [vite.config.ts](../../vite.config.ts)); Registration form architecture (parent cascading-filter-chips vs admin linear); reference to the canonical `AuthenticatedUser` interface produced by US4 (link forward to [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts) if US4 has shipped, or link forward to US4 in the spec if not).
- [ ] T039 [P] [US2] Author the `docs/technical/API.md` skeleton. Each topic below MUST be its own `##` heading (in this order): Maintenance contract (per FR-010); Request/response envelope (Constitution Principle IV); Public endpoints (`/health`, `/version`, `/configuration`, `/auth/access-code`); Authenticated endpoints — body filled by T040 with one `###` heading per endpoint.
- [ ] T040 [US2] Fill in `docs/technical/API.md` body — one `###` subsection per endpoint under the appropriate `##` (Public endpoints / Authenticated endpoints) per T036's list. For each endpoint: method, path, auth requirement, request shape, response shape (use the controller's actual response payload).
- [ ] T041 [US2] Edit [CONTRIBUTING.md](../../CONTRIBUTING.md) — add a Pre-Commit Checklist item: "Did your change affect anything documented in `docs/technical/ARCHITECTURE.md`, `API.md`, or `FRONTEND.md`? If yes, update the relevant doc in this PR."
- [ ] T042 [US2] Verify FR-003 topic coverage: for each of the three new docs, walk its `##` heading list against the corresponding "Concretely" bullet list in [spec.md](spec.md) US2 (ARCHITECTURE.md against the ARCHITECTURE Concretely list; API.md against the API Concretely list; FRONTEND.md against the FRONTEND Concretely list). Every Concretely bullet MUST have a matching `##` heading. If any bullet has no heading, the default action is to author the missing section. Dropping a topic is a spec-level change and requires editing [spec.md](spec.md) US2's Concretely list AND adding a Clarifications-session bullet documenting the decision — NOT just a PR-description note. Defer the merge until both edits land.
- [ ] T043 [US2] Verify acceptance: hand a fresh reader (human or AI in a clean session) only the three new docs and ask the eight US2 acceptance-scenario questions. All eight answered correctly. If any fails, edit the relevant doc and re-test.
- [ ] T044 [US2] Verify FR-010: each doc carries a "Maintenance contract" header naming its code surface area; `CONTRIBUTING.md` checklist line is present. Mark US2 ready for PR.
- [ ] T045 [US2] Commit US2 changes as `docs: add ARCHITECTURE, API, FRONTEND reference docs + CONTRIBUTING maintenance contract` and open PR.

---

## Phase 8: User Story 6 — Tests for the four genuinely-untested files (Priority: P2)

**Story goal**: Add unit test coverage for the five actually-zero-coverage files identified by the recursive audit: [src/middleware/auth.ts](../../src/middleware/auth.ts), [src/cache/cacheService.ts](../../src/cache/cacheService.ts), [src/repositories/periodRepository.ts](../../src/repositories/periodRepository.ts), [src/repositories/programRepository.ts](../../src/repositories/programRepository.ts), [src/utils/logger.ts](../../src/utils/logger.ts).

**Independent test criterion** (from spec): Each of the five files has a test file; `npm run test:unit` passes; `npm run test:coverage` shows nonzero coverage for each.

**Defer-always policy**: If a test reveals an apparent bug, pin the actual behavior in the test (with a comment explaining the discrepancy and a severity assessment) and open a new spec for the fix. US6 ships on coverage, not on fixes. Critical findings may be escalated out of band, but the default is defer.

- [ ] T046 [P] [US6] Create new directory `tests/unit/middleware/`. Author `tests/unit/middleware/auth.test.ts` exercising [src/middleware/auth.ts](../../src/middleware/auth.ts). Mock `googleSheetsDbClient`. Cover the auth ladder: (a) 10-digit numeric `accessCode` → parent phone lookup; (b) 6-digit numeric → employee access code; (c) explicit `x-login-type` header overrides the heuristic (pin whichever behavior the code actually exhibits and explain in a comment per the defer-always policy); (d) invalid code → `req.currentUser` ends `null`. **Default action on any discovered bug is defer** — pin the actual behavior in the test with a comment, route the fix to a new spec, and merge US6. The Edge Cases section's escalate-out-of-band hatch exists for findings the implementer judges critical at the moment of discovery; it does NOT override the defer-always policy automatically. Escalation triggers human review of the policy carve-out, not an in-PR fix.
- [ ] T047 [P] [US6] Create new directory `tests/unit/cache/`. Author `tests/unit/cache/cacheService.test.ts` exercising [src/cache/cacheService.ts](../../src/cache/cacheService.ts). Cover: (a) read after TTL expires returns `undefined`; (b) `maxSize` exceeded → oldest entry evicted; (c) explicit clear empties the cache.
- [ ] T048 [P] [US6] Author `tests/unit/repositories/periodRepository.test.ts` exercising [src/repositories/periodRepository.ts](../../src/repositories/periodRepository.ts). Mock `googleSheetsDbClient`. Cover: (a) `getAll()` returns the rows the mock provides; (b) cache-skip behavior — periods are read live every call.
- [ ] T049 [P] [US6] Author `tests/unit/repositories/programRepository.test.ts` exercising [src/repositories/programRepository.ts](../../src/repositories/programRepository.ts). Mock `googleSheetsDbClient`. Cover its public methods (`getClasses`, `getClassById` per the audit map).
- [ ] T050 [P] [US6] Author `tests/unit/utils/logger.test.ts` exercising [src/utils/logger.ts](../../src/utils/logger.ts). Cover log-level routing logic — at minimum, `info` vs `warn` vs `error` vs `debug` get routed to the corresponding console method or short-circuit per configured level.
- [ ] T051 [US6] Run `npm run test:unit`; verify all new and existing tests pass.
- [ ] T052 [US6] Run `npm run test:coverage` and confirm nonzero coverage for each of the five files added in T046–T050.
- [ ] T053 [US6] Verify acceptance: tests follow the existing mocking convention (mock `googleSheetsDbClient`, never hit the real Sheets API). If T046 surfaced an apparent auth-ladder bug, confirm it's pinned-with-comment per the defer-always policy and a successor spec has been opened (or noted for opening). Mark US6 ready for PR.
- [ ] T054 [US6] Commit US6 changes as `test: cover auth middleware, cacheService, periodRepository, programRepository, logger` and open PR.

---

## Phase 9: User Story 7 — One end-to-end test for the summer grade-bump (Priority: P3)

**Story goal**: Add one integration test that confirms the summer grade-bump flows from controller through service through repository to the parent-facing tab response, so that future deletions of the `period` argument in the middle of the chain are caught.

**Independent test criterion** (from spec): `/api/parent/tabs/registration/summer` returns students with grades incremented by one relative to their stored values; an 8th-grade student (`MAX_GRADE`) is dropped; `/api/parent/tabs/registration/fall` leaves grades unchanged.

- [ ] T055 [US7] Author `tests/integration/summerGradeBump.test.ts` using Supertest against the Express app, mocking `googleSheetsDbClient` (per the existing convention in [tests/integration/registrationController.test.ts](../../tests/integration/registrationController.test.ts)).
- [ ] T056 [US7] In `tests/integration/summerGradeBump.test.ts`, write fixture data: a parent with at least three students at grades 3, 6, and 8 (`MAX_GRADE`). Use mocked fixture data, NOT seeded prod-shape data.
- [ ] T057 [US7] Add three test cases — two from the spec's US7 acceptance scenarios and one defensive case (clearly labeled as such in the test name, e.g., `'defensive: parent with no students'`): (a) `GET /api/parent/tabs/registration/summer` for a parent with students at grades 3, 6, 8 → returns grades 4 and 7, the 8-grader is absent (spec AS#1 + AS#2 combined); (b) the same call for `/fall` → grades unchanged (spec AS#3); (c) defensive-beyond-spec: `GET /api/parent/tabs/registration/summer` for a parent with NO students → empty list, no errors. The defensive case is an editorial addition; it doesn't change the spec's contract but it does guard against a null-handling regression.
- [ ] T058 [US7] Run `npm run test:integration` (or `npm run test`) — verify the new test passes; run the full suite to confirm no regressions.
- [ ] T059 [US7] Verify acceptance: all three test cases pass; assertions match the spec wording; behavior unchanged. Mark US7 ready for PR.
- [ ] T060 [US7] Commit US7 changes as `test(integration): pin summer grade-bump end-to-end` and open PR.

---

## Phase 10: User Story 8 — Confirm the successor-spec handoff (Priority: P3)

**Story goal**: Produce a checked-in `specs/015-audit-remediation/findings.md` listing every audit finding, then verify that the routing table in [spec.md](spec.md) matches `findings.md` row-for-row and that every routed-to successor stub addresses its routed item as a dedicated heading or bullet in its "Findings to address" section.

**Independent test criterion** (from spec/FR-009): `findings.md` exists; every finding in it has a row in the US8 routing table; every routing-table target spec addresses the routed item with enough context that a reader unfamiliar with the audit can act on it.

- [ ] T061 [US8] Author `specs/015-audit-remediation/findings.md`. Format: one short heading per finding (e.g., `### Bus deadlines hardcoded`), one-sentence summary, file:line reference. Curated and deduplicated — NOT a verbatim chat paste. Silently correct any errors from the original audit conversation (notably the test-coverage subagent missed the nested test directories under `tests/unit/{controllers,services,common,infrastructure}/`).
- [ ] T062 [US8] Cross-walk `findings.md` against the US8 routing table in [spec.md](spec.md): every finding heading must have a matching routing-table row, and every routing-table row must correspond to a finding heading. Edit either artifact to bring them into lockstep.
- [ ] T063 [US8] For each routing-table target spec, open it and verify the routed item appears as a dedicated heading or bullet in its "Findings to address" section with enough context that a reader unfamiliar with the audit can act on it. Specs to check: [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md), [017-uniform-crud-completion](../017-uniform-crud-completion/spec.md), [018-business-rules-to-config](../018-business-rules-to-config/spec.md), [019-frontend-test-infrastructure](../019-frontend-test-infrastructure/spec.md), [020-project-hygiene](../020-project-hygiene/spec.md).
- [ ] T064 [US8] If T063 found any successor stub missing a routed item, edit that stub's "Findings to address" section to add the item per the heading-or-bullet bar.
- [ ] T065 [US8] Verify acceptance: re-walk T062 and T063 once more after any T064 edits; confirm zero gaps. Mark US8 ready for PR.
- [ ] T066 [US8] Commit US8 changes as `docs(specs): add findings.md and verify audit routing across 015-020` and open PR. If T064 edited any successor stub, include those edits in the same PR (they are scoped to closing the routing-table contract).

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Once all eight User Stories have shipped, confirm the spec's overall success condition.

- [ ] T067 Run the "fresh AI agent" test from the spec's Success Criteria: hand a new agent (clean session) the project, the constitution, and the three new reference docs (`docs/technical/ARCHITECTURE.md`, `API.md`, `FRONTEND.md`). Ask the eight questions from US2's acceptance scenarios. All eight must be answered correctly using only the docs (no source code lookup). If any fails, open a follow-up doc-fix PR — do NOT mark 015 closed.
- [ ] T068 Confirm `npm run check:all` passes on the merged branch after all eight User Stories have landed.
- [ ] T069 Update [.claude/CLAUDE.md](../../.claude/CLAUDE.md) `## Recent Changes` section specifically (NOT the `## Active Technologies` section, which was auto-maintained by `update-agent-context.sh` during `/speckit.plan`) to add a one-line `015-audit-remediation:` entry. The section is currently stale (only 002 listed); this top-up scopes to 015's own visibility, with the broader staleness fix routed to 020.
- [ ] T070 Mark [spec.md](spec.md) status `Implemented` (from `Draft`) when all User Story PRs have merged.

---

## Dependencies & Execution Order

### User Story dependencies

All eight User Stories are **independent** per the spec's Dependencies section. None blocks another for correctness. The recommended execution order (US1 → US3 → US5 → US4 → US2 → US6 → US7 → US8) is for *efficiency* of doc references — e.g., US2 benefits from US1, US3, US4 having landed first so the docs reference the cleaned-up code — but is not a binding requirement.

Two soft couplings worth noting (covered by the spec's Edge Cases):

- **US2 ↔ US1**: If US1 ships first, US1 removes dead links; if US2 ships first, US1 repoints to the new docs. Neither blocks the other.
- **US2 ↔ US4**: US2's acceptance scenario 8 ("what's the single source of truth on the current user") points at US4's `AuthenticatedUser`. If US2 ships first, the doc names the planned interface and links forward to US4.

### Parallel execution opportunities

Within each User Story phase, tasks marked `[P]` can run in parallel:
- **US1**: T004, T005, T009, T010 can run in parallel after T003.
- **US3**: T013, T014, T015, T016 can run in parallel (four independent file edits).
- **US4**: T028, T029, T030 can run in parallel after T027.
- **US2**: T037, T038, T039 (three doc authoring tasks) can run in parallel after T036; T040 follows T039.
- **US6**: T046, T047, T048, T049, T050 (five test files) can run in parallel.

Across User Stories: All eight User Story phases (3 through 10) are themselves parallel candidates if multiple contributors are working concurrently — they touch disjoint files in nearly every case (the only overlap is potential US2/US1 coordination on README links, handled by the soft coupling above).

---

## Independent Test Criteria Summary

| Story | Independent test (spec) |
|---|---|
| US1 | Every link in README/API_TESTING/docs-README resolves; every documented endpoint exists in routes file; version stamp matches package.json or removed. |
| US2 | A fresh AI agent given only the three new docs answers all eight US2 acceptance scenarios correctly. |
| US3 | Each of the four sites has a doc comment that lets a reader answer the listed question without reading the function body. |
| US4 | Exactly one `AuthenticatedUser` interface; three call sites import it; `npm run typecheck` passes; manual smoke unchanged. |
| US5 | All three trimester-accepting methods validate the same way; invalid trimester on DELETE matches POST's error envelope. |
| US6 | Each of the five zero-coverage files has a test; `npm run test:unit` passes; `npm run test:coverage` shows nonzero per file. |
| US7 | Summer grade-bump verified end-to-end; 8th-grader dropped; fall unchanged. |
| US8 | `findings.md` exists; every finding has a routing-table row; every successor stub addresses its routed item. |

---

## Implementation Strategy

**MVP scope**: The spec explicitly forbids partial shipping (Success Criteria: "No escape hatch — User Stories cannot be moved to a successor spec to ship 015 early"). There is no MVP-vs-extended split — all eight User Stories must merge for 015 to close.

**Incremental delivery**: Each User Story is its own PR; each PR leaves the project better than it found it. The recommended order (above) lets the cheapest, lowest-risk PRs (US1, US3, US5) ship first, building trust before US2 (the largest single PR).

**Per-PR gates**:
- All PRs that touch `.ts` files (US3, US4, US5, US6, US7) MUST pass `npm run check:all` (NFR-003).
- All PRs MUST preserve user-facing behavior (NFR-001) — verified via the manual smoke test enumerated in NFR-001 (login parent, login employee, switch users, register one lesson).
- Doc-only PRs (US1, US2's Markdown deliverables, US8) MUST be reviewable as rendered Markdown (NFR-004) — no images, no external assets.
- If any User Story turns out to need a constitution amendment, stop and amend the constitution in a separate PR first (NFR-002).

**Total task count**: 70 tasks across 11 phases.

**Task count per User Story**:
- US1 (Phase 3): 10 tasks
- US3 (Phase 4): 7 tasks
- US5 (Phase 5): 6 tasks
- US4 (Phase 6): 10 tasks
- US2 (Phase 7): 10 tasks
- US6 (Phase 8): 9 tasks
- US7 (Phase 9): 6 tasks
- US8 (Phase 10): 6 tasks
- Setup + Foundational + Polish: 6 tasks (T001–T002, T067–T070)
