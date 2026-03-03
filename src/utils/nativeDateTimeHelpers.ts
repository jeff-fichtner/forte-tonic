/**
 * TONIC NATIVE DATETIME SOLUTION
 * =============================
 *
 * Lightweight, native JavaScript datetime/duration handling for Tonic.
 * Replaces Luxon with a simpler, more focused solution.
 *
 * Features:
 * - C# TimeSpan-like duration objects
 * - Multiple time format parsing (Google Sheets, 12/24 hour strings)
 * - Duration arithmetic (add/subtract)
 * - Cross-platform (Node.js, Browser, Google Apps Script)
 * - Zero external dependencies
 * - < 5KB vs Luxon's 67KB
 */

/**
 * Duration class - represents a time span like C# TimeSpan
 * Internally stores total minutes from midnight
 */
export class TonicDuration {
  totalMinutes: number;

  constructor(totalMinutes: number = 0) {
    this.totalMinutes = Math.max(0, Math.min(totalMinutes, 1439)); // 0-1439 (24 hours)
  }

  // Static factory methods
  static fromHours(hours: number, minutes: number = 0): TonicDuration {
    return new TonicDuration(hours * 60 + minutes);
  }

  static fromMinutes(minutes: number): TonicDuration {
    return new TonicDuration(minutes);
  }

  static fromTimeString(timeString: string): TonicDuration {
    return TonicDateTimeHelpers.parseTimeString(timeString);
  }

  // Properties (C# TimeSpan-like)
  get hours(): number {
    return Math.floor(this.totalMinutes / 60);
  }

  get minutes(): number {
    return this.totalMinutes % 60;
  }

  get totalHours(): number {
    return this.totalMinutes / 60;
  }

  // Arithmetic operations
  plus(other: TonicDuration | number): TonicDuration {
    const otherMinutes: number = other instanceof TonicDuration ? other.totalMinutes : other;
    return new TonicDuration(this.totalMinutes + otherMinutes);
  }

  minus(other: TonicDuration | number): TonicDuration {
    const otherMinutes: number = other instanceof TonicDuration ? other.totalMinutes : other;
    return new TonicDuration(this.totalMinutes - otherMinutes);
  }

  // Comparison
  equals(other: TonicDuration): boolean {
    return this.totalMinutes === other.totalMinutes;
  }

  isAfter(other: TonicDuration): boolean {
    return this.totalMinutes > other.totalMinutes;
  }

  isBefore(other: TonicDuration): boolean {
    return this.totalMinutes < other.totalMinutes;
  }

  // Output formats
  to24Hour(): string {
    const h: string = this.hours.toString().padStart(2, '0');
    const m: string = this.minutes.toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  to12Hour(): string {
    let h: number = this.hours;
    const m: string = this.minutes.toString().padStart(2, '0');
    const period: string = h >= 12 ? 'PM' : 'AM';

    if (h === 0) h = 12;
    else if (h > 12) h -= 12;

    return `${h}:${m} ${period}`;
  }

  toString(): string {
    return this.to24Hour();
  }

  // Convert to JavaScript Date (adds duration to today at midnight)
  toDate(baseDate: Date | null = null): Date {
    const base: Date = baseDate || new Date();
    const result: Date = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    result.setMinutes(this.totalMinutes);
    return result;
  }
}

/**
 * DateTime class - represents a full date/time for audit trails
 */
export class TonicDateTime {
  date: Date;

  constructor(date: Date | null = null) {
    this.date = date instanceof Date ? new Date(date) : new Date();
  }

  // Static factory methods
  static now(): TonicDateTime {
    return new TonicDateTime();
  }

  static fromDate(date: Date): TonicDateTime {
    return new TonicDateTime(date);
  }

  static fromISO(isoString: string): TonicDateTime {
    return new TonicDateTime(new Date(isoString));
  }

  static fromGoogleSheets(serialDate: number): TonicDateTime {
    // Google Sheets uses 1899-12-30 as epoch
    const googleEpoch: Date = new Date(1899, 11, 30); // Month is 0-indexed
    const msPerDay: number = 24 * 60 * 60 * 1000;
    const targetDate: Date = new Date(googleEpoch.getTime() + serialDate * msPerDay);
    return new TonicDateTime(targetDate);
  }

  // Properties
  get year(): number {
    return this.date.getFullYear();
  }
  get month(): number {
    return this.date.getMonth() + 1;
  } // 1-12
  get day(): number {
    return this.date.getDate();
  }
  get hour(): number {
    return this.date.getHours();
  }
  get minute(): number {
    return this.date.getMinutes();
  }
  get second(): number {
    return this.date.getSeconds();
  }

