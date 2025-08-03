import { Admin } from '../admin.js';
import { Instructor } from '../instructor.js';
import { Parent } from '../parent.js';

/**
 *
 */
export class AuthenticatedUserResponse {
  /**
   *
   */
  constructor({ email, isOperator, admin, instructor, parent }) {
    this.email = email;
    this.isOperator = isOperator;
    this.admin = admin ? new Admin(admin) : null;
    this.instructor = instructor ? new Instructor(instructor) : null;
    this.parent = parent ? new Parent(parent) : null;
  }
  /**
   *
   */
  get shouldShowAsOperator() {
    return this.isOperator && !this.admin && !this.instructor && !this.parent;
  }
}

// For backwards compatibility with existing code
window.AuthenticatedUserResponse = AuthenticatedUserResponse;
