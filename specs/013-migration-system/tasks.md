# Tasks: Google Sheets Migration System

**Input**: Design documents from `/specs/013-migration-system/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Included — plan.md specifies test files and SC-003 requires integration test verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Create migration infrastructure directory and type definitions

- [x] T001 Create migration types (`MigrationModule`, `DiscoveredMigration`, `MigrationRecord`, `MigrationContext` interface, `MIGRATION_COLUMNS`) in `src/infrastructure/migration/types.ts`
- [x] T002 Create empty `src/migrations/` directory with a `.gitkeep` file

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Expose Sheets API internals from `GoogleSheetsDbClient` so `MigrationContext` can use them

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Expose `sheets` API client and `spreadsheetId` from `GoogleSheetsDbClient` as readonly properties (or getter methods) in `src/database/googleSheetsDbClient.ts` — the `MigrationContext` needs direct access to `sheets.spreadsheets.batchUpdate()`, `sheets.spreadsheets.get()`, and `sheets.spreadsheets.values.*` for structural operations that don't go through CRUD methods

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 — Run Pending Migrations on Startup (Priority: P1) MVP

**Goal**: On startup, scan `src/migrations/` for migration files, compare against `_migrations` tracking sheet, execute unrun migrations in order, record successes, and block startup on failure.

**Independent Test**: Start the app with a mock migration file. Verify it executes before `app.listen()` and is recorded in `_migrations`. Verify a failing migration causes `process.exit(1)`.

### Tests for User Story 1

- [x] T004 [P] [US1] Create unit tests for `MigrationRunner` in `tests/unit/infrastructure/migrationRunner.test.ts` — test: discover migration files from directory (mock `fs.readdir` + dynamic `import()`), diff discovered vs already-run IDs, execute pending migrations sequentially, record success in `_migrations` sheet (mock Sheets API `values.append`), auto-create `_migrations` sheet if missing (mock `spreadsheets.get` + `spreadsheets.batchUpdate` with `addSheet`), log and throw on migration failure (do NOT record), handle zero pending migrations (no-op), validate migration module exports (`id` string + `migrate` function)
- [x] T005 [P] [US1] Create integration test in `tests/integration/migration.test.ts` — test: `initializeApp()` runs pending migrations before returning (mock Sheets API, provide test migration file), failed migration prevents app startup (SC-003), all existing tests still pass with migration system present (SC-004)

### Implementation for User Story 1

- [x] T006 [US1] Implement `MigrationRunner` in `src/infrastructure/migration/migrationRunner.ts` — `runPendingMigrations(dbClient)` function that: (1) checks if `_migrations` sheet exists via `spreadsheets.get` with `fields: 'sheets.properties'`, (2) auto-creates it with `addSheet` + writes header row if missing, (3) reads existing migration records from `_migrations` to get set of already-run IDs, (4) scans `src/migrations/` with `fs.readdir` (resolve path relative to project root via `import.meta.url` — the app runs via `tsx` so source `.ts` files are loaded directly; note: concurrent migration execution is unsupported and assumes single-instance startup per Cloud Run cold start model), filters `.ts`/`.js` files with numeric prefix, sorts by filename, (5) dynamically `import()`s each file and validates it exports `id: string` and `migrate: Function`, (6) diffs discovered migrations against already-run set, (7) executes each pending migration sequentially — creates a `MigrationContext` instance, calls `migrate(ctx)`, times execution, (8) on success: appends record (`id`, `filename`, `executedAt`, `durationMs`, `success`) to `_migrations` via `values.append`, (9) on failure: logs error via GCP structured logger, throws (does NOT record), (10) logs each migration start/success/failure/duration via GCP structured logger
- [x] T007 [US1] Integrate migration runner into app startup in `src/app.ts` — add `await runPendingMigrations(serviceContainer.dbClient)` call inside `initializeApp()` after `serviceContainer.initialize()` completes. Import `runPendingMigrations` from `src/infrastructure/migration/migrationRunner.ts`. Error propagation to `server.ts` catch block handles `process.exit(1)`.
- [x] T008 [US1] Create barrel export in `src/infrastructure/migration/index.ts` — re-export `runPendingMigrations` from `migrationRunner.ts` and types from `types.ts`

**Checkpoint**: Migration runner works end-to-end. Pending migrations execute on startup, successes are recorded, failures block the app. `MigrationContext` at this point only needs a minimal stub (empty implementation or pass-through) since US1 acceptance scenarios don't require schema/data operations — they just need the runner to call `migrate(ctx)` and not throw.

---

## Phase 4: User Story 2 — Schema Migrations: Add Columns (Priority: P2)

**Goal**: `MigrationContext` provides `getSheetHeaders()` and `addColumn()` methods so migration scripts can add columns at specific positions and seed them with default values. Also provides `readAllRows()` and `batchUpdateColumn()` for seeding.

**Independent Test**: Write a migration that calls `addColumn('registrations_fall', 'roomId', { after: 'instrument' })`. Mock Sheets API, verify `insertDimension` is called with correct column index and header is written.

### Tests for User Story 2

- [x] T009 [P] [US2] Create unit tests for `MigrationContext` schema operations in `tests/unit/infrastructure/migrationContext.test.ts` — test: `getSheetHeaders(sheetName)` reads row 1 via `values.get` and returns string array, `addColumn(sheetName, colName, { after })` resolves `after` column to index via `getSheetHeaders`, calls `insertDimension` with correct `sheetId`/`startIndex`/`endIndex`, writes header cell via `values.update`, returns new column 0-based index, `addColumn` without `after` option appends column at end, `readAllRows(sheetName)` reads all rows starting at row 2 and maps to `Record<string, string>` using headers, `batchUpdateColumn(sheetName, colIndex, values)` writes values down a column via `values.update` with correct range

### Implementation for User Story 2

- [x] T010 [US2] Implement `MigrationContext` class in `src/infrastructure/migration/migrationContext.ts` — constructor receives `sheets` API client and `spreadsheetId`. Implement: `getSheetHeaders(sheetName)` — `values.get` for range `{sheetName}!1:1`, return `values[0] ?? []`. `addColumn(sheetName, columnName, options?)` — call `getSheetHeaders` to find `after` column index, get numeric `sheetId` via `spreadsheets.get` with `fields: 'sheets.properties'`, call `batchUpdate` with `insertDimension` (COLUMNS, startIndex = afterIndex + 1), write header via `values.update` at the new column position row 1, return new column index. `readAllRows(sheetName)` — call `getSheetHeaders` then `values.get` for `{sheetName}!A2:{lastCol}`, map each row to `Record<string, string>` using header array. `batchUpdateColumn(sheetName, colIndex, values)` — convert colIndex to column letter, `values.update` for range `{sheetName}!{letter}2:{letter}{2+values.length-1}` with column data.
- [x] T011 [US2] Wire `MigrationContext` into `MigrationRunner` in `src/infrastructure/migration/migrationRunner.ts` — replace any stub/minimal context with the real `MigrationContext` class instantiation, passing `sheets` and `spreadsheetId` from `dbClient`

**Checkpoint**: Schema migration capability is fully functional. A migration file can call `addColumn` to insert a column at a specific position and `batchUpdateColumn` to seed it with values.

---

## Phase 5: User Story 3 — Data Transform Migrations (Priority: P3)

**Goal**: `MigrationContext` provides `updateCell()` so migration scripts can read rows and transform individual cell values.

**Independent Test**: Write a test migration that reads all rows via `readAllRows`, transforms a value, and writes it back via `updateCell`. Verify the correct Sheets API call is made.

### Tests for User Story 3

- [x] T012 [P] [US3] Add `updateCell` tests to `tests/unit/infrastructure/migrationContext.test.ts` — test: `updateCell(sheetName, row, col, value)` converts row (1-based) and col (0-based) to A1 notation and calls `values.update` with correct range and value, verify correct cell address for edge cases (column > 25 = multi-letter)

### Implementation for User Story 3

- [x] T013 [US3] Implement `updateCell` method in `src/infrastructure/migration/migrationContext.ts` — convert 0-based `col` to column letter (reuse `getColumnLetter` logic from `googleSheetsDbClient.ts` or import as utility), build range `{sheetName}!{letter}{row}`, call `values.update` with `valueInputOption: 'RAW'` and `requestBody: { values: [[value]] }`

**Checkpoint**: All MigrationContext methods are implemented. Migration scripts can perform schema changes (add columns), seed data (batch write), and transform existing data (read + update cells).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify all success criteria and ensure no regressions

- [x] T014 Run all existing tests to verify no regressions (SC-004) — `npm test`
- [x] T015 Run `npm run build` to verify TypeScript compilation succeeds with new files
- [x] T016 Verify quickstart.md examples match the implemented API signatures in `src/infrastructure/migration/migrationContext.ts` and `src/infrastructure/migration/migrationRunner.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist)
- **US1 (Phase 3)**: Depends on Phase 2 — core runner, the backbone
- **US2 (Phase 4)**: Depends on Phase 3 — context methods used by runner
- **US3 (Phase 5)**: Depends on Phase 4 — adds `updateCell` to existing context
- **Polish (Phase 6)**: Depends on all user stories

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational. No other story dependencies. This is the MVP.
- **User Story 2 (P2)**: Depends on US1 (runner must exist to execute migrations with context methods). Adds schema-change context methods.
- **User Story 3 (P3)**: Depends on US2 (`readAllRows` from US2 is needed for data transforms). Adds `updateCell` method.

