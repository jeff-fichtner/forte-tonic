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
  let mockConfigService;
  let mockPeriodService;

  beforeEach(() => {
    // Mock Google Sheets API
    mockSheets = {
      spreadsheets: {
        values: {
          get: jest.fn(),
        },
        batchUpdate: jest.fn(),
      },
    };

    // Mock database client (no caching - handled by repositories)
    mockDbClient = {
      spreadsheetId: 'test-spreadsheet-id',
      sheets: mockSheets,
      deleteRecord: jest.fn().mockResolvedValue(true),
    };

    // Create mock config service
    mockConfigService = {
      getConfig: jest.fn(() => ({
        environment: 'test',
        logLevel: 'info',
      })),
    };

    // Create mock period service
    mockPeriodService = {
      getCurrentTrimesterTable: jest.fn().mockResolvedValue('registrations_fall'),
      getCurrentPeriod: jest.fn().mockResolvedValue({
        trimester: 'fall',
        periodType: 'active',
      }),
    };

    repository = new RegistrationRepository(mockDbClient, mockConfigService, mockPeriodService);
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
      registrationType: 'private',
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
            [testRegistrationId, 'student-3', 'instructor-3', 'Wednesday', '11:00'], // Row 3 - Target
          ],
        },
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
        'registrations_fall',
        testRegistrationId,
        'test-user-id'
      );

      // Verify cache clearing
      expect(repository.clearCache).toHaveBeenCalled();
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

      await expect(repository.delete(testRegistrationId, 'test-user-id')).rejects.toThrow(
        `Registration with ID ${testRegistrationId} not found`
      );

      expect(mockSheets.spreadsheets.values.get).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });

    test('should require userId for audit trail', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);

      await expect(repository.delete(testRegistrationId)).rejects.toThrow(
        'userId is required for audit trail'
      );
    });

    test('should handle deleteRecord failure gracefully', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockDbClient.deleteRecord.mockRejectedValue(new Error('Database delete failed'));

      await expect(repository.delete(testRegistrationId, 'test-user-id')).rejects.toThrow(
        'Database delete failed'
      );

      expect(mockDbClient.deleteRecord).toHaveBeenCalledWith(
        'registrations_fall',
        testRegistrationId,
        'test-user-id'
      );
    });

    test('should handle getById returning null', async () => {
      repository.getById = jest.fn().mockResolvedValue(null);

      await expect(repository.delete(testRegistrationId, 'test-user-id')).rejects.toThrow(
        `Registration with ID ${testRegistrationId} not found`
      );

      expect(mockDbClient.deleteRecord).not.toHaveBeenCalled();
    });

    test('should handle deleteRecord API errors gracefully', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockDbClient.deleteRecord.mockRejectedValue(new Error('API Error'));

      await expect(repository.delete(testRegistrationId, 'test-user-id')).rejects.toThrow(
        'API Error'
      );
    });

    test('should handle deleteRecord database errors gracefully', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockDbClient.deleteRecord.mockRejectedValue(new Error('Delete failed'));

      await expect(repository.delete(testRegistrationId, 'test-user-id')).rejects.toThrow(
        'Delete failed'
      );
    });

    test('should clear repository cache', async () => {
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      repository.clearCache = jest.fn();

      await repository.delete(testRegistrationId, 'test-user-id');

      expect(repository.clearCache).toHaveBeenCalled();
      // DB client no longer has caching - removed in refactor
    });
  });

  describe('delete integration with service layer', () => {
    test('should properly integrate with registration service cancellation', async () => {
      const testId = 'da8ca6c8-7626-40c3-9173-319f15effaea'; // Valid UUID

      // Mock a realistic scenario
      repository.getById = jest.fn().mockResolvedValue({
        id: new RegistrationId(testId),
        studentId: 'student-123',
        instructorId: 'instructor-456',
      });

      repository.clearCache = jest.fn();

      const result = await repository.delete(testId, 'test-user@example.com');

      expect(result).toBe(true);

      // Verify deleteRecord was called correctly
      expect(mockDbClient.deleteRecord).toHaveBeenCalledWith(
        'registrations_fall',
        testId,
        'test-user@example.com'
      );

      // Verify cache was cleared
      expect(repository.clearCache).toHaveBeenCalled();
    });
  });

  describe('getRegistrationsByTrimester', () => {
    test('should get registrations for valid trimester', async () => {
      const mockRegistrations = [
        {
          id: 'c4b3d3f0-1234-4567-89ab-cdef01234567',
          studentId: 'student-1',
          instructorId: 'instructor-1',
        },
      ];

      repository.getFromTable = jest.fn().mockResolvedValue(mockRegistrations);

      const result = await repository.getRegistrationsByTrimester('fall');

      expect(result).toEqual(mockRegistrations);
      expect(repository.getFromTable).toHaveBeenCalledWith('registrations_fall');
    });

    test('should throw error for invalid trimester', async () => {
      await expect(repository.getRegistrationsByTrimester('summer')).rejects.toThrow(
        'Invalid trimester: summer'
      );
    });

    test('should throw error for capitalized trimester', async () => {
      await expect(repository.getRegistrationsByTrimester('Fall')).rejects.toThrow(
        'Invalid trimester: Fall'
      );
    });

    test('should work with all valid trimesters', async () => {
      repository.getFromTable = jest.fn().mockResolvedValue([]);

      await repository.getRegistrationsByTrimester('fall');
      expect(repository.getFromTable).toHaveBeenCalledWith('registrations_fall');

      await repository.getRegistrationsByTrimester('winter');
      expect(repository.getFromTable).toHaveBeenCalledWith('registrations_winter');

      await repository.getRegistrationsByTrimester('spring');
      expect(repository.getFromTable).toHaveBeenCalledWith('registrations_spring');
    });
  });

  describe('getFromTable', () => {
    test('should get registrations from specific table', async () => {
      const mockData = [
        ['reg-1', 'student-1', 'instructor-1'],
        ['reg-2', 'student-2', 'instructor-2'],
      ];

      mockDbClient.getAllRecords = jest.fn().mockResolvedValue([{ id: 'reg-1' }, { id: 'reg-2' }]);

      const result = await repository.getFromTable('registrations_fall');

      expect(mockDbClient.getAllRecords).toHaveBeenCalledWith(
        'registrations_fall',
        expect.any(Function)
      );
      expect(result).toHaveLength(2);
    });

    test('should handle empty table', async () => {
      mockDbClient.getAllRecords = jest.fn().mockResolvedValue([]);

      const result = await repository.getFromTable('registrations_winter');

      expect(result).toEqual([]);
    });

    test('should filter out null entries from invalid rows', async () => {
      mockDbClient.getAllRecords = jest.fn().mockResolvedValue([
        { id: 'reg-1' },
        null, // Invalid row
        { id: 'reg-2' },
      ]);

      const result = await repository.getFromTable('registrations_spring');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('reg-1');
      expect(result[1].id).toBe('reg-2');
    });
  });

  describe('createInTable', () => {
    test('should create registration in specific table', async () => {
      const registrationData = {
        studentId: 'student-1',
        instructorId: 'instructor-1',
        day: 'Monday',
        startTime: '10:00',
        length: 30,
        registrationType: 'private',
        createdBy: 'test-user@example.com',
      };

      mockDbClient.appendRecordv2 = jest.fn().mockResolvedValue(true);
      repository.clearCache = jest.fn();

      const result = await repository.createInTable('registrations_winter', registrationData);

      expect(result).toBeDefined();
      // studentId is wrapped in value object, check the value property
      expect(result.studentId.value || result.studentId).toBe('student-1');
      expect(mockDbClient.appendRecordv2).toHaveBeenCalledWith(
        'registrations_winter',
        expect.any(Object),
        'test-user@example.com'
      );
      expect(repository.clearCache).toHaveBeenCalled();
    });

    test('should throw error if createdBy is missing', async () => {
      const registrationData = {
        studentId: 'student-1',
        instructorId: 'instructor-1',
        day: 'Monday',
        startTime: '10:00',
        length: 30,
        registrationType: 'private',
      };

      await expect(
        repository.createInTable('registrations_fall', registrationData)
      ).rejects.toThrow('createdBy is required for audit trail');
    });

    test('should generate UUID if not provided', async () => {
      const registrationData = {
        studentId: 'student-1',
        instructorId: 'instructor-1',
        day: 'Monday',
        startTime: '10:00',
        length: 30,
        registrationType: 'private',
        createdBy: 'test-user@example.com',
      };

      mockDbClient.appendRecordv2 = jest.fn().mockResolvedValue(true);
      repository.clearCache = jest.fn();

      const result = await repository.createInTable('registrations_spring', registrationData);

      expect(result.id).toBeDefined();
      // ID can be either a string or value object
      const idValue = result.id.value || result.id;
      expect(typeof idValue).toBe('string');
      expect(idValue).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    test('should accept linkedPreviousRegistrationId without error', async () => {
      const registrationData = {
        studentId: 'student-1',
        instructorId: 'instructor-1',
        day: 'Monday',
        startTime: '10:00',
        length: 30,
        registrationType: 'private',
        linkedPreviousRegistrationId: 'c4b3d3f0-1234-4567-89ab-cdef01234567',
        createdBy: 'test-user@example.com',
      };

      mockDbClient.appendRecordv2 = jest.fn().mockResolvedValue(true);
      repository.clearCache = jest.fn();

      const result = await repository.createInTable('registrations_fall', registrationData);

      // Should not throw error and should create registration
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });
});
