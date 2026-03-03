/**
 * Admin Registration Form - Refactored to use shared components
 * Simplified progressive filters without restrictions
 */

import { RegistrationType } from '/utils/values/registrationType.js';
import { RegistrationFormText, DayNames } from '../constants/registrationFormConstants.js';
import {
  validateBusTimeRestrictions,
  validateRegistrationData,
  formatValidationErrors,
} from '../utilities/registrationForm/registrationValidator.js';

// Import shared components
import { StudentSelector } from '../components/registrationForm/studentSelector.js';
import { RegistrationTypeSelector } from '../components/registrationForm/registrationTypeSelector.js';
import { TransportationSelector } from '../components/registrationForm/transportationSelector.js';
import { InstructorSelector } from '../components/registrationForm/instructorSelector.js';
import { ClassSelector } from '../components/registrationForm/classSelector.js';
import { LessonDetailsForm } from '../components/registrationForm/lessonDetailsForm.js';
import type {
  InstructorLike,
  StudentLike,
  ClassLike,
  RegistrationLike,
} from '../types/registrationTypes.js';

/** Registration data built for submission (admin form allows null for some fields) */
interface RegistrationData {
  studentId: string | null;
  registrationType: string;
  transportationType?: string | null;
  classId?: string;
  classTitle?: string;
  instructorId?: string;
  day?: string | null;
  startTime?: string;
  length?: number | null;
  instrument?: string;
  replaceRegistrationId?: string;
  trimester?: string;
}

/** Typed error from the send data function */
interface SendDataError extends Error {
  type?: string;
}

/** Callback type for the send data function */
type SendDataFunction = (data: RegistrationData) => Promise<void>;

/**
 * Admin Registration Form with simplified progressive filters
 */
export class AdminRegistrationForm {
  instructors: InstructorLike[];
  students: StudentLike[];
  classes: ClassLike[];
  sendDataFunction: SendDataFunction;
  selectedTrimester: string | null;
  trimesterRegistrations: RegistrationLike[];
  _selectedRegistrationToReplace: string | null;
  studentSelector!: StudentSelector;
  registrationTypeSelector!: RegistrationTypeSelector;
  transportationSelector!: TransportationSelector;
  instructorSelector!: InstructorSelector;
  classSelector!: ClassSelector;
  lessonDetailsForm!: LessonDetailsForm;

  /**
   * Constructor
   */
  constructor(
    instructors: InstructorLike[],
    students: StudentLike[],
    classes: ClassLike[],
    sendDataFunction: SendDataFunction
  ) {
    this.instructors = instructors;
    this.students = students;
    this.classes = classes;
    this.sendDataFunction = sendDataFunction;
    this.selectedTrimester = null; // Trimester context for new registrations
    this.trimesterRegistrations = []; // Registrations for the selected trimester
    this._selectedRegistrationToReplace = null; // Track registration to replace

    // Initialize form components
    this.#initializeComponents();
    this.#attachSubmitButtonListener();
    this.#attachRegistrationSelectorListener();
    this.#attachStudentSelectorListener();
  }

  /**
   * Set the trimester context for new registrations
   * @param {string} trimester - The trimester ('fall', 'winter', 'spring')
   */
  setTrimester(trimester: string): void {
    this.selectedTrimester = trimester;
  }

  /**
   * Set registrations for the selected trimester
   * @param {Array} registrations - Array of registration objects for the trimester
   */
  setTrimesterRegistrations(registrations: RegistrationLike[]): void {
    this.trimesterRegistrations = registrations || [];
    // Render the selector if a student is already selected
    const selectedStudentId = this.studentSelector.getSelectedStudentId();
    if (selectedStudentId) {
      this.#renderRegistrationSelector();
    }
  }

  /**
   * Initialize all form components
   */
  #initializeComponents(): void {
    // Student selector with callback to update registration selector
    this.studentSelector = new StudentSelector(
      'student-autocomplete-input',
      this.students,
      (student: StudentLike | undefined) => this.#handleStudentChange(student)
    );

    // Registration type selector
    this.registrationTypeSelector = new RegistrationTypeSelector('registration-type-select', {
      privateContainerId: 'private-registration-container',
      groupContainerId: 'group-registration-container',
    });

    // Transportation selector
    this.transportationSelector = new TransportationSelector('transportation-type');

