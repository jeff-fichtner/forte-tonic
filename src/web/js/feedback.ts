/**
 * Feedback Module
 * Captures application state and sends user feedback to the server
 */

import { HttpService } from './data/httpService.js';
import { ServerFunctions } from './constants.js';

interface FeedbackState {
  timestamp: string;
  url: string;
  userAgent: string;
  screenResolution: string;
  viewportSize: string;
  currentUser?: {
    email: unknown;
    isAdmin: boolean;
    isInstructor: boolean;
    isParent: boolean;
    adminId: unknown;
    instructorId: unknown;
    parentId: unknown;
  };
  currentSection?: unknown;
  dataCounts?: {
    students: number;
    instructors: number;
    classes: number;
    registrations: number;
    nextTrimesterRegistrations: number;
  };
  selectedTrimester?: unknown;
  currentPeriod?: {
    periodType: unknown;
    trimester: unknown;
  };
  parentRegistrationForm?: {
    selectedLesson: {
      instructorId: unknown;
      instrument: unknown;
      day: unknown;
      time: unknown;
      length: unknown;
    } | null;
    selectedPreviousRegistrationId: unknown;
  };
}

interface FeedbackData {
  message: string;
  state: FeedbackState;
}

interface FeedbackViewModel {
  [key: string]: unknown;
}

export class FeedbackManager {
  private viewModel: FeedbackViewModel;

  constructor(viewModel: FeedbackViewModel) {
    this.viewModel = viewModel;
    this.#initializeFeedbackButton();
  }

  /**
   * Initialize the feedback button and modal
   */
  #initializeFeedbackButton(): void {
    // Initialize modal
    const feedbackModal = document.getElementById('feedback-modal');
    if (feedbackModal && window.M) {
      window.M.Modal.init(feedbackModal);
    }

    // Attach submit handler
    const submitBtn = document.getElementById('feedback-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', async (e: Event) => {
        e.preventDefault();
        await this.#handleFeedbackSubmit();
      });
    }
  }

  /**
   * Capture current application state
   * @returns {object} Captured state data
   */
  #captureState(): FeedbackState {
    const state: FeedbackState = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    };

    // Capture user info if available
    if (this.viewModel?.currentUser) {
      const currentUser = this.viewModel.currentUser as Record<string, unknown>;
      state.currentUser = {
        email: currentUser.email,
        isAdmin: !!(currentUser.admin),
        isInstructor: !!(currentUser.instructor),
        isParent: !!(currentUser.parent),
        adminId: (currentUser.admin as Record<string, unknown> | undefined)?.id,
        instructorId: (currentUser.instructor as Record<string, unknown> | undefined)?.id,
        parentId: (currentUser.parent as Record<string, unknown> | undefined)?.id,
      };
    }

    // Capture current section/tab
    if (this.viewModel?.navTabs) {
      const navTabs = this.viewModel.navTabs as Record<string, unknown>;
      if (navTabs.currentSection) {
        state.currentSection = navTabs.currentSection;
      }
    }

    // Capture counts of key data
    if (this.viewModel) {
      state.dataCounts = {
        students: (this.viewModel.students as unknown[] | undefined)?.length || 0,
        instructors: (this.viewModel.instructors as unknown[] | undefined)?.length || 0,
        classes: (this.viewModel.classes as unknown[] | undefined)?.length || 0,
        registrations: (this.viewModel.registrations as unknown[] | undefined)?.length || 0,
        nextTrimesterRegistrations: (this.viewModel.nextTrimesterRegistrations as unknown[] | undefined)?.length || 0,
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
      const form = this.viewModel.parentRegistrationForm as Record<string, unknown>;
      const selectedLesson = form.selectedLesson as Record<string, unknown> | null | undefined;
      state.parentRegistrationForm = {
        selectedLesson: selectedLesson
          ? {
              instructorId: selectedLesson.instructorId,
              instrument: selectedLesson.instrument,
              day: selectedLesson.day,
              time: selectedLesson.time,
              length: selectedLesson.length,
            }
          : null,
        selectedPreviousRegistrationId:
          (form as Record<string, unknown>)._selectedPreviousRegistrationId || null,
      };
    }

    return state;
  }

  /**
   * Handle feedback form submission
   */
  async #handleFeedbackSubmit(): Promise<void> {
    const messageInput = document.getElementById('feedback-message') as HTMLTextAreaElement | null;
    const submitBtn = document.getElementById('feedback-submit-btn');
    const feedbackModalEl = document.getElementById('feedback-modal');
    const modal = feedbackModalEl ? window.M.Modal.getInstance(feedbackModalEl) : undefined;

    if (!messageInput || !submitBtn) return;

    // Disable button during submission
    submitBtn.classList.add('disabled');

    try {
      const feedbackData: FeedbackData = {
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
      modal?.close();
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
