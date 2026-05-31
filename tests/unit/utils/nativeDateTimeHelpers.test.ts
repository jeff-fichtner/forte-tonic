/**
 * Native DateTime Helpers Unit Tests
 * ===================================
 *
 * Tests for TonicDuration, TonicDateTime, and TonicDateTimeHelpers (DateHelpers).
 * Pure functions/classes with no external dependencies (Pattern 1: direct imports).
 *
 * Covers TonicDuration, TonicDateTime, and TonicDateTimeHelpers (DateHelpers).
 */

import {
  TonicDuration,
  TonicDateTime,
  TonicDateTimeHelpers as DateHelpers,
} from '../../../src/utils/nativeDateTimeHelpers.js';

// ---------------------------------------------------------------------------
// TonicDuration
// ---------------------------------------------------------------------------
describe('TonicDuration', () => {
  describe('constructor & clamping', () => {
    test('stores the given totalMinutes', () => {
      expect(new TonicDuration(90).totalMinutes).toBe(90);
    });

    test('clamps negative values to 0', () => {
      expect(new TonicDuration(-10).totalMinutes).toBe(0);
    });

    test('clamps values above 1439 to 1439', () => {
      expect(new TonicDuration(1500).totalMinutes).toBe(1439);
    });

    test('defaults to 0 when called with no argument', () => {
      expect(new TonicDuration().totalMinutes).toBe(0);
    });
  });

  describe('factory methods', () => {
    test('fromHours creates duration from hours and minutes', () => {
      expect(TonicDuration.fromHours(2, 30).totalMinutes).toBe(150);
    });

    test('fromMinutes creates duration from total minutes', () => {
      expect(TonicDuration.fromMinutes(90).totalMinutes).toBe(90);
    });

    test('fromTimeString parses 12-hour format', () => {
      expect(TonicDuration.fromTimeString('3:30 PM').totalMinutes).toBe(930);
    });

    test('fromTimeString parses 24-hour format', () => {
      expect(TonicDuration.fromTimeString('15:30').totalMinutes).toBe(930);
    });

    test('fromTimeString treats ambiguous HH:MM as 24-hour', () => {
      // "3:30" with no AM/PM is parsed as 03:30 (3 hours 30 minutes)
      expect(TonicDuration.fromTimeString('3:30').totalMinutes).toBe(210);
    });
  });

  describe('properties', () => {
    test('exposes hours, minutes, totalMinutes, and totalHours', () => {
      const d = new TonicDuration(150);
      expect(d.hours).toBe(2);
      expect(d.minutes).toBe(30);
      expect(d.totalMinutes).toBe(150);
      expect(d.totalHours).toBe(2.5);
    });
  });

  describe('arithmetic', () => {
    test('plus adds a TonicDuration', () => {
      expect(new TonicDuration(60).plus(new TonicDuration(30)).totalMinutes).toBe(90);
    });

    test('plus adds a raw number', () => {
      expect(new TonicDuration(60).plus(30).totalMinutes).toBe(90);
    });

    test('minus subtracts a TonicDuration', () => {
      expect(new TonicDuration(60).minus(new TonicDuration(30)).totalMinutes).toBe(30);
    });

    test('minus clamps result to 0 when it would go negative', () => {
      expect(new TonicDuration(10).minus(20).totalMinutes).toBe(0);
    });

    test('plus clamps result to 1439 when it would exceed max', () => {
      expect(new TonicDuration(1400).plus(100).totalMinutes).toBe(1439);
    });
  });

  describe('comparison', () => {
    test('equals returns true for identical totalMinutes', () => {
      expect(new TonicDuration(60).equals(new TonicDuration(60))).toBe(true);
    });

    test('equals returns false for different totalMinutes', () => {
      expect(new TonicDuration(60).equals(new TonicDuration(90))).toBe(false);
    });

    test('isAfter returns true when this duration is greater', () => {
      expect(new TonicDuration(90).isAfter(new TonicDuration(60))).toBe(true);
    });

    test('isBefore returns true when this duration is smaller', () => {
      expect(new TonicDuration(60).isBefore(new TonicDuration(90))).toBe(true);
    });
  });

  describe('output formats', () => {
    test('to24Hour pads hours and minutes', () => {
      expect(new TonicDuration(90).to24Hour()).toBe('01:30');
    });

    test('to24Hour returns "00:00" for 0 minutes', () => {
      expect(new TonicDuration(0).to24Hour()).toBe('00:00');
    });

    test('to12Hour formats afternoon time', () => {
      expect(new TonicDuration(930).to12Hour()).toBe('3:30 PM');
    });

    test('to12Hour formats midnight as 12:00 AM', () => {
      expect(new TonicDuration(0).to12Hour()).toBe('12:00 AM');
    });

    test('to12Hour formats noon as 12:00 PM', () => {
      expect(new TonicDuration(720).to12Hour()).toBe('12:00 PM');
    });

    test('toString returns the same value as to24Hour', () => {
      const d = new TonicDuration(90);
      expect(d.toString()).toBe('01:30');
      expect(d.toString()).toBe(d.to24Hour());
    });

    test('toDate returns a Date with correct hours and minutes', () => {
      const d = new TonicDuration(150); // 2h30m
      const result = d.toDate();
      expect(result.getHours()).toBe(2);
      expect(result.getMinutes()).toBe(30);
    });
  });
});

