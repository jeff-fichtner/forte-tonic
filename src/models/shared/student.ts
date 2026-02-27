/**
 * Student model - unified for both backend and frontend use
 *
 * Database fields (persisted in Students sheet):
 * - id, lastName, firstName, lastNickname, firstNickname, grade, parent1Id, parent2Id
 */

export interface StudentData {
  id?: string;
  firstName: string;
  lastName: string;
  firstNickname?: string | null;
  lastNickname?: string | null;
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
  fullName: string;
}

export class Student {
  /** Column schema: positional order of fields in the students spreadsheet */
  static readonly columns = [
    'id', 'lastName', 'firstName', 'lastNickname', 'firstNickname',
    'grade', 'parent1Id', 'parent2Id',
  ] as const;

  givenFirstName: string;
  givenLastName: string;
  firstNickname: string | null;
  lastNickname: string | null;
  id: string;
  grade: string;
  parent1Id: string;
  parent2Id: string;
  parentEmails: string;

  constructor(data: StudentData) {
    this.givenFirstName = data.firstName;
    this.givenLastName = data.lastName;
    this.firstNickname = data.firstNickname || null;
    this.lastNickname = data.lastNickname || null;
    this.id = data.id || '';
    this.grade = data.grade || '';
    this.parent1Id = data.parent1Id || '';
    this.parent2Id = data.parent2Id || '';
    this.parentEmails = data.parentEmails || '';
  }

  get firstName(): string {
    return this.firstNickname || this.givenFirstName;
  }

  get lastName(): string {
    return this.lastNickname || this.givenLastName;
  }

  /**
   * Get full name (getter — consistent with Parent, Admin, Instructor)
   */
  get fullName(): string {
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
      fullName: this.fullName,
    };
  }

  /**
   * Factory method: Create from database row
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDatabaseRow(record: Record<string, any>): Student {
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
