# Implementation Plan: Audit Remediation

**Branch**: `015-audit-remediation` | **Date**: 2026-05-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/015-audit-remediation/spec.md`

## Summary

015 closes the 2026-05-30 full-project audit by shipping eight independent, narrowly-scoped User Stories. The work is primarily **documentation** (three new reference docs + four inline JSDoc comment blocks + fixes to README/API_TESTING/docs README), with a small amount of **code-consistency cleanup** (one canonical `AuthenticatedUser` interface; one missing `isValidTrimester()` call) and a small set of **test gap fills** (auth middleware, cache service, two thin repositories, logger, plus one end-to-end summer-grade-bump assertion). The eighth User Story produces a checked-in `findings.md` that captures the audit's findings as a durable artifact and verifies that every finding is routed either inside this spec or to one of the five successor stubs (016–020).

There is no new entity, no new endpoint, no behavior change visible to end users, and no new external dependency. Per Constitution Principle I ("Simplicity First"), this plan deliberately omits `data-model.md` and `contracts/` — they would be empty files documenting zero entities and zero new contracts, which is the kind of speculative artifact the constitution explicitly forbids.

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022 (Node.js ESM via `tsx` on the backend; Vite 7 bundle on the frontend) — unchanged.
**Primary Dependencies**: Express 4, googleapis, Jest 29 with `ts-jest` ESM preset, Supertest 7, MaterializeCSS (CDN), `@faker-js/faker` for test fixtures — all already in `package.json`.
**Storage**: Google Sheets API v4 — touched only indirectly via mocked `googleSheetsDbClient` in tests; the spec adds zero schema or migration changes.
**Testing**: `npm run test:unit` (Jest) for new test files; `npm run typecheck` for the AuthenticatedUser refactor; `npm run check:all` gates every code-touching PR.
**Target Platform**: GCP Cloud Run (production), local Node for dev — unchanged.
**Project Type**: Web application — Express backend + Vite-bundled vanilla TypeScript SPA. The existing `src/` ↔ `tests/` layout described in the structure section applies as-is.
**Performance Goals**: N/A — no runtime behavior change.
**Constraints**: NFR-001 (no user-facing behavior change), NFR-002 (no constitution amendments), NFR-003 (`npm run check:all` passes for code-touching stories), NFR-004 (doc PRs reviewable as rendered Markdown).
**Scale/Scope**: 1 spec, 8 User Stories, ~15 file additions, ~10 file edits, 1 new `findings.md` artifact, 1 `CONTRIBUTING.md` checklist update.

No NEEDS CLARIFICATION items. The two `/speckit.clarify` sessions and the recursive review resolved every spec-level ambiguity.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution applies primarily to behavior-changing code. Most principles are not directly engaged by this spec. The principles that are engaged:

| Principle | Engaged? | Status | Notes |
|---|---|---|---|
| I. Simplicity First | Yes | ✅ Pass | This is the principle that explicitly justifies skipping `data-model.md`, `contracts/`, and an OpenAPI deliverable for a spec with no entities and no new endpoints. The plan adds no abstractions, no configuration options, no preemptive future-proofing. Each User Story is the minimum required to close the specific audit finding it owns. |
| II. Data Consistency | Yes | ✅ Pass | US4 produces ONE canonical `AuthenticatedUser` interface, eliminating the three inline declarations the audit flagged. This directly enforces the principle. |
| III. Single Serialization Path | No | N/A | No model changes; no `toJSON()` touched. |
| IV. Uniform API Responses | Yes | ✅ Pass | US5 enforces that `deleteRegistration` returns the same error envelope as `createRegistration` for invalid trimester (FR-006, AS#1). This *increases* uniformity. The `authenticateByAccessCode` `{success: true, data: null}` quirk is documented in US3 and routed to 016 for the policy decision — that endpoint still emits a valid envelope, just with `null` data, which Principle IV permits (the principle requires the envelope shape, not non-null data). |
| V. Single Data Fetch Pattern | No | N/A | No new frontend HTTP calls. US4 only relocates a type declaration. |
| VI. No Dead Code | Yes | ✅ Pass | US4 removes the three inline `AuthenticatedUser` declarations; no dead code is added. The deferred `viewModel` reference in `feedback.ts` is flagged in the routing table for 020, not addressed here. |
| VII. Shared Models Are the Contract | Yes (lightly) | ✅ Pass | The `AuthenticatedUser` interface produced by US4 belongs in [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts) — frontend-only, not in `src/models/shared/`. Justification: `AuthenticatedUser` represents the frontend's view of the authenticated session (the localStorage payload plus the resolved user record). It is not a domain entity persisted to Sheets; it is a runtime composition. Placing it in `shared/` would create a model whose backend mirror would just be `req.currentUser`, which is already typed via `src/types/express.d.ts`. Frontend-local is the simpler choice and matches what session.ts already owns. |
| VIII. Role-Based Architecture | No | N/A | No new endpoints, no new role-scoped logic. |
| IX. Trimester-Aware by Default | Yes | ✅ Pass | US5 adds trimester validation to `deleteRegistration` using the existing `isValidTrimester()` helper — the same helper `createRegistration` already uses. US7 verifies the summer grade-bump end-to-end. Both *reinforce* trimester-awareness; neither introduces new trimester routing. |
| X. Google Sheets Is the Database | Yes (indirectly) | ✅ Pass | US6 follows the existing convention: all tests mock `googleSheetsDbClient`; none hit the real Sheets API (Constitution Testing section). The architecture doc produced by US2 documents the existing cache strategy (5-min in-memory, full-flush on writes, periods uncached) — it does not change it. |
| XI. Uniform CRUD Backend | Yes (lightly) | ✅ Pass | US5 enforces uniform CRUD validation on `deleteRegistration`, aligning it with `createRegistration` and `updateIntent`. The `RegistrationRepository.delete()` LSP violation is *flagged* in the routing table for 017, not fixed here — this is the simplest choice (don't expand 015's scope). |
| XII. Speckit Stays in Speckit Spaces | Yes | ✅ Pass after US9 | US9 is the dedicated User Story that brings the codebase into XII compliance. The constitution amendment landed first (separate commit on this branch); US9 then sweeps every non-speckit file. US1, US3, US4, US5, US6, US7 may transiently introduce speckit references during their implementation (e.g., US3's hotspot doc blocks initially cited spec numbers and Principle IX) — those are accepted as dirty intermediate state and cleaned by US9. US2's three reference docs and US8's findings.md are authored AFTER US9 in the recommended order, so they land clean. |

**Testing section (constitution)**: ✅ Pass.
- Tests mock `googleSheetsDbClient` (US6 acceptance + Concretely).
- Tests are not disabled to work around failures (US6 policy: defer-always, document, route to a new spec).
- The Postman collection is *flagged* for currency verification but routed to 020 — outside 015 scope.

**FR-010 / CONTRIBUTING.md update**: This is a process change, not a code change. It introduces a checklist line. The maintenance contract is operationally equivalent to the existing "Postman collection MUST be updated" rule that the Testing section already establishes.

**Constitution amendment**: This spec required a constitution amendment (Principle XII, version 2.3.1 → 2.4.0) to formalize the rule that speckit lineage stays out of the shipped artifact. The amendment landed first as its own commit; the rest of the spec follows.

**Complexity Tracking**: No violations. No Complexity Tracking entry required.

## Project Structure

### Documentation (this feature)

```text
specs/015-audit-remediation/
├── plan.md              # This file (/speckit.plan output)
├── spec.md              # Already authored; recursively reviewed
├── findings.md          # Created by US8 as part of implementation (not a /speckit.plan artifact)
└── tasks.md             # Created by /speckit.tasks (not by /speckit.plan)
```

Deliberately absent: `research.md`, `data-model.md`, `quickstart.md`, `contracts/`. See [Phase 0](#phase-0--outline--research) and [Phase 1](#phase-1--design--contracts) for rationale.

### Source Code (repository root)

The project uses **Option 2 (Web application)** but with co-located backend and frontend under `src/` rather than separate `backend/` and `frontend/` trees. The existing structure is unchanged by 015; the table below lists only the files this spec creates or edits.

```text
src/
├── controllers/
│   ├── registrationController.ts          # EDIT (US5): add isValidTrimester() to deleteRegistration
│   └── userController.ts                  # EDIT (US3): JSDoc on authenticateByAccessCode
├── repositories/
│   ├── userRepository.ts                  # EDIT (US3): JSDoc on getStudents / getStudentById
│   ├── registrationRepository.ts          # EDIT (US3): JSDoc on delete()
│   └── periodRepository.ts                # EDIT (US3): JSDoc on getAll()
├── middleware/
│   └── auth.ts                            # (no edit; US6 tests it)
└── web/js/
    ├── main.ts                            # EDIT (US4): import canonical interface
    ├── core/baseTab.ts                    # EDIT (US4): SessionInfo references new interface
    └── auth/
        ├── session.ts                     # EDIT (US4): add AuthenticatedUser interface
        └── loginModal.ts                  # EDIT (US4): import canonical interface

