/**
 * Instructor API model - for client-server communication
 * Rich model with validation, formatting, and business logic
 */

export interface DayAvailability {
  isAvailable: boolean;
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
  accessCode: string | null;
}

export class Instructor {
  /** Column schema: positional order of fields in the instructors spreadsheet */
  static readonly columns = [
    'id', 'email', 'lastName', 'firstName', 'phone', 'isDeactivated',
    'minimumGrade', 'maximumGrade',
    'instrument1', 'instrument2', 'instrument3', 'instrument4',
    'isAvailableMonday', 'mondayStartTime', 'mondayEndTime', 'mondayRoomId',
    'isAvailableTuesday', 'tuesdayStartTime', 'tuesdayEndTime', 'tuesdayRoomId',
    'isAvailableWednesday', 'wednesdayStartTime', 'wednesdayEndTime', 'wednesdayRoomId',
    'isAvailableThursday', 'thursdayStartTime', 'thursdayEndTime', 'thursdayRoomId',
    'isAvailableFriday', 'fridayStartTime', 'fridayEndTime', 'fridayRoomId',
    'accessCode', 'displayEmail', 'displayPhone',
  ] as const;

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
    this.id = data.id;
    this.email = data.email || null;
    this.lastName = data.lastName || null;
    this.firstName = data.firstName || null;
    this.phoneNumber = data.phoneNumber || null;
    this.accessCode = data.accessCode || null;
    this.displayEmail = data.displayEmail || null;
    this.displayPhone = data.displayPhone || null;
    this.specialties = data.specialties || null;
    this.isActive = data.isActive ?? false;
    this.role = data.role || null;
    this.availability = data.availability || null;
    this.gradeRange = data.gradeRange || null;
  }

  /**
   * Factory method for creating from database record (named fields, pre-mapped by DB client).
   * DB client mappings produce: isActive (boolean), specialties (string[]),
   * availability (InstructorAvailability), gradeRange (GradeRange).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDatabaseRow(record: Record<string, any>): Instructor { // SC-005: mappings produce nested objects
    return new Instructor({
      id: record.id,
      email: record.email,
      lastName: record.lastName,
      firstName: record.firstName,
      phoneNumber: record.phone,
      accessCode: record.accessCode,
      displayEmail: record.displayEmail,
      displayPhone: record.displayPhone,
      specialties: record.specialties,
      isActive: record.isActive,
      availability: record.availability,
      gradeRange: record.gradeRange,
      role: 'instructor',
    });
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
      accessCode: this.accessCode,
    };
  }
}
