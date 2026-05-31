# Tasks: Audit Remediation

**Input**: Design documents from `/specs/015-audit-remediation/`
**Prerequisites**: spec.md, plan.md

**Tests**: This spec explicitly includes test work (US6 fills zero-coverage gaps; US7 adds one E2E test). Test tasks appear only in those phases — they are not generated for stories whose deliverables are documentation or interface relocation, per Constitution Principle I (no speculative scaffolding).

**Organization**: Tasks are grouped by user story. The spec's Dependencies section establishes that all nine User Stories are independent; the order in which their phases appear here matches the plan's recommended implementation order (US1 → US3 → US5 → US4 → US9 → US6 → US7 → US2 → US8) — a recommendation, not a requirement. The recommended order puts source/test work first and documentation work last so the docs converge on the project's actual final state in one pass.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which User Story this task belongs to (US1–US9) — present on User Story phase tasks only
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

**Purpose**: There are no shared blocking prerequisites for this spec. The nine User Stories are independent by design; nothing built in one is required by another (the recommended order is for *coherence of documentation*, not correctness).

This phase is intentionally empty. Documenting it here so a fresh reader doesn't assume something is missing.

---

## Phase 3: User Story 1 — Stop sending readers to dead links (Priority: P1)

**Story goal**: Eliminate dead links and false endpoint claims in the entry-point docs ([README.md](../../README.md), [API_TESTING.md](../../API_TESTING.md), [docs/README.md](../../docs/README.md)) so a new contributor reading them gets only true information.

**Independent test criterion** (from spec): Every link resolves; every documented endpoint exists in [src/routes/api.ts](../../src/routes/api.ts); the README's version stamp matches `package.json` *or* has been removed.

- [X] T003 [US1] Audit every relative link in [README.md](../../README.md) and verify each target file exists; record which links are dead. Found 5 dead targets: three architecture docs that don't exist, plus `docs/business/TECHNICAL_HOSTING_PROPOSAL.md` and `LICENSE` (root file claimed by the MIT license footer + badge but missing from the repo).
- [X] T004 [P] [US1] Audit every link in [docs/README.md](../../docs/README.md) and verify each target resolves. All links resolve; no edit needed.
- [X] T005 [P] [US1] Audit every endpoint mentioned in [API_TESTING.md](../../API_TESTING.md) against [src/routes/api.ts](../../src/routes/api.ts); record which are fabricated. All three (`/api/classes`, `/api/instructors`, `/api/parent/tabs/registration?parentId=P001`) confirmed fabricated.
- [X] T006 [US1] Edit [README.md](../../README.md) "API Overview" section: replaced six fabricated endpoints with the real endpoint catalog from [src/routes/api.ts](../../src/routes/api.ts), organized by category.
- [X] T007 [US1] Edit [README.md](../../README.md) to remove dead architecture-doc references. Removed all five dead links plus the dead `LICENSE` click-through. Forward-references to future work were added in the original implementation; those are speckit-lineage violations that US9 will sweep.
- [X] T008 [US1] Edit [README.md](../../README.md) static version stamp: deleted ("Version: 1.1.15 | Last Updated: October 15, 2025"); kept the `Node.js: 18+` line with a pointer to `package.json`.
- [X] T009 [P] [US1] Edit [API_TESTING.md](../../API_TESTING.md): replaced the whole file with a pointer to the Postman collection + route definitions + future API.md, plus a note about auth headers (corrects the original false "No authentication required for local development" claim).
- [X] T010 [P] [US1] No-op — `docs/README.md` had no dead links.
- [X] T011 [US1] Verify acceptance: zero dead relative links remaining; every endpoint mentioned in README matches a route definition in [src/routes/api.ts](../../src/routes/api.ts).
- [X] T012 [US1] Commit US1 changes. Committed as `3201699d` with a follow-up `d55d0312` covering factual drift fixes (vanilla JS → TypeScript, ViewModel removal, service/repo counts). The README forward-references and routed-to-spec mentions introduced here are speckit-lineage tech debt that US9 sweeps.

---

## Phase 4: User Story 3 — Inline doc comments at the four hotspots (Priority: P1)

**Story goal**: Add JSDoc blocks at the four "you will be surprised" hotspots so a reader can answer the listed question from the comment alone without stepping through the function body.

