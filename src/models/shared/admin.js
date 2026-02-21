/**
 * Admin API model - for client-server communication
 * Rich model with validation, formatting, and business logic
 *
 * Database fields (persisted in Admins sheet):
 * - id, email, lastName, firstName, phoneNumber, accessCode
 * - role, displayEmail, displayPhone, isDirector
 */
export class Admin {
  /**
   * Creates an Admin API model instance
   * @param {object} data - Admin data object
   * @param {string} data.id - Unique identifier
   * @param {string} data.email - Email address
   * @param {string} data.lastName - Last name
   * @param {string} data.firstName - First name
   * @param {string} [data.phoneNumber] - Phone number
   * @param {string} [data.accessCode] - Access code for authentication
   * @param {string} [data.role] - Job title/role
   * @param {string} [data.displayEmail] - Public-facing email
   * @param {string} [data.displayPhone] - Public-facing phone
   * @param {boolean} [data.isDirector=false] - Director flag
   * @param {boolean} [data.isActive=true] - Active status
   */
  constructor(data) {
    // Validate input
    if (!data || typeof data !== 'object') {
      throw new Error('Admin data object is required');
    }

    const {
      id,
      email,
      lastName,
      firstName,
      phoneNumber,
      accessCode,
      role,
      displayEmail,
      displayPhone,
      isDirector,
      isActive,
    } = data;

    // Required fields
    this.id = id;
    this.email = email;
    this.lastName = lastName;
    this.firstName = firstName;

    // Optional database fields
    this.phoneNumber = phoneNumber || null;
    this.accessCode = accessCode || null;
    this.role = role || null;
    this.displayEmail = displayEmail || null;
    this.displayPhone = displayPhone || null;
    this.isDirector = isDirector || false;

    this.isActive = isActive;
  }

  /**
   * Factory method for creating from database row data (positional parameters)
   * @param {Array} row - Database row array with positional data
   * @returns {Admin} Admin instance
   */
  static fromDatabaseRow(row) {
    const [
      id,
      email,
      lastName,
      firstName,
      phone,
      accessCode,
      role,
      displayEmail,
      displayPhone,
      isDirector,
    ] = row;

    return new Admin({
      id,
      email,
      lastName,
      firstName,
      phoneNumber: phone,
      accessCode,
      role,
      displayEmail,
      displayPhone,
      isDirector: isDirector === 'TRUE' || isDirector === true,
    });
  }

  /**
   * Factory method for creating from API/web data (object with properties)
   * @param {object} data - API data object
   * @returns {Admin} Admin instance
   */
  static fromApiData(data) {
    return new Admin(data);
  }

  /**
   * Gets the admin's full name
   * @returns {string} Full name in "firstName lastName" format
   */
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Gets formatted display name with role
   * @returns {string} Display name with role indicator
   */
  get displayName() {
    return `${this.fullName} (Admin)`;
  }

  /**
   * Converts the admin to a plain object for API responses
   * @returns {object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      lastName: this.lastName,
      firstName: this.firstName,
      phone: this.phoneNumber,
      fullName: this.fullName,
      displayName: this.displayName,
      displayEmail: this.displayEmail,
      displayPhone: this.displayPhone,
      accessCode: this.accessCode,
      role: this.role,
      isDirector: this.isDirector,
      isActive: this.isActive,
    };
  }
}
