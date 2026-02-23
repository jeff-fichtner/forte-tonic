# Implementation Plan: Backend Complexity Reduction

**Branch**: `007-backend-complexity-reduction` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-backend-complexity-reduction/spec.md`

## Summary

Reduce unnecessary complexity by consolidating duplicated patterns (repository boilerplate, trimester logic, config reading, type definitions), simplifying over-engineered abstractions (error hierarchies, factory methods, dual-mode constructors), removing confirmed dead code (8 unused methods/interfaces), improving type safety (18 → 0 double-casts), and addressing questionable assumptions (hard-coded session count, browser globals in backend models).

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022
**Primary Dependencies**: Express 4, Google Sheets API v4
**Storage**: Google Sheets (single spreadsheet, column-index mapped, 5-min in-memory cache)
**Testing**: Jest 29.x with `ts-jest` ESM preset, `node --experimental-vm-modules`
**Target Platform**: Node.js server (ESM) + Express static serving to browser
**Project Type**: Web application (monorepo: backend + frontend shared models)
**Performance Goals**: No performance changes — pure refactoring
**Constraints**: Zero behavioral changes. All existing tests must pass. No API contract changes.
**Scale/Scope**: ~19 files modified across repositories, services, models, controllers, and their tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | **ALIGNED** | This feature directly enforces "one way to do each thing" |
| II. Data Consistency | **ALIGNED** | Fixing type misalignments ensures one canonical shape |
| III. Single Serialization Path | **NO CHANGE** | toJSON() paths unchanged |
| IV. Uniform API Responses | **NO CHANGE** | Response envelope unchanged |
| V. Single Data Fetch Pattern | **NO CHANGE** | HttpService unchanged |
| VI. No Dead Code | **ALIGNED** | Removing 9 confirmed dead methods/interfaces |
| VII. Shared Models Are the Contract | **ALIGNED** | Fixing dual-mode constructor to single `constructor(data)` |
| VIII. Role-Based Architecture | **NO CHANGE** | Role structure unchanged |
| IX. Trimester-Aware by Default | **ALIGNED** | Consolidating trimester logic into PeriodService |
| X. Google Sheets Is the Database | **NO CHANGE** | DB layer unchanged |

**Gate result**: PASS — all changes align with or are neutral to constitution principles. No violations to justify.

**Post-design re-check**: PASS — no design decisions introduced any constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/007-backend-complexity-reduction/
├── plan.md              # This file
├── research.md          # Research findings and decisions
├── quickstart.md        # Verification scenarios
└── tasks.md             # Task breakdown (via /speckit.tasks)
```

Note: No `data-model.md` or `contracts/` — this is a pure refactoring feature with no new entities or API endpoints.

### Source Code (files modified)

```text
src/
├── common/
│   └── errors.ts                              # Existing — used to replace drop request errors
├── config/
│   └── environment.ts                         # Modified — becomes canonical config source
├── controllers/
│   └── userController.ts                      # Modified — delegate trimester logic to PeriodService
├── infrastructure/
│   └── container/
│       └── serviceContainer.ts                # Modified — remove unused methods
├── models/shared/
│   ├── admin.ts                               # Modified — remove fromApiData
│   ├── class.ts                               # Modified — fix Date→string types, remove window read
│   ├── instructor.ts                          # Modified — remove fromApiData
│   ├── parent.ts                              # Modified — remove fromApiData
│   └── responses/
│       ├── appConfigurationResponse.ts        # Modified — remove dead accessors, fromApiData, window
│       └── authenticatedUserResponse.ts       # Modified — single constructor, remove window, remove hasPermission
├── repositories/
│   ├── attendanceRepository.ts                # Modified — fix hard-coded 12, fix casts
│   ├── baseRepository.ts                      # Modified — remove IRepository, fix convertToModel
│   ├── dropRequestRepository.ts               # Modified — extract shared _getAll, fix casts
│   ├── index.ts                               # Modified — remove IRepository export
│   └── registrationRepository.ts              # Modified — extract shared _fetchRegistrations, fix casts
├── services/
│   ├── configurationService.ts                # Modified — delegate to environment.ts
│   ├── dropRequestService.ts                  # Modified — replace error hierarchy with common errors
│   ├── periodService.ts                       # Modified — export trimester cycling, add getPreviousTrimester
│   ├── registrationApplicationService.ts      # Modified — import shared RegistrationInput, fix casts
│   └── registrationValidationService.ts       # Modified — export RegistrationInput type
└── web/js/
    └── viewModel.ts                           # Modified — replace fromApiData with constructor

tests/
└── unit/
    ├── repositories/
    │   ├── attendanceRepository.test.ts        # Updated for session count change
    │   └── dropRequestRepository.test.ts       # Updated for error class changes
    ├── services/
    │   ├── dropRequestService.test.ts          # Updated for error class changes
    │   └── registrationApplicationService.test.ts  # Updated for type changes
    └── groupRegistrationService.test.ts        # Minor updates
```

**Structure Decision**: No structural changes. All modifications are within existing files. No new files created (except moving a type export).

## Implementation Strategy

### Phase ordering

Work proceeds in 4 phases matching the spec's user stories, ordered by risk and dependency:

1. **US1 (P1): Consolidate duplicated patterns** — Highest impact, safe refactoring with clear before/after. Each consolidation is independent.
2. **US2 (P2): Simplify abstractions** — Depends on error class consolidation (which benefits from US1 being done). Dead code removal is safe at any point.
3. **US3 (P3): Type safety** — Some casts are eliminated by US1/US2 work (e.g., window removal). Remaining casts require careful type alignment.
4. **US4 (P4): Assumptions and vestigial patterns** — Independent cleanup items, safe to do last.

### Key decisions from research

| Decision | Reference | Rationale |
|----------|-----------|-----------|
| Extract `_fetchRegistrations` in RegistrationRepository | R1 | 7 identical inline mappers → 1 shared method |
| Extract `_getAllDropRequests` in DropRequestRepository | R2 | 5 identical fetch calls → 1 shared method |
| Consolidate trimester logic into PeriodService | R3 | UserController version has a silent bug; PeriodService is canonical owner |
| Export RegistrationInput from validation service | R4 | Minimum change: export existing type, import elsewhere |
| ConfigurationService delegates to environment.ts | R5 | environment.ts already has structured per-env configs |
| Map drop request errors to common errors 1:1 | R6 | Same statusCodes, controller checks statusCode not class name |
| Delete 8 dead methods/interfaces (R7) | R7 | Zero callers confirmed by exhaustive search (Room.displayName excluded — used by toJSON) |
| Replace 2 fromApiData call sites, delete 4 methods | R8 | Only 2 callers total; constructors already accept the same args |
| Convert 1 AuthenticatedUserResponse caller to object form | R9 | Only 1 call site (userController:292) |
| Remove window writes, investigate window read in class.ts | R10 | 2 writes are debug-only; 1 read needs investigation |
| Fix casts by category (R11) | R11 | 18 casts grouped into 7 root causes; 3 removed by window cleanup |
| Derive session count from attendance data | R12 | Hard-coded 12 is incorrect for variable-length trimesters |