**Independent test criterion** (from spec): Each of the four sites has a doc comment answering its listed question; behavior unchanged (per NFR-001).

- [X] T013 [P] [US3] Edit [src/repositories/userRepository.ts](../../src/repositories/userRepository.ts) `getStudents(period)` and `getStudentById(id, period)` doc blocks: extended both with the +1 summer grade-bump, MAX_GRADE drop, persist-no rule, and cache ordering rationale.
- [X] T014 [P] [US3] Edit [src/repositories/registrationRepository.ts](../../src/repositories/registrationRepository.ts) `delete()` doc block: replaced existing two-line comment with a detailed block explaining the four per-trimester sheets and why the `@ts-expect-error` is intentional.
- [X] T015 [P] [US3] Edit [src/controllers/userController.ts](../../src/controllers/userController.ts) `authenticateByAccessCode` doc block: replaced misleading "required for frontend compatibility" comment with the actual coupling (`HttpService` logout-on-401 path would loop the login modal).
- [X] T016 [P] [US3] Edit [src/repositories/periodRepository.ts](../../src/repositories/periodRepository.ts) `getAll()` doc block: replaced "Get all periods" one-liner with the cache-skip + write-routing rationale.
- [X] T017 [US3] `npm run check:all` after edits: 46 suites / 774 tests pass; no lint or typecheck errors.
- [X] T018 [US3] Acceptance verified: all four blocks answer their question standalone.
- [X] T019 [US3] Commit US3 changes. Committed as `d83de99e`. The blocks contain spec-number and Constitution-Principle references that are speckit-lineage tech debt — US9 sweeps them.

---

## Phase 5: User Story 5 — Uniform trimester validation in the registration controller (Priority: P2)

**Story goal**: Make `RegistrationController.deleteRegistration` validate its `:trimester` route param the same way `createRegistration` and `updateIntent` do, with a pinning test that prevents future regression.

**Independent test criterion** (from spec): All three methods validate via the same helper; an invalid trimester on `DELETE /registrations/:trimester/:id` produces the same error envelope as on `POST /registrations`.

- [ ] T020 [US5] Read [src/controllers/registrationController.ts](../../src/controllers/registrationController.ts) `createRegistration` and `updateIntent` to extract the exact `isValidTrimester()` invocation pattern, error class, and response shape they use today; this is the pattern `deleteRegistration` must match.
- [ ] T021 [US5] Edit [src/controllers/registrationController.ts](../../src/controllers/registrationController.ts) `deleteRegistration` — add `isValidTrimester()` validation at the same point in the request handler that `createRegistration` validates, using the same error class and response shape.
- [ ] T022 [US5] Add an integration test case in [tests/integration/registrationController.test.ts](../../tests/integration/registrationController.test.ts) that asserts `DELETE /registrations/not-a-real-trimester/abc-123` returns the same HTTP status, error envelope, and error code as `POST /registrations` with an invalid `trimester` in the body.
- [ ] T023 [US5] Run `npm run check:all`; verify the new test passes and all existing tests still pass.
- [ ] T024 [US5] Verify acceptance: grep the three trimester-accepting methods (`createRegistration`, `updateIntent`, `deleteRegistration`) — confirm the validation code paths look the same. Mark US5 ready for commit.
- [ ] T025 [US5] Commit US5 changes as `fix(registration): validate trimester in deleteRegistration`.

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
- [ ] T034 [US4] Verify acceptance: (a) grep `interface AuthenticatedUser` — exactly one definition exists in [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts); (b) grep across `src/web/js/` for the field combination `accessCode` + `loginType` (the discriminating field combination of the audit-flagged inline shapes) and confirm every match is on the canonical interface or its imports, NOT on a parallel inline structural type. Mark US4 ready for commit.
- [ ] T035 [US4] Commit US4 changes as `refactor(frontend): one canonical AuthenticatedUser interface`.

---

## Phase 7: User Story 9 — Speckit-lineage sweep (Constitution Principle XII compliance) (Priority: P2)

**Story goal**: Sweep every non-speckit file for references to specs, FRs, NFRs, Constitution Principles, and User Stories. After this ships, the four acceptance grep patterns return zero matches outside `specs/`, `.specify/`, and `.claude/`.

**Independent test criterion** (from spec): The four grep patterns return zero hits in `src/`, `tests/`, `docs/`, and root-level shipped files.