    // Instructor selector
    this.instructorSelector = new InstructorSelector(
      'instructor-select',
      this.instructors,
      (instructor: InstructorLike | undefined) => this.#handleInstructorChange(instructor)
    );

    // Class selector
    this.classSelector = new ClassSelector('class-select', this.classes);

    // Lesson details form
    this.lessonDetailsForm = new LessonDetailsForm(
      {
        daySelectId: 'day-select',
        timeSelectId: 'start-time-select',
        instrumentSelectId: 'instrument-select',
        containerIdWhenDaySelected: 'instructor-day-selected-info-container',
        lessonLengthRadioName: 'lesson-length',
      },
      null, // onDayChange
      null, // onTimeChange
      null // onInstrumentChange
    );

    // Hide lesson details initially
    this.#showContainer('instructor-selected-info-container', false);
  }

  /**
   * Handle instructor selection change
   */
  #handleInstructorChange(instructor: InstructorLike | undefined): void {
    const hasInstructor = !!instructor;

    // Show lesson details when instructor is selected
    this.#showContainer('instructor-selected-info-container', hasInstructor);

    // Update instrument options based on selected instructor's specialties
    if (hasInstructor && instructor.specialties) {
      this.lessonDetailsForm.updateInstrumentOptions(instructor.specialties);
    }
  }

  /**
   * Show/hide container helper
   */
  #showContainer(containerId: string, shouldShow: boolean): void {
    const container = document.getElementById(containerId);
    if (container) {
      container.hidden = !shouldShow;
    }
  }

  /**
   * Attach event listener to submit button
   */
  #attachSubmitButtonListener(): void {
    const submitButton = document.getElementById('create-registration-submit-btn');
    if (submitButton) {
      submitButton.addEventListener('click', async (event: Event) => {
        event.preventDefault();

        if (!this.#validateRegistration()) {
          return;
        }

        try {
          this.#setAdminRegistrationLoading(true);
          const registrationData = this.#getCreateRegistrationData();
          await this.sendDataFunction(registrationData);
          this.#clearForm();
          M.toast({ html: RegistrationFormText.SUCCESS_CREATED });
        } catch (err: unknown) {
          const error = err as SendDataError;
          console.error('Error creating registration:', error);
          if (error.type === 'conflict') {
            this.#showConflictModal(error.message);
          } else {
            M.toast({
              html: `${RegistrationFormText.ERROR_CREATE}: ${error.message}`,
            });
          }
        } finally {
          this.#setAdminRegistrationLoading(false);
        }
      });
    } else {
      console.warn('Submit button not found');
    }
  }

  /**
   * Validate registration before submission
   */
  #validateRegistration(): boolean {
    const registrationData = this.#getCreateRegistrationData();
    const registrationType = registrationData.registrationType;
    const isPrivate = registrationType === RegistrationType.PRIVATE;
    const isGroup = registrationType === RegistrationType.GROUP;

    // Basic field validation
    const validation = validateRegistrationData(
      registrationData as unknown as Record<string, unknown>,
      registrationType
    );
    if (!validation.isValid) {
      M.toast({ html: formatValidationErrors(validation.errors) });
      return false;
    }

    // Check bus time restrictions for Late Bus transportation
    if (this.transportationSelector.isBusSelected()) {
      let busValidation;

      if (isPrivate) {
        // For private lessons
        busValidation = validateBusTimeRestrictions(
          registrationData.day as string,
          registrationData.startTime as string,
          registrationData.length as number,
          registrationData.transportationType as string
        );
      } else if (isGroup) {
        // For group classes
        const selectedClass = this.classSelector.getSelectedClass();
        if (selectedClass) {
          busValidation = validateBusTimeRestrictions(
            selectedClass.day as string,
            selectedClass.startTime as string,
            selectedClass.length as number,
            registrationData.transportationType as string
          );
        }
      }

      if (busValidation && !busValidation.isValid) {
        M.toast({ html: busValidation.errorMessage as string });
        return false;
      }
    }

    return true;
  }

  /**
   * Get registration data for submission
   */
  #getCreateRegistrationData(): RegistrationData {
    const studentId = this.studentSelector.getSelectedStudentId();
    const registrationType = this.registrationTypeSelector.getSelectedType();
    const transportationType = this.transportationSelector.getSelectedType();

    let registrationData: RegistrationData = {
      studentId,
      registrationType,
    };

    if (registrationType === RegistrationType.GROUP) {
      const selectedClass = this.classSelector.getSelectedClass();

      if (!selectedClass) {
        throw new Error(RegistrationFormText.ERROR_INVALID_CLASS);
      }

      registrationData = {
        studentId: studentId,
        registrationType: RegistrationType.GROUP,
        transportationType: transportationType,
        classId: selectedClass.id,
        classTitle:
          (selectedClass.formattedName as string | undefined) ||
          (selectedClass.title as string | undefined) ||
          (selectedClass.instrument as string | undefined) ||
          `Class ${selectedClass.id}`,
        instructorId: selectedClass.instructorId as string | undefined,
        day: selectedClass.day,
        startTime: selectedClass.startTime,
        length: selectedClass.length as number | undefined,
        instrument: selectedClass.instrument as string | undefined,
      };
    } else if (registrationType === RegistrationType.PRIVATE) {
      // For private lessons
      const dayValue = this.lessonDetailsForm.getSelectedDayValue();
      const dayName = this.lessonDetailsForm.getSelectedDayName();
      const startTime = this.lessonDetailsForm.getSelectedTime();
      const length = this.lessonDetailsForm.getSelectedLength();
      const instrument = this.lessonDetailsForm.getSelectedInstrument();

      registrationData = {
        studentId: studentId,
        registrationType: registrationType,
        transportationType: transportationType,
        instructorId: this.instructorSelector.getSelectedInstructorId(),
        day: dayName,
        startTime: startTime,
        length: length,
        instrument: instrument,
      };
    } else {
      registrationData = {
        studentId: studentId,
        registrationType: registrationType,
      };
    }

    // Add replaceRegistrationId if an existing registration is selected to be replaced
    if (this._selectedRegistrationToReplace) {
      registrationData.replaceRegistrationId = this._selectedRegistrationToReplace;
    }

    // Add trimester context for admin registrations
    // Admins can create registrations for any trimester, not just the enrollment trimester
    if (this.selectedTrimester) {
      registrationData.trimester = this.selectedTrimester;
    }

    return registrationData;
  }

  /**
   * Set loading state
   */
  #setAdminRegistrationLoading(isLoading: boolean): void {
    const submitButton = document.getElementById(
      'create-registration-submit-btn'
    ) as HTMLButtonElement | null;
    if (submitButton) {
      if (isLoading) {
        submitButton.disabled = true;
        submitButton.innerHTML = `<b>${RegistrationFormText.LOADING_CREATE}</b>`;
      } else {
        submitButton.disabled = false;
        submitButton.innerHTML = `<b>${RegistrationFormText.BUTTON_CREATE}</b>`;
      }
    }
  }

  /**
   * Public method to clear the form (can be called externally when switching users)
   */
  clearForm(): void {
    this.#clearForm();
  }

  /**
   * Clear the form after successful submission
   */
  #clearForm(): void {
    // Clear all component selections
    this.registrationTypeSelector.clear();
    this.classSelector.clear();
    this.instructorSelector.clear();
    this.lessonDetailsForm.clear();
    this.studentSelector.clear();
    this.transportationSelector.clear();

    // Hide containers
    this.#showContainer('instructor-selected-info-container', false);

    // Clear registration selector
    this._selectedRegistrationToReplace = null;
    this.#hideRegistrationSelector();
  }

  /**
   * Attach event listener to registration selector dropdown
   */
  #attachRegistrationSelectorListener(): void {
    const selectorDropdown = document.getElementById(
      'admin-registration-selector'
    ) as HTMLSelectElement | null;
    if (selectorDropdown) {
      selectorDropdown.addEventListener('change', (event: Event) => {
        const selectedId = (event.target as HTMLSelectElement).value;
        if (!selectedId) {
          // "Create New (Don't Replace)" selected
          this._selectedRegistrationToReplace = null;
        } else {
          // Existing registration selected to be replaced
          this._selectedRegistrationToReplace = selectedId;
        }
      });
    }
  }

  /**
   * Handle student selection change
   * Called when a student is selected from autocomplete or cleared
   */
  #handleStudentChange(_student: StudentLike | undefined): void {
    // Render registration selector (will hide if student is null)
    this.#renderRegistrationSelector();
  }

  /**
   * Attach listener to detect when student input is manually cleared
   */
  #attachStudentSelectorListener(): void {
    const studentInput = document.getElementById(
      'student-autocomplete-input'
    ) as HTMLInputElement | null;
    if (studentInput) {
      // Listen for input events to detect when field is cleared
      studentInput.addEventListener('input', (event: Event) => {
        if ((event.target as HTMLInputElement).value === '') {
          // Input was cleared, hide the registration selector
          this.#hideRegistrationSelector();
        }
      });
    }
  }

  /**
   * Render the registration selector with existing registrations for the selected student
   */
  #renderRegistrationSelector(): void {
    const selectorSection = document.getElementById('admin-registration-selector-section');
    const selectorDropdown = document.getElementById(
      'admin-registration-selector'
    ) as HTMLSelectElement | null;

    if (!selectorSection || !selectorDropdown) {
      return; // Elements not found
    }

    // Get selected student
    const selectedStudentId = this.studentSelector.getSelectedStudentId();

    // Clear existing options (except first "Create New")
    while (selectorDropdown.options.length > 1) {
      selectorDropdown.remove(1);
    }

    if (
      !selectedStudentId ||
      !this.trimesterRegistrations ||
      this.trimesterRegistrations.length === 0
    ) {
      this.#hideRegistrationSelector();
      return;
    }

    // Filter registrations for selected student that have linkedPreviousRegistrationId
    // These are registrations created from reenrollment intent that can be modified
    const studentRegistrations = this.trimesterRegistrations.filter((reg: RegistrationLike) => {
      const regStudentId = reg.studentId;
      const hasLinkedPrevious = !!reg.linkedPreviousRegistrationId;
      return regStudentId === selectedStudentId && hasLinkedPrevious;
    });

    // If no linked registrations for this student, hide the section
    if (studentRegistrations.length === 0) {
      this.#hideRegistrationSelector();
      return;
    }

    // Show the section
    selectorSection.style.display = 'block';

    // Populate dropdown with existing registrations
    studentRegistrations.forEach((registration: RegistrationLike) => {
      const option = document.createElement('option');
      option.value = registration.id;

      // Build descriptive label
      let label = '';
      const regType = registration.registrationType;
      if (regType === RegistrationType.PRIVATE) {
        const instrument = registration.instrument || 'Lesson';
        const day = registration.day || '';
        const time = registration.startTime || '';
        const instructor = this.instructors.find(
          (i: InstructorLike) => i.id === registration.instructorId
        );
        const instructorName = instructor ? `${instructor.firstName} ${instructor.lastName}` : '';
        label = `${instrument} - ${day} ${time} with ${instructorName}`;
      } else if (regType === RegistrationType.GROUP) {
        const classTitle = registration.classTitle || 'Class';
        label = `${classTitle}`;
      } else {
        label = `Registration ${option.value}`;
      }

      option.textContent = label;
      selectorDropdown.appendChild(option);
    });

    // Reinitialize Materialize select
    if (window.M && window.M.FormSelect) {
      window.M.FormSelect.init(selectorDropdown);
    }
  }

  /**
   * Hide the registration selector section
   */
  #hideRegistrationSelector(): void {
    const selectorSection = document.getElementById('admin-registration-selector-section');
    if (selectorSection) {
      selectorSection.style.display = 'none';
    }
    this._selectedRegistrationToReplace = null;
  }

  /**
   * Show conflict error modal with refresh on acknowledge
   */
  #showConflictModal(message: string): void {
    // Parse conflict messages from the error
    const conflicts = message
      .replace('Registration conflicts detected: ', '')
      .split('; ')
      .map((c: string) => `<li>${c}</li>`)
      .join('');

    const modalHtml = `
      <div id="conflict-error-modal" class="modal">
        <div class="modal-content">
          <h5><i class="material-icons left red-text">warning</i>Registration Conflict</h5>
          <p>This registration could not be created due to the following conflicts:</p>
          <ul class="browser-default">${conflicts}</ul>
        </div>
        <div class="modal-footer">
          <a href="#!" class="modal-close waves-effect waves-green btn" id="conflict-modal-ok">OK</a>
        </div>
      </div>
    `;

    // Remove existing modal if present
    const existingModal = document.getElementById('conflict-error-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Initialize and open modal
    const modalElement = document.getElementById('conflict-error-modal') as HTMLElement;
    const modalInstance = M.Modal.init(modalElement, {
      dismissible: false,
      onCloseEnd: () => {
        window.location.reload();
      },
    });
    modalInstance.open();
  }
}
