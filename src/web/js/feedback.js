/**
 * Feedback Module
 * Captures application state and sends user feedback to the server
 */

import { HttpService } from './data/httpService.js';
import { ServerFunctions } from './constants.js';

export class FeedbackManager {
  constructor(viewModel) {
    this.viewModel = viewModel;
    this.#initializeFeedbackButton();
  }

  /**
   * Initialize the feedback button and modal
   */
  #initializeFeedbackButton() {
    // Initialize modal
    const feedbackModal = document.getElementById('feedback-modal');
    if (feedbackModal && window.M) {
      window.M.Modal.init(feedbackModal);
    }

    // Attach submit handler
    const submitBtn = document.getElementById('feedback-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', async e => {
        e.preventDefault();
        await this.#handleFeedbackSubmit();
      });
    }
  }

  /**
   * Capture current application state
   * @returns {object} Captured state data
   */
  #captureState() {
    const state = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    };

    // Capture user info if available
    if (this.viewModel?.currentUser) {
      state.currentUser = {
        email: this.viewModel.currentUser.email,
        isAdmin: !!this.viewModel.currentUser.admin,
        isInstructor: !!this.viewModel.currentUser.instructor,
        isParent: !!this.viewModel.currentUser.parent,
        adminId: this.viewModel.currentUser.admin?.id,
        instructorId: this.viewModel.currentUser.instructor?.id,
        parentId: this.viewModel.currentUser.parent?.id,
      };
    }

    // Capture current section/tab
    if (this.viewModel?.navTabs?.currentSection) {
      state.currentSection = this.viewModel.navTabs.currentSection;
    }

    // Capture counts of key data
    if (this.viewModel) {
      state.dataCounts = {
        students: this.viewModel.students?.length || 0,
        instructors: this.viewModel.instructors?.length || 0,
        classes: this.viewModel.classes?.length || 0,
        registrations: this.viewModel.registrations?.length || 0,
        nextTrimesterRegistrations: this.viewModel.nextTrimesterRegistrations?.length || 0,
      };
    }

    // Capture selected trimester
    if (this.viewModel?.selectedTrimester) {
      state.selectedTrimester = this.viewModel.selectedTrimester;
    }

    // Capture current period info
    if (window.UserSession?.getCurrentPeriod) {
      const period = window.UserSession.getCurrentPeriod();
      if (period) {
        state.currentPeriod = {
          periodType: period.periodType,
          trimester: period.trimester,
        };
      }
    }

    // Capture parent registration form state if exists
    if (this.viewModel?.parentRegistrationForm) {
      state.parentRegistrationForm = {
        selectedLesson: this.viewModel.parentRegistrationForm.selectedLesson
          ? {
              instructorId: this.viewModel.parentRegistrationForm.selectedLesson.instructorId,
              instrument: this.viewModel.parentRegistrationForm.selectedLesson.instrument,
              day: this.viewModel.parentRegistrationForm.selectedLesson.day,
              time: this.viewModel.parentRegistrationForm.selectedLesson.time,
              length: this.viewModel.parentRegistrationForm.selectedLesson.length,
            }
          : null,
        selectedPreviousRegistrationId:
          this.viewModel.parentRegistrationForm._selectedPreviousRegistrationId || null,
      };
    }

    return state;
  }

  /**
   * Handle feedback form submission
   */
  async #handleFeedbackSubmit() {
    const messageInput = document.getElementById('feedback-message');
    const submitBtn = document.getElementById('feedback-submit-btn');
    const modal = window.M.Modal.getInstance(document.getElementById('feedback-modal'));

    // Disable button during submission
    submitBtn.classList.add('disabled');

    try {
      const feedbackData = {
        message: messageInput.value.trim(),
        state: this.#captureState(),
      };

      // Send to server
      await HttpService.post(ServerFunctions.submitFeedback, feedbackData);

      // Success toast
      window.M.toast({
        html: '<i class="material-icons left">check_circle</i>Feedback submitted successfully! Thank you.',
        classes: 'green',
        displayLength: 4000,
      });

      // Clear form and close modal
      messageInput.value = '';
      window.M.updateTextFields(); // Update Materialize labels
      modal.close();
    } catch (error) {
      console.error('Error submitting feedback:', error);

      // Error toast
      window.M.toast({
        html: '<i class="material-icons left">error</i>Failed to submit feedback. Please try again.',
        classes: 'red',
        displayLength: 4000,
      });
    } finally {
      // Re-enable button
      submitBtn.classList.remove('disabled');
    }
  }
}
