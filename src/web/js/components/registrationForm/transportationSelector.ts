/**
 * Transportation Selector Component
 * Handles transportation type selection (radio buttons)
 */

import { TransportationType } from '../../constants/registrationFormConstants.js';

export class TransportationSelector {
  /**
   * Create a transportation selector
   * @param {string} radioGroupName - Name attribute of the radio button group
   * @param {Function} onChangeCallback - Callback when transportation type changes
   */
  constructor(radioGroupName = 'transportation-type', onChangeCallback = null) {
    this.radioGroupName = radioGroupName;
    this.onChangeCallback = onChangeCallback;

    // Get all radio buttons in this group
    this.radioButtons = document.querySelectorAll(`input[name="${radioGroupName}"]`);

    if (this.radioButtons.length === 0) {
      console.warn(`No transportation radio buttons found with name '${radioGroupName}'`);
    }

    // Attach change listeners
    this.#attachListeners();
  }

  /**
   * Attach change listeners to radio buttons
   * @private
   */
  #attachListeners() {
    this.radioButtons.forEach(radio => {
      radio.addEventListener('change', event => {
        if (event.target.checked) {
          const value = event.target.value;
          console.log('Transportation type changed to:', value);

          // Trigger callback if provided
          if (this.onChangeCallback && typeof this.onChangeCallback === 'function') {
            this.onChangeCallback(value);
          }
        }
      });
    });
  }

  /**
   * Get the selected transportation type
   * @returns {string|null} Selected transportation type value or null
   */
  getSelectedType() {
    const checkedRadio = document.querySelector(`input[name="${this.radioGroupName}"]:checked`);
    return checkedRadio ? checkedRadio.value : null;
  }

  /**
   * Set the selected transportation type
   * @param {string} value - Transportation type value to set
   */
  setSelectedType(value) {
    this.radioButtons.forEach(radio => {
      if (radio.value === value) {
        radio.checked = true;
      }
    });
  }

  /**
   * Clear the transportation selection (set to first option as default)
   */
  clear() {
    if (this.radioButtons.length > 0) {
      this.radioButtons[0].checked = true;
    }
  }

  /**
   * Check if Late Bus is selected
   * @returns {boolean} True if Late Bus is selected
   */
  isBusSelected() {
    const selected = this.getSelectedType();
    return selected === TransportationType.BUS || selected === 'bus';
  }

  /**
   * Disable all radio buttons
   */
  disable() {
    this.radioButtons.forEach(radio => {
      radio.disabled = true;
    });
  }

  /**
   * Enable all radio buttons
   */
  enable() {
    this.radioButtons.forEach(radio => {
      radio.disabled = false;
    });
  }
}
