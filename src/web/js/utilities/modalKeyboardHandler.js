/**
 * Modal Keyboard Handler Utility
 * ==============================
 *
 * Provides centralized keyboard event handling for all application modals.
 * Supports ESC to close and Enter to confirm modal actions.
 */

export class ModalKeyboardHandler {
  /**
   * Attach keyboard event handlers to a modal
   * @param {HTMLElement} modalElement - The modal DOM element
   * @param {Object} options - Configuration options
   * @param {Function} [options.onConfirm] - Callback for Enter key (confirm action)
   * @param {Function} [options.onCancel] - Callback for ESC key (cancel action)
   * @param {boolean} [options.allowEscape=true] - Whether ESC key is allowed to close modal
   * @param {boolean} [options.allowEnter=true] - Whether Enter key is allowed to confirm
   * @param {string} [options.confirmSelector] - CSS selector for the confirm button (auto-clicked on Enter)
   * @param {string} [options.cancelSelector] - CSS selector for the cancel button (auto-clicked on ESC)
   */
  static attachKeyboardHandlers(modalElement, options = {}) {
    if (!modalElement) {
      console.warn('ModalKeyboardHandler: No modal element provided');
      return;
    }

    const {
      onConfirm = null,
      onCancel = null,
      allowEscape = true,
      allowEnter = true,
      confirmSelector = '.modal-footer .btn:not(.btn-flat):not(.modal-close)',
      cancelSelector = '.modal-footer .btn-flat, .modal-footer .modal-close',
    } = options;

    // Create keyboard event handler
    const keyboardHandler = event => {
      // Only handle keyboard events when this modal is open and visible
      const modalInstance = M.Modal.getInstance(modalElement);
      if (!modalInstance || !modalInstance.isOpen) {
        return;
      }

      // Handle ESC key (close/cancel)
      if (event.key === 'Escape' && allowEscape) {
        event.preventDefault();
        event.stopPropagation();

        console.log('ModalKeyboardHandler: ESC pressed on modal:', modalElement.id);

        if (onCancel) {
          onCancel(event);
        } else {
          // Try to find and click cancel button
          const cancelButton = modalElement.querySelector(cancelSelector);
          if (cancelButton) {
            console.log('ModalKeyboardHandler: Auto-clicking cancel button');
            cancelButton.click();
          } else {
            // Fallback: close modal directly
            console.log('ModalKeyboardHandler: Closing modal directly');
            modalInstance.close();
          }
        }
      }

      // Handle Enter key (confirm/accept)
      if (event.key === 'Enter' && allowEnter) {
        // Don't prevent default if user is typing in a textarea
        if (event.target.tagName === 'TEXTAREA') {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        console.log('ModalKeyboardHandler: Enter pressed on modal:', modalElement.id);

        if (onConfirm) {
          onConfirm(event);
        } else {
          // Try to find and click confirm button
          const confirmButton = modalElement.querySelector(confirmSelector);
          if (confirmButton) {
            console.log('ModalKeyboardHandler: Auto-clicking confirm button');
            confirmButton.click();
          }
        }
      }
    };

    // Attach event listener to document (capture modal events globally)
    document.addEventListener('keydown', keyboardHandler);

    // Store handler reference for cleanup
    if (!modalElement._keyboardHandlers) {
      modalElement._keyboardHandlers = [];
    }
    modalElement._keyboardHandlers.push(keyboardHandler);

    console.log('ModalKeyboardHandler: Keyboard handlers attached to modal:', modalElement.id);

    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', keyboardHandler);
      if (modalElement._keyboardHandlers) {
        const index = modalElement._keyboardHandlers.indexOf(keyboardHandler);
        if (index > -1) {
          modalElement._keyboardHandlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Remove all keyboard handlers from a modal
   * @param {HTMLElement} modalElement - The modal DOM element
   */
  static removeKeyboardHandlers(modalElement) {
    if (!modalElement || !modalElement._keyboardHandlers) {
      return;
    }

    modalElement._keyboardHandlers.forEach(handler => {
      document.removeEventListener('keydown', handler);
    });

    modalElement._keyboardHandlers = [];
    console.log('ModalKeyboardHandler: All keyboard handlers removed from modal:', modalElement.id);
  }

  /**
   * Attach keyboard handlers for time slot selection (non-modal interface)
   * @param {HTMLElement} containerElement - The container with time slots
   * @param {Object} options - Configuration options
   * @param {Function} [options.onConfirm] - Callback for Enter key on selected slot
   * @param {Function} [options.onCancel] - Callback for ESC key (clear selection)
   */
  static attachTimeSlotKeyboardHandlers(containerElement, options = {}) {
    if (!containerElement) {
      console.warn('ModalKeyboardHandler: No container element provided for time slot handlers');
      return;
    }

    const { onConfirm = null, onCancel = null } = options;

    const keyboardHandler = event => {
      // Only handle if container is visible and has focus or selected slots
      if (!containerElement.offsetParent) return; // Hidden element check

      const selectedSlot = containerElement.querySelector('.timeslot.selected');

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();

        console.log('ModalKeyboardHandler: ESC pressed in time slot container');

        if (onCancel) {
          onCancel(event);
        } else if (selectedSlot) {
          // Clear selection
          selectedSlot.classList.remove('selected');
          // Reset styling
          if (selectedSlot.classList.contains('available')) {
            selectedSlot.style.border = '2px solid #4caf50';
            selectedSlot.style.background = '#e8f5e8';
          }
        }
      }

      if (event.key === 'Enter' && selectedSlot) {
        event.preventDefault();
        event.stopPropagation();

        console.log('ModalKeyboardHandler: Enter pressed on selected time slot');

        if (onConfirm) {
          onConfirm(event, selectedSlot);
        } else {
          // Try to find and click the create registration button
          const submitButton = document.getElementById('parent-confirm-registration-btn');
          if (submitButton && !submitButton.disabled) {
            console.log('ModalKeyboardHandler: Auto-clicking registration submit button');
            submitButton.click();
          }
        }
      }
    };

    document.addEventListener('keydown', keyboardHandler);

    // Store handler reference for cleanup
    if (!containerElement._timeSlotKeyboardHandlers) {
      containerElement._timeSlotKeyboardHandlers = [];
    }
    containerElement._timeSlotKeyboardHandlers.push(keyboardHandler);

    console.log('ModalKeyboardHandler: Time slot keyboard handlers attached to container');

    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', keyboardHandler);
      if (containerElement._timeSlotKeyboardHandlers) {
        const index = containerElement._timeSlotKeyboardHandlers.indexOf(keyboardHandler);
        if (index > -1) {
          containerElement._timeSlotKeyboardHandlers.splice(index, 1);
        }
      }
    };
  }
}

// Make available globally for backward compatibility
window.ModalKeyboardHandler = ModalKeyboardHandler;
