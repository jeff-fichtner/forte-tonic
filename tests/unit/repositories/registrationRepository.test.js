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
      clearCache: jest.fn(),
      deleteRecord: jest.fn().mockResolvedValue(true)
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

      // Setup mocks for new implementation
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      repository.clearCache = jest.fn();

      // Execute delete
      const result = await repository.delete(testRegistrationId, 'test-user-id');

      // Verify success
      expect(result).toBe(true);

      // Verify getById was called to check existence
      expect(repository.getById).toHaveBeenCalledWith(expect.any(RegistrationId));

      // Verify deleteRecord was called with correct parameters
      expect(mockDbClient.deleteRecord).toHaveBeenCalledWith(
        'registrations',
        testRegistrationId,
        'test-user-id'
      );

      // Verify cache clearing
      expect(repository.clearCache).toHaveBeenCalled();
      expect(mockDbClient.clearCache).toHaveBeenCalledWith('registrations');
    });

    test('should handle string ID parameter', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      repository.clearCache = jest.fn();

      await repository.delete(testRegistrationId, 'test-user-id');

      expect(repository.getById).toHaveBeenCalledWith(expect.any(RegistrationId));
    });

    test('should handle RegistrationId object parameter', async () => {
      const registrationIdObj = new RegistrationId(testRegistrationId);
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      repository.clearCache = jest.fn();

      await repository.delete(registrationIdObj, 'test-user-id');

      expect(repository.getById).toHaveBeenCalledWith(registrationIdObj);
    });

    test('should throw error if registration does not exist', async () => {
      repository.getById = jest.fn().mockResolvedValue(null);

      await expect(repository.delete(testRegistrationId, 'test-user-id'))
        .rejects.toThrow(`Registration with ID ${testRegistrationId} not found`);

      expect(mockSheets.spreadsheets.values.get).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });

    test('should handle deleteRecord failure gracefully', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockDbClient.deleteRecord.mockRejectedValue(new Error('Database delete failed'));

      await expect(repository.delete(testRegistrationId, 'test-user-id'))
        .rejects.toThrow('Database delete failed');

      expect(mockDbClient.deleteRecord).toHaveBeenCalledWith(
        'registrations',
        testRegistrationId,
        'test-user-id'
      );
    });

    test('should handle getById returning null', async () => {
      repository.getById = jest.fn().mockResolvedValue(null);

      await expect(repository.delete(testRegistrationId, 'test-user-id'))
        .rejects.toThrow(`Registration with ID ${testRegistrationId} not found`);

      expect(mockDbClient.deleteRecord).not.toHaveBeenCalled();
    });

    test('should handle deleteRecord API errors gracefully', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockDbClient.deleteRecord.mockRejectedValue(new Error('API Error'));

      await expect(repository.delete(testRegistrationId, 'test-user-id'))
        .rejects.toThrow('API Error');
    });

    test('should handle deleteRecord database errors gracefully', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockDbClient.deleteRecord.mockRejectedValue(new Error('Delete failed'));

      await expect(repository.delete(testRegistrationId, 'test-user-id'))
        .rejects.toThrow('Delete failed');
    });

    test('should clear both repository and database client caches', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      repository.clearCache = jest.fn();

      await repository.delete(testRegistrationId, 'test-user-id');

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

      repository.clearCache = jest.fn();

      const result = await repository.delete(testId, 'test-user@example.com');

      expect(result).toBe(true);
      
      // Verify deleteRecord was called correctly
      expect(mockDbClient.deleteRecord).toHaveBeenCalledWith(
        'registrations',
        testId,
        'test-user@example.com'
      );

      // Verify cache was cleared
      expect(repository.clearCache).toHaveBeenCalled();
      expect(mockDbClient.clearCache).toHaveBeenCalledWith('registrations');
    });
  });
});
