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
import { periodDisplayName } from '../utilities/periodDisplayName.js';
import { RegistrationService } from '../data/registrationService.js';
import type { AvailableTimeSlot } from '/models/shared/availableTimeSlot.js';

interface RegistrationApiResponse {
  instructors: InstructorLike[];
  students: StudentLike[];
  classes: ClassLike[];
  registrations: RegistrationLike[];
  availableTimeSlots: Record<string, AvailableTimeSlot[]>;
}

interface RegistrationTabData {
  instructors: InstructorLike[];
  students: StudentLike[];
  classes: ClassLike[];
  nextTrimesterRegistrations: RegistrationLike[];
  currentTrimesterRegistrations: RegistrationLike[];
  availableTimeSlots: Record<string, AvailableTimeSlot[]>;
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
      `parent/tabs/registration/${ctx.currentTrimester}?parentId=${parentId}`,
      { signal }
    );
    if (!currentResult.ok) return currentResult;
    const currentValidated = validateResponseFields(currentResult, [
      'instructors',
      'students',
      'classes',
      'registrations',
      'availableTimeSlots',
    ]);
    if (!currentValidated.ok) return currentValidated;
    const currentData = currentValidated.data;

    let nextTrimesterRegistrations: RegistrationLike[];
    // The student list shown in the registration form (whom to register for)
    // AND the precomputed availableTimeSlots map (keyed by student grade)
    // must BOTH reflect the target trimester. When the form targets next fall
    // (summer period), this is what makes the grade-bump + graduating-student
    // filter take effect — without this, the form would show the current
    // trimester's view and the slot lookup would key by stored grade instead
    // of bumped grade, returning no slots for a student whose bumped grade
    // doesn't match any current-stored grade in the parent's children.
    let targetTrimesterStudents = currentData.students;
    let targetTrimesterAvailableTimeSlots = currentData.availableTimeSlots;

    if (ctx.nextTrimester) {
      const nextResult = await HttpService.get<RegistrationApiResponse>(
        `parent/tabs/registration/${ctx.nextTrimester}?parentId=${parentId}`,
        { signal }
      );
      if (!nextResult.ok) return nextResult;
      const nextValidated = validateResponseFields(nextResult, [
        'registrations',
        'students',
        'availableTimeSlots',
      ]);
      if (!nextValidated.ok) return nextValidated;
      nextTrimesterRegistrations = nextValidated.data.registrations;
      targetTrimesterStudents = nextValidated.data.students;
      targetTrimesterAvailableTimeSlots = nextValidated.data.availableTimeSlots;
    } else {
      nextTrimesterRegistrations = currentData.registrations;
    }

    return {
      ok: true,
      data: {
        instructors: currentData.instructors,
        students: targetTrimesterStudents,
        classes: currentData.classes,
        nextTrimesterRegistrations,
        currentTrimesterRegistrations: currentData.registrations,
        availableTimeSlots: targetTrimesterAvailableTimeSlots,
      },
    };
  }

  /**
   * Render the registration form
   */
  async render(): Promise<void> {
    // FR-006: render the period heading inline at the top of the Registration
    // tab content. The form targets nextTrimester during enrollment overlaps
    // and falls back to currentTrimester otherwise — see parentRegistrationTab
    // fetchData() lines 92-103.
    this.#renderPeriodHeading();

    // If form already exists, update its data instead of recreating
    if (this.registrationForm) {
      // Update existing form with new data
      this.registrationForm.updateData(
        this.data!.instructors,
        this.data!.students,
        this.data!.classes,
        this.data!.nextTrimesterRegistrations,
        this.data!.students, // parentChildren = all students for this parent
        this.data!.currentTrimesterRegistrations, // for recurring enrollment
        this.data!.availableTimeSlots
      );
    } else {
      // Create new form instance
      this.registrationForm = new ParentRegistrationForm(
        this.data!.instructors,
        this.data!.students,
        this.data!.classes,
        this.data!.nextTrimesterRegistrations, // registrations for availability calculation
        async (registrationData: RegistrationSubmitData) => {
          await this.#createRegistration(registrationData);
        },
        this.data!.students, // parentChildren = all students for this parent
        this.data!.currentTrimesterRegistrations, // for recurring enrollment options
        this.data!.availableTimeSlots,
        (excludeId: string | null) => this.refetchAvailability(excludeId)
      );
    }
  }

  /**
   * Render the period heading (FR-006) at the top of the Registration tab
   * content. The heading reads the active trimester (next during enrollment
   * overlap, current otherwise) and renders the user-facing label via the
   * display-name helper (FR-005) — so for `summer` it reads "Next Fall."
   *
   * Idempotent: if the heading element already exists in the DOM, this
   * just updates its text. Otherwise it creates and prepends the element
   * inside the `parent-registration` tab container.
   */
  #renderPeriodHeading(): void {
    const tabContainer = document.getElementById('parent-registration');
    if (!tabContainer) return;

    const ctx = resolveParentTrimesters();
    if (!ctx) return;

    // The form targets nextTrimester during enrollment, currentTrimester otherwise
    const activePeriod = ctx.nextTrimester ?? ctx.currentTrimester;
    if (!activePeriod) return;

    const HEADING_ID = 'parent-registration-period-heading';
    let heading = document.getElementById(HEADING_ID) as HTMLHeadingElement | null;

    if (!heading) {
      heading = document.createElement('h4');
      heading.id = HEADING_ID;
      heading.style.cssText =
        'margin: 0 0 20px 0; color: #2b68a4; text-align: center; font-weight: bold;';
      // Prepend so it appears at the top of the Registration tab content
      tabContainer.insertBefore(heading, tabContainer.firstChild);
    }
    heading.textContent = `${periodDisplayName(activePeriod)} Registration`;
  }

  /**
   * Re-fetch availability with an exclusion for modify-registration flow.
   * When excludeRegistrationId is null, fetches without exclusion (revert to full conflicts).
   */
  async refetchAvailability(excludeRegistrationId: string | null): Promise<void> {
    const parentId = getParentId(this.sessionInfo);
    if (!parentId || !this.data) return;

    const ctx = resolveParentTrimesters();
    if (!ctx) return;

    // Hit whichever trimester the form is currently targeting. fetchData()
    // sources `students` + `availableTimeSlots` from nextTrimester when an
    // enrollment window is open; this refetch (triggered by selecting a
    // registration to modify) MUST use the same trimester or the slot map
    // will be keyed by stored grades while parentChildren carries bumped
    // grades, causing the slot lookup to return [] and the form to
    // permanently show no instructors.
    const targetTrimester = ctx.nextTrimester ?? ctx.currentTrimester;

    const signal = this.getAbortSignal();
    let url = `parent/tabs/registration/${targetTrimester}?parentId=${parentId}`;
    if (excludeRegistrationId) {
      url += `&excludeRegistrationId=${excludeRegistrationId}`;
    }

    const result = await HttpService.get<RegistrationApiResponse>(url, { signal });
    if (!result.ok || !result.data?.availableTimeSlots) return;

    // Update stored data and push to form
    this.data.availableTimeSlots = result.data.availableTimeSlots;
    if (this.registrationForm) {
      this.registrationForm.availableTimeSlots = result.data.availableTimeSlots;
      // Refresh chips with the updated slot data for the selected student
      if (this.registrationForm.cascadingFilterChips) {
        this.registrationForm.cascadingFilterChips.updateData({
          availableTimeSlots: this.registrationForm.getSlotsForSelectedStudent(),
        });
        this.registrationForm.cascadingFilterChips.refreshChips();
      }
    }
  }

  /**
   * Create a registration via RegistrationService
   * @private
   */
  async #createRegistration(registrationData: RegistrationSubmitData): Promise<void> {
    const result = await RegistrationService.create(registrationData);
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