**Approach**: Each violation falls into one of three buckets. (a) Citation adjacent to a meaningful statement → drop the citation, keep the statement. (b) Citation IS the statement → replace with the underlying rule stated directly. (c) Forward-pointer to future work → drop entirely.

- [ ] T036 [US9] Pre-sweep audit: produce a grep-based inventory of every violation site. Run each of: `grep -rn "FR-[0-9]" src/ tests/ docs/ README.md CONTRIBUTING.md API_TESTING.md`, `grep -rn "Constitution Principle" src/ tests/ docs/ README.md CONTRIBUTING.md API_TESTING.md`, `grep -rn "spec [0-9]\|specs/[0-9]" src/ tests/ docs/ README.md CONTRIBUTING.md API_TESTING.md`, `grep -rn "User Story\b" src/ tests/ docs/ README.md CONTRIBUTING.md API_TESTING.md`. Capture the union as a working scratch list.
- [ ] T037 [US9] Sweep `src/**/*.ts` for speckit references — including pre-existing FR-XXX from 014's implementation work, and the spec 016 / spec 017 / Constitution Principle IX references introduced by 015's US3 commit (`d83de99e`). Rewrite each per the (a)/(b)/(c) approach above. Pay particular attention to runtime-visible strings (e.g., the `throw new Error('...FR-003...')` message in `userRepository.getStudents`) — those get rewritten too. NFR-001 covers user-facing behavior; developer-facing error messages are in scope here.
- [ ] T038 [US9] Sweep `tests/**/*.ts` for speckit references — test names, describe blocks, comments.
- [ ] T039 [US9] Sweep `docs/**/*.md` for speckit references — strip from existing files (does not include US2's not-yet-written docs).
- [ ] T040 [US9] Sweep root-level shipped Markdown — [README.md](../../README.md), [CONTRIBUTING.md](../../CONTRIBUTING.md), [API_TESTING.md](../../API_TESTING.md). Includes the forward-references and routed-to-spec mentions that US1 left in README.md and API_TESTING.md (commit `d55d0312`) — drop them entirely; US2 writes the real replacements later.
- [ ] T041 [US9] Sweep build/CI files and scripts: `src/build/*`, `.github/workflows/*`, `scripts/**`, `package.json` (the scripts section, if any cite specs). Most likely clean but verify.
- [ ] T042 [US9] Run `npm run check:all`; verify all 46 suites and 774 tests still pass. The sweep is comment/string-only and must not change behavior.
- [ ] T043 [US9] Verify acceptance: re-run the four grep patterns from T036 — every one returns zero matches in the swept directories. The constitution itself (`.specify/memory/constitution.md`) and `.claude/CLAUDE.md` are exempt.
- [ ] T044 [US9] Commit US9 changes as `refactor: sweep speckit lineage from shipped artifact (Constitution Principle XII)`.

---

## Phase 8: User Story 6 — Tests for the four genuinely-untested files (Priority: P2)

**Story goal**: Add unit test coverage for the five actually-zero-coverage files identified by the recursive audit: [src/middleware/auth.ts](../../src/middleware/auth.ts), [src/cache/cacheService.ts](../../src/cache/cacheService.ts), [src/repositories/periodRepository.ts](../../src/repositories/periodRepository.ts), [src/repositories/programRepository.ts](../../src/repositories/programRepository.ts), [src/utils/logger.ts](../../src/utils/logger.ts).

**Independent test criterion** (from spec): Each of the five files has a test file; `npm run test:unit` passes; `npm run test:coverage` shows nonzero coverage for each.

**Defer-always policy**: If a test reveals an apparent bug, pin the actual behavior in the test (with a comment explaining the discrepancy and a severity assessment) and open a new spec for the fix. US6 ships on coverage, not on fixes. Critical findings may be escalated out of band, but the default is defer.

- [ ] T045 [P] [US6] Create new directory `tests/unit/middleware/`. Author `tests/unit/middleware/auth.test.ts` exercising [src/middleware/auth.ts](../../src/middleware/auth.ts). Mock `googleSheetsDbClient`. Cover the auth ladder: (a) 10-digit numeric access code → parent phone lookup; (b) 6-digit numeric → employee access code; (c) explicit `x-login-type` header override behavior (pin whichever behavior the code actually exhibits and explain in a comment per the defer-always policy); (d) invalid code → `req.currentUser` ends `null`. **Default action on any discovered bug is defer** — pin the actual behavior in the test with a comment, route the fix to a new spec, and merge US6. The Edge Cases section's escalate-out-of-band hatch exists for findings the implementer judges critical at the moment of discovery; it does NOT override the defer-always policy automatically. Escalation triggers human review of the policy carve-out, not an in-PR fix.
- [ ] T046 [P] [US6] Create new directory `tests/unit/cache/`. Author `tests/unit/cache/cacheService.test.ts` exercising [src/cache/cacheService.ts](../../src/cache/cacheService.ts). Cover: (a) read after TTL expires returns `undefined`; (b) `maxSize` exceeded → oldest entry evicted; (c) explicit clear empties the cache.
- [ ] T047 [P] [US6] Author `tests/unit/repositories/periodRepository.test.ts` exercising [src/repositories/periodRepository.ts](../../src/repositories/periodRepository.ts). Mock `googleSheetsDbClient`. Cover: (a) `getAll()` returns the rows the mock provides; (b) cache-skip behavior — periods are read live every call.
- [ ] T048 [P] [US6] Author `tests/unit/repositories/programRepository.test.ts` exercising [src/repositories/programRepository.ts](../../src/repositories/programRepository.ts). Mock `googleSheetsDbClient`. Cover its public methods (`getClasses`, `getClassById` per the audit map).
- [ ] T049 [P] [US6] Author `tests/unit/utils/logger.test.ts` exercising [src/utils/logger.ts](../../src/utils/logger.ts). Cover log-level routing logic — at minimum, `info` vs `warn` vs `error` vs `debug` get routed to the corresponding console method or short-circuit per configured level.
- [ ] T050 [US6] Run `npm run test:unit`; verify all new and existing tests pass.
- [ ] T051 [US6] Run `npm run test:coverage` and confirm nonzero coverage for each of the five files added in T045–T049.
- [ ] T052 [US6] Verify acceptance: tests follow the existing mocking convention (mock `googleSheetsDbClient`, never hit the real Sheets API). If T045 surfaced an apparent auth-ladder bug, confirm it's pinned-with-comment per the defer-always policy and a successor spec has been opened (or noted for opening). Mark US6 ready for commit. NOTE: test names and describe blocks must obey Constitution Principle XII — no speckit references in test code.
- [ ] T053 [US6] Commit US6 changes as `test: cover auth middleware, cacheService, periodRepository, programRepository, logger`.

---

## Phase 9: User Story 7 — One end-to-end test for the summer grade-bump (Priority: P3)

**Story goal**: Add one integration test that confirms the summer grade-bump flows from controller through service through repository to the parent-facing tab response, so that future deletions of the `period` argument in the middle of the chain are caught.

**Independent test criterion** (from spec): `/api/parent/tabs/registration/summer` returns students with grades incremented by one relative to their stored values; an 8th-grade student is dropped; `/api/parent/tabs/registration/fall` leaves grades unchanged.

- [ ] T054 [US7] Author `tests/integration/summerGradeBump.test.ts` using Supertest against the Express app, mocking `googleSheetsDbClient` (per the existing convention in [tests/integration/registrationController.test.ts](../../tests/integration/registrationController.test.ts)). NOTE: test names, describe blocks, and comments must obey Constitution Principle XII — no speckit references.
- [ ] T055 [US7] In `tests/integration/summerGradeBump.test.ts`, write fixture data: a parent with at least three students at grades 3, 6, and 8 (the current MAX_GRADE). Use mocked fixture data, NOT seeded prod-shape data.
- [ ] T056 [US7] Add three test cases: (a) `GET /api/parent/tabs/registration/summer` for a parent with students at grades 3, 6, 8 → returns grades 4 and 7, the 8-grader is absent; (b) the same call for `/fall` → grades unchanged; (c) a defensive case clearly labeled as such (e.g., `'defensive: parent with no students'`): `GET /api/parent/tabs/registration/summer` for a parent with NO students → empty list, no errors.
- [ ] T057 [US7] Run `npm run test:integration` (or `npm run test`) — verify the new test passes; run the full suite to confirm no regressions.
- [ ] T058 [US7] Verify acceptance: all three test cases pass; assertions match the spec wording; behavior unchanged. Mark US7 ready for commit.
- [ ] T059 [US7] Commit US7 changes as `test(integration): pin summer grade-bump end-to-end`.

---

## Phase 10: User Story 2 — Three reference docs that explain how the system actually works (Priority: P1)

**Story goal**: Produce `docs/technical/ARCHITECTURE.md`, `API.md`, and `FRONTEND.md`, plus a `CONTRIBUTING.md` checklist line enforcing their per-PR maintenance contract. Also clean up the entry-point doc forward-references US1 left behind. After this ships, a fresh AI agent can answer all eight US2 acceptance-scenario questions from the docs alone, and the entry-point docs (README.md, API_TESTING.md, docs/README.md) point at real existing docs.

**Independent test criterion** (from spec): A fresh AI agent given only the three new docs answers all eight US2 acceptance scenarios correctly.

**Order rationale**: US2 runs *after* US1/US3/US4/US5/US6/US7/US9 so the docs describe the project's actual final state. By this point: code cleanup has landed (US3, US5), the canonical `AuthenticatedUser` exists (US4), speckit-lineage has been swept (US9), and test coverage is in place (US6, US7). The docs reference real existing artifacts without forward-references.

NOTE: per Constitution Principle XII, the three new docs must NOT cite the spec/FRs/Constitution that motivated them. They describe what the system does in terms of itself.

- [ ] T060 [US2] Walk [src/routes/api.ts](../../src/routes/api.ts) end-to-end and assemble a scratch list of the 16 endpoints (method, path, controller method called, `requireAuth`-or-public status). No durable artifact required — the list lives in the implementer's working memory or PR description scratchpad and is consumed by T064.
- [ ] T061 [P] [US2] Author `docs/technical/ARCHITECTURE.md`. Each topic below MUST be its own `##` heading (in this order): Maintenance contract (lists the code surface area whose changes require updating this doc); Layer flow (controller → service → repository → `googleSheetsDbClient`); Error & log pipeline (throw → `errorResponse` → `gcpLogger` → stdout JSON → Cloud Logging → 5xx Error Reporting via `@type`); Cache strategy (5-min in-memory, per-pod, `periods` excluded, full-flush on write); Authentication flow (localStorage `forte_auth_session` → `x-access-code`/`x-login-type` headers → ladder in [src/middleware/auth.ts](../../src/middleware/auth.ts) → logout-on-401/no-logout-on-403); Trimester & period model (four trimesters, four period types, `PeriodService.getEnrollmentTrimesterTable()`, summer grade-bump); DI container ([src/infrastructure/container/serviceContainer.ts](../../src/infrastructure/container/serviceContainer.ts), `ServiceKeys`); Build & deploy (Dockerfile, cloudbuild.yaml, version-manager, GitHub workflows); Migrations ([src/infrastructure/migration/migrationRunner.ts](../../src/infrastructure/migration/migrationRunner.ts)).
- [ ] T062 [P] [US2] Author `docs/technical/FRONTEND.md`. Each topic below MUST be its own `##` heading (in this order): Maintenance contract; Bootstrap order ([src/web/js/main.ts](../../src/web/js/main.ts) — version → config → auto-login → TabController → tab registration); `BaseTab<TData>` lifecycle (`onLoad → fetchData → render → attachEventListeners`, `AbortController`, `isLoaded`); `HttpService` contract (returns `HttpResult<T>`, never throws, single `fetch()` call); Session & Change-User flow (`AccessCodeManager`, `UserSession`, `TabController.cleanup()` on every tab); Shared model serving (prod Express static; dev Vite aliases in [vite.config.ts](../../vite.config.ts)); Registration form architecture (parent cascading-filter-chips vs admin linear); reference to the canonical `AuthenticatedUser` interface in [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts).
- [ ] T063 [P] [US2] Author the `docs/technical/API.md` skeleton. Each topic below MUST be its own `##` heading (in this order): Maintenance contract; Request/response envelope (the `{success, data}` / `{success: false, error}` shape from `responseHelpers.ts`); Public endpoints (`/health`, `/version`, `/configuration`, `/auth/access-code`); Authenticated endpoints — body filled by T064 with one `###` heading per endpoint.
- [ ] T064 [US2] Fill in `docs/technical/API.md` body — one `###` subsection per endpoint under the appropriate `##` (Public endpoints / Authenticated endpoints) per T060's list. For each endpoint: method, path, auth requirement, request shape, response shape (use the controller's actual response payload).
- [ ] T065 [US2] Edit [CONTRIBUTING.md](../../CONTRIBUTING.md) — add a Pre-Commit Checklist item: "Did your change affect anything documented in `docs/technical/ARCHITECTURE.md`, `API.md`, or `FRONTEND.md`? If yes, update the relevant doc in this PR."
- [ ] T066 [US2] Sweep [README.md](../../README.md), [API_TESTING.md](../../API_TESTING.md), and [docs/README.md](../../docs/README.md) for any remaining forward-references or stale text. Replace with real links to the now-existing `docs/technical/ARCHITECTURE.md`, `API.md`, `FRONTEND.md`. Add a top-line "Documentation" pointer in README that surfaces the three new docs.
- [ ] T067 [US2] Verify each new doc's `##` heading list against its required topic list above. Every required topic MUST have a matching heading. If any topic doesn't apply, document why in a one-line comment in this task's check-off note.
- [ ] T068 [US2] Verify acceptance: hand a fresh reader (human or AI in a clean session) only the three new docs and ask the eight US2 acceptance-scenario questions from spec.md. All eight answered correctly. If any fails, edit the relevant doc and re-test.
- [ ] T069 [US2] Verify the maintenance contract: each of the three new docs carries the contract header naming its code surface area; CONTRIBUTING.md has the checklist line. Mark US2 ready for commit.
- [ ] T070 [US2] Commit US2 changes as `docs: add ARCHITECTURE, API, FRONTEND reference docs + CONTRIBUTING maintenance contract`.

