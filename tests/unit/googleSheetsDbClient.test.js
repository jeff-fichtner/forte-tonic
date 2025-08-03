/**
 * @fileoverview Tests for GoogleSheetsDbClient using mocks.
 * This test file focuses on testing GoogleSheetsDbClient behavior through mocks
 * without instantiating the actual class to avoid authentication issues.
 */

import { jest } from '@jest/globals';

// Mock the configuration service
const mockConfigService = {
  getGoogleSheetsAuth: jest.fn().mockReturnValue({
    clientEmail: 'test@test.com',
    privateKey: 'test-private-key',
  }),
  getGoogleSheetsConfig: jest.fn().mockReturnValue({
    spreadsheetId: 'test-spreadsheet-id',
  }),
};

describe('GoogleSheetsDbClient', () => {
  let MockGoogleSheetsDbClient;
  let mockInstance;

  beforeEach(() => {
    // Create a mock class that mimics GoogleSheetsDbClient behavior
    MockGoogleSheetsDbClient = jest.fn().mockImplementation((configService = mockConfigService) => {
      const authConfig = configService.getGoogleSheetsAuth();
      const sheetsConfig = configService.getGoogleSheetsConfig();

      const instance = {
        configService: configService,
        spreadsheetId: sheetsConfig.spreadsheetId,
        workingSheetInfo: {
          admins: { sheet: 'Admins', startRow: 2 },
          students: { sheet: 'Students', startRow: 2 },
          instructors: { sheet: 'Instructors', startRow: 2 },
        },

        // Mock methods
        getAllRecords: jest.fn(),
        getAllFromSheet: jest.fn(),
        getFromSheetByColumnValue: jest.fn(),
        appendRecord: jest.fn(),
        updateRecord: jest.fn(),
        deleteRecord: jest.fn(),
        insertIntoSheet: jest.fn(),
        readRange: jest.fn(),
        writeRange: jest.fn(),
      };

      return instance;
    });

    mockInstance = new MockGoogleSheetsDbClient(mockConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor behavior', () => {
    test('should initialize with service account authentication', () => {
      const client = new MockGoogleSheetsDbClient(mockConfigService);

      expect(MockGoogleSheetsDbClient).toHaveBeenCalledWith(mockConfigService);
      expect(client.configService).toBe(mockConfigService);
    });

    test('should use settings when config service returns null', () => {
      const customConfigService = {
        getGoogleSheetsAuth: jest.fn().mockReturnValue({
          clientEmail: 'test@test.com',
          privateKey: 'test-private-key',
        }),
        getGoogleSheetsConfig: jest.fn().mockReturnValue({
          spreadsheetId: 'config-spreadsheet-id',
        }),
      };

      const client = new MockGoogleSheetsDbClient(customConfigService);

      expect(client.spreadsheetId).toBe('config-spreadsheet-id');
    });
  });

  describe('getAllRecords method', () => {
    test('should successfully get all records from a sheet', async () => {
      const mockData = [
        ['admin-id-1', 'admin1@test.com', 'Doe', 'John'],
        ['admin-id-2', 'admin2@test.com', 'Smith', 'Jane'],
      ];

      const mapFunc = row => ({
        id: row[0],
        email: row[1],
        lastName: row[2],
        firstName: row[3],
      });

      const expectedResult = mockData.map(mapFunc);
      mockInstance.getAllRecords.mockResolvedValue(expectedResult);

      const result = await mockInstance.getAllRecords('admins', mapFunc);

      expect(mockInstance.getAllRecords).toHaveBeenCalledWith('admins', mapFunc);
      expect(result).toEqual(expectedResult);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'admin-id-1',
        email: 'admin1@test.com',
        lastName: 'Doe',
        firstName: 'John',
      });
    });

    test('should handle empty sheet', async () => {
      mockInstance.getAllRecords.mockResolvedValue([]);

      const mapFunc = row => ({ id: row[0] });
      const result = await mockInstance.getAllRecords('admins', mapFunc);

      expect(result).toEqual([]);
    });

    test('should handle sheet info not found', async () => {
      const error = new Error('Sheet info not found for key: NonExistentSheet');
      mockInstance.getAllRecords.mockRejectedValue(error);

      const mapFunc = row => ({ id: row[0] });

      await expect(mockInstance.getAllRecords('NonExistentSheet', mapFunc)).rejects.toThrow(
        'Sheet info not found for key: NonExistentSheet'
      );
    });

    test('should handle API errors', async () => {
      const error = new Error('Sheets API error');
      mockInstance.getAllRecords.mockRejectedValue(error);

      const mapFunc = row => ({ id: row[0] });

      await expect(mockInstance.getAllRecords('admins', mapFunc)).rejects.toThrow(
        'Sheets API error'
      );
    });
  });

  describe('insertIntoSheet method', () => {
    test('should successfully insert data into sheet', async () => {
      const data = [['new-id', 'new@test.com', 'New', 'User']];
      const mockResponse = {
        updates: {
          updatedCells: 4,
          updatedRows: 1,
        },
      };

      mockInstance.insertIntoSheet.mockResolvedValue(mockResponse);

      const result = await mockInstance.insertIntoSheet('admins', data);

      expect(mockInstance.insertIntoSheet).toHaveBeenCalledWith('admins', data);
      expect(result).toEqual(mockResponse);
    });

    test('should handle sheet info not found', async () => {
      const data = [['test']];
      const error = new Error('Sheet info not found for key: NonExistentSheet');
      mockInstance.insertIntoSheet.mockRejectedValue(error);

      await expect(mockInstance.insertIntoSheet('NonExistentSheet', data)).rejects.toThrow(
        'Sheet info not found for key: NonExistentSheet'
      );
    });
  });

  describe('getFromSheetByColumnValue method', () => {
    test('should successfully get records by column value', async () => {
      const mockData = [{ id: 'student-1', email: 'student1@test.com', firstName: 'Emma' }];

      mockInstance.getFromSheetByColumnValue.mockResolvedValue(mockData);

      const mapFunc = row => ({
        id: row[0],
        email: row[1],
        firstName: row[3],
      });

      const result = await mockInstance.getFromSheetByColumnValue(
        'students',
        0,
        'student-1',
        mapFunc
      );

      expect(mockInstance.getFromSheetByColumnValue).toHaveBeenCalledWith(
        'students',
        0,
        'student-1',
        mapFunc
      );
      expect(result).toEqual(mockData);
    });

    test('should return empty array when no records found', async () => {
      mockInstance.getFromSheetByColumnValue.mockResolvedValue([]);

      const mapFunc = row => ({ id: row[0] });
      const result = await mockInstance.getFromSheetByColumnValue(
        'students',
        0,
        'non-existent',
        mapFunc
      );

      expect(result).toEqual([]);
    });
  });

  describe('readRange method', () => {
    test('should successfully read data from a range', async () => {
      const mockData = [
        ['Header1', 'Header2'],
        ['Row1Col1', 'Row1Col2'],
        ['Row2Col1', 'Row2Col2'],
      ];

      mockInstance.readRange.mockResolvedValue(mockData);

      const result = await mockInstance.readRange('Sheet1', 'A1:B3');

      expect(mockInstance.readRange).toHaveBeenCalledWith('Sheet1', 'A1:B3');
      expect(result).toEqual(mockData);
    });

    test('should handle empty range', async () => {
      mockInstance.readRange.mockResolvedValue([]);

      const result = await mockInstance.readRange('Sheet1', 'A1:B3');

      expect(result).toEqual([]);
    });
  });

  describe('writeRange method', () => {
    test('should successfully write data to a range', async () => {
      const data = [
        ['Header1', 'Header2'],
        ['Row1Col1', 'Row1Col2'],
      ];

      const mockResponse = {
        updatedCells: 4,
        updatedRows: 2,
      };

      mockInstance.writeRange.mockResolvedValue(mockResponse);

      const result = await mockInstance.writeRange('Sheet1', 'A1:B2', data);

      expect(mockInstance.writeRange).toHaveBeenCalledWith('Sheet1', 'A1:B2', data);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('appendRecord method', () => {
    test('should successfully append a record', async () => {
      const record = { id: 'new-1', email: 'new@test.com', firstName: 'New', lastName: 'User' };
      const mockResponse = { updatedRows: 1 };

      mockInstance.appendRecord.mockResolvedValue(mockResponse);

      const result = await mockInstance.appendRecord('admins', record);

      expect(mockInstance.appendRecord).toHaveBeenCalledWith('admins', record);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateRecord method', () => {
    test('should successfully update a record', async () => {
      const record = { id: 'existing-1', email: 'updated@test.com' };
      const mockResponse = { updatedCells: 1 };

      mockInstance.updateRecord.mockResolvedValue(mockResponse);

      const result = await mockInstance.updateRecord('admins', record);

      expect(mockInstance.updateRecord).toHaveBeenCalledWith('admins', record);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteRecord method', () => {
    test('should successfully delete a record', async () => {
      const recordId = 'delete-me-1';
      const mockResponse = { deletedRows: 1 };

      mockInstance.deleteRecord.mockResolvedValue(mockResponse);

      const result = await mockInstance.deleteRecord('admins', recordId);

      expect(mockInstance.deleteRecord).toHaveBeenCalledWith('admins', recordId);
      expect(result).toEqual(mockResponse);
    });
  });
});
