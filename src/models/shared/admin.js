/**
 * Admin API model - for client-server communication
 * Rich model with validation, formatting, and business logic
 *
 * Database fields (persisted in Admins sheet):
 * - id, email, lastName, firstName, phoneNumber, accessCode
 *
 * Future properties (NOT in database):
 * - permissions, isActive, lastLoginDate, role
 *   These are placeholders for future RBAC system and always return defaults
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
   * @param {Array<string>} [data.permissions] - Permissions array
   * @param {boolean} [data.isActive=true] - Active status
   * @param {Date|string} [data.lastLoginDate] - Last login date
   * @param {string} [data.role='admin'] - User role
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
      permissions,
      isActive,
      lastLoginDate,
      role,
    } = data;

    // Required fields
    this.id = id;
    this.email = email;
    this.lastName = lastName;
    this.firstName = firstName;

    // Optional fields
    this.phoneNumber = phoneNumber || null;
    this.accessCode = accessCode || null;
    this.permissions = permissions || null;
    this.isActive = isActive;
    this.lastLoginDate = lastLoginDate
      ? lastLoginDate instanceof Date
        ? lastLoginDate
        : new Date(lastLoginDate)
      : null;
    this.role = role || null;
  }

  /**
   * Creates Admin from database model
   * @param {object} dbAdmin - Database admin model
   * @param {object} [additionalData] - Additional data to merge
   * @returns {Admin} API Admin model
   */
  static fromDatabase(dbAdmin, additionalData = {}) {
    return new Admin({
      id: dbAdmin.id,
      email: dbAdmin.email,
      lastName: dbAdmin.lastName,
      firstName: dbAdmin.firstName,
      phoneNumber: dbAdmin.phone, // Note: mapping from 'phone' to 'phoneNumber'
      ...additionalData,
    });
  }

  /**
   * Factory method for creating from database row data (positional parameters)
   * @param {Array} row - Database row array with positional data
   * @returns {Admin} Admin instance
   */
  static fromDatabaseRow(row) {
    const [id, email, lastName, firstName, phone, accessCode] = row;

    return new Admin({
      id,
      email,
      lastName,
      firstName,
      phoneNumber: phone,
      accessCode,
      permissions: [],
      isActive: true,
      lastLoginDate: null,
      role: 'admin',
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
   * Converts to database model format
   * @returns {object} Database-compatible object
   */
  toDatabaseModel() {
    return {
      id: this.id,
      email: this.email,
      lastName: this.lastName,
      firstName: this.firstName,
      phone: this.phoneNumber, // Note: mapping from 'phoneNumber' to 'phone'
      accessCode: this.accessCode,
    };
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
   * Checks if admin has a specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean} True if admin has the permission
   */
  hasPermission(permission) {
    return this.permissions.includes(permission);
  }

  /**
   * Checks if admin has any of the specified permissions
   * @param {Array<string>} permissions - Array of permissions to check
   * @returns {boolean} True if admin has at least one of the permissions
   */
  hasAnyPermission(permissions) {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Checks if admin has all of the specified permissions
   * @param {Array<string>} permissions - Array of permissions to check
   * @returns {boolean} True if admin has all permissions
   */
  hasAllPermissions(permissions) {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Gets days since last login
   * @returns {number|null} Number of days since last login, null if never logged in
   */
  get daysSinceLastLogin() {
    if (!this.lastLoginDate) return null;

    const today = new Date();
    const lastLogin = new Date(this.lastLoginDate);
    const diffTime = Math.abs(today - lastLogin);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Checks if admin is a super admin (has all permissions)
   * @returns {boolean} True if admin has super admin permissions
   */
  get isSuperAdmin() {
    const superAdminPermissions = ['user_management', 'system_settings', 'data_export', 'reports'];
    return this.hasAllPermissions(superAdminPermissions);
  }

  /**
   * Updates the last login date to now
   */
  updateLastLogin() {
    this.lastLoginDate = new Date();
  }

  /**
   * Validates if the admin object has required fields
   * @returns {object} Validation result with isValid boolean and errors array
   */
  validate() {
    const errors = [];

    if (!this.firstName) errors.push('First name is required');
    if (!this.lastName) errors.push('Last name is required');
    if (!this.email) errors.push('Email is required');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.email && !emailRegex.test(this.email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
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
      fullName: this.fullName,
      displayName: this.displayName,
      phoneNumber: this.phoneNumber,
      permissions: this.permissions,
      isActive: this.isActive,
      lastLoginDate: this.lastLoginDate,
      daysSinceLastLogin: this.daysSinceLastLogin,
      isSuperAdmin: this.isSuperAdmin,
      role: this.role,
    };
  }
}
