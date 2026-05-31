<!--
  SYNC IMPACT REPORT
  ==================
  Version change: 2.3.1 → 2.4.0
  Bump rationale: MINOR — adds new Principle XII (Speckit Stays in Speckit
    Spaces). Codifies a rule that was previously implicit: the shipped
    artifact must stand on its own without the speckit workflow. If the
    `specs/` and `.specify/` folders were deleted, every other file in the
    repo must still make sense. Source code, tests, README, CONTRIBUTING.md,
    and docs/ must not cite speckit artifacts (specs, FRs, Principles,
    User Stories) by name or number — they describe what the code does in
    terms of the code itself. Constitutional principles are referenced
    from speckit artifacts (specs/plans/tasks) but never into the shipped
    artifact. `.claude/` is an explicit exception (AI-instruction space).

  Carried forward from 2.3.1: factual update reflecting feature 014's
    addition of a fourth trimester (`summer`). No principle changes; only
    the preamble's "three trimesters" wording and Principle IX's
    per-trimester sheet list updated to include `summer` /
    `registrations_summer`.

  Modified principles: None modified in 2.4.0
  Added principles: XII (Speckit Stays in Speckit Spaces)
  Modified sections: Versioning footer
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed (existing
      Constitution Check section already covers any new principle)
    - .specify/templates/spec-template.md ✅ no changes needed
    - .specify/templates/tasks-template.md ✅ no changes needed
  Follow-up TODOs:
    - The current codebase has pre-existing references to FR-XXX,
      Constitution Principles, and spec numbers in src/, tests/,
      README.md, docs/, and elsewhere (introduced under prior specs,
      notably 014). These are tech debt with respect to Principle XII
      and must be swept. The sweep is scoped to 015-audit-remediation
      User Story 9, which exists specifically to bring the codebase
      into Principle XII compliance.

  ----- Previous version: 2.3.0 → 2.3.1 (carried-forward report below) -----
  Version change: 2.3.0 → 2.3.1
  Bump rationale: PATCH — factual update reflecting feature 014's addition of
    a fourth trimester (`summer`). No principle changes; only the preamble's
    "three trimesters" wording and Principle IX's per-trimester sheet list
    are updated to include `summer` / `registrations_summer`.
  Modified principles: IX (Trimester-Aware by Default)
  Modified sections: Preamble
  Added sections: None
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed
    - .specify/templates/spec-template.md ✅ no changes needed
    - .specify/templates/tasks-template.md ✅ no changes needed
  Follow-up TODOs: None

  ----- Previous version: 2.2.3 → 2.3.0 (carried-forward report below) -----
  Version change: 2.2.3 → 2.3.0
  Bump rationale: MINOR — acknowledges the TypeScript migration as the
    project's primary language (formerly described as "Vanilla JavaScript").
    Also cleans up several smaller drift items in the same change.

  Changes in this version:
    1. Technology Constraints: "Vanilla JavaScript, no framework" → explicit
       TypeScript 5.x framing across backend (ESM via tsx) and frontend
       (bundled by Vite). Acknowledges historical migration via specs 002
       and 008.
    2. Principle V: file extension corrected (`main.js` → `main.ts`); the
       defunct `viewModel` reference is replaced with current frontend
       module categories (tabs/workflows/components) and the dissolution
       noted as historical context (spec 011).
    3. Principle X: `googleSheetsDbClient.js` → `.ts`; method name corrected
       from `clearCache()` to `googleSheetsDbClient.clearAllCache()` /
       `cacheService.clear()`.
    4. Technology Constraints: `serviceContainer.js` → `.ts`.
    5. Versioning & Deployment: `gcpLogger.js` → `.ts`.

  Carries forward from 2.2.3:
    - Principle IX `targetTrimester` removal (the field does not exist; the
      registration table is derived at runtime by
      `PeriodService.getEnrollmentTrimesterTable()`).

  Modified principles: V (Single Data Fetch Pattern), IX (already done in
    2.2.3), X (Google Sheets Is the Database)
  Modified sections: Technology Constraints, Versioning & Deployment
  Added sections: None
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed
    - .specify/templates/spec-template.md ✅ no changes needed
    - .specify/templates/tasks-template.md ✅ no changes needed
  Follow-up TODOs:
    - "Three trimesters" references at lines 25 and 116 will become four
      when feature 014-summer-registration ships. The 014 spec includes
      a task to update the constitution in lockstep with that change.
