/**
 * Parent Group Registration Component
 * Handles group class registration logic extracted from ParentRegistrationForm
 */

import { RegistrationType } from '/utils/values/registrationType.js';
import { TransportationType } from '/utils/values/transportationType.js';
import { DomHelpers } from '../../utilities/domHelpers.js';
import { formatClassNameWithGradeCorrection } from '../../utilities/classNameFormatter.js';
import { ClassManager } from '../../utilities/classManager.js';
import { formatTime } from '../../extensions/numberExtensions.js';
import { formatDisplayTime } from '../../utilities/registrationForm/timeHelpers.js';

import { validateBusTimeRestrictions } from '../../utilities/registrationForm/registrationValidator.js';
import {
  getOrCreateErrorContainer,
  showErrorMessage,
  clearErrorMessage,
  getOrCreateInfoContainer,
  showInfoMessage,
  clearInfoMessage,
} from '../../utilities/registrationForm/messageDisplay.js';
import { FORTE_PROGRAM_EMAIL } from '../../constants.js';
import { UserSession } from '../../auth/session.js';
import type {
  InstructorLike,
  StudentLike,
  ClassLike,
  RegistrationLike,
  RegistrationSubmitData,
} from '../../types/registrationTypes.js';

export interface ParentGroupRegistrationConfig {
  classes: ClassLike[];
  registrations: RegistrationLike[];
  nextTrimesterRegistrations: RegistrationLike[];
  students: StudentLike[];
  instructors: InstructorLike[];
  getSelectedStudentId: () => string | null;
  isEnrollmentPeriodActive: () => boolean;
  selectedPreviousRegistrationId: () => string | null;
  showConfirmationModal: (message: string, onConfirm: () => void) => void;
  showConflictModal: (message: string) => void;
  setButtonLoading: (button: HTMLButtonElement | null, isLoading: boolean) => void;
  onSubmitSuccess: () => void;
  sendDataFunction: (data: RegistrationSubmitData) => Promise<unknown>;
}

export class ParentGroupRegistration {
  private config: ParentGroupRegistrationConfig;

  constructor(config: ParentGroupRegistrationConfig) {
    this.config = config;
  }

  /**
   * Initialize the group registration component
   */
  initialize(): void {
    this.#attachGroupSubmitButtonListener();
  }

