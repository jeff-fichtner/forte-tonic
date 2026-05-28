import { jest } from '@jest/globals';
import { PeriodService } from '../../../src/services/periodService.js';

// Test helpers
function createPeriodService(periods) {
  const mockPeriodRepository = {
    getAll: jest.fn().mockResolvedValue(periods),
  };
  const mockConfigService = {
    getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
  };
  return {
    service: new PeriodService(mockPeriodRepository, mockConfigService),
    mockPeriodRepository,
  };
}

function mockCurrentDate(dateString) {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(dateString));
}

function restoreTime() {
  jest.useRealTimers();
}

// Test data constants — post-transform records matching what DB client produces
// (trimester: lowercased, startDate: Date | null)
const PERIOD_FALL_INTENT = {
  trimester: 'fall',
  periodType: 'intent',
  startDate: new Date('2025-01-15'),
};
const PERIOD_FALL_PRIORITY = {
  trimester: 'fall',
  periodType: 'priorityEnrollment',
  startDate: new Date('2025-02-01'),
};
const PERIOD_FALL_OPEN = {
  trimester: 'fall',
  periodType: 'openEnrollment',
  startDate: new Date('2025-02-15'),
};
const PERIOD_WINTER_INTENT = {
  trimester: 'winter',
  periodType: 'intent',
  startDate: new Date('2025-03-01'),
};
const PERIOD_WINTER_PRIORITY = {
  trimester: 'winter',
  periodType: 'priorityEnrollment',
  startDate: new Date('2025-04-01'),
};