---

## Phase 11: User Story 8 — Confirm the successor-spec handoff (Priority: P3)

**Story goal**: Produce a checked-in `specs/015-audit-remediation/findings.md` listing every audit finding, then verify that the routing table in [spec.md](spec.md) matches `findings.md` row-for-row and that every routed-to successor stub addresses its routed item.

**Independent test criterion**: `findings.md` exists; every finding in it has a row in the US8 routing table; every routing-table target spec addresses the routed item as a dedicated heading or bullet in its "Findings to address" section.

**Order rationale**: US8 runs last because findings.md is the durable record of the audit AND of how each finding was handled — by this point every code/test/doc User Story has landed, so findings.md captures the truly-final state. findings.md itself lives under `specs/015-audit-remediation/` so speckit references are allowed; it can name the routing target specs (016–020) freely.

- [ ] T071 [US8] Author `specs/015-audit-remediation/findings.md`. Format: one short heading per finding (e.g., `### Bus deadlines hardcoded`), one-sentence summary, file:line reference. Curated and deduplicated — NOT a verbatim chat paste. Silently correct any errors from the original audit conversation (notably the test-coverage subagent missed the nested test directories under `tests/unit/{controllers,services,common,infrastructure}/`).
- [ ] T072 [US8] Cross-walk `findings.md` against the US8 routing table in [spec.md](spec.md): every finding heading must have a matching routing-table row, and every routing-table row must correspond to a finding heading. Edit either artifact to bring them into lockstep.
- [ ] T073 [US8] For each routing-table target spec, open it and verify the routed item appears as a dedicated heading or bullet in its "Findings to address" section with enough context that a reader unfamiliar with the audit can act on it. Specs to check: [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md), [017-uniform-crud-completion](../017-uniform-crud-completion/spec.md), [018-business-rules-to-config](../018-business-rules-to-config/spec.md), [019-frontend-test-infrastructure](../019-frontend-test-infrastructure/spec.md), [020-project-hygiene](../020-project-hygiene/spec.md).
- [ ] T074 [US8] If T073 found any successor stub missing a routed item, edit that stub's "Findings to address" section to add the item per the heading-or-bullet bar.
- [ ] T075 [US8] Verify acceptance: re-walk T072 and T073 once more after any T074 edits; confirm zero gaps. Mark US8 ready for commit.
- [ ] T076 [US8] Commit US8 changes as `docs(specs): add findings.md and verify audit routing across 015-020`. If T074 edited any successor stub, include those edits in the same commit.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Once all nine User Stories have shipped, confirm the spec's overall success condition.

