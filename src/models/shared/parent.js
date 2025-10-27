/**
 * Parent model - unified for both backend and frontend use
 */
export class Parent {
  /**
   * Creates a Parent instance with required fields
   * @param {string} id - Parent ID
   * @param {string} email - Email address
   * @param {string} lastName - Last name
   * @param {string} firstName - First name
   * @param {object} [options={}] - Optional properties
   */
  constructor(id, email, lastName, firstName, options = {}) {
    // Required fields
    this.id = id;
    this.email = email;
    this.lastName = lastName;
    this.firstName = firstName;

    // Optional properties with defaults
    this.phone = options.phone || null;
    this.accessCode = options.accessCode || null;
    this.alternatePhone = options.alternatePhone || null;
    this.address = options.address || null;
    this.isEmergencyContact = options.isEmergencyContact || false;
    this.relationship = options.relationship || 'parent';
    this.isActive = options.isActive !== false;
  }

  /**
   * Factory method for creating from database row data (positional parameters)
   * @param {Array} row - Database row array with positional data
   * @returns {Parent} Parent instance
   */
  static fromDatabaseRow(row) {
    const [id, email, lastName, firstName, phone, accessCode, address, isEmergencyContact] = row;

    return new Parent(id, email, lastName, firstName, {
      phone,
      accessCode,
      address,
      isEmergencyContact,
      alternatePhone: null,
      relationship: 'parent',
      isActive: true,
    });
  }

  /**
   * Factory method for creating from API/web data (object with properties)
   * @param {object} data - API data object
   * @returns {Parent} Parent instance
   */
  static fromApiData(data) {
    const {
      id,
      email,
      lastName,
      firstName,
      phone,
      alternatePhone,
      address,
      isEmergencyContact,
      relationship,
      isActive,
    } = data;

    return new Parent(id, email, lastName, firstName, {
      phone,
      alternatePhone,
      address,
      isEmergencyContact,
      relationship,
      isActive,
    });
  }

  /**
   * Factory method for creating new parents
   * @param {string} email - Email address
   * @param {string} lastName - Last name
   * @param {string} firstName - First name
   * @param {object} [options={}] - Additional options
   * @returns {Parent} New parent instance
   */
  static create(email, lastName, firstName, options = {}) {
    const id = options.id || `parent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return new Parent(id, email, lastName, firstName, {
      ...options,
      isActive: true,
    });
  }

  /**
   * Gets the parent's full name
   * @returns {string} Full name in "firstName lastName" format
   */
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Gets formatted display name with relationship
   * @returns {string} Display name with relationship indicator
   */
  get displayName() {
    const relationshipText = this.relationship === 'parent' ? 'Parent' : this.relationship;
    return `${this.fullName} (${relationshipText})`;
  }

  /**
   * Gets primary contact phone number
   * @returns {string} Primary phone number
   */
  get primaryPhone() {
    return this.phone || this.alternatePhone;
  }

  /**
   * Gets all available phone numbers
   * @returns {Array<string>} Array of phone numbers
   */
  get allPhones() {
    const phones = [];
    if (this.phone) phones.push(this.phone);
    if (this.alternatePhone && this.alternatePhone !== this.phone) {
      phones.push(this.alternatePhone);
    }
    return phones;
  }

  /**
   * Checks if parent has complete contact information
   * @returns {boolean} True if has email and phone
   */
  hasCompleteContact() {
    return !!(this.email && this.primaryPhone);
  }

  /**
   * Formats phone number for display
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} Formatted phone number
   */
  formatPhone(phoneNumber) {
    if (!phoneNumber) return '';

    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX for 10-digit numbers
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // Return original if not standard format
    return phoneNumber;
  }

  /**
   * Gets formatted primary phone
   * @returns {string} Formatted primary phone number
   */
  get formattedPrimaryPhone() {
    return this.formatPhone(this.primaryPhone);
  }

  /**
   * Checks if this parent can be used as emergency contact
   * @returns {boolean} True if suitable for emergency contact
   */
  canBeEmergencyContact() {
    return this.hasCompleteContact() && this.isActive;
  }

  /**
   * Gets contact summary for quick reference
   * @returns {string} Contact summary
   */
  get contactSummary() {
    const phone = this.formattedPrimaryPhone;
    return `${this.fullName} - ${this.email} - ${phone}`;
  }

  /**
   * Validates if the parent object has required fields
   * @returns {object} Validation result with isValid boolean and errors array
   */
  validate() {
    const errors = [];

    if (!this.firstName) errors.push('First name is required');
    if (!this.lastName) errors.push('Last name is required');
    if (!this.email) errors.push('Email is required');
    if (!this.phone) errors.push('Phone number is required');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.email && !emailRegex.test(this.email)) {
      errors.push('Invalid email format');
    }

    // Validate phone format (basic check)
    if (this.phone) {
      const phoneDigits = this.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        errors.push('Phone number must be at least 10 digits');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Converts the parent to a plain object for API responses
   * @returns {object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      lastName: this.lastName,
      firstName: this.firstName,
      fullName: this.fullName,
      displayName: this.displayName,
      phone: this.phone,
      alternatePhone: this.alternatePhone,
      primaryPhone: this.primaryPhone,
      formattedPrimaryPhone: this.formattedPrimaryPhone,
      allPhones: this.allPhones,
      address: this.address,
      isEmergencyContact: this.isEmergencyContact,
      relationship: this.relationship,
      isActive: this.isActive,
      hasCompleteContact: this.hasCompleteContact(),
      canBeEmergencyContact: this.canBeEmergencyContact(),
      contactSummary: this.contactSummary,
    };
  }
}
