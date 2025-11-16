import { DateHelpers } from '../../utils/nativeDateTimeHelpers.js';

/**
 * Class model - unified for both backend and frontend use
 *
 * Database fields (persisted in Classes sheet):
 * - id, instructorId, day, startTime, length, endTime, instrument, title, size, minimumGrade, maximumGrade
 *
 * Computed/business logic properties (NOT in database):
 * - roomId, description, isActive
 *   These are used for business logic but not persisted
 */
export class Class {
  /**
   * Creates a Class instance with required fields
   * @param {string} id - Class ID
   * @param {string} instructorId - Instructor ID
   * @param {string} day - Day of week
   * @param {Date|string} startTime - Start time
   * @param {number} length - Length in minutes
   * @param {Date|string} endTime - End time
   * @param {string} instrument - Instrument
   * @param {string} title - Class title
   * @param {object} [options={}] - Optional properties
   */
  constructor(id, instructorId, day, startTime, length, endTime, instrument, title, options = {}) {
    // Required fields
    this.id = id;
    this.instructorId = instructorId;
    this.day = day;
    this.startTime = startTime;
    this.length = length;
    this.endTime = endTime;
    this.instrument = instrument;
    this.title = title;

    // Optional properties with defaults
    this.size = options.size || null;
    this.minimumGrade = options.minimumGrade || null;
    this.maximumGrade = options.maximumGrade || null;
    this.isRestricted = options.isRestricted || null;
    this.roomId = options.roomId || null;
    this.description = options.description || null;
    this.isActive = options.isActive !== false;
  }

  /**
   * Factory method for creating from database row data (positional parameters)
   * @param {Array} row - Database row array with positional data
   * @returns {Class} Class instance
   */
  static fromDatabaseRow(row) {
    const [
      id,
      instructorId,
      day,
      startTime,
      length,
      endTime,
      instrument,
      title,
      size,
      minimumGrade,
      maximumGrade,
      isRestricted,
    ] = row;

    // Process time strings with DateHelpers if available
    const processedStartTime = DateHelpers?.parseTimeString
      ? DateHelpers.parseTimeString(startTime).to24Hour()
      : startTime;
    const processedEndTime = DateHelpers?.parseTimeString
      ? DateHelpers.parseTimeString(endTime).to24Hour()
      : endTime;

    // Ensure length is parsed as a number (duration in minutes)
    const processedLength = parseInt(length) || 0;

    return new Class(
      id,
      instructorId,
      day,
      processedStartTime,
      processedLength,
      processedEndTime,
      instrument,
      title,
      {
        size,
        minimumGrade,
        maximumGrade,
        isRestricted,
        roomId: null,
        description: null,
        isActive: true,
      }
    );
  }

  /**
   * Factory method for creating from API/web data (object with properties)
   * @param {object} data - API data object
   * @returns {Class} Class instance
   */
  static fromApiData(data) {
    const {
      id,
      instructorId,
      day,
      startTime,
      length,
      endTime,
      instrument,
      title,
      size,
      minimumGrade,
      maximumGrade,
      isRestricted,
      roomId,
      description,
      isActive,
    } = data;

    return new Class(id, instructorId, day, startTime, length, endTime, instrument, title, {
      size,
      minimumGrade,
      maximumGrade,
      isRestricted,
      roomId,
      description,
      isActive,
    });
  }

