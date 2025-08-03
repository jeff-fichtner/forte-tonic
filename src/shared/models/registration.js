/**
 * Registration model - unified for both backend and frontend use
 */
export class Registration {
  /**
   * Creates a Registration instance with required fields
   * @param {string} id - Registration ID
   * @param {string} studentId - Student ID
   * @param {string} instructorId - Instructor ID
   * @param {string} day - Day of week
   * @param {Date|string} startTime - Start time
   * @param {number} length - Length in minutes
   * @param {string} registrationType - Registration type
   * @param {object} [options={}] - Optional properties
   */
  constructor(id, studentId, instructorId, day, startTime, length, registrationType, options = {}) {
    // Required fields
    this.id = id;
    this.studentId = studentId;
    this.instructorId = instructorId;
    this.day = day;
    this.startTime = startTime;
    this.length = length;
    this.registrationType = registrationType;
    
    // Optional properties with defaults
    this.roomId = options.roomId || null;
    this.instrument = options.instrument || null;
    this.transportationType = options.transportationType || null;
    this.notes = options.notes || null;
    this.classId = options.classId || null;
    this.className = options.className || null;
    this.expectedStartDate = options.expectedStartDate || null;
    this.createdAt = options.createdAt || new Date();
    this.createdBy = options.createdBy || null;
    this.status = options.status || 'pending';
    this.isActive = options.isActive !== false;
  }

  /**
   * Factory method for creating from database row data (positional parameters)
   * @param {Array} row - Database row array with positional data
   * @returns {Registration} Registration instance
   */
  static fromDatabaseRow(row) {
    const [id, studentId, instructorId, day, startTime, length, registrationType, 
           roomId, instrument, transportationType, notes, classId, className, 
           expectedStartDate, createdAt, createdBy] = row;
           
    return new Registration(id, studentId, instructorId, day, startTime, length, registrationType, {
      roomId,
      instrument,
      transportationType,
      notes,
      classId,
      className,
      expectedStartDate: expectedStartDate ? new Date(expectedStartDate) : null,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      createdBy,
      status: 'active', // Database rows are typically active
      isActive: true
    });
  }

  /**
   * Factory method for creating from API/web data (object with properties)
   * @param {object} data - API data object
   * @returns {Registration} Registration instance
   */
  static fromApiData(data) {
    const {
      id,
      studentId,
      instructorId,
      day,
      startTime,
      length,
      registrationType,
      roomId,
      instrument,
      transportationType,
      notes,
      classId,
      className,
      expectedStartDate,
      createdDate, // web uses createdDate
      createdAt, // core uses createdAt
      createdBy,
      status = 'pending',
      isActive = true,
    } = data;

    return new Registration(id, studentId, instructorId, day, startTime, length, registrationType, {
      roomId,
      instrument,
      transportationType,
      notes,
      classId,
      className,
      expectedStartDate: expectedStartDate
        ? expectedStartDate instanceof Date
          ? expectedStartDate
          : new Date(expectedStartDate)
        : null,
      createdAt: createdAt || createdDate || new Date(),
      createdBy,
      status,
      isActive
    });
  }

