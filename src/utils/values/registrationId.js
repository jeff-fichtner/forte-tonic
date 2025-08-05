/**
 * RegistrationId Value Object
 * ==========================
 * 
 * Handles UUID-based registration identifiers with validation
 */

import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export class RegistrationId {
  constructor(value) {
    if (value) {
      this.#validateId(value);
      this.value = value;
    } else {
      this.value = uuidv4(); // Generate new UUID if none provided
    }
  }

  #validateId(value) {
    if (typeof value !== 'string') {
      throw new Error('Registration ID must be a string');
    }

    // Check if it's a valid UUID
    if (!uuidValidate(value)) {
      throw new Error(`Invalid registration ID format: ${value}`);
    }
  }

  getValue() {
    return this.value;
  }

  equals(other) {
    if (!(other instanceof RegistrationId)) {
      return false;
    }
    return this.value === other.value;
  }

  toString() {
    return this.value;
  }

  /**
   * Create from string value
   */
  static fromString(value) {
    return new RegistrationId(value);
  }

  /**
   * Generate new UUID
   */
  static generate() {
    return new RegistrationId();
  }

  /**
   * Check if a string is a valid registration ID
   */
  static isValid(value) {
    try {
      new RegistrationId(value);
      return true;
    } catch {
      return false;
    }
  }
}
