/**
 * @file Unit tests for SheetsMigrationContext
 * Tests all MigrationContext helper methods against mocked Sheets API
 */

import { jest } from '@jest/globals';

// Mock Sheets API
const mockSheetsApi = {
  spreadsheets: {
    values: {
      get: jest.fn(),
      update: jest.fn(),
    },
    get: jest.fn(),
    batchUpdate: jest.fn(),
  },
};

const SPREADSHEET_ID = 'test-spreadsheet-id';

// Import after defining mocks (no module mock needed — we pass the mock directly)
const { SheetsMigrationContext } = await import(
  '../../../src/infrastructure/migration/migrationContext.js'
);

let ctx: InstanceType<typeof SheetsMigrationContext>;

beforeEach(() => {
  jest.clearAllMocks();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx = new SheetsMigrationContext(mockSheetsApi as any, SPREADSHEET_ID);

  // Default: sheet metadata returns a sheet with sheetId 42
  mockSheetsApi.spreadsheets.get.mockResolvedValue({
    data: {
      sheets: [
        { properties: { title: 'TestSheet', sheetId: 42 } },
        { properties: { title: 'Classes', sheetId: 1 } },
      ],
    },
  });

  mockSheetsApi.spreadsheets.values.update.mockResolvedValue({});
  mockSheetsApi.spreadsheets.batchUpdate.mockResolvedValue({});
});