// ---------------------------------------------------------------------------
// TonicDateTime
// ---------------------------------------------------------------------------
describe('TonicDateTime', () => {
  describe('constructor & factories', () => {
    test('new TonicDateTime() creates a date close to now', () => {
      const before = Date.now();
      const tdt = new TonicDateTime();
      const after = Date.now();
      expect(tdt.date.getTime()).toBeGreaterThanOrEqual(before);
      expect(tdt.date.getTime()).toBeLessThanOrEqual(after);
    });

    test('new TonicDateTime(null) creates a date close to now', () => {
      const before = Date.now();
      const tdt = new TonicDateTime(null);
      const after = Date.now();
      expect(tdt.date.getTime()).toBeGreaterThanOrEqual(before);
      expect(tdt.date.getTime()).toBeLessThanOrEqual(after);
    });

    test('TonicDateTime.now() returns current time', () => {
      const before = Date.now();
      const tdt = TonicDateTime.now();
      const after = Date.now();
      expect(tdt.date.getTime()).toBeGreaterThanOrEqual(before);
      expect(tdt.date.getTime()).toBeLessThanOrEqual(after);
    });

    test('fromDate preserves the source date', () => {
      const source = new Date(2025, 0, 15, 10, 30);
      const tdt = TonicDateTime.fromDate(source);
      expect(tdt.date.getTime()).toBe(source.getTime());
    });

    test('fromISO parses an ISO string', () => {
      const tdt = TonicDateTime.fromISO('2025-01-15T10:30:00.000Z');
      expect(tdt.date.toISOString()).toBe('2025-01-15T10:30:00.000Z');
    });

    test('fromGoogleSheets converts a serial date', () => {
      // Serial 45672 relative to the Google Sheets epoch (1899-12-30).
      // Exact date depends on local timezone offset, but should land in early 2025.
      const tdt = TonicDateTime.fromGoogleSheets(45672);
      expect(tdt.year).toBe(2025);
    });
  });

  describe('properties', () => {
    test('exposes year, month (1-indexed), day, hour, minute', () => {
      const tdt = TonicDateTime.fromDate(new Date(2025, 5, 15, 14, 30));
      expect(tdt.year).toBe(2025);
      expect(tdt.month).toBe(6); // 1-indexed
      expect(tdt.day).toBe(15);
      expect(tdt.hour).toBe(14);
      expect(tdt.minute).toBe(30);
    });
  });

  describe('getTimeAsDuration', () => {
    test('extracts time-of-day as a TonicDuration', () => {
      const tdt = TonicDateTime.fromDate(new Date(2025, 0, 1, 14, 30));
      expect(tdt.getTimeAsDuration().totalMinutes).toBe(870); // 14*60 + 30
    });
  });

  describe('arithmetic', () => {
    test('plusDays adds one day', () => {
      const tdt = TonicDateTime.fromDate(new Date(2025, 0, 15, 10, 0));
      const result = tdt.plusDays(1);
      expect(result.day).toBe(16);
    });

    test('plusHours adds hours', () => {
      const tdt = TonicDateTime.fromDate(new Date(2025, 0, 15, 10, 0));
      const result = tdt.plusHours(2);
      expect(result.hour).toBe(12);
    });

    test('plusMinutes adds minutes', () => {
      const tdt = TonicDateTime.fromDate(new Date(2025, 0, 15, 10, 0));
      const result = tdt.plusMinutes(30);
      expect(result.minute).toBe(30);
    });

    test('plusDuration adds a TonicDuration', () => {
      const tdt = TonicDateTime.fromDate(new Date(2025, 0, 15, 10, 0));
      const result = tdt.plusDuration(new TonicDuration(90));
      expect(result.hour).toBe(11);
      expect(result.minute).toBe(30);
    });
  });

  describe('output formats', () => {
    test('toISOString returns an ISO format string', () => {
      const tdt = TonicDateTime.fromISO('2025-01-15T10:30:00.000Z');
      expect(tdt.toISOString()).toBe('2025-01-15T10:30:00.000Z');
    });

    test('toGoogleSheetsSerial round-trips with fromGoogleSheets', () => {
      const serial = 45672;
      const tdt = TonicDateTime.fromGoogleSheets(serial);
      const roundTripped = tdt.toGoogleSheetsSerial();
      // Floating-point arithmetic may introduce tiny differences
      expect(roundTripped).toBeCloseTo(serial, 5);
    });
  });
});

