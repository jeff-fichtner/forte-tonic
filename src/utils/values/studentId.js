/**
 * Student ID Value Object
 *
 * Immutable value object representing a student identifier
 */

export class StudentId {
  constructor(value) {
    if (!StudentId.isValid(value)) {
      throw new Error(`Invalid student ID: ${value}. Must be a non-empty string or number`);
    }
    this.value = String(value);
    Object.freeze(this);
  }

  static isValid(value) {
    return value !== null && value !== undefined && String(value).trim().length > 0;
  }

  equals(other) {
    return other instanceof StudentId && this.value === other.value;
  }

  toString() {
    return this.value;
  }

  toNumber() {
    const num = Number(this.value);
    if (isNaN(num)) {
      throw new Error(`Student ID "${this.value}" cannot be converted to number`);
    }
    return num;
  }
}
