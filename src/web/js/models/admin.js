/**
 * Represents an Admin user in the system.
 * @class
 */
export class Admin {
  /**
   * Create an Admin instance.
   * @param {object} params - The admin parameters.
   * @param {string} params.id - The unique identifier for the admin.
   * @param {string} params.email - The admin's email address.
   * @param {string} params.lastName - The admin's last name.
   * @param {string} params.firstName - The admin's first name.
   * @param {string} params.phone - The admin's phone number.
   */
  constructor({ id, email, lastName, firstName, phone }) {
    this.id = id;
    this.email = email;
    this.lastName = lastName;
    this.firstName = firstName;
    this.phone = phone;
  }

  /**
   * Get the admin's full name.
   * @returns {string} The admin's full name (first name + last name).
   */
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

// For backwards compatibility with existing code
window.Admin = Admin;
