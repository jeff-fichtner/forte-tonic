/**
 * Instructor API model - for client-server communication
 * Rich model with validation, formatting, and business logic
 */

// Helper function to extract string values from various data types
function extractStringValue(value) {
  if (value === null || value === undefined) {
    return value;
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'object') {
    // If it's an object, it might have an id, value, or _value property
    if (value.value) return String(value.value);
    if (value.id) return String(value.id);
    if (value._value) return String(value._value);
    if (value.uuid) return String(value.uuid);
    
    // If it's an array, take the first element
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }
    
    console.warn('Unable to extract string from object:', value);
    return String(value); // This will produce "[object Object]"
  }
  
  return String(value);
}

export class Instructor {
  /**
   * Creates an Instructor API model instance
   * @param {object} data - Instructor data object
   * @param {string} data.id - Unique identifier
   * @param {string} data.email - Email address
   * @param {string} data.lastName - Last name
   * @param {string} data.firstName - First name
   * @param {string} [data.phoneNumber] - Phone number
   * @param {Array<string>} [data.specialties] - Teaching specialties/instruments
   * @param {boolean} [data.isActive=true] - Active status
   * @param {Date|string} [data.hireDate] - Hire date
   * @param {string} [data.bio] - Instructor bio
   * @param {number} [data.yearsExperience] - Years of experience
   * @param {Array<string>} [data.certifications] - Certifications
   * @param {string} [data.role='instructor'] - User role
   * @param {object} [data.availability] - Weekly availability schedule
   * @param {object} [data.gradeRange] - Grade level range
   */
  constructor(data) {
    // Validate input
    if (!data || typeof data !== 'object') {
      throw new Error('Instructor data object is required');
    }

    const {
      id,
      email,
      lastName,
      firstName,
      phoneNumber,
      specialties = [],
      isActive = true,
      hireDate,
      bio,
      yearsExperience,
      certifications = [],
      role = 'instructor',
      availability = {},
      gradeRange = {},
    } = data;

    // Required fields
    this.id = id;
    this.email = email;
    this.lastName = lastName;
    this.firstName = firstName;

    // Optional fields
    this.phoneNumber = phoneNumber;
    this.specialties = Array.isArray(specialties) ? specialties : [];
    this.isActive = isActive;
    this.hireDate = hireDate ? (hireDate instanceof Date ? hireDate : new Date(hireDate)) : null;
    this.bio = bio;
    this.yearsExperience = yearsExperience;
    this.certifications = Array.isArray(certifications) ? certifications : [];
    this.role = role;
    this.availability = availability;
    this.gradeRange = gradeRange;
  }

  /**
   * Creates Instructor from database model
   * @param {object} dbInstructor - Database instructor model
   * @param {object} [additionalData] - Additional data to merge
   * @returns {Instructor} API Instructor model
   */
  static fromDatabase(dbInstructor, additionalData = {}) {
    const specialties = [
      dbInstructor.instrument1,
      dbInstructor.instrument2,
      dbInstructor.instrument3,
      dbInstructor.instrument4,
    ].filter(Boolean);

    const availability = {
      monday: {
        isAvailable: dbInstructor.isAvailableMonday,
        startTime: dbInstructor.mondayStartTime,
        endTime: dbInstructor.mondayEndTime,
        roomId: dbInstructor.mondayRoomId,
      },
      tuesday: {
        isAvailable: dbInstructor.isAvailableTuesday,
        startTime: dbInstructor.tuesdayStartTime,
        endTime: dbInstructor.tuesdayEndTime,
        roomId: dbInstructor.tuesdayRoomId,
      },
      wednesday: {
        isAvailable: dbInstructor.isAvailableWednesday,
        startTime: dbInstructor.wednesdayStartTime,
        endTime: dbInstructor.wednesdayEndTime,
        roomId: dbInstructor.wednesdayRoomId,
      },
      thursday: {
        isAvailable: dbInstructor.isAvailableThursday,
        startTime: dbInstructor.thursdayStartTime,
        endTime: dbInstructor.thursdayEndTime,
        roomId: dbInstructor.thursdayRoomId,
      },
      friday: {
        isAvailable: dbInstructor.isAvailableFriday,
        startTime: dbInstructor.fridayStartTime,
        endTime: dbInstructor.fridayEndTime,
        roomId: dbInstructor.fridayRoomId,
      },
    };

    const gradeRange = {
      minimum: dbInstructor.minimumGrade,
      maximum: dbInstructor.maximumGrade,
    };

    return new Instructor({
      id: dbInstructor.id,
      email: dbInstructor.email,
      lastName: dbInstructor.lastName,
      firstName: dbInstructor.firstName,
      phoneNumber: dbInstructor.phone,
      specialties,
      isActive: !dbInstructor.isDeactivated, // Note: inverted logic
      availability,
      gradeRange,
      ...additionalData,
    });
  }

