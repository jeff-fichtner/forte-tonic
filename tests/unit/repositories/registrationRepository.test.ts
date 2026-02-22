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
      insertIntoSheet: jest.fn().mockResolvedValue(true),
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
      id: testRegistrationId,
      studentId: 'student-id',
      instructorId: 'instructor-id',
      day: 'Monday',
      startTime: '10:00',
      length: 30,
      registrationType: 'private',
    };

    test('should successfully delete a registration from Google Sheets', async () => {
      repository.findByIdInTable = jest.fn().mockResolvedValue(mockRegistration);
      repository.clearCache = jest.fn();

      // Execute delete
      const result = await repository.delete(testRegistrationId, 'test-user-id', 'fall');

      // Verify success
      expect(result).toBe(true);

      // Verify findByIdInTable was called to check existence
      expect(repository.findByIdInTable).toHaveBeenCalledWith('registrations_fall', testRegistrationId);

      // Verify deleteRecord was called with correct parameters
      expect(mockDbClient.deleteRecord).toHaveBeenCalledWith(
        'registrations_fall',
        testRegistrationId,
        'test-user-id'
      );
    });

    test('should handle string ID parameter', async () => {
      repository.findByIdInTable = jest.fn().mockResolvedValue(mockRegistration);

      await repository.delete(testRegistrationId, 'test-user-id', 'fall');

      expect(repository.findByIdInTable).toHaveBeenCalledWith('registrations_fall', testRegistrationId);
    });

    test('should throw error if registration does not exist', async () => {
      repository.findByIdInTable = jest.fn().mockResolvedValue(null);

      await expect(repository.delete(testRegistrationId, 'test-user-id', 'fall')).rejects.toThrow(
        `Registration with ID ${testRegistrationId} not found in table registrations_fall`
      );

      expect(mockDbClient.deleteRecord).not.toHaveBeenCalled();
    });

    test('should require userId for audit trail', async () => {
      repository.findByIdInTable = jest.fn().mockResolvedValue(mockRegistration);

      await expect(repository.delete(testRegistrationId, undefined, 'fall')).rejects.toThrow(
        'userId is required for audit trail'
      );
    });

    test('should require trimester parameter', async () => {
      repository.findByIdInTable = jest.fn().mockResolvedValue(mockRegistration);

      await expect(repository.delete(testRegistrationId, 'test-user-id', undefined)).rejects.toThrow(
        'trimester is required to locate the registration table'
      );
    });

    test('should handle deleteRecord failure gracefully', async () => {
      repository.findByIdInTable = jest.fn().mockResolvedValue(mockRegistration);
      mockDbClient.deleteRecord.mockRejectedValue(new Error('Database delete failed'));

      await expect(repository.delete(testRegistrationId, 'test-user-id', 'fall')).rejects.toThrow(
        'Database delete failed'
      );

      expect(mockDbClient.deleteRecord).toHaveBeenCalledWith(
        'registrations_fall',
        testRegistrationId,
        'test-user-id'
      );
    });

    test('should handle findByIdInTable returning null', async () => {
      repository.findByIdInTable = jest.fn().mockResolvedValue(null);

      await expect(repository.delete(testRegistrationId, 'test-user-id', 'fall')).rejects.toThrow(
        `Registration with ID ${testRegistrationId} not found in table registrations_fall`
      );

      expect(mockDbClient.deleteRecord).not.toHaveBeenCalled();
    });

    test('should handle deleteRecord API errors gracefully', async () => {
      repository.findByIdInTable = jest.fn().mockResolvedValue(mockRegistration);
      mockDbClient.deleteRecord.mockRejectedValue(new Error('API Error'));

      await expect(repository.delete(testRegistrationId, 'test-user-id', 'fall')).rejects.toThrow(
        'API Error'
      );
    });

    test('should handle deleteRecord database errors gracefully', async () => {
      repository.findByIdInTable = jest.fn().mockResolvedValue(mockRegistration);
      mockDbClient.deleteRecord.mockRejectedValue(new Error('Delete failed'));

      await expect(repository.delete(testRegistrationId, 'test-user-id', 'fall')).rejects.toThrow(
        'Delete failed'
      );
    });

    test('should verify dbClient handles cache clearing', async () => {
      repository.findByIdInTable = jest.fn().mockResolvedValue(mockRegistration);

      await repository.delete(testRegistrationId, 'test-user-id', 'fall');

      // Cache is now handled at dbClient layer automatically
      expect(mockDbClient.deleteRecord).toHaveBeenCalled();
    });
  });

  describe('delete integration with service layer', () => {
    test('should properly integrate with registration service cancellation', async () => {
      const testId = 'da8ca6c8-7626-40c3-9173-319f15effaea'; // Valid UUID

      repository.findByIdInTable = jest.fn().mockResolvedValue({
        id: testId,
        studentId: 'student-123',
        instructorId: 'instructor-456',
      });

      const result = await repository.delete(testId, 'test-user@example.com', 'fall');

      expect(result).toBe(true);

      // Verify deleteRecord was called correctly
      expect(mockDbClient.deleteRecord).toHaveBeenCalledWith(
        'registrations_fall',
        testId,
        'test-user@example.com'
      );
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

      mockDbClient.appendRecord = jest.fn().mockResolvedValue(true);

      const result = await repository.createInTable('registrations_winter', registrationData);

      expect(result).toBeDefined();
      expect(result.studentId).toBe('student-1');
      expect(mockDbClient.appendRecord).toHaveBeenCalledWith(
        'registrations_winter',
        expect.any(Object),
        'test-user@example.com'
      );
      // Cache is handled at dbClient layer
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

      mockDbClient.appendRecord = jest.fn().mockResolvedValue(true);
      repository.clearCache = jest.fn();

      const result = await repository.createInTable('registrations_spring', registrationData);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
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

      mockDbClient.appendRecord = jest.fn().mockResolvedValue(true);
      repository.clearCache = jest.fn();

      const result = await repository.createInTable('registrations_fall', registrationData);

      // Should not throw error and should create registration
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });
});
