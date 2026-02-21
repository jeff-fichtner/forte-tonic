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
}

export class Parent {
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
  static fromDatabaseRow(row: string[]): Parent {
    const [id, email, lastName, firstName, phone, accessCode] = row;

    return new Parent({ id, email, lastName, firstName, phone, accessCode });
  }

  /**
   * Factory method for creating from API/web data (object with properties)
   */
  static fromApiData(data: ParentData): Parent {
    return new Parent(data);
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
    };
  }
}
