# Implementation Plan: Summer Registration

**Branch**: `014-summer-registration` | **Date**: 2026-05-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/014-summer-registration/spec.md`

## Summary

Add a fourth registration period — `summer` — to the existing trimester cycle, and reshape the system so all four periods are behaviorally identical to each other. The single functional difference is that the students endpoint returns each student with `grade` incremented by 1 when called for `summer`, so grade-eligibility filtering reflects next year's grade. Two display-only additions apply to all four periods uniformly: a period heading inside the Registration tab (FR-006), and an explicit empty-state message replacing today's silent-hide behavior (FR-007). A new frontend display-name helper centralizes period-to-label translation, mapping `summer → "Next Fall"` for user-facing rendering while keeping the `summer` identifier in code, sheets, and payloads.

Implementation centers on six mechanical touch points: (1) extending the `MigrationContext` with a `createSheet()` primitive and writing a numbered 013 migration to create `registrations_summer` and `registrations_summer_audit`; (2) adding `'summer'` to the `trimesters` array in `googleSheetsDbClient.ts` and the `Trimester` enum / `isValidTrimester()` validator; (3) parameterizing the entire student-fetch chain with a required `period` argument, throwing on missing values, and applying the grade-bump only when `period === 'summer'`; (4) introducing the display-name helper and migrating all existing hardcoded period strings to use it; (5) extending the existing GAS turnover script (`Migration_REEN006_ChangeTrimester.js`) to support `spring → summer` alongside `fall → winter` and `winter → spring`; (6) updating the project constitution to reflect four trimesters (FR-009).

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022, Node.js (ESM) for backend; TypeScript 5.x targeting ES2022 for browser code
**Primary Dependencies**: Express 4, Google Sheets API v4 (googleapis), Vite 7 (frontend build), MaterializeCSS 1.0 (UI), tsx (runtime), Jest 29 with ts-jest (ESM preset)
**Storage**: Google Sheets (single spreadsheet, column-index mapped, 5-minute in-memory cache); two new sheets — `registrations_summer` and `registrations_summer_audit` — created via 013-style runtime migration at app startup
**Testing**: Jest 29.x with ts-jest (ESM preset), Supertest 7.x for integration tests; tests mock `googleSheetsDbClient` per the constitution's Testing section ("Tests MUST mock `googleSheetsDbClient` — never hit the real Sheets API in tests")
**Target Platform**: Google Cloud Platform (single Express server serving API + Vite-bundled frontend)
**Project Type**: Single backend + Vite-bundled frontend in one repository (`src/` for backend, `src/web/` for frontend)
**Performance Goals**: No new perf goals beyond the existing baseline. The grade-bump transform is an in-memory `+1` on an already-cached student list — measured impact MUST be below the 5-minute cache TTL noise floor. The duplicate-student-fetch tradeoff (per-period fetches) is acknowledged in FR-003 and accepted.
**Constraints**: 013 auto-migration runs before `app.listen()` and must succeed for the new sheets to exist before any traffic is served; missing `period` parameter on student-fetch MUST throw (FR-003); no user-facing surface may render the literal string "Summer" for this period (FR-005, SC-005); the FR-005 helper migration is all-or-nothing in the same change (per clarification)
**Scale/Scope**: Small institutional dataset — single MCDS Forte program, low hundreds of families, low thousands of registrations per school year. The `summer` period adds at most one trimester-worth of new rows per year (low hundreds). No scale concerns.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | The feature minimizes new concepts: reuses the existing trimester-period mechanism, reuses the existing modify-via-replace flow, reuses the existing turnover script. The only new infrastructure is the `createSheet()` migration primitive and the period display-name helper — both required by the feature, neither speculative. |
| II. Data Consistency | PASS | The `summer` period is a plain string value, identical across the model, the period config, the sheet names, the API payloads, and the frontend. No value-object wrapping. Grade-bump is a runtime transform on the served response — never written back, never dual-named. |
| III. Single Serialization Path | PASS | No new model added. The grade-bump transform happens at the repository/service boundary inside `getStudents`; `toJSON()` paths on Student are untouched. |
| IV. Uniform API Responses | PASS | No new API endpoints. The students endpoint contract changes (gains required `period` parameter) but its response envelope is unchanged. |
| V. Single Data Fetch Pattern | PASS | Frontend continues to fetch students via `HttpService`. The per-period fetch model just means the `period` parameter is included in the request path/query; no new fetch path. |
| VI. No Dead Code | PASS | FR-007 explicitly removes today's dead code path (the `STUDENT_EMPTY` constant that's defined but never used) by hooking it up to the new empty-state UI. Net: this feature *reduces* dead code, doesn't add any. |
| VII. Shared Models Are the Contract | PASS | `Registration.columns` and `Registration.auditColumns` shared schemas are reused for the new sheets — no schema duplication. Student model has no new fields. |
| VIII. Role-Based Architecture | PASS | No new role-specific endpoints. Parent and admin permissions for `summer` are inherited from the existing per-period permission model. Admin-only drop, parent-only create-and-replace remain unchanged. |
| IX. Trimester-Aware by Default | PASS | This feature *is* the trimester-aware extension to a fourth period. It correctly uses `PeriodService` for period determination, leverages the existing `[currentTrimester, nextTrimester]` mechanism, and stores `summer` data in its own per-trimester sheet. The constitution describes the registration target as derived at runtime by `PeriodService.getEnrollmentTrimesterTable()` from `trimester`, `periodType`, and `startDate` — no schema change needed. For `summer`, the derivation works as documented: during a `summer` enrollment period (held during spring), the table resolves to `registrations_summer` via the existing next-in-sequence logic. |
| X. Google Sheets Is the Database | PASS | The new sheets are created via the 013 migration system at startup (per FR-002 and the Q1 clarification), keeping the existing `googleSheetsDbClient` column-index mapping in sync. The 5-minute cache is invalidated for the relevant trimester sheets after writes (existing behavior — no change needed for `summer`). |
| XI. Uniform CRUD Backend | PASS | No new service methods are added. The grade-bump transform happens inside the existing `getStudents` repository method, gated on the `period` parameter. No feature-named endpoints. The modify-via-replace flow (delete-then-create) uses existing CRUD endpoints. |

**Gate result: PASS** — no violations. Complexity Tracking section unused.

## Project Structure

### Documentation (this feature)

```text
specs/014-summer-registration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (no new API endpoints; mostly contract clarifications)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── database/
│   └── googleSheetsDbClient.ts        # MODIFIED: add 'summer' to trimesters array
├── infrastructure/
│   └── migration/
│       ├── migrationContext.ts         # MODIFIED: add createSheet() primitive
│       └── types.ts                    # MODIFIED: add createSheet() to MigrationContext interface
├── migrations/
│   └── 002-create-summer-sheets.ts    # NEW: creates registrations_summer + audit
├── models/
│   └── shared/
│       └── registration.ts             # UNCHANGED — column schemas reused as-is
├── services/
│   ├── periodService.ts                # MODIFIED: support `summer` in getNextTrimester() mapping
│   └── ...                             # student-fetch chain: required `period` param everywhere
├── controllers/
│   ├── registrationController.ts       # MODIFIED: pass `period` on student-fetch calls
│   └── ...                             # all other callers of getStudents updated to pass period
├── repositories/
│   ├── registrationRepository.ts       # already trimester-parameterized; adds `summer` via array
│   └── userRepository.ts               # MODIFIED: getStudents() requires `period`; applies grade-bump
├── utils/values/
│   └── trimester.ts                    # MODIFIED: add 'summer' to Trimester enum + isValidTrimester()
└── web/
    ├── js/
    │   ├── utilities/
    │   │   └── periodDisplayName.ts    # NEW: FR-005 display-name helper
    │   ├── tabs/
    │   │   ├── parentRegistrationTab.ts # MODIFIED: render FR-006 period heading inline + FR-007 empty-state hookup
    │   │   └── adminRegistrationTab.ts  # MODIFIED: render FR-006 period heading inline (admin parity)
    │   ├── constants/
    │   │   └── registrationFormConstants.ts # UNCHANGED FILE — but the dead STUDENT_EMPTY constant becomes live
    │   └── workflows/
    │       └── parentRegistrationForm.ts # MODIFIED: render empty-state message when no students returned

