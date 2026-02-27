/**
 * Parent Private Submission Component
 * Handles private lesson registration validation and submission,
 * extracted from ParentRegistrationForm.
 */

import { RegistrationType } from '/utils/values/registrationType.js';
import {
  formatDisplayTime,
} from '../../utilities/registrationForm/timeHelpers.js';
import {
  validateBusTimeRestrictions,
} from '../../utilities/registrationForm/registrationValidator.js';
import { FORTE_PROGRAM_EMAIL } from '../../constants.js';
import type {
  InstructorLike,
  RegistrationLike,
  RegistrationSubmitData,
  TimeSlot,
} from '../../types/registrationTypes.js';

export interface ParentPrivateSubmissionConfig {
  instructors: InstructorLike[];
  getSelectedLesson: () => TimeSlot | null;
  setSelectedLesson: (slot: TimeSlot | null) => void;
  isEnrollmentPeriodActive: () => boolean;
  selectedPreviousRegistrationId: () => string | null;
  showConfirmationModal: (message: string, onConfirm: () => void) => void;
  showConflictModal: (message: string) => void;
  setButtonLoading: (button: HTMLButtonElement | null, isLoading: boolean) => void;
  onSubmitSuccess: () => void;
  sendDataFunction: (data: RegistrationSubmitData) => Promise<unknown>;
}

export class ParentPrivateSubmission {
  private config: ParentPrivateSubmissionConfig;

  constructor(config: ParentPrivateSubmissionConfig) {
    this.config = config;
  }

  /**
   * Initialize the private submission component
   */
  initialize(): void {
    this.#attachSubmitButtonListener();
  }

  /**
   * Update the configuration with partial values
   */
  updateConfig(partial: Partial<ParentPrivateSubmissionConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  /**
   * Attach event listener to submit button
   */
  #attachSubmitButtonListener(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const submitButton = document.getElementById('parent-confirm-registration-btn');
    if (submitButton) {
      // Remove existing onclick if any
      submitButton.removeAttribute('onclick');

      submitButton.addEventListener('click', async event => {
        event.preventDefault();

        if (!this.#validateRegistration()) {
          return;
        }

        // Show confirmation modal before proceeding
        const registrationData = this.#getCreateRegistrationData();
        if (!registrationData) return;
        const confirmationMessage = this.#buildPrivateLessonConfirmationMessage(registrationData);

        this.config.showConfirmationModal(confirmationMessage, async () => {
          const submitButton = document.getElementById('parent-confirm-registration-btn') as HTMLButtonElement | null;
          try {
            this.config.setButtonLoading(submitButton, true);
            await this.config.sendDataFunction(registrationData);
            this.config.onSubmitSuccess();
            M.toast({ html: 'Registration created successfully!' });
          } catch (err: unknown) {
            const error = err as Error & { type?: string };
            console.error('Error creating registration:', error);
            if (error.type === 'conflict') {
              this.config.showConflictModal(error.message);
            } else {
              M.toast({ html: `Error creating registration: ${error.message}` });
            }
          } finally {
            this.config.setButtonLoading(submitButton, false);
          }
        });
      });
    } else {
      console.warn('Parent submit button not found');
    }
  }

  /**
   * Validate registration data
   */
  #validateRegistration(): boolean {
    const selectedLesson = this.config.getSelectedLesson();

    // Check if student is selected (only if dropdown is visible for multiple students)
    const studentSection = document.getElementById('parent-student-selection-section');
    const studentSelect = document.getElementById('parent-student-select') as HTMLSelectElement | null;
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

    if (!selectedLesson) {
      // TODO: This DOM fallback compensates for selectedLesson being null when it should not be — likely a race condition or event handler not firing in the timeslot selection lifecycle. The root cause requires separate investigation (out of scope).

      // Check if there's a selected time slot in the DOM as fallback
      const selectedSlots = document.querySelectorAll('.timeslot.selected');

      if (selectedSlots.length === 1) {
        // Try to rebuild selectedLesson from DOM state
        const slot = selectedSlots[0] as HTMLElement;
        const instructorId = slot.dataset.instructorId;
        const day = slot.dataset.day;
        const time = slot.dataset.time;
        const length = slot.dataset.length;
        const instrument = slot.dataset.instrument;

        if (instructorId && day && time && length && instrument) {
          this.config.setSelectedLesson({
            instructorId: instructorId,
            day: day,
            time: time,
            length: parseInt(length),
            instrument: instrument,
          });
        } else {
          M.toast({ html: 'Please select a lesson time slot' });
          return false;
        }
      } else if (selectedSlots.length > 1) {
        M.toast({ html: 'Multiple time slots selected. Please select only one.' });
        return false;
      } else {
        M.toast({ html: 'Please select a lesson time slot' });
        return false;
      }
    }

    // Re-read after potential DOM rebuild
    const currentLesson = this.config.getSelectedLesson();

