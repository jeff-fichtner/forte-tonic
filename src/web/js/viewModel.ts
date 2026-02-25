import { HttpService } from './data/httpService.js';
import { ServerFunctions, Sections } from './constants.js';
import { AppConfigurationResponse } from '../../models/shared/responses/appConfigurationResponse.js';
import { DomHelpers } from './utilities/domHelpers.js';
import { NavTabs } from './components/navTabs.js';
import { formatPhone } from './utilities/phoneHelpers.js';
import { ClassManager } from './utilities/classManager.js';
import { PeriodType } from '/utils/values/periodType.js';
import { FeedbackManager } from './feedback.js';
import { capitalize } from './utilities/formatHelpers.js';

import type { Period } from '../../models/shared/responses/appConfigurationResponse.js';

/** Authenticated user shape returned from HttpService.post (raw JSON, not model class) */
interface AuthenticatedUser {
  email?: string;
  admin?: Record<string, unknown> | null;
  instructor?: Record<string, unknown> | null;
  parent?: Record<string, unknown> | null;
  systemError?: boolean;
  error?: string;
  [key: string]: unknown;
}

/** Extended HTMLElement with temp handler storage for terms modal */
interface TermsModalElement extends HTMLElement {
  _tempKeydownHandler?: (e: KeyboardEvent) => void;
  _tempClickHandler?: (e: MouseEvent) => void;
}

/** Minimal interface for parentRegistrationForm */
interface ParentRegistrationFormLike {
  clearSelection(): void;
  [key: string]: unknown;
}

/**
 *
 */
export class ViewModel {
  // Private fields

  // Current user
  currentUser: AuthenticatedUser | null;

  // UI components
  navTabs: NavTabs | null;
  feedbackManager: FeedbackManager | null;
  loginModal: MaterializeModalInstance | null;
  termsModal: MaterializeModalInstance | null;
  privacyModal: MaterializeModalInstance | null;

  // Login state
  currentLoginType: string;
  roleToClick: string | null;

  // Initialization flags
  adminContentInitialized: boolean;
  instructorContentInitialized: boolean;
  parentContentInitialized: boolean;

  // External form reference
  parentRegistrationForm: ParentRegistrationFormLike | null;

  // Index signature to satisfy FeedbackViewModel and ViewModelType
  [key: string]: unknown;

  constructor() {
    // Initialize property defaults
    this.currentUser = null;
    this.navTabs = null;
    this.feedbackManager = null;
    this.loginModal = null;
    this.termsModal = null;
    this.privacyModal = null;
    this.currentLoginType = 'parent';
    this.roleToClick = null;
    this.adminContentInitialized = false;
    this.instructorContentInitialized = false;
    this.parentContentInitialized = false;
    this.parentRegistrationForm = null;
  }