-->

# Tonic Constitution

Tonic is the student registration management system for Forte, an after-school
music program at MCDS. It manages students, parents, instructors, and admins
across four trimesters (fall, winter, spring, summer), handling lesson
registrations, attendance tracking, and program scheduling.

## Core Principles

### I. Simplicity First

Every change MUST be the minimum required to satisfy the current requirement.

- No speculative features, "future-proofing," or preemptive abstractions
- No configuration options unless explicitly requested
- No edge case handling beyond what was explicitly discussed
- One way to do each thing — if two patterns exist for the same purpose, consolidate to one
- If additional improvements are identified during implementation, STOP and ASK before adding them
- Complexity MUST be justified against a simpler alternative that was considered and rejected

### II. Data Consistency

Every entity MUST have one canonical shape that is identical across all layers.

- IDs are plain strings — no value objects wrapping primitives
- No defensive unwrapping (`id?.value || id`, `typeof id === 'object'`)
- No `extractStringValue` helpers or equivalent coercion functions
- A Student looks the same in the database mapping, the model instance, the API response, and the frontend state
- When comparing IDs, simple `===` string comparison MUST be sufficient
- No dual-name fields (`phone`/`phoneNumber`, `specialties`/`instruments`) — one canonical name per concept

### III. Single Serialization Path

Every model MUST define exactly one `toJSON()` method that produces its canonical shape.

- Express `res.json()` calls `toJSON()` automatically — no additional transform layer
- No competing serialization systems (`UserTransformService`, `toDataObject()`, manual mapping)
- The output of `toJSON()` is the API contract — what it returns is what consumers receive
- No post-serialization transforms in controllers or middleware
- If a model needs different representations for different contexts, that indicates the model is doing too much

### IV. Uniform API Responses

Every API endpoint MUST return `{ success: true, data: <payload> }` on success and `{ success: false, error: { message, code, type } }` on failure.

- No exceptions — including authentication endpoints
- No raw `res.json(value)` bypassing the response envelope
- No endpoints returning unwrapped arrays, nulls, or primitives directly
- The `successResponse()` and `errorResponse()` helpers are the only way to send responses
- Frontend code MUST be able to assume every response follows this envelope

### V. Single Data Fetch Pattern

All frontend API calls MUST go through `HttpService`.

- No direct `fetch()` calls in tabs, workflows, components, `main.ts`, or any other frontend code (the `viewModel` referenced in older docs was dissolved in spec 011)
- No manual response envelope unwrapping (`result.data || result`)
- `HttpService` handles auth headers, envelope unwrapping, and error handling in one place
- If `HttpService` lacks a needed method (PATCH, DELETE, etc.), extend it — do not bypass it

### VI. No Dead Code

Code MUST exist because it is used, not because it might be used.

- No placeholder properties for features that do not exist in the database
- No methods that are never called from any code path
- No empty classes or stub implementations
- No "compatibility" aliases that duplicate existing fields
- No commented-out code kept "for reference"
- If a property is not populated by any data source, it MUST NOT exist on the model

### VII. Shared Models Are the Contract

`src/models/shared/` runs in both Node.js and the browser. This is the single source of truth for entity structure.

- Models in `shared/` MUST work identically in both environments
- Environment-specific behavior (`typeof window !== 'undefined'` guards) MUST be minimized and documented when unavoidable
- Frontend code imports models from `/models/shared/` via Express static serving and Vite path aliases — do not duplicate model logic on either side
- Constructor signatures MUST use a single `constructor(data)` pattern (data object, not positional args) for consistency across all models
- Factory methods (`fromDatabaseRow`, `fromApiData`) MUST return model instances with the same shape regardless of input source

### VIII. Role-Based Architecture