    // Additional validation of selectedLesson data
    if (
      !currentLesson ||
      !currentLesson.instructorId ||
      !currentLesson.day ||
      !currentLesson.time
    ) {
      M.toast({ html: 'Selected lesson is incomplete. Please select again.' });
      this.config.setSelectedLesson(null); // Clear invalid selection
      return false;
    }

    // Time conflict checking is handled server-side by RegistrationService

    // Check bus time restrictions for Late Bus transportation
    const dayName =
      currentLesson.day.charAt(0).toUpperCase() + currentLesson.day.slice(1);
    const transportationTypeRadio = document.querySelector(
      'input[name="parent-transportation-type"]:checked'
    ) as HTMLInputElement | null;
    const transportationType = transportationTypeRadio?.value || 'pickup';

    const busValidation = validateBusTimeRestrictions(
      dayName,
      currentLesson.time,
      currentLesson.length,
      transportationType
    );

    if (!busValidation.isValid) {
      M.toast({ html: busValidation.errorMessage || '' });
      return false;
    }

    return true;
  }

  /**
   * Get registration data for submission
   */
  #getCreateRegistrationData(): RegistrationSubmitData | null {
    const selectedLesson = this.config.getSelectedLesson();
    if (!selectedLesson) {
      return null;
    }

    // Get selected student ID
    const studentSelect = document.getElementById('parent-student-select') as HTMLSelectElement | null;
    const studentId = studentSelect?.value;

    if (!studentId) {
      throw new Error('Please select a student');
    }

    // Get selected transportation type
    const transportationTypeRadio = document.querySelector(
      'input[name="parent-transportation-type"]:checked'
    ) as HTMLInputElement | null;
    const transportationType = transportationTypeRadio?.value || 'pickup'; // Default to pickup if not selected

    const dayMap: Record<string, string> = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
    };

    // Determine the target trimester
    const appConfig = window.UserSession?.getAppConfig?.();
    const trimester = this.config.isEnrollmentPeriodActive()
      ? appConfig?.nextTrimester
      : appConfig?.currentTrimester;

    const registrationData: RegistrationSubmitData = {
      studentId: studentId,
      registrationType: RegistrationType.PRIVATE,
      transportationType: transportationType,
      instructorId: selectedLesson.instructorId,
      instrument: selectedLesson.instrument,
      day: dayMap[selectedLesson.day],
      startTime: selectedLesson.time,
      length: selectedLesson.length,
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
   * Build confirmation message for private lesson registration
   */
  #buildPrivateLessonConfirmationMessage(registrationData: RegistrationSubmitData): string {
    const studentSelect = document.getElementById('parent-student-select') as HTMLSelectElement | null;
    const studentName = studentSelect?.selectedOptions[0]?.textContent || 'your child';

    // Find instructor name
    const instructor = this.config.instructors.find((inst: InstructorLike) => inst.id === registrationData.instructorId);
    const instructorName = instructor
      ? `${instructor.firstName} ${instructor.lastName}`
      : 'the instructor';

    // Format time
    const timeFormatted = formatDisplayTime(registrationData.startTime || '');

    // Format transportation type
    const transportationDisplay =
      registrationData.transportationType === 'bus' ? 'Late Bus' : 'Late Pick Up';

    return `
      <strong>Are you sure you want to register ${studentName} for a private lesson?</strong>
      <br><br>
      <strong>Lesson Details:</strong><br>
      • <strong>Instructor:</strong> ${instructorName}<br>
      • <strong>Instrument:</strong> ${registrationData.instrument}<br>
      • <strong>Day:</strong> ${registrationData.day}<br>
      • <strong>Time:</strong> ${timeFormatted}<br>
      • <strong>Duration:</strong> ${registrationData.length} minutes<br>
      • <strong>Transportation:</strong> ${transportationDisplay}
      <br><br>
      <p>If you need to change or cancel this registration, please contact ${FORTE_PROGRAM_EMAIL}. The last day to cancel registrations without charge is August 29th. After this date, all registrations will be billed in full for the Fall Trimester.</p>

      <p><strong>Absence and Cancellation Policy:</strong></p>

      <p>Lessons missed due to student absence are charged in full except in the case of school-sponsored field trips or religious holidays. Sports practices or games are not considered school-sponsored activities.</p>

      <p>There will be no charge for lessons canceled by instructors unless the instructor schedules a make-up lesson at a later date.</p>

      <p>Instructors are encouraged to schedule make-up lessons for lessons they have missed; however, as they are working professionals in their fields, make-up lessons may not always be possible. The scheduling of make-up lessons will be at the instructor's discretion.</p>

      <p>Please notify your instructor at least 24 hours in advance of any student absence when possible. Additionally, notify FORTE staff of student absences at ${FORTE_PROGRAM_EMAIL}.</p>

      <p>Instructor cancellations will be communicated to parents/guardians via phone or email at least 24 hours in advance whenever possible. Same-day cancellations by instructors will result in no charge for PM care.</p>

      <p><strong>By confirming, you acknowledge that you have read and agree to these terms and conditions.</strong></p>
    `;
  }
}
