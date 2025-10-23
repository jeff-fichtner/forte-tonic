import { Admin, Instructor, Parent } from '../index.js';

/**
 * AuthenticatedUserResponse model - unified for both backend and frontend use
 */
export class AuthenticatedUserResponse {
  /**
   * Creates an AuthenticatedUserResponse instance
   * @param {object | string} data - Object with properties OR email as first positional parameter
   * @param {object} [admin] - Admin data (if using positional parameters)
   * @param {object} [instructor] - Instructor data (if using positional parameters)
   * @param {object} [parent] - Parent data (if using positional parameters)
   */
  constructor(data, admin, instructor, parent) {
    if (typeof data === 'object' && data !== null) {
      // Object destructuring constructor (web pattern)
      const { email, admin: adminData, instructor: instructorData, parent: parentData } = data;

      this.email = email;
      this.admin = adminData ? Admin.fromApiData(adminData) : null;
      this.instructor = instructorData ? Instructor.fromApiData(instructorData) : null;
      this.parent = parentData ? Parent.fromApiData(parentData) : null;
    } else {
      // Positional constructor (core pattern)
      this.email = data;
      this.admin = admin;
      this.instructor = instructor;
      this.parent = parent;
    }
  }

  /**
   * Checks if user is an admin
   * @returns {boolean} True if user is admin
   */
  isAdmin() {
    return !!this.admin;
  }

  /**
   * Checks if user is an instructor
   * @returns {boolean} True if user is instructor
   */
  isInstructor() {
    return !!this.instructor;
  }

  /**
   * Checks if user is a parent
   * @returns {boolean} True if user is parent
   */
  isParent() {
    return !!this.parent;
  }

  /**
   * Gets the user's display name
   * @returns {string} Display name
   */
  get displayName() {
    if (this.admin) return this.admin.fullName || this.admin.displayName;
    if (this.instructor) return this.instructor.fullName || this.instructor.displayName;
    if (this.parent) return this.parent.fullName || this.parent.displayName;
    return this.email;
  }

  /**
   * Gets the active user object (admin, instructor, or parent)
   * @returns {object | null} Active user object
   */
  get activeUser() {
    return this.admin || this.instructor || this.parent;
  }

  /**
   * Checks if user has a specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean} True if user has permission
   */
  hasPermission(permission) {
    if (this.admin && typeof this.admin.hasPermission === 'function') {
      return this.admin.hasPermission(permission);
    }

    // Default permissions based on role
    if (this.isAdmin()) return true;
    if (this.isInstructor() && permission.startsWith('instructor_')) return true;
    if (this.isParent() && permission.startsWith('parent_')) return true;

    return false;
  }

  /**
   * Validates if the response object has required fields
   * @returns {object} Validation result with isValid boolean and errors array
   */
  validate() {
    const errors = [];

    if (!this.email) errors.push('Email is required');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.email && !emailRegex.test(this.email)) {
      errors.push('Invalid email format');
    }

    // At least one role should be active
    if (!this.isAdmin() && !this.isInstructor() && !this.isParent()) {
      errors.push('User must have at least one role');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Converts the response to a plain object for API responses
   * @returns {object} Plain object representation
   */
  toJSON() {
    return {
      email: this.email,
      admin: this.admin ? this.admin.toJSON() : null,
      instructor: this.instructor ? this.instructor.toJSON() : null,
      parent: this.parent ? this.parent.toJSON() : null,
      displayName: this.displayName,
    };
  }
}

// Make AuthenticatedUserResponse available globally for backward compatibility
if (typeof window !== 'undefined') {
  window.AuthenticatedUserResponse = AuthenticatedUserResponse;
}
