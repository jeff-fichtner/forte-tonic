/**
 * Database Layer Type Contracts
 *
 * Types for the Google Sheets database client boundary.
 * See Constitution Principle X: Google Sheets Is the Database.
 *
 * The Google Sheets API returns `any[][]` for cell values.
 * This is a documented external boundary where `any` is permitted (SC-005).
 * These types narrow the raw data as early as possible.
 */

// Raw row from Google Sheets — always string values
export type SheetRow = string[];

// Sheet metadata for a single table
export interface SheetInfo {
  sheet: string;
  startRow: number;
  auditSheet?: string;
  columnMap: Record<string, number>;
}

// Map function that converts a raw row to a typed model
export type RowMapper<T> = (row: SheetRow) => T | null;

// Batch write operation
export interface BatchWriteOperation {
  sheetKey: string;
  record: Record<string, unknown>;
  updatedBy: string;
}

// Cache service interface (optional dependency)
export interface CacheService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs?: number): void;
  delete(key: string): void;
  clear(): void;
}

// Google Sheets database client public interface
export interface GoogleSheetsDbClient {
  getAllRecords<T>(sheetKey: string, mapFunc: RowMapper<T>): Promise<T[]>;
  getAllDataParallel<T extends Record<string, unknown>>(
    sheetKeys: string[],
    mapFunctions: Record<string, RowMapper<unknown>>,
  ): Promise<T>;
  getFromSheetByColumnValue(
    sheetKey: string,
    columnName: string,
    value: string,
  ): Promise<SheetRow[]>;
  appendRecord(
    sheetKey: string,
    record: Record<string, unknown>,
    createdBy: string,
  ): Promise<void>;
  updateRecord(
    sheetKey: string,
    record: Record<string, unknown>,
    updatedBy: string,
  ): Promise<void>;
  deleteRecord(
    sheetKey: string,
    recordId: string,
    deletedBy: string,
  ): Promise<void>;
  batchWrite(operations: BatchWriteOperation[]): Promise<void>;
  clearCache(sheetKey?: string): void;
}