  /**
   * Factory method for creating from database row data (positional parameters)
   * @param {Array} row - Database row array with positional data
   * @returns {Instructor} Instructor instance
   */
  static fromDatabaseRow(row) {
    const [
      id,
      email,
      lastName,
      firstName,
      phone,
      isDeactivated,
      minimumGrade,
      maximumGrade,
      instrument1,
      instrument2,
      instrument3,
      instrument4,
      isAvailableMonday,
      mondayStartTime,
      mondayEndTime,
      mondayRoomId,
      isAvailableTuesday,
      tuesdayStartTime,
      tuesdayEndTime,
      tuesdayRoomId,
      isAvailableWednesday,
      wednesdayStartTime,
      wednesdayEndTime,
      wednesdayRoomId,
      isAvailableThursday,
      thursdayStartTime,
      thursdayEndTime,
      thursdayRoomId,
      isAvailableFriday,
      fridayStartTime,
      fridayEndTime,
      fridayRoomId,
    ] = row;

    const specialties = [instrument1, instrument2, instrument3, instrument4].filter(Boolean);

    const availability = {
      monday: {
        isAvailable: isAvailableMonday,
        startTime: mondayStartTime,
        endTime: mondayEndTime,
        roomId: mondayRoomId,
      },
      tuesday: {
        isAvailable: isAvailableTuesday,
        startTime: tuesdayStartTime,
        endTime: tuesdayEndTime,
        roomId: tuesdayRoomId,
      },
      wednesday: {
        isAvailable: isAvailableWednesday,
        startTime: wednesdayStartTime,
        endTime: wednesdayEndTime,
        roomId: wednesdayRoomId,
      },
      thursday: {
        isAvailable: isAvailableThursday,
        startTime: thursdayStartTime,
        endTime: thursdayEndTime,
        roomId: thursdayRoomId,
      },
      friday: {
        isAvailable: isAvailableFriday,
        startTime: fridayStartTime,
        endTime: fridayEndTime,
        roomId: fridayRoomId,
      },
    };

    const gradeRange = { minimum: minimumGrade, maximum: maximumGrade };

    return new Instructor({
      id,
      email,
      lastName,
      firstName,
      phoneNumber: phone,
      specialties,
      isActive: !isDeactivated,
      availability,
      gradeRange,
      hireDate: null,
      bio: '',
      yearsExperience: 0,
      certifications: [],
      role: 'instructor',
    });
  }

  /**
   * Factory method for creating from API/web data (object with properties)
   * @param {object} data - API data object
   * @returns {Instructor} Instructor instance
   */
  static fromApiData(data) {
    // Handle ID field that might be an object or other type
    const processedData = {
      ...data,
      id: extractStringValue(data.id)
    };
    
    return new Instructor(processedData);
  }

  /**
   * Converts to database model format
   * @returns {object} Database-compatible object
   */
  toDatabaseModel() {
    const dbModel = {
      id: this.id,
      email: this.email,
      lastName: this.lastName,
      firstName: this.firstName,
      phone: this.phoneNumber,
      isDeactivated: !this.isActive, // Note: inverted logic
      minimumGrade: this.gradeRange?.minimum,
      maximumGrade: this.gradeRange?.maximum,
      instrument1: this.specialties[0] || null,
      instrument2: this.specialties[1] || null,
      instrument3: this.specialties[2] || null,
      instrument4: this.specialties[3] || null,
    };

    // Add availability fields
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    days.forEach(day => {
      const dayData = this.availability[day] || {};
      const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);

      dbModel[`isAvailable${capitalizedDay}`] = dayData.isAvailable || false;
      dbModel[`${day}StartTime`] = dayData.startTime || null;
      dbModel[`${day}EndTime`] = dayData.endTime || null;
      dbModel[`${day}RoomId`] = dayData.roomId || null;
    });

