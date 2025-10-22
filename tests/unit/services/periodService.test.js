import { jest } from '@jest/globals';
import { PeriodService } from '../../../src/services/periodService.js';

describe('PeriodService', () => {
  describe('getCurrentPeriod', () => {
    test('should return null when no period is marked as current', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [
            ['Fall', 'intent', false, '2025-01-15'],
            ['Fall', 'priorityEnrollment', false, '2025-02-01'],
          ];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Act
      const result = await periodService.getCurrentPeriod();

      // Assert
      expect(result).toBeNull();
      expect(mockDbClient.getAllRecords).toHaveBeenCalledWith('periods', expect.any(Function));
    });

    test('should return the period where isCurrentPeriod is TRUE', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [
            ['Fall', 'intent', true, '2025-01-15'],
            ['Fall', 'priorityEnrollment', false, '2025-02-01'],
          ];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Act
      const result = await periodService.getCurrentPeriod();

      // Assert
      expect(result).not.toBeNull();
      expect(result.trimester).toBe('Fall');
      expect(result.periodType).toBe('intent');
      expect(result.isCurrentPeriod).toBe(true);
    });

    test('should handle string TRUE values for isCurrentPeriod', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [['Winter', 'priorityEnrollment', 'TRUE', '2025-03-01']];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Act
      const result = await periodService.getCurrentPeriod();

      // Assert
      expect(result).not.toBeNull();
      expect(result.isCurrentPeriod).toBe(true);
      expect(result.periodType).toBe('priorityEnrollment');
    });

    test('should skip header row when processing periods', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [
            ['trimester', 'periodType', 'isCurrentPeriod', 'startDate'], // header
            ['Fall', 'intent', true, '2025-01-15'],
          ];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Act
      const result = await periodService.getCurrentPeriod();

      // Assert
      expect(result).not.toBeNull();
      expect(result.trimester).toBe('Fall'); // Should not be 'trimester'
    });
  });

  describe('isIntentPeriodActive', () => {
    test('should return true when current period type is intent', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [['Fall', 'intent', true, '2025-01-15']];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Act
      const result = await periodService.isIntentPeriodActive();

      // Assert
      expect(result).toBe(true);
    });

    test('should return false when current period is priorityEnrollment', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [['Fall', 'priorityEnrollment', true, '2025-02-01']];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Act
      const result = await periodService.isIntentPeriodActive();

      // Assert
      expect(result).toBe(false);
    });

    test('should return false when no current period is set', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [['Fall', 'intent', false, '2025-01-15']];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Act
      const result = await periodService.isIntentPeriodActive();

      // Assert
      expect(result).toBe(false);
    });
  });
});
