/**
 * Drop Request Modal Component
 * ===============================
 *
 * Modal for parents to submit drop requests for lessons.
 * Validates reason input and submits to backend API.
 */

import { HttpService } from '/data/httpService.js';
import { DropRequestStatus } from '/utils/values/dropRequestStatus.js';

export class DropRequestModal {
  /**
   * Create and show a drop request modal
   * @param {object} registration - Registration object to drop
   * @param {object} options - Optional callbacks
   * @param {function} options.onSuccess - Called when request submitted successfully
   * @param {function} options.onError - Called on error
   */
  constructor(registration, options = {}) {
    this.registration = registration;
    this.onSuccess = options.onSuccess || (() => {});
    this.onError = options.onError || (error => console.error('Drop request error:', error));

    this.modalElement = null;
    this.reasonTextarea = null;
    this.charCounter = null;
    this.submitButton = null;
    this.isSubmitting = false;

    this.MIN_REASON_LENGTH = 10;
    this.MAX_REASON_LENGTH = 500;

    this.#createModal();
    this.#attachEventListeners();
    this.show();
  }

  /**
   * Create the modal DOM structure
   */
  #createModal() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'dropRequestModalOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'dropRequestModal';
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      transform: translateY(-20px);
      transition: transform 0.3s ease;
    `;

    // Create modal content
    modal.innerHTML = `
      <div style="padding: 24px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 20px; color: #1a202c;">Request to Drop Lesson</h2>
          <button id="dropRequestModalClose" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #718096;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">&times;</button>
        </div>

        <!-- Registration Details -->
        <div style="background: #f7fafc; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
          <div style="margin-bottom: 8px;">
            <strong style="color: #2d3748;">Student:</strong>
            <span id="dropRequestStudentName" style="color: #4a5568;"></span>
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #2d3748;">Lesson:</strong>
            <span id="dropRequestLessonDetails" style="color: #4a5568;"></span>
          </div>
          <div>
            <strong style="color: #2d3748;">Schedule:</strong>
            <span id="dropRequestSchedule" style="color: #4a5568;"></span>
          </div>
        </div>

        <!-- Reason Input -->
        <div style="margin-bottom: 20px;">
          <label for="dropRequestReason" style="
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            color: #2d3748;
          ">
            Reason for drop request <span style="color: #e53e3e;">*</span>
          </label>
          <textarea
            id="dropRequestReason"
            placeholder="Please explain why you'd like to drop this lesson..."
            style="
              width: 100%;
              min-height: 120px;
              padding: 12px;
              border: 2px solid #e2e8f0;
              border-radius: 6px;
              font-family: inherit;
              font-size: 14px;
              resize: vertical;
              transition: border-color 0.2s;
              box-sizing: border-box;
            "
          ></textarea>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <span id="dropRequestCharCount" style="font-size: 13px; color: #718096;">
              0 / ${this.MAX_REASON_LENGTH} characters
            </span>
            <span id="dropRequestReasonError" style="font-size: 13px; color: #e53e3e; display: none;"></span>
          </div>
        </div>

        <!-- Buttons -->
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="dropRequestCancelBtn" style="
            padding: 10px 20px;
            border: 1px solid #cbd5e0;
            background: white;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
          ">Cancel</button>
          <button id="dropRequestSubmitBtn" style="
            padding: 10px 20px;
            border: none;
            background: #3182ce;
            color: white;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span id="dropRequestSubmitText">Submit Request</span>
            <span id="dropRequestSpinner" style="
              display: none;
              width: 16px;
              height: 16px;
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-top-color: white;
              border-radius: 50%;
              animation: spin 0.6s linear infinite;
            "></span>
          </button>
        </div>
      </div>
    `;

    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      #dropRequestReason:focus {
        outline: none;
        border-color: #3182ce;
      }
      #dropRequestSubmitBtn:hover:not(:disabled) {
        background: #2c5282;
      }
      #dropRequestSubmitBtn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      #dropRequestCancelBtn:hover {
        background: #f7fafc;
      }
    `;
    document.head.appendChild(style);

    overlay.appendChild(modal);
    this.modalElement = overlay;

    // Store references to interactive elements
    this.reasonTextarea = modal.querySelector('#dropRequestReason');
    this.charCounter = modal.querySelector('#dropRequestCharCount');
    this.reasonError = modal.querySelector('#dropRequestReasonError');
    this.submitButton = modal.querySelector('#dropRequestSubmitBtn');
    this.submitText = modal.querySelector('#dropRequestSubmitText');
    this.spinner = modal.querySelector('#dropRequestSpinner');
    this.closeButton = modal.querySelector('#dropRequestModalClose');
    this.cancelButton = modal.querySelector('#dropRequestCancelBtn');

