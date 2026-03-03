/**
 * Registration Form Modal Helpers
 * Shared confirmation/conflict modals and button loading state,
 * used by both private and group registration submission flows.
 */

import { ModalKeyboardHandler } from '../../utilities/modalKeyboardHandler.js';

/**
 * Show confirmation modal for parent registrations
 */
export function showConfirmationModal(message: string, onConfirm: () => void): void {
  const modal = document.getElementById('parent-registration-confirmation-modal');
  const messageElement = document.getElementById('parent-confirmation-message');
  const confirmButton = document.getElementById('parent-confirmation-confirm');
  const cancelButton = document.getElementById('parent-confirmation-cancel');

  if (!modal || !messageElement || !confirmButton || !cancelButton) {
    console.warn('Confirmation modal elements not found');
    // If modal is not available, proceed directly
    onConfirm();
    return;
  }

  // Set the message
  messageElement.innerHTML = message;

  // Remove any existing event listeners
  const newConfirmButton = confirmButton.cloneNode(true) as HTMLElement;
  const newCancelButton = cancelButton.cloneNode(true) as HTMLElement;
  confirmButton.parentNode!.replaceChild(newConfirmButton, confirmButton);
  cancelButton.parentNode!.replaceChild(newCancelButton, cancelButton);

  // Add event listeners
  newConfirmButton.addEventListener('click', () => {
    if (typeof M !== 'undefined') {
      M.Modal.getInstance(modal)?.close();
    }
    // Ensure scrolling is restored
    restorePageScrolling();
    onConfirm();
  });

  newCancelButton.addEventListener('click', () => {
    if (typeof M !== 'undefined') {
      M.Modal.getInstance(modal)?.close();
    }
    // Ensure scrolling is restored
    restorePageScrolling();
    // Do nothing on cancel
  });

  // Initialize and open modal
  if (typeof M !== 'undefined') {
    const modalInstance = M.Modal.init(modal, {
      dismissible: true,
      onCloseEnd: () => {
        // Clear message when modal closes and restore scrolling
        messageElement.innerHTML = '';
        restorePageScrolling();
        // Destroy modal instance to prevent memory leaks and scroll issues
        if (modalInstance) {
          modalInstance.destroy();
        }
        // Remove any lingering overlays
        document.querySelectorAll('.modal-overlay').forEach(overlay => overlay.remove());
      },
    });

    // Attach keyboard handlers for this confirmation modal
    ModalKeyboardHandler.attachKeyboardHandlers(modal, {
      allowEscape: true,
      allowEnter: true,
      onConfirm: (_event: Event) => {
        // Handle Enter key press for confirmation
        console.log('Confirmation modal: Enter key pressed');
        newConfirmButton.click();
      },
      onCancel: (_event: Event) => {
        // Handle ESC key press for confirmation
        console.log('Confirmation modal: ESC key pressed');
        newCancelButton.click();
      },
    });

    // Scroll to top before opening modal
    window.scrollTo({ top: 0, behavior: 'smooth' });

    modalInstance.open();
  }
}

/**
 * Ensure page scrolling is restored after modal operations
 */
export function restorePageScrolling(): void {
  // Remove any overflow restrictions that might prevent scrolling
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';

  // Remove any fixed positioning that might interfere
  document.body.style.position = '';

  // Remove all modal overlays instead of just hiding them
  document.querySelectorAll('.modal-overlay').forEach(overlay => overlay.remove());
}

/**
 * Show conflict error modal with refresh on acknowledge
 */
export function showConflictModal(message: string): void {
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
  const modalElement = document.getElementById('conflict-error-modal')!;
  const modalInstance = M.Modal.init(modalElement, {
    dismissible: false,
    onCloseEnd: () => {
      window.location.reload();
    },
  });
  modalInstance.open();
}

/**
 * Set button loading state
 */
export function setButtonLoading(
  button: HTMLButtonElement | null,
  isLoading: boolean,
  originalText: string | null = null
): void {
  if (!button) return;

  if (isLoading) {
    // Store original text if not provided
    if (!originalText) {
      originalText = button.innerHTML;
      button.dataset.originalText = originalText;
    }

    // Disable button and show loading
    button.disabled = true;
    button.innerHTML = `<i class="material-icons left" style="font-size: 16px;">autorenew</i>Loading...`;

    // Add spinning animation
    const icon = button.querySelector('i');
    if (icon) {
      icon.style.animation = 'spin 1s linear infinite';
      // Add CSS for spin animation if not already present
      if (!document.getElementById('button-loading-styles')) {
        const style = document.createElement('style');
        style.id = 'button-loading-styles';
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    }
  } else {
    // Restore original state
    button.disabled = false;
    const storedText = button.dataset.originalText || originalText;
    if (storedText) {
      button.innerHTML = storedText;
      delete button.dataset.originalText;
    }
  }
}
