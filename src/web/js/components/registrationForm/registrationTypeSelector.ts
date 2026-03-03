/**
 * Registration Type Selector Component
 * Handles selection between Private and Group registration types
 */

import { Select } from '../select.js';
import { RegistrationFormText } from '../../constants/registrationFormConstants.js';
import { RegistrationType } from '/utils/values/registrationType.js';

interface SelectOption {
  value: string;
  label: string;
}

interface ContainerIds {
  privateContainerId?: string;
  groupContainerId?: string;
}

type RegistrationTypeChangeCallback = (selectedValue: string) => void;

export class RegistrationTypeSelector {
  selectId: string;
  privateContainerId: string;
  groupContainerId: string;
  onChangeCallback: RegistrationTypeChangeCallback | null;
  select: Select;

  /**
   * Create a registration type selector
   * @param {string} selectId - ID of the select element
   * @param {object} containerIds - Object with privateContainerId and groupContainerId
   * @param {Function} onChangeCallback - Callback when registration type changes
   */
  constructor(
    selectId: string,
    containerIds: ContainerIds = {},
    onChangeCallback: RegistrationTypeChangeCallback | null = null
  ) {
    this.selectId = selectId;
    this.privateContainerId = containerIds.privateContainerId || 'private-registration-container';
    this.groupContainerId = containerIds.groupContainerId || 'group-registration-container';
    this.onChangeCallback = onChangeCallback;

    // Initially hide both containers
    this.#showContainer(this.privateContainerId, false);
    this.#showContainer(this.groupContainerId, false);

    // Build registration type options
    const options: SelectOption[] = (
      Object.keys(RegistrationType) as Array<keyof typeof RegistrationType>
    ).map(key => ({
      value: RegistrationType[key],
      label: RegistrationType[key].capitalize(),
    }));

    // Create the select component
    this.select = new Select(
      selectId,
      RegistrationFormText.REG_TYPE_PLACEHOLDER,
      RegistrationFormText.REG_TYPE_EMPTY,
      options,
      (event: Event) => this.#handleChange(event)
    );
  }

  /**
   * Handle registration type change
   * @private
   */
  #handleChange(event: Event): void {
    event.preventDefault();
    const selectedValue = (event.target as HTMLSelectElement).value;

    // Show/hide appropriate containers
    this.#showContainer(this.privateContainerId, selectedValue === RegistrationType.PRIVATE);
    this.#showContainer(this.groupContainerId, selectedValue === RegistrationType.GROUP);

    // Trigger callback if provided
    if (this.onChangeCallback && typeof this.onChangeCallback === 'function') {
      this.onChangeCallback(selectedValue);
    }
  }

  /**
   * Show or hide a container
   * @private
   */
  #showContainer(containerId: string, shouldShow: boolean): void {
    const container = document.getElementById(containerId);
    if (container) {
      container.hidden = !shouldShow;
    }
  }

  /**
   * Get the selected registration type
   * @returns {string} Selected registration type value
   */
  getSelectedType(): string {
    return this.select.getSelectedOption();
  }

  /**
   * Set the registration type
   * @param {string} value - Registration type value to set
   */
  setSelectedType(value: string): void {
    this.select.setSelectedOption(value);
    this.#showContainer(this.privateContainerId, value === RegistrationType.PRIVATE);
    this.#showContainer(this.groupContainerId, value === RegistrationType.GROUP);
  }

  /**
   * Clear the registration type selection
   */
  clear(): void {
    this.select.clearSelectedOption();
    this.#showContainer(this.privateContainerId, false);
    this.#showContainer(this.groupContainerId, false);
  }
}