  /**
   * Update the configuration with partial values
   */
  updateConfig(partial: Partial<ParentGroupRegistrationConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  /**
   * Populate the parent classes dropdown with available classes
   */
  populateClassesDropdown(): void {
    const classSelect = document.getElementById('parent-class-select') as HTMLSelectElement | null;
    if (!classSelect || !this.config.classes) {
      console.warn('Parent class select not found or no classes available');
      return;
    }

    // Get selected student ID
    const studentSelect = document.getElementById(
      'parent-student-select'
    ) as HTMLSelectElement | null;
    const selectedStudentId = studentSelect?.value;

    if (!selectedStudentId) {
      console.warn('No student selected for class filtering');
      return;
    }

    // Get the selected student to access their grade
    const selectedStudent = this.config.students.find((s: StudentLike) => {
      // Handle both plain string IDs and value objects
      const studentId = s.id;
      return studentId && studentId.toString() === selectedStudentId.toString();
    });
    const studentGrade = selectedStudent?.grade;

    // Helper function to check grade eligibility
    // Grades are always numbers 0-8 (0 = Kindergarten, 1-8 = grades 1-8)
    const isGradeEligible = (
      studentGrade: number | string | null | undefined,
      minGrade: number | undefined,
      maxGrade: number | undefined
    ): boolean => {
      if (minGrade === undefined || maxGrade === undefined) return false;
      const gradeNum = Number(studentGrade);
      return gradeNum >= minGrade && gradeNum <= maxGrade;
    };

    // Filter classes where student is NOT already enrolled AND grade is eligible
    const availableClasses = this.config.classes.filter((cls: ClassLike) => {
      // First, filter out restricted classes using the database field
      if (cls.isRestricted) {
        return false;
      }

      // Filter by grade eligibility if student has a grade
      if (studentGrade !== null && studentGrade !== undefined) {
        const eligible = isGradeEligible(studentGrade, cls.minimumGrade, cls.maximumGrade);
        if (!eligible) {
          return false;
        }
      }

      // Check if student already has a group registration for this class
      const hasExistingRegistration = this.config.registrations.some(
        (registration: RegistrationLike) =>
          registration.studentId === selectedStudentId &&
          registration.classId === cls.id &&
          registration.registrationType === RegistrationType.GROUP
      );

      return !hasExistingRegistration;
    });

    // Destroy existing Materialize select instance before modifying
    if (typeof M !== 'undefined') {
      const existingInstance = M.FormSelect.getInstance(classSelect) as
        | { destroy(): void }
        | undefined;
      if (existingInstance) {
        existingInstance.destroy();
      }
    }

    // Clear existing options
    classSelect.innerHTML = '';

    // Create default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a class';
    classSelect.appendChild(defaultOption);

    // Add available class options only
    availableClasses.forEach((cls: ClassLike) => {
      const option = document.createElement('option');
      option.value = cls.id;
      option.textContent = ClassManager.formatClassNameWithTime(
        cls,
        formatClassNameWithGradeCorrection,
        formatTime as (time: string | undefined) => string
      );
      classSelect.appendChild(option);
    });

    // Show message if no classes available
    if (availableClasses.length === 0) {
      const noClassesOption = document.createElement('option');
      noClassesOption.value = '';
      noClassesOption.textContent =
        'No available classes (student already enrolled in all classes)';
      noClassesOption.disabled = true;
      classSelect.appendChild(noClassesOption);
    }

    // Add event listener for class selection
    classSelect.addEventListener('change', (event: Event) => {
      this.handleClassSelection((event.target as HTMLSelectElement).value);
    });

    // Initialize Materialize select
    if (typeof M !== 'undefined') {
      M.FormSelect.init(classSelect);
    }
  }

  /**
   * Handle class selection and check capacity
   */
  handleClassSelection(classId: string): void {
    const registerButton = document.getElementById(
      'parent-create-group-registration-btn'
    ) as HTMLButtonElement | null;
    // Get or create containers and clear previous states
    getOrCreateErrorContainer('parent-class-error-message', 'parent-class-select');
    getOrCreateInfoContainer('parent-class-info-message', 'parent-class-select');
    clearErrorMessage('parent-class-error-message');
    clearInfoMessage('parent-class-info-message');

    if (!classId) {
      // No class selected, disable button and reset text
      if (registerButton) {
        registerButton.disabled = true;
        registerButton.style.opacity = '0.6';

        // Reset button text to default
        const buttonTextElement = registerButton.querySelector('b');
        if (buttonTextElement) {
          buttonTextElement.textContent = 'Register for Class';
        }
      }
      return;
    }

    // Find the selected class
    const selectedClass = this.config.classes.find((cls: ClassLike) => cls.id === classId);
    if (!selectedClass) {
      console.warn('Selected class not found:', classId);
      return;
    }

    // Count current registrations for this class
    // During enrollment periods, count next trimester registrations
    // Outside enrollment periods, count current trimester
    const registrationsToCheck = this.config.isEnrollmentPeriodActive()
      ? this.config.nextTrimesterRegistrations || []
      : this.config.registrations;

    const currentRegistrations = registrationsToCheck.filter((reg: RegistrationLike) => {
      const regClassId = reg.classId;
      return regClassId === classId;
    });

    // Get class capacity (check multiple possible property names)
    const classCapacity = selectedClass.size;
    const hasACapacityDefined = classCapacity !== null && classCapacity !== undefined;

    if (!hasACapacityDefined) {
      // No capacity defined, assume unlimited
    }

    if (hasACapacityDefined && currentRegistrations.length >= classCapacity) {
      // Class is full
      showErrorMessage(
        'parent-class-error-message',
        `This class is full. Please email ${FORTE_PROGRAM_EMAIL} to be placed on the waitlist or to explore other options.`
      );
      if (registerButton) {
        registerButton.disabled = true;
        registerButton.style.opacity = '0.6';

        // Reset button text when disabled
        const buttonTextElement = registerButton.querySelector('b');
        if (buttonTextElement) {
          buttonTextElement.textContent = 'Register for Class';
        }
      }
    } else if (!hasACapacityDefined || classCapacity > 0) {
      // Class has space (or assume unlimited capacity)
      // Duplicate and time conflict checking is handled server-side by RegistrationService

      // Check if this is a special waitlist class (Rock Band classes)
      const isWaitlistClass = ClassManager.isRockBandClass(classId);
      if (isWaitlistClass) {
        // Show waitlist message for these special classes
        showInfoMessage('parent-class-info-message', 'You will be joining the wait list.', 'info');

        // Update button text for waitlist classes
        if (registerButton) {
          const buttonTextElement = registerButton.querySelector('b');
          if (buttonTextElement) {
            buttonTextElement.textContent = 'Join Wait List';
          }
        }
      } else {
        // Reset button text for regular classes
        if (registerButton) {
          const buttonTextElement = registerButton.querySelector('b');
          if (buttonTextElement) {
            buttonTextElement.textContent = 'Register for Class';
          }
        }
      }

      // No conflicts found, enable registration
      if (registerButton) {
        registerButton.disabled = false;
        registerButton.style.opacity = '1';
      }
    }
  }

  /**
   * Clear the group form after successful submission
   */
  clearForm(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    // Clear selects using consistent utility
    DomHelpers.resetMaterializeSelects(
      ['parent-class-select', 'parent-registration-type-select'],
      true
    );

    // Reset transportation type to default (pickup) for both forms
    const pickupRadio = document.querySelector(
      `input[name="parent-transportation-type"][value="${TransportationType.PICKUP}"]`
    ) as HTMLInputElement | null;
    if (pickupRadio) {
      pickupRadio.checked = true;
    }

    // Reset group transportation type to default (pickup)
    const groupPickupRadio = document.querySelector(
      `input[name="parent-group-transportation-type"][value="${TransportationType.PICKUP}"]`
    ) as HTMLInputElement | null;
    if (groupPickupRadio) {
      groupPickupRadio.checked = true;
    }

    // Clear any error messages
    clearErrorMessage('parent-class-error-message');

    // Disable register button again
    const registerButton = document.getElementById(
      'parent-create-group-registration-btn'
    ) as HTMLButtonElement | null;
    if (registerButton) {
      registerButton.disabled = true;
      registerButton.style.opacity = '0.6';

      // Reset button text to default
      const buttonTextElement = registerButton.querySelector('b');
      if (buttonTextElement) {
        buttonTextElement.textContent = 'Register for Class';
      }
    }
  }

  /**
   * Validate group registration data
   */
  #validateGroupRegistration(): boolean {
    // Check if student is selected (only if dropdown is visible for multiple students)
    const studentSection = document.getElementById('parent-student-selection-section');
    const studentSelect = document.getElementById(
      'parent-student-select'
    ) as HTMLSelectElement | null;
    const studentId = studentSelect?.value;

    // Only validate student selection if the section is visible (multiple students)
    if (studentSection && studentSection.style.display !== 'none' && !studentId) {
      M.toast({ html: 'Please select a student' });
      return false;
    }

    // For single student case, ensure there's still a student ID available
    if (!studentId) {
      M.toast({ html: 'No student available for registration' });
      return false;
    }

    // Check if class is selected
    const classSelect = document.getElementById('parent-class-select') as HTMLSelectElement | null;
    const classId = classSelect?.value;

    if (!classId) {
      M.toast({ html: 'Please select a class' });
      return false;
    }

    // Duplicate and time conflict checking is handled server-side by RegistrationService

    // Get the class details for bus validation
    const selectedClass = this.config.classes.find((cls: ClassLike) => cls.id === classId);

    if (selectedClass && selectedClass.day && selectedClass.startTime && selectedClass.length) {
      // Check bus time restrictions for Late Bus transportation
      const transportationTypeRadio = document.querySelector(
        'input[name="parent-group-transportation-type"]:checked'
      ) as HTMLInputElement | null;
      const transportationType = transportationTypeRadio?.value || TransportationType.PICKUP;

      const busValidation = validateBusTimeRestrictions(
        selectedClass.day,
        selectedClass.startTime,
        selectedClass.length,
        transportationType
      );

      if (!busValidation.isValid) {
        console.log('Group validation failed: Bus time restriction violated');
        M.toast({ html: busValidation.errorMessage || '' });
        return false;
      }
    }

    return true;
  }

