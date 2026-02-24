import { BaseTab, SessionInfo } from '../core/baseTab.js';
import { AdminRegistrationForm } from '../workflows/adminRegistrationForm.js';
import { HttpService } from '../data/httpService.js';

interface RegistrationFormData extends Record<string, unknown> {
  instructors: Record<string, unknown>[];
  students: Record<string, unknown>[];
  classes: Record<string, unknown>[];
  registrations: Record<string, unknown>[];
}

// Re-type aliases matching AdminRegistrationForm's expected shapes
type InstructorLike = Record<string, unknown> & { id: string; firstName: string | null; lastName: string | null };
type StudentLike = Record<string, unknown> & { id: string };
type ClassLike = Record<string, unknown> & { id: string };
type TrimesterRegistration = Record<string, unknown> & { id: string; studentId: string };

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
  declare protected data: RegistrationFormData | null;
  private registrationForm: AdminRegistrationForm | null;
  private currentTrimester: string | null;

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
  async fetchData(sessionInfo: SessionInfo | null): Promise<RegistrationFormData> {
    // Get selected trimester from admin selector buttons
    const trimesterButtons = document.getElementById('admin-trimester-buttons');
    const activeButton = trimesterButtons?.querySelector<HTMLElement>('.trimester-btn.active');

    // During non-enrollment periods, trimester buttons are hidden, so use current period
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const trimester = activeButton?.dataset.trimester || currentPeriod?.trimester;

    if (!trimester) {
      throw new Error('Could not determine trimester: no button selected and no current period');
    }

    this.currentTrimester = trimester;

    const data = await HttpService.get(`admin/tabs/registration/${trimester}`, { signal: this.getAbortSignal() }) as RegistrationFormData;

    // Validate response
    if (!data.instructors || !data.students || !data.classes || !data.registrations) {
      throw new Error('Invalid response: missing required data');
    }

    return data;
  }

  /**
   * Render the registration form
   */
  async render(): Promise<void> {
    const container = this.getContainer();

    // If form already exists, update its data instead of recreating
    if (this.registrationForm) {
      // Update form data using setter methods
      const form = this.registrationForm as AdminRegistrationForm & {
        instructors: InstructorLike[];
        students: StudentLike[];
        classes: ClassLike[];
      };
      form.instructors = this.data!.instructors as InstructorLike[];
      form.students = this.data!.students as StudentLike[];
      form.classes = this.data!.classes as ClassLike[];
      this.registrationForm.setTrimester(this.currentTrimester ?? '');
      this.registrationForm.setTrimesterRegistrations(this.data!.registrations as TrimesterRegistration[]);
    } else {
      // Create new form instance
      this.registrationForm = new AdminRegistrationForm(
        this.data!.instructors as InstructorLike[],
        this.data!.students as StudentLike[],
        this.data!.classes as ClassLike[],
        async (registrationData) => {
          await this.#createRegistration(registrationData);
        }
      );

      // Set trimester context
      this.registrationForm.setTrimester(this.currentTrimester ?? '');
      this.registrationForm.setTrimesterRegistrations(this.data!.registrations as TrimesterRegistration[]);
    }
  }

  /**
   * Create a new registration
   * Delegates to viewModel for registration creation
   * @private
   */
  async #createRegistration(registrationData: unknown): Promise<void> {
    // Delegate to viewModel for registration creation
    if (
      window.viewModel &&
      typeof window.viewModel.createRegistrationWithEnrichment === 'function'
    ) {
      // Pass the tab's student/instructor data for proper enrichment
      await (window.viewModel.createRegistrationWithEnrichment as (
        data: Record<string, unknown>,
        context: { students: Record<string, unknown>[]; instructors: Record<string, unknown>[] }
      ) => Promise<void>)(registrationData as Record<string, unknown>, {
        students: this.data!.students,
        instructors: this.data!.instructors,
      });

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
  attachEventListeners(): void {
    const trimesterButtons = document.getElementById('admin-trimester-buttons');
    if (trimesterButtons) {
      this.addEventListener(trimesterButtons, 'click', async (event: Event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('.trimester-btn');
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
  async cleanup(): Promise<void> {
    // Keep form instance alive for performance
    // Form will be updated with new data on next load
  }
}