describe('PeriodService', () => {
  afterEach(() => {
    restoreTime();
  });

  describe('getCurrentPeriod', () => {
    test('should throw when no period has started yet', async () => {
      mockCurrentDate('2025-01-01');
      const { service } = createPeriodService([PERIOD_FALL_INTENT, PERIOD_FALL_PRIORITY]);

      await expect(service.getCurrentPeriod()).rejects.toThrow('No active period found');
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
        { trimester: 'fall', periodType: 'intent', startDate: null }, // Invalid date → null after transform
        PERIOD_FALL_PRIORITY, // Valid date
      ]);

      const result = await service.getCurrentPeriod();

      expect(result).not.toBeNull();
      expect(result.periodType).toBe('priorityEnrollment');
    });

    test('should filter out periods with missing startDate', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([
        { trimester: 'fall', periodType: 'intent', startDate: null }, // No start date → null after transform
        PERIOD_FALL_PRIORITY,
      ]);

      const result = await service.getCurrentPeriod();

      expect(result).not.toBeNull();
      expect(result.periodType).toBe('priorityEnrollment');
    });

    test('should throw when periods array is empty', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([]);

      await expect(service.getCurrentPeriod()).rejects.toThrow('No active period found');
    });

    test('should handle periods with same startDate', async () => {
      mockCurrentDate('2025-02-15');
      const sameDate = new Date('2025-02-01');
      const { service } = createPeriodService([
        { trimester: 'fall', periodType: 'intent', startDate: sameDate },
        { trimester: 'fall', periodType: 'priorityEnrollment', startDate: sameDate },
      ]);

      const result = await service.getCurrentPeriod();

      // Should return one of them (implementation returns last one with max date)
      expect(result).not.toBeNull();
      expect(result.trimester).toBe('fall');
    });

    test('should handle Date objects in addition to date strings', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([
        { trimester: 'fall', periodType: 'intent', startDate: new Date('2025-01-15') },
        { trimester: 'fall', periodType: 'priorityEnrollment', startDate: new Date('2025-02-01') },
      ]);

      const result = await service.getCurrentPeriod();

      expect(result).not.toBeNull();
      expect(result.periodType).toBe('priorityEnrollment');
    });

    test('should throw error when repository fails', async () => {
      const mockPeriodRepository = {
        getAll: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      const mockConfigService = {
        getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
      };
      const service = new PeriodService(mockPeriodRepository, mockConfigService);

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

    test('should throw when no period has started yet', async () => {
      mockCurrentDate('2025-01-01');
      const { service } = createPeriodService([
        { trimester: 'fall', periodType: 'intent', startDate: new Date('2025-12-15') },
      ]);

      await expect(service.isIntentPeriodActive()).rejects.toThrow('No active period found');
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

  describe('getCurrentTrimester', () => {
    test("should return 'fall' for Fall trimester", async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([PERIOD_FALL_PRIORITY]);

      const result = await service.getCurrentTrimester();

      expect(result).toBe('fall');
    });

    test("should return 'winter' for Winter trimester", async () => {
      mockCurrentDate('2025-04-15');
      const { service } = createPeriodService([PERIOD_WINTER_PRIORITY]);

      const result = await service.getCurrentTrimester();

      expect(result).toBe('winter');
    });

    test("should return 'spring' for Spring trimester", async () => {
      mockCurrentDate('2025-06-15');
      const { service } = createPeriodService([
        {
          trimester: 'spring',
          periodType: 'priorityEnrollment',
          startDate: new Date('2025-06-01'),
        },
      ]);

      const result = await service.getCurrentTrimester();

      expect(result).toBe('spring');
    });

    test('should throw error when no active period', async () => {
      mockCurrentDate('2025-01-01');
      const { service } = createPeriodService([
        { trimester: 'fall', periodType: 'intent', startDate: new Date('2025-12-15') },
      ]);

      await expect(service.getCurrentTrimester()).rejects.toThrow('No active period found');
    });
  });

  describe('getNextTrimester', () => {
    test('should return next trimester from next period', async () => {
      mockCurrentDate('2025-02-15');
      const { service } = createPeriodService([
        PERIOD_FALL_PRIORITY,
        { trimester: 'winter', periodType: 'openEnrollment', startDate: new Date('2025-03-01') },
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
        {
          trimester: 'winter',
          periodType: 'priorityEnrollment',
          startDate: new Date('2025-03-01'),
        },
      ]);

      const result = await service.getNextTrimester();

      expect(result).toBe('winter');
    });

    test('should return next period trimester when before all periods', async () => {
      mockCurrentDate('2025-01-01');
      const { service } = createPeriodService([
        { trimester: 'fall', periodType: 'intent', startDate: new Date('2025-12-15') },
      ]);

      const result = await service.getNextTrimester();

      // When current date is before all periods, the first period is the "next" period
      expect(result).toBe('fall');
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

    test('should throw when no period has started yet', async () => {
      mockCurrentDate('2025-01-01');
      const { service } = createPeriodService([
        { trimester: 'fall', periodType: 'intent', startDate: new Date('2025-12-15') },
      ]);

      await expect(service.canAccessNextTrimester(true)).rejects.toThrow('No active period found');
    });

    test('should return false during registration period', async () => {
      mockCurrentDate('2025-03-01');
      const { service } = createPeriodService([
        { trimester: 'fall', periodType: 'registration', startDate: new Date('2025-03-01') },
      ]);

      const result = await service.canAccessNextTrimester(true);

      expect(result).toBe(false);
    });
  });

  describe('getNextTrimesterInSequence (static)', () => {
    test('should cycle fall to winter', () => {
      expect(PeriodService.getNextTrimesterInSequence('fall')).toBe('winter');
    });

    test('should cycle winter to spring', () => {
      expect(PeriodService.getNextTrimesterInSequence('winter')).toBe('spring');
    });

    test('should cycle spring to summer', () => {
      expect(PeriodService.getNextTrimesterInSequence('spring')).toBe('summer');
    });

    test('should cycle summer to fall', () => {
      expect(PeriodService.getNextTrimesterInSequence('summer')).toBe('fall');
    });

    test('should be case-insensitive for input', () => {
      expect(PeriodService.getNextTrimesterInSequence('Fall')).toBe('winter');
      expect(PeriodService.getNextTrimesterInSequence('FALL')).toBe('winter');
      expect(PeriodService.getNextTrimesterInSequence('FaLl')).toBe('winter');
    });

    test('should throw error for invalid trimester', () => {
      expect(() => PeriodService.getNextTrimesterInSequence('Autumn')).toThrow(
        'Invalid trimester: Autumn'
      );
      expect(() => PeriodService.getNextTrimesterInSequence('')).toThrow('Invalid trimester:');
      expect(() => PeriodService.getNextTrimesterInSequence(null as unknown as string)).toThrow(
        'Invalid trimester: null'
      );
    });
  });

  describe('getPreviousTrimesterInSequence (static)', () => {
    test('should cycle fall to summer', () => {
      expect(PeriodService.getPreviousTrimesterInSequence('fall')).toBe('summer');
    });

    test('should cycle winter to fall', () => {
      expect(PeriodService.getPreviousTrimesterInSequence('winter')).toBe('fall');
    });

    test('should cycle spring to winter', () => {
      expect(PeriodService.getPreviousTrimesterInSequence('spring')).toBe('winter');
    });

    test('should cycle summer to spring', () => {
      expect(PeriodService.getPreviousTrimesterInSequence('summer')).toBe('spring');
    });

    test('should throw error for invalid trimester', () => {
      expect(() => PeriodService.getPreviousTrimesterInSequence('Autumn')).toThrow(
        'Invalid trimester: Autumn'
      );
    });
  });
});
