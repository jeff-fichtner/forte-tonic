/**
 * DATETIME UNIFICATION SOLUTION FOR TONIC
 * =======================================
 *
 * PROBLEM ANALYSIS:
 * 1. Mixed time formats: Google Sheets dates vs formatted time strings vs duration objects
 * 2. Column mapping mismatches between code expectations and actual sheet structure
 * 3. Frontend needs duration-like objects (C# TimeSpan equivalent) for start/end times
 * 4. Backend needs full datetime support for audit trails and scheduling
 * 5. Google Sheets has quirky date handling (1899 epoch vs normal dates)
 *
 * SOLUTION OVERVIEW:
 * 1. Create unified datetime/duration value objects
 * 2. Fix Google Sheets column mappings
 * 3. Implement proper parsing for all datetime formats
 * 4. Create migration strategy for existing data
 * 5. Provide frontend duration helpers that work like C# TimeSpan
 */

import { DateTime, Duration } from 'luxon';

/**
 * Unified DateTime/Duration handling for Tonic
 * Supports both full dates (audit trails) and time-only durations (scheduling)
 */
export class TonicDateTime {
  constructor(value, type = 'auto') {
    this.originalValue = value;
    this.type = type;
    this.luxonDateTime = null;
    this.luxonDuration = null;

    this.parse(value, type);
  }

  parse(value, type = 'auto') {
    if (!value) {
      this.isNull = true;
      return;
    }

    // Auto-detect type if not specified
    if (type === 'auto') {
      type = this.detectType(value);
    }

    switch (type) {
      case 'duration':
        this.parseDuration(value);
        break;
      case 'datetime':
        this.parseDateTime(value);
        break;
      case 'google-date':
        this.parseGoogleDate(value);
        break;
      case 'time-string':
        this.parseTimeString(value);
        break;
      default:
        throw new Error(`Unknown datetime type: ${type}`);
    }
  }

  detectType(value) {
    // Google Sheets date (number representing days since 1899-12-30)
    if (typeof value === 'number' && value > 1) {
      return 'google-date';
    }

    // Time string formats: "3:30 PM", "15:30", "3:30"
    if (typeof value === 'string' && /^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(value)) {
      return 'time-string';
    }

    // ISO DateTime string
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return 'datetime';
    }

    // JavaScript Date object
    if (value instanceof Date) {
      return 'datetime';
    }

    // Luxon Duration object
    if (value && typeof value === 'object' && value.constructor?.name === 'Duration') {
      return 'duration';
    }

    // Default to time string for backward compatibility
    return 'time-string';
  }

  parseDuration(value) {
    if (typeof value === 'string') {
      // Parse "HH:MM" format
      const [hours, minutes] = value.split(':').map(Number);
      this.luxonDuration = Duration.fromObject({ hours, minutes });
    } else if (value && typeof value === 'object') {
      this.luxonDuration = value; // Already a Duration object
    }
    this.type = 'duration';
  }

  parseDateTime(value) {
    if (value instanceof Date) {
      this.luxonDateTime = DateTime.fromJSDate(value);
    } else if (typeof value === 'string') {
      this.luxonDateTime = DateTime.fromISO(value);
    }
    this.type = 'datetime';
  }

  parseGoogleDate(value) {
    // Google Sheets uses 1899-12-30 as epoch (serial date)
    const googleEpoch = DateTime.fromObject({ year: 1899, month: 12, day: 30 });
    this.luxonDateTime = googleEpoch.plus({ days: value });
    this.type = 'datetime';
  }

  parseTimeString(value) {
    // Handle formats like "3:30 PM", "15:30", "3:30"
    const normalizedTime = value.trim();

    // Convert 12-hour to 24-hour format
    if (/AM|PM/i.test(normalizedTime)) {
      const [time, period] = normalizedTime.split(/\s+/);
      const [hours, minutes] = time.split(':').map(Number);

      let adjustedHours = hours;
      if (period.toUpperCase() === 'PM' && hours !== 12) {
        adjustedHours += 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        adjustedHours = 0;
      }

      this.luxonDuration = Duration.fromObject({
        hours: adjustedHours,
        minutes: minutes || 0,
      });
    } else {
      // Already 24-hour format or no AM/PM
      const [hours, minutes] = normalizedTime.split(':').map(Number);
      this.luxonDuration = Duration.fromObject({
        hours: hours || 0,
        minutes: minutes || 0,
      });
    }

    this.type = 'duration';
  }

  // === OUTPUT METHODS ===

  /**
   * Get as C# TimeSpan-like duration (hours:minutes from midnight)
   */
  toDuration() {
    if (this.luxonDuration) {
      return this.luxonDuration;
    }

    if (this.luxonDateTime) {
      // Extract time portion as duration from midnight
      return Duration.fromObject({
        hours: this.luxonDateTime.hour,
        minutes: this.luxonDateTime.minute,
        seconds: this.luxonDateTime.second,
      });
    }

    return null;
  }

  /**
   * Get as full DateTime (useful for audit trails)
   */
  toDateTime() {
    if (this.luxonDateTime) {
      return this.luxonDateTime;
    }

    if (this.luxonDuration) {
      // Convert duration to datetime by adding to today at midnight
      const today = DateTime.now().startOf('day');
      return today.plus(this.luxonDuration);
    }

    return null;
  }

  /**
   * Get as JavaScript Date
   */
  toJSDate() {
    const dt = this.toDateTime();
    return dt ? dt.toJSDate() : null;
  }

  /**
   * Get as 12-hour formatted string (3:30 PM)
   */
  to12HourString() {
    const duration = this.toDuration();
    if (!duration) return null;

    const totalMinutes = duration.as('minutes');
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);

    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const period = hours < 12 ? 'AM' : 'PM';

    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Get as 24-hour formatted string (15:30)
   */
  to24HourString() {
    const duration = this.toDuration();
    if (!duration) return null;

    const totalMinutes = duration.as('minutes');
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Get as Google Sheets serial date number
   */
  toGoogleSheetsDate() {
    const dt = this.toDateTime();
    if (!dt) return null;

    const googleEpoch = DateTime.fromObject({ year: 1899, month: 12, day: 30 });
    return dt.diff(googleEpoch, 'days').days;
  }

  /**
   * Get as ISO string for storage/transmission
   */
  toISOString() {
    const dt = this.toDateTime();
    return dt ? dt.toISO() : null;
  }

  /**
   * Add duration (C# TimeSpan-like behavior)
   */
  plus(duration) {
    if (this.luxonDuration) {
      return new TonicDateTime(this.luxonDuration.plus(duration), 'duration');
    }

    if (this.luxonDateTime) {
      return new TonicDateTime(this.luxonDateTime.plus(duration), 'datetime');
    }

    return null;
  }

  /**
   * Subtract duration
   */
  minus(duration) {
    if (this.luxonDuration) {
      return new TonicDateTime(this.luxonDuration.minus(duration), 'duration');
    }

    if (this.luxonDateTime) {
      return new TonicDateTime(this.luxonDateTime.minus(duration), 'datetime');
    }

    return null;
  }

  /**
   * Check if this time is before another
   */
  isBefore(other) {
    const thisTime = this.toDuration();
    const otherTime = other.toDuration();

    if (!thisTime || !otherTime) return false;

    return thisTime.as('minutes') < otherTime.as('minutes');
  }

  /**
   * Check if this time is after another
   */
  isAfter(other) {
    const thisTime = this.toDuration();
    const otherTime = other.toDuration();

    if (!thisTime || !otherTime) return false;

    return thisTime.as('minutes') > otherTime.as('minutes');
  }
}

