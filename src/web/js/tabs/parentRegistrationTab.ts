import { BaseTab, SessionInfo, getParentId } from '../core/baseTab.js';
import {
  ParentRegistrationForm,
  InstructorLike,
  StudentLike,
  ClassLike,
  RegistrationLike,
  RegistrationSubmitData,
} from '../workflows/parentRegistrationForm.js';
import { HttpService } from '../data/httpService.js';
import type { HttpResult } from '../data/httpService.js';
import { validateResponseFields } from '../data/responseValidation.js';
import { resolveParentTrimesters } from '../utilities/trimesterHelpers.js';
import { RegistrationService } from '../data/registrationService.js';

interface RegistrationApiResponse {
  instructors: Record<string, unknown>[];
  students: Record<string, unknown>[];
  classes: Record<string, unknown>[];
  registrations: Record<string, unknown>[];
}

interface RegistrationTabData {
  instructors: Record<string, unknown>[];
  students: Record<string, unknown>[];
  classes: Record<string, unknown>[];
  nextTrimesterRegistrations: Record<string, unknown>[];
  currentTrimesterRegistrations: Record<string, unknown>[];
}

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
export class ParentRegistrationTab extends BaseTab<RegistrationTabData> {
  private registrationForm: ParentRegistrationForm | null;

  constructor() {
    super('parent-registration');

    this.registrationForm = null;
  }

  /**
   * Fetch registration form data for parent
   * Makes 1 call during registration period, 2 during enrollment (current + next trimester).
   * Returns instructors, parent's children, classes, next trimester registrations,
   * current trimester registrations
   */
  async fetchData(sessionInfo: SessionInfo | null): Promise<HttpResult<RegistrationTabData>> {
    const parentId = getParentId(sessionInfo);
    if (!parentId) {
      return { ok: false, error: { message: 'No parent ID found in session' } };
    }

    const ctx = resolveParentTrimesters();
    if (!ctx) {
      return { ok: false, error: { message: 'Period information not available' } };
    }

    const signal = this.getAbortSignal();

    const currentResult = await HttpService.get<RegistrationApiResponse>(
      `parent/tabs/registration/${ctx.currentTrimester}?parentId=${parentId}`, { signal }
    );
    if (!currentResult.ok) return currentResult;
    const currentValidated = validateResponseFields(currentResult, ['instructors', 'students', 'classes', 'registrations']);
    if (!currentValidated.ok) return currentValidated;
    const currentData = currentValidated.data;

    let nextTrimesterRegistrations: Record<string, unknown>[];

    if (ctx.nextTrimester) {
      const nextResult = await HttpService.get<RegistrationApiResponse>(
        `parent/tabs/registration/${ctx.nextTrimester}?parentId=${parentId}`, { signal }
      );
      if (!nextResult.ok) return nextResult;
      const nextValidated = validateResponseFields(nextResult, ['registrations']);
      if (!nextValidated.ok) return nextValidated;
      nextTrimesterRegistrations = nextValidated.data.registrations;
    } else {
      nextTrimesterRegistrations = currentData.registrations;
    }

    return {
      ok: true,
      data: {
        instructors: currentData.instructors,
        students: currentData.students,
        classes: currentData.classes,
        nextTrimesterRegistrations,
        currentTrimesterRegistrations: currentData.registrations,
      },
    };
  }

  /**
   * Render the registration form
   */
  async render(): Promise<void> {
    const container = this.getContainer();

    // The ParentRegistrationForm expects to render into the container
    // If form already exists, update its data instead of recreating
    if (this.registrationForm) {
      // Update existing form with new data
      this.registrationForm.updateData(
        this.data!.instructors as unknown as InstructorLike[],
        this.data!.students as unknown as StudentLike[],
        this.data!.classes as unknown as ClassLike[],
        this.data!.nextTrimesterRegistrations as unknown as RegistrationLike[],
        this.data!.students as unknown as StudentLike[], // parentChildren = all students for this parent
        this.data!.currentTrimesterRegistrations as unknown as RegistrationLike[] // for recurring enrollment
      );
    } else {
      // Create new form instance
      this.registrationForm = new ParentRegistrationForm(
        this.data!.instructors as unknown as InstructorLike[],
        this.data!.students as unknown as StudentLike[],
        this.data!.classes as unknown as ClassLike[],
        this.data!.nextTrimesterRegistrations as unknown as RegistrationLike[], // registrations for availability calculation
        async (registrationData: RegistrationSubmitData) => {
          // Send data function - delegate to viewModel for registration creation
          await this.#createRegistration(registrationData);
        },
        this.data!.students as unknown as StudentLike[], // parentChildren = all students for this parent
        this.data!.currentTrimesterRegistrations as unknown as RegistrationLike[] // for recurring enrollment options
      );
    }
  }

  /**
   * Create a registration via RegistrationService
   * @private
   */
  async #createRegistration(registrationData: RegistrationSubmitData): Promise<void> {
    const result = await RegistrationService.create(registrationData, {}, { isAdmin: false });
    if (result.ok) {
      await this.reload();
    }
  }

  /**
   * Cleanup when tab is unloaded
   */
  async cleanup(): Promise<void> {
    // Destroy the form instance to ensure clean state when tab is reloaded
    // This prevents Materialize component state issues when switching tabs
    if (this.registrationForm && typeof this.registrationForm.destroy === 'function') {
      this.registrationForm.destroy();
    }
    this.registrationForm = null;
  }
}
