/**
 * Instructor Selector Component
 * Handles instructor selection with formatting
 */

import { Select } from '../select.js';
import { RegistrationFormText } from '../../constants/registrationFormConstants.js';
import type { InstructorLike } from '../../types/registrationTypes.js';

interface SelectOption {
  value: string;
  label: string;
}

type InstructorChangeCallback = (selectedInstructor: InstructorLike | undefined) => void;

export class InstructorSelector {
  selectId: string;
  instructors: InstructorLike[];
  onChangeCallback: InstructorChangeCallback | null;
  select: Select;

  /**
   * Create an instructor selector
   * @param {string} selectId - ID of the select element
   * @param {Array} instructors - Array of instructor objects
   * @param {Function} onChangeCallback - Callback when instructor changes
   */
  constructor(selectId: string, instructors: InstructorLike[] = [], onChangeCallback: InstructorChangeCallback | null = null) {
    this.selectId = selectId;
    this.instructors = instructors;
    this.onChangeCallback = onChangeCallback;

    // Build instructor options
    const options = this.#buildInstructorOptions(instructors);

    // Create the select component
    this.select = new Select(
      selectId,
      RegistrationFormText.INSTRUCTOR_PLACEHOLDER,
      RegistrationFormText.INSTRUCTOR_EMPTY,
      options,
      (event: Event) => this.#handleChange(event)
    );
  }

  /**
   * Build instructor options from instructor array
   * @private
   */
  #buildInstructorOptions(instructors: InstructorLike[]): SelectOption[] {
    return instructors.map(instructor => ({
      value: instructor.id,
      label: `${instructor.firstName} ${instructor.lastName}`,
    }));
  }

  /**
   * Handle instructor change
   * @private
   */
  #handleChange(event: Event): void {
    event.preventDefault();
    const selectedValue = (event.target as HTMLSelectElement).value;
    const selectedInstructor = this.instructors.find(x => x.id === selectedValue);

    // Trigger callback if provided
    if (this.onChangeCallback && typeof this.onChangeCallback === 'function') {
      this.onChangeCallback(selectedInstructor);
    }
  }

  /**
   * Get the selected instructor ID
   * @returns {string} Selected instructor ID
   */
  getSelectedInstructorId(): string {
    return this.select.getSelectedOption();
  }

  /**
   * Get the selected instructor object
   * @returns {object | null} Selected instructor object or null
   */
  getSelectedInstructor(): InstructorLike | null {
    const selectedId = this.getSelectedInstructorId();
    return this.instructors.find(x => x.id === selectedId) || null;
  }

  /**
   * Set the selected instructor
   * @param {string} instructorId - Instructor ID to select
   */
  setSelectedInstructor(instructorId: string): void {
    this.select.setSelectedOption(instructorId);
  }

  /**
   * Clear the instructor selection
   */
  clear(): void {
    this.select.clearSelectedOption();
  }

  /**
   * Update the list of instructors
   * @param {Array} instructors - New array of instructor objects
   * @param {boolean} forceRefresh - Whether to force refresh and clear selection
   */
  updateInstructors(instructors: InstructorLike[], forceRefresh: boolean = false): void {
    this.instructors = instructors;
    const options = this.#buildInstructorOptions(instructors);
    this.select.populateOptions(options, forceRefresh);
  }

  /**
   * Filter instructors by a predicate function
   * @param {Function} predicateFn - Function that returns true for instructors to include
   */
  filterInstructors(predicateFn: (instructor: InstructorLike) => boolean): void {
    const filteredInstructors = this.instructors.filter(predicateFn);
    const options = this.#buildInstructorOptions(filteredInstructors);
    this.select.populateOptions(options, true);
  }
}