  /**
   * Factory method for creating new registrations
   * @param {string} studentId - Student ID
   * @param {string} instructorId - Instructor ID
   * @param {string} day - Day of week
   * @param {Date|string} startTime - Start time
   * @param {number} length - Length in minutes
   * @param {string} registrationType - Registration type
   * @param {object} [options={}] - Additional options
   * @returns {Registration} New registration instance
   */
  static create(studentId, instructorId, day, startTime, length, registrationType, options = {}) {
    const id = options.id || `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return new Registration(id, studentId, instructorId, day, startTime, length, registrationType, {
      ...options,
      createdAt: new Date(),
      status: 'pending',
      isActive: true
    });
  }

  /**
   * @deprecated Use Registration.fromApiData() or Registration.fromDatabaseRow() instead
   * Legacy constructor for backwards compatibility - will be removed in future version
   */
  static legacyConstructor(
    data,
    studentId,
    instructorId,
    day,
    startTime,
    length,
    registrationType,
    roomId,
    instrument,
    transportationType,
    notes,
    classId,
    className,
    expectedStartDate,
    createdAt,
    createdBy
  ) {
    console.warn('⚠️  Registration legacy constructor is deprecated. Use Registration.fromApiData() or Registration.fromDatabaseRow() instead.');
    
    if (typeof data === 'object' && data !== null) {
      return Registration.fromApiData(data);
    } else {
      const row = [data, studentId, instructorId, day, startTime, length, registrationType, 
                   roomId, instrument, transportationType, notes, classId, className, 
                   expectedStartDate, createdAt, createdBy];
      return Registration.fromDatabaseRow(row);
    }
  }

  /**
   * Gets formatted start time
   * @returns {string} Formatted start time
   */
  get formattedStartTime() {
    if (!this.startTime) return '';

    // If DurationHelpers is available (frontend), use it
    if (typeof window !== 'undefined' && window.DurationHelpers) {
      return window.DurationHelpers.stringToDuration(this.startTime).to12HourFormat();
    }

    // Fallback formatting
    if (this.startTime instanceof Date) {
      return this.startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    return this.startTime.toString();
  }

  /**
   * Gets formatted expected start date
   * @returns {string} Formatted expected start date
   */
  get formattedExpectedStartDate() {
    if (!this.expectedStartDate) return '';

    return this.expectedStartDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Gets formatted created date
   * @returns {string} Formatted created date
   */
  get formattedCreatedDate() {
    if (!this.createdAt) return '';

    return this.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Checks if this is a group registration
   * @returns {boolean} True if this is a group registration
   */
  get isGroupRegistration() {
    return !!(this.classId && this.className);
  }

  /**
   * Checks if this is a private lesson registration
   * @returns {boolean} True if this is a private lesson
   */
  get isPrivateLesson() {
    return !this.isGroupRegistration;
  }

  /**
   * Gets registration type display name
   * @returns {string} Formatted registration type
   */
  get formattedRegistrationType() {
    if (!this.registrationType) return '';

    // Convert snake_case or camelCase to Title Case
    return this.registrationType
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Gets schedule summary
   * @returns {string} Schedule summary
   */
  get scheduleText() {
    if (this.isGroupRegistration) {
      return `${this.className} - ${this.day} at ${this.formattedStartTime}`;
    }
    return `${this.instrument} lesson - ${this.day} at ${this.formattedStartTime}`;
  }

  /**
   * Gets duration in minutes
   * @returns {number} Duration in minutes
   */
  get durationMinutes() {
    return this.length || 0;
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
   * Checks if registration is pending approval
   * @returns {boolean} True if pending
   */
  get isPending() {
    return this.status === 'pending';
  }

  /**
   * Checks if registration is approved
   * @returns {boolean} True if approved
   */
  get isApproved() {
    return this.status === 'approved';
  }

  /**
   * Checks if registration is cancelled
   * @returns {boolean} True if cancelled
   */
  get isCancelled() {
    return this.status === 'cancelled';
  }

  /**
   * Updates registration status
   * @param {string} newStatus - New status
   */
  updateStatus(newStatus) {
    const validStatuses = ['pending', 'approved', 'cancelled', 'completed'];
    if (validStatuses.includes(newStatus)) {
      this.status = newStatus;
    }
  }

  /**
   * Gets the number of days since registration was created
   * @returns {number} Days since creation
   */
  get daysSinceCreated() {
    if (!this.createdAt) return 0;

    const today = new Date();
    const created = new Date(this.createdAt);
    const diffTime = Math.abs(today - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Validates if the registration object has required fields
   * @returns {object} Validation result with isValid boolean and errors array
   */
  validate() {
    const errors = [];

    if (!this.studentId) errors.push('Student is required');
    if (!this.instructorId) errors.push('Instructor is required');
    if (!this.day) errors.push('Day is required');
    if (!this.startTime) errors.push('Start time is required');
    if (!this.registrationType) errors.push('Registration type is required');

    // For private lessons, instrument is required
    if (this.isPrivateLesson && !this.instrument) {
      errors.push('Instrument is required for private lessons');
    }

    // For group registrations, class info is required
    if (this.isGroupRegistration && !this.className) {
      errors.push('Class name is required for group registrations');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Converts the registration to a plain object for API responses
   * @returns {object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      studentId: this.studentId,
      instructorId: this.instructorId,
      day: this.day,
      startTime: this.startTime,
      length: this.length,
      registrationType: this.registrationType,
      roomId: this.roomId,
      instrument: this.instrument,
      transportationType: this.transportationType,
      notes: this.notes,
      classId: this.classId,
      className: this.className,
      expectedStartDate: this.expectedStartDate,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      status: this.status,
      isActive: this.isActive,
      formattedStartTime: this.formattedStartTime,
      formattedExpectedStartDate: this.formattedExpectedStartDate,
      formattedCreatedDate: this.formattedCreatedDate,
      formattedRegistrationType: this.formattedRegistrationType,
      formattedDuration: this.formattedDuration,
      scheduleText: this.scheduleText,
      isGroupRegistration: this.isGroupRegistration,
      isPrivateLesson: this.isPrivateLesson,
      isPending: this.isPending,
      isApproved: this.isApproved,
      isCancelled: this.isCancelled,
      daysSinceCreated: this.daysSinceCreated,
    };
  }
}
