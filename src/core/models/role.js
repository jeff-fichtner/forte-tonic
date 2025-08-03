/**
 *
 */
export class Role {
  /**
   *
   */
  constructor(email, role, admin, instructor, parent) {
    this.email = email;
    this.role = role;
    this.admin = admin;
    this.instructor = instructor;
    this.parent = parent;
  }

  /**
   *
   */
  isAdmin() {
    return this.admin;
  }

  /**
   *
   */
  isInstructor() {
    return this.instructor && !this.isAdmin();
  }

  /**
   *
   */
  isParent() {
    return this.parent && !this.isInstructor() && !this.isAdmin();
  }
}
