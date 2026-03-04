/**
 * Migration Runner
 *
 * Scans src/migrations/ for TypeScript migration files, compares against the
 * _migrations tracking sheet, and executes unrun migrations in numeric order.
 * Runs during app startup before app.listen(). Failed migrations block startup.
 *
 * Concurrent migration execution is unsupported — assumes single-instance
 * startup per Cloud Run cold start model.
 */

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCloudLogger } from '../../common/gcpLogger.js';
import { SheetsMigrationContext } from './migrationContext.js';
import {
  MIGRATION_COLUMNS,
  MIGRATIONS_SHEET_NAME,
  type DiscoveredMigration,
  type MigrationContextDeps,
  type MigrationModule,
} from './types.js';

const NUMERIC_PREFIX_PATTERN = /^\d{3,}-/;

/** Resolve the migrations directory relative to the project source root */
function getMigrationsDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // src/infrastructure/migration/migrationRunner.ts → src/migrations/
  return path.resolve(path.dirname(thisFile), '..', '..', 'migrations');
}

/**
 * Run all pending migrations. Call during app startup after the service
 * container is initialized (dbClient must be available).
 *
 * @throws If any migration fails — caller should let the error propagate
 *         to prevent app.listen() from being reached.
 */
export async function runPendingMigrations(dbClient: MigrationContextDeps): Promise<void> {
  const logger = getCloudLogger();
  const { sheets, spreadsheetId } = dbClient;

  // 1. Ensure _migrations sheet exists
  await ensureMigrationsSheet(sheets, spreadsheetId, logger);

  // 2. Read already-run migration filenames
  const executedFilenames = await getExecutedFilenames(sheets, spreadsheetId);

  // 3. Discover migration filenames (lightweight — no imports yet)
  const discoveredFiles = await discoverMigrationFiles(logger);

  // 4. Diff: find pending filenames (only import files we actually need to run)
  const pendingFiles = discoveredFiles.filter(f => !executedFilenames.has(f));

  if (pendingFiles.length === 0) {
    logger.info({ message: 'No pending migrations' });
    return;
  }

  // 5. Import and validate only pending migration files
  const pending = await importMigrations(pendingFiles, logger);

  logger.info({
    message: `Running ${pending.length} pending migration(s)`,
    context: { ids: pending.map(m => m.id) },
  });

  // 6. Execute pending migrations sequentially
  for (const migration of pending) {
    const startTime = Date.now();

    logger.info({
      message: `Migration started: ${migration.id}`,
      context: { filename: migration.filename },
    });

    try {
      const ctx = new SheetsMigrationContext(sheets, spreadsheetId);
      await migration.migrate(ctx);

      const durationMs = Date.now() - startTime;

      // Record success
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${MIGRATIONS_SHEET_NAME}!A:A`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              migration.id,
              migration.filename,
              new Date().toISOString(),
              String(durationMs),
              'success',
            ],
          ],
        },
      });

      logger.info({
        message: `Migration completed: ${migration.id}`,
        context: { durationMs, filename: migration.filename },
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;

      logger.error({
        message: `Migration failed: ${migration.id}`,
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
          stack: (error as Error).stack,
          code: 'MIGRATION_FAILED',
        },
        context: { durationMs, filename: migration.filename },
      });

      // Re-throw to block app startup — do NOT record failed migration
      throw error;
    }
  }
}

/** Ensure the _migrations tracking sheet exists; create it if missing */
async function ensureMigrationsSheet(
  sheets: MigrationContextDeps['sheets'],
  spreadsheetId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: any
): Promise<void> {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  });

  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === MIGRATIONS_SHEET_NAME);

  if (!exists) {
    logger.info({ message: 'Creating _migrations tracking sheet' });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: MIGRATIONS_SHEET_NAME } } }],
      },
    });

    // Write header row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${MIGRATIONS_SHEET_NAME}!A:A`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[...MIGRATION_COLUMNS]],
      },
    });
  }
}

/** Read the set of already-executed migration filenames from the _migrations sheet */
async function getExecutedFilenames(
  sheets: MigrationContextDeps['sheets'],
  spreadsheetId: string
): Promise<Set<string>> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${MIGRATIONS_SHEET_NAME}!B2:B`,
  });

  const rows = response.data.values ?? [];
  return new Set(rows.map(row => row[0]).filter(Boolean));
}

/**
 * Scan src/migrations/ for migration filenames, sorted by filename.
 * Returns filenames only — no imports. This allows diffing against
 * already-run IDs before paying the cost of importing modules.
 *
 * Filenames ARE the migration IDs (minus the .ts/.js extension), following
 * the convention: 001-add-room-column.ts → id "001-add-room-column".
 * The actual `id` export is validated later during import, but we use the
 * filename-derived ID for the diff so we never import already-run files.
 */
async function discoverMigrationFiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: any
): Promise<string[]> {
  const migrationsDir = getMigrationsDir();

  let files: string[];
  try {
    files = await readdir(migrationsDir);
  } catch {
    // Directory doesn't exist — no migrations to run
    logger.info({ message: 'No migrations directory found, skipping' });
    return [];
  }

  // Filter for .ts/.js files with numeric prefix, sort by filename
  const migrationFiles = files
    .filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && NUMERIC_PREFIX_PATTERN.test(f))
    .sort();

  logger.info({
    message: `Discovered ${migrationFiles.length} migration file(s)`,
    context: { files: migrationFiles },
  });

  return migrationFiles;
}

/** Import and validate pending migration files, returning DiscoveredMigration[] */
async function importMigrations(
  filenames: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _logger: any
): Promise<DiscoveredMigration[]> {
  const migrationsDir = getMigrationsDir();
  const migrations: DiscoveredMigration[] = [];

  for (const filename of filenames) {
    const filePath = path.join(migrationsDir, filename);

    // Dynamic import — tsx handles .ts files at runtime
    const mod = (await import(filePath)) as MigrationModule;

    // Validate exports
    if (typeof mod.id !== 'string' || !mod.id) {
      throw new Error(`Migration file ${filename} must export a non-empty string 'id'`);
    }
    if (typeof mod.migrate !== 'function') {
      throw new Error(`Migration file ${filename} must export a 'migrate' function`);
    }

    migrations.push({
      id: mod.id,
      filename,
      migrate: mod.migrate,
    });
  }

  return migrations;
}
