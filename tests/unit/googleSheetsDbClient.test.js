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

    test('should initialize cache', () => {
      expect(client.cache).toBeInstanceOf(Map);
      expect(client.cacheTimestamps).toBeInstanceOf(Map);
      expect(client.CACHE_TTL).toBe(5 * 60 * 1000);
    });

    test('should have workingSheetInfo configured', () => {
      expect(client.workingSheetInfo).toBeDefined();
      expect(client.workingSheetInfo.admins).toBeDefined();
      expect(client.workingSheetInfo.students).toBeDefined();
      expect(client.workingSheetInfo.registrations).toBeDefined();
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

      const mapFunc = row => ({
        id: row[0],
        email: row[1],
        lastName: row[2],
        firstName: row[3],
        phone: row[4],
      });

      const result = await client.getAllRecords('admins', mapFunc);

      // Verify optimized range calculation
      // admins columnMap has max index 4 (phone), so column = E (65+4=69='E')
      expect(mockSheetsApi.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'admins!A2:E',
      });

      expect(result).toEqual([
        { id: 'admin-1', email: 'admin1@test.com', lastName: 'Doe', firstName: 'John', phone: '555-1234' },
        { id: 'admin-2', email: 'admin2@test.com', lastName: 'Smith', firstName: 'Jane', phone: '555-5678' },
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

      const mapFunc = row => {
        if (!row[0]) return null; // Filter out empty rows
        return { id: row[0], email: row[1] };
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

      const result = await client.getAllRecords('admins', row => ({ id: row[0] }));

      expect(result).toEqual([]);
    });

    test('should handle missing values property', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {},
      });

      const result = await client.getAllRecords('admins', row => ({ id: row[0] }));

      expect(result).toEqual([]);
    });

    test('should throw error for invalid sheet key', async () => {
      await expect(
        client.getAllRecords('nonExistentSheet', row => row)
      ).rejects.toThrow('Sheet info not found for key: nonExistentSheet');
    });

    test('should propagate API errors', async () => {
      mockSheetsApi.spreadsheets.values.get.mockRejectedValue(
        new Error('API Error: Permission denied')
      );

      await expect(
        client.getAllRecords('admins', row => ({ id: row[0] }))
      ).rejects.toThrow('API Error: Permission denied');
    });

    test('should calculate correct column for registrations (column S)', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      await client.getAllRecords('registrations', row => ({ id: row[0] }));

      // registrations has max column index 18 (intentSubmittedBy)
      // 65 + 18 = 83 = 'S'
      expect(mockSheetsApi.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'registrations!A2:S',
      });
    });
  });

  describe('getCachedData', () => {
    test('should fetch fresh data on cache miss', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [['admin-1', 'test@test.com']],
        },
      });

      const mapFunc = row => ({ id: row[0], email: row[1] });
      const result = await client.getCachedData('admins', mapFunc);

      expect(mockSheetsApi.spreadsheets.values.get).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'admin-1', email: 'test@test.com' }]);
    });

    test('should return cached data on cache hit', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [['admin-1', 'test@test.com']],
        },
      });

      const mapFunc = row => ({ id: row[0], email: row[1] });

      // First call - cache miss
      await client.getCachedData('admins', mapFunc);
      expect(mockSheetsApi.spreadsheets.values.get).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      const result = await client.getCachedData('admins', mapFunc);
      expect(mockSheetsApi.spreadsheets.values.get).toHaveBeenCalledTimes(1); // Not called again
      expect(result).toEqual([{ id: 'admin-1', email: 'test@test.com' }]);
    });

    test('should refresh cache after TTL expires', async () => {
      jest.useFakeTimers();

      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [['admin-1', 'test@test.com']],
        },
      });

      const mapFunc = row => ({ id: row[0], email: row[1] });

      // First call
      await client.getCachedData('admins', mapFunc);
      expect(mockSheetsApi.spreadsheets.values.get).toHaveBeenCalledTimes(1);

      // Advance time past TTL (5 minutes)
      jest.advanceTimersByTime(6 * 60 * 1000);

      // Second call - cache expired
      await client.getCachedData('admins', mapFunc);
      expect(mockSheetsApi.spreadsheets.values.get).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('clearCache', () => {
    test('should clear specific sheet cache', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['test']] },
      });

      await client.getCachedData('admins', row => ({ id: row[0] }));
      expect(client.cache.has('admins')).toBe(true);

      client.clearCache('admins');
      expect(client.cache.has('admins')).toBe(false);
      expect(client.cacheTimestamps.has('admins')).toBe(false);
    });

    test('should clear all caches when no key specified', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['test']] },
      });

      await client.getCachedData('admins', row => ({ id: row[0] }));
      await client.getCachedData('students', row => ({ id: row[0] }));

      client.clearCache();
      expect(client.cache.size).toBe(0);
      expect(client.cacheTimestamps.size).toBe(0);
    });
  });

  describe('getFromSheetByColumnValue', () => {
    test('should filter records by column value', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['student-1', 'Smith', 'John'],
            ['student-2', 'Doe', 'Jane'],
            ['student-3', 'Smith', 'Bob'],
          ],
        },
      });

      const result = await client.getFromSheetByColumnValue('students', 'lastName', 'Smith');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('student-1');
      expect(result[0].lastName).toBe('Smith');
      expect(result[1].id).toBe('student-3');
      expect(result[1].lastName).toBe('Smith');
    });

    test('should return empty array when no matches found', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['student-1', 'Smith', 'John'],
          ],
        },
      });

      const result = await client.getFromSheetByColumnValue('students', 'lastName', 'NonExistent');

      expect(result).toEqual([]);
    });
  });

  describe('getFromSheetByColumnValueSingle', () => {
    test('should return first matching record', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['student-1', 'Smith', 'John'],
            ['student-2', 'Smith', 'Jane'],
          ],
        },
      });

      const result = await client.getFromSheetByColumnValueSingle('students', 'lastName', 'Smith');

      expect(result).toBeDefined();
      expect(result.id).toBe('student-1');
      expect(result.firstName).toBe('John');
    });

    test('should return null when no match found', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['student-1', 'Smith', 'John'],
          ],
        },
      });

      const result = await client.getFromSheetByColumnValueSingle('students', 'lastName', 'NonExistent');

      expect(result).toBeNull();
    });
  });

  describe('insertIntoSheet', () => {
    test('should insert data and clear cache', async () => {
      mockSheetsApi.spreadsheets.values.append.mockResolvedValue({
        data: {
          updates: {
            updatedCells: 5,
            updatedRows: 1,
          },
        },
      });

      // Add to cache first
      client.cache.set('admins', [{ id: 'old-data' }]);
      client.cacheTimestamps.set('admins', Date.now());

      const data = {
        id: 'admin-1',
        email: 'test@test.com',
        lastName: 'Doe',
        firstName: 'John',
        phone: '555-1234',
      };

      await client.insertIntoSheet('admins', data);

      expect(mockSheetsApi.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'admins!A:A',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['admin-1', 'test@test.com', 'Doe', 'John', '555-1234']],
        },
      });

      // Verify cache was cleared
      expect(client.cache.has('admins')).toBe(false);
      expect(client.cacheTimestamps.has('admins')).toBe(false);
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
      };

      await client.insertIntoSheet('admins', data);

      // Verify row has empty strings for missing columns
      const call = mockSheetsApi.spreadsheets.values.append.mock.calls[0][0];
      expect(call.requestBody.values[0]).toEqual(['admin-1', 'test@test.com', '', '', '555-1234']);
    });
  });

  describe('updateRecord', () => {
    test('should find and update record by ID', async () => {
      // Mock getAllRecords to return existing data
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['admin-1', 'old@test.com', 'Doe', 'John', '555-1234'],
            ['admin-2', 'admin2@test.com', 'Smith', 'Jane', '555-5678'],
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
      };

      await client.updateRecord('admins', updatedRecord, 'test-user');

      // Should update row 3 (startRow 2 + rowIndex 1)
      expect(mockSheetsApi.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'admins!A3:Z3',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['admin-2', 'updated@test.com', 'Smith', 'Jane', '555-9999']],
        },
      });
    });

    test('should not update when record not found', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['admin-1', 'admin1@test.com', 'Doe', 'John', '555-1234'],
          ],
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
          sheets: [{
            properties: {
              sheetId: 123,
              title: 'admins',
            },
          }],
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
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 123,
                dimension: 'ROWS',
                startIndex: 2,
                endIndex: 3,
              },
            },
          }],
        },
      });
    });

    test('should not delete when record not found', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['admin-1', 'admin1@test.com', 'Doe', 'John', '555-1234'],
          ],
        },
      });

      await client.deleteRecord('admins', 'non-existent', 'test-user');

      expect(mockSheetsApi.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getMaxIdFromSheet', () => {
    test('should return max numeric ID', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['5', 'test'],
            ['10', 'test'],
            ['3', 'test'],
          ],
        },
      });

      const maxId = await client.getMaxIdFromSheet('admins');

      expect(maxId).toBe(10);
    });

    test('should return 0 for empty sheet', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const maxId = await client.getMaxIdFromSheet('admins');

      expect(maxId).toBe(0);
    });

    test('should ignore non-numeric IDs', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['uuid-123', 'test'],
            ['5', 'test'],
            ['abc', 'test'],
          ],
        },
      });

      const maxId = await client.getMaxIdFromSheet('admins');

      expect(maxId).toBe(5);
    });

    test('should return 0 when all IDs are non-numeric', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['uuid-123', 'test'],
            ['uuid-456', 'test'],
          ],
        },
      });

      const maxId = await client.getMaxIdFromSheet('admins');

      expect(maxId).toBe(0);
    });
  });

  describe('getAllDataParallel', () => {
    test('should load multiple sheets in parallel', async () => {
      mockSheetsApi.spreadsheets.values.get
        .mockResolvedValueOnce({
          data: { values: [['admin-1', 'admin@test.com']] },
        })
        .mockResolvedValueOnce({
          data: { values: [['student-1', 'Smith']] },
        });

      const mapFunctions = {
        admins: row => ({ id: row[0], email: row[1] }),
        students: row => ({ id: row[0], lastName: row[1] }),
      };

      const result = await client.getAllDataParallel(['admins', 'students'], mapFunctions);

      expect(result).toHaveProperty('admins');
      expect(result).toHaveProperty('students');
      expect(result.admins).toEqual([{ id: 'admin-1', email: 'admin@test.com' }]);
      expect(result.students).toEqual([{ id: 'student-1', lastName: 'Smith' }]);
    });
  });

  describe('batchWrite', () => {
    test('should write multiple operations and clear affected caches', async () => {
      // Add some cached data
      client.cache.set('admins', [{ id: 'old' }]);
      client.cache.set('students', [{ id: 'old' }]);
      client.cacheTimestamps.set('admins', Date.now());
      client.cacheTimestamps.set('students', Date.now());

      mockSheetsApi.spreadsheets.values.batchUpdate.mockResolvedValue({
        data: { totalUpdatedCells: 10 },
      });

      const operations = [
        { range: 'admins!A2:E2', values: [['admin-1', 'test@test.com', 'Doe', 'John', '555-1234']] },
        { range: 'students!A2:C2', values: [['student-1', 'Smith', 'Jane']] },
      ];

      await client.batchWrite(operations);

      expect(mockSheetsApi.spreadsheets.values.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        resource: {
          valueInputOption: 'RAW',
          data: operations.map(op => ({ range: op.range, values: op.values })),
        },
      });

      // Verify affected caches were cleared
      expect(client.cache.has('admins')).toBe(false);
      expect(client.cache.has('students')).toBe(false);
    });
  });
});
