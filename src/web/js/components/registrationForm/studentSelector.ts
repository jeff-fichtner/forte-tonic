/**
 * Student Selector Component
 * Handles student autocomplete selection for registration forms
 */

import { RegistrationFormText } from '../../constants/registrationFormConstants.js';
import type { StudentLike } from '../../types/registrationTypes.js';

type StudentSelectCallback = (selectedStudent: StudentLike | undefined) => void;

export class StudentSelector {
  elementId: string;
  element: HTMLInputElement;
  onSelectCallback: StudentSelectCallback | null;
  selectedStudent: StudentLike | null;
  studentMap: Record<string, string>;
  students: StudentLike[];

  /**
   * Create a student selector
   * @param {string} elementId - ID of the autocomplete input element
   * @param {Array} students - Array of student objects
   * @param {Function} onSelectCallback - Callback when student is selected
   */
  constructor(
    elementId: string,
    students: StudentLike[] = [],
    onSelectCallback: StudentSelectCallback | null = null
  ) {
    this.elementId = elementId;
    this.element = document.getElementById(elementId) as HTMLInputElement;
    this.onSelectCallback = onSelectCallback;
    this.selectedStudent = null;
    this.studentMap = {};
    this.students = [];

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
  setStudents(students: StudentLike[]): void {
    this.students = students || [];

    if (!this.students.length) {
      this.studentMap = {};
      this.selectedStudent = null;
      M.Autocomplete.init(this.element, { data: {} });
      return;
    }

    // Build autocomplete data object
    const data: Record<string, null> = this.students.reduce(
      (acc: Record<string, null>, student: StudentLike) => {
        const fullName = student.getFullName
          ? student.getFullName()
          : `${student.firstName || ''} ${student.lastName || ''}`.trim();
        acc[fullName] = null; // Materialize autocomplete format
        return acc;
      },
      {}
    );

    // Build student ID mapping
    this.studentMap = this.students.reduce((acc: Record<string, string>, student: StudentLike) => {
      const fullName = student.getFullName
        ? student.getFullName()
        : `${student.firstName || ''} ${student.lastName || ''}`.trim();
      acc[fullName] = student.id;
      return acc;
    }, {});

    // Initialize Materialize autocomplete
    const options: MaterializeAutocompleteOptions = {
      data: data,
      limit: 20,
      onAutocomplete: (selectedOption: string) => {
        const studentId = this.studentMap[selectedOption];
        this.selectedStudent = this.students.find(x => x.id === studentId) || null;

        // Trigger callback if provided
        if (this.onSelectCallback && typeof this.onSelectCallback === 'function') {
          this.onSelectCallback(this.selectedStudent || undefined);
        }
      },
    };

    M.Autocomplete.init(this.element, options);
  }

  /**
   * Get the currently selected student
   * @returns {object | null} Selected student object or null
   */
  getSelectedStudent(): StudentLike | null {
    return this.selectedStudent;
  }

  /**
   * Get the selected student ID
   * @returns {string|null} Student ID or null
   */
  getSelectedStudentId(): string | null {
    if (!this.selectedStudent) return null;

    return this.selectedStudent.id;
  }

  /**
   * Set the current student (for external updates)
   * @param {object | null} student - Student object or null to clear
   */
  setSelectedStudent(student: StudentLike | null): void {
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
  clear(): void {
    this.setSelectedStudent(null);
  }

  /**
   * Disable the student selector
   */
  disable(): void {
    this.element.disabled = true;
  }

  /**
   * Enable the student selector
   */
  enable(): void {
    this.element.disabled = false;
  }
}
