# Data Model: Google Sheets Migration System

## Entities

### MigrationFile

A TypeScript module discovered at startup from `src/migrations/`. Represents a schema or data change to be applied to the Google Sheets spreadsheet.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable identifier exported from the module (e.g., `"001-add-room-column"`) |
| `filename` | `string` | Source file name (e.g., `001-add-room-column.ts`) |
| `migrate` | `(ctx: MigrationContext) => Promise<void>` | Async function that performs the migration |

**Source**: Dynamic `import()` of `.ts` files from `src/migrations/` directory.

**Ordering**: Files are sorted by filename string (numeric prefix ensures correct order).

**TypeScript interface**:
```typescript
export interface MigrationModule {
  id: string;
  migrate: (context: MigrationContext) => Promise<void>;
}

export interface DiscoveredMigration {
  id: string;
  filename: string;
  migrate: (context: MigrationContext) => Promise<void>;
}
```

---

### MigrationRecord

A row in the `_migrations` Google Sheet tab. Written after a migration executes successfully.

| Column | Position | Type | Description |
|--------|----------|------|-------------|
| `id` | A | string | Matches the `id` exported from the migration file |
| `filename` | B | string | Source file name for audit trail |
| `executedAt` | C | ISO 8601 string | Timestamp of successful completion |
| `durationMs` | D | string (numeric) | Execution time in milliseconds |
| `status` | E | string | Always `"success"` — failed migrations are never recorded |

**Sheet name**: `_migrations`

**Header row**: Row 1 contains column names (`id`, `filename`, `executedAt`, `durationMs`, `status`)

**Data rows**: Start at row 2

**Bootstrap**: Sheet is auto-created on first run if it doesn't exist.

**TypeScript interface**:
```typescript
export interface MigrationRecord {
  id: string;
  filename: string;
  executedAt: string;
  durationMs: number;
  status: 'success';
}
```

**Column array** (for DB client compatibility):
```typescript
const MIGRATION_COLUMNS = ['id', 'filename', 'executedAt', 'durationMs', 'status'] as const;
```

---

### MigrationContext

Object passed to each migration's `migrate()` function. Provides thin helper methods over the Google Sheets API. Not a persisted entity — created per migration execution.

**TypeScript interface**:
```typescript
export interface MigrationContext {
  /** Read column headers (row 1) from a sheet */
  getSheetHeaders(sheetName: string): Promise<string[]>;

  /** Insert a column, optionally after a named column. Returns the 0-based index of the new column. */
  addColumn(sheetName: string, columnName: string, options?: { after?: string }): Promise<number>;

  /** Read all data rows (row 2+) as named records using row 1 as headers */
  readAllRows(sheetName: string): Promise<Record<string, string>[]>;

  /** Write a single value to a cell. Row is 1-based (row 1 = header). Col is 0-based. */
  updateCell(sheetName: string, row: number, col: number, value: string): Promise<void>;

  /** Write values down a column starting at row 2. colIndex is 0-based. */
  batchUpdateColumn(sheetName: string, colIndex: number, values: string[]): Promise<void>;
}
```

**Implementation detail**: Constructed by `MigrationRunner` before each migration executes. Receives the `sheets` API client and `spreadsheetId` from `GoogleSheetsDbClient`.

---

## Relationships

```text
MigrationFile ──executes──▸ MigrationContext ──calls──▸ Google Sheets API
     │                                                        │
     │                                                        ▼
     │                                                  Target sheets
     │                                                (e.g., registrations_fall)
     ▼
MigrationRecord ──persisted in──▸ _migrations sheet
```

- One `MigrationFile` produces exactly one `MigrationRecord` on success
- Each `MigrationFile` receives a fresh `MigrationContext` instance
- `MigrationRunner` reads `MigrationRecord`s from `_migrations` to determine which `MigrationFile`s have already run

## State Transitions

```text
Migration lifecycle:

  [Not discovered]     File doesn't exist in src/migrations/
        │
        ▼ (file created)
  [Pending]            File exists, no matching record in _migrations
        │
        ▼ (runner executes migrate())
  [Running]            Currently executing (transient, not persisted)
        │
        ├── success ──▸ [Completed]    Record written to _migrations
        │
        └── failure ──▸ [Failed]       Error logged, process exits
                                        No record written; stays [Pending]
                                        on next startup
```

## Validation Rules

- Migration `id` must be unique across all migration files
- Migration `id` must be a non-empty string
- Migration `migrate` function must be an async function (returns Promise)
- Migration files must have a numeric prefix for ordering (enforced by filename sort)
- The `_migrations` sheet column order must match `MIGRATION_COLUMNS`
