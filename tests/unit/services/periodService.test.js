import { jest } from '@jest/globals';
import { PeriodService } from '../../../src/services/periodService.js';

describe('PeriodService', () => {
  describe('getCurrentPeriod', () => {
    let dateSpy;

    afterEach(() => {
      if (dateSpy) {
        dateSpy.mockRestore();
      }
    });

    test('should return null when no period has started yet', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [
            ['Fall', 'intent', '2025-12-15'],
            ['Fall', 'priorityEnrollment', '2026-01-01'],
          ];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Mock current date to be before all periods
      const RealDate = Date;
      dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return new RealDate('2025-08-01');
        }
        return new RealDate(...args);
      });

      // Act
      const result = await periodService.getCurrentPeriod();

      // Assert
      expect(result).toBeNull();
      expect(mockDbClient.getAllRecords).toHaveBeenCalledWith('periods', expect.any(Function));
    });

    test('should return the period with the latest startDate that has already started', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [
            ['Fall', 'intent', '2025-01-15'],
            ['Fall', 'priorityEnrollment', '2025-02-01'],
          ];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Mock current date to be after both periods started
      const RealDate = Date;
      dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return new RealDate('2025-02-15');
        }
        return new RealDate(...args);
      });

      // Act
      const result = await periodService.getCurrentPeriod();

      // Assert
      expect(result).not.toBeNull();
      expect(result.trimester).toBe('Fall');
      expect(result.periodType).toBe('priorityEnrollment');
      expect(result.isCurrentPeriod).toBe(true);
    });

    test('should handle periods not in chronological order', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [
            ['Winter', 'intent', '2025-03-01'], // Future
            ['Fall', 'priorityEnrollment', '2025-02-01'], // Current (latest that started)
            ['Fall', 'intent', '2025-01-15'], // Past
          ];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Mock current date
      const RealDate = Date;
      dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return new RealDate('2025-02-15');
        }
        return new RealDate(...args);
      });

      // Act
      const result = await periodService.getCurrentPeriod();

      // Assert
      expect(result).not.toBeNull();
      expect(result.periodType).toBe('priorityEnrollment');
      expect(result.isCurrentPeriod).toBe(true);
    });

    test('should skip header row when processing periods', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [
            ['trimester', 'periodType', 'startDate'], // header
            ['Fall', 'intent', '2025-01-15'],
          ];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Mock current date
      const RealDate = Date;
      dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return new RealDate('2025-02-01');
        }
        return new RealDate(...args);
      });

      // Act
      const result = await periodService.getCurrentPeriod();

      // Assert
      expect(result).not.toBeNull();
      expect(result.trimester).toBe('Fall'); // Should not be 'trimester'
    });

    test('should filter out periods with missing startDate', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [
            ['Fall', 'intent', null], // No start date
            ['Fall', 'priorityEnrollment', '2025-02-01'],
          ];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Mock current date
      const RealDate = Date;
      dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return new RealDate('2025-02-15');
        }
        return new RealDate(...args);
      });

      // Act
      const result = await periodService.getCurrentPeriod();

      // Assert
      expect(result).not.toBeNull();
      expect(result.periodType).toBe('priorityEnrollment');
    });
  });

  describe('isIntentPeriodActive', () => {
    let dateSpy;

    afterEach(() => {
      if (dateSpy) {
        dateSpy.mockRestore();
      }
    });

    test('should return true when current period type is intent', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [['Fall', 'intent', '2025-01-15']];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Mock current date
      const RealDate = Date;
      dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return new RealDate('2025-02-01');
        }
        return new RealDate(...args);
      });

      // Act
      const result = await periodService.isIntentPeriodActive();

      // Assert
      expect(result).toBe(true);
    });

    test('should return false when current period is priorityEnrollment', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [['Fall', 'priorityEnrollment', '2025-02-01']];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Mock current date
      const RealDate = Date;
      dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return new RealDate('2025-02-15');
        }
        return new RealDate(...args);
      });

      // Act
      const result = await periodService.isIntentPeriodActive();

      // Assert
      expect(result).toBe(false);
    });

    test('should return false when no current period has started', async () => {
      // Arrange
      const mockDbClient = {
        getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
          const rows = [['Fall', 'intent', '2025-12-15']];
          return Promise.resolve(rows.map(mapper).filter(Boolean));
        }),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const periodService = new PeriodService(mockDbClient, mockConfigService);

      // Mock current date to be before period starts
      const RealDate = Date;
      dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return new RealDate('2025-08-01');
        }
        return new RealDate(...args);
      });

      // Act
      const result = await periodService.isIntentPeriodActive();

      // Assert
      expect(result).toBe(false);
    });
  });
});
