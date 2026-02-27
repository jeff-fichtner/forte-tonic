import { AdminBaseTab } from '../core/adminBaseTab.js';
import type { SessionInfo } from '../core/baseTab.js';
import { AdminRegistrationForm } from '../workflows/adminRegistrationForm.js';
import { HttpService } from '../data/httpService.js';
import type { HttpResult } from '../data/httpService.js';
import { RegistrationService } from '../data/registrationService.js';
import type { InstructorLike, StudentLike, ClassLike, RegistrationLike } from '../types/registrationTypes.js';

interface RegistrationFormData extends Record<string, unknown> {
  instructors: Record<string, unknown>[];
  students: Record<string, unknown>[];
  classes: Record<string, unknown>[];
  registrations: Record<string, unknown>[];
}

/**
 * AdminRegistrationTab - Registration form for admins
 *
 * Thin wrapper around existing AdminRegistrationForm component.
 * Fetches all data needed for admin registration workflows (no scoping restrictions).
 *
 * Data needed: all instructors, all students, classes for selected trimester, registrations for selected trimester
 * Data waste: None - admins need full dataset for registration management
 */
export class AdminRegistrationTab extends AdminBaseTab {
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
  async fetchData(_sessionInfo: SessionInfo | null): Promise<HttpResult<RegistrationFormData>> {
    const trimester = this.getTrimester();
    if (!trimester) {
      return { ok: false, error: { message: 'Could not determine trimester: no button selected and no current period' } };
    }

    this.currentTrimester = trimester;

    const result = await HttpService.get<RegistrationFormData>(`admin/tabs/registration/${trimester}`, { signal: this.getAbortSignal() });

    if (!result.ok) return result;

    if (!result.data.instructors || !result.data.students || !result.data.classes || !result.data.registrations) {
      return { ok: false, error: { message: 'Invalid response: missing required data' } };
    }

    return result;
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
      this.registrationForm.setTrimesterRegistrations(this.data!.registrations as RegistrationLike[]);
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
      this.registrationForm.setTrimesterRegistrations(this.data!.registrations as RegistrationLike[]);
    }
  }

  /**
   * Create a new registration via RegistrationService
   * @private
   */
  async #createRegistration(registrationData: unknown): Promise<void> {
    const result = await RegistrationService.create(
      registrationData as Record<string, unknown>,
      { students: this.data!.students, instructors: this.data!.instructors },
      { isAdmin: true }
    );
    if (result.ok) {
      await this.reload();
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
