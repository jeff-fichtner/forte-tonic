/**
 * Email Value Object
 * 
 * Immutable value object representing an email address with validation
 */

export class Email {
  constructor(value) {
    if (!Email.isValid(value)) {
      throw new Error(`Invalid email address: ${value}`);
    }
    this.value = value.toLowerCase().trim();
    Object.freeze(this);
  }

  static isValid(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  getDomain() {
    return this.value.split('@')[1];
  }

  getLocalPart() {
    return this.value.split('@')[0];
  }

  equals(other) {
    return other instanceof Email && this.value === other.value;
  }

  toString() {
    return this.value;
  }
}
