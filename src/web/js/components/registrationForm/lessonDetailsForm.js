/**
 * Lesson Details Form Component
 * Handles day, time, length, and instrument selection for private lessons
 */

import { Select } from '../select.js';
import {
  RegistrationFormText,
  WeekDays,
  DefaultInstruments,
  DayNames,
} from '../../constants/registrationFormConstants.js';
import { generateTimeOptions } from '../../utilities/registrationForm/timeHelpers.js';

export class LessonDetailsForm {
  /**
   * Create a lesson details form
   * @param {Object} elementIds - Object with IDs for day, time, instrument selects and container
   * @param {Function} onDayChangeCallback - Callback when day changes
   * @param {Function} onTimeChangeCallback - Callback when time changes
   * @param {Function} onInstrumentChangeCallback - Callback when instrument changes
   */
  constructor(
    elementIds = {},
    onDayChangeCallback = null,
    onTimeChangeCallback = null,
    onInstrumentChangeCallback = null
  ) {
    this.daySelectId = elementIds.daySelectId || 'day-select';
    this.timeSelectId = elementIds.timeSelectId || 'start-time-select';
    this.instrumentSelectId = elementIds.instrumentSelectId || 'instrument-select';
    this.containerIdWhenDaySelected =
      elementIds.containerIdWhenDaySelected || 'instructor-day-selected-info-container';
    this.lessonLengthRadioName = elementIds.lessonLengthRadioName || 'lesson-length';

    this.onDayChangeCallback = onDayChangeCallback;
    this.onTimeChangeCallback = onTimeChangeCallback;
    this.onInstrumentChangeCallback = onInstrumentChangeCallback;

    this.#initialize();
  }

  /**
   * Initialize all sub-components
   * @private
   */
  #initialize() {
    // Initialize day selector
    this.daySelect = new Select(
      this.daySelectId,
      RegistrationFormText.DAY_PLACEHOLDER,
      RegistrationFormText.DAY_EMPTY,
      WeekDays,
      event => this.#handleDayChange(event)
    );

    // Initialize start time selector
    this.startTimeSelect = new Select(
      this.timeSelectId,
      RegistrationFormText.TIME_PLACEHOLDER,
      RegistrationFormText.TIME_EMPTY,
      generateTimeOptions(),
      event => this.#handleTimeChange(event)
    );

    // Initialize instrument selector
    this.instrumentSelect = new Select(
      this.instrumentSelectId,
      RegistrationFormText.INSTRUMENT_PLACEHOLDER,
      RegistrationFormText.INSTRUMENT_EMPTY,
      DefaultInstruments,
      event => this.#handleInstrumentChange(event)
    );
  }

  /**
   * Handle day change
   * @private
   */
  #handleDayChange(event) {
    console.log('Day selected:', event.target.value);
    const hasDay = !!event.target.value;

    // Show the lesson length and start time container when day is selected
    this.#showContainer(this.containerIdWhenDaySelected, hasDay);

    // Reset start time, lesson length, and instrument when day is cleared
    if (!hasDay) {
      // Reset lesson length radio buttons to default (30 minutes)
      const lengthRadios = document.querySelectorAll(`input[name="${this.lessonLengthRadioName}"]`);
      if (lengthRadios.length > 0) {
        lengthRadios[0].checked = true;
      }

      // Clear start time selection
      if (this.startTimeSelect) {
        this.startTimeSelect.clearSelectedOption();
      }

      // Clear instrument selection
      if (this.instrumentSelect) {
        this.instrumentSelect.clearSelectedOption();
      }
    }

    // Trigger callback if provided
    if (this.onDayChangeCallback && typeof this.onDayChangeCallback === 'function') {
      this.onDayChangeCallback(event.target.value, hasDay);
    }
  }

  /**
   * Handle time change
   * @private
   */
  #handleTimeChange(event) {
    console.log('Start time selected:', event.target.value);

    // Trigger callback if provided
    if (this.onTimeChangeCallback && typeof this.onTimeChangeCallback === 'function') {
      this.onTimeChangeCallback(event.target.value);
    }
  }

  /**
   * Handle instrument change
   * @private
   */
  #handleInstrumentChange(event) {
    console.log('Instrument selected:', event.target.value);

    // Trigger callback if provided
    if (this.onInstrumentChangeCallback && typeof this.onInstrumentChangeCallback === 'function') {
      this.onInstrumentChangeCallback(event.target.value);
    }
  }

  /**
   * Show or hide container
   * @private
   */
  #showContainer(containerId, shouldShow) {
    const container = document.getElementById(containerId);
    if (container) {
      container.hidden = !shouldShow;
    }
  }

  /**
   * Get selected day value (numeric string)
   * @returns {string} Day value
   */
  getSelectedDayValue() {
    return this.daySelect.getSelectedOption();
  }

  /**
   * Get selected day name
   * @returns {string} Day name (e.g., 'Monday')
   */
  getSelectedDayName() {
    const dayValue = this.getSelectedDayValue();
    return dayValue ? DayNames[parseInt(dayValue)] : null;
  }

  /**
   * Get selected start time
   * @returns {string} Start time in HH:MM format
   */
  getSelectedTime() {
    return this.startTimeSelect.getSelectedOption();
  }

  /**
   * Get selected instrument
   * @returns {string} Instrument name
   */
  getSelectedInstrument() {
    return this.instrumentSelect.getSelectedOption();
  }

  /**
   * Get selected lesson length from radio buttons
   * @returns {number} Lesson length in minutes
   */
  getSelectedLength() {
    const checkedRadio = document.querySelector(
      `input[name="${this.lessonLengthRadioName}"]:checked`
    );
    return checkedRadio ? parseInt(checkedRadio.value) : null;
  }

  /**
   * Update instrument options (e.g., based on selected instructor's specialties)
   * @param {Array<string>} instruments - Array of instrument names
   */
  updateInstrumentOptions(instruments) {
    let instrumentOptions;

    if (instruments && instruments.length > 0) {
      instrumentOptions = instruments.map(instrument => ({
        value: instrument,
        label: instrument,
      }));
    } else {
      // Fallback to default instruments
      instrumentOptions = DefaultInstruments;
    }

    this.instrumentSelect.populateOptions(instrumentOptions, true);

    console.log('Updated instrument options:', instruments);
  }

  /**
   * Clear all selections
   */
  clear() {
    this.daySelect.clearSelectedOption();
    this.startTimeSelect.clearSelectedOption();
    this.instrumentSelect.clearSelectedOption();

    // Reset lesson length to default
    const lengthRadios = document.querySelectorAll(`input[name="${this.lessonLengthRadioName}"]`);
    if (lengthRadios.length > 0) {
      lengthRadios[0].checked = true;
    }

    // Hide day-selected container
    this.#showContainer(this.containerIdWhenDaySelected, false);
  }
}
