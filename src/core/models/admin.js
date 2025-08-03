/**
 * Admin data model - for database operations only
 * Simple data container with minimal logic
 */
export class Admin {
  /**
   * Creates an Admin data model instance
   * @param {string} id - Unique identifier
   * @param {string} email - Email address
   * @param {string} lastName - Last name
   * @param {string} firstName - First name
   * @param {string} phone - Phone number
   */
  constructor(id, email, lastName, firstName, phone) {
    this.id = id;
    this.email = email;
    this.lastName = lastName;
    this.firstName = firstName;
    this.phone = phone;
  }
}
