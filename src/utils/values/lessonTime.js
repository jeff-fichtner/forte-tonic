/**
 * Lesson Time Value Object
 *
 * Immutable value object representing lesson timing with business rules
 */

export class LessonTime {
  constructor(startTime, durationMinutes) {
    if (!LessonTime.isValidTime(startTime)) {
      throw new Error(`Invalid start time: ${startTime}. Must be in HH:MM format`);
    }

    if (!LessonTime.isValidDuration(durationMinutes)) {
      throw new Error(`Invalid duration: ${durationMinutes}. Must be a positive number`);
    }

    this.startTime = startTime;
    this.durationMinutes = Number(durationMinutes);
    this.endTime = this.#calculateEndTime(startTime, this.durationMinutes);

    Object.freeze(this);
  }

  static isValidTime(timeString) {
    if (!timeString || typeof timeString !== 'string') return false;

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  }

  static isValidDuration(duration) {
    const num = Number(duration);
    return !isNaN(num) && num > 0 && num <= 240; // Max 4 hours
  }

  #calculateEndTime(startTime, durationMinutes) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;

    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;

    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  /**
   * Check if this lesson time overlaps with another
   */
  overlapsWith(other) {
    if (!(other instanceof LessonTime)) {
      throw new Error('Can only check overlap with another LessonTime');
    }

    const thisStart = this.#timeToMinutes(this.startTime);
    const thisEnd = this.#timeToMinutes(this.endTime);
    const otherStart = this.#timeToMinutes(other.startTime);
    const otherEnd = this.#timeToMinutes(other.endTime);

    return thisStart < otherEnd && otherStart < thisEnd;
  }

  /**
   * Get time buffer needed between lessons (in minutes)
   */
  getBufferTime() {
    // Standard 15-minute buffer between lessons
    return 15;
  }

  /**
   * Check if there's adequate buffer time between lessons
   */
  hasAdequateBufferWith(other) {
    if (!(other instanceof LessonTime)) {
      throw new Error('Can only check buffer with another LessonTime');
    }

    const thisEnd = this.#timeToMinutes(this.endTime);
    const otherStart = this.#timeToMinutes(other.startTime);
    const buffer = Math.abs(otherStart - thisEnd);

    return buffer >= this.getBufferTime();
  }

  #timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get formatted duration string
   */
  getDurationString() {
    const hours = Math.floor(this.durationMinutes / 60);
    const minutes = this.durationMinutes % 60;

    if (hours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
    }
  }

  /**
   * Check if this is a standard lesson duration
   */
  isStandardDuration() {
    const standardDurations = [30, 45, 60, 90]; // Common lesson durations
    return standardDurations.includes(this.durationMinutes);
  }

  /**
   * Get the time slot category
   */
  getTimeSlotCategory() {
    const hour = parseInt(this.startTime.split(':')[0]);

    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  equals(other) {
    return (
      other instanceof LessonTime &&
      this.startTime === other.startTime &&
      this.durationMinutes === other.durationMinutes
    );
  }

  toString() {
    return `${this.startTime}-${this.endTime} (${this.getDurationString()})`;
  }

  /**
   * Factory method: Create from time range
   */
  static fromTimeRange(startTime, endTime) {
    if (!LessonTime.isValidTime(startTime) || !LessonTime.isValidTime(endTime)) {
      throw new Error('Invalid time format. Use HH:MM format');
    }

    const startMinutes = this.prototype.#timeToMinutes(startTime);
    const endMinutes = this.prototype.#timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      throw new Error('End time must be after start time');
    }

    const duration = endMinutes - startMinutes;
    return new LessonTime(startTime, duration);
  }

  /**
   * Factory method: Create standard lesson durations
   */
  static createStandard(startTime, type = '60min') {
    const durations = {
      '30min': 30,
      '45min': 45,
      '60min': 60,
      '90min': 90,
    };

    const duration = durations[type];
    if (!duration) {
      throw new Error(
        `Unknown lesson type: ${type}. Available: ${Object.keys(durations).join(', ')}`
      );
    }

    return new LessonTime(startTime, duration);
  }
}