The application serves three distinct user roles: admin, instructor, parent. Each role has its own views, permissions, and data scope.

- Tab-specific API endpoints (`/api/{role}/tabs/{tab-name}`) return exactly the data that tab needs — no over-fetching
- Role-specific logic lives in controllers and tab endpoints, not in models
- Auth middleware extracts the current user from access code headers; controllers use `req.currentUser` to scope data
- Admin endpoints MUST be under `/api/admin/`; role checks MUST happen at the controller level
- New features MUST specify which role(s) they apply to

### IX. Trimester-Aware by Default

The application operates on a trimester cycle (fall → winter → spring → fall). Registration data is partitioned by trimester.

- Each trimester has its own registration sheet (`registrations_fall`, `registrations_winter`, `registrations_spring`, `registrations_summer`)
- `PeriodService` determines the current trimester and period type; four period types exist per trimester cycle:
  - `intent` — parents indicate keep/drop/change for existing lessons
  - `priorityEnrollment` — returning families get priority access to next trimester
  - `openEnrollment` — all families can register for next trimester
  - `registration` — normal active instruction period
- The `periods` table has `trimester`, `periodType`, and `startDate`; the registration table to write to is derived at runtime from these by `PeriodService.getEnrollmentTrimesterTable()` (during enrollment periods, the next trimester in sequence; during instruction, the current trimester)
- Current period is determined by the latest `startDate` <= now (no end dates, no `isActive` flag)
- Enrollment operations target the next trimester's table during enrollment periods, the current trimester during instruction
- New features that touch registration data MUST specify which trimester(s) they operate on
- Period-dependent behavior MUST go through `PeriodService`, not hardcoded date checks

### X. Google Sheets Is the Database

All persistence is through Google Sheets API v4. There is no ORM or external schema enforcement.

- Schema evolution is managed through idempotent migration scripts (`src/migrations/`) that run on app startup and are tracked in a `_migrations` sheet
- The column-index mapping in `googleSheetsDbClient.ts` is the runtime schema — migrations keep it in sync with the spreadsheet
- All reads go through `getAllRecords()` with a 5-minute in-memory cache
- Writes find the target row by scanning all records for a matching ID, then update that specific row
- The database layer MUST return plain objects or model instances — no Sheets API artifacts leak to callers
- Cache invalidation after writes is handled by `googleSheetsDbClient.clearAllCache()` (delegating to `cacheService.clear()`) — new features that write data MUST invalidate relevant caches
- There is one spreadsheet per environment (production, staging) — do not assume multi-database support

### XI. Uniform CRUD Backend

The backend is a generic application server. Every entity flows through the same CRUD patterns — no entity is special enough to deserve custom persistence, mutation, or routing conventions.

- Service methods MUST use CRUD terminology (`create`, `findById`, `update`, `delete`) — not UI or domain feature names (`cancel`, `enroll`, `submit`) that just wrap a single CRUD call
- If a service method does nothing beyond calling one repository method with the same arguments, it MUST NOT exist — the controller calls the repository operation directly or uses a generic service method
- Routes MUST follow REST conventions (`POST /registrations`, `DELETE /registrations/:trimester/:id`) — not feature-named endpoints (`/cancel-registration`, `/enroll-student`)
- All repositories MUST expose the same base interface (`create`, `findById`, `findAll`, `update`, `delete`) — entity-specific query methods are allowed only when they represent genuinely different data access patterns, not renamed CRUD
- Controllers MUST NOT contain business logic beyond request parsing, authorization, and response formatting — they delegate to services or repositories
- No layer may skip its adjacent layer to "help" a specific feature — controllers call services, services call repositories, repositories call the database client
- The backend MUST NOT model itself around frontend feature names, screen names, or user-facing workflows — it serves data through uniform resource endpoints that any client could consume

### XII. Speckit Stays in Speckit Spaces

The speckit workflow (`specs/`, `.specify/`, `.claude/`) is AI-assist scaffolding. The shipped artifact MUST stand on its own without it.