tests/
├── unit/
│   ├── middleware/                        # NEW directory (US6)
│   │   └── auth.test.ts                   # NEW (US6)
│   ├── cache/                             # NEW directory (US6)
│   │   └── cacheService.test.ts           # NEW (US6)
│   ├── repositories/
│   │   ├── periodRepository.test.ts       # NEW (US6)
│   │   └── programRepository.test.ts      # NEW (US6)
│   └── utils/
│       └── logger.test.ts                 # NEW (US6)
└── integration/
    └── summerGradeBump.test.ts            # NEW (US7)

docs/technical/
├── ARCHITECTURE.md                        # NEW (US2)
├── API.md                                 # NEW (US2)
└── FRONTEND.md                            # NEW (US2)

# Root-level
README.md                                  # EDIT (US1)
API_TESTING.md                             # EDIT (US1)
docs/README.md                             # EDIT (US1, if stale links found)
CONTRIBUTING.md                            # EDIT (US2 maintenance-contract checklist line)

# Spec-local
specs/015-audit-remediation/findings.md    # NEW (US8)

# Possibly EDIT (US8) — only if the audit-routing verification finds a missing item:
specs/016-error-contract-uniformization/spec.md
specs/017-uniform-crud-completion/spec.md
specs/018-business-rules-to-config/spec.md
specs/019-frontend-test-infrastructure/spec.md
specs/020-project-hygiene/spec.md
```

**Structure Decision**: Option 2 (Web application), but using the existing co-located `src/{controllers,repositories,services,web/js,...}` layout. No new top-level directories. New subdirectories are limited to two: `tests/unit/middleware/` and `tests/unit/cache/`.

**US9 reach**: US9 (speckit-lineage sweep) touches files broadly — not just the ones enumerated above. It rewrites comments and strings across `src/`, `tests/`, `docs/`, root-level Markdown (`README.md`, `CONTRIBUTING.md`, `API_TESTING.md`), build/CI files (`src/build/*`, `.github/workflows/*`), and `scripts/`. The exact reach is determined by the four acceptance grep patterns at the time US9 runs; an explicit file enumeration in this plan would go stale before implementation. `.claude/` and `specs/` are exempt.

## Phase 0 — Outline & Research

**Skipped — and that is the right call.**

The Phase 0 purpose per the workflow template is to "resolve all NEEDS CLARIFICATION." This spec has zero NEEDS CLARIFICATION items remaining after the two `/speckit.clarify` sessions and the recursive review. Every technical choice that *would* have been a Phase 0 research task is either already known from the audit (e.g., the file:line references for the doc-comment hotspots) or already settled in the clarifications session (e.g., the maintenance contract; `findings.md` shape; ship bar).

Writing a `research.md` whose entire content would be "we already know all this" violates Constitution Principle I. The plan moves directly to Phase 1.

Items the audit did not pin down — but which are correctly resolved at *implementation time* by reading the actual current code — include:
- Exact line numbers for `responseHelpers.ts` `errorResponse()` (the spec cites `131–200`; the implementer verifies before editing).
- The current field shape of the three `AuthenticatedUser`-equivalent inline declarations (US4 picks the union; the implementer confirms field-by-field at edit time).
- The current set of paths under `src/web/js/{main,core,tabs,data,auth}/**` for the FRONTEND.md maintenance-contract surface area (US2's doc lists what it actually covers; the implementer enumerates).

None of these require a research artifact. They are point lookups answered by `grep` or `Read` during the relevant User Story's PR.

## Phase 1 — Design & Contracts

### data-model.md — Skipped

**Justification**: This spec introduces zero new entities. The audit findings concern existing code; the User Stories add docs, tests, and one TypeScript interface relocation. The TypeScript interface (`AuthenticatedUser`) is a frontend-only runtime composition (localStorage payload + resolved user shape), not a domain entity persisted to Sheets — Constitution Principle VII guides it to `src/web/js/auth/session.ts`, not `src/models/shared/`. Writing a `data-model.md` that says "this spec has no data model" is the empty artifact Constitution Principle I forbids.

### contracts/ — Skipped

**Justification**: This spec adds zero new API endpoints. US5 changes the error response shape for one *invalid input* path on an existing endpoint (`DELETE /registrations/:trimester/:id`) to match what `POST /registrations` already returns — this is convergence onto an existing contract, not a new one. The Postman collection sync requirement in the Constitution (Testing section) is satisfied by the existing collection covering both endpoints; if the collection lacks invalid-trimester examples, US5's PR adds them as a matter of course (no spec-level contract artifact required).

The API.md produced by US2 is itself the documented contract for all 16 existing endpoints. That is a User Story deliverable, not a `/speckit.plan` artifact.

### quickstart.md — Skipped

**Justification**: "Quickstart" docs are typically "how to exercise the new feature end-to-end." This spec has no new feature for an end user to exercise; the audience for *every* deliverable is internal (developers, future AI agents reading the code). The `/api/health`, `/api/version` endpoints already cover smoke verification; NFR-001 specifies the manual smoke test that gates each PR merge (login as parent, login as employee, switch users, register one lesson). That sentence in the spec is the quickstart.

### Agent context update

Run `.specify/scripts/bash/update-agent-context.sh claude` per the workflow template. This script updates `.claude/CLAUDE.md` to reflect the spec's metadata. Per the audit (routed to 020), the "Recent Changes" section in CLAUDE.md is currently stale (only spec 002 listed) — running the script here will *also* surface that staleness, which is the right outcome. The 020 cleanup spec resolves the structural issue; 015's run simply does what it does.

(I am not running the script as part of writing this plan — that's an implementation action that happens when 015 starts shipping. The plan flags that it must be run.)

## Post-Design Constitution Re-Check

After Phase 1 (such as it is), re-evaluating:

- **Principle I (Simplicity)** — The decision to skip three Phase 1 artifacts is itself the strongest evidence of compliance. No speculative scaffolding was added.
- **Principle II (Data Consistency)** — US4 collapses three inline interface declarations into one canonical `AuthenticatedUser`. Stronger compliance after 015 than before.
- **Principle IV (Uniform API Responses)** — US5 brings `deleteRegistration` into uniformity with `createRegistration` for invalid trimester. Stronger compliance.
- **Principle XI (Uniform CRUD Backend)** — US5 reinforces uniform validation. The `RegistrationRepository.delete()` LSP violation remains *flagged* for 017; this is the explicitly-documented out-of-scope item and is not a violation introduced by 015.

All gates pass. No Complexity Tracking entry needed.

## Implementation Order Recommendation

User Stories are independent and can ship in any order. The recommended execution order puts source/test work first and documentation work last, so the docs converge on the project's *actual final state* in a single pass — no forward-references, no immediate-rewrite cycles.

1. **US1** (dead links) — remove dead links and fabricated endpoints from entry-point docs. Does NOT add forward-references to future work; US2 writes the replacements later. Smallest, fastest, removes false claims first.
2. **US3** (inline JSDoc comments) — small, source-of-truth for hotspot reasoning.
3. **US5** (uniform trimester validation) — small code-consistency fix; lands a real bug-shaped finding early.
4. **US4** (canonical `AuthenticatedUser`) — refactor that US2 will then reference.
5. **US9** (speckit-lineage sweep) — Principle XII compliance. Sweeps every non-speckit file so subsequent doc User Stories never need to relitigate.
6. **US6** (test gap fills) — independent; ship in parallel.
7. **US7** (summer grade-bump E2E test) — independent; ship in parallel.
8. **US2** (three reference docs) — the largest doc-writing unit. Authored last so it describes the project's actual final state and never needs forward-references.
9. **US8** (findings.md + routing-table verification) — truly last; verifies that everything routed properly and produces the durable artifact pointing at all the now-existing reference docs.

This order is a recommendation, not a binding requirement. The spec's Dependencies section is the authoritative independence statement. The rationale for putting doc work last: by the time US2 and US8 are authored, every code change has landed, every speckit reference has been swept, and every successor stub has been touched up — so the docs they produce describe the real state and never need to be rewritten.

## Stop

`/speckit.plan` ends here. Next step: `/speckit.tasks` to produce `tasks.md` (the per-User-Story task breakdown). Tasks should *not* be created by `/speckit.plan` per the workflow template.

**Branch**: `015-audit-remediation`
**Plan**: [plan.md](plan.md)
**Generated artifacts**: This plan. No `research.md`, `data-model.md`, `quickstart.md`, or `contracts/` — each deliberately skipped with a justification anchored in Constitution Principle I.
