/**
 * MigrationContext — thin helper methods over the Google Sheets API
 *
 * Passed to each migration's migrate() function. Provides readable methods
 * for schema changes, data reading, and cell updates without requiring
 * direct Sheets API knowledge.
 */

import type { sheets_v4 } from 'googleapis';
import type { MigrationContext } from './types.js';

/** Convert a 0-based column index to an Excel-style column letter (0→A, 25→Z, 26→AA) */
function getColumnLetter(index: number): string {
  let letter = '';
  let num = index;
  while (num >= 0) {
    letter = String.fromCharCode((num % 26) + 65) + letter;
    num = Math.floor(num / 26) - 1;
  }
  return letter;
}

export class SheetsMigrationContext implements MigrationContext {
  #sheets: sheets_v4.Sheets;
  #spreadsheetId: string;

  constructor(sheets: sheets_v4.Sheets, spreadsheetId: string) {
    this.#sheets = sheets;
    this.#spreadsheetId = spreadsheetId;
  }

  async getSheetHeaders(sheetName: string): Promise<string[]> {
    const response = await this.#sheets.spreadsheets.values.get({
      spreadsheetId: this.#spreadsheetId,
      range: `${sheetName}!1:1`,
    });
    return (response.data.values?.[0] as string[]) ?? [];
  }

  async addColumn(
    sheetName: string,
    columnName: string,
    options?: { after?: string }
  ): Promise<number> {
    const headers = await this.getSheetHeaders(sheetName);

    let insertIndex: number;
    if (options?.after) {
      const afterIndex = headers.indexOf(options.after);
      if (afterIndex === -1) {
        throw new Error(`Column '${options.after}' not found in sheet '${sheetName}'`);
      }
      insertIndex = afterIndex + 1;
    } else {
      // Append at end
      insertIndex = headers.length;
    }

    // Get numeric sheetId for structural operations
    const sheetId = await this.#getSheetId(sheetName);

    // Insert the column
    await this.#sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.#spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: insertIndex,
                endIndex: insertIndex + 1,
              },
              inheritFromBefore: insertIndex > 0,
            },
          },
        ],
      },
    });

    // Write the header cell
    const colLetter = getColumnLetter(insertIndex);
    await this.#sheets.spreadsheets.values.update({
      spreadsheetId: this.#spreadsheetId,
      range: `${sheetName}!${colLetter}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [[columnName]] },
    });

    return insertIndex;
  }

  async readAllRows(sheetName: string): Promise<Record<string, string>[]> {
    const headers = await this.getSheetHeaders(sheetName);
    if (headers.length === 0) return [];

    const lastCol = getColumnLetter(headers.length - 1);
    const response = await this.#sheets.spreadsheets.values.get({
      spreadsheetId: this.#spreadsheetId,
      range: `${sheetName}!A2:${lastCol}`,
    });

    const rows = response.data.values ?? [];
    return rows.map(row => {
      const record: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        record[headers[i]] = i < row.length ? (row[i] ?? '') : '';
      }
      return record;
    });
  }

  async updateCell(sheetName: string, row: number, col: number, value: string): Promise<void> {
    const colLetter = getColumnLetter(col);
    await this.#sheets.spreadsheets.values.update({
      spreadsheetId: this.#spreadsheetId,
      range: `${sheetName}!${colLetter}${row}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });
  }

  async batchUpdateColumn(sheetName: string, colIndex: number, values: string[]): Promise<void> {
    if (values.length === 0) return;

    const colLetter = getColumnLetter(colIndex);
    const endRow = 2 + values.length - 1;
    await this.#sheets.spreadsheets.values.update({
      spreadsheetId: this.#spreadsheetId,
      range: `${sheetName}!${colLetter}2:${colLetter}${endRow}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: values.map(v => [v]),
      },
    });
  }

  async createSheet(sheetName: string, columns: readonly string[]): Promise<void> {
    // Idempotency: if the sheet already exists, return without error
    const existing = await this.#findSheetId(sheetName);
    if (existing !== null) {
      return;
    }

    // Create the sheet via Sheets API addSheet request
    await this.#sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.#spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });

    // Write the header row at row 1
    if (columns.length > 0) {
      const endCol = getColumnLetter(columns.length - 1);
      await this.#sheets.spreadsheets.values.update({
        spreadsheetId: this.#spreadsheetId,
        range: `${sheetName}!A1:${endCol}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [columns as string[]] },
      });
    }
  }

  /**
   * Look up a sheet's numeric ID by name without throwing if it's missing.
   * Returns null when the sheet is not found.
   */
  async #findSheetId(sheetName: string): Promise<number | null> {
    const spreadsheet = await this.#sheets.spreadsheets.get({
      spreadsheetId: this.#spreadsheetId,
      fields: 'sheets.properties',
    });

    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
    if (!sheet?.properties) return null;
    return sheet.properties.sheetId ?? null;
  }

  /** Get the numeric sheetId for a named sheet tab */
  async #getSheetId(sheetName: string): Promise<number> {
    const spreadsheet = await this.#sheets.spreadsheets.get({
      spreadsheetId: this.#spreadsheetId,
      fields: 'sheets.properties',
    });

    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);

    if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
      throw new Error(`Sheet '${sheetName}' not found in spreadsheet`);
    }

    return sheet.properties.sheetId;
  }
}
