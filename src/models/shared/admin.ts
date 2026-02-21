/**
 * Admin API model - for client-server communication
 * Rich model with validation, formatting, and business logic
 *
 * Database fields (persisted in Admins sheet):
 * - id, email, lastName, firstName, phoneNumber, accessCode
 * - role, displayEmail, displayPhone, isDirector
 */

export interface AdminData {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  phoneNumber?: string | null;
  accessCode?: string | null;
  role?: string | null;
  displayEmail?: string | null;
  displayPhone?: string | null;
  isDirector?: boolean;
  isActive?: boolean;
}

export interface AdminJSON {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  phone: string | null;
  fullName: string;
  displayName: string;
  displayEmail: string | null;
  displayPhone: string | null;
  accessCode: string | null;
  role: string | null;
  isDirector: boolean;
  isActive: boolean;
}

export class Admin {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  phoneNumber: string | null;
  accessCode: string | null;
  role: string | null;
  displayEmail: string | null;
  displayPhone: string | null;
  isDirector: boolean;
  isActive: boolean;

  /**
   * Creates an Admin API model instance
   */
  constructor(data: AdminData) {
    // Validate input
    if (!data || typeof data !== 'object') {
      throw new Error('Admin data object is required');
    }

    const {
      id,
      email,
      lastName,
      firstName,
      phoneNumber,
      accessCode,
      role,
      displayEmail,
      displayPhone,
      isDirector,
      isActive,
    } = data;

    // Required fields
    this.id = id;
    this.email = email;
    this.lastName = lastName;
    this.firstName = firstName;

    // Optional database fields
    this.phoneNumber = phoneNumber || null;
    this.accessCode = accessCode || null;
    this.role = role || null;
    this.displayEmail = displayEmail || null;
    this.displayPhone = displayPhone || null;
    this.isDirector = isDirector || false;

    this.isActive = isActive ?? false;
  }

  /**
   * Factory method for creating from database row data (positional parameters)
   */
  static fromDatabaseRow(row: string[]): Admin {
    const [
      id,
      email,
      lastName,
      firstName,
      phone,
      accessCode,
      role,
      displayEmail,
      displayPhone,
      isDirector,
    ] = row;

    return new Admin({
      id,
      email,
      lastName,
      firstName,
      phoneNumber: phone,
      accessCode,
      role,
      displayEmail,
      displayPhone,
      isDirector: isDirector === 'TRUE' || (isDirector as unknown) === true,
    });
  }

  /**
   * Factory method for creating from API/web data (object with properties)
   */
  static fromApiData(data: AdminData): Admin {
    return new Admin(data);
  }

  /**
   * Gets the admin's full name
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Gets formatted display name with role
   */
  get displayName(): string {
    return `${this.fullName} (Admin)`;
  }

  /**
   * Converts the admin to a plain object for API responses
   */
  toJSON(): AdminJSON {
    return {
      id: this.id,
      email: this.email,
      lastName: this.lastName,
      firstName: this.firstName,
      phone: this.phoneNumber,
      fullName: this.fullName,
      displayName: this.displayName,
      displayEmail: this.displayEmail,
      displayPhone: this.displayPhone,
      accessCode: this.accessCode,
      role: this.role,
      isDirector: this.isDirector,
      isActive: this.isActive,
    };
  }
}
