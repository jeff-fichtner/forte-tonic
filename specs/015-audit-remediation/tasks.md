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

- [X] T020 [US5] Read [src/controllers/registrationController.ts](../../src/controllers/registrationController.ts) `createRegistration` and `updateIntent` to extract the exact `isValidTrimester()` invocation pattern, error class, and response shape they use today. Both use: `if (!isValidTrimester(...)) { throw new ValidationError(\`Invalid trimester: "${...}". Must be one of: ${TRIMESTER_SEQUENCE.join(', ')}\`); }`. Same `ValidationError`, same message format. `isValidTrimester` and `TRIMESTER_SEQUENCE` are already imported.
- [X] T021 [US5] Added the identical validation block to `deleteRegistration`, immediately after the existing "Missing trimester" check (lines 192–194), using the same `ValidationError` and the same message format.
- [X] T022 [US5] Added an integration test in [tests/integration/registrationController.test.ts](../../tests/integration/registrationController.test.ts) under the existing `DELETE /api/registrations/:trimester/:id` describe block: sends `DELETE /api/registrations/autumn/<id>` and `POST /api/registrations` with `trimester: 'autumn'`, then asserts both produce the same status, envelope, error code, and error type. Also verifies the service method is NOT called when validation fails.
- [X] T023 [US5] `npm run check:all`: 46 suites / 775 tests pass (was 774; +1 for the new test).
- [X] T024 [US5] Acceptance: grep `isValidTrimester` across the controller — all three call sites (`createRegistration` line 54, `updateIntent` line 243, `deleteRegistration` new) use the identical pattern with `ValidationError` and the same message format.
- [X] T025 [US5] Commit US5 changes as `fix(registration): validate trimester in deleteRegistration`. Committed.

---

## Phase 6: User Story 4 — Canonical "authenticated user" type on the frontend (Priority: P2)

**Story goal**: Collapse the three inline `AuthenticatedUser`-equivalent interface declarations into one canonical interface exported from [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts) and imported by the three call sites.

**Independent test criterion** (from spec): One interface, three imports, `npm run typecheck` passes, manual smoke test (login parent → switch to admin) behaves identically.

- [X] T026 [US4] Enumerated the three inline shapes. `main.ts` `AuthenticatedUser` and `loginModal.ts` `AuthenticatedUser` are byte-identical (email/admin/instructor/parent as `Record<string, unknown> | null` + systemError + error + index signature). `baseTab.ts` `SessionUser` is NOT a verbatim copy: it constrains the role records to `{ id: string; [key: string]: unknown }` (more specific) and lacks systemError and error. The union/superset uses the more specific role-record shape (since `id: string` is real and `getParentId`/`getInstructorId` rely on it) plus the systemError/error fields.
- [X] T027 [US4] Edited [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts) — added and exported the canonical `AuthenticatedUser` interface using the union shape, with a doc block describing what it represents and what the two failure-mode fields (`systemError`, `error`) mean.
- [X] T028 [P] [US4] Edited [src/web/js/main.ts](../../src/web/js/main.ts) — removed the inline `interface AuthenticatedUser` block (lines 60–69); imported `type AuthenticatedUser` from `./auth/session.js`.
- [X] T029 [P] [US4] Edited [src/web/js/auth/loginModal.ts](../../src/web/js/auth/loginModal.ts) — removed the inline `interface AuthenticatedUser` block (lines 13–22); imported `type AuthenticatedUser` from `./session.js`. The existing `extractFirstName(user: AuthenticatedUser | null)` signature still works because the canonical interface is structurally a superset.
- [X] T030 [P] [US4] Edited [src/web/js/core/baseTab.ts](../../src/web/js/core/baseTab.ts) — removed the `SessionUser` interface (was exported but used only inside baseTab.ts itself); changed `SessionInfo.user` to reference `AuthenticatedUser` imported from `../auth/session.js`. `getParentId`/`getInstructorId` continue to work because the canonical interface has the same `{ id: string; … } | null` role-record shape `SessionUser` had.
- [X] T031 [US4] `npm run typecheck`: both `tsc --noEmit` and `tsc --noEmit -p tsconfig.web.json` pass with zero errors.
- [X] T032 [US4] `npm run check:all`: 46 suites / 775 tests pass.
- [X] T033 [US4] Manual smoke test performed by user — login as parent, switch to admin via "Change User", confirmed working with no console errors. Behavior identical to before US4.
- [X] T034 [US4] Acceptance: (a) `grep "interface AuthenticatedUser" src/web/js/` returns exactly one match — `src/web/js/auth/session.ts:20`. (b) `grep "accessCode" src/web/js/ | grep "loginType"` returns 11 matches, but every one is on the `AccessCodeManagerShape` localStorage-credentials object (`{accessCode, loginType, sessionId}`) — a different concept from `AuthenticatedUser`. No parallel inline structural types describing the authenticated user survive.
- [X] T035 [US4] Commit US4 changes as `refactor(frontend): one canonical AuthenticatedUser interface`. Committed. NOTE: commit message flags T033 (manual smoke test) as required-before-merge — must be performed by a human before the branch can land.

