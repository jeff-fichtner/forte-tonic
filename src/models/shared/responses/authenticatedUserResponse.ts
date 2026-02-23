import { Admin, Instructor, Parent } from '../index.js';
import type { AdminData } from '../admin.js';
import type { InstructorData } from '../instructor.js';
import type { ParentData } from '../parent.js';

export interface AuthenticatedUserResponseData {
  email: string;
  admin?: AdminData | null;
  instructor?: InstructorData | null;
  parent?: ParentData | null;
}

export interface AuthenticatedUserResponseJSON {
  email: string;
  admin: ReturnType<Admin['toJSON']> | null;
  instructor: ReturnType<Instructor['toJSON']> | null;
  parent: ReturnType<Parent['toJSON']> | null;
  displayName: string;
}

/**
 * AuthenticatedUserResponse model - unified for both backend and frontend use
 */
export class AuthenticatedUserResponse {
  email: string;
  admin: Admin | null;
  instructor: Instructor | null;
  parent: Parent | null;

  constructor(data: AuthenticatedUserResponseData) {
    const { email, admin: adminData, instructor: instructorData, parent: parentData } = data;

    this.email = email;
    this.admin = adminData ? new Admin(adminData) : null;
    this.instructor = instructorData ? new Instructor(instructorData) : null;
    this.parent = parentData ? new Parent(parentData) : null;
  }

  isAdmin(): boolean {
    return !!this.admin;
  }

  isInstructor(): boolean {
    return !!this.instructor;
  }

  isParent(): boolean {
    return !!this.parent;
  }

  get displayName(): string {
    if (this.admin) return this.admin.fullName || this.admin.displayName;
    if (this.instructor) return this.instructor.fullName || this.instructor.displayName;
    if (this.parent) return this.parent.fullName || this.parent.displayName;
    return this.email;
  }

  get activeUser(): Admin | Instructor | Parent | null {
    return this.admin || this.instructor || this.parent;
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

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

  toJSON(): AuthenticatedUserResponseJSON {
    return {
      email: this.email,
      admin: this.admin ? this.admin.toJSON() : null,
      instructor: this.instructor ? this.instructor.toJSON() : null,
      parent: this.parent ? this.parent.toJSON() : null,
      displayName: this.displayName,
    };
  }
}