  // Extract time as duration
  getTimeAsDuration(): TonicDuration {
    return new TonicDuration(this.hour * 60 + this.minute);
  }

  // Arithmetic
  plusDays(days: number): TonicDateTime {
    const newDate: Date = new Date(this.date);
    newDate.setDate(newDate.getDate() + days);
    return new TonicDateTime(newDate);
  }

  plusHours(hours: number): TonicDateTime {
    const newDate: Date = new Date(this.date);
    newDate.setHours(newDate.getHours() + hours);
    return new TonicDateTime(newDate);
  }

  plusMinutes(minutes: number): TonicDateTime {
    const newDate: Date = new Date(this.date);
    newDate.setMinutes(newDate.getMinutes() + minutes);
    return new TonicDateTime(newDate);
  }

  plusDuration(duration: TonicDuration): TonicDateTime {
    return this.plusMinutes(duration.totalMinutes);
  }

  // Output formats
  toISOString(): string {
    return this.date.toISOString();
  }

  toDateString(): string {
    return this.date.toLocaleDateString();
  }

  toTimeString(): string {
    return this.date.toLocaleTimeString();
  }

  toJSDate(): Date {
    return new Date(this.date);
  }

  toGoogleSheetsSerial(): number {
    const googleEpoch: Date = new Date(1899, 11, 30);
    const msPerDay: number = 24 * 60 * 60 * 1000;
    return (this.date.getTime() - googleEpoch.getTime()) / msPerDay;
  }

  toString(): string {
    return this.date.toString();
  }
}

type TimeStringInput = string | number;
type DateTimeInput = Date | string | number | null | undefined;
type TimeOutputFormat = '12hour' | '12-hour' | '24hour' | '24-hour' | 'minutes' | 'hours';

/**
 * Unified DateTime/Duration helpers
 */
export class TonicDateTimeHelpers {
  /**
   * Parse time strings in various formats into TonicDuration
   * Supports: "3:30 PM", "15:30", "3:30", Google Sheets serial dates
   */
  static parseTimeString(timeString: TimeStringInput): TonicDuration {
    if (!timeString) return new TonicDuration(0);

    // Handle numeric Google Sheets time (fraction of a day)
    if (typeof timeString === 'number') {
      return TonicDateTimeHelpers.parseGoogleSheetsTime(timeString);
    }

    const str: string = timeString.toString().trim();

    // Handle 12-hour format (3:30 PM)
    const twelveHourMatch: RegExpMatchArray | null = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (twelveHourMatch) {
      let hours: number = parseInt(twelveHourMatch[1]);
      const minutes: number = parseInt(twelveHourMatch[2]);
      const period: string = twelveHourMatch[3].toUpperCase();

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      return new TonicDuration(hours * 60 + minutes);
    }

    // Handle 24-hour format (15:30) or simple format (3:30)
    const timeMatch: RegExpMatchArray | null = str.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const hours: number = parseInt(timeMatch[1]);
      const minutes: number = parseInt(timeMatch[2]);
      return new TonicDuration(hours * 60 + minutes);
    }

    // Default to midnight if can't parse
    return new TonicDuration(0);
  }

  /**
   * Parse Google Sheets date/time values
   */
  static parseGoogleSheetsTime(serialValue: TimeStringInput): TonicDuration {
    if (typeof serialValue !== 'number') {
      return TonicDateTimeHelpers.parseTimeString(serialValue);
    }

    // If it's a large number, it's probably a full date serial
    if (serialValue > 1) {
      const dateTime: TonicDateTime = TonicDateTime.fromGoogleSheets(serialValue);
      return dateTime.getTimeAsDuration();
    }

    // If it's a decimal < 1, it's a time fraction of a day
    const totalMinutes: number = Math.round(serialValue * 24 * 60);
    return new TonicDuration(totalMinutes);
  }

  /**
   * Parse various date formats into TonicDateTime
   */
  static parseDateTime(value: DateTimeInput): TonicDateTime {
    if (!value) return TonicDateTime.now();

    if (value instanceof Date) {
      return new TonicDateTime(value);
    }

    if (typeof value === 'string') {
      return TonicDateTime.fromISO(value);
    }

    if (typeof value === 'number' && value > 1) {
      return TonicDateTime.fromGoogleSheets(value);
    }

    return TonicDateTime.now();
  }

  /**
   * Create duration from hours and minutes (C# TimeSpan equivalent)
   */
  static duration(hours: number, minutes: number = 0): TonicDuration {
    return TonicDuration.fromHours(hours, minutes);
  }