- [ ] T077 Run the "fresh AI agent" test from the spec's Success Criteria: hand a new agent (clean session) the project, the constitution, and the three new reference docs (`docs/technical/ARCHITECTURE.md`, `API.md`, `FRONTEND.md`). Ask the eight questions from US2's acceptance scenarios. All eight must be answered correctly using only the docs (no source code lookup). If any fails, open a follow-up doc-fix commit — do NOT mark 015 closed.
- [ ] T078 Confirm `npm run check:all` passes on the merged branch after all nine User Stories have landed.
- [ ] T079 Update [.claude/CLAUDE.md](../../.claude/CLAUDE.md) `## Recent Changes` section to add a one-line `015-audit-remediation:` entry. (The section is currently stale; this top-up scopes to 015's own visibility, with the broader staleness fix routed to 020-project-hygiene.) CLAUDE.md is in `.claude/` so it MAY reference speckit per Constitution Principle XII's exception clause.
- [ ] T080 Mark [spec.md](spec.md) status `Implemented` (from `Draft`) when all User Story commits have landed.

---

## Dependencies & Execution Order

### User Story dependencies

All nine User Stories are **independent** per the spec's Dependencies section. None blocks another for correctness. The recommended execution order (US1 → US3 → US5 → US4 → US9 → US6 → US7 → US2 → US8) puts source/test work first and doc work last so the doc User Stories describe the actual final state in one pass.

Soft couplings:

- **US2 follows US9**: US9 sweeps speckit lineage from all non-speckit files. US2 then authors the three reference docs in a Principle-XII-compliant state from the start.
- **US2 follows US4**: US2's FRONTEND.md references the canonical `AuthenticatedUser` interface that US4 creates. If US4 hasn't shipped, FRONTEND.md describes a not-yet-existing artifact.
- **US2 follows US6/US7**: US2's ARCHITECTURE.md may reference test coverage that US6/US7 establish.
- **US8 follows US2**: US8's findings.md references the now-existing reference docs by file path.

### Parallel execution opportunities

Within each User Story phase, tasks marked `[P]` can run in parallel:
- **US1**: T004, T005, T009, T010 can run in parallel after T003 (already complete).
- **US3**: T013, T014, T015, T016 (already complete).
- **US4**: T028, T029, T030 can run in parallel after T027.
- **US9**: T037, T038, T039, T040, T041 (five sweep targets) can run in parallel after T036.
- **US6**: T045, T046, T047, T048, T049 (five test files) can run in parallel.
- **US2**: T061, T062, T063 (three doc authoring tasks) can run in parallel after T060; T064 follows T063.

Across User Stories: many of the nine User Story phases are themselves parallel candidates if multiple contributors are working concurrently — they touch disjoint files in most cases. US9 is the exception: it's a sweep, so it serializes naturally against the source/test User Stories that precede it.

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
| US9 | The four grep patterns (FR-, Constitution Principle, spec [0-9]\|specs/[0-9], speckit User Story citations) return zero matches in src/, tests/, docs/, root-level shipped files. |

---

## Implementation Strategy

**MVP scope**: The spec explicitly forbids partial shipping. All nine User Stories must merge for 015 to close.

**Incremental delivery**: Each User Story is its own commit; each commit leaves the project better than it found it. The recommended order puts code/test work first (US1, US3, US5, US4, US9, US6, US7) and doc work last (US2, US8) so the docs converge on the project's actual final state in a single authoring pass — no forward-references, no rewrite cycles.

**Per-commit gates**:
- All commits that touch `.ts` files (US3, US4, US5, US6, US7, US9) MUST pass `npm run check:all` (NFR-002).
- All commits MUST preserve user-facing behavior (NFR-001) — verified via the manual smoke test enumerated in NFR-001 (login parent, login employee, switch users, register one lesson).
- Doc-only commits (US1, US2, US8) MUST be reviewable as rendered Markdown (NFR-003) — no images, no external assets.

**Total task count**: 80 tasks across 12 phases.

**Task count per User Story**:
- US1 (Phase 3): 10 tasks
- US3 (Phase 4): 7 tasks
- US5 (Phase 5): 6 tasks
- US4 (Phase 6): 10 tasks
- US9 (Phase 7): 9 tasks
- US6 (Phase 8): 9 tasks
- US7 (Phase 9): 6 tasks
- US2 (Phase 10): 11 tasks
- US8 (Phase 11): 6 tasks
- Setup + Foundational + Polish: 6 tasks (T001–T002, T077–T080)
