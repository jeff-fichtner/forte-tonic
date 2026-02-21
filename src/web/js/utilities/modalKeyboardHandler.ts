/**
 * Modal Keyboard Handler Utility
 * ==============================
 *
 * Provides centralized keyboard event handling for all application modals.
 * Supports ESC to close and Enter to confirm modal actions.
 */

interface ModalKeyboardOptions {
  onConfirm?: ((event: KeyboardEvent) => void) | null;
  onCancel?: ((event: KeyboardEvent) => void) | null;
  allowEscape?: boolean;
  allowEnter?: boolean;
  confirmSelector?: string;
  cancelSelector?: string;
}

interface TimeSlotKeyboardOptions {
  onConfirm?: ((event: KeyboardEvent, selectedSlot: Element) => void) | null;
  onCancel?: ((event: KeyboardEvent) => void) | null;
}

interface ModalElement extends HTMLElement {
  _keyboardHandlers?: ((event: KeyboardEvent) => void)[];
}

interface TimeSlotContainer extends HTMLElement {
  _timeSlotKeyboardHandlers?: ((event: KeyboardEvent) => void)[];
}

export class ModalKeyboardHandler {
  /**
   * Attach keyboard event handlers to a modal
   */
  static attachKeyboardHandlers(
    modalElement: ModalElement,
    options: ModalKeyboardOptions = {}
  ): (() => void) | undefined {
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
    const keyboardHandler = (event: KeyboardEvent) => {
      // Only handle keyboard events when this modal is open and visible
      const modalInstance = M.Modal.getInstance(modalElement);
      if (!modalInstance || !modalInstance.isOpen) {
        return;
      }

      // Handle ESC key (close/cancel)
      if (event.key === 'Escape' && allowEscape) {
        event.preventDefault();
        event.stopPropagation();

        if (onCancel) {
          onCancel(event);
        } else {
          // Try to find and click cancel button
          const cancelButton = modalElement.querySelector(cancelSelector) as HTMLElement | null;
          if (cancelButton) {
            cancelButton.click();
          } else {
            // Fallback: close modal directly
            modalInstance.close();
          }
        }
      }

      // Handle Enter key (confirm/accept)
      if (event.key === 'Enter' && allowEnter) {
        // Don't prevent default if user is typing in a textarea
        if ((event.target as HTMLElement).tagName === 'TEXTAREA') {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (onConfirm) {
          onConfirm(event);
        } else {
          // Try to find and click confirm button
          const confirmButton = modalElement.querySelector(confirmSelector) as HTMLElement | null;
          if (confirmButton) {
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
   */
  static removeKeyboardHandlers(modalElement: ModalElement): void {
    if (!modalElement || !modalElement._keyboardHandlers) {
      return;
    }

    modalElement._keyboardHandlers.forEach(handler => {
      document.removeEventListener('keydown', handler);
    });

    modalElement._keyboardHandlers = [];
  }

  /**
   * Attach keyboard handlers for time slot selection (non-modal interface)
   */
  static attachTimeSlotKeyboardHandlers(
    containerElement: TimeSlotContainer,
    options: TimeSlotKeyboardOptions = {}
  ): (() => void) | undefined {
    if (!containerElement) {
      console.warn('ModalKeyboardHandler: No container element provided for time slot handlers');
      return;
    }

    const { onConfirm = null, onCancel = null } = options;

    const keyboardHandler = (event: KeyboardEvent) => {
      // Only handle if container is visible and has focus or selected slots
      if (!containerElement.offsetParent) return; // Hidden element check

      const selectedSlot = containerElement.querySelector('.timeslot.selected');

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();

        if (onCancel) {
          onCancel(event);
        } else if (selectedSlot) {
          // Clear selection
          selectedSlot.classList.remove('selected');
          // Reset styling
          if (selectedSlot.classList.contains('available')) {
            (selectedSlot as HTMLElement).style.border = '2px solid #4caf50';
            (selectedSlot as HTMLElement).style.background = '#e8f5e8';
          }
        }
      }

      if (event.key === 'Enter' && selectedSlot) {
        event.preventDefault();
        event.stopPropagation();

        if (onConfirm) {
          onConfirm(event, selectedSlot);
        } else {
          // Try to find and click the create registration button
          const submitButton = document.getElementById(
            'parent-confirm-registration-btn'
          ) as HTMLButtonElement | null;
          if (submitButton && !submitButton.disabled) {
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

// Expose to window for console debugging and runtime access
window.ModalKeyboardHandler = ModalKeyboardHandler;