    return dbModel;
  }

  /**
   * Gets the instructor's full name
   * @returns {string} Full name in "firstName lastName" format
   */
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Gets formatted display name with role
   * @returns {string} Display name with role indicator
   */
  get displayName() {
    return `${this.fullName} (Instructor)`;
  }

  /**
   * Gets years of service at the organization
   * @returns {number|null} Years of service, null if no hire date
   */
  get yearsOfService() {
    if (!this.hireDate) return null;

    const today = new Date();
    const hire = new Date(this.hireDate);
    let years = today.getFullYear() - hire.getFullYear();
    const monthDiff = today.getMonth() - hire.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < hire.getDate())) {
      years--;
    }

    return Math.max(0, years);
  }

  /**
   * Checks if instructor has a specific specialty
   * @param {string} specialty - Specialty to check
   * @returns {boolean} True if instructor has the specialty
   */
  hasSpecialty(specialty) {
    return this.specialties.some(s => s.toLowerCase() === specialty.toLowerCase());
  }

  /**
   * Gets formatted specialties string for display
   * @returns {string} Comma-separated specialties
   */
  get formattedSpecialties() {
    return this.specialties.join(', ');
  }

  /**
   * Checks if instructor has a specific certification
   * @param {string} certification - Certification to check
   * @returns {boolean} True if instructor has the certification
   */
  hasCertification(certification) {
    return this.certifications.some(c => c.toLowerCase() === certification.toLowerCase());
  }

  /**
   * Gets formatted certifications string for display
   * @returns {string} Comma-separated certifications
   */
  get formattedCertifications() {
    return this.certifications.join(', ');
  }

  /**
   * Checks if instructor is qualified to teach a specific subject
   * @param {string} subject - Subject to check
   * @returns {boolean} True if qualified
   */
  canTeach(subject) {
    return this.hasSpecialty(subject) || this.hasCertification(subject);
  }

  /**
   * Checks if instructor is available on a specific day
   * @param {string} day - Day to check (e.g., 'monday', 'tuesday')
   * @returns {boolean} True if available
   */
  isAvailableOnDay(day) {
    return this.availability[day.toLowerCase()]?.isAvailable || false;
  }

  /**
   * Gets availability for a specific day
   * @param {string} day - Day to get availability for
   * @returns {object | null} Availability object or null if not available
   */
  getDayAvailability(day) {
    const dayData = this.availability[day.toLowerCase()];
    return dayData?.isAvailable ? dayData : null;
  }

  /**
   * Gets all available days
   * @returns {Array<string>} Array of available day names
   */
  get availableDays() {
    return Object.keys(this.availability).filter(day => this.availability[day]?.isAvailable);
  }

  /**
   * Checks if instructor can teach a specific grade level
   * @param {string|number} grade - Grade level to check
   * @returns {boolean} True if can teach the grade
   */
  canTeachGrade(grade) {
    if (!this.gradeRange?.minimum || !this.gradeRange?.maximum) return true;

    const gradeNum = parseInt(grade);
    const minGrade = parseInt(this.gradeRange.minimum);
    const maxGrade = parseInt(this.gradeRange.maximum);

    return gradeNum >= minGrade && gradeNum <= maxGrade;
  }

  /**
   * Gets instructor's seniority level based on years of service
   * @returns {string} Seniority level
   */
  get seniorityLevel() {
    const years = this.yearsOfService;
    if (years === null) return 'Unknown';
    if (years < 1) return 'New';
    if (years < 3) return 'Junior';
    if (years < 7) return 'Senior';
    return 'Veteran';
  }

  /**
   * Validates if the instructor object has required fields
   * @returns {object} Validation result with isValid boolean and errors array
   */
  validate() {
    const errors = [];

    if (!this.firstName) errors.push('First name is required');
    if (!this.lastName) errors.push('Last name is required');
    if (!this.email) errors.push('Email is required');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.email && !emailRegex.test(this.email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Converts the instructor to a plain object for API responses
   * @returns {object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      lastName: this.lastName,
      firstName: this.firstName,
      fullName: this.fullName,
      displayName: this.displayName,
      phoneNumber: this.phoneNumber,
      specialties: this.specialties,
      formattedSpecialties: this.formattedSpecialties,
      certifications: this.certifications,
      formattedCertifications: this.formattedCertifications,
      isActive: this.isActive,
      hireDate: this.hireDate,
      yearsOfService: this.yearsOfService,
      yearsExperience: this.yearsExperience,
      seniorityLevel: this.seniorityLevel,
      bio: this.bio,
      role: this.role,
      availability: this.availability,
      availableDays: this.availableDays,
      gradeRange: this.gradeRange,
    };
  }
}
