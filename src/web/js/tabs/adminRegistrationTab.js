import { BaseTab } from '../core/baseTab.js';
import { AdminRegistrationForm } from '../workflows/adminRegistrationForm.js';

/**
 * AdminRegistrationTab - Registration form for admins
 *
 * Thin wrapper around existing AdminRegistrationForm component.
 * Fetches all data needed for admin registration workflows (no scoping restrictions).
 *
 * Data needed: all instructors, all students, classes for selected trimester, registrations for selected trimester
 * Data waste: None - admins need full dataset for registration management
 */
export class AdminRegistrationTab extends BaseTab {
  constructor() {
    super('admin-registration');

    /** @private {AdminRegistrationForm} Form instance */
    this.registrationForm = null;

    /** @private {string} Current trimester selector value */
    this.currentTrimester = null;
  }

  /**
   * Fetch registration form data for admins
   * Returns all instructors, students, classes, and registrations for selected trimester
   * @param {object} sessionInfo - User session
   * @returns {Promise<object>} Registration form data
   */
  async fetchData(sessionInfo) {
    // Get selected trimester from admin selector buttons
    const trimesterButtons = document.getElementById('admin-trimester-buttons');
    const activeButton = trimesterButtons?.querySelector('.trimester-btn.active');
    const trimester = activeButton?.dataset.trimester || sessionInfo?.currentTrimester || 'fall';
    this.currentTrimester = trimester;

    const response = await fetch(`/api/admin/tabs/registration?trimester=${trimester}`, {
      signal: this.getAbortSignal(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Unwrap the data from { success: true, data: {...} } envelope
    const data = result.data || result;

    // Validate response
    if (!data.instructors || !data.students || !data.classes || !data.registrations) {
      throw new Error('Invalid response: missing required data');
    }

    return data;
  }

  /**
   * Render the registration form
   */
  async render() {
    const container = this.getContainer();

    // If form already exists, update its data instead of recreating
    if (this.registrationForm) {
      // Update form data using setter methods
      this.registrationForm.instructors = this.data.instructors;
      this.registrationForm.students = this.data.students;
      this.registrationForm.classes = this.data.classes;
      this.registrationForm.setTrimester(this.currentTrimester);
      this.registrationForm.setTrimesterRegistrations(this.data.registrations);
    } else {
      // Create new form instance
      this.registrationForm = new AdminRegistrationForm(
        this.data.instructors,
        this.data.students,
        this.data.classes,
        async registrationData => {
          await this.#createRegistration(registrationData);
        }
      );

      // Set trimester context
      this.registrationForm.setTrimester(this.currentTrimester);
      this.registrationForm.setTrimesterRegistrations(this.data.registrations);
    }
  }

  /**
   * Create a new registration
   * Delegates to viewModel for registration creation
   * @private
   */
  async #createRegistration(registrationData) {
    // Delegate to viewModel for registration creation
    if (
      window.viewModel &&
      typeof window.viewModel.createRegistrationWithEnrichment === 'function'
    ) {
      await window.viewModel.createRegistrationWithEnrichment(registrationData);

      // Reload the tab to show updated data
      await this.reload();
    } else {
      console.error('Registration creation method not available');
      if (typeof M !== 'undefined') {
        M.toast({ html: 'Unable to create registration. Please refresh and try again.' });
      }
    }
  }

  /**
   * Attach event listeners for trimester selector
   */
  attachEventListeners() {
    const trimesterButtons = document.getElementById('admin-trimester-buttons');
    if (trimesterButtons) {
      this.addEventListener(trimesterButtons, 'click', async event => {
        const button = event.target.closest('.trimester-btn');
        if (button) {
          // Update active button state
          trimesterButtons.querySelectorAll('.trimester-btn').forEach(btn => {
            btn.classList.remove('active');
          });
          button.classList.add('active');

          // Reload tab with new trimester
          await this.reload();
        }
      });
    }
  }

  /**
   * Cleanup when tab is unloaded
   */
  async cleanup() {
    // Keep form instance alive for performance
    // Form will be updated with new data on next load
  }
}
