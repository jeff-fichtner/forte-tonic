import { Admin, Instructor, Parent } from '../index.js';

/**
 * OperatorUserResponse model - represents an operator user context
 * Removes the isOperator flag as the presence of this object implies operator status
 */
export class OperatorUserResponse {
  /**
   * Creates an OperatorUserResponse instance
   * @param {object | string} data - Object with properties OR email as first positional parameter
   * @param {object} [admin] - Admin data (if using positional parameters)
   * @param {object} [instructor] - Instructor data (if using positional parameters)
   * @param {object} [parent] - Parent data (if using positional parameters)
   */
  constructor(data, admin, instructor, parent) {
    if (typeof data === 'object' && data !== null) {
      // Object destructuring constructor (web pattern)
      const {
        email,
        admin: adminData,
        instructor: instructorData,
        parent: parentData,
        roles = [],
      } = data;

      this.email = email;
      this.admin = adminData ? Admin.fromApiData(adminData) : null;
      this.instructor = instructorData ? Instructor.fromApiData(instructorData) : null;
      this.parent = parentData ? Parent.fromApiData(parentData) : null;
      this.roles = Array.isArray(roles) ? roles : [];
    } else {
      // Positional constructor (core pattern)
      this.email = data;
      this.admin = admin;
      this.instructor = instructor;
      this.parent = parent;
      this.roles = [];
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
   * Gets the user's primary role
   * @returns {string} The primary role (admin, instructor, or parent)
   */
  getPrimaryRole() {
    if (this.admin) return 'admin';
    if (this.instructor) return 'instructor';
    if (this.parent) return 'parent';
    return 'unknown';
  }

  /**
   * Gets the user's display name
   * @returns {string} The user's display name
   */
  getDisplayName() {
    if (this.admin) return `${this.admin.firstName} ${this.admin.lastName}`;
    if (this.instructor) return `${this.instructor.firstName} ${this.instructor.lastName}`;
    if (this.parent) return `${this.parent.firstName} ${this.parent.lastName}`;
    return this.email;
  }

  /**
   * Gets the user's full name
   * @returns {string} The user's full name
   */
  getFullName() {
    return this.getDisplayName();
  }

  /**
   * Serializes the operator user for API responses
   * @returns {object} Serialized operator user data
   */
  toJSON() {
    return {
      email: this.email,
      admin: this.admin,
      instructor: this.instructor,
      parent: this.parent,
      roles: this.roles,
      primaryRole: this.getPrimaryRole(),
      displayName: this.getDisplayName()
    };
  }

  /**
   * Creates an OperatorUserResponse from API data
   * @param {object} data - API response data
   * @returns {OperatorUserResponse} New instance
   */
  static fromApiData(data) {
    return new OperatorUserResponse(data);
  }

  /**
   * Creates an empty/guest operator user
   * @returns {OperatorUserResponse} Empty instance
   */
  static empty() {
    return new OperatorUserResponse('', null, null, null);
  }
}

// Make OperatorUserResponse available globally for backward compatibility
if (typeof window !== 'undefined') {
  window.OperatorUserResponse = OperatorUserResponse;
}
