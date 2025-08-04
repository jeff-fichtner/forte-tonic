/**
 * Age Value Object
 *
 * Immutable value object representing a person's age with validation
 */

export class Age {
  constructor(value) {
    if (!Age.isValid(value)) {
      throw new Error(`Invalid age: ${value}. Must be a number between 0 and 120`);
    }
    this.value = Number(value);
    Object.freeze(this);
  }

  static isValid(age) {
    const num = Number(age);
    return !isNaN(num) && num >= 0 && num <= 120;
  }

  isMinor() {
    return this.value < 18;
  }

  isAdult() {
    return this.value >= 18;
  }

  isSenior() {
    return this.value >= 65;
  }

  getCategory() {
    if (this.value < 6) return 'early-childhood';
    if (this.value < 12) return 'child';
    if (this.value < 18) return 'teenager';
    if (this.value < 65) return 'adult';
    return 'senior';
  }

  equals(other) {
    return other instanceof Age && this.value === other.value;
  }

  toString() {
    return this.value.toString();
  }
}