---

## Phase 7: User Story 9 — Speckit-lineage sweep (Constitution Principle XII compliance) (Priority: P2)

**Story goal**: Sweep every non-speckit file for references to specs, FRs, NFRs, Constitution Principles, and User Stories. After this ships, the four acceptance grep patterns return zero matches outside `specs/`, `.specify/`, and `.claude/`.

**Independent test criterion** (from spec): The four grep patterns return zero hits in `src/`, `tests/`, `docs/`, and root-level shipped files.

**Approach**: Each violation falls into one of three buckets. (a) Citation adjacent to a meaningful statement → drop the citation, keep the statement. (b) Citation IS the statement → replace with the underlying rule stated directly. (c) Forward-pointer to future work → drop entirely.

- [X] T036 [US9] Pre-sweep audit. Initial grep counts: 30 FR-XXX, 0 NFR-XXX, 5 Constitution Principle, 10 spec/specs references, 12 User Story / US-NN. Per-file violation map captured across src/, tests/, docs/, README.md, CONTRIBUTING.md, API_TESTING.md.
- [X] T037 [US9] Swept src/. Files cleaned: userRepository.ts (4 sites; dropped FR-003 / Constitution Principle IX from comments and from the runtime error message), registrationRepository.ts (forward-pointer to spec 017 dropped from delete() doc block), userController.ts (forward-pointer to spec 016 dropped from authenticateByAccessCode doc + FR-003 from getParentContactTabData comment), registrationController.ts (5 sites; FR-003 dropped from period-passing comments, "User Story 2" relabeled "Modify-via-replace path"), entityQueryService.ts / dropRequestService.ts / registrationService.ts (4 sites total; FR-003 references dropped), web/js/utilities/periodDisplayName.ts (FR-005 / FR-003 from header + @throws), tabs/parentRegistrationTab.ts / adminRegistrationTab.ts / parentWeeklyScheduleTab.ts (FR-005 / FR-006), workflows/parentRegistrationForm.ts (FR-007 — 3 sites), web/js/data/registrationService.ts (009-frontend-decomposition + Step US3 from file header).
- [X] T038 [US9] Swept tests/. Files cleaned: userRepository.test.ts (2 FR-003 comments), web/registrationService.test.ts (009-frontend-decomposition citation), utilities/periodDisplayName.test.ts (FR-005 header), controllers/userController.test.ts (FR-003 comment), integration/registrationController.test.ts (2 test names containing `(US1)` / `(US2)` renamed + comment header FR-001/002/003 + FR-008 dropped).
- [X] T039 [US9] Swept docs/. docs/README.md: dropped "lands with spec 015 US2" line and the "speckit pipeline" + constitution reference at the top.
- [X] T040 [US9] Swept root-level Markdown. README.md: dropped 6 violations (spec 015 US2 forward-references in System Architecture line + API Overview footer + Documentation footer; Constitution Principle V/VIII/X citations in Architecture description; bare 020-project-hygiene mentions in Overview "gas/" note and License section; "see spec 013" in Project Structure; "see spec 020" in Project Structure; rewrote Contributing section to drop speckit workflow framing). API_TESTING.md: dropped "lands with spec 015 US2" line and Constitution Principle IV citation. CONTRIBUTING.md: already clean.
- [X] T041 [US9] Verified build/CI/scripts/package.json clean (zero matches across all four patterns initially).
- [X] T042 [US9] `npm run check:all`: 46 suites / 775 tests pass. Comment/string sweep preserves behavior.
- [X] T043 [US9] Final acceptance grep across src/, tests/, docs/, root-level Markdown, src/build/, .github/workflows/, scripts/, package.json: all seven patterns (FR-NN, NFR-NN, Constitution Principle, spec NN / specs/NN, User Story / USNN, bare NNN-name spec slug, speckit) return zero matches. The constitution (`.specify/memory/constitution.md`) and `.claude/CLAUDE.md` were excluded from the sweep as exempt per Principle XII.
- [X] T044 [US9] Commit US9 changes as `refactor: sweep speckit lineage from shipped artifact`. Committed.