  /**
   * Factory method for creating new classes
   * @param {string} instructorId - Instructor ID
   * @param {string} day - Day of week
   * @param {Date|string} startTime - Start time
   * @param {number} length - Length in minutes
   * @param {Date|string} endTime - End time
   * @param {string} instrument - Instrument
   * @param {string} title - Class title
   * @param {object} [options={}] - Additional options
   * @returns {Class} New class instance
   */
  static create(instructorId, day, startTime, length, endTime, instrument, title, options = {}) {
    const id = options.id || `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return new Class(id, instructorId, day, startTime, length, endTime, instrument, title, {
      ...options,
      isActive: true,
    });
  }

  /**
   * Gets formatted start time
   * @returns {string} Formatted start time
   */
  get formattedStartTime() {
    if (!this.startTime) return '';

    // Check if browser environment and DurationHelpers is available
    if (typeof window !== 'undefined' && window.DurationHelpers) {
      return DateHelpers.parseTimeString(this.startTime).to12Hour();
    }

    // Try fallback for environments without DurationHelpers
    try {
      return DateHelpers.convertTimeFormat(this.startTime, '12hour');
    } catch (error) {
      // Final fallback formatting
      if (this.startTime instanceof Date) {
        return this.startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }

      return this.startTime.toString();
    }
  }

  /**
   * Gets formatted end time
   * @returns {string} Formatted end time
   */
  get formattedEndTime() {
    if (!this.endTime) return '';

    if (this.endTime instanceof Date) {
      return this.endTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    return this.endTime.toString();
  }

  /**
   * Gets formatted minimum grade
   * @returns {string} Formatted minimum grade
   */
  get formattedMinimumGrade() {
    return this.formatGrade(this.minimumGrade);
  }

  /**
   * Gets formatted maximum grade
   * @returns {string} Formatted maximum grade
   */
  get formattedMaximumGrade() {
    return this.formatGrade(this.maximumGrade);
  }

  /**
   * Formats a grade for display
   * @param {string|number} grade - Grade to format
   * @returns {string} Formatted grade
   */
  formatGrade(grade) {
    if (!grade && grade !== 0) return '';

    // Handle numeric 0 and string "0" for kindergarten (consistent with numberExtensions.js)
    if (grade === 0 || grade === '0') return 'K';

    const gradeStr = grade.toString().toLowerCase();

    if (gradeStr === 'k' || gradeStr === 'kindergarten') return 'K';
    if (gradeStr.includes('pre')) return 'Pre-K';
    if (!isNaN(gradeStr)) return gradeStr;

    return grade.toString();
  }

  /**
   * Gets formatted class name with grade range and schedule
   * @returns {string} Formatted class name
   */
  get formattedName() {
    const gradeRange = `${this.formattedMinimumGrade}-${this.formattedMaximumGrade}`;
    return `${this.title} (${gradeRange}): ${this.day} at ${this.formattedStartTime}`;
  }

  /**
   * Gets class duration in minutes
   * @returns {number} Duration in minutes
   */
  get durationMinutes() {
    if (this.length) return this.length;

    if (this.startTime && this.endTime) {
      const start = new Date(this.startTime);
      const end = new Date(this.endTime);
      return Math.round((end - start) / (1000 * 60));
    }

    return 0;
  }

  /**
   * Gets formatted duration
   * @returns {string} Formatted duration
   */
  get formattedDuration() {
    const minutes = this.durationMinutes;
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Checks if the class is suitable for a specific grade
   * @param {number} grade - Grade to check (0-8, where 0 = Kindergarten)
   * @returns {boolean} True if grade is within range
   */
  isGradeEligible(grade) {
    const gradeNum = Number(grade);
    const minNum = Number(this.minimumGrade);
    const maxNum = Number(this.maximumGrade);
    return gradeNum >= minNum && gradeNum <= maxNum;
  }

  /**
   * Converts grade to number for comparison
   * @param {string|number} grade - Grade to convert (0-8)
   * @returns {number} Numeric grade value
   */
  gradeToNumber(grade) {
    return Number(grade);
  }

  /**
   * Gets the time slot as a string
   * @returns {string} Time slot description
   */
  get timeSlot() {
    return `${this.day} ${this.formattedStartTime} - ${this.formattedEndTime}`;
  }

  /**
   * Validates if the class object has required fields
   * @returns {object} Validation result with isValid boolean and errors array
   */
  validate() {
    const errors = [];

    if (!this.title) errors.push('Class title is required');
    if (!this.instructorId) errors.push('Instructor is required');
    if (!this.day) errors.push('Day is required');
    if (!this.startTime) errors.push('Start time is required');
    if (!this.instrument) errors.push('Instrument is required');
    if (!this.minimumGrade) errors.push('Minimum grade is required');
    if (!this.maximumGrade) errors.push('Maximum grade is required');

    // Validate grade range
    if (this.minimumGrade && this.maximumGrade) {
      const minNum = this.gradeToNumber(this.minimumGrade);
      const maxNum = this.gradeToNumber(this.maximumGrade);
      if (minNum > maxNum) {
        errors.push('Minimum grade cannot be higher than maximum grade');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Converts the class to a plain object for API responses
   * @returns {object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      instructorId: this.instructorId,
      day: this.day,
      startTime: this.startTime,
      length: this.length,
      endTime: this.endTime,
      instrument: this.instrument,
      title: this.title,
      size: this.size,
      minimumGrade: this.minimumGrade,
      maximumGrade: this.maximumGrade,
      isRestricted: this.isRestricted,
      roomId: this.roomId,
      description: this.description,
      isActive: this.isActive,
      formattedStartTime: this.formattedStartTime,
      formattedEndTime: this.formattedEndTime,
      formattedMinimumGrade: this.formattedMinimumGrade,
      formattedMaximumGrade: this.formattedMaximumGrade,
      formattedName: this.formattedName,
      durationMinutes: this.durationMinutes,
      formattedDuration: this.formattedDuration,
      timeSlot: this.timeSlot,
    };
  }
}
