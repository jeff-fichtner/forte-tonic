import { UserSession } from './session.js';
import { ModalKeyboardHandler } from '../utilities/modalKeyboardHandler.js';

/** Extended HTMLElement with temp handler storage for terms modal */
interface TermsModalElement extends HTMLElement {
  _tempKeydownHandler?: (e: KeyboardEvent) => void;
  _tempClickHandler?: (e: MouseEvent) => void;
}

// Module-level state
let termsModal: MaterializeModalInstance | null = null;
let privacyModal: MaterializeModalInstance | null = null;
let termsOnConfirmationCallback: (() => void) | null = null;

/**
 * Initialize terms and privacy modal DOM bindings.
 * Call once alongside LoginModal.init().
 */
export function init(): void {
  initTermsModal();
  initPrivacyModal();
}

/**
 * Show the terms of service modal if not yet accepted; calls onConfirmed immediately if already accepted.
 */
export function showIfNeeded(onConfirmed: () => void): void {
  const termsModalEl = document.getElementById('terms-modal') as TermsModalElement | null;
  const hasAcceptedTerms = UserSession.hasAcceptedTermsOfService();

  termsOnConfirmationCallback = onConfirmed;

  if (!hasAcceptedTerms && termsModal) {
    termsModal.destroy();
    termsModal = M.Modal.init(termsModalEl!, {
      dismissible: false,
      opacity: 0.8,
      preventScrolling: true,
      onCloseStart: function (this: MaterializeModalInstance) {
        return false;
      },
    } as MaterializeModalOptions);

    const keydownHandler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const clickHandler = (e: MouseEvent): void => {
      if (e.target === termsModalEl) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    termsModalEl!.addEventListener('keydown', keydownHandler);
    termsModalEl!.addEventListener('click', clickHandler);

    termsModalEl!._tempKeydownHandler = keydownHandler;
    termsModalEl!._tempClickHandler = clickHandler;

    const termsBtn = termsModalEl!.querySelector(
      '.modal-footer .modal-close'
    ) as HTMLElement | null;
    ModalKeyboardHandler.attachKeyboardHandlers(termsModalEl!, {
      allowEscape: false,
      allowEnter: true,
      onConfirm: (_event: KeyboardEvent) => {
        if (termsBtn) {
          termsBtn.click();
        }
      },
      onCancel: (_event: KeyboardEvent) => {
        // Should not be called since allowEscape is false
      },
    });
  }

  if (termsModal) {
    termsModal.open();
  } else {
    console.error('Terms of Service modal not initialized');
  }
}

// ---------------------------------------------------------------------------
// Internal functions
// ---------------------------------------------------------------------------

function initTermsModal(): void {
  const termsModalEl = document.getElementById('terms-modal') as TermsModalElement | null;
  if (!termsModalEl) {
    console.warn('⚠️ Terms of Service modal element not found');
    return;
  }

  const termsBtn = termsModalEl.querySelector('.modal-footer .modal-close') as HTMLElement | null;

  termsModal = M.Modal.init(termsModalEl, {
    dismissible: true,
    opacity: 0.5,
    preventScrolling: true,
  } as MaterializeModalOptions);

  window.termsModal = termsModalEl;
  window.termsModalInstance = termsModal;

  if (termsBtn) {
    termsBtn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      e.stopPropagation();

      const hasAcceptedTerms = UserSession.hasAcceptedTermsOfService();

      if (!hasAcceptedTerms) {
        UserSession.acceptTermsOfService();

        if (termsModalEl._tempKeydownHandler) {
          termsModalEl.removeEventListener('keydown', termsModalEl._tempKeydownHandler);
          delete termsModalEl._tempKeydownHandler;
        }
        if (termsModalEl._tempClickHandler) {
          termsModalEl.removeEventListener('click', termsModalEl._tempClickHandler);
          delete termsModalEl._tempClickHandler;
        }

        termsModal!.destroy();
        termsModal = M.Modal.init(termsModalEl, {
          dismissible: true,
          opacity: 0.5,
          preventScrolling: true,
        } as MaterializeModalOptions);

        const newTermsBtn = termsModalEl.querySelector(
          '.modal-footer .modal-close'
        ) as HTMLElement | null;
        ModalKeyboardHandler.attachKeyboardHandlers(termsModalEl, {
          allowEscape: true,
          allowEnter: true,
          onConfirm: (_event: KeyboardEvent) => {
            if (newTermsBtn) {
              newTermsBtn.click();
            }
          },
          onCancel: (_event: KeyboardEvent) => {
            termsModal!.close();
          },
        });

        if (termsOnConfirmationCallback) {
          termsOnConfirmationCallback();
          termsOnConfirmationCallback = null;
        }
      }

      termsModal!.close();
    });
  }

  ModalKeyboardHandler.attachKeyboardHandlers(termsModalEl, {
    allowEscape: true,
    allowEnter: true,
    onConfirm: (_event: KeyboardEvent) => {
      if (termsBtn) {
        termsBtn.click();
      }
    },
    onCancel: (_event: KeyboardEvent) => {
      const hasAcceptedTerms = UserSession.hasAcceptedTermsOfService();
      if (!hasAcceptedTerms && termsOnConfirmationCallback) {
        return;
      }
      termsModal!.close();
    },
  });
}

function initPrivacyModal(): void {
  const privacyModalEl = document.getElementById('privacy-modal');
  if (!privacyModalEl) {
    console.warn('⚠️ Privacy Policy modal element not found');
    return;
  }

  const privacyBtn = privacyModalEl.querySelector(
    '.modal-footer .modal-close'
  ) as HTMLElement | null;

  privacyModal = M.Modal.init(privacyModalEl, {
    dismissible: true,
    opacity: 0.5,
    preventScrolling: true,
  } as MaterializeModalOptions);

  window.privacyModal = privacyModalEl;
  window.privacyModalInstance = privacyModal;

  ModalKeyboardHandler.attachKeyboardHandlers(privacyModalEl, {
    allowEscape: true,
    allowEnter: true,
    onConfirm: (_event: KeyboardEvent) => {
      if (privacyBtn) {
        privacyBtn.click();
      } else {
        privacyModal!.close();
      }
    },
    onCancel: (_event: KeyboardEvent) => {
      privacyModal!.close();
    },
  });
}
