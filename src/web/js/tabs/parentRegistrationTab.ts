import { BaseTab } from '../core/baseTab.js';
import { ParentRegistrationForm } from '../workflows/parentRegistrationForm.js';
import { HttpService } from '../data/httpService.js';

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
   * Makes 2 calls (current + next trimester) and assembles combined view
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

    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const appConfig = window.UserSession?.getAppConfig();

    if (!currentPeriod) {
      throw new Error('Period information not available');
    }

    const currentTrimester = appConfig?.currentTrimester || currentPeriod.trimester;
    const nextTrimester = appConfig?.nextTrimester || currentPeriod.trimester;
    const signal = this.getAbortSignal();

    // Fetch both trimesters in parallel
    const [currentData, nextData] = await Promise.all([
      HttpService.get(`parent/tabs/registration/${currentTrimester}?parentId=${parentId}`, { signal }),
      HttpService.get(`parent/tabs/registration/${nextTrimester}?parentId=${parentId}`, { signal }),
    ]);

    // Validate responses
    if (!currentData.instructors || !currentData.students || !currentData.classes || !currentData.registrations) {
      throw new Error('Invalid response: missing required data from current trimester');
    }
    if (!nextData.registrations) {
      throw new Error('Invalid response: missing required data from next trimester');
    }

    // Assemble combined view matching the shape the form expects
    return {
      instructors: currentData.instructors,
      students: currentData.students,
      classes: currentData.classes,
      nextTrimesterRegistrations: nextData.registrations,
      currentTrimesterRegistrations: currentData.registrations,
    };
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
    // Destroy the form instance to ensure clean state when tab is reloaded
    // This prevents Materialize component state issues when switching tabs
    if (this.registrationForm && typeof this.registrationForm.destroy === 'function') {
      this.registrationForm.destroy();
    }
    this.registrationForm = null;
  }
}
