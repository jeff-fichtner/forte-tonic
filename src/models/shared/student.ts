/**
 * Student model - unified for both backend and frontend use
 *
 * Database fields (persisted in Students sheet):
 * - id, lastName, firstName, lastNickname, firstNickname, grade, parent1Id, parent2Id
 */

export interface StudentData {
  id?: string;
  studentId?: string;
  firstName: string;
  lastName: string;
  firstNickname?: string | null;
  lastNickname?: string | null;
  email?: string | null;
  grade?: string;
  parent1Id?: string;
  parent2Id?: string;
  parentEmails?: string;
}

export interface StudentJSON {
  id: string;
  firstName: string;
  lastName: string;
  firstNickname: string | null;
  lastNickname: string | null;
  grade: string;
  parent1Id: string;
  parent2Id: string;
  parentEmails: string;
  email: string | null;
  fullName: string;
}

export class Student {
  /** Column schema: positional order of fields in the students spreadsheet */
  static readonly columns = [
    'id', 'lastName', 'firstName', 'lastNickname', 'firstNickname',
    'grade', 'parent1Id', 'parent2Id',
  ] as const;

  _firstName: string;
  _lastName: string;
  firstNickname: string | null;
  lastNickname: string | null;
  id: string;
  email: string | null;
  grade: string;
  parent1Id: string;
  parent2Id: string;
  parentEmails: string;

  constructor(data: StudentData) {
    this.#validateConstructorData(data);

    this._firstName = data.firstName;
    this._lastName = data.lastName;
    this.firstNickname = data.firstNickname || null;
    this.lastNickname = data.lastNickname || null;
    this.id = data.id || data.studentId || '';
    this.email = data.email || null;
    this.grade = data.grade || '';
    this.parent1Id = data.parent1Id || '';
    this.parent2Id = data.parent2Id || '';
    this.parentEmails = data.parentEmails || '';
  }

  get firstName(): string {
    return this.firstNickname || this._firstName;
  }

  get lastName(): string {
    return this.lastNickname || this._lastName;
  }

  #validateConstructorData(data: StudentData): void {
    if (!data) {
      throw new Error('Student data is required');
    }

    const required: (keyof StudentData)[] = ['firstName', 'lastName'];
    const missing = required.filter(field => !data[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Get full name
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  toJSON(): StudentJSON {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      firstNickname: this.firstNickname,
      lastNickname: this.lastNickname,
      grade: this.grade,
      parent1Id: this.parent1Id,
      parent2Id: this.parent2Id,
      parentEmails: this.parentEmails,
      email: this.email,
      fullName: this.getFullName(),
    };
  }

  /**
   * Factory method: Create from database row
   */
  static fromDatabaseRow(record: Record<string, string>): Student {
    return new Student({
      id: record.id,
      lastName: record.lastName,
      firstName: record.firstName,
      lastNickname: record.lastNickname,
      firstNickname: record.firstNickname,
      grade: record.grade,
      parent1Id: record.parent1Id,
      parent2Id: record.parent2Id,
    });
  }
}
