# 2026-05-30 Audit Findings

The curated, deduplicated list of findings from the 2026-05-30 full-project audit. This is the durable artifact — chat transcripts and intermediate notes are not the source of truth. Every routing-table row in [spec.md](spec.md) US8 has a matching heading below, and every heading below has a matching row.

Errors and omissions in the original audit (notably the test-coverage subagent missing the nested test directories under `tests/unit/{controllers,services,common,infrastructure}/`) have been silently corrected. What's written here reflects ground truth at the time of authoring.

Each finding lives in one of three states: **owned by 015** (a 015 User Story closes it), **routed to a successor stub** (016–020 will pick it up), or **owned by both** (015 documents the current behavior; a successor decides the long-term fix).

---

## Owned by 015 — closed in this spec

### Broken doc links in `README.md` / `API_TESTING.md` / `docs/README.md`
README and API_TESTING contained dead links to nonexistent docs and fabricated endpoint examples. [README.md](../../README.md) line 54 (System Architecture), lines 92–100 (API Overview), lines 189–190 (Documentation footer); [API_TESTING.md](../../API_TESTING.md) lines 14–43 (curl examples). → 015 US1.

### Missing `ARCHITECTURE.md` / `API.md` / `FRONTEND.md`
No single document explained how the system actually works end-to-end. → 015 US2. Created at [docs/technical/ARCHITECTURE.md](../../docs/technical/ARCHITECTURE.md), [docs/technical/API.md](../../docs/technical/API.md), [docs/technical/FRONTEND.md](../../docs/technical/FRONTEND.md).

### Four "you will be surprised" hotspots need inline comments
Four code sites where a comment is the single highest-leverage doc: [src/repositories/userRepository.ts](../../src/repositories/userRepository.ts) `getStudents`/`getStudentById` (summer grade-bump), [src/repositories/registrationRepository.ts](../../src/repositories/registrationRepository.ts) `delete` (per-trimester LSP carve-out), [src/controllers/userController.ts](../../src/controllers/userController.ts) `authenticateByAccessCode` (logout-on-401 coupling), [src/repositories/periodRepository.ts](../../src/repositories/periodRepository.ts) `getAll` (cache-skip rationale). → 015 US3.

### Three inline declarations of "authenticated user" on frontend
[src/web/js/main.ts](../../src/web/js/main.ts) lines 61–69, [src/web/js/auth/loginModal.ts](../../src/web/js/auth/loginModal.ts) lines 14–22, and the `SessionUser` interface in [src/web/js/core/baseTab.ts](../../src/web/js/core/baseTab.ts) lines 30–42. Three near-identical inline shapes. → 015 US4. Canonical `AuthenticatedUser` now lives at [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts).

### Inconsistent trimester validation in `RegistrationController`
`createRegistration` and `updateIntent` validated via `isValidTrimester()`; `deleteRegistration` did not. [src/controllers/registrationController.ts](../../src/controllers/registrationController.ts). → 015 US5. Validation now uniform across all three methods, pinned by integration test.

### Zero coverage on `middleware/auth.ts`, `cacheService.ts`, `periodRepository.ts`, `programRepository.ts`, `logger.ts`
Five files with zero direct test coverage at the time of audit: [src/middleware/auth.ts](../../src/middleware/auth.ts), [src/cache/cacheService.ts](../../src/cache/cacheService.ts), [src/repositories/periodRepository.ts](../../src/repositories/periodRepository.ts), [src/repositories/programRepository.ts](../../src/repositories/programRepository.ts), [src/utils/logger.ts](../../src/utils/logger.ts). → 015 US6. All five now have test files; 69 new tests added.

### No end-to-end test for summer grade-bump
`userRepository` had unit tests for the bump transform but no test confirmed it flowed all the way through to a parent-facing tab response. → 015 US7. New integration test at [tests/integration/summerGradeBump.test.ts](../../tests/integration/summerGradeBump.test.ts) mocks only the data layer, lets real service/repo/controller code run.

### Pre-existing speckit-lineage references in src/, tests/, docs/, README
The codebase carried 50+ references to FR-XXX, Constitution Principle, spec NNN, and User Story citations introduced primarily by 014's implementation work. Constitution Principle XII (added 2026-05-31 as part of this spec) formalized the rule that the shipped artifact must stand alone. → 015 US9. All non-speckit files now Principle XII-compliant.

### Multi-instance cache desync
Each Cloud Run pod has its own in-memory `cacheService`; a write on instance A does not invalidate instance B's cache. Callers may see stale data for up to 5 minutes after another pod's write. → 015 US2 documents this in [docs/technical/ARCHITECTURE.md](../../docs/technical/ARCHITECTURE.md) Cache strategy section as an acceptable known limitation at current scale. No code change.

---

## Routed to 016 — error-contract uniformization

### Mixed not-found semantics (return `null` vs. throw `NotFoundError`)
Some repository methods return `null` on miss (e.g., `userRepository.getAdminByAccessCode`), others throw `NotFoundError` (e.g., `userRepository.getInstructorById`). Controllers cannot assume one shape. → [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md).

### Duplicate response logging (manual + auto)
Both `successResponse()` and `errorResponse()` ([src/common/responseHelpers.ts](../../src/common/responseHelpers.ts) lines 107–113, 160–161) auto-log to GCP Cloud Logging when given `req` and `startTime`. Some controllers also log manually beforehand, producing duplicate log entries per request. → [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md).

### `asString()` silently takes first array element
[src/common/responseHelpers.ts](../../src/common/responseHelpers.ts) lines 77–88: when a query param appears multiple times, Express delivers it as an array; `asString()` silently picks `[0]`. → [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md).

