/**
 * DateHelpers Unit Tests (T022)
 * =============================
 *
 * Tests for legacy DateHelpers static utility methods:
 * - convertTo12HourFormat: 24h string to 12h AM/PM format
 * - getStartOfCurrentDayUTC: midnight UTC of today
 * - getStartOfDate: midnight UTC of a given date
 */

import { DateHelpers } from '../../../src/utils/dateHelpers.js';

describe('DateHelpers', () => {
  describe('convertTo12HourFormat()', () => {
    test('should convert afternoon time (15:30 -> 3:30 PM)', () => {
      expect(DateHelpers.convertTo12HourFormat('15:30')).toBe('3:30 PM');
    });

    test('should convert midnight (0:00 -> 12:00 AM)', () => {
      expect(DateHelpers.convertTo12HourFormat('0:00')).toBe('12:00 AM');
    });

    test('should convert noon (12:00 -> 12:00 PM)', () => {
      expect(DateHelpers.convertTo12HourFormat('12:00')).toBe('12:00 PM');
    });

    test('should convert morning time with single-digit minutes (9:05 -> 9:05 AM)', () => {
      expect(DateHelpers.convertTo12HourFormat('9:05')).toBe('9:05 AM');
    });

    test('should return null for null input', () => {
      expect(DateHelpers.convertTo12HourFormat(null)).toBeNull();
    });

    test('should return null for undefined input', () => {
      expect(DateHelpers.convertTo12HourFormat(undefined)).toBeNull();
    });
  });

  describe('getStartOfCurrentDayUTC()', () => {
    test('should return a date with zeroed hours, minutes, seconds, and milliseconds in UTC', () => {
      const result = DateHelpers.getStartOfCurrentDayUTC();

      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });
  });

  describe('getStartOfDate()', () => {
    test('should return midnight UTC of the given date', () => {
      const input = new Date('2025-06-15T14:30:00Z');
      const result = DateHelpers.getStartOfDate(input);

      expect(result.toISOString()).toBe('2025-06-15T00:00:00.000Z');
    });
  });
});
