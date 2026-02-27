import { BaseTab, SessionInfo } from '../core/baseTab.js';
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
import { RegistrationService } from '../data/registrationService.js';

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
export class ParentRegistrationTab extends BaseTab {
  private registrationForm: ParentRegistrationForm | null;

  constructor() {
    super('parent-registration');

    this.registrationForm = null;
  }

  /**
   * Fetch registration form data for parent
   * Makes 2 calls (current + next trimester) and assembles combined view
   * Returns instructors, parent's children, classes, next trimester registrations,
   * current trimester registrations
   */
  async fetchData(sessionInfo: { user: Record<string, unknown>; userType: string } | null): Promise<HttpResult<Record<string, unknown>>> {
    const parentObj = (sessionInfo?.user as Record<string, unknown> | undefined)?.parent as Record<string, unknown> | undefined;
    const parentId = parentObj?.id as string | undefined;
    if (!parentId) {
      return { ok: false, error: { message: 'No parent ID found in session' } };
    }

    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const appConfig = window.UserSession?.getAppConfig();

    if (!currentPeriod) {
      return { ok: false, error: { message: 'Period information not available' } };
    }

    const currentTrimester = appConfig?.currentTrimester || currentPeriod.trimester;
    const nextTrimester = appConfig?.nextTrimester || currentPeriod.trimester;
    const signal = this.getAbortSignal();

    const [currentResult, nextResult] = await Promise.all([
      HttpService.get<Record<string, unknown>>(`parent/tabs/registration/${currentTrimester}?parentId=${parentId}`, { signal }),
      HttpService.get<Record<string, unknown>>(`parent/tabs/registration/${nextTrimester}?parentId=${parentId}`, { signal }),
    ]);

    if (!currentResult.ok) return currentResult;
    if (!nextResult.ok) return nextResult;

    const currentData = currentResult.data;
    const nextData = nextResult.data;

    if (!currentData.instructors || !currentData.students || !currentData.classes || !currentData.registrations) {
      return { ok: false, error: { message: 'Invalid response: missing required data from current trimester' } };
    }
    if (!nextData.registrations) {
      return { ok: false, error: { message: 'Invalid response: missing required data from next trimester' } };
    }

    return {
      ok: true,
      data: {
        instructors: currentData.instructors,
        students: currentData.students,
        classes: currentData.classes,
        nextTrimesterRegistrations: nextData.registrations,
        currentTrimesterRegistrations: currentData.registrations,
      },
    };
  }

  /**
   * Render the registration form
   */
  async render(): Promise<void> {
    const container = this.getContainer();
    const typedData = this.data as unknown as RegistrationTabData;

    // The ParentRegistrationForm expects to render into the container
    // If form already exists, update its data instead of recreating
    if (this.registrationForm) {
      // Update existing form with new data
      this.registrationForm.updateData(
        typedData.instructors as unknown as InstructorLike[],
        typedData.students as unknown as StudentLike[],
        typedData.classes as unknown as ClassLike[],
        typedData.nextTrimesterRegistrations as unknown as RegistrationLike[],
        typedData.students as unknown as StudentLike[], // parentChildren = all students for this parent
        typedData.currentTrimesterRegistrations as unknown as RegistrationLike[] // for recurring enrollment
      );
    } else {
      // Create new form instance
      this.registrationForm = new ParentRegistrationForm(
        typedData.instructors as unknown as InstructorLike[],
        typedData.students as unknown as StudentLike[],
        typedData.classes as unknown as ClassLike[],
        typedData.nextTrimesterRegistrations as unknown as RegistrationLike[], // registrations for availability calculation
        async (registrationData: RegistrationSubmitData) => {
          // Send data function - delegate to viewModel for registration creation
          await this.#createRegistration(registrationData);
        },
        typedData.students as unknown as StudentLike[], // parentChildren = all students for this parent
        typedData.currentTrimesterRegistrations as unknown as RegistrationLike[] // for recurring enrollment options
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
