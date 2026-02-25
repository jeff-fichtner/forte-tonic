/**
 * Lesson Details Form Component
 * Handles day, time, length, and instrument selection for private lessons
 */

import { Select } from '../select.js';
import {
  RegistrationFormText,
  WeekDays,
  DayNames,
} from '../../constants/registrationFormConstants.js';
import { generateTimeOptions } from '../../utilities/registrationForm/timeHelpers.js';
import { getRegistrationConfig } from '../../utilities/registrationForm/registrationConfig.js';

interface SelectOption {
  value: string;
  label: string;
}

interface ElementIds {
  daySelectId?: string;
  timeSelectId?: string;
  instrumentSelectId?: string;
  containerIdWhenDaySelected?: string;
  lessonLengthRadioName?: string;
}

type DayChangeCallback = (dayValue: string, hasDay: boolean) => void;
type ValueChangeCallback = (value: string) => void;

export class LessonDetailsForm {
  daySelectId: string;
  timeSelectId: string;
  instrumentSelectId: string;
  containerIdWhenDaySelected: string;
  lessonLengthRadioName: string;
  onDayChangeCallback: DayChangeCallback | null;
  onTimeChangeCallback: ValueChangeCallback | null;
  onInstrumentChangeCallback: ValueChangeCallback | null;
  daySelect!: Select;
  startTimeSelect!: Select;
  instrumentSelect!: Select;

  /**
   * Create a lesson details form
   * @param {object} elementIds - Object with IDs for day, time, instrument selects and container
   * @param {Function} onDayChangeCallback - Callback when day changes
   * @param {Function} onTimeChangeCallback - Callback when time changes
   * @param {Function} onInstrumentChangeCallback - Callback when instrument changes
   */
  constructor(
    elementIds: ElementIds = {},
    onDayChangeCallback: DayChangeCallback | null = null,
    onTimeChangeCallback: ValueChangeCallback | null = null,
    onInstrumentChangeCallback: ValueChangeCallback | null = null
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
  #initialize(): void {
    // Initialize day selector
    this.daySelect = new Select(
      this.daySelectId,
      RegistrationFormText.DAY_PLACEHOLDER,
      RegistrationFormText.DAY_EMPTY,
      WeekDays,
      (event: Event) => this.#handleDayChange(event)
    );

    // Initialize start time selector
    this.startTimeSelect = new Select(
      this.timeSelectId,
      RegistrationFormText.TIME_PLACEHOLDER,
      RegistrationFormText.TIME_EMPTY,
      generateTimeOptions(),
      (event: Event) => this.#handleTimeChange(event)
    );

    // Initialize instrument selector
    this.instrumentSelect = new Select(
      this.instrumentSelectId,
      RegistrationFormText.INSTRUMENT_PLACEHOLDER,
      RegistrationFormText.INSTRUMENT_EMPTY,
      getRegistrationConfig().defaultInstruments.map(i => ({ value: i, label: i })),
      (event: Event) => this.#handleInstrumentChange(event)
    );
  }

  /**
   * Handle day change
   * @private
   */
  #handleDayChange(event: Event): void {
    const hasDay = !!(event.target as HTMLSelectElement).value;

    // Show the lesson length and start time container when day is selected
    this.#showContainer(this.containerIdWhenDaySelected, hasDay);

    // Reset start time, lesson length, and instrument when day is cleared
    if (!hasDay) {
      // Reset lesson length radio buttons to default (30 minutes)
      const lengthRadios = document.querySelectorAll<HTMLInputElement>(`input[name="${this.lessonLengthRadioName}"]`);
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
      this.onDayChangeCallback((event.target as HTMLSelectElement).value, hasDay);
    }
  }

  /**
   * Handle time change
   * @private
   */
  #handleTimeChange(event: Event): void {
    // Trigger callback if provided
    if (this.onTimeChangeCallback && typeof this.onTimeChangeCallback === 'function') {
      this.onTimeChangeCallback((event.target as HTMLSelectElement).value);
    }
  }

  /**
   * Handle instrument change
   * @private
   */
  #handleInstrumentChange(event: Event): void {
    // Trigger callback if provided
    if (this.onInstrumentChangeCallback && typeof this.onInstrumentChangeCallback === 'function') {
      this.onInstrumentChangeCallback((event.target as HTMLSelectElement).value);
    }
  }

  /**
   * Show or hide container
   * @private
   */
  #showContainer(containerId: string, shouldShow: boolean): void {
    const container = document.getElementById(containerId);
    if (container) {
      container.hidden = !shouldShow;
    }
  }

  /**
   * Get selected day value (numeric string)
   * @returns {string} Day value
   */
  getSelectedDayValue(): string {
    return this.daySelect.getSelectedOption();
  }

  /**
   * Get selected day name
   * @returns {string} Day name (e.g., 'Monday')
   */
  getSelectedDayName(): string | null {
    const dayValue = this.getSelectedDayValue();
    return dayValue ? DayNames[parseInt(dayValue)] : null;
  }

  /**
   * Get selected start time
   * @returns {string} Start time in HH:MM format
   */
  getSelectedTime(): string {
    return this.startTimeSelect.getSelectedOption();
  }

  /**
   * Get selected instrument
   * @returns {string} Instrument name
   */
  getSelectedInstrument(): string {
    return this.instrumentSelect.getSelectedOption();
  }

  /**
   * Get selected lesson length from radio buttons
   * @returns {number} Lesson length in minutes
   */
  getSelectedLength(): number | null {
    const checkedRadio = document.querySelector<HTMLInputElement>(
      `input[name="${this.lessonLengthRadioName}"]:checked`
    );
    return checkedRadio ? parseInt(checkedRadio.value) : null;
  }

  /**
   * Update instrument options (e.g., based on selected instructor's specialties)
   * @param {Array<string>} instruments - Array of instrument names
   */
  updateInstrumentOptions(instruments: string[]): void {
    let instrumentOptions: SelectOption[];

    if (instruments && instruments.length > 0) {
      instrumentOptions = instruments.map(instrument => ({
        value: instrument,
        label: instrument,
      }));
    } else {
      // Fallback to default instruments from config
      instrumentOptions = getRegistrationConfig().defaultInstruments.map(i => ({ value: i, label: i }));
    }

    this.instrumentSelect.populateOptions(instrumentOptions, true);
  }

  /**
   * Clear all selections
   */
  clear(): void {
    this.daySelect.clearSelectedOption();
    this.startTimeSelect.clearSelectedOption();
    this.instrumentSelect.clearSelectedOption();

    // Reset lesson length to default
    const lengthRadios = document.querySelectorAll<HTMLInputElement>(`input[name="${this.lessonLengthRadioName}"]`);
    if (lengthRadios.length > 0) {
      lengthRadios[0].checked = true;
    }

    // Hide day-selected container
    this.#showContainer(this.containerIdWhenDaySelected, false);
  }
}
