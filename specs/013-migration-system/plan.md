# Implementation Plan: Google Sheets Migration System

**Branch**: `013-migration-system` | **Date**: 2026-03-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/013-migration-system/spec.md`

## Summary

Add a startup migration runner that scans `src/migrations/` for TypeScript migration files, compares them against a `_migrations` tracking sheet in Google Sheets, and executes any unrun migrations in numeric order before the app starts accepting traffic. Migrations receive a `MigrationContext` providing thin helpers over the Sheets API (`getSheetHeaders`, `addColumn`, `readAllRows`, `updateCell`, `batchUpdateColumn`). Failed migrations block app startup and log via the GCP structured logger.

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022, Node.js ESM
**Primary Dependencies**: Express 4, googleapis (Google Sheets API v4), tsx (runtime)
**Storage**: Google Sheets (single spreadsheet, column-index mapped) — new `_migrations` sheet for tracking
**Testing**: Jest 29.x with ts-jest (ESM preset), supertest 7.x
**Target Platform**: Google Cloud Run (Node.js server)
**Project Type**: Single project (backend-only feature, no frontend changes)
**Performance Goals**: <100ms startup overhead when zero pending migrations (one Sheets read)
**Constraints**: Must complete before `app.listen()`; sequential execution (no parallel migrations)
**Scale/Scope**: ~5-20 migration files over the project lifetime; single spreadsheet per environment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Migration runner is minimum viable: scan files, check tracking sheet, run unexecuted, record result. No rollback system, no CLI, no dry-run mode. |
| II. Data Consistency | PASS | Migration records have one canonical shape (`id`, `filename`, `executedAt`, `durationMs`, `status`). No dual-name fields. |
| III. Single Serialization Path | N/A | Migration records are not API-served entities; they exist only in the `_migrations` sheet. |
| IV. Uniform API Responses | N/A | No new API endpoints. Migration system is internal startup infrastructure. |
| V. Single Data Fetch Pattern | N/A | No frontend changes. |
| VI. No Dead Code | PASS | All migration infrastructure is used by the startup runner. No placeholder methods. |
| VII. Shared Models Are the Contract | N/A | Migration types are backend-only; no shared model needed. |
| VIII. Role-Based Architecture | N/A | No role-specific views or endpoints. |
| IX. Trimester-Aware by Default | PASS | Migrations that operate on trimester-specific sheets (e.g., `registrations_fall`) are authored per-migration — the runner itself is trimester-agnostic. |
| X. Google Sheets Is the Database | PASS | Directly aligned — this principle was updated to describe the migration system. Uses Sheets API for tracking and schema changes. |
| XI. Uniform CRUD Backend | PASS | Migration runner does not add API endpoints or service layers. It operates at the infrastructure level during startup, below the CRUD layer. |

**Gate result: PASS** — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/013-migration-system/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (no API contracts — internal system)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── migrations/                        # Migration files directory
│   └── 001-example-migration.ts       # Example: first migration file (added per-feature)
├── infrastructure/
│   ├── container/
│   │   └── serviceContainer.ts        # MODIFIED: call migration runner during initialize()
│   └── migration/
│       ├── migrationRunner.ts         # Core runner: scan, diff, execute, record
│       ├── migrationContext.ts        # MigrationContext: thin Sheets API helpers
│       └── types.ts                   # MigrationFile, MigrationRecord interfaces
├── app.ts                             # MODIFIED: await migrations in initializeApp()
└── database/
    └── googleSheetsDbClient.ts        # EXISTING: used by MigrationContext for Sheets operations

tests/
├── unit/
│   └── infrastructure/
│       ├── migrationRunner.test.ts    # Runner logic: scan, diff, execute, record, failure handling
│       └── migrationContext.test.ts   # Context helpers: getSheetHeaders, addColumn, etc.
└── integration/
    └── migration.test.ts              # End-to-end: startup with pending migrations
```

**Structure Decision**: Migration infrastructure lives in `src/infrastructure/migration/` alongside the existing service container, following the pattern of non-domain infrastructure code. Migration files themselves live in `src/migrations/` at the source root level for easy discovery (per FR-001). No new repository or service layer — the runner operates directly on the Sheets API client.

## Complexity Tracking

> No violations — table not needed.