/**
 * Enhanced DateHelpers with unified datetime support
 */
export class EnhancedDateHelpers {
  /**
   * Parse any datetime/duration format into TonicDateTime
   */
  static parse(value, type = 'auto') {
    return new TonicDateTime(value, type);
  }

  /**
   * Create a duration from hours and minutes (C# TimeSpan equivalent)
   */
  static createDuration(hours, minutes = 0) {
    return new TonicDateTime(Duration.fromObject({ hours, minutes }), 'duration');
  }

  /**
   * Create datetime from date components
   */
  static createDateTime(year, month, day, hour = 0, minute = 0, second = 0) {
    const dt = DateTime.fromObject({ year, month, day, hour, minute, second });
    return new TonicDateTime(dt, 'datetime');
  }

  /**
   * Get current date/time
   */
  static now() {
    return new TonicDateTime(DateTime.now(), 'datetime');
  }

  /**
   * Get today at midnight (useful for duration calculations)
   */
  static today() {
    return new TonicDateTime(DateTime.now().startOf('day'), 'datetime');
  }

  /**
   * Parse Google Sheets date format
   */
  static parseGoogleSheetsDate(dateValue) {
    return new TonicDateTime(dateValue, 'google-date');
  }

  /**
   * Parse time string (supports multiple formats)
   */
  static parseTimeString(timeString) {
    return new TonicDateTime(timeString, 'time-string');
  }
}

// Export both classes
export { TonicDateTime as DateTime, EnhancedDateHelpers as DateHelpers };

/**
 * USAGE EXAMPLES:
 *
 * // Creating time durations (like C# TimeSpan)
 * const startTime = DateHelpers.parseTimeString("3:30 PM");
 * const endTime = DateHelpers.parseTimeString("4:30 PM");
 * const duration = endTime.minus(startTime.toDuration());
 *
 * // Working with Google Sheets dates
 * const googleDate = DateHelpers.parseGoogleSheetsDate(44927); // Excel serial date
 * console.log(googleDate.to12HourString()); // "3:30 PM"
 *
 * // Creating audit timestamps
 * const createdAt = DateHelpers.now();
 * console.log(createdAt.toISOString()); // "2025-08-02T20:30:00.000Z"
 *
 * // Duration arithmetic (C# TimeSpan-like)
 * const classStart = DateHelpers.parseTimeString("3:00 PM");
 * const classLength = DateHelpers.createDuration(1, 30); // 1 hour 30 minutes
 * const classEnd = classStart.plus(classLength);
 * console.log(classEnd.to12HourString()); // "4:30 PM"
 */
