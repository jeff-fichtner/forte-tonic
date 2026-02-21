/**
 * Instructor API model - for client-server communication
 * Rich model with validation, formatting, and business logic
 */

export interface DayAvailability {
  isAvailable: string;
  startTime: string;
  endTime: string;
  roomId: string;
}

export interface InstructorAvailability {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
}

export interface GradeRange {
  minimum: string;
  maximum: string;
}

export interface InstructorData {
  id: string;
  email?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  phoneNumber?: string | null;
  accessCode?: string | null;
  displayEmail?: string | null;
  displayPhone?: string | null;
  specialties?: string[] | null;
  isActive?: boolean;
  role?: string | null;
  availability?: InstructorAvailability | null;
  gradeRange?: GradeRange | null;
}

export interface InstructorJSON {
  id: string;
  email: string | null;
  lastName: string;
  firstName: string;
  phone: string | null;
  fullName: string;
  displayName: string;
  displayEmail: string | null;
  displayPhone: string | null;
  specialties: string[] | null;
  isActive: boolean;
  availability: InstructorAvailability | null;
  gradeRange: GradeRange | null;
  role: string | null;
}

export class Instructor {
  id: string;
  email: string | null;
  lastName: string | null;
  firstName: string | null;
  phoneNumber: string | null;
  accessCode: string | null;
  displayEmail: string | null;
  displayPhone: string | null;
  specialties: string[] | null;
  isActive: boolean;
  role: string | null;
  availability: InstructorAvailability | null;
  gradeRange: GradeRange | null;

  /**
   * Creates an Instructor API model instance
   */
  constructor(data: InstructorData) {
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
    this.isActive = isActive ?? false;
    this.role = role || null;
    this.availability = availability || null;
    this.gradeRange = gradeRange || null;
  }

  /**
   * Factory method for creating from database row data (positional parameters)
   */
  static fromDatabaseRow(row: string[]): Instructor {
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

    const availability: InstructorAvailability = {
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

    const gradeRange: GradeRange = { minimum: minimumGrade, maximum: maximumGrade };

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
   */
  static fromApiData(data: InstructorData): Instructor {
    return new Instructor(data);
  }

  /**
   * Gets the instructor's full name
   */
  get fullName(): string {
    const first = this.firstName || '';
    const last = this.lastName || '';
    return `${first} ${last}`.trim();
  }

  /**
   * Gets formatted display name with role
   */
  get displayName(): string {
    return `${this.fullName} (Instructor)`;
  }

  toJSON(): InstructorJSON {
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