### Audit-trail best-effort semantics
When `registrationRepository.create()` persists a row but the subsequent `writeAudit()` call fails, the registration exists without an audit entry. No transaction boundary. Two related questions: should the contract be made explicit (best-effort, documented), and if so should the architecture doc describe it? → 015 US2 documents the contract in [docs/technical/ARCHITECTURE.md](../../docs/technical/ARCHITECTURE.md); [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md) decides whether to keep the best-effort semantics, reverse the write order, or introduce a two-phase pattern.

### `authenticateByAccessCode` returns `{success:true, data:null}` on miss
[src/controllers/userController.ts](../../src/controllers/userController.ts) `authenticateByAccessCode` returns a success envelope with null data on a missed lookup, NOT a 401 — because returning 401 would trigger `HttpService`'s logout-on-401 path. → 015 US3 (documents the current frontend coupling in an inline JSDoc block) + [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md) (decides whether the design is right).

### `AuthenticatedUser` carries response-level `systemError`/`error` fields
Surfaced while implementing 015 US4. The canonical `AuthenticatedUser` interface in [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts) carries `systemError?: boolean` and `error?: string` fields. Those describe the response, not the user. The inline shapes already had this; US4 preserved them on the canonical interface to avoid scope creep. → [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md).

### Auth ladder fallback re-tries the SAME path, not the opposite
Surfaced by 015 US6 auth middleware tests. The fallback block in [src/middleware/auth.ts](../../src/middleware/auth.ts) `extractAuthenticatedUser` retries the same lookup it just performed, not the opposite — but the inline comment claims "fall back to opposite method." The framing is misleading. → [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md).

### Explicit `x-login-type: employee` header does NOT skip the parent lookup for a 10-digit code
Surfaced by 015 US6. The format heuristic (`isPhoneNumber || loginType === PARENT`) fires parent lookup first regardless of an explicit employee header. A 10-digit code that matches a parent gets the parent identity even when the caller explicitly asked for employee auth. → [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md).

---

## Routed to 017 — uniform-CRUD completion

### `RegistrationRepository.delete()` breaks LSP via `@ts-expect-error`
[src/repositories/registrationRepository.ts](../../src/repositories/registrationRepository.ts) line 201. The method adds a required `trimester` parameter that the base class doesn't expect, and the type checker is silenced with `@ts-expect-error`. → [017-uniform-crud-completion](../017-uniform-crud-completion/spec.md).

---

## Routed to 018 — business rules to config

### Bus deadlines hardcoded
[src/services/registrationService.ts](../../src/services/registrationService.ts): per-day bus end-times hardcoded as literals. Bus schedule changes require a code change. → [018-business-rules-to-config](../018-business-rules-to-config/spec.md).

### 12-lessons-per-trimester literal
[src/services/registrationService.ts](../../src/services/registrationService.ts) `#generateLessonSchedule()` assumes 12 lessons. Trimesters with different lengths produce wrong schedules. → [018-business-rules-to-config](../018-business-rules-to-config/spec.md).

### `FORTE_PROGRAM_EMAIL` hardcoded
[src/config/constants.ts](../../src/config/constants.ts) hardcodes the contact email. Multi-tenant prep would require this to be config-driven. → [018-business-rules-to-config](../018-business-rules-to-config/spec.md).

---

## Routed to 019 — frontend test infrastructure

### `jsdom` missing from Jest setup
[config/jest.config.js](../../config/jest.config.js) uses `testEnvironment: 'node'`. The few frontend "tests" that exist are pure-logic tests that never touch the DOM. → [019-frontend-test-infrastructure](../019-frontend-test-infrastructure/spec.md).

### 11 registration form components have zero coverage
The 11 component files under `src/web/js/components/registrationForm/` are zero-coverage. Most depend on jsdom infrastructure (above) to be testable. → [019-frontend-test-infrastructure](../019-frontend-test-infrastructure/spec.md).

---

## Routed to 020 — project hygiene

### `viewModel` references survive in `feedback.ts` and `tests/unit/web/viewModel.test.ts`
The viewModel was dissolved as a project pattern; lingering references in [src/web/js/feedback.ts](../../src/web/js/feedback.ts) and the test file should be either cleaned up or have the dissolution officially carved out. → [020-project-hygiene](../020-project-hygiene/spec.md) (also flagged by [019-frontend-test-infrastructure](../019-frontend-test-infrastructure/spec.md) since the test file is in the frontend tree).

### `gas/` legacy-vs-active status unclear
[gas/](../../gas/) holds the pre-Node migration Google Apps Script source. Its current status (legacy reference vs active code) is undocumented. The folder ships its own `package.json` but isn't bundled. → [020-project-hygiene](../020-project-hygiene/spec.md).

### `specs/` archival hygiene
[specs/](../) holds 22 spec directories with no consistent status marking — implemented, in-progress, stub, deferred all mixed together. A reader can't tell what's load-bearing without opening each one. → [020-project-hygiene](../020-project-hygiene/spec.md).

### `dev/plans/` status marking
[dev/plans/](../../dev/plans/) similarly lacks status markers. → [020-project-hygiene](../020-project-hygiene/spec.md).

### `.claude/CLAUDE.md` "Recent Changes" stale
[.claude/CLAUDE.md](../../.claude/CLAUDE.md) has a `## Recent Changes` section that hasn't been auto-updated by the speckit hooks; only 002 is listed. → [020-project-hygiene](../020-project-hygiene/spec.md). (015 will add a top-up entry as Polish work, but the broader staleness fix belongs in 020.)

### Postman collection currency unverified
[scripts/postman/tonic-api.postman_collection.json](../../scripts/postman/tonic-api.postman_collection.json) hasn't been compared against [src/routes/api.ts](../../src/routes/api.ts) systematically. → [020-project-hygiene](../020-project-hygiene/spec.md).