### Within Each User Story

- Tests written first (where marked [P], in parallel)
- Implementation follows tests
- Context wiring after context implementation (US2 T011)

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T004 and T005 can run in parallel (different test files)
- T009 and T012 target the same test file but are in different phases — run sequentially
- T014 and T015 can run in parallel (different commands)

---

## Parallel Example: User Story 1

```bash
# Write both test files in parallel:
Task T004: "Unit tests for MigrationRunner in tests/unit/infrastructure/migrationRunner.test.ts"
Task T005: "Integration test in tests/integration/migration.test.ts"

# Then implement sequentially:
Task T006: "Implement MigrationRunner in src/infrastructure/migration/migrationRunner.ts"
Task T007: "Integrate into app startup in src/app.ts"
Task T008: "Create barrel export in src/infrastructure/migration/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003)
3. Complete Phase 3: User Story 1 (T004-T008)
4. **STOP and VALIDATE**: Migration runner executes on startup, records successes, blocks on failure
5. The migration system is usable at this point — migrations can run arbitrary code via `migrate(ctx)` even without full context helper methods

### Incremental Delivery

1. Setup + Foundational → Types and DB access ready
2. User Story 1 → Runner works, migrations execute → MVP complete
3. User Story 2 → Schema changes and seeding available → Primary use case enabled
4. User Story 3 → Data transforms available → Full feature complete
5. Polish → Verify regressions, build, documentation alignment

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story builds on the previous one (US2 adds context methods to US1's runner, US3 adds one more method to US2's context)
- This feature has a linear dependency chain (US1 → US2 → US3) rather than parallel stories, because each story extends the same `MigrationContext` object
- Commit after each task or logical group
- Stop at any checkpoint to validate the current story independently
