/**
 *
 */
export class Parent {
  /**
   *
   */
  constructor({ id, email, lastName, firstName, phone }) {
    this.id = id;
    this.email = email;
    this.lastName = lastName;
    this.firstName = firstName;
    this.phone = phone;
  }
  /**
   *
   */
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

// For backwards compatibility with existing code
window.Parent = Parent;
