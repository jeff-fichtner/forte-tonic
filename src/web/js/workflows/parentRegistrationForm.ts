/**
 * Parent Registration Form - Hybrid interface with validation
 * This class handles the registration workflow for parents with full validation and restrictions
 */

import { RegistrationType } from '/utils/values/registrationType.js';
import { TransportationType } from '/utils/values/transportationType.js';
import { PeriodType } from '/utils/values/periodType.js';
import { DomHelpers } from '../utilities/domHelpers.js';
import { clearErrorMessage } from '../utilities/registrationForm/messageDisplay.js';

import type {
  InstructorLike,
  StudentLike,
  ClassLike,
  RegistrationLike,
  RegistrationSubmitData,
  TimeSlot,
} from '../types/registrationTypes.js';
import type { AvailableTimeSlot } from '/models/shared/availableTimeSlot.js';
import { CascadingFilterChips } from '../components/registrationForm/cascadingFilterChips.js';
import { ParentGroupRegistration } from '../components/registrationForm/parentGroupRegistration.js';
import { ParentPrivateSubmission } from '../components/registrationForm/parentPrivateSubmission.js';
import { UserSession } from '../auth/session.js';
import { RegistrationFormText } from '../constants/registrationFormConstants.js';
import {
  showConfirmationModal,
  showConflictModal,
  setButtonLoading,
  restorePageScrolling,
} from '../components/registrationForm/registrationFormModals.js';

export type { InstructorLike, StudentLike, ClassLike, RegistrationLike, RegistrationSubmitData };

/**
 * Parent Registration Form with hybrid interface (progressive filters + time slot grid)
 */
export class ParentRegistrationForm {
  instructors: InstructorLike[];
  students: StudentLike[];
  classes: ClassLike[];
  registrations: RegistrationLike[];
  sendDataFunction: (data: RegistrationSubmitData) => Promise<unknown>;
  parentChildren: StudentLike[];
  currentTrimesterRegistrations: RegistrationLike[];
  nextTrimesterRegistrations: RegistrationLike[];
  availableTimeSlots: Record<string, AvailableTimeSlot[]>;
  #onRefetchAvailability: ((excludeId: string | null) => Promise<void>) | null;
  selectedLesson: TimeSlot | null;
  _selectedPreviousRegistrationId: string | null;
  cascadingFilterChips: CascadingFilterChips | null;
  groupRegistration: ParentGroupRegistration | null;
  privateSubmission: ParentPrivateSubmission | null;
  #boundStudentChangeHandler: ((event: Event) => void) | null = null;
  #boundRegistrationTypeHandler: ((event: Event) => void) | null = null;
  #boundRegistrationSelectionHandler: ((event: Event) => void) | null = null;

  /**
   * Constructor
   */
  constructor(
    instructors: InstructorLike[],
    students: StudentLike[],
    classes: ClassLike[],
    nextTrimesterRegistrations: RegistrationLike[],
    sendDataFunction: (data: RegistrationSubmitData) => Promise<unknown>,
    parentChildren: StudentLike[] = [],
    currentTrimesterRegistrations: RegistrationLike[] = [],
    availableTimeSlots: Record<string, AvailableTimeSlot[]> = {},
    onRefetchAvailability: ((excludeId: string | null) => Promise<void>) | null = null
  ) {
    this.instructors = instructors;
    this.students = students;
    this.classes = classes;
    this.registrations = nextTrimesterRegistrations || []; // For backward compatibility
    this.sendDataFunction = sendDataFunction;
    this.parentChildren = parentChildren || [];
    this.currentTrimesterRegistrations = currentTrimesterRegistrations || [];
    this.nextTrimesterRegistrations = nextTrimesterRegistrations || [];
    this.availableTimeSlots = availableTimeSlots || {};
    this.#onRefetchAvailability = onRefetchAvailability;

    // Initialize basic properties
    this.selectedLesson = null;
    this._selectedPreviousRegistrationId = null; // Track selected registration for backward linking
    this.cascadingFilterChips = null;
    this.groupRegistration = null;
    this.privateSubmission = null;

    // Defer complex initialization to avoid private method ordering issues
    setTimeout(() => {
      this.#initializeHybridInterface();
    }, 0);
  }