  /**
   * Get group registration data for submission
   */
  #getCreateGroupRegistrationData(): RegistrationSubmitData {
    // Get selected student ID
    const studentSelect = document.getElementById(
      'parent-student-select'
    ) as HTMLSelectElement | null;
    const studentId = studentSelect?.value;

    if (!studentId) {
      throw new Error('Please select a student');
    }

    // Get selected class ID
    const classSelect = document.getElementById('parent-class-select') as HTMLSelectElement | null;
    const classId = classSelect?.value;

    if (!classId) {
      throw new Error('Please select a class');
    }

    // Find the selected class to get its details
    const selectedClass = this.config.classes.find((cls: ClassLike) => cls.id === classId);

    if (!selectedClass) {
      throw new Error('Selected class not found');
    }

    // Get selected transportation type (for group registration)
    const transportationTypeRadio = document.querySelector(
      'input[name="parent-group-transportation-type"]:checked'
    ) as HTMLInputElement | null;
    const transportationType = transportationTypeRadio?.value || TransportationType.PICKUP; // Default to pickup if not selected

    // Determine the target trimester
    const appConfig = UserSession?.getAppConfig?.();
    const trimester = this.config.isEnrollmentPeriodActive()
      ? appConfig?.nextTrimester
      : appConfig?.currentTrimester;

