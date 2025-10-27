/**
 * Class Selector Component
 * Handles group class selection with formatted names
 */

import { Select } from '../select.js';
import { RegistrationFormText } from '../../constants/registrationFormConstants.js';
import { ClassManager } from '../../utilities/classManager.js';
import { formatClassNameWithGradeCorrection } from '../../utilities/classNameFormatter.js';
import { formatTime } from '../../extensions/numberExtensions.js';

export class ClassSelector {
  /**
   * Create a class selector
   * @param {string} selectId - ID of the select element
   * @param {Array} classes - Array of class objects
   * @param {Function} onChangeCallback - Callback when class changes
   */
  constructor(selectId, classes = [], onChangeCallback = null) {
    this.selectId = selectId;
    this.classes = classes;
    this.onChangeCallback = onChangeCallback;

    // Build class options
    const options = this.#buildClassOptions(classes);

    // Create the select component
    this.select = new Select(
      selectId,
      RegistrationFormText.CLASS_PLACEHOLDER,
      RegistrationFormText.CLASS_EMPTY,
      options,
      event => this.#handleChange(event)
    );
  }

  /**
   * Build class options from classes array
   * @private
   */
  #buildClassOptions(classes) {
    return classes.map(cls => ({
      value: cls.id,
      label: ClassManager.formatClassNameWithTime(
        cls,
        formatClassNameWithGradeCorrection,
        formatTime
      ),
    }));
  }

  /**
   * Handle class change
   * @private
   */
  #handleChange(event) {
    event.preventDefault();
    const selectedValue = event.target.value;
    const selectedClass = this.classes.find(x => x.id === selectedValue);

    console.log('Class changed to:', selectedValue);

    // Trigger callback if provided
    if (this.onChangeCallback && typeof this.onChangeCallback === 'function') {
      this.onChangeCallback(selectedClass);
    }
  }

  /**
   * Get the selected class ID
   * @returns {string} Selected class ID
   */
  getSelectedClassId() {
    return this.select.getSelectedOption();
  }

  /**
   * Get the selected class object
   * @returns {Object|null} Selected class object or null
   */
  getSelectedClass() {
    const selectedId = this.getSelectedClassId();
    return this.classes.find(x => x.id === selectedId) || null;
  }

  /**
   * Set the selected class
   * @param {string} classId - Class ID to select
   */
  setSelectedClass(classId) {
    this.select.setSelectedOption(classId);
  }

  /**
   * Clear the class selection
   */
  clear() {
    this.select.clearSelectedOption();
  }

  /**
   * Update the list of classes
   * @param {Array} classes - New array of class objects
   * @param {boolean} forceRefresh - Whether to force refresh and clear selection
   */
  updateClasses(classes, forceRefresh = false) {
    this.classes = classes;
    const options = this.#buildClassOptions(classes);
    this.select.populateOptions(options, forceRefresh);
  }

  /**
   * Filter classes by a predicate function
   * @param {Function} predicateFn - Function that returns true for classes to include
   */
  filterClasses(predicateFn) {
    const filteredClasses = this.classes.filter(predicateFn);
    const options = this.#buildClassOptions(filteredClasses);
    this.select.populateOptions(options, true);
  }
}
