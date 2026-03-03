# Research: Google Sheets Migration System

## R1: Google Sheets API Capabilities for Schema Changes

**Decision**: Use `spreadsheets.batchUpdate` with `insertDimension` for column insertion, `addSheet` for creating the `_migrations` tab, and `spreadsheets.values.update` for writing cell data.

**Rationale**: The existing `googleSheetsDbClient.ts` already uses `spreadsheets.batchUpdate` (for row deletion via `deleteDimension`) and `spreadsheets.values.get/update/append` (for all CRUD). The migration system needs three additional patterns:
1. **Create sheet tab** — `batchUpdate` with `addSheet` request (requires sheet title, returns numeric `sheetId`)
2. **Insert column** — `batchUpdate` with `insertDimension` request (requires numeric `sheetId`, zero-based column index)
3. **Write header + column data** — `values.update` to a specific range after column insertion

All three patterns are supported by the existing `googleapis` dependency and consistent with the DB client's calling conventions.

**Alternatives considered**:
- Direct `values.append` for adding columns at the end (simpler but doesn't support inserting at a specific position)
- Creating a new sheet and copying data (destructive, unnecessary complexity)

## R2: Migration File Discovery and Module Loading

**Decision**: Use Node.js `fs.readdir` to scan `src/migrations/`, filter for `.ts`/`.js` files with numeric prefixes, sort by prefix, and use dynamic `import()` to load each module.

**Rationale**: The app uses ES modules (`"type": "module"` in `package.json`) and runs via `tsx`. Dynamic `import()` is the standard ESM pattern for loading modules at runtime. File-system scanning is simple and doesn't require any additional dependencies.

**File naming convention**: `NNN-descriptive-name.ts` where `NNN` is a zero-padded numeric prefix (e.g., `001-add-room-column.ts`). Sorting by filename string gives correct execution order.

**Module contract**: Each migration file exports:
```typescript
export const id = '001-add-room-column';
export async function migrate(context: MigrationContext): Promise<void> { ... }
```

**Alternatives considered**:
- Registry file listing all migrations (extra file to maintain, violates SC-002 "single file to add a migration")
- Glob patterns via a library (unnecessary dependency for a simple directory scan)

## R3: Tracking Sheet Schema

**Decision**: The `_migrations` sheet uses 5 columns: `id`, `filename`, `executedAt`, `durationMs`, `status`.

**Rationale**: Minimal tracking that satisfies the audit trail requirement (SC-005) and allows the runner to determine which migrations have already run (by reading the `id` column). The `status` column is always `success` — failed migrations are never recorded (per FR-006), so a failed migration's ID won't appear in the sheet.

**Column definitions**:
| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Stable migration identifier (e.g., `001-add-room-column`) |
| `filename` | string | Source file name (e.g., `001-add-room-column.ts`) |
| `executedAt` | ISO 8601 string | Timestamp of successful execution |
| `durationMs` | number (as string) | Execution duration in milliseconds |
| `status` | string | Always `success` (only successful migrations are recorded) |

**Bootstrap**: If the `_migrations` sheet doesn't exist, the runner creates it via `addSheet` and writes the header row before proceeding. This is checked once per startup via `spreadsheets.get` with `fields: 'sheets.properties'`.

**Alternatives considered**:
- Adding a `failedAt`/`error` column (rejected — failed migrations don't get recorded, they block startup and log to GCP)
- Using the existing cache service to track migrations (rejected — cache is in-memory and ephemeral; needs persistent tracking)

## R4: Integration Point — Where to Call the Migration Runner

**Decision**: Call the migration runner inside `initializeApp()` in `src/app.ts`, after `serviceContainer.initialize()` completes but before the function returns (which gates `app.listen()` in `server.ts`).

**Rationale**: The startup flow is:
```
server.ts: await initializeApp()  →  app.listen()
app.ts:    initializeApp() { await serviceContainer.initialize(); }
```

The migration runner needs `GoogleSheetsDbClient` (initialized during `serviceContainer.initialize()`). Placing the migration call after container initialization and before `app.listen()` satisfies FR-009 (no traffic until migrations complete).

**Sequence**:
```typescript
// app.ts
export async function initializeApp() {
  await serviceContainer.initialize();
  await runPendingMigrations(serviceContainer.dbClient);  // NEW
}
```

If `runPendingMigrations` throws, the error propagates to `server.ts`, the `catch` block logs it, and `process.exit(1)` is called (existing error handling in `server.ts`).

**Alternatives considered**:
- Inside `serviceContainer.initialize()` (rejected — mixes infrastructure init with data migration concerns)
- As Express middleware (rejected — migrations must run before any middleware, not per-request)
- In `server.ts` directly (rejected — `app.ts` owns initialization; `server.ts` just calls `initializeApp()` and `listen()`)

## R5: MigrationContext API Design

**Decision**: `MigrationContext` provides 5 thin helper methods that wrap Google Sheets API calls. It receives a reference to the `GoogleSheetsDbClient`'s internal sheets API client and spreadsheet ID.

**Rationale**: Migration authors shouldn't need to know Sheets API internals (A1 notation, numeric sheet IDs, `batchUpdate` request structures). The context provides readable methods while staying thin enough to not become a maintenance burden.

**API surface**:

```typescript
interface MigrationContext {
  getSheetHeaders(sheetName: string): Promise<string[]>;
  addColumn(sheetName: string, columnName: string, options?: { after?: string }): Promise<number>;
  readAllRows(sheetName: string): Promise<Record<string, string>[]>;
  updateCell(sheetName: string, row: number, col: number, value: string): Promise<void>;
  batchUpdateColumn(sheetName: string, colIndex: number, values: string[]): Promise<void>;
}
```

**Method details**:
- `getSheetHeaders(sheetName)` — reads row 1, returns string array of column names
- `addColumn(sheetName, columnName, { after })` — resolves `after` to column index via headers, calls `insertDimension` + writes header, returns new column index
- `readAllRows(sheetName)` — reads all data rows (row 2+), maps to `Record<string, string>` using row 1 headers
- `updateCell(sheetName, row, col, value)` — writes a single value to a specific cell (1-based row, 0-based col)
- `batchUpdateColumn(sheetName, colIndex, values)` — writes an array of values down a column starting at row 2

**Alternatives considered**:
- Exposing the raw Sheets API client (rejected — too low-level, migration authors would need to construct A1 ranges and request bodies)
- A high-level DSL with chaining (rejected — over-engineered for the expected migration count of 5-20)
- Reusing `GoogleSheetsDbClient`'s existing methods (rejected — its API is CRUD-oriented with column-index mappings; migrations need direct structural operations)

## R6: Idempotency Strategy

**Decision**: Migration authors are responsible for writing idempotent migrations. The `MigrationContext` helpers support idempotent patterns (e.g., `getSheetHeaders` lets you check if a column exists before adding it).

**Rationale**: Per FR-007, migrations must be safe to re-run. If a migration partially completes (e.g., column added but seeding fails), it won't be recorded as successful, so it re-runs on next startup. The runner doesn't provide automatic idempotency — it's the migration author's responsibility.

**Common idempotent patterns**:
```typescript
// Check before adding column
const headers = await ctx.getSheetHeaders('registrations_fall');
if (!headers.includes('roomId')) {
  await ctx.addColumn('registrations_fall', 'roomId', { after: 'instrument' });
}

// Set value only if empty
const rows = await ctx.readAllRows('registrations_fall');
for (const [i, row] of rows.entries()) {
  if (!row.roomId) {
    await ctx.updateCell('registrations_fall', i + 2, colIndex, computedValue);
  }
}
```

**Alternatives considered**:
- Automatic rollback on failure (rejected — Google Sheets has no transactions; partial rollback is unreliable and adds complexity)
- Checkpointing within a migration (rejected — over-engineering for the expected migration complexity)

## R7: Test Strategy

**Decision**: Unit tests mock the Sheets API at the `googleapis` level (same pattern as `googleSheetsDbClient.test.ts`). Integration test verifies the full startup-to-completion flow with mocked Sheets.

**Rationale**: Constitution mandates tests mock `googleSheetsDbClient` — never hit real Sheets API. The migration system's testable units are:
1. **MigrationRunner** — file scanning, diffing against tracking sheet, sequential execution, recording results, failure handling
2. **MigrationContext** — each helper method translates to correct Sheets API calls

**Test structure**:
- `tests/unit/infrastructure/migrationRunner.test.ts` — mock file system + mock Sheets API, verify runner behavior
- `tests/unit/infrastructure/migrationContext.test.ts` — mock Sheets API, verify each helper produces correct API calls
- `tests/integration/migration.test.ts` — mock Sheets API, verify `initializeApp()` runs migrations before returning

**Alternatives considered**:
- Testing against a real spreadsheet (rejected — violates constitution, slow, environment-dependent)
- Snapshot tests for migration output (rejected — migrations are one-off scripts, not deterministic UI components)
