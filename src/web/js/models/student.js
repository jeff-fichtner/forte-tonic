/**
 *
 */
export class Student {
  /**
   *
   */
  constructor({ id, lastName, firstName, grade, parentEmails }) {
    this.id = id;
    this.lastName = lastName;
    this.firstName = firstName;
    this.grade = grade;
    this.parentEmails = parentEmails;
  }

  /**
   *
   */
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
  /**
   *
   */
  get formattedGrade() {
    return this.grade.formatGrade();
  }
}

// For backwards compatibility with existing code
window.Student = Student;
