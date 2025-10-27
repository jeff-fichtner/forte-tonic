/**
 * Student Selector Component
 * Handles student autocomplete selection for registration forms
 */

import { RegistrationFormText } from '../../constants/registrationFormConstants.js';

export class StudentSelector {
  /**
   * Create a student selector
   * @param {string} elementId - ID of the autocomplete input element
   * @param {Array} students - Array of student objects
   * @param {Function} onSelectCallback - Callback when student is selected
   */
  constructor(elementId, students = [], onSelectCallback = null) {
    this.elementId = elementId;
    this.element = document.getElementById(elementId);
    this.onSelectCallback = onSelectCallback;
    this.selectedStudent = null;
    this.studentMap = {};

    if (!this.element) {
      console.error(`Student autocomplete element with ID '${elementId}' not found in DOM`);
      throw new Error(`Student autocomplete element with ID '${elementId}' not found`);
    }

    this.setStudents(students);
  }

  /**
   * Set or update the list of students
   * @param {Array} students - Array of student objects
   */
  setStudents(students) {
    this.students = students || [];

    if (!this.students.length) {
      this.studentMap = {};
      this.selectedStudent = null;
      M.Autocomplete.init(this.element, { data: {} });
      return;
    }

    // Build autocomplete data object
    const data = this.students.reduce((acc, student) => {
      const fullName = student.getFullName
        ? student.getFullName()
        : `${student.firstName || ''} ${student.lastName || ''}`.trim();
      acc[fullName] = null; // Materialize autocomplete format
      return acc;
    }, {});

    // Build student ID mapping
    this.studentMap = this.students.reduce((acc, student) => {
      const fullName = student.getFullName
        ? student.getFullName()
        : `${student.firstName || ''} ${student.lastName || ''}`.trim();
      acc[fullName] = student.id;
      return acc;
    }, {});

    // Initialize Materialize autocomplete
    const options = {
      data: data,
      limit: 20,
      onAutocomplete: selectedOption => {
        const studentId = this.studentMap[selectedOption];
        this.selectedStudent = this.students.find(x => x.id === studentId);

        // Trigger callback if provided
        if (this.onSelectCallback && typeof this.onSelectCallback === 'function') {
          this.onSelectCallback(this.selectedStudent);
        }
      },
    };

    M.Autocomplete.init(this.element, options);
  }

  /**
   * Get the currently selected student
   * @returns {object | null} Selected student object or null
   */
  getSelectedStudent() {
    return this.selectedStudent;
  }

  /**
   * Get the selected student ID
   * @returns {string|null} Student ID or null
   */
  getSelectedStudentId() {
    if (!this.selectedStudent) return null;

    // Handle case where ID might be an object with a value property
    const id = this.selectedStudent.id;
    return typeof id === 'object' ? id.value : id;
  }

  /**
   * Set the current student (for external updates)
   * @param {object | null} student - Student object or null to clear
   */
  setSelectedStudent(student) {
    this.selectedStudent = student;
    this.element.value = student
      ? student.getFullName
        ? student.getFullName()
        : `${student.firstName || ''} ${student.lastName || ''}`.trim()
      : '';
  }

  /**
   * Clear the student selection
   */
  clear() {
    this.setSelectedStudent(null);
  }

  /**
   * Disable the student selector
   */
  disable() {
    this.element.disabled = true;
  }

  /**
   * Enable the student selector
   */
  enable() {
    this.element.disabled = false;
  }
}