describe('SheetsMigrationContext', () => {
  describe('getSheetHeaders', () => {
    test('should read row 1 and return header array', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['id', 'name', 'email']] },
      });

      const headers = await ctx.getSheetHeaders('TestSheet');

      expect(headers).toEqual(['id', 'name', 'email']);
      expect(mockSheetsApi.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: SPREADSHEET_ID,
        range: 'TestSheet!1:1',
      });
    });

    test('should return empty array when sheet has no headers', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: { values: undefined },
      });

      const headers = await ctx.getSheetHeaders('EmptySheet');

      expect(headers).toEqual([]);
    });
  });

  describe('addColumn', () => {
    test('should insert column after a named column', async () => {
      // First call (getSheetHeaders) returns existing headers
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['id', 'instrument', 'title']] },
      });

      const colIndex = await ctx.addColumn('TestSheet', 'roomId', {
        after: 'instrument',
      });

      // insertDimension at index 2 (after instrument at index 1)
      expect(mockSheetsApi.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId: 42,
                  dimension: 'COLUMNS',
                  startIndex: 2,
                  endIndex: 3,
                },
                inheritFromBefore: true,
              },
            },
          ],
        },
      });

      // Write header at C1 (index 2 = C)
      expect(mockSheetsApi.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: SPREADSHEET_ID,
        range: 'TestSheet!C1',
        valueInputOption: 'RAW',
        requestBody: { values: [['roomId']] },
      });

      expect(colIndex).toBe(2);
    });

    test('should append column at end when no after option', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['id', 'name']] },
      });

      const colIndex = await ctx.addColumn('TestSheet', 'newCol');

      // Insert at index 2 (after last column)
      expect(mockSheetsApi.spreadsheets.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            requests: [
              {
                insertDimension: {
                  range: {
                    sheetId: 42,
                    dimension: 'COLUMNS',
                    startIndex: 2,
                    endIndex: 3,
                  },
                  inheritFromBefore: true,
                },
              },
            ],
          },
        })
      );

      expect(colIndex).toBe(2);
    });

    test('should throw when after column does not exist', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['id', 'name']] },
      });

      await expect(ctx.addColumn('TestSheet', 'newCol', { after: 'nonexistent' })).rejects.toThrow(
        "Column 'nonexistent' not found in sheet 'TestSheet'"
      );
    });
  });

  describe('readAllRows', () => {
    test('should read data rows and map to records using headers', async () => {
      mockSheetsApi.spreadsheets.values.get
        .mockResolvedValueOnce({
          data: { values: [['id', 'name', 'email']] }, // headers
        })
        .mockResolvedValueOnce({
          data: {
            values: [
              ['1', 'Alice', 'alice@test.com'],
              ['2', 'Bob', 'bob@test.com'],
            ],
          },
        });

      const rows = await ctx.readAllRows('TestSheet');

      expect(rows).toEqual([
        { id: '1', name: 'Alice', email: 'alice@test.com' },
        { id: '2', name: 'Bob', email: 'bob@test.com' },
      ]);

      // Second call should request A2:C (3 columns)
      expect(mockSheetsApi.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: SPREADSHEET_ID,
        range: 'TestSheet!A2:C',
      });
    });

    test('should return empty array when sheet has no headers', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: { values: undefined },
      });

      const rows = await ctx.readAllRows('EmptySheet');

      expect(rows).toEqual([]);
    });

    test('should handle rows shorter than header count', async () => {
      mockSheetsApi.spreadsheets.values.get
        .mockResolvedValueOnce({
          data: { values: [['id', 'name', 'email']] },
        })
        .mockResolvedValueOnce({
          data: {
            values: [['1', 'Alice']], // missing email
          },
        });

      const rows = await ctx.readAllRows('TestSheet');

      expect(rows).toEqual([{ id: '1', name: 'Alice', email: '' }]);
    });
  });

  describe('batchUpdateColumn', () => {
    test('should write values down a column starting at row 2', async () => {
      await ctx.batchUpdateColumn('TestSheet', 2, ['val1', 'val2', 'val3']);

      // Column index 2 = C, rows 2-4
      expect(mockSheetsApi.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: SPREADSHEET_ID,
        range: 'TestSheet!C2:C4',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['val1'], ['val2'], ['val3']],
        },
      });
    });

    test('should be a no-op for empty values array', async () => {
      await ctx.batchUpdateColumn('TestSheet', 0, []);

      expect(mockSheetsApi.spreadsheets.values.update).not.toHaveBeenCalled();
    });
  });

  describe('updateCell', () => {
    test('should write a single value to the correct cell', async () => {
      await ctx.updateCell('TestSheet', 5, 2, 'hello');

      // Row 5, col 2 = C5
      expect(mockSheetsApi.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: SPREADSHEET_ID,
        range: 'TestSheet!C5',
        valueInputOption: 'RAW',
        requestBody: { values: [['hello']] },
      });
    });

    test('should handle column index > 25 (multi-letter columns)', async () => {
      await ctx.updateCell('TestSheet', 2, 26, 'value');

      // Column index 26 = AA
      expect(mockSheetsApi.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: SPREADSHEET_ID,
        range: 'TestSheet!AA2',
        valueInputOption: 'RAW',
        requestBody: { values: [['value']] },
      });
    });

    test('should handle column index 0 (column A)', async () => {
      await ctx.updateCell('TestSheet', 3, 0, 'first');

      expect(mockSheetsApi.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: SPREADSHEET_ID,
        range: 'TestSheet!A3',
        valueInputOption: 'RAW',
        requestBody: { values: [['first']] },
      });
    });
  });

  describe('createSheet', () => {
    test('should create a new sheet with header row when sheet does not exist', async () => {
      // Sheet metadata: no sheet matching the name we will create
      mockSheetsApi.spreadsheets.get.mockResolvedValueOnce({
        data: {
          sheets: [{ properties: { title: 'OtherSheet', sheetId: 1 } }],
        },
      });

      await ctx.createSheet('NewSheet', ['id', 'name', 'createdAt']);

      // Should issue an addSheet batchUpdate request
      expect(mockSheetsApi.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'NewSheet',
                },
              },
            },
          ],
        },
      });

      // Should write the header row at row 1 of the new sheet
      expect(mockSheetsApi.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: SPREADSHEET_ID,
        range: 'NewSheet!A1:C1',
        valueInputOption: 'RAW',
        requestBody: { values: [['id', 'name', 'createdAt']] },
      });
    });

    test('should be idempotent: return without error when sheet already exists', async () => {
      // Sheet metadata: the sheet already exists
      mockSheetsApi.spreadsheets.get.mockResolvedValueOnce({
        data: {
          sheets: [{ properties: { title: 'ExistingSheet', sheetId: 7 } }],
        },
      });

      await ctx.createSheet('ExistingSheet', ['a', 'b']);

      // Should NOT issue any addSheet or update requests
      expect(mockSheetsApi.spreadsheets.batchUpdate).not.toHaveBeenCalled();
      expect(mockSheetsApi.spreadsheets.values.update).not.toHaveBeenCalled();
    });

    test('should write columns in supplied order using correct A1 notation', async () => {
      // Sheet does not exist yet
      mockSheetsApi.spreadsheets.get.mockResolvedValueOnce({
        data: { sheets: [] },
      });

      const columns = ['Id', 'StudentId', 'InstructorId', 'Day', 'StartTime'] as const;
      await ctx.createSheet('registrations_summer', columns);

      // 5 columns → A1:E1
      expect(mockSheetsApi.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: SPREADSHEET_ID,
        range: 'registrations_summer!A1:E1',
        valueInputOption: 'RAW',
        requestBody: { values: [['Id', 'StudentId', 'InstructorId', 'Day', 'StartTime']] },
      });
    });

    test('should not write header row when columns array is empty', async () => {
      mockSheetsApi.spreadsheets.get.mockResolvedValueOnce({
        data: { sheets: [] },
      });

      await ctx.createSheet('EmptyHeaderSheet', []);

      // addSheet still happens
      expect(mockSheetsApi.spreadsheets.batchUpdate).toHaveBeenCalled();
      // But no update call (no header row to write)
      expect(mockSheetsApi.spreadsheets.values.update).not.toHaveBeenCalled();
    });
  });
});