  /**
   * Get current date/time
   */
  static now(): TonicDateTime {
    return TonicDateTime.now();
  }

  /**
   * Get today at midnight
   */
  static today(): TonicDateTime {
    const now: Date = new Date();
    return new TonicDateTime(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  /**
   * Convert between different time formats
   */
  static convertTimeFormat(
    timeValue: TimeStringInput,
    outputFormat: TimeOutputFormat | string = '12hour'
  ): string | number {
    const duration: TonicDuration = TonicDateTimeHelpers.parseTimeString(timeValue);

    switch (outputFormat.toLowerCase()) {
      case '12hour':
      case '12-hour':
        return duration.to12Hour();
      case '24hour':
      case '24-hour':
        return duration.to24Hour();
      case 'minutes':
        return duration.totalMinutes;
      case 'hours':
        return duration.totalHours;
      default:
        return duration.to12Hour();
    }
  }

  /**
   * Calculate duration between two times
   */
  static durationBetween(startTime: TimeStringInput, endTime: TimeStringInput): TonicDuration {
    const start: TonicDuration = TonicDateTimeHelpers.parseTimeString(startTime);
    const end: TonicDuration = TonicDateTimeHelpers.parseTimeString(endTime);

    // Handle overnight times (end time next day)
    if (end.isBefore(start)) {
      return new TonicDuration(24 * 60 - start.totalMinutes + end.totalMinutes);
    }

    return end.minus(start);
  }

  /**
   * Add duration to a time
   */
  static addDuration(timeValue: TimeStringInput, durationMinutes: number): TonicDuration {
    const time: TonicDuration = TonicDateTimeHelpers.parseTimeString(timeValue);
    return time.plus(durationMinutes);
  }

  /**
   * Check if time is in range
   */
  static isTimeInRange(
    timeValue: TimeStringInput,
    startTime: TimeStringInput,
    endTime: TimeStringInput
  ): boolean {
    const time: TonicDuration = TonicDateTimeHelpers.parseTimeString(timeValue);
    const start: TonicDuration = TonicDateTimeHelpers.parseTimeString(startTime);
    const end: TonicDuration = TonicDateTimeHelpers.parseTimeString(endTime);

    return time.totalMinutes >= start.totalMinutes && time.totalMinutes <= end.totalMinutes;
  }

  /**
   * Get start of current day in UTC (for compatibility with old DateHelpers)
   */
  static getStartOfCurrentDayUTC(): Date {
    return TonicDateTimeHelpers.getStartOfDate(new Date());
  }

  /**
   * Get start of specific date in UTC
   */
  static getStartOfDate(date: Date | null): Date {
    const targetDate: Date = date instanceof Date ? date : new Date();
    return new Date(
      Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate())
    );
  }

  /**
   * Convert 24-hour time to 12-hour format (for compatibility)
   */
  static convertTo12HourFormat(timeString: string | null | undefined): string | null {
    if (!timeString) return null;

    const duration: TonicDuration = TonicDateTimeHelpers.parseTimeString(timeString);
    return duration.to12Hour();
  }
}

// Export main classes
export {
  TonicDuration as Duration,
  TonicDateTime as DateTime,
  TonicDateTimeHelpers as DateHelpers,
};

/**
 * USAGE EXAMPLES:
 *
 * // Creating time durations (C# TimeSpan-like)
 * const startTime = DateHelpers.parseTimeString("3:30 PM");
 * const classLength = Duration.fromHours(1, 30); // 1 hour 30 minutes
 * const endTime = startTime.plus(classLength);
 * console.log(endTime.to12Hour()); // "5:00 PM"
 *
 * // Duration arithmetic
 * const morning = Duration.fromTimeString("9:00 AM");
 * const afternoon = morning.plus(180); // Add 3 hours (180 minutes)
 * console.log(afternoon.to12Hour()); // "12:00 PM"
 *
 * // Working with Google Sheets dates
 * const googleTime = DateHelpers.parseGoogleSheetsTime(0.65625); // 15:45 (3:45 PM)
 * console.log(googleTime.to12Hour()); // "3:45 PM"
 *
 * // Creating audit timestamps
 * const createdAt = DateTime.now();
 * console.log(createdAt.toISOString()); // "2025-08-02T20:30:00.000Z"
 *
 * // Duration between times
 * const lessonDuration = DateHelpers.durationBetween("3:00 PM", "4:30 PM");
 * console.log(lessonDuration.totalMinutes); // 90
 *
 * // Time range checking
 * const isSchoolHours = DateHelpers.isTimeInRange("2:30 PM", "8:00 AM", "5:00 PM");
 * console.log(isSchoolHours); // true
 */