  async initializeAsync(): Promise<void> {
    // Get application configuration when page first loads
    const appConfig = await HttpService.fetch(ServerFunctions.getAppConfiguration, data =>
      new AppConfigurationResponse(data as AppConfigurationResponse)
    ) as AppConfigurationResponse | null;

    // Save entire app configuration in user session
    // ClassManager will read rockBandClassIds from here directly
    if (appConfig) {
      window.UserSession.saveAppConfig(appConfig);

      // Check if maintenance mode is enabled
      // Allow override via session storage for debugging/admin purposes
      const hasOverride = sessionStorage.getItem('maintenance_mode_override') === 'true';
      if (appConfig.maintenanceMode && !hasOverride) {
        this.#showMaintenanceMode(appConfig.maintenanceMessage);
        return; // Block further initialization
      }
    }

    // Initialize all modals
    this.#initializeAllModals();

    // Check for stored access code and update login button
    this.#updateLoginButtonState();
    this.#showLoginButton();

    const storedAuthData = window.AccessCodeManager.getStoredAuthData();
    if (storedAuthData) {
      await this.#attemptLoginWithCode(storedAuthData.accessCode, storedAuthData.loginType);
      return;
    }

    this.#setPageLoading(false);

    // check if the user has ever arrived at the site before
    const hasAcceptedTermsOfService = window.UserSession.hasAcceptedTermsOfService();
    if (!hasAcceptedTermsOfService) {
      // show terms of service
      this.#showTermsOfService(() => {
        // After terms are accepted, open the login modal
        this.loginModal!.open();
      });
      return;
    }

    // open modal
    this.loginModal!.open();
  }

  async loadUserData(user: AuthenticatedUser | null, roleToClick: string | null = null): Promise<void> {
    // Only proceed if we have a valid user with backing data
    if (!user || (!user.admin && !user.instructor && !user.parent)) {
      return;
    }

    // Show content area
    const pageContent = document.getElementById('page-content');
    if (pageContent) pageContent.hidden = false;

    await DomHelpers.waitForDocumentReadyAsync();

    M.AutoInit();

    // Store current user for access throughout the application
    this.currentUser = user;

    let defaultSection: string | undefined;
    if (user.admin) {
      defaultSection = Sections.ADMIN;
    }
    if (user.instructor) {
      defaultSection = Sections.INSTRUCTOR;
    }
    if (user.parent) {
      defaultSection = Sections.PARENT;
    }

    // Use the default section based on user's role
    this.navTabs = new NavTabs(defaultSection as string);
    this.#setPageLoading(false);

    // Initialize feedback system
    if (!this.feedbackManager) {
      this.feedbackManager = new FeedbackManager(this);
    }

    // Store roleToClick for later activation (after TabController is initialized)
    this.roleToClick = roleToClick;

    // If TabController already exists (user switching), activate the section immediately
    if (roleToClick && window.tabController) {
      const navLink = document.querySelector<HTMLAnchorElement>(`a[data-section="${roleToClick}"]`);
      if (navLink) {
        navLink.click();
      }
    }

    // Update enrollment banner based on current period
    this._updateEnrollmentBanner();

    // Reset UI state after data load to prevent scroll lock issues
    setTimeout(() => {
      this.#resetUIState();
    }, 300); // Allow time for content to render and nav click to complete
  }

  /**
   * Update enrollment period banner based on current period
   * Shows different messages for intent, priority enrollment, and open enrollment
   * Hides banner during regular registration periods
   */
  _updateEnrollmentBanner(): void {
    const currentPeriod: Period | undefined = window.UserSession.getCurrentPeriod();
    const banner = document.getElementById('enrollment-period-banner');
    const bannerText = document.getElementById('enrollment-banner-text');

    if (!banner || !bannerText) {
      // Banner elements not in DOM yet
      return;
    }

    if (!currentPeriod) {
      banner.style.display = 'none';
      return;
    }

    // Show appropriate message based on period type
    if (currentPeriod.periodType === PeriodType.PRIORITY_ENROLLMENT) {
      banner.style.display = 'block';
      banner.className = 'enrollment-banner priority';
      bannerText.textContent = 'Priority Enrollment is now open for returning families';
    } else if (currentPeriod.periodType === PeriodType.OPEN_ENROLLMENT) {
      banner.style.display = 'block';
      banner.className = 'enrollment-banner open';
      bannerText.textContent = 'Open Enrollment is now available for all families';
    } else if (currentPeriod.periodType === PeriodType.INTENT) {
      // Don't show this banner during intent period - the intent-banner with count is shown instead
      banner.style.display = 'none';
    } else {
      banner.style.display = 'none';
    }
  }

  /**
   * Show maintenance mode overlay
   * @param {string} message - Custom maintenance message
   */
  #showMaintenanceMode(message: string | null): void {
    const overlay = document.getElementById('maintenance-mode-overlay');
    const messageText = document.getElementById('maintenance-message-text');

    if (overlay) {
      // Update message if provided
      if (message && messageText) {
        messageText.textContent = message;
      }

      // Show the overlay
      overlay.classList.add('active');

      // Hide loading spinner and page content
      const loadingContainer = document.getElementById('page-loading-container');
      const pageContent = document.getElementById('page-content');
      if (loadingContainer) loadingContainer.style.display = 'none';
      if (pageContent) pageContent.hidden = true;
    }
  }

  /**
   * Hide maintenance mode overlay and reinitialize the application
   * Used for debugging or emergency admin override
   */
  #hideMaintenanceMode(): void {
    const overlay = document.getElementById('maintenance-mode-overlay');
    const pageContent = document.getElementById('page-content');

    if (overlay) {
      // Hide the overlay
      overlay.classList.remove('active');

      // Show page content
      if (pageContent) pageContent.hidden = false;
    }
  }

  /**
   * Override maintenance mode for this session
   * Accessible via console: window.overrideMaintenanceMode()
   */
  overrideMaintenanceMode(): boolean {
    try {
      // Set session storage flag to persist override for this session
      sessionStorage.setItem('maintenance_mode_override', 'true');

      // Hide maintenance overlay and continue initialization
      this.#hideMaintenanceMode();

      // Reinitialize the application
      this.#initializeAllModals();
      this.#updateLoginButtonState();
      this.#showLoginButton();
      this.#setPageLoading(false);

      // Check if user has accepted terms
      const hasAcceptedTermsOfService = window.UserSession.hasAcceptedTermsOfService();
      if (!hasAcceptedTermsOfService) {
        this.#showTermsOfService(() => {
          this.loginModal!.open();
        });
      } else {
        // Try auto-login if credentials exist
        const storedAuthData = window.AccessCodeManager.getStoredAuthData();
        if (storedAuthData) {
          this.#attemptLoginWithCode(storedAuthData.accessCode, storedAuthData.loginType);
        } else {
          // Open login modal
          this.loginModal!.open();
        }
      }

      return true;
    } catch (error: unknown) {
      console.error('✗ Failed to override maintenance mode:', error);
      return false;
    }
  }

  /**
   *
   */
  #setPageLoading(isLoading: boolean, errorMessage: string = ''): void {
    const loadingContainer = document.getElementById('page-loading-container');
    const pageContent = document.getElementById('page-content');
    const pageErrorContent = document.getElementById('page-error-content');
    const pageErrorContentMessage = document.getElementById('page-error-content-message');

    if (loadingContainer) {
      loadingContainer.style.display = isLoading ? 'flex' : 'none';
      loadingContainer.hidden = !isLoading;
    }

    // Only show page content if not loading, no error
    if (pageContent) {
      pageContent.hidden = isLoading || !!errorMessage;
    }

    // Only show error content when there's actually an error message
    if (pageErrorContent) {
      pageErrorContent.hidden = !errorMessage;
    }
    if (pageErrorContentMessage) {
      pageErrorContentMessage.textContent = errorMessage;
    }
  }

  /**
   * Initialize the login modal functionality
   */
  #initLoginModal(): void {
    // Initialize MaterializeCSS modal
    const modalElement = document.getElementById('login-modal');
    if (!modalElement) {
      console.warn('Login modal not found');
      return;
    }

    // Initialize modal
    this.loginModal = M.Modal.init(modalElement, {
      dismissible: true,
      opacity: 0.5,
      inDuration: 300,
      outDuration: 200,
    } as MaterializeModalOptions);

    // Expose to window for console debugging and runtime access
    window.loginModal = modalElement;
    window.loginModalInstance = this.loginModal;

    // Get modal elements
    const parentTab = document.getElementById('parent-login-tab');
    const employeeTab = document.getElementById('employee-login-tab');
    const parentSection = document.getElementById('parent-login-section');
    const employeeSection = document.getElementById('employee-login-section');
    const parentPhoneInput = document.getElementById('parent-phone-input') as HTMLInputElement | null;
    const employeeCodeInput = document.getElementById('employee-access-code') as HTMLInputElement | null;
    const loginButton = document.getElementById('login-submit-btn');

    if (
      !parentTab ||
      !employeeTab ||
      !parentSection ||
      !employeeSection ||
      !parentPhoneInput ||
      !employeeCodeInput ||
      !loginButton
    ) {
      console.warn('Login modal elements not found');
      return;
    }

    // Track current login type
    this.currentLoginType = 'parent';

    // Initialize login type switching
    this.#initLoginTypeSwitching(parentTab, employeeTab, parentSection, employeeSection);

    // Initialize parent phone input
    this.#initParentPhoneInput(parentPhoneInput, loginButton);

    // Initialize employee access code input
    this.#initEmployeeCodeInput(employeeCodeInput, loginButton);

    // Handle login button click
    loginButton.addEventListener('click', (e: Event) => {
      e.preventDefault();
      this.#handleLogin();
    });

    // Clear inputs when modal opens - use proper Materialize events
    modalElement.addEventListener('modal:opened', () => {
      this.#resetLoginModal(parentPhoneInput, employeeCodeInput, loginButton);
      setTimeout(() => {
        this.#focusCurrentInput();
        // Ensure validation runs after reset
        this.#validateCurrentInput();
      }, 100); // Small delay to ensure modal is fully rendered
    });

    // Reset state when modal closes
    modalElement.addEventListener('modal:closed', () => {
      this.#resetLoginModal(parentPhoneInput, employeeCodeInput, loginButton);
    });

    // Attach keyboard handlers
    ModalKeyboardHandler.attachKeyboardHandlers(modalElement, {
      allowEscape: true,
      allowEnter: true,
      onConfirm: (event: KeyboardEvent) => {
        if (!(loginButton as HTMLButtonElement).disabled) {
          this.#handleLogin();
        }
      },
      onCancel: (event: KeyboardEvent) => {
        this.loginModal!.close();
      },
    });
  }

  /**
   * Initialize login type switching functionality
   */
  #initLoginTypeSwitching(
    parentTab: HTMLElement,
    employeeTab: HTMLElement,
    parentSection: HTMLElement,
    employeeSection: HTMLElement
  ): void {
    // Parent tab click handler
    parentTab.addEventListener('click', (e: Event) => {
      e.preventDefault();
      if (this.currentLoginType !== 'parent') {
        this.currentLoginType = 'parent';

        // Update tab appearance
        parentTab.classList.remove('inactive-login-type');
        parentTab.classList.add('active-login-type');
        employeeTab.classList.remove('active-login-type');
        employeeTab.classList.add('inactive-login-type');

        // Show/hide sections
        parentSection.style.display = 'block';
        parentSection.classList.remove('inactive-section');
        parentSection.classList.add('active-section');
        employeeSection.style.display = 'none';
        employeeSection.classList.remove('active-section');
        employeeSection.classList.add('inactive-section');

        // Reset validation and focus
        this.#validateCurrentInput();
        this.#focusCurrentInput();
      }
    });

    // Employee tab click handler
    employeeTab.addEventListener('click', (e: Event) => {
      e.preventDefault();
      if (this.currentLoginType !== 'employee') {
        this.currentLoginType = 'employee';

        // Update tab appearance
        employeeTab.classList.remove('inactive-login-type');
        employeeTab.classList.add('active-login-type');
        parentTab.classList.remove('active-login-type');
        parentTab.classList.add('inactive-login-type');

        // Show/hide sections
        employeeSection.style.display = 'block';
        employeeSection.classList.remove('inactive-section');
        employeeSection.classList.add('active-section');
        parentSection.style.display = 'none';
        parentSection.classList.remove('active-section');
        parentSection.classList.add('inactive-section');

        // Reset validation and focus
        this.#validateCurrentInput();
        this.#focusCurrentInput();
      }
    });
  }

  /**
   * Initialize parent phone input with formatting and validation
   */
  #initParentPhoneInput(phoneInput: HTMLInputElement, loginButton: HTMLElement): void {
    phoneInput.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      // Format phone number as user types
      if (typeof window.formatPhoneAsTyped === 'function') {
        const formattedValue = window.formatPhoneAsTyped(target.value);
        target.value = formattedValue;
      } else {
        // Fallback formatting - basic cleanup
        const digits = target.value.replace(/\D/g, '').substring(0, 10);
        if (digits.length <= 3) {
          target.value = digits;
        } else if (digits.length <= 6) {
          target.value = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        } else {
          target.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
      }

      if (this.currentLoginType === 'parent') {
        this.#validateCurrentInput();
      }
    });

    // Handle focus events to ensure validation runs
    phoneInput.addEventListener('focus', (_e: Event) => {
      if (this.currentLoginType === 'parent') {
        setTimeout(() => {
          this.#validateCurrentInput();
        }, 50);
      }
    });

    // Handle paste events
    phoneInput.addEventListener('paste', (e: Event) => {
      const target = e.target as HTMLInputElement;
      setTimeout(() => {
        if (typeof window.formatPhoneAsTyped === 'function') {
          const formattedValue = window.formatPhoneAsTyped(target.value);
          target.value = formattedValue;
        }
        if (this.currentLoginType === 'parent') {
          this.#validateCurrentInput();
        }
      }, 0);
    });
  }

  /**
   * Initialize employee access code input with validation
   */
  #initEmployeeCodeInput(codeInput: HTMLInputElement, loginButton: HTMLElement): void {
    codeInput.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      // Only allow numeric input, max 6 digits
      const numericValue = target.value.replace(/[^0-9]/g, '').substring(0, 6);
      target.value = numericValue;

      if (this.currentLoginType === 'employee') {
        this.#validateCurrentInput();
      }
    });

    // Handle focus events to ensure validation runs
    codeInput.addEventListener('focus', (_e: Event) => {
      if (this.currentLoginType === 'employee') {
        setTimeout(() => {
          this.#validateCurrentInput();
        }, 50);
      }
    });
  }

  /**
   * Validate the current active input and update button state
   */
  #validateCurrentInput(): void {
    const loginButton = document.getElementById('login-submit-btn');
    if (!loginButton) return;

    let isValid = false;

    if (this.currentLoginType === 'parent') {
      const phoneInput = document.getElementById('parent-phone-input') as HTMLInputElement | null;
      if (!phoneInput) return;
      const phoneValue = phoneInput.value;

      // Check if phone validation function is available
      if (typeof window.isValidPhoneNumber === 'function') {
        isValid = window.isValidPhoneNumber(phoneValue);
      } else {
        // Fallback validation - just check for 10 digits
        const digits = phoneValue.replace(/\D/g, '');
        isValid = digits.length === 10 && digits !== '0000000000';
        console.warn(
          'Phone validation function not available, using fallback:',
          phoneValue,
          '->',
          isValid
        );
      }

      // Update input validation classes
      if (phoneValue.length > 0) {
        if (isValid) {
          phoneInput.classList.add('valid');
          phoneInput.classList.remove('invalid');
        } else {
          phoneInput.classList.add('invalid');
          phoneInput.classList.remove('valid');
        }
      } else {
        phoneInput.classList.remove('valid', 'invalid');
      }
    } else {
      const codeInput = document.getElementById('employee-access-code') as HTMLInputElement | null;
      if (!codeInput) return;
      const codeValue = codeInput.value;
      isValid = codeValue.length === 6;

      // Update input validation classes
      if (codeValue.length > 0) {
        if (isValid) {
          codeInput.classList.add('valid');
          codeInput.classList.remove('invalid');
        } else {
          codeInput.classList.add('invalid');
          codeInput.classList.remove('valid');
        }
      } else {
        codeInput.classList.remove('valid', 'invalid');
      }
    }

    // Update login button state (for Materialize <a> buttons)
    if (isValid) {
      loginButton.removeAttribute('disabled');
      loginButton.classList.remove('disabled');
      loginButton.style.opacity = '1';
      loginButton.style.pointerEvents = 'auto';
      loginButton.style.cursor = 'pointer';
    } else {
      loginButton.setAttribute('disabled', 'disabled');
      loginButton.classList.add('disabled');
      loginButton.style.opacity = '0.6';
      loginButton.style.pointerEvents = 'none';
      loginButton.style.cursor = 'not-allowed';
    }
  }

  /**
   * Focus the current active input
   */
  #focusCurrentInput(): void {
    if (this.currentLoginType === 'parent') {
      const phoneInput = document.getElementById('parent-phone-input') as HTMLInputElement | null;
      if (phoneInput) phoneInput.focus();
    } else {
      const codeInput = document.getElementById('employee-access-code') as HTMLInputElement | null;
      if (codeInput) codeInput.focus();
    }
  }

  /**
   * Reset login modal to initial state
   */
  #resetLoginModal(
    parentPhoneInput: HTMLInputElement,
    employeeCodeInput: HTMLInputElement,
    loginButton: HTMLElement
  ): void {
    // Clear inputs
    parentPhoneInput.value = '';
    employeeCodeInput.value = '';

    // Clear validation classes
    parentPhoneInput.classList.remove('valid', 'invalid');
    employeeCodeInput.classList.remove('valid', 'invalid');

    // Disable login button (for Materialize <a> buttons)
    loginButton.setAttribute('disabled', 'disabled');
    loginButton.classList.add('disabled');
    loginButton.style.opacity = '0.6';
    loginButton.style.pointerEvents = 'none';
    loginButton.style.cursor = 'not-allowed';

    // Reset to parent login type
    this.currentLoginType = 'parent';
    const parentTab = document.getElementById('parent-login-tab');
    const employeeTab = document.getElementById('employee-login-tab');
    const parentSection = document.getElementById('parent-login-section');
    const employeeSection = document.getElementById('employee-login-section');

    // Update tab appearance
    if (parentTab) {
      parentTab.classList.remove('inactive-login-type');
      parentTab.classList.add('active-login-type');
    }
    if (employeeTab) {
      employeeTab.classList.remove('active-login-type');
      employeeTab.classList.add('inactive-login-type');
    }

    // Show parent section, hide employee section
    if (parentSection) {
      parentSection.style.display = 'block';
      parentSection.classList.remove('inactive-section');
      parentSection.classList.add('active-section');
    }
    if (employeeSection) {
      employeeSection.style.display = 'none';
      employeeSection.classList.remove('active-section');
      employeeSection.classList.add('inactive-section');
    }
  }

  /**
   * Initialize all application modals (Terms, Privacy, and Login)
   */
  #initializeAllModals(): void {
    // Initialize Terms of Service modal (non-dismissible)
    this.#initTermsModal();

    // Initialize Privacy Policy modal (dismissible)
    this.#initPrivacyModal();

    // Initialize Login modal (dismissible)
    this.#initLoginModal();
  }

  /**
   * Initialize Terms of Service modal with non-dismissible behavior
   */
  #initTermsModal(): void {
    const termsModal = document.getElementById('terms-modal') as TermsModalElement | null;
    if (!termsModal) {
      console.warn('⚠️ Terms of Service modal element not found');
      return;
    }

    const termsBtn = termsModal.querySelector('.modal-footer .modal-close') as HTMLElement | null;

    // Initialize modal with default dismissible behavior for footer links
    this.termsModal = M.Modal.init(termsModal, {
      dismissible: true,
      opacity: 0.5,
      preventScrolling: true,
    } as MaterializeModalOptions);

    // Make available globally
    window.termsModal = termsModal;
    window.termsModalInstance = this.termsModal;

    // Add custom click handler for "I Understand" button
    if (termsBtn) {
      termsBtn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if this is the initial non-dismissible terms acceptance
        const hasAcceptedTerms = window.UserSession.hasAcceptedTermsOfService();

        if (!hasAcceptedTerms) {
          // Mark terms as accepted for first-time users
          window.UserSession.acceptTermsOfService();

          // Clean up temporary event handlers if they exist
          if (termsModal._tempKeydownHandler) {
            termsModal.removeEventListener('keydown', termsModal._tempKeydownHandler);
            delete termsModal._tempKeydownHandler;
          }
          if (termsModal._tempClickHandler) {
            termsModal.removeEventListener('click', termsModal._tempClickHandler);
            delete termsModal._tempClickHandler;
          }

          // Restore normal dismissible behavior for future footer link clicks
          this.termsModal!.destroy();
          this.termsModal = M.Modal.init(termsModal, {
            dismissible: true,
            opacity: 0.5,
            preventScrolling: true,
          } as MaterializeModalOptions);

          // Reattach keyboard handlers after reinitializing the modal
          const newTermsBtn = termsModal.querySelector('.modal-footer .modal-close') as HTMLElement | null;
          ModalKeyboardHandler.attachKeyboardHandlers(termsModal, {
            allowEscape: true,
            allowEnter: true,
            onConfirm: (event: KeyboardEvent) => {
              if (newTermsBtn) {
                newTermsBtn.click();
              }
            },
            onCancel: (event: KeyboardEvent) => {
              this.termsModal!.close();
            },
          });

          // Execute the callback if it exists (for initial login flow)
          if (window.termsOnConfirmationCallback) {
            window.termsOnConfirmationCallback();
            window.termsOnConfirmationCallback = null; // Clear after use
          }
        }

        // Close the modal normally
        this.termsModal!.close();
      });
    }

    // Attach keyboard handlers for normal usage (when dismissible)
    ModalKeyboardHandler.attachKeyboardHandlers(termsModal, {
      allowEscape: true,
      allowEnter: true,
      onConfirm: (event: KeyboardEvent) => {
        // Handle Enter key press for Terms of Service
        if (termsBtn) {
          termsBtn.click();
        }
      },
      onCancel: (event: KeyboardEvent) => {
        // Handle ESC key press for Terms of Service

        // Check if this is non-dismissible mode
        const hasAcceptedTerms = window.UserSession.hasAcceptedTermsOfService();
        if (!hasAcceptedTerms && window.termsOnConfirmationCallback) {
          // In non-dismissible mode, prevent ESC
          return;
        }

        // Allow normal ESC behavior
        this.termsModal!.close();
      },
    });
  }

  /**
   * Initialize Privacy Policy modal with dismissible behavior
   */
  #initPrivacyModal(): void {
    const privacyModal = document.getElementById('privacy-modal');
    if (!privacyModal) {
      console.warn('⚠️ Privacy Policy modal element not found');
      return;
    }

    const privacyBtn = privacyModal.querySelector('.modal-footer .modal-close') as HTMLElement | null;

    // Initialize with normal dismissible settings
    this.privacyModal = M.Modal.init(privacyModal, {
      dismissible: true, // Allow normal dismissal behavior
      opacity: 0.5, // Standard opacity
      preventScrolling: true,
    } as MaterializeModalOptions);

    // Make available globally
    window.privacyModal = privacyModal;
    window.privacyModalInstance = this.privacyModal;

    // Attach keyboard handlers
    ModalKeyboardHandler.attachKeyboardHandlers(privacyModal, {
      allowEscape: true,
      allowEnter: true,
      onConfirm: (event: KeyboardEvent) => {
        // Handle Enter key press for Privacy Policy - trigger button click
        if (privacyBtn) {
          privacyBtn.click();
        } else {
          this.privacyModal!.close();
        }
      },
      onCancel: (event: KeyboardEvent) => {
        // Handle ESC key press for Privacy Policy
        this.privacyModal!.close();
      },
    });
  }

  /**
   * Update login button state based on stored access code
   */
  #updateLoginButtonState(): void {
    const loginButton = document.querySelector('a[href="#login-modal"]');
    if (!loginButton) {
      console.warn('Login button not found');
      return;
    }

    // Check if there's a stored access code
    const storedCode = window.AccessCodeManager.getStoredAccessCode();

    if (storedCode) {
      // Change button text to "Change User" if access code exists
      const buttonTextNode = loginButton.childNodes[loginButton.childNodes.length - 1];
      if (buttonTextNode && buttonTextNode.nodeType === Node.TEXT_NODE) {
        buttonTextNode.textContent = 'Change User';
      }
    } else {
      // Ensure button text is "Login" if no stored code
      const buttonTextNode = loginButton.childNodes[loginButton.childNodes.length - 1];
      if (buttonTextNode && buttonTextNode.nodeType === Node.TEXT_NODE) {
        buttonTextNode.textContent = 'Login';
      }
    }
  }

  /**
   * Handle login form submission (public method for modal event handlers)
   */
  async handleLogin(): Promise<void> {
    let loginValue = '';
    const loginType = this.currentLoginType;

    if (loginType === 'parent') {
      const phoneInput = document.getElementById('parent-phone-input') as HTMLInputElement | null;
      if (!phoneInput) return;
      const phoneValue = phoneInput.value.trim();

      // Validate phone number
      if (!window.isValidPhoneNumber(phoneValue)) {
        M.toast({
          html: 'Please enter a valid 10-digit phone number.',
          classes: 'red darken-1',
          displayLength: 3000,
        });
        phoneInput.focus();
        return;
      }

      // Strip formatting for backend
      loginValue = window.stripPhoneFormatting(phoneValue);
    } else {
      const codeInput = document.getElementById('employee-access-code') as HTMLInputElement | null;
      if (!codeInput) return;
      const codeValue = codeInput.value.trim();

      // Validate access code
      if (codeValue.length !== 6) {
        M.toast({
          html: 'Please enter a valid 6-digit access code.',
          classes: 'red darken-1',
          displayLength: 3000,
        });
        codeInput.focus();
        return;
      }

      loginValue = codeValue;
    }

    // Close modal before attempting login
    this.loginModal!.close();

    await this.#attemptLoginWithCode(
      loginValue,
      loginType,
      () => {
        // Handle successful login
        // Clear the inputs
        const parentInput = document.getElementById('parent-phone-input') as HTMLInputElement | null;
        const employeeInput = document.getElementById('employee-access-code') as HTMLInputElement | null;
        if (parentInput) parentInput.value = '';
        if (employeeInput) employeeInput.value = '';

        // Reset UI state after modal close to prevent scroll lock
        setTimeout(() => {
          this.#resetUIState();
        }, 200); // Small delay to let modal close animation complete
      },
      () => {
        // Handle failed login - reopen modal and focus appropriate input
        this.loginModal!.open();
        setTimeout(() => {
          this.#focusCurrentInput();
        }, 300); // Delay to ensure modal is open before focusing
      }
    );
  }

  /**
   * Handle login form submission
   */
  async #handleLogin(): Promise<void> {
    // Delegate to public method
    await this.handleLogin();
  }

  async #attemptLoginWithCode(
    loginValue: string,
    loginType: string,
    onSuccessfulLogin: (() => void) | null = null,
    onFailedLogin: (() => void) | null = null
  ): Promise<void> {
    try {
      this.#setPageLoading(true);

      // Send login data to backend
      const authenticatedUser = await HttpService.post(ServerFunctions.authenticateByAccessCode, {
        accessCode: loginValue,
        loginType: loginType,
      }) as AuthenticatedUser | null;

      // Check if authentication was successful (non-null response)
      const loginSuccess = authenticatedUser !== null && !authenticatedUser?.systemError;

      if (loginSuccess) {
        // Save the login value securely in the browser
        window.AccessCodeManager.saveAccessCodeSecurely(loginValue, loginType);

        // Update login button state to show "Change User"
        this.#updateLoginButtonState();

        onSuccessfulLogin?.();

        // Clear cached data and reset initialization flags for new user
        await this.#resetInitializationFlags();

        // Clear cached data
        this.currentUser = null;

        // Load user data with the authenticated user

        // Determine default role to click (admin -> instructor -> parent)
        let roleToClick: string | null = null;
        if (authenticatedUser!.admin) {
          roleToClick = 'admin';

          // For admin users, we'll explicitly show admin tabs and click the first one
        } else if (authenticatedUser!.instructor) {
          roleToClick = 'instructor';
        } else if (authenticatedUser!.parent) {
          roleToClick = 'parent';
        }

        // Load user data and navigate to the appropriate section
        await this.loadUserData(authenticatedUser, roleToClick);
      } else {
        // Check if it's a system error or just no match found
        if (authenticatedUser?.systemError && authenticatedUser?.error) {
          // Server-side system error (Google Sheets, DB connection, etc.)
          M.toast({
            html: authenticatedUser.error,
            classes: 'red darken-1',
            displayLength: 4000,
          });
        } else {
          // No match found - client-side validation message
          const isPhoneNumber = loginValue.length === 10 && /^\d{10}$/.test(loginValue);
          const errorMessage = isPhoneNumber ? 'Invalid phone number' : 'Invalid access code';
          M.toast({
            html: errorMessage,
            classes: 'red darken-1',
            displayLength: 3000,
          });
        }
        onFailedLogin?.();
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      M.toast({
        html: 'Login failed. Please try again.',
        classes: 'red darken-1',
        displayLength: 4000,
      });
      onFailedLogin?.();
    } finally {
      this.#setPageLoading(false);
    }
  }

  /**
   * Save access code securely in the browser
   * @param {string} accessCode - The access code to save
   */
  // Method moved to AccessCodeManager

  /**
   * Generate a unique session ID
   * @returns {string} A unique session identifier
   */
  // Method moved to AccessCodeManager

  /**
   * Retrieve the securely stored access code
   * @returns {string|null} The stored access code or null if not found/expired
   */
  // Method moved to AccessCodeManager

  /**
   * Clear the stored access code (for logout)
   */
  // Method moved to AccessCodeManager

  /**
   * Public method to clear stored access code (for logout functionality)
   */
  async clearUserSession(): Promise<void> {
    window.AccessCodeManager.clearStoredAccessCode();
    await this.#resetInitializationFlags();
    this.#updateLoginButtonState();
    M.toast({ html: 'User session cleared', classes: 'blue darken-1', displayLength: 2000 });
  }

  /**
   * Reset all initialization flags (useful for testing or when switching users)
   */
  async #resetInitializationFlags(): Promise<void> {
    this.adminContentInitialized = false;
    this.instructorContentInitialized = false;
    this.parentContentInitialized = false;

    // Unload current tab so it will reload with new user data
    if (window.tabController) {
      const currentTab = window.tabController.getCurrentTab();
      if (currentTab) {
        try {
          await currentTab.onUnload();
          // Clear TabController's current tab tracking so next activation is treated as fresh
          (window.tabController as unknown as Record<string, unknown>).currentTab = null;
          (window.tabController as unknown as Record<string, unknown>).currentTabId = null;
        } catch (error: unknown) {
          console.error('Error unloading tab during user switch:', error);
        }
      }
    }

    // Clear parent registration form selection when user changes
    if (this.parentRegistrationForm) {
      this.parentRegistrationForm.clearSelection();
    }

    // Comprehensive UI cleanup to prevent scroll lock issues
    this.#resetUIState();
  }

  /**
   * Reset UI state to prevent scroll lock and other issues during user changes
   */
  #resetUIState(): void {
    try {
      // Ensure login modal is properly closed
      if (this.loginModal && this.loginModal.isOpen) {
        this.loginModal.close();
      }

      // Reset scroll position
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;

      // Reset container scroll
      const container = document.querySelector('.container');
      if (container) {
        (container as HTMLElement).scrollTop = 0;
      }

      // Reset page content scroll
      const pageContent = document.getElementById('page-content');
      if (pageContent) {
        pageContent.scrollTop = 0;

        // Ensure overflow is not locked
        pageContent.style.overflow = '';
        pageContent.style.overflowY = '';
        pageContent.style.height = '';
        pageContent.style.position = '';
      }

      // Reset body styles that might cause scroll lock
      document.body.style.overflow = '';
      document.body.style.overflowY = '';
      document.body.style.height = '';
      document.body.style.position = '';

      // Reset html styles
      document.documentElement.style.overflow = '';
      document.documentElement.style.overflowY = '';
      document.documentElement.style.height = '';

      // Hide any fixed elements that might interfere
      const fixedElements = document.querySelectorAll('[style*="position: fixed"]');
      fixedElements.forEach((element: Element) => {
        if ((element as HTMLElement).id === 'admin-selected-lesson-display') {
          (element as HTMLElement).style.display = 'none';
        }
      });

      // Remove any modal overlay classes that might be stuck
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');

      // Remove any potential overlay elements
      const overlays = document.querySelectorAll('.modal-overlay');
      overlays.forEach((overlay: Element) => overlay.remove());
    } catch (error: unknown) {
      console.error('❌ Error resetting UI state:', error);
    }
  }

  /**
   * Show the login button after app configuration loads
   */
  #showLoginButton(): void {
    try {
      const loginButtonContainer = document.getElementById('login-button-container');
      if (loginButtonContainer) {
        loginButtonContainer.hidden = false;
      }
    } catch (error: unknown) {
      console.error('❌ Error showing login button:', error);
    }
  }

  /**
   * Show Terms of Service modal with confirmation callback
   * @param {Function} onConfirmation - Callback to execute when user accepts terms
   */
  #showTermsOfService(onConfirmation: () => void): void {
    const termsModal = document.getElementById('terms-modal') as TermsModalElement | null;
    const hasAcceptedTerms = window.UserSession.hasAcceptedTermsOfService();

    // Store the confirmation callback globally for the modal to access
    window.termsOnConfirmationCallback = onConfirmation;

    // Configure modal as non-dismissible for first-time users
    if (!hasAcceptedTerms && this.termsModal) {
      // Temporarily make the modal non-dismissible for initial terms acceptance
      this.termsModal.destroy();
      this.termsModal = M.Modal.init(termsModal!, {
        dismissible: false,
        opacity: 0.8,
        preventScrolling: true,
        onCloseStart: function (this: MaterializeModalInstance) {
          return false; // Prevent closing
        },
      } as MaterializeModalOptions);

      // Add keyboard event prevention for non-dismissible mode (only block ESC, allow Enter)
      const keydownHandler = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
        // Allow Enter key to work for button activation
      };

      // Add click prevention for non-dismissible mode (only prevent overlay clicks)
      const clickHandler = (e: MouseEvent): void => {
        // Only prevent clicks on the overlay, not on modal content
        if (e.target === termsModal) {
          e.stopPropagation();
          e.preventDefault();
        }
      };

      termsModal!.addEventListener('keydown', keydownHandler);
      termsModal!.addEventListener('click', clickHandler);

      // Store handlers for cleanup
      termsModal!._tempKeydownHandler = keydownHandler;
      termsModal!._tempClickHandler = clickHandler;

      // Reattach keyboard handlers for the non-dismissible modal
      const termsBtn = termsModal!.querySelector('.modal-footer .modal-close') as HTMLElement | null;
      ModalKeyboardHandler.attachKeyboardHandlers(termsModal!, {
        allowEscape: false, // Block ESC in non-dismissible mode
        allowEnter: true, // Allow Enter for button activation
        onConfirm: (event: KeyboardEvent) => {
          if (termsBtn) {
            termsBtn.click();
          }
        },
        onCancel: (event: KeyboardEvent) => {
          // Should not be called since allowEscape is false
        },
      });
    }

    // Open the Terms of Service modal using ViewModel's instance
    if (this.termsModal) {
      this.termsModal.open();
    } else {
      console.error('Terms of Service modal not initialized in ViewModel');
    }
  }
}

// Expose to window for console debugging and runtime access
window.ViewModel = ViewModel as unknown as typeof window.ViewModel;
