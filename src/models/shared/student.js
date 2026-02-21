/**
 * Student model - unified for both backend and frontend use
 *
 * Database fields (persisted in Students sheet):
 * - id, lastName, firstName, lastNickname, firstNickname, grade, parent1Id, parent2Id
 */

export class Student {
  constructor(data) {
    this.#validateConstructorData(data);

    this._firstName = data.firstName;
    this._lastName = data.lastName;
    this.firstNickname = data.firstNickname || null;
    this.lastNickname = data.lastNickname || null;
    this.id = data.id || data.studentId;
    this.email = data.email || null;
    this.grade = data.grade;
    this.parent1Id = data.parent1Id;
    this.parent2Id = data.parent2Id;
    this.parentEmails = data.parentEmails || '';
  }

  get firstName() {
    return this.firstNickname || this._firstName;
  }

  get lastName() {
    return this.lastNickname || this._lastName;
  }

  #validateConstructorData(data) {
    if (!data) {
      throw new Error('Student data is required');
    }

    const required = ['firstName', 'lastName'];
    const missing = required.filter(field => !data[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Get full name
   */
  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  toJSON() {
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
  static fromDatabaseRow(row) {
    const [id, lastName, firstName, lastNickname, firstNickname, grade, parent1Id, parent2Id] = row;

    return new Student({
      id,
      lastName,
      firstName,
      lastNickname,
      firstNickname,
      grade,
      parent1Id,
      parent2Id,
    });
  }
}