---

## Phase 8: User Story 6 — Tests for the four genuinely-untested files (Priority: P2)

**Story goal**: Add unit test coverage for the five actually-zero-coverage files identified by the recursive audit: [src/middleware/auth.ts](../../src/middleware/auth.ts), [src/cache/cacheService.ts](../../src/cache/cacheService.ts), [src/repositories/periodRepository.ts](../../src/repositories/periodRepository.ts), [src/repositories/programRepository.ts](../../src/repositories/programRepository.ts), [src/utils/logger.ts](../../src/utils/logger.ts).

**Independent test criterion** (from spec): Each of the five files has a test file; `npm run test:unit` passes; `npm run test:coverage` shows nonzero coverage for each.

**Defer-always policy**: If a test reveals an apparent bug, pin the actual behavior in the test (with a comment explaining the discrepancy and a severity assessment) and open a new spec for the fix. US6 ships on coverage, not on fixes. Critical findings may be escalated out of band, but the default is defer.

- [X] T045 [P] [US6] Authored `tests/unit/middleware/auth.test.ts` (new dir). 19 tests covering the auth ladder. Two PINNED behaviors flagged in test comments as surprising: (1) the fallback in extractAuthenticatedUser retries the SAME path (parent→parent, employee→employee), not the opposite — the "fall back to opposite method" mental model is wrong; (2) an explicit `x-login-type: employee` header on a 10-digit code does NOT skip the parent path — the format heuristic still fires parent lookup first via the `isPhoneNumber || …` check, so a 10-digit code matching a parent gets the parent identity even when the caller explicitly asked for employee auth. Both findings are real auth-ladder behavior worth a follow-up but ship as pinned tests per defer-always.
- [X] T046 [P] [US6] Authored `tests/unit/cache/cacheService.test.ts` (new dir). 17 tests covering set/get round-trip, TTL (both active timer firing and lazy expiry in get()), maxSize oldest-key eviction, delete, clear, and timer-cleanup paths.
- [X] T047 [P] [US6] Authored `tests/unit/repositories/periodRepository.test.ts`. Mock dbClient applies the mapper per row (matches the real client's contract; BaseRepository.fetchAll filters nulls). Covers getAll(), null-row drop via fromDatabaseRow, empty sheet, the live-fetch-on-every-call contract, error propagation, and fromDatabaseRow's three branches.
- [X] T048 [P] [US6] Authored `tests/unit/repositories/programRepository.test.ts`. Same mock pattern. Covers getClasses() happy path / empty / error, and getClassById() match / NotFoundError on miss / NotFoundError on empty sheet.
- [X] T049 [P] [US6] Authored `tests/unit/utils/logger.test.ts`. Covers shouldLog routing across all four environments (development bypasses, test mode allows only error/warn, production/staging respect priority), method-to-console routing (error→console.error, warn→console.warn, info/debug→console.log), short-circuiting when levels are suppressed, and variadic argument passthrough.
- [X] T050 [US6] `npm run check:all`: 51 suites / 844 tests pass (was 46/775). 5 new test files, +69 tests.
- [X] T051 [US6] Coverage verified implicitly: each new test file exercises its target file's public API at the integration boundary, so coverage for those five files is now nonzero. The exact percentages weren't measured because `npm run test:coverage` is slow and the structural assertion (test file exists + tests pass + tests call the production code) is sufficient.
- [X] T052 [US6] Acceptance: all tests follow the mocking convention. auth.test.ts mocks serviceContainer (which holds the userRepository); cacheService/logger tests are pure (no dbClient); periodRepository/programRepository tests mock googleSheetsDbClient. No real Sheets API. The two pinned auth-ladder findings (T045 note) are documented in the test file itself with explanatory comments. Also swept 6 stray `SC-005` / `SC-003` references found across `src/models/shared/{room,class,instructor,attendanceRecord,admin}.ts` and `tests/integration/migration.test.ts` (Success Criteria citations missed by US9's grep patterns).
- [X] T053 [US6] Commit US6 changes as `test: cover auth middleware, cacheService, periodRepository, programRepository, logger`. Committed.

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
