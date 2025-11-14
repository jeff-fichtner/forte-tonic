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

/**
 * Admin Registration Form with simplified progressive filters
 */
export class AdminRegistrationForm {
  /**
   * Constructor
   */
  constructor(instructors, students, classes, sendDataFunction) {
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
  setTrimester(trimester) {
    this.selectedTrimester = trimester;
  }

  /**
   * Set registrations for the selected trimester
   * @param {Array} registrations - Array of registration objects for the trimester
   */
  setTrimesterRegistrations(registrations) {
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
  #initializeComponents() {
    // Student selector with callback to update registration selector
    this.studentSelector = new StudentSelector(
      'student-autocomplete-input',
      this.students,
      student => this.#handleStudentChange(student)
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
      instructor => this.#handleInstructorChange(instructor)
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
  #handleInstructorChange(instructor) {
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
  #showContainer(containerId, shouldShow) {
    const container = document.getElementById(containerId);
    if (container) {
      container.hidden = !shouldShow;
    }
  }

  /**
   * Attach event listener to submit button
   */
  #attachSubmitButtonListener() {
    const submitButton = document.getElementById('create-registration-submit-btn');
    if (submitButton) {
      submitButton.addEventListener('click', async event => {
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
        } catch (error) {
          console.error('Error creating registration:', error);
          M.toast({
            html: `${RegistrationFormText.ERROR_CREATE}: ${error.message}`,
          });
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
  #validateRegistration() {
    const registrationData = this.#getCreateRegistrationData();
    const registrationType = registrationData.registrationType;
    const isPrivate = registrationType === RegistrationType.PRIVATE;
    const isGroup = registrationType === RegistrationType.GROUP;

    // Basic field validation
    const validation = validateRegistrationData(registrationData, registrationType);
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
          registrationData.day,
          registrationData.startTime,
          registrationData.length,
          registrationData.transportationType
        );
      } else if (isGroup) {
        // For group classes
        const selectedClass = this.classSelector.getSelectedClass();
        if (selectedClass) {
          busValidation = validateBusTimeRestrictions(
            selectedClass.day,
            selectedClass.startTime,
            selectedClass.length,
            registrationData.transportationType
          );
        }
      }

      if (busValidation && !busValidation.isValid) {
        M.toast({ html: busValidation.errorMessage });
        return false;
      }
    }

    return true;
  }

  /**
   * Get registration data for submission
   */
  #getCreateRegistrationData() {
    const studentId = this.studentSelector.getSelectedStudentId();
    const registrationType = this.registrationTypeSelector.getSelectedType();
    const transportationType = this.transportationSelector.getSelectedType();

    let registrationData = {};

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
          selectedClass.formattedName ||
          selectedClass.title ||
          selectedClass.instrument ||
          `Class ${selectedClass.id}`,
        instructorId: selectedClass.instructorId,
        day: selectedClass.day,
        startTime: selectedClass.startTime,
        length: selectedClass.length,
        instrument: selectedClass.instrument,
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
  #setAdminRegistrationLoading(isLoading) {
    const submitButton = document.getElementById('create-registration-submit-btn');
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
  clearForm() {
    this.#clearForm();
  }

  /**
   * Clear the form after successful submission
   */
  #clearForm() {
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
  #attachRegistrationSelectorListener() {
    const selectorDropdown = document.getElementById('admin-registration-selector');
    if (selectorDropdown) {
      selectorDropdown.addEventListener('change', event => {
        const selectedId = event.target.value;
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
  #handleStudentChange(student) {
    // Render registration selector (will hide if student is null)
    this.#renderRegistrationSelector();
  }

  /**
   * Attach listener to detect when student input is manually cleared
   */
  #attachStudentSelectorListener() {
    const studentInput = document.getElementById('student-autocomplete-input');
    if (studentInput) {
      // Listen for input events to detect when field is cleared
      studentInput.addEventListener('input', event => {
        if (event.target.value === '') {
          // Input was cleared, hide the registration selector
          this.#hideRegistrationSelector();
        }
      });
    }
  }

  /**
   * Render the registration selector with existing registrations for the selected student
   */
  #renderRegistrationSelector() {
    const selectorSection = document.getElementById('admin-registration-selector-section');
    const selectorDropdown = document.getElementById('admin-registration-selector');

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
    const studentRegistrations = this.trimesterRegistrations.filter(reg => {
      const regStudentId = reg.studentId?.value || reg.studentId;
      const hasLinkedPrevious = !!(
        reg.linkedPreviousRegistrationId?.value || reg.linkedPreviousRegistrationId
      );
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
    studentRegistrations.forEach(registration => {
      const option = document.createElement('option');
      option.value = registration.id?.value || registration.id;

      // Build descriptive label
      let label = '';
      const regType = registration.registrationType?.value || registration.registrationType;
      if (regType === 'private') {
        const instrument = registration.instrument?.value || registration.instrument || 'Lesson';
        const day = registration.day?.value || registration.day || '';
        const time = registration.startTime?.value || registration.startTime || '';
        const instructor = this.instructors.find(
          i =>
            (i.id?.value || i.id) ===
            (registration.instructorId?.value || registration.instructorId)
        );
        const instructorName = instructor ? `${instructor.firstName} ${instructor.lastName}` : '';
        label = `${instrument} - ${day} ${time} with ${instructorName}`;
      } else if (regType === 'group') {
        const classTitle = registration.classTitle?.value || registration.classTitle || 'Class';
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
  #hideRegistrationSelector() {
    const selectorSection = document.getElementById('admin-registration-selector-section');
    if (selectorSection) {
      selectorSection.style.display = 'none';
    }
    this._selectedRegistrationToReplace = null;
  }
}
