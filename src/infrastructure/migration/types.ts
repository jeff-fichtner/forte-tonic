import type { sheets_v4 } from 'googleapis';

/** Shape of a migration module's exports */
export interface MigrationModule {
  id: string;
  migrate: (context: MigrationContext) => Promise<void>;
}

/** A migration file discovered on disk, enriched with filename */
export interface DiscoveredMigration {
  id: string;
  filename: string;
  migrate: (context: MigrationContext) => Promise<void>;
}

/** A row in the _migrations tracking sheet */
export interface MigrationRecord {
  id: string;
  filename: string;
  executedAt: string;
  durationMs: number;
  status: 'success';
}

/** Column schema for the _migrations sheet */
export const MIGRATION_COLUMNS = ['id', 'filename', 'executedAt', 'durationMs', 'status'] as const;

/** Sheet name for migration tracking */
export const MIGRATIONS_SHEET_NAME = '_migrations';

/** Context object passed to each migration's migrate() function */
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

/** Dependencies needed to construct a MigrationContext */
export interface MigrationContextDeps {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
}