    const registrationData: RegistrationSubmitData = {
      studentId: studentId,
      registrationType: RegistrationType.GROUP,
      transportationType: transportationType,
      classId: classId,
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
      roomId: selectedClass.roomId,
      trimester: trimester ?? undefined,
    };

    // If modifying an existing registration during enrollment, include the ID to trigger deletion
    // But do NOT add linkedPreviousRegistrationId to the new registration - that's only for migrations
    if (this.config.isEnrollmentPeriodActive() && this.config.selectedPreviousRegistrationId()) {
      registrationData.replaceRegistrationId = this.config.selectedPreviousRegistrationId()!;
    }

    return registrationData;
  }

  /**
   * Attach event listener to group registration submit button
   */
  #attachGroupSubmitButtonListener(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const groupSubmitButton = document.getElementById('parent-create-group-registration-btn');
    if (groupSubmitButton) {
      // Remove existing onclick if any
      groupSubmitButton.removeAttribute('onclick');

      groupSubmitButton.addEventListener('click', async event => {
        event.preventDefault();

        if (!this.#validateGroupRegistration()) {
          return;
        }

        // Show confirmation modal before proceeding
        const registrationData = this.#getCreateGroupRegistrationData();
        let confirmationMessage;
        if (ClassManager.isRockBandClass(registrationData.classId || '')) {
          confirmationMessage = this.#buildWaitlistClassConfirmationMessage(registrationData);
        } else {
          confirmationMessage = this.#buildGroupClassConfirmationMessage(registrationData);
        }

        this.config.showConfirmationModal(confirmationMessage, async () => {
          const confirmButton = document.getElementById(
            'parent-confirmation-confirm'
          ) as HTMLButtonElement | null;
          try {
            this.config.setButtonLoading(confirmButton, true);
            await this.config.sendDataFunction(registrationData);
            this.clearForm();
            this.config.onSubmitSuccess();
            M.toast({
              html: ClassManager.isRockBandClass(registrationData.classId || '')
                ? 'Wait list joined.'
                : 'Group registration created successfully!',
            });
          } catch (err: unknown) {
            const error = err as Error & { type?: string };
            console.error('Error creating group registration:', error);
            if (error.type === 'conflict') {
              this.config.showConflictModal(error.message);
            } else {
              M.toast({ html: `Error creating group registration: ${error.message}` });
            }
          } finally {
            this.config.setButtonLoading(confirmButton, false);
          }
        });
      });
    } else {
      console.warn('Parent group submit button not found');
    }
  }

  /**
   * Build confirmation message for group class registration
   */
  #buildGroupClassConfirmationMessage(registrationData: RegistrationSubmitData): string {
    const studentSelect = document.getElementById(
      'parent-student-select'
    ) as HTMLSelectElement | null;
    const studentName = studentSelect?.selectedOptions[0]?.textContent || 'your child';

    // Find class details
    const selectedClass = this.config.classes.find(
      (cls: ClassLike) => cls.id === registrationData.classId
    );
    const className = selectedClass
      ? formatClassNameWithGradeCorrection(selectedClass)
      : 'the class';

    // Find instructor name
    const instructor = this.config.instructors.find(
      (inst: InstructorLike) => inst.id === registrationData.instructorId
    );
    const instructorName = instructor?.fullName || 'the instructor';

    // Format time
    const timeFormatted = formatDisplayTime(registrationData.startTime || '');

    // Format transportation type
    const transportationDisplay =
      registrationData.transportationType === TransportationType.BUS ? 'Late Bus' : 'Late Pick Up';

    return `
      <strong>Are you sure you want to register ${studentName} for this group class?</strong>
      <br><br>
      <strong>Class Details:</strong><br>
      • <strong>Class:</strong> ${className}<br>
      • <strong>Instructor:</strong> ${instructorName}<br>
      • <strong>Day:</strong> ${registrationData.day}<br>
      • <strong>Time:</strong> ${timeFormatted}<br>
      • <strong>Duration:</strong> ${registrationData.length} minutes<br>
      • <strong>Transportation:</strong> ${transportationDisplay}
      <br><br>
      <p>If you need to change or cancel this class, please contact ${FORTE_PROGRAM_EMAIL}. The last day to cancel classes without charge is August 29th. After this date, all classes will be billed in full for the Fall Trimester.</p>

      <p><strong>Absence and Cancellation Policy:</strong></p>

      <p>Classes missed due to student absence are charged in full except in the case of school-sponsored field trips or religious holidays. Sports practices or games are not considered school-sponsored activities.</p>

      <p>There will be no charge for classes canceled by instructors. There are no makeup classes.</p>

      <p>Please notify your instructor at least 24 hours in advance of any student absence when possible. Additionally, notify FORTE staff of student absences at ${FORTE_PROGRAM_EMAIL}.</p>

      <p>Instructor cancellations will be communicated to parents/guardians via phone or email at least 24 hours in advance whenever possible. Same-day cancellations by instructors will result in no charge for PM care.</p>

      <p><strong>By confirming, you acknowledge that you have read and agree to these terms and conditions.</strong></p>
    `;
  }

  /**
   * Build confirmation message for waitlist group class registration (Rock Band classes)
   */
  #buildWaitlistClassConfirmationMessage(registrationData: RegistrationSubmitData): string {
    const studentSelect = document.getElementById(
      'parent-student-select'
    ) as HTMLSelectElement | null;
    const _studentName = studentSelect?.selectedOptions[0]?.textContent || 'your child';

    // Find class details
    const selectedClass = this.config.classes.find(
      (cls: ClassLike) => cls.id === registrationData.classId
    );
    const className = selectedClass
      ? formatClassNameWithGradeCorrection(selectedClass)
      : 'the class';

    // Find instructor name
    const instructor = this.config.instructors.find(
      (inst: InstructorLike) => inst.id === registrationData.instructorId
    );
    const instructorName = instructor?.fullName || 'the instructor';

    // Format time
    const _timeFormatted = formatDisplayTime(registrationData.startTime || '');

    // Format transportation type
    const transportationDisplay =
      registrationData.transportationType === TransportationType.BUS ? 'Late Bus' : 'Late Pick Up';

    return `
      <strong>All new registrations for Rock Band are put on a waitlist and then assigned to one of the three Rock Band classes (class meeting times below). We at FORTE work with the Rock Band teacher, Paul Montes, to match students to the Rock Band that is right for them based on skill level, ensemble dynamics, and current Rock Band instrument needs.</strong>
      <br><br>
      <strong>Class Details:</strong><br>
      • <strong>Class:</strong> ${className}<br>
      • <strong>Instructor:</strong> ${instructorName}<br>
      • <strong>Possible Class Times:</strong> Monday 3-4 PM or Monday 4-5 PM or Friday 3-4 PM<br>
      • <strong>Transportation:</strong> ${transportationDisplay}
      <br><br>
      <p>You will be notified by email when a spot has been found for your student. If you need to change or cancel this wait list registration, please contact ${FORTE_PROGRAM_EMAIL}.</p>

      <p><strong>Absence and Cancellation Policy:</strong></p>

      <p>Classes missed due to student absence are charged in full except in the case of school-sponsored field trips or religious holidays. Sports practices or games are not considered school-sponsored activities.</p>

      <p>There will be no charge for classes canceled by instructors. There are no makeup classes.</p>

      <p>Please notify your instructor at least 24 hours in advance of any student absence when possible. Additionally, notify FORTE staff of student absences at ${FORTE_PROGRAM_EMAIL}.</p>

      <p>Instructor cancellations will be communicated to parents/guardians via phone or email at least 24 hours in advance whenever possible. Same-day cancellations by instructors will result in no charge for PM care.</p>

      <p><strong>By confirming, you acknowledge that you understand this is a wait list registration and that you have read and agree to these terms and conditions.</strong></p>
    `;
  }
}
