# Quickstart: Google Sheets Migration System

## Writing a Migration

1. Create a new file in `src/migrations/` with a numeric prefix:

```bash
# Naming convention: NNN-descriptive-name.ts
touch src/migrations/001-add-room-to-registrations.ts
```

2. Export an `id` string and a `migrate` function:

```typescript
import type { MigrationContext } from '../infrastructure/migration/types.js';

export const id = '001-add-room-to-registrations';

export async function migrate(ctx: MigrationContext): Promise<void> {
  // Check if column already exists (idempotent)
  const headers = await ctx.getSheetHeaders('registrations_fall');
  if (headers.includes('roomId')) return;

  // Add column after 'instrument'
  await ctx.addColumn('registrations_fall', 'roomId', { after: 'instrument' });
}
```

3. Update the corresponding model's `columns` array in the **same PR**:

```typescript
// src/models/shared/registration.ts
static readonly columns = [
  'id',
  'studentId',
  'instructorId',
  'day',
  'startTime',
  'length',
  'registrationType',
  'roomId',          // ← added in same PR as migration
  'instrument',
  // ...
] as const;
```

4. Start the app — the migration runs automatically before `app.listen()`.

## How It Works

On every startup:

1. Runner reads the `_migrations` sheet to get already-executed migration filenames
2. Runner scans `src/migrations/` for `.ts` files, sorted by numeric prefix
3. Any migration file not recorded in `_migrations` is imported and executed sequentially
4. On success: migration `id`, filename, timestamp, and duration are recorded in `_migrations`
5. On failure: error is logged via GCP structured logger, process exits with non-zero code

## Common Migration Patterns

### Add a column with default values

```typescript
export const id = '002-add-transport-type';

export async function migrate(ctx: MigrationContext): Promise<void> {
  const headers = await ctx.getSheetHeaders('registrations_fall');
  if (headers.includes('transportationType')) return;

  const colIndex = await ctx.addColumn('registrations_fall', 'transportationType', { after: 'roomId' });

  // Seed with default value
  const rows = await ctx.readAllRows('registrations_fall');
  const values = rows.map(() => 'parent');
  await ctx.batchUpdateColumn('registrations_fall', colIndex, values);
}
```

### Transform existing data

```typescript
export const id = '003-normalize-time-format';

export async function migrate(ctx: MigrationContext): Promise<void> {
  const headers = await ctx.getSheetHeaders('Classes');
  const timeColIndex = headers.indexOf('startTime');
  if (timeColIndex === -1) return;

  const rows = await ctx.readAllRows('Classes');
  for (const [i, row] of rows.entries()) {
    if (row.startTime && row.startTime.includes(' PM')) {
      // Convert "2:00 PM" → "14:00"
      const converted = convertTo24Hour(row.startTime);
      await ctx.updateCell('Classes', i + 2, timeColIndex, converted);
    }
  }
}
```

### Multi-sheet migration

```typescript
export const id = '004-add-room-all-trimesters';

export async function migrate(ctx: MigrationContext): Promise<void> {
  for (const trimester of ['fall', 'winter', 'spring']) {
    const sheet = `registrations_${trimester}`;
    const headers = await ctx.getSheetHeaders(sheet);
    if (!headers.includes('roomId')) {
      await ctx.addColumn(sheet, 'roomId', { after: 'instrument' });
    }
  }
}
```

## Key Rules

- **Idempotent**: Migrations MUST be safe to re-run. Always check before mutating (e.g., `if (!headers.includes('newCol'))`)
- **Same PR**: The migration file and the model `columns` array update go in the same PR
- **Sequential**: Migrations run in numeric prefix order, one at a time
- **No rollback**: If a migration fails, fix it and redeploy — the migration will re-run on next startup
- **Logging**: Use `console.log` sparingly within migrations; the runner handles structured logging for start/success/failure events