  /**
   * Update the form data without recreating the instance
   */
  updateData(
    instructors: InstructorLike[],
    students: StudentLike[],
    classes: ClassLike[],
    nextTrimesterRegistrations: RegistrationLike[],
    parentChildren: StudentLike[],
    currentTrimesterRegistrations: RegistrationLike[] = [],
    availableTimeSlots: Record<string, AvailableTimeSlot[]> = {}
  ): void {
    this.instructors = instructors;
    this.students = students;
    this.classes = classes;
    this.registrations = nextTrimesterRegistrations || []; // For backward compatibility
    this.parentChildren = parentChildren || [];
    this.currentTrimesterRegistrations = currentTrimesterRegistrations || [];
    this.nextTrimesterRegistrations = nextTrimesterRegistrations || [];
    this.availableTimeSlots = availableTimeSlots || {};

    // Refresh the interface with new data by re-running initialization
    this.#refreshInterface();
  }

  /**
   * Refresh the interface with current data
   */
  #refreshInterface(): void {
    // Clear current selection
    this.selectedLesson = null;

    // Re-populate student selector with updated data
    this.#populateStudentSelector();

    // Re-attach registration type dropdown listener
    this.#attachRegistrationTypeListener();

    // Update cascading filter chips data and refresh
    if (this.cascadingFilterChips) {
      this.cascadingFilterChips.updateData({
        instructors: this.instructors,
        registrations: this.registrations,
        nextTrimesterRegistrations: this.nextTrimesterRegistrations,
        selectedPreviousRegistrationId: this._selectedPreviousRegistrationId,
        isEnrollmentPeriod: this._isEnrollmentPeriodActive(),
        parentChildren: this.parentChildren,
        availableTimeSlots: this.getSlotsForSelectedStudent(),
      });
      this.cascadingFilterChips.refreshChips();
    }