- If `specs/` and `.specify/` were deleted, every other file in the repository MUST still make sense to a reader.
- Source code (`src/`, `tests/`) MUST NOT reference specs, FRs, NFRs, Constitution Principles, User Stories, or any other speckit artifact by name or number. Comments describe what the code does and why in terms of the code itself.
- Shipped documentation (`README.md`, `CONTRIBUTING.md`, `docs/`, build/CI files, scripts) MUST NOT reference speckit either. The `docs/` tree is the shipped reference; it describes the system, not how the system came to be specified.
- When a comment or doc previously said "(per FR-003)" or "routed to spec 017," it MUST be rewritten to state the underlying rule directly, or removed if the citation was the only meaning.
- The constitution itself (`.specify/memory/constitution.md`) is the source of truth for these principles and SHOULD be referenced from speckit artifacts (specs, plans, tasks). It MUST NOT be cited from `src/`, `tests/`, `README.md`, or `docs/`.
- Exceptions: `.claude/CLAUDE.md` MAY reference speckit because it is AI-instruction space. Tests that exist specifically to verify speckit machinery (if any ever exist) MAY reference it.

## Technology Constraints

- **Runtime**: Node.js with ES modules
- **Server**: Express v4
- **Database**: Google Sheets API v4 (single spreadsheet, column-index mapped)
- **Language**: TypeScript 5.x targeting ES2022 across backend and frontend (the backend runs as ESM via `tsx`; the frontend is bundled by Vite). The codebase was historically vanilla JavaScript and was migrated to TypeScript in specs 002 (backend) and 008 (frontend); there is no transpilation step the developer hand-writes for runtime — `tsx` for the server, Vite for the browser
- **Frontend**: No UI framework — MaterializeCSS for UI components, hand-written TypeScript
- **Build**: Vite for frontend bundling, Nodemon for dev server
- **Deployment**: Google Cloud Platform
- **Auth**: Access-code based (6-digit for employees, 10-digit phone for parents; stored in localStorage, sent via `x-access-code` and `x-login-type` headers)
- **Shared models**: `src/models/shared/` served to both Node.js and browser
- **DI**: Homegrown service container with lazy singleton instantiation (`src/infrastructure/container/serviceContainer.ts`)
- No framework migrations are planned — work within the existing stack

## Testing

- Unit tests live in `tests/unit/`, integration tests in `tests/integration/`
- Tests use Jest with ES module support
- Integration tests use Supertest against the Express app
- Tests MUST mock `googleSheetsDbClient` — never hit the real Sheets API in tests
- New features MUST include tests for business logic; controller-level integration tests are encouraged for new endpoints
- Existing tests MUST pass before merge — do not disable tests to work around failures
- When API endpoints are added, changed, or removed, the Postman collection (`scripts/postman/tonic-api.postman_collection.json`) MUST be updated to match

## Versioning & Deployment

- Version is auto-incremented via `scripts/version-manager.sh` during build
- Build pipeline: `npm run build:staging` (check:all + build:frontend + auto-version)
- Frontend is bundled by Vite with hashed filenames for cache busting into `dist/web/`
- The Express server serves both the API and the bundled frontend from a single process
- Deployment targets GCP — structured logging via `gcpLogger.ts` is required for production error visibility

## Development Workflow

- All feature work follows the speckit pipeline: specify → plan → tasks → implement
- Feature branches follow the `###-feature-name` naming convention
- Specs live in `specs/<branch-name>/` with `spec.md`, `plan.md`, `tasks.md`
- Each feature MUST be independently testable before merge
- Constitution principles are validated at plan phase (Constitution Check gate)
- Violations MUST be justified with a documented simpler-alternative rejection

## Governance

- This constitution supersedes all other development practices for Tonic
- Amendments require: documented rationale, version increment, sync impact report
- Version follows semantic versioning: MAJOR (principle removal/redefinition), MINOR (new principle/section), PATCH (clarifications)
- All implementation plans MUST include a Constitution Check section verifying compliance
- Complexity added in violation of these principles MUST include a Complexity Tracking entry justifying the deviation

**Version**: 2.4.0 | **Ratified**: 2026-02-18 | **Last Amended**: 2026-05-31
