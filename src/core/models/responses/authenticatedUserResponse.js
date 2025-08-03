/**
 *
 */
export class AuthenticatedUserResponse {
  /**
   *
   */
  constructor(email, isOperator, admin, instructor, parent) {
    this.email = email;
    this.isOperator = isOperator;
    this.admin = admin;
    this.instructor = instructor;
    this.parent = parent;
  }

  /**
   *
   */
  isAdmin() {
    return !!this.admin;
  }

  /**
   *
   */
  isInstructor() {
    return !!this.instructor;
  }

  /**
   *
   */
  isParent() {
    return !!this.parent;
  }
}
