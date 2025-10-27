/**
 * Admin Registration Form - Refactored to use shared components
 * Simplified progressive filters without restrictions
 */

import { RegistrationType } from '../../../utils/values/registrationType.js';
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

    // Initialize form components
    this.#initializeComponents();
    this.#attachSubmitButtonListener();
  }

  /**
   * Set the trimester context for new registrations
   * @param {string} trimester - The trimester ('fall', 'winter', 'spring')
   */
  setTrimester(trimester) {
    this.selectedTrimester = trimester;
    console.log(`Admin registration form trimester set to: ${trimester}`);
  }

  /**
   * Initialize all form components
   */
  #initializeComponents() {
    // Student selector
    this.studentSelector = new StudentSelector('student-autocomplete-input', this.students);

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
        console.log('Admin validation failed: Bus time restriction violated');
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

    if (registrationType === RegistrationType.GROUP) {
      const selectedClass = this.classSelector.getSelectedClass();

      if (!selectedClass) {
        throw new Error(RegistrationFormText.ERROR_INVALID_CLASS);
      }

      return {
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
    }

    // For private lessons
    if (registrationType === RegistrationType.PRIVATE) {
      const dayValue = this.lessonDetailsForm.getSelectedDayValue();
      const dayName = this.lessonDetailsForm.getSelectedDayName();
      const startTime = this.lessonDetailsForm.getSelectedTime();
      const length = this.lessonDetailsForm.getSelectedLength();
      const instrument = this.lessonDetailsForm.getSelectedInstrument();

      return {
        studentId: studentId,
        registrationType: registrationType,
        transportationType: transportationType,
        instructorId: this.instructorSelector.getSelectedInstructorId(),
        day: dayName,
        startTime: startTime,
        length: length,
        instrument: instrument,
      };
    }

    return {
      studentId: studentId,
      registrationType: registrationType,
    };
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
  }
}