// ---------------------------------------------------------------------------
// TonicDateTimeHelpers (DateHelpers)
// ---------------------------------------------------------------------------
describe('DateHelpers (TonicDateTimeHelpers)', () => {
  describe('parseTimeString', () => {
    test('parses 12-hour format', () => {
      expect(DateHelpers.parseTimeString('3:30 PM').totalMinutes).toBe(930);
    });

    test('parses 24-hour format', () => {
      expect(DateHelpers.parseTimeString('15:30').totalMinutes).toBe(930);
    });

    test('parses Google Sheets numeric time', () => {
      // 0.65625 of a day = 15 hours 45 minutes = 945 minutes
      expect(DateHelpers.parseTimeString(0.65625).totalMinutes).toBe(945);
    });

    test('returns 0 for unparseable string', () => {
      expect(DateHelpers.parseTimeString('invalid').totalMinutes).toBe(0);
    });

    test('returns 0 for empty string', () => {
      expect(DateHelpers.parseTimeString('').totalMinutes).toBe(0);
    });
  });

  describe('parseGoogleSheetsTime', () => {
    test('converts fractional day 0.5 to 720 minutes (noon)', () => {
      expect(DateHelpers.parseGoogleSheetsTime(0.5).totalMinutes).toBe(720);
    });

    test('converts 0.0 to 0 minutes (midnight)', () => {
      expect(DateHelpers.parseGoogleSheetsTime(0.0).totalMinutes).toBe(0);
    });

    test('extracts time portion from full serial date', () => {
      // 45672.65625 — the .65625 portion is 15:45 = 945 minutes
      const result = DateHelpers.parseGoogleSheetsTime(45672.65625);
      expect(result.totalMinutes).toBe(945);
    });
  });

  describe('convertTimeFormat', () => {
    test('converts 24-hour to 12-hour', () => {
      expect(DateHelpers.convertTimeFormat('15:30', '12hour')).toBe('3:30 PM');
    });

    test('converts 12-hour to 24-hour', () => {
      expect(DateHelpers.convertTimeFormat('3:30 PM', '24hour')).toBe('15:30');
    });

    test('converts to minutes', () => {
      expect(DateHelpers.convertTimeFormat('15:30', 'minutes')).toBe(930);
    });

    test('converts to hours', () => {
      expect(DateHelpers.convertTimeFormat('15:30', 'hours')).toBe(15.5);
    });
  });

  describe('durationBetween', () => {
    test('calculates duration between two times', () => {
      const d = DateHelpers.durationBetween('3:00 PM', '4:30 PM');
      expect(d.totalMinutes).toBe(90);
    });

    test('handles overnight wrap (end < start)', () => {
      const d = DateHelpers.durationBetween('11:00 PM', '1:00 AM');
      expect(d.totalMinutes).toBe(120);
    });
  });

  describe('isTimeInRange', () => {
    test('returns true when time is within range', () => {
      expect(DateHelpers.isTimeInRange('14:30', '08:00', '17:00')).toBe(true);
    });

    test('returns false when time is outside range', () => {
      expect(DateHelpers.isTimeInRange('06:00', '08:00', '17:00')).toBe(false);
    });
  });

  describe('getStartOfCurrentDayUTC', () => {
    test('returns a Date with hours, minutes, seconds all 0 in UTC', () => {
      const result = DateHelpers.getStartOfCurrentDayUTC();
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });
  });

  describe('getStartOfDate', () => {
    test('returns midnight UTC for a given date', () => {
      const input = new Date('2025-06-15T14:30:00Z');
      const result = DateHelpers.getStartOfDate(input);
      expect(result.toISOString()).toBe('2025-06-15T00:00:00.000Z');
    });

    test('returns midnight UTC of today when passed null', () => {
      const result = DateHelpers.getStartOfDate(null);
      const now = new Date();
      expect(result.getUTCFullYear()).toBe(now.getUTCFullYear());
      expect(result.getUTCMonth()).toBe(now.getUTCMonth());
      expect(result.getUTCDate()).toBe(now.getUTCDate());
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
    });
  });

  describe('convertTo12HourFormat', () => {
    test('converts 24-hour string to 12-hour', () => {
      expect(DateHelpers.convertTo12HourFormat('15:30')).toBe('3:30 PM');
    });

    test('converts midnight "0:00" to "12:00 AM"', () => {
      expect(DateHelpers.convertTo12HourFormat('0:00')).toBe('12:00 AM');
    });

    test('returns null for null input', () => {
      expect(DateHelpers.convertTo12HourFormat(null)).toBeNull();
    });

    test('returns null for undefined input', () => {
      expect(DateHelpers.convertTo12HourFormat(undefined)).toBeNull();
    });
  });
});
