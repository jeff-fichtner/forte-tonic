import { BaseTab } from '../core/baseTab.js';
import { ParentRegistrationForm } from '../workflows/parentRegistrationForm.js';

/**
 * ParentRegistrationTab - Registration form for parents
 *
 * Wraps the existing ParentRegistrationForm component with independent data fetching.
 * Shows hybrid interface with progressive filters and time slot grid for:
 * - Private lessons (instrument selection)
 * - Group classes (class selection)
 * - Recurring enrollment from previous trimester
 *
 * Data needed: instructors, students (parent's children), classes, registrations (next trimester),
 *              current trimester registrations (for recurring enrollment)
 * Data waste eliminated: ~1800+ records (other parents' students, unrelated registrations)
 */
export class ParentRegistrationTab extends BaseTab {
  constructor() {
    super('parent-registration');

    /** @private {ParentRegistrationForm|null} Registration form instance */
    this.registrationForm = null;
  }

  /**
   * Fetch registration form data for parent
   * Returns instructors, parent's children, classes, next trimester registrations,
   * current trimester registrations
   * @param {object} sessionInfo - User session
   * @returns {Promise<object>} Registration form data
   */
  async fetchData(sessionInfo) {
    const parentId = sessionInfo?.user?.parent?.id;
    if (!parentId) {
      throw new Error('No parent ID found in session');
    }

    const response = await fetch(`/api/parent/tabs/registration?parentId=${parentId}`, {
      signal: this.getAbortSignal(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Unwrap the data from { success: true, data: {...} } envelope
    const data = result.data || result;

    // Validate response
    if (
      !data.instructors ||
      !data.students ||
      !data.classes ||
      !data.nextTrimesterRegistrations ||
      !data.currentTrimesterRegistrations
    ) {
      throw new Error('Invalid response: missing required data');
    }

    return data;
  }

  /**
   * Render the registration form
   */
  async render() {
    const container = this.getContainer();

    // The ParentRegistrationForm expects to render into the container
    // If form already exists, update its data instead of recreating
    if (this.registrationForm) {
      // Update existing form with new data
      this.registrationForm.updateData(
        this.data.instructors,
        this.data.students,
        this.data.classes,
        this.data.nextTrimesterRegistrations,
        this.data.students, // parentChildren = all students for this parent
        this.data.currentTrimesterRegistrations // for recurring enrollment
      );
    } else {
      // Create new form instance
      this.registrationForm = new ParentRegistrationForm(
        this.data.instructors,
        this.data.students,
        this.data.classes,
        this.data.nextTrimesterRegistrations, // registrations for availability calculation
        async registrationData => {
          // Send data function - delegate to viewModel for registration creation
          await this.#createRegistration(registrationData);
        },
        this.data.students, // parentChildren = all students for this parent
        this.data.currentTrimesterRegistrations // for recurring enrollment options
      );
    }
  }

  /**
   * Create a registration via viewModel delegation
   * @private
   */
  async #createRegistration(registrationData) {
    // Delegate to viewModel for registration creation
    if (
      window.viewModel &&
      typeof window.viewModel.createRegistrationWithEnrichment === 'function'
    ) {
      // The viewModel expects the method to be called with 'this' context
      // Call it via viewModel to maintain proper context
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
   * Cleanup when tab is unloaded
   */
  async cleanup() {
    // Note: We keep the form instance alive for performance
    // It will be updated with new data when the tab is reloaded
    // Only set to null if we want to force recreation
  }
}
