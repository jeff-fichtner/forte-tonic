/**
 * Parent model - unified for both backend and frontend use
 *
 * Database fields (persisted in Parents sheet):
 * - id, email, lastName, firstName, phone, accessCode
 */
export class Parent {
  /**
   * Creates a Parent instance
   * @param {object} data - Parent data object
   */
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.lastName = data.lastName;
    this.firstName = data.firstName;
    this.phone = data.phone || null;
    this.accessCode = data.accessCode || null;
  }

  /**
   * Factory method for creating from database row data (positional parameters)
   * @param {Array} row - Database row array with positional data
   * @returns {Parent} Parent instance
   */
  static fromDatabaseRow(row) {
    const [id, email, lastName, firstName, phone, accessCode] = row;

    return new Parent({ id, email, lastName, firstName, phone, accessCode });
  }

  /**
   * Factory method for creating from API/web data (object with properties)
   * @param {object} data - API data object
   * @returns {Parent} Parent instance
   */
  static fromApiData(data) {
    return new Parent(data);
  }

  /**
   * Gets the parent's full name
   * @returns {string} Full name in "firstName lastName" format
   */
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Gets formatted display name
   * @returns {string} Display name with role indicator
   */
  get displayName() {
    return `${this.fullName} (Parent)`;
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
    };
  }
}
