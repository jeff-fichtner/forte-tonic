/**
 * @file Unit tests for GoogleSheetsDbClient
 * Tests actual implementation with stubbed Google Sheets API responses
 */

import { jest } from '@jest/globals';

// Mock googleapis BEFORE importing GoogleSheetsDbClient
const mockSheetsApi = {
  spreadsheets: {
    values: {
      get: jest.fn(),
      append: jest.fn(),
      update: jest.fn(),
      batchUpdate: jest.fn(),
    },
    get: jest.fn(),
    batchUpdate: jest.fn(),
  },
};

const mockAuth = jest.fn();

// Mock the entire googleapis module
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => mockAuth),
    },
    sheets: jest.fn().mockReturnValue(mockSheetsApi),
  },
}));

// Now import GoogleSheetsDbClient after mocking
const { GoogleSheetsDbClient } = await import('../../src/database/googleSheetsDbClient.js');

// Mock configuration service
const mockConfigService = {
  getGoogleSheetsAuth: jest.fn().mockReturnValue({
    clientEmail: 'test@test.com',
    privateKey: 'test-private-key',
  }),
  getGoogleSheetsConfig: jest.fn().mockReturnValue({
    spreadsheetId: 'test-spreadsheet-id',
  }),
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
};

describe('GoogleSheetsDbClient', () => {
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new GoogleSheetsDbClient(mockConfigService);
  });

  describe('constructor', () => {
    test('should initialize with correct spreadsheet ID', () => {
      expect(client.spreadsheetId).toBe('test-spreadsheet-id');
    });

    test('should not have caching (moved to repository layer)', () => {
      // DB client no longer has caching
      expect(client.cache).toBeUndefined();
      expect(client.cacheTimestamps).toBeUndefined();
      expect(client.CACHE_TTL).toBeUndefined();
    });

    test('should have workingSheetInfo configured', () => {
      expect(client.workingSheetInfo).toBeDefined();
      expect(client.workingSheetInfo.admins).toBeDefined();
      expect(client.workingSheetInfo.students).toBeDefined();
      // Registrations are now split by trimester
      expect(client.workingSheetInfo.registrations_fall).toBeDefined();
      expect(client.workingSheetInfo.registrations_winter).toBeDefined();
      expect(client.workingSheetInfo.registrations_spring).toBeDefined();
    });
  });

  describe('getAllRecords', () => {
    test('should fetch data with optimized column range', async () => {
      const mockApiResponse = {
        data: {
          values: [
            ['admin-1', 'admin1@test.com', 'Doe', 'John', '555-1234'],
            ['admin-2', 'admin2@test.com', 'Smith', 'Jane', '555-5678'],
          ],
        },
      };

      mockSheetsApi.spreadsheets.values.get.mockResolvedValue(mockApiResponse);

      const mapFunc = record => ({
        id: record.id,
        email: record.email,
        lastName: record.lastName,
        firstName: record.firstName,
        phone: record.phone,
      });

      const result = await client.getAllRecords('admins', mapFunc);

      // Verify optimized range calculation
      // admins columnMap has max index 9 (isDirector), so column = J (65+9=74='J')
      expect(mockSheetsApi.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'admins!A2:J',
      });

      expect(result).toEqual([
        {
          id: 'admin-1',
          email: 'admin1@test.com',
          lastName: 'Doe',
          firstName: 'John',
          phone: '555-1234',
        },
        {
          id: 'admin-2',
          email: 'admin2@test.com',
          lastName: 'Smith',
          firstName: 'Jane',
          phone: '555-5678',
        },
      ]);
    });

    test('should filter out null and undefined mapped values', async () => {
      const mockApiResponse = {
        data: {
          values: [
            ['admin-1', 'admin1@test.com'],
            ['admin-2', 'admin2@test.com'],
            ['', ''], // Empty row
          ],
        },
      };

      mockSheetsApi.spreadsheets.values.get.mockResolvedValue(mockApiResponse);

      const mapFunc = record => {
        if (!record.id) return null; // Filter out empty rows
        return { id: record.id, email: record.email };
      };

      const result = await client.getAllRecords('admins', mapFunc);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { id: 'admin-1', email: 'admin1@test.com' },
        { id: 'admin-2', email: 'admin2@test.com' },
      ]);
    });

    test('should handle empty sheet', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const result = await client.getAllRecords('admins', record => ({ id: record.id }));

      expect(result).toEqual([]);
    });

    test('should handle missing values property', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {},
      });

      const result = await client.getAllRecords('admins', record => ({ id: record.id }));

      expect(result).toEqual([]);
    });

    test('should throw error for invalid sheet key', async () => {
      await expect(client.getAllRecords('nonExistentSheet', record => record)).rejects.toThrow(
        'Sheet info not found for key: nonExistentSheet'
      );
    });

    test('should propagate API errors', async () => {
      mockSheetsApi.spreadsheets.values.get.mockRejectedValue(
        new Error('API Error: Permission denied')
      );

      await expect(client.getAllRecords('admins', record => ({ id: record.id }))).rejects.toThrow(
        'API Error: Permission denied'
      );
    });

    test('should calculate correct column for registrations (column S)', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      // Use registrations_fall instead of registrations
      await client.getAllRecords('registrations_fall', record => ({ id: record.id }));

      // registrations_fall has max column index 19 (linkedPreviousRegistrationId)
      // 65 + 19 = 84 = 'T'
      expect(mockSheetsApi.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'registrations_fall!A2:T',
      });
    });
  });

  // DB client caching removed - getCachedData method no longer exists
  describe('getCachedData', () => {
    test('getCachedData tests removed - caching moved to repository layer', () => {
      // getCachedData method removed - DB client now always fetches fresh data
      expect(true).toBe(true);
    });
  });

  // DB client caching removed - caching is now handled at repository layer
  describe('clearCache', () => {
    test('clearCache tests removed - caching moved to repository layer', () => {
      // DB client no longer has caching - this is handled by repositories
      expect(true).toBe(true);
    });
  });

  describe('insertIntoSheet', () => {
    test('should insert data', async () => {
      mockSheetsApi.spreadsheets.values.append.mockResolvedValue({
        data: {
          updates: {
            updatedCells: 5,
            updatedRows: 1,
          },
        },
      });

      const data = {
        id: 'admin-1',
        email: 'test@test.com',
        lastName: 'Doe',
        firstName: 'John',
        phone: '555-1234',
        accessCode: '',
        role: '',
        displayEmail: '',
        displayPhone: '',
        isDirector: false,
      };

      await client.insertIntoSheet('admins', data);

      expect(mockSheetsApi.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'admins!A:A',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['admin-1', 'test@test.com', 'Doe', 'John', '555-1234', '', '', '', '', 'false']],
        },
      });
    });

    test('should handle sparse data with empty columns', async () => {
      mockSheetsApi.spreadsheets.values.append.mockResolvedValue({
        data: { updates: {} },
      });

      const data = {
        id: 'admin-1',
        email: 'test@test.com',
        // lastName and firstName omitted
        phone: '555-1234',
        // accessCode, role, displayEmail, displayPhone, isDirector omitted
      };

      await client.insertIntoSheet('admins', data);

      // Verify row has empty strings for missing columns (up to isDirector at index 9)
      const call = mockSheetsApi.spreadsheets.values.append.mock.calls[0][0];
      expect(call.requestBody.values[0]).toEqual([
        'admin-1',
        'test@test.com',
        '',
        '',
        '555-1234',
        '',
        '',
        '',
        '',
        '',
      ]);
    });
  });

  describe('updateRecord', () => {
    test('should find and update record by ID', async () => {
      // Mock getAllRecords to return existing data (with all 10 admin columns)
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['admin-1', 'old@test.com', 'Doe', 'John', '555-1234', '', '', '', '', ''],
            ['admin-2', 'admin2@test.com', 'Smith', 'Jane', '555-5678', '', '', '', '', ''],
          ],
        },
      });

      mockSheetsApi.spreadsheets.values.update.mockResolvedValue({
        data: { updatedCells: 5 },
      });

      const updatedRecord = {
        id: 'admin-2',
        email: 'updated@test.com',
        lastName: 'Smith',
        firstName: 'Jane',
        phone: '555-9999',
        accessCode: '',
        role: '',
        displayEmail: '',
        displayPhone: '',
        isDirector: false,
      };

      await client.updateRecord('admins', updatedRecord, 'test-user');

      // Should update row 3 (startRow 2 + rowIndex 1)
      // admins has 10 columns (A through J), so range uses precise column J
      expect(mockSheetsApi.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'admins!A3:J3',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            ['admin-2', 'updated@test.com', 'Smith', 'Jane', '555-9999', '', '', '', '', 'false'],
          ],
        },
      });
    });

    test('should not update when record not found', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [['admin-1', 'admin1@test.com', 'Doe', 'John', '555-1234']],
        },
      });

      const updatedRecord = {
        id: 'non-existent',
        email: 'test@test.com',
      };

      await client.updateRecord('admins', updatedRecord, 'test-user');

      expect(mockSheetsApi.spreadsheets.values.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteRecord', () => {
    test('should find and delete record by ID', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['admin-1', 'admin1@test.com', 'Doe', 'John', '555-1234'],
            ['admin-2', 'admin2@test.com', 'Smith', 'Jane', '555-5678'],
          ],
        },
      });

      mockSheetsApi.spreadsheets.get.mockResolvedValue({
        data: {
          sheets: [
            {
              properties: {
                sheetId: 123,
                title: 'admins',
              },
            },
          ],
        },
      });

      mockSheetsApi.spreadsheets.batchUpdate.mockResolvedValue({
        data: {},
      });

      await client.deleteRecord('admins', 'admin-2', 'test-user');

      // Should delete row 3 (startRow 2 + rowIndex 1)
      expect(mockSheetsApi.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 123,
                  dimension: 'ROWS',
                  startIndex: 2,
                  endIndex: 3,
                },
              },
            },
          ],
        },
      });
    });

    test('should not delete when record not found', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [['admin-1', 'admin1@test.com', 'Doe', 'John', '555-1234']],
        },
      });

      await client.deleteRecord('admins', 'non-existent', 'test-user');

      expect(mockSheetsApi.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });
  });

});
