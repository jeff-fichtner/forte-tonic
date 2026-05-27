# Feature Specification: Google Sheets Migration System

**Feature Branch**: `013-migration-system`
**Created**: 2026-03-02
**Status**: Implemented
**Input**: User description: "A migration system for Google Sheets that runs on app startup, similar to SQL auto-migration. Tracks migrations in a dedicated sheet, runs unexecuted migrations in order, and blocks app startup on failure."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run Pending Migrations on Startup (Priority: P1)

When the application starts, it checks for migration files that haven't been executed yet and runs them in order before accepting traffic. If a migration fails, the app does not start.

**Why this priority**: Without this, no other migration functionality matters. This is the core loop.

**Independent Test**: Start the app with a migration file that adds a column to a test sheet. Verify the column exists after startup and the migration is recorded as complete.

**Acceptance Scenarios**:

1. **Given** a migration file exists in `src/migrations/` that has not been recorded in the `_migrations` sheet, **When** the app starts, **Then** the migration runs before `app.listen()` and its ID, timestamp, and status are recorded in `_migrations`.
2. **Given** all migration files have already been recorded as successful in `_migrations`, **When** the app starts, **Then** no migrations run and startup proceeds normally.
3. **Given** a migration file throws an error during execution, **When** the app starts, **Then** the error is logged, the migration is NOT marked as successful, and the app process exits with a non-zero code.

---

### User Story 2 - Schema Migrations: Add Columns (Priority: P2)

Migration scripts can add new columns to existing sheets and seed them with default or computed values.

**Why this priority**: This is the primary use case — evolving the sheet schema as the application changes (e.g., adding `roomId` to registration sheets).

**Independent Test**: Write a migration that adds a column to a sheet and populates it with a default value. Run the app, verify the column exists and has the expected values.

**Acceptance Scenarios**:

1. **Given** a migration that calls `addColumn('registrations_fall', 'roomId', { after: 'instrument' })`, **When** the migration runs, **Then** the column header is inserted at the correct position in the sheet.
2. **Given** a migration that seeds a new column with a computed value based on existing data, **When** the migration runs, **Then** all existing rows have the computed value in the new column.

---

### User Story 3 - Data Transform Migrations (Priority: P3)

Migration scripts can read existing data and transform it — reformatting values, splitting fields, or computing derived data.

**Why this priority**: Builds on schema migrations. Needed when a data format changes (e.g., converting time formats, normalizing IDs).

**Independent Test**: Write a migration that reads all rows in a sheet and reformats a column value. Verify transformed data is correct.

**Acceptance Scenarios**:

1. **Given** a migration that transforms existing `startTime` values from `"2:00 PM"` to `"14:00"` format, **When** the migration runs, **Then** all rows in the target sheet have the reformatted value.
2. **Given** a migration that encounters a row with an unexpected value during transformation, **When** the migration logs a warning, **Then** the row is skipped (not corrupted) and the migration can still succeed.

---

### Edge Cases

- What happens if a migration partially completes (e.g., column added but seeding fails)? The migration is NOT marked as successful, so it re-runs on next startup. Migrations MUST be written idempotently so re-runs are safe (e.g., "add column if not present", "set value if empty").
- What happens if two instances of the app start simultaneously? Google Sheets has no row-level locking, so concurrent migration execution is undefined. For Cloud Run, this is mitigated by the single-instance cold start model. The spec does not require distributed locking — document the constraint.
- What happens if a migration file is deleted after it ran? The `_migrations` sheet retains the record. No effect — already-run migrations are simply skipped.
- What happens if migration files are reordered? Migrations are sorted by their numeric prefix (e.g., `001-`, `002-`). Changing file order after execution has no effect on already-run migrations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST scan a `src/migrations/` directory for migration files on startup.
- **FR-002**: Migration files MUST be TypeScript modules with a numeric prefix for ordering (e.g., `001-add-room-to-registrations.ts`) and MUST export a `migrate` function and a string `id`. The same PR that adds a migration file MUST also update the corresponding model `columns` arrays and any dependent code — the migration changes the spreadsheet, the code changes make the app use it.
- **FR-003**: System MUST read a `_migrations` sheet from the Google Sheets spreadsheet to determine which migrations have already run. If the `_migrations` sheet does not exist, the migration runner MUST auto-create it (with header row) before proceeding.
- **FR-004**: System MUST execute unrun migrations in numeric prefix order, sequentially (not in parallel).
- **FR-005**: On successful completion, the system MUST record the migration ID, timestamp, and `success` status in the `_migrations` sheet.
- **FR-006**: On failure, the system MUST log the error via the GCP structured logger, NOT record the migration as successful, and terminate the process before `app.listen()`. All migration logging (start, success, failure, duration) MUST use the existing GCP structured logger for Cloud Run visibility.
- **FR-007**: Migrations MUST be written idempotently — safe to re-run if a previous attempt partially completed.
- **FR-008**: The migration runner MUST have access to the Google Sheets API client to read/write sheet data, add columns, and read sheet metadata.
- **FR-009**: System MUST NOT start accepting HTTP traffic until all pending migrations have completed successfully.
- **FR-010**: Migration files MUST be able to perform schema changes (add columns), seed data (set default values), and transform existing data (reformat values).

### Key Entities

- **Migration File**: A TypeScript module in `src/migrations/` with a numeric prefix, exporting `id: string` and `migrate(context: MigrationContext): Promise<void>`. The `id` is a stable identifier (e.g., `"001-add-room-column"`) used for tracking.
- **Migration Record**: A row in the `_migrations` sheet with columns: `id`, `filename`, `executedAt`, `durationMs`, `status`. Written after successful execution.
- **MigrationContext**: An object passed to each migration's `migrate()` function, providing thin helper methods over the Sheets API: `getSheetHeaders(sheetName)`, `addColumn(sheetName, columnName, options)`, `readAllRows(sheetName)`, `updateCell(sheetName, row, col, value)`, `batchUpdateColumn(sheetName, colIndex, values)`. Keeps migrations readable without requiring direct Sheets API knowledge.

## Clarifications

### Session 2026-03-03

- Q: How should column-index mappings stay in sync with migration-added columns? → A: Developer updates model `columns` arrays in the same PR as the migration file. The migration changes the spreadsheet; the code deploy in the same PR adds the column to the model. On first boot, migration runs → spreadsheet updated → new code works.
- Q: How should the `_migrations` sheet be bootstrapped? → A: The migration runner auto-creates the `_migrations` sheet on first run if it doesn't exist. No manual setup needed per environment.
- Q: What level of abstraction should `MigrationContext` provide? → A: Thin helper methods wrapping the Sheets API — `getSheetHeaders()`, `addColumn()`, `readAllRows()`, `updateCell()`, `batchUpdateColumn()`. Readable without needing Sheets API internals, but not a high-level DSL.
- Q: Should migrations log via structured GCP logger or console output? → A: Use the existing GCP structured logger (same as rest of app). Provides severity levels and Cloud Run visibility with no new infrastructure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: App startup with zero pending migrations adds less than 100ms overhead (one Sheets read to check `_migrations`).
- **SC-002**: A new migration can be authored by creating a single file in `src/migrations/` — no other files need to be modified.
- **SC-003**: A failed migration prevents the app from serving traffic — verified by integration test.
- **SC-004**: All existing tests continue to pass — the migration system has no effect on test execution (tests mock the Sheets layer).
- **SC-005**: The `_migrations` sheet provides a complete audit trail of all schema changes applied to the spreadsheet.
