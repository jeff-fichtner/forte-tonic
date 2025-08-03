/**
 * Registration Type Value Object
 * 
 * Immutable value object representing the type of a registration
 */

export class RegistrationType {
  static GROUP = 'group';
  static PRIVATE = 'private';

  constructor(value) {
    if (!RegistrationType.isValid(value)) {
      throw new Error(`Invalid registration type: ${value}. Must be one of: ${RegistrationType.getAllValues().join(', ')}`);
    }
    this.value = value;
    Object.freeze(this);
  }

  static getAllValues() {
    return [RegistrationType.GROUP, RegistrationType.PRIVATE];
  }

  static isValid(value) {
    return RegistrationType.getAllValues().includes(value);
  }

  equals(other) {
    return other instanceof RegistrationType && this.value === other.value;
  }

  toString() {
    return this.value;
  }

  isGroup() {
    return this.value === RegistrationType.GROUP;
  }

  isPrivate() {
    return this.value === RegistrationType.PRIVATE;
  }
}
