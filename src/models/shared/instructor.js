/**
 * Instructor API model - for client-server communication
 * Rich model with validation, formatting, and business logic
 */

export class Instructor {
  /**
   * Creates an Instructor API model instance
   * @param {object} data - Instructor data object
   * @param {string} data.id - Unique identifier
   * @param {string} data.email - Email address
   * @param {string} data.lastName - Last name
   * @param {string} data.firstName - First name
   * @param {string} [data.phoneNumber] - Phone number
   * @param {string} [data.accessCode] - Access code for authentication
   * @param {string} [data.displayEmail] - Public display email
   * @param {string} [data.displayPhone] - Public display phone
   * @param {Array<string>} [data.specialties] - Teaching specialties/instruments
   * @param {boolean} [data.isActive=true] - Active status
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
      accessCode,
      displayEmail,
      displayPhone,
      specialties,
      isActive,
      role,
      availability,
      gradeRange,
    } = data;

    // Required fields
    this.id = id;
    this.email = email || null;
    this.lastName = lastName || null;
    this.firstName = firstName || null;

    // Optional fields
    this.phoneNumber = phoneNumber || null;
    this.accessCode = accessCode || null;
    this.displayEmail = displayEmail || null;
    this.displayPhone = displayPhone || null;
    this.specialties = specialties || null;
    this.isActive = isActive;
    this.role = role || null;
    this.availability = availability || null;
    this.gradeRange = gradeRange || null;
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
      isDeactivated, // Position 5
      minimumGrade, // Position 6
      maximumGrade, // Position 7
      instrument1, // Position 8
      instrument2, // Position 9
      instrument3, // Position 10
      instrument4, // Position 11
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
      accessCode, // Position 32 - access code for authentication
      displayEmail, // Position 33 - public display email
      displayPhone, // Position 34 - public display phone
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
      accessCode, // Add access code back
      displayEmail,
      displayPhone,
      specialties,
      isActive: !isDeactivated,
      availability,
      gradeRange,
      role: 'instructor',
    });
  }

  /**
   * Factory method for creating from API/web data (object with properties)
   * @param {object} data - API data object
   * @returns {Instructor} Instructor instance
   */
  static fromApiData(data) {
    return new Instructor(data);
  }

  /**
   * Gets the instructor's full name
   * @returns {string} Full name in "firstName lastName" format
   */
  get fullName() {
    const first = this.firstName || '';
    const last = this.lastName || '';
    return `${first} ${last}`.trim();
  }

  /**
   * Gets formatted display name with role
   * @returns {string} Display name with role indicator
   */
  get displayName() {
    return `${this.fullName} (Instructor)`;
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      lastName: this.lastName || '',
      firstName: this.firstName || '',
      phone: this.phoneNumber,
      fullName: this.fullName,
      displayName: this.displayName,
      displayEmail: this.displayEmail,
      displayPhone: this.displayPhone,
      specialties: this.specialties,
      isActive: this.isActive,
      availability: this.availability,
      gradeRange: this.gradeRange,
      role: this.role,
    };
  }
}