    // Clear any form data
    if (this.groupRegistration) {
      this.groupRegistration.clearForm();
    }
  }

  /**
   * Initialize the hybrid registration interface
   */
  #initializeHybridInterface(): void {
    // Hide all registration containers initially
    this.#hideAllRegistrationContainers();

    // Handle registration type selection first
    this.#attachRegistrationTypeListener();

    // Populate student selector
    this.#populateStudentSelector();

    // Render registration selector if in enrollment period
    this._renderRegistrationSelector();

    // Create (or re-create) the cascading filter chips component
    if (this.cascadingFilterChips) {
      this.cascadingFilterChips.destroy();
    }
    this.cascadingFilterChips = new CascadingFilterChips({
      instructors: this.instructors,
      registrations: this.registrations,
      nextTrimesterRegistrations: this.nextTrimesterRegistrations,
      selectedPreviousRegistrationId: this._selectedPreviousRegistrationId,
      isEnrollmentPeriod: this._isEnrollmentPeriodActive(),
      parentChildren: this.parentChildren,
      availableTimeSlots: this.getSlotsForSelectedStudent(),
      onTimeSlotSelected: (slot: TimeSlot | null) => {
        this.selectedLesson = slot;
      },
    });
    this.cascadingFilterChips.initialize();

    // Create (or re-create) the private submission component
    this.privateSubmission = new ParentPrivateSubmission({
      instructors: this.instructors,
      getSelectedLesson: () => this.selectedLesson,
      setSelectedLesson: (slot: TimeSlot | null) => {
        this.selectedLesson = slot;
      },
      isEnrollmentPeriodActive: () => this._isEnrollmentPeriodActive(),
      selectedPreviousRegistrationId: () => this._selectedPreviousRegistrationId,
      showConfirmationModal: (message, onConfirm) => showConfirmationModal(message, onConfirm),
      showConflictModal: message => showConflictModal(message),
      setButtonLoading: (button, isLoading) => setButtonLoading(button, isLoading),
      onSubmitSuccess: () => {
        this.#clearForm();
        this.#initializeHybridInterface();
      },
      sendDataFunction: this.sendDataFunction,
    });
    this.privateSubmission.initialize();

    // Create (or re-create) the group registration component
    this.groupRegistration = new ParentGroupRegistration({
      classes: this.classes,
      registrations: this.registrations,
      nextTrimesterRegistrations: this.nextTrimesterRegistrations,
      students: this.students,
      instructors: this.instructors,
      getSelectedStudentId: () => {
        const studentSelect = document.getElementById(
          'parent-student-select'
        ) as HTMLSelectElement | null;
        return studentSelect?.value || null;
      },
      isEnrollmentPeriodActive: () => this._isEnrollmentPeriodActive(),
      selectedPreviousRegistrationId: () => this._selectedPreviousRegistrationId,
      showConfirmationModal: (message, onConfirm) => showConfirmationModal(message, onConfirm),
      showConflictModal: message => showConflictModal(message),
      setButtonLoading: (button, isLoading) => setButtonLoading(button, isLoading),
      onSubmitSuccess: () => {
        this.groupRegistration!.clearForm();
        this.#initializeHybridInterface();
      },
      sendDataFunction: this.sendDataFunction,
    });
    this.groupRegistration.initialize();

    // Handle clear button
    this.#attachClearButtonListener();
  }

  /**
   * Populate the student selector with parent's children
   */
  #populateStudentSelector(): void {
    const studentSelect = document.getElementById(
      'parent-student-select'
    ) as HTMLSelectElement | null;
    const studentSection = document.getElementById('parent-student-selection-section');

    if (!studentSelect || !studentSection) {
      console.warn('Parent student selector elements not found');
      return;
    }

    // Clear existing options (except the first placeholder)
    while (studentSelect.children.length > 1) {
      studentSelect.removeChild(studentSelect.lastChild!);
    }

    // Clear any previously-rendered empty-state before re-deciding visibility.
    // The 0-students branch below re-renders it.
    this.#clearEmptyStateMessage();

    // Handle based on number of students
    if (this.parentChildren.length === 0) {
      // No students - hide section and all registration containers,
      // then render the empty-state message in their place.
      studentSection.style.display = 'none';
      this.#hideAllRegistrationContainers();
      this.#renderEmptyStateMessage();
      console.warn('No students found for parent');
    } else if (this.parentChildren.length === 1) {
      // Single student - hide section and auto-select
      studentSection.style.display = 'none';
      const student = this.parentChildren[0];

      // Create option and select it
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = student.fullName;
      option.selected = true;
      studentSelect.appendChild(option);

      // Show registration type container since student is selected
      this.#showRegistrationTypeContainer();
    } else {
      // Multiple students - show section and hide registration containers until selection
      studentSection.style.display = 'block';
      this.#hideAllRegistrationContainers();

      // Add student options
      this.parentChildren.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.fullName;
        studentSelect.appendChild(option);
      });

      // Remove previous listener before adding new one
      if (this.#boundStudentChangeHandler) {
        studentSelect.removeEventListener('change', this.#boundStudentChangeHandler);
      }

      // Add event listener for student selection changes
      this.#boundStudentChangeHandler = (event: Event) => {
        const selectedStudentId = (event.target as HTMLSelectElement).value;
        if (selectedStudentId) {
          // Clear any previously selected registration when switching students
          this._selectedPreviousRegistrationId = null;

          this.#showRegistrationTypeContainer();

          // Re-render registration selector for the new student (enrollment periods only)
          this._renderRegistrationSelector();

          // If group registration type is already selected, repopulate classes for new student
          const registrationTypeSelect = document.getElementById(
            'parent-registration-type-select'
          ) as HTMLSelectElement | null;
          if (registrationTypeSelect && registrationTypeSelect.value === RegistrationType.GROUP) {
            if (this.groupRegistration) {
              this.groupRegistration.populateClassesDropdown();

              // Re-check any currently selected class for conflicts with the new student
              const classSelect = document.getElementById(
                'parent-class-select'
              ) as HTMLSelectElement | null;
              if (classSelect && classSelect.value) {
                this.groupRegistration.handleClassSelection(classSelect.value);
              }
            }
          }

          // Regenerate filter chips and time slots based on new student's grade
          if (this.cascadingFilterChips) {
            this.cascadingFilterChips.updateData({
              selectedPreviousRegistrationId: this._selectedPreviousRegistrationId,
              isEnrollmentPeriod: this._isEnrollmentPeriodActive(),
              availableTimeSlots: this.getSlotsForSelectedStudent(),
            });
            this.cascadingFilterChips.refreshChips();
            this.cascadingFilterChips.clearSelection();
          }
          this.selectedLesson = null;
        } else {
          this.#hideAllRegistrationContainers();
        }
      };
      studentSelect.addEventListener('change', this.#boundStudentChangeHandler);
    }

    // Reinitialize Materialize select
    M.FormSelect.init(studentSelect);
  }

  /**
   * Show the registration type container
   */
  #showRegistrationTypeContainer(): void {
    const registrationTypeSection = document.querySelector(
      '.registration-type-section'
    ) as HTMLElement | null;
    if (registrationTypeSection) {
      registrationTypeSection.style.display = 'block';
    }
  }

  /**
   * Hide all registration containers (type, private, group)
   */
  #hideAllRegistrationContainers(): void {
    const registrationTypeSection = document.querySelector(
      '.registration-type-section'
    ) as HTMLElement | null;
    const privateContainer = document.getElementById('parent-private-registration-container');
    const groupContainer = document.getElementById('parent-group-registration-container');

    if (registrationTypeSection) registrationTypeSection.style.display = 'none';
    if (privateContainer) privateContainer.style.display = 'none';
    if (groupContainer) groupContainer.style.display = 'none';
  }

  /**
   * Render the empty-state message inside the Registration tab content when
   * no eligible students are returned. Plain centered text, no icon, default
   * styling — uses the existing `STUDENT_EMPTY` constant text.
   * Idempotent: re-rendering re-creates the element only if absent.
   */
  #renderEmptyStateMessage(): void {
    const tabContainer = document.getElementById('parent-registration');
    if (!tabContainer) return;

    const EMPTY_STATE_ID = 'parent-registration-empty-state';
    let messageEl = document.getElementById(EMPTY_STATE_ID);
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = EMPTY_STATE_ID;
      messageEl.style.cssText =
        'text-align: center; padding: 40px 20px; color: #616161; font-size: 16px;';
      tabContainer.appendChild(messageEl);
    }
    messageEl.textContent = RegistrationFormText.STUDENT_EMPTY;
  }

  /**
   * Remove the empty-state message if present (called when students reappear).
   */
  #clearEmptyStateMessage(): void {
    const messageEl = document.getElementById('parent-registration-empty-state');
    if (messageEl) {
      messageEl.remove();
    }
  }

  /**
   * Attach event listener to registration type selection
   */
  #attachRegistrationTypeListener(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const registrationTypeSelect = document.getElementById(
      'parent-registration-type-select'
    ) as HTMLSelectElement | null;
    const privateContainer = document.getElementById('parent-private-registration-container');
    const groupContainer = document.getElementById('parent-group-registration-container');

    if (registrationTypeSelect && privateContainer && groupContainer) {
      // Remove previous listener before adding new one
      if (this.#boundRegistrationTypeHandler) {
        registrationTypeSelect.removeEventListener('change', this.#boundRegistrationTypeHandler);
      }

      this.#boundRegistrationTypeHandler = (event: Event) => {
        const selectedType = (event.target as HTMLSelectElement).value;

        // Hide both containers first
        privateContainer.style.display = 'none';
        groupContainer.style.display = 'none';

        if (selectedType === RegistrationType.PRIVATE) {
          // Show the private registration container
          privateContainer.style.display = 'block';
        } else if (selectedType === RegistrationType.GROUP) {
          // Show the group registration container
          groupContainer.style.display = 'block';

          // Populate the classes dropdown
          if (this.groupRegistration) {
            this.groupRegistration.populateClassesDropdown();
          }
        }

        // Restore page scrolling to prevent scroll lock
        restorePageScrolling();

        // Initialize Materialize select components
        setTimeout(() => {
          if (typeof M !== 'undefined') {
            M.FormSelect.init(document.querySelectorAll('select'));
          }
        }, 100);
      };
      registrationTypeSelect.addEventListener('change', this.#boundRegistrationTypeHandler);

      // Initialize Materialize select
      if (typeof M !== 'undefined') {
        M.FormSelect.init(registrationTypeSelect);
      }
    }
  }

  /**
   * Attach event listener to clear button
   */
  #attachClearButtonListener(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const clearButton = document.getElementById('parent-clear-selection-btn');
    if (clearButton) {
      // Remove existing onclick if any
      clearButton.removeAttribute('onclick');

      clearButton.addEventListener('click', event => {
        event.preventDefault();
        this.clearSelection();
      });
    } else {
      console.warn('Parent clear button not found');
    }
  }

  /**
   * Clear the form after successful submission
   */
  #clearForm(): void {
    this.selectedLesson = null;
    this._selectedPreviousRegistrationId = null; // Clear selected registration

    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    // Hide the fixed registration preview (using the correct ID)
    const selectedDisplay = parentContainer.querySelector(
      '#admin-selected-lesson-display'
    ) as HTMLElement | null;
    if (selectedDisplay) {
      selectedDisplay.style.display = 'none';
      selectedDisplay.style.pointerEvents = 'none'; // Ensure it doesn't interfere when hidden
    }

    // Reset transportation type to default (pickup)
    const pickupRadio = document.querySelector(
      `input[name="parent-transportation-type"][value="${TransportationType.PICKUP}"]`
    ) as HTMLInputElement | null;
    if (pickupRadio) {
      pickupRadio.checked = true;
    }

    // Reset group transportation type to default (pickup) for consistency
    const groupPickupRadio = document.querySelector(
      `input[name="parent-group-transportation-type"][value="${TransportationType.PICKUP}"]`
    ) as HTMLInputElement | null;
    if (groupPickupRadio) {
      groupPickupRadio.checked = true;
    }

    // Reset registration type selector using consistent utility
    DomHelpers.resetMaterializeSelect('parent-registration-type-select', true);

    // Hide all registration containers (private and group)
    this.#hideAllRegistrationContainers();

    // Clear any error messages
    clearErrorMessage('parent-class-error-message');

    // Reinitialize the hybrid interface to restore proper form state
    this.#initializeHybridInterface();
  }

  /**
   * Public method to clear the form selection (can be called externally)
   */
  clearSelection(): void {
    if (this.cascadingFilterChips) {
      this.cascadingFilterChips.clearSelection();
    }
    this.selectedLesson = null;
    this.#resetCompleteForm();
  }

  /**
   * Destroy the form and clean up Materialize component instances
   */
  destroy(): void {
    // Destroy the cascading filter chips component
    if (this.cascadingFilterChips) {
      this.cascadingFilterChips.destroy();
      this.cascadingFilterChips = null;
    }

    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    // Destroy all Materialize Select instances
    const selects = parentContainer.querySelectorAll('select');
    selects.forEach(select => {
      const instance = M.FormSelect.getInstance(select) as { destroy(): void } | undefined;
      if (instance) {
        instance.destroy();
      }
    });

    // Destroy any Materialize Modal instances
    const modals = parentContainer.querySelectorAll('.modal');
    modals.forEach(modal => {
      const instance = M.Modal.getInstance(modal);
      if (instance) {
        instance.destroy();
      }
    });

    // Clear selection
    this.clearSelection();
  }

  /**
   * Complete form reset - used when switching users or need full reset
   */
  #resetCompleteForm(): void {
    // Reset registration type dropdown to default state
    const registrationTypeSelect = document.getElementById(
      'parent-registration-type-select'
    ) as HTMLSelectElement | null;
    if (registrationTypeSelect) {
      registrationTypeSelect.value = '';
      // Re-initialize Materialize select to update the display
      if (typeof M !== 'undefined') {
        M.FormSelect.init(registrationTypeSelect);
      }
    }

    // Reset class selection dropdown
    const classSelect = document.getElementById('parent-class-select') as HTMLSelectElement | null;
    if (classSelect) {
      classSelect.value = '';
      if (typeof M !== 'undefined') {
        M.FormSelect.init(classSelect);
      }
    }

    // Clear any error messages
    clearErrorMessage('parent-class-error-message');

    // Hide all registration containers (type, private, group)
    this.#hideAllRegistrationContainers();

    // Reset all filter chips to default state via cascading filter chips component
    if (this.cascadingFilterChips) {
      this.cascadingFilterChips.clearSelection();
    }

    // Show registration type container for next selection
    this.#showRegistrationTypeContainer();
  }

  /**
   * Render registration selector dropdown during enrollment periods
   * Shows existing registrations that can be modified for next trimester
   * Only visible during priority/open enrollment AND if user has access
   */
  _renderRegistrationSelector(): void {
    const selectorSection = document.getElementById('parent-registration-selector-section');
    const selectorDropdown = document.getElementById(
      'parent-registration-selector'
    ) as HTMLSelectElement | null;

    if (!selectorSection || !selectorDropdown) {
      return; // Elements not found, skip
    }

    // Check if enrollment period is active AND user has access
    if (!this._isEnrollmentPeriodActive() || !this._canAccessNextTrimester()) {
      selectorSection.style.display = 'none';
      return;
    }

    // Show the section
    selectorSection.style.display = 'block';

    // Get selected student
    const studentSelect = document.getElementById(
      'parent-student-select'
    ) as HTMLSelectElement | null;
    const selectedStudentId = studentSelect?.value;

    // Clear existing options (except first "Create New")
    while (selectorDropdown.options.length > 1) {
      selectorDropdown.remove(1);
    }

    // Filter next trimester registrations for selected student that have linkedPreviousRegistrationId
    // These are registrations that were created from intent (keep/change) and can be modified once
    const studentRegistrations = selectedStudentId
      ? this.nextTrimesterRegistrations.filter((reg: RegistrationLike) => {
          const matchesStudent = reg.studentId === selectedStudentId;
          const hasLinkedPrevious = !!reg.linkedPreviousRegistrationId;
          return matchesStudent && hasLinkedPrevious;
        })
      : [];

    // If no registrations with linkedPreviousRegistrationId, hide the section entirely
    if (studentRegistrations.length === 0) {
      selectorSection.style.display = 'none';
      return;
    }

    // Populate dropdown with existing next trimester registrations that can be modified
    studentRegistrations.forEach(registration => {
      const option = document.createElement('option');
      option.value = registration.id;

      // Build descriptive label
      let label = '';
      if (registration.registrationType === RegistrationType.PRIVATE) {
        const instrument = registration.instrument || 'Lesson';
        const day = registration.day || '';
        const time = registration.startTime || '';
        const instructor = this.instructors.find(
          (i: InstructorLike) => i.id === registration.instructorId
        );
        const instructorName = instructor?.fullName || '';
        label = `Modify: ${instrument} - ${day} ${time} with ${instructorName}`;
      } else if (registration.registrationType === RegistrationType.GROUP) {
        const classTitle = registration.classTitle || 'Class';
        label = `Modify: ${classTitle}`;
      }

      option.textContent = label;
      selectorDropdown.appendChild(option);
    });

    // Attach change listener (store bound ref so it can be removed later)
    if (this.#boundRegistrationSelectionHandler) {
      selectorDropdown.removeEventListener('change', this.#boundRegistrationSelectionHandler);
    }
    this.#boundRegistrationSelectionHandler = this._handleRegistrationSelection.bind(this);
    selectorDropdown.addEventListener('change', this.#boundRegistrationSelectionHandler);

    // Reinitialize Materialize select
    if (window.M && window.M.FormSelect) {
      window.M.FormSelect.init(selectorDropdown);
    }
  }

  /**
   * Handle registration selection from dropdown
   * @private
   */
  _handleRegistrationSelection(event: Event): void {
    const selectedId = (event.target as HTMLSelectElement).value;

    if (!selectedId) {
      // "Create New" selected - clear tracking and revert to full conflict set
      this._selectedPreviousRegistrationId = null;
      this.#onRefetchAvailability?.(null);
    } else {
      // Existing registration selected - track for linking and re-fetch with exclusion
      this._selectedPreviousRegistrationId = selectedId;
      this.#onRefetchAvailability?.(selectedId);
    }
  }

  /**
   * Get the pre-computed time slots for the currently selected student's grade.
   */
  getSlotsForSelectedStudent(): AvailableTimeSlot[] {
    const studentSelect = document.getElementById(
      'parent-student-select'
    ) as HTMLSelectElement | null;
    const selectedStudentId = studentSelect?.value;
    if (!selectedStudentId) return [];

    const student = this.parentChildren.find(s => s.id === selectedStudentId);
    const grade = student?.grade;
    const gradeKey = String(grade ?? 'null');
    return this.availableTimeSlots[gradeKey] || [];
  }

  /**
   * Check if we're in an enrollment period (priority or open)
   * @returns {boolean} True if current period allows next trimester registration
   */
  _isEnrollmentPeriodActive(): boolean {
    const currentPeriod = UserSession?.getCurrentPeriod?.();
    return !!(
      currentPeriod &&
      (currentPeriod.periodType === PeriodType.PRIORITY_ENROLLMENT ||
        currentPeriod.periodType === PeriodType.OPEN_ENROLLMENT)
    );
  }

  /**
   * Check if user can access next trimester based on period and registration status
   * Open enrollment: everyone
   * Priority enrollment: only returning families
   * @returns {boolean} True if user has access to next trimester registration
   */
  _canAccessNextTrimester() {
    const currentPeriod = UserSession?.getCurrentPeriod?.();
    if (!currentPeriod) return false;

    // Open enrollment: everyone can access
    if (currentPeriod.periodType === PeriodType.OPEN_ENROLLMENT) {
      return true;
    }

    // Priority enrollment: only returning families (those with current registrations)
    if (currentPeriod.periodType === PeriodType.PRIORITY_ENROLLMENT) {
      const currentRegistrations = this.currentTrimesterRegistrations || [];
      return currentRegistrations.length > 0;
    }

    return false;
  }
}
