/**
 * Instructor ID Value Object
 * 
 * Immutable value object representing an instructor identifier
 */

export class InstructorId {
  constructor(value) {
    if (!InstructorId.isValid(value)) {
      throw new Error(`Invalid instructor ID: ${value}. Must be a non-empty string or number`);
    }
    this.value = String(value);
    Object.freeze(this);
  }

  static isValid(value) {
    return value !== null && value !== undefined && String(value).trim().length > 0;
  }

  equals(other) {
    return other instanceof InstructorId && this.value === other.value;
  }

  toString() {
    return this.value;
  }

  toNumber() {
    const num = Number(this.value);
    if (isNaN(num)) {
      throw new Error(`Instructor ID "${this.value}" cannot be converted to number`);
    }
    return num;
  }
}
