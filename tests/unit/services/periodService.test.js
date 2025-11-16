import { jest } from '@jest/globals';
import { PeriodService } from '../../../src/services/periodService.js';
import { PeriodType } from '../../../src/utils/values/periodType.js';

// Test helpers
function createPeriodService(periods) {
  const mockDbClient = {
    getAllRecords: jest.fn().mockImplementation((sheetKey, mapper) => {
      return Promise.resolve(periods.map(mapper).filter(Boolean));
    }),
  };
  const mockConfigService = {
    getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
  };
  return { service: new PeriodService(mockDbClient, mockConfigService), mockDbClient };
}

function mockCurrentDate(dateString) {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(dateString));
}

function restoreTime() {
  jest.useRealTimers();
}

// Test data constants
const PERIOD_FALL_INTENT = ['fall', 'intent', '2025-01-15'];
const PERIOD_FALL_PRIORITY = ['fall', 'priorityEnrollment', '2025-02-01'];
const PERIOD_FALL_OPEN = ['fall', 'openEnrollment', '2025-02-15'];
const PERIOD_WINTER_INTENT = ['winter', 'intent', '2025-03-01'];
const PERIOD_WINTER_PRIORITY = ['winter', 'priorityEnrollment', '2025-04-01'];

describe('PeriodService', () => {
  afterEach(() => {
    restoreTime();
  });

  describe('getCurrentPeriod', () => {
    test('should return null when no period has started yet', async () => {
      mockCurrentDate('2025-01-01');
      const { service } = createPeriodService([PERIOD_FALL_INTENT, PERIOD_FALL_PRIORITY]);

      const result = await service.getCurrentPeriod();

      expect(result).toBeNull();
    });

    test('should return the period with the latest startDate that has already started', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([PERIOD_FALL_INTENT, PERIOD_FALL_PRIORITY]);

      const result = await service.getCurrentPeriod();

      expect(result).not.toBeNull();
      expect(result.trimester).toBe('fall');
      expect(result.periodType).toBe('priorityEnrollment');
      expect(result.isCurrentPeriod).toBe(true);
    });

    test('should handle periods not in chronological order', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([
        PERIOD_WINTER_INTENT, // Future
        PERIOD_FALL_PRIORITY, // Current (latest that started)
        PERIOD_FALL_INTENT, // Past
      ]);

      const result = await service.getCurrentPeriod();

      expect(result).not.toBeNull();
      expect(result.periodType).toBe('priorityEnrollment');
      expect(result.isCurrentPeriod).toBe(true);
    });

    test('should handle invalid date strings gracefully', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([
        ['Fall', 'intent', 'invalid-date'], // Invalid date
        PERIOD_FALL_PRIORITY, // Valid date
      ]);

      const result = await service.getCurrentPeriod();

      expect(result).not.toBeNull();
      expect(result.periodType).toBe('priorityEnrollment');
    });

    test('should filter out periods with missing startDate', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([
        ['Fall', 'intent', null], // No start date
        PERIOD_FALL_PRIORITY,
      ]);

      const result = await service.getCurrentPeriod();

      expect(result).not.toBeNull();
      expect(result.periodType).toBe('priorityEnrollment');
    });

    test('should handle empty periods array', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([]);

      const result = await service.getCurrentPeriod();

      expect(result).toBeNull();
    });

    test('should handle periods with same startDate', async () => {
      mockCurrentDate('2025-02-15');
      const sameDate = '2025-02-01';
      const { service } = createPeriodService([
        ['Fall', 'intent', sameDate],
        ['Fall', 'priorityEnrollment', sameDate],
      ]);

      const result = await service.getCurrentPeriod();

      // Should return one of them (implementation returns last one with max date)
      expect(result).not.toBeNull();
      expect(result.trimester).toBe('fall');
    });

    test('should handle Date objects in addition to date strings', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([
        ['Fall', 'intent', new Date('2025-01-15')],
        ['Fall', 'priorityEnrollment', '2025-02-01'], // String
      ]);

      const result = await service.getCurrentPeriod();

      expect(result).not.toBeNull();
      expect(result.periodType).toBe('priorityEnrollment');
    });

    test('should throw error when database fails', async () => {
      const mockDbClient = {
        getAllRecords: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const service = new PeriodService(mockDbClient, mockConfigService);

      await expect(service.getCurrentPeriod()).rejects.toThrow('Database connection failed');
    });
  });

  describe('isIntentPeriodActive', () => {
    test('should return true when current period type is intent', async () => {
      mockCurrentDate('2025-02-01');
      const { service } = createPeriodService([PERIOD_FALL_INTENT]);

      const result = await service.isIntentPeriodActive();

      expect(result).toBe(true);
    });

    test('should return false when current period is priorityEnrollment', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([PERIOD_FALL_PRIORITY]);

      const result = await service.isIntentPeriodActive();

      expect(result).toBe(false);
    });

    test('should return false when no current period has started', async () => {
      mockCurrentDate('2025-01-01');
      const { service } = createPeriodService([['Fall', 'intent', '2025-12-15']]);

      const result = await service.isIntentPeriodActive();

      expect(result).toBe(false);
    });
  });

  describe('getNextPeriod', () => {
    test('should return null when no future periods exist', async () => {
      mockCurrentDate('2025-03-01');
      const { service } = createPeriodService([PERIOD_FALL_INTENT, PERIOD_FALL_PRIORITY]);

      const result = await service.getNextPeriod();

      expect(result).toBeNull();
    });

    test('should return period with earliest future startDate', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([
        PERIOD_FALL_PRIORITY, // Current (started)
        PERIOD_WINTER_INTENT, // Next (earliest future)
        PERIOD_WINTER_PRIORITY, // Later future
      ]);

      const result = await service.getNextPeriod();

      expect(result).not.toBeNull();
      expect(result.trimester).toBe('winter');
      expect(result.periodType).toBe('intent');
      expect(result.startDate).toEqual(new Date('2025-03-01'));
    });

    test('should handle multiple future periods correctly', async () => {
      mockCurrentDate('2025-01-01');
      const { service } = createPeriodService([
        PERIOD_FALL_INTENT,
        PERIOD_FALL_PRIORITY,
        PERIOD_WINTER_INTENT,
      ]);

      const result = await service.getNextPeriod();

      expect(result).not.toBeNull();
      expect(result.trimester).toBe('fall');
      expect(result.periodType).toBe('intent');
    });

    test('should exclude periods that have already started', async () => {
      mockCurrentDate('2025-02-01');
      const { service } = createPeriodService([
        PERIOD_FALL_INTENT, // Past
        PERIOD_FALL_PRIORITY, // Today (counts as started)
        PERIOD_WINTER_INTENT, // Future
      ]);

      const result = await service.getNextPeriod();

      expect(result).not.toBeNull();
      expect(result.trimester).toBe('winter');
    });

    test('should handle periods not in chronological order', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([
        PERIOD_WINTER_PRIORITY, // Later future
        PERIOD_FALL_PRIORITY, // Current
        PERIOD_WINTER_INTENT, // Next (earliest future)
      ]);

      const result = await service.getNextPeriod();

      expect(result.trimester).toBe('winter');
      expect(result.periodType).toBe('intent');
    });

    test('should handle empty periods array', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([]);

      const result = await service.getNextPeriod();

      expect(result).toBeNull();
    });
  });

  describe('getCurrentTrimesterTable', () => {
    test('should return registrations_fall for Fall trimester', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([PERIOD_FALL_PRIORITY]);

      const result = await service.getCurrentTrimesterTable();

      expect(result).toBe('registrations_fall');
    });

    test('should return registrations_winter for Winter trimester', async () => {
      mockCurrentDate('2025-04-15');
      const { service } = createPeriodService([PERIOD_WINTER_PRIORITY]);

      const result = await service.getCurrentTrimesterTable();

      expect(result).toBe('registrations_winter');
    });

    test('should return registrations_spring for Spring trimester', async () => {
      mockCurrentDate('2025-06-15');
      const { service } = createPeriodService([['Spring', 'priorityEnrollment', '2025-06-01']]);

      const result = await service.getCurrentTrimesterTable();

      expect(result).toBe('registrations_spring');
    });

    test('should throw error when no active period', async () => {
      mockCurrentDate('2025-01-01');
      const { service } = createPeriodService([['Fall', 'intent', '2025-12-15']]);

      await expect(service.getCurrentTrimesterTable()).rejects.toThrow('No active period found');
    });

    test('should lowercase trimester name in table name', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([['FALL', 'priorityEnrollment', '2025-02-01']]);

      const result = await service.getCurrentTrimesterTable();

      expect(result).toBe('registrations_fall');
    });

    test('should handle trimester with mixed case', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([['FaLl', 'priorityEnrollment', '2025-02-01']]);

      const result = await service.getCurrentTrimesterTable();

      expect(result).toBe('registrations_fall');
    });
  });

  describe('getNextTrimester', () => {
    test('should return next trimester from next period', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([
        PERIOD_FALL_PRIORITY,
        ['Winter', 'openEnrollment', '2025-03-01'],
      ]);

      const result = await service.getNextTrimester();

      expect(result).toBe('winter');
    });

    test('should return null when no next period exists', async () => {
      mockCurrentDate('2025-02-20');
      const { service } = createPeriodService([PERIOD_FALL_OPEN]);

      const result = await service.getNextTrimester();

      expect(result).toBeNull();
    });

    test('should work during any period type', async () => {
      mockCurrentDate('2025-02-01');
      const { service } = createPeriodService([
        PERIOD_FALL_INTENT,
        ['Winter', 'priorityEnrollment', '2025-03-01'],
      ]);

      const result = await service.getNextTrimester();

      expect(result).toBe('winter');
    });

    test('should return next period trimester when before all periods', async () => {
      mockCurrentDate('2025-01-01');
      const { service } = createPeriodService([['Fall', 'intent', '2025-12-15']]);

      const result = await service.getNextTrimester();

      // When current date is before all periods, the first period is the "next" period
      expect(result).toBe('fall');
    });
  });

  describe('getCurrentTrimester', () => {
    test('should return current trimester from current period', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([PERIOD_FALL_PRIORITY]);

      const result = await service.getCurrentTrimester();

      expect(result).toBe('fall');
    });

    test('should return null when no current period', async () => {
      mockCurrentDate('2025-01-01');
      const { service } = createPeriodService([['Fall', 'intent', '2025-12-15']]);

      const result = await service.getCurrentTrimester();

      expect(result).toBeNull();
    });
  });

  describe('canAccessNextTrimester', () => {
    test('should return true during openEnrollment regardless of registrations', async () => {
      mockCurrentDate('2025-02-20');
      const { service } = createPeriodService([PERIOD_FALL_OPEN]);

      const resultWithRegistrations = await service.canAccessNextTrimester(true);
      const resultWithoutRegistrations = await service.canAccessNextTrimester(false);

      expect(resultWithRegistrations).toBe(true);
      expect(resultWithoutRegistrations).toBe(true);
    });

    test('should return true during priorityEnrollment with active registrations', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([PERIOD_FALL_PRIORITY]);

      const result = await service.canAccessNextTrimester(true);

      expect(result).toBe(true);
    });

    test('should return false during priorityEnrollment without registrations', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([PERIOD_FALL_PRIORITY]);

      const result = await service.canAccessNextTrimester(false);

      expect(result).toBe(false);
    });

    test('should return false during intent period', async () => {
      mockCurrentDate('2025-02-01');
      const { service } = createPeriodService([PERIOD_FALL_INTENT]);

      const resultWithRegistrations = await service.canAccessNextTrimester(true);
      const resultWithoutRegistrations = await service.canAccessNextTrimester(false);

      expect(resultWithRegistrations).toBe(false);
      expect(resultWithoutRegistrations).toBe(false);
    });

    test('should return false when no current period', async () => {
      mockCurrentDate('2025-01-01');
      const { service } = createPeriodService([['Fall', 'intent', '2025-12-15']]);

      const result = await service.canAccessNextTrimester(true);

      expect(result).toBe(false);
    });

    test('should return false during registration period', async () => {
      mockCurrentDate('2025-03-01');
      const { service } = createPeriodService([['Fall', 'registration', '2025-03-01']]);

      const result = await service.canAccessNextTrimester(true);

      expect(result).toBe(false);
    });
  });

  describe('_getNextTrimester', () => {
    test('should cycle fall to winter', () => {
      const { service } = createPeriodService([]);

      const result = service._getNextTrimester('fall');

      expect(result).toBe('winter');
    });

    test('should cycle winter to spring', () => {
      const { service } = createPeriodService([]);

      const result = service._getNextTrimester('winter');

      expect(result).toBe('spring');
    });

    test('should cycle spring to fall', () => {
      const { service } = createPeriodService([]);

      const result = service._getNextTrimester('spring');

      expect(result).toBe('fall');
    });

    test('should be case-insensitive for input', () => {
      const { service } = createPeriodService([]);

      expect(service._getNextTrimester('Fall')).toBe('winter');
      expect(service._getNextTrimester('FALL')).toBe('winter');
      expect(service._getNextTrimester('FaLl')).toBe('winter');
    });

    test('should throw error for invalid trimester', () => {
      const { service } = createPeriodService([]);

      expect(() => service._getNextTrimester('Summer')).toThrow('Invalid trimester: Summer');
      expect(() => service._getNextTrimester('')).toThrow('Invalid trimester:');
      expect(() => service._getNextTrimester(null)).toThrow('Invalid trimester: null');
    });
  });
});
