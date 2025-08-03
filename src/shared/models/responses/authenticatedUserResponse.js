import { Admin, Instructor, Parent } from '../index.js';

/**
 * AuthenticatedUserResponse model - unified for both backend and frontend use
 */
export class AuthenticatedUserResponse {
    /**
     * Creates an AuthenticatedUserResponse instance
     * @param {Object|string} data - Object with properties OR email as first positional parameter
     * @param {boolean} [isOperator] - Operator status (if using positional parameters)
     * @param {Object} [admin] - Admin data (if using positional parameters)
     * @param {Object} [instructor] - Instructor data (if using positional parameters)
     * @param {Object} [parent] - Parent data (if using positional parameters)
     */
    constructor(data, isOperator, admin, instructor, parent) {
        if (typeof data === 'object' && data !== null) {
            // Object destructuring constructor (web pattern)
            const {
                email,
                isOperator: isOp,
                admin: adminData,
                instructor: instructorData,
                parent: parentData,
                roles = []
            } = data;

            this.email = email;
            this.isOperator = isOp;
            this.admin = adminData ? new Admin(adminData) : null;
            this.instructor = instructorData ? new Instructor(instructorData) : null;
            this.parent = parentData ? new Parent(parentData) : null;
            this.roles = Array.isArray(roles) ? roles : [];
        } else {
            // Positional constructor (core pattern)
            this.email = data;
            this.isOperator = isOperator;
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
     * Checks if user should be shown as operator
     * @returns {boolean} True if should show as operator
     */
    get shouldShowAsOperator() {
        return this.isOperator && !this.admin && !this.instructor && !this.parent;
    }

    /**
     * Gets the primary role of the user
     * @returns {string} Primary role
     */
    get primaryRole() {
        if (this.isAdmin()) return 'admin';
        if (this.isInstructor()) return 'instructor';
        if (this.isParent()) return 'parent';
        if (this.isOperator) return 'operator';
        return 'user';
    }

    /**
     * Gets all user roles
     * @returns {Array<string>} Array of user roles
     */
    get allRoles() {
        const roles = [];
        if (this.isAdmin()) roles.push('admin');
        if (this.isInstructor()) roles.push('instructor');
        if (this.isParent()) roles.push('parent');
        if (this.isOperator) roles.push('operator');
        return roles;
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
     * @returns {Object|null} Active user object
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
     * @returns {Object} Validation result with isValid boolean and errors array
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
        if (!this.isAdmin() && !this.isInstructor() && !this.isParent() && !this.isOperator) {
            errors.push('User must have at least one role');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Converts the response to a plain object for API responses
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            email: this.email,
            isOperator: this.isOperator,
            admin: this.admin ? this.admin.toJSON() : null,
            instructor: this.instructor ? this.instructor.toJSON() : null,
            parent: this.parent ? this.parent.toJSON() : null,
            roles: this.roles,
            primaryRole: this.primaryRole,
            allRoles: this.allRoles,
            displayName: this.displayName,
            shouldShowAsOperator: this.shouldShowAsOperator
        };
    }
}