gas/src/mig/recurring/
└── Migration_REEN006_ChangeTrimester.js # MODIFIED: support spring → summer

.specify/memory/
└── constitution.md                      # MODIFIED (FR-009): three trimesters → four

tests/
├── unit/
│   ├── services/
│   │   └── periodService.test.ts        # MODIFIED: verify summer as next during spring
│   ├── repositories/
│   │   └── userRepository.test.ts       # NEW: grade-bump transform tests
│   └── infrastructure/
│       └── migrationContext.test.ts     # MODIFIED: createSheet primitive tests
└── integration/
    ├── summer-registration.test.ts      # NEW: end-to-end summer registration flow
    └── summer-grade-bump.test.ts        # NEW: SC-002 verification (grade-eligibility)
```

**Structure Decision**: Single Node.js + browser project, following the existing repository layout. No new top-level directories. All changes localize to the touchpoints documented in spec.md (FR-001 through FR-009). Frontend additions live alongside existing `src/web/js/` modules; backend additions live alongside existing services/repositories. The GAS turnover script change is the only out-of-tree work (`gas/src/mig/recurring/`). The constitution amendment (FR-009) touches `.specify/memory/constitution.md` — itemized as a task in the implementation breakdown.

## Complexity Tracking

> No violations — table not needed.