    // Populate registration details
    this.#populateRegistrationDetails(modal);
  }

  /**
   * Populate registration details in the modal
   */
  #populateRegistrationDetails(modal) {
    const studentName = modal.querySelector('#dropRequestStudentName');
    const lessonDetails = modal.querySelector('#dropRequestLessonDetails');
    const schedule = modal.querySelector('#dropRequestSchedule');

    // Format student name
    const student = this.registration.student || {};
    studentName.textContent =
      `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown Student';

    // Format lesson details
    const instructor = this.registration.instructor || {};
    const instructorName =
      `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim() || 'Unknown Instructor';
    lessonDetails.textContent = `${this.registration.instrument || 'Unknown'} with ${instructorName}`;

    // Format schedule
    const day = this.registration.day || 'Unknown Day';
    const startTime = this.registration.startTime || '';
    const length = this.registration.length || '';
    schedule.textContent = `${day} ${startTime}${length ? ` (${length} min)` : ''}`;
  }

  /**
   * Attach event listeners
   */
  #attachEventListeners() {
    // Close button
    this.closeButton.addEventListener('click', () => this.close());
    this.cancelButton.addEventListener('click', () => this.close());

    // Click outside to close
    this.modalElement.addEventListener('click', e => {
      if (e.target === this.modalElement) {
        this.close();
      }
    });

    // Escape key to close
    this.escapeHandler = e => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);

    // Reason textarea character counter and validation
    this.reasonTextarea.addEventListener('input', () => {
      this.#updateCharCounter();
      this.#validateReason();
    });

    // Submit button
    this.submitButton.addEventListener('click', () => this.#handleSubmit());

    // Enter key in textarea submits if reason is valid
    this.reasonTextarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.ctrlKey) {
        this.#handleSubmit();
      }
    });
  }

  /**
   * Update character counter
   */
  #updateCharCounter() {
    const length = this.reasonTextarea.value.length;
    this.charCounter.textContent = `${length} / ${this.MAX_REASON_LENGTH} characters`;

    // Change color if approaching limit
    if (length > this.MAX_REASON_LENGTH * 0.9) {
      this.charCounter.style.color = '#e53e3e';
    } else if (length > this.MAX_REASON_LENGTH * 0.7) {
      this.charCounter.style.color = '#d69e2e';
    } else {
      this.charCounter.style.color = '#718096';
    }
  }

  /**
   * Validate reason input
   */
  #validateReason() {
    const reason = this.reasonTextarea.value.trim();
    let error = '';

    if (reason.length === 0) {
      error = 'Reason is required';
    } else if (reason.length < this.MIN_REASON_LENGTH) {
      error = `Reason must be at least ${this.MIN_REASON_LENGTH} characters`;
    } else if (reason.length > this.MAX_REASON_LENGTH) {
      error = `Reason cannot exceed ${this.MAX_REASON_LENGTH} characters`;
    }

    if (error) {
      this.reasonError.textContent = error;
      this.reasonError.style.display = 'block';
      this.reasonTextarea.style.borderColor = '#e53e3e';
      this.submitButton.disabled = true;
      return false;
    } else {
      this.reasonError.style.display = 'none';
      this.reasonTextarea.style.borderColor = '#e2e8f0';
      this.submitButton.disabled = false;
      return true;
    }
  }

  /**
   * Handle form submission
   */
  async #handleSubmit() {
    if (this.isSubmitting) return;

    if (!this.#validateReason()) {
      return;
    }

    this.isSubmitting = true;
    this.submitButton.disabled = true;
    this.submitText.textContent = 'Submitting...';
    this.spinner.style.display = 'inline-block';

    try {
      const reason = this.reasonTextarea.value.trim();

      // Use HttpService.post to submit the drop request
      // This will automatically include the access code from AccessCodeManager
      const response = await HttpService.post('drop-requests', {
        registrationId: this.registration.id,
        reason: reason,
      });

      // Response is already unwrapped by HttpService
      this.onSuccess(response);
      this.close();
    } catch (error) {
      console.error('Error submitting drop request:', error);
      this.#showError(error.message || 'Failed to submit drop request. Please try again.');
      this.isSubmitting = false;
      this.submitButton.disabled = false;
      this.submitText.textContent = 'Submit Request';
      this.spinner.style.display = 'none';
    }
  }

  /**
   * Show error message
   */
  #showError(message) {
    this.reasonError.textContent = message;
    this.reasonError.style.display = 'block';
    this.onError(new Error(message));
  }

  /**
   * Show the modal
   */
  show() {
    document.body.appendChild(this.modalElement);
    // Trigger animation
    window.requestAnimationFrame(() => {
      this.modalElement.style.opacity = '1';
      this.modalElement.querySelector('#dropRequestModal').style.transform = 'translateY(0)';
    });
    // Focus on textarea
    setTimeout(() => {
      this.reasonTextarea.focus();
    }, 100);
  }

  /**
   * Close the modal
   */
  close() {
    // Animate out
    this.modalElement.style.opacity = '0';
    this.modalElement.querySelector('#dropRequestModal').style.transform = 'translateY(-20px)';

    // Remove after animation
    setTimeout(() => {
      if (this.modalElement && this.modalElement.parentNode) {
        this.modalElement.parentNode.removeChild(this.modalElement);
      }
      document.removeEventListener('keydown', this.escapeHandler);
    }, 300);
  }
}
