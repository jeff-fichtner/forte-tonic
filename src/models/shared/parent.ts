/**
 * Parent model - unified for both backend and frontend use
 *
 * Database fields (persisted in Parents sheet):
 * - id, email, lastName, firstName, phone, accessCode
 */

export interface ParentData {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  phone?: string | null;
  accessCode?: string | null;
}

export interface ParentJSON {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  fullName: string;
  displayName: string;
  phone: string | null;
  accessCode: string | null;
}

export class Parent {
  /** Column schema: positional order of fields in the parents spreadsheet */
  static readonly columns = [
    'id', 'email', 'lastName', 'firstName', 'phone', 'accessCode',
  ] as const;

  id: string;
  email: string;
  lastName: string;
  firstName: string;
  phone: string | null;
  accessCode: string | null;

  /**
   * Creates a Parent instance
   */
  constructor(data: ParentData) {
    this.id = data.id;
    this.email = data.email;
    this.lastName = data.lastName;
    this.firstName = data.firstName;
    this.phone = data.phone || null;
    this.accessCode = data.accessCode || null;
  }

  /**
   * Factory method for creating from database row data (positional parameters)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDatabaseRow(record: Record<string, any>): Parent {
    return new Parent({
      id: record.id,
      email: record.email,
      lastName: record.lastName,
      firstName: record.firstName,
      phone: record.phone,
      accessCode: record.accessCode,
    });
  }

  /**
   * Gets the parent's full name
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Gets formatted display name
   */
  get displayName(): string {
    return `${this.fullName} (Parent)`;
  }

  /**
   * Converts the parent to a plain object for API responses
   */
  toJSON(): ParentJSON {
    return {
      id: this.id,
      email: this.email,
      lastName: this.lastName,
      firstName: this.firstName,
      fullName: this.fullName,
      displayName: this.displayName,
      phone: this.phone,
      accessCode: this.accessCode,
    };
  }
}
