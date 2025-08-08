/**
 * Registration Repository Delete Functionality Tests
 * ==================================================
 * 
 * Tests for complete delete integrity including:
 * - Row deletion from Google Sheets
 * - Cache invalidation 
 * - Error handling
 * - Data consistency
 */

// Import Jest testing utilities instead of Vitest
import { jest } from '@jest/globals';
import { RegistrationRepository } from '../../../src/repositories/registrationRepository.js';
import { RegistrationId } from '../../../src/utils/values/registrationId.js';
import { Registration } from '../../../src/models/shared/registration.js';

describe('RegistrationRepository - Delete Functionality', () => {
  let repository;
  let mockDbClient;
  let mockSheets;

  beforeEach(() => {
    // Mock Google Sheets API
    mockSheets = {
      spreadsheets: {
        values: {
          get: jest.fn()
        },
        batchUpdate: jest.fn()
      }
    };

    // Mock database client
    mockDbClient = {
      spreadsheetId: 'test-spreadsheet-id',
      sheets: mockSheets,
      cache: {
        delete: jest.fn()
      },
      getCachedData: jest.fn(),
      clearCache: jest.fn()
    };

    repository = new RegistrationRepository(mockDbClient);
    repository.clearCache = jest.fn();
    repository.cache = new Map(); // Add cache to repository for testing
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('delete method', () => {
    const testRegistrationId = 'da8ca6c8-7626-40c3-9173-319f15effaea';
    const mockRegistration = {
      id: new RegistrationId(testRegistrationId),
      studentId: 'student-id',
      instructorId: 'instructor-id',
      day: 'Monday',
      startTime: '10:00',
      length: 30,
      registrationType: 'private'
    };

    test('should successfully delete a registration from Google Sheets', async () => {
      // Mock getById to return a registration
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);

      // Mock Google Sheets response with test data
      const mockSheetData = {
        data: {
          values: [
            ['Id', 'StudentId', 'InstructorId', 'Day', 'StartTime'], // Header
            [testRegistrationId, 'student-1', 'instructor-1', 'Monday', '09:00'], // Row 1
            ['other-id', 'student-2', 'instructor-2', 'Tuesday', '10:00'], // Row 2
            [testRegistrationId, 'student-3', 'instructor-3', 'Wednesday', '11:00'] // Row 3 - Target
          ]
        }
      };

      mockSheets.spreadsheets.values.get.mockResolvedValue(mockSheetData);
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });

      // Execute delete
      const result = await repository.delete(testRegistrationId);

      // Verify success
      expect(result).toBe(true);

      // Verify getById was called to check existence
      expect(repository.getById).toHaveBeenCalledWith(expect.any(RegistrationId));

      // Verify Google Sheets API calls
      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'registrations!A:Z'
      });

      // Verify batchUpdate was called to delete the correct row (first occurrence)
      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 1484108306, // Correct sheetId for registrations sheet
                dimension: 'ROWS',
                startIndex: 1, // Row 2 in spreadsheet (0-based: header=0, first data row=1)
                endIndex: 2
              }
            }
          }]
        }
      });

      // Verify cache clearing
      expect(repository.clearCache).toHaveBeenCalled();
      expect(mockDbClient.clearCache).toHaveBeenCalledWith('registrations');
    });

    test('should handle string ID parameter', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['Id'], [testRegistrationId]] }
      });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });

      await repository.delete(testRegistrationId);

      expect(repository.getById).toHaveBeenCalledWith(expect.any(RegistrationId));
    });

    test('should handle RegistrationId object parameter', async () => {
      const registrationIdObj = new RegistrationId(testRegistrationId);
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['Id'], [testRegistrationId]] }
      });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });

      await repository.delete(registrationIdObj);

      expect(repository.getById).toHaveBeenCalledWith(registrationIdObj);
    });

    test('should throw error if registration does not exist', async () => {
      repository.getById = jest.fn().mockResolvedValue(null);

      await expect(repository.delete(testRegistrationId))
        .rejects.toThrow(`Registration with ID ${testRegistrationId} not found`);

      expect(mockSheets.spreadsheets.values.get).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });

    test('should throw error if registration not found in sheet data', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Id', 'StudentId'],
            ['different-id', 'student-1']
          ]
        }
      });

      await expect(repository.delete(testRegistrationId))
        .rejects.toThrow(`Registration with ID ${testRegistrationId} not found`);

      expect(mockSheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });

    test('should handle empty sheet data', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] }
      });

      await expect(repository.delete(testRegistrationId))
        .rejects.toThrow(`Registration with ID ${testRegistrationId} not found`);
    });

    test('should handle Google Sheets API errors gracefully', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockSheets.spreadsheets.values.get.mockRejectedValue(new Error('API Error'));

      await expect(repository.delete(testRegistrationId))
        .rejects.toThrow('API Error');

      expect(mockSheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });

    test('should handle batchUpdate errors gracefully', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['Id'], [testRegistrationId]] }
      });
      mockSheets.spreadsheets.batchUpdate.mockRejectedValue(new Error('Delete failed'));

      await expect(repository.delete(testRegistrationId))
        .rejects.toThrow('Delete failed');
    });

    test('should clear both repository and database client caches', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['Id'], [testRegistrationId]] }
      });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });

      await repository.delete(testRegistrationId);

      expect(repository.clearCache).toHaveBeenCalled();
      expect(mockDbClient.clearCache).toHaveBeenCalledWith('registrations');
    });
  });

  describe('delete integration with service layer', () => {
    test('should properly integrate with registration service cancellation', async () => {
      const testId = 'da8ca6c8-7626-40c3-9173-319f15effaea'; // Valid UUID
      
      // Mock a realistic scenario
      repository.getById = jest.fn().mockResolvedValue({
        id: new RegistrationId(testId),
        studentId: 'student-123',
        instructorId: 'instructor-456'
      });

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Id', 'StudentId', 'InstructorId'],
            ['other-id-1', 'student-1', 'instructor-1'],
            [testId, 'student-123', 'instructor-456'],
            ['other-id-2', 'student-2', 'instructor-2']
          ]
        }
      });

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });

      const result = await repository.delete(testId, 'test-user@example.com');

      expect(result).toBe(true);
      
      // Verify correct row was targeted (row 3 in sheet, index 2 in data, so startIndex should be 2)
      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 1484108306, // Correct sheetId for registrations sheet
                dimension: 'ROWS',
                startIndex: 2, // 0-based: header=0, first row=1, target row=2
                endIndex: 3
              }
            }
          }]
        }
      });
    });
  });
});
