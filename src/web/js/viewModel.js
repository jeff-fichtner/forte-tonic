import { HttpService } from './data/httpService.js';
import {
  ServerFunctions,
  Sections,
  RegistrationType,
  MonthNames,
  SessionConfig,
  FilterValue,
} from './constants.js';
import { AppConfigurationResponse } from '../../models/shared/responses/appConfigurationResponse.js';
import { Registration } from '../../models/shared/index.js';
import { DomHelpers } from './utilities/domHelpers.js';
import { NavTabs } from './components/navTabs.js';
import { Table } from './components/table.js';
import { formatPhone } from './utilities/phoneHelpers.js';
import { formatGrade, formatTime } from './extensions/numberExtensions.js';
import { ClassManager } from './utilities/classManager.js';
import { INTENT_LABELS } from './constants/intentConstants.js';
import { PeriodType } from './constants/periodTypeConstants.js';
import { FeedbackManager } from './feedback.js';

/**
 * Capitalize the first letter of a string (for display purposes)
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a datetime value for display in tables
 * @param {string|Date|number} timestamp - The timestamp to format
 * @returns {string} Formatted datetime string
 */
function formatDateTime(timestamp) {
  if (!timestamp) return 'N/A';

  try {
    let date;

    // Handle different input types
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      // Handle ISO strings or other date strings
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      // Handle Google Sheets serial dates or Unix timestamps
      if (timestamp > 1 && timestamp < 100000) {
        // Likely a Google Sheets serial date (days since 1899-12-30)
        const googleEpoch = new Date(1899, 11, 30); // Month is 0-indexed
        const msPerDay = 24 * 60 * 60 * 1000;
        date = new Date(googleEpoch.getTime() + timestamp * msPerDay);
      } else {
        // Assume Unix timestamp (milliseconds or seconds)
        date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
      }
    } else {
      // Try to convert to string and parse
      date = new Date(String(timestamp));
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'Invalid Date';
    }

    // Format as "Aug 10 - 8:11 PM"
    const month = MonthNames[date.getMonth()];
    const day = date.getDate();
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${month} ${day} - ${time}`;
  } catch (error) {
    console.warn('Error formatting timestamp:', timestamp, error);
    return 'Invalid Date';
  }
}

/**
 *
 */
export class ViewModel {
  // Private fields

  constructor() {
    // No initialization properties needed - tabs handle their own state
  }

  async initializeAsync() {
    // Get application configuration when page first loads
    const appConfig = await HttpService.fetch(ServerFunctions.getAppConfiguration, data =>
      AppConfigurationResponse.fromApiData(data)
    );

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
      } else if (appConfig.maintenanceMode && hasOverride) {
        console.log('⚠️  Maintenance mode is active but bypassed via override');
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
        this.loginModal.open();
      });
      return;
    }

    // open modal
    this.loginModal.open();
  }

  async loadUserData(user, roleToClick = null) {
    // Only proceed if we have a valid user with backing data
    if (!user || (!user.admin && !user.instructor && !user.parent)) {
      return;
    }

    // Show content area
    document.getElementById('page-content').hidden = false;

    await DomHelpers.waitForDocumentReadyAsync();

    M.AutoInit();

    // Initialize empty arrays - tabs will fetch their own data
    this.admins = [];
    this.instructors = [];
    this.students = [];
    this.registrations = [];
    this.classes = [];
    this.rooms = [];

    // Store current user for access throughout the application
    this.currentUser = user;

    let defaultSection;
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
    this.navTabs = new NavTabs(defaultSection);
    this.#setPageLoading(false);

    // Initialize feedback system
    if (!this.feedbackManager) {
      this.feedbackManager = new FeedbackManager(this);
    }

    // Auto-click the specified role tab if provided
    if (roleToClick) {
      const navLink = document.querySelector(`a[data-section="${roleToClick}"]`);
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
  _updateEnrollmentBanner() {
    const currentPeriod = window.UserSession.getCurrentPeriod();
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
    } else if (currentPeriod.periodType === 'intent') {
      // Don't show this banner during intent period - the intent-banner with count is shown instead
      banner.style.display = 'none';
    } else {
      banner.style.display = 'none';
    }
  }

  /**
   * Shared method to create registration with proper enrichment
   * This method handles the API call and enriches the response with instructor and student objects
   * Routes to next trimester endpoint during enrollment periods (for parents only)
   * Admins always use the regular endpoint regardless of period
   */
  async createRegistrationWithEnrichment(data) {
    // Admins always use the regular endpoint - they can create registrations for any trimester
    const isAdmin = this.currentUser?.admin !== undefined;

    // Determine which endpoint to use based on enrollment period (for non-admin users)
    const currentPeriod = window.UserSession?.getCurrentPeriod?.();
    const isEnrollmentPeriod =
      currentPeriod &&
      (currentPeriod.periodType === PeriodType.PRIORITY_ENROLLMENT ||
        currentPeriod.periodType === PeriodType.OPEN_ENROLLMENT);

    // Admins always use regular endpoint, parents use next trimester endpoint during enrollment
    const endpoint =
      isEnrollmentPeriod && !isAdmin
        ? ServerFunctions.createNextTrimesterRegistration
        : ServerFunctions.register;

    // If replacing an existing registration (has replaceRegistrationId),
    // delete the old registration first (this creates an audit record for the deletion)
    // The old registration being deleted may have linkedPreviousRegistrationId, which will be in the audit record
    if (data.replaceRegistrationId) {
      console.log(
        `🔄 Replacing registration - deleting old registration: ${data.replaceRegistrationId}`
      );
      try {
        // Use the appropriate delete endpoint based on enrollment period
        // Admins always use regular endpoint
        // For next trimester during enrollment: registrations/next-trimester/{id}
        // For current trimester: registrations/{id}
        const deleteEndpoint =
          isEnrollmentPeriod && !isAdmin
            ? `registrations/next-trimester/${data.replaceRegistrationId}`
            : `registrations/${data.replaceRegistrationId}`;

        await HttpService.delete(deleteEndpoint);

        // Remove the old registration from local state (from ALL relevant arrays)
        // This is critical to prevent the old registration from persisting in the UI
        if (isEnrollmentPeriod && !isAdmin && this.nextTrimesterRegistrations) {
          const oldRegIndex = this.nextTrimesterRegistrations.findIndex(reg => {
            const regId = reg.id?.value || reg.id;
            return regId === data.replaceRegistrationId;
          });

          if (oldRegIndex !== -1) {
            this.nextTrimesterRegistrations.splice(oldRegIndex, 1);
            console.log(`✅ Old registration removed from next trimester registrations`);
          }
        } else {
          const oldRegIndex = this.registrations.findIndex(reg => {
            const regId = reg.id?.value || reg.id;
            return regId === data.replaceRegistrationId;
          });

          if (oldRegIndex !== -1) {
            this.registrations.splice(oldRegIndex, 1);
            console.log(`✅ Old registration removed from current trimester registrations`);
          }
        }

        // Remove the replaceRegistrationId from the data object before creating the new registration
        // The new registration should NOT have linkedPreviousRegistrationId - that's only for migrations
        delete data.replaceRegistrationId;
      } catch (error) {
        console.error('Error deleting old registration:', error);
        throw new Error(`Failed to delete old registration: ${error.message}`);
      }
    }

    const response = await HttpService.post(endpoint, data);
    // HttpService auto-unwraps { success, data } responses, so response is already the registration data
    const newRegistration = Registration.fromApiData(response);

    // Enrich the registration with instructor and student objects (same logic as initial data loading)
    if (!newRegistration.student) {
      newRegistration.student = this.students.find(x => {
        const studentId = x.id?.value || x.id;
        const registrationStudentId = newRegistration.studentId?.value || newRegistration.studentId;
        return studentId === registrationStudentId;
      });

      if (!newRegistration.student) {
        console.warn(
          `❌ Student not found for new registration with studentId "${newRegistration.studentId?.value || newRegistration.studentId}"`
        );
      } else {
        console.log(
          `✅ Student enriched: ${newRegistration.student.firstName} ${newRegistration.student.lastName}`
        );
      }
    }

    if (!newRegistration.instructor) {
      newRegistration.instructor = this.instructors.find(x => {
        const instructorId = x.id?.value || x.id;
        const registrationInstructorId =
          newRegistration.instructorId?.value || newRegistration.instructorId;
        return instructorId === registrationInstructorId;
      });

      if (!newRegistration.instructor) {
        console.warn(
          `❌ Instructor not found for new registration with instructorId "${newRegistration.instructorId?.value || newRegistration.instructorId}"`
        );
      } else {
        console.log(
          `✅ Instructor enriched: ${newRegistration.instructor.firstName} ${newRegistration.instructor.lastName}`
        );
      }
    }

    // Tabs handle their own data refresh after creation - they call tab.onLoad() to reload fresh data
    console.log(`✅ Registration created successfully`);

    return newRegistration;
  }

  /**
   * Helper to capitalize trimester names
   * @param {string} trimester
   * @returns {string}
   */
  #capitalizeTrimester(trimester) {
    if (!trimester) return '';
    return trimester.charAt(0).toUpperCase() + trimester.slice(1).toLowerCase();
  }

  /**
   * Show maintenance mode overlay
   * @param {string} message - Custom maintenance message
   */
  #showMaintenanceMode(message) {
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
  #hideMaintenanceMode() {
    const overlay = document.getElementById('maintenance-mode-overlay');
    const pageContent = document.getElementById('page-content');

    if (overlay) {
      // Hide the overlay
      overlay.classList.remove('active');

      // Show page content
      if (pageContent) pageContent.hidden = false;

      console.log('✓ Maintenance mode override activated');
    }
  }

  /**
   * Override maintenance mode for this session
   * Accessible via console: window.overrideMaintenanceMode()
   */
  overrideMaintenanceMode() {
    try {
      // Set session storage flag to persist override for this session
      sessionStorage.setItem('maintenance_mode_override', 'true');
      console.log('✓ Maintenance mode override flag set');

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
          this.loginModal.open();
        });
      } else {
        // Try auto-login if credentials exist
        const storedAuthData = window.AccessCodeManager.getStoredAuthData();
        if (storedAuthData) {
          this.#attemptLoginWithCode(storedAuthData.accessCode, storedAuthData.loginType);
        } else {
          // Open login modal
          this.loginModal.open();
        }
      }

      console.log('✓ Application reinitialized with maintenance mode bypassed');
      return true;
    } catch (error) {
      console.error('✗ Failed to override maintenance mode:', error);
      return false;
    }
  }

  /**
   *
   */
  #setPageLoading(isLoading, errorMessage = '') {
    const loadingContainer = document.getElementById('page-loading-container');
    const pageContent = document.getElementById('page-content');
    const pageErrorContent = document.getElementById('page-error-content');
    const pageErrorContentMessage = document.getElementById('page-error-content-message');

    loadingContainer.style.display = isLoading ? 'flex' : 'none';
    loadingContainer.hidden = !isLoading;

    // Only show page content if not loading, no error
    pageContent.hidden = isLoading || errorMessage;

    // Only show error content when there's actually an error message
    pageErrorContent.hidden = !errorMessage;
    if (pageErrorContentMessage) {
      pageErrorContentMessage.textContent = errorMessage;
    }
  }

  // TODO duplicated (will be consolidated elsewhere)
  /**
   *
   */
  #setAdminRegistrationLoading(isLoading) {
    const adminRegistrationLoadingContainer = document.getElementById(
      'admin-registration-loading-container'
    );
    const adminRegistrationContainer = document.getElementById('admin-registration-container');
    adminRegistrationLoadingContainer.hidden = !isLoading;
    adminRegistrationContainer.hidden = isLoading;
  }

  /**
   * Sort registrations by day, then start time, then length, then registration type (private first, then group)
   */
  #sortRegistrations(registrations) {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return [...registrations].sort((a, b) => {
      // 1. Sort by day
      const dayA = dayOrder.indexOf(a.day);
      const dayB = dayOrder.indexOf(b.day);
      if (dayA !== dayB) {
        return dayA - dayB;
      }

      // 2. Sort by start time
      const timeA = a.startTime || '';
      const timeB = b.startTime || '';
      if (timeA !== timeB) {
        return timeA.localeCompare(timeB);
      }

      // 3. Sort by length (numeric)
      const lengthA = parseInt(a.length) || 0;
      const lengthB = parseInt(b.length) || 0;
      if (lengthA !== lengthB) {
        return lengthA - lengthB;
      }

      // 4. Sort by registration type (private first, then group)
      const typeA = a.registrationType || '';
      const typeB = b.registrationType || '';
      if (typeA !== typeB) {
        // 'private' comes before 'group' alphabetically, which is what we want
        return typeA.localeCompare(typeB);
      }

      return 0;
    });
  }

  /**
   * Build directory table for employees (admins + instructors)
   * @param {string} tableId - HTML table element ID
   * @param {Array} employees - Array of employee objects
   * @returns {Table} Table instance
   */
  /**
   *
   */
  async requestDeleteRegistrationAsync(registrationToDeleteId) {
    // Confirm delete
    if (!confirm('Are you sure you want to delete this registration?')) {
      return;
    }

    if (!registrationToDeleteId) {
      console.error('No registration ID provided for deletion');
      M.toast({ html: 'Error: No registration ID provided for deletion.' });
      return;
    }

    try {
      console.log('Sending DELETE request for registration:', registrationToDeleteId);

      const response = await HttpService.delete(`registrations/${registrationToDeleteId}`);

      M.toast({ html: 'Registration deleted successfully.' });

      // Tabs handle their own data refresh - they call tab.onLoad() to reload fresh data
    } catch (error) {
      console.error('Error deleting registration:', error);
      M.toast({ html: 'Error deleting registration.' });
    }
  }

  /**
   * Submit intent for a registration
   * @param {string} registrationId - Registration ID
   * @param {string} intent - One of: 'keep', 'drop', 'change'
   * @returns {Promise<object>} Updated registration
   * @throws {Error} If submission fails
   */
  async submitIntent(registrationId, intent) {
    // Build headers with authentication
    const headers = {
      'Content-Type': 'application/json',
    };

    if (window.AccessCodeManager) {
      const storedAuthData = window.AccessCodeManager.getStoredAuthData();
      if (storedAuthData) {
        headers['x-access-code'] = storedAuthData.accessCode;
        headers['x-login-type'] = storedAuthData.loginType;
      }
    }

    try {
      const response = await fetch(`/api/registrations/${registrationId}/intent`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({ intent }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to submit intent`);
      }

      const result = await response.json();

      console.log('Intent submission response:', result);

      console.log('Intent submission successful:', result);

      // Tabs handle their own data refresh - ParentWeeklyScheduleTab will reload fresh data
      M.toast({ html: 'Intent submitted successfully.' });
      return result;
    } catch (error) {
      console.error('Error submitting intent:', error);
      M.toast({ html: error.message || 'Error submitting intent.' });
      throw error;
    }
  }
  /**
   *
   */
  async #copyToClipboard(text) {
    try {
      // Attempt to use the Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        M.toast({ html: `Copied '${text}' to clipboard.` });
        return;
      }
    } catch (error) {
      console.error('Failed to copy text to clipboard WITH MODERN API:', error);
    }
    try {
      // Fallback to execCommand for older browsers
      const tempInput = document.createElement('textarea');
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      M.toast({ html: `Copied '${text}' to clipboard.` });
    } catch (error) {
      console.error('Failed to copy text to clipboard WITH FALLBACK:', error);
      M.toast({ html: 'Failed to copy text to clipboard.' });
    }
  }
  /**
   *
   */
  adminEmployees() {
    const noah = this.admins.find(admin => admin.email === 'ndemosslevy@mcds.org'); // TODO migrate to data column
    return this.admins.map(x => {
      if (x === noah) {
        return {
          id: x.id,
          fullName: x.fullName,
          email: x.email,
          phone: '(415) 945-5121', // TODO migrate to data column
          roles: ['Forte Director'], // TODO migrate to data column
        };
      }
      return {
        id: x.id,
        fullName: x.fullName,
        email: 'forte@mcds.org', // TODO migrate to data column
        phone: '(415) 945-5122', // TODO migrate to data column
        roles: ['Forte Associate Manager'], // TODO migrate to data column
      };
    });
  }
  /**
   * Convert instructor to employee format for directory display
   * @param {object} instructor - Instructor object
   * @returns {object} Employee object for table display
   */
  instructorToEmployee(instructor, obscurePhone = false) {
    // Get instruments from either specialties or instruments field
    const instruments = instructor.specialties || instructor.instruments || [];
    const instrumentsText = instruments.length > 0 ? instruments.join(', ') : 'Instructor';

    // Format phone number using the formatPhone function
    const rawPhone = instructor.phone || instructor.phoneNumber || '';
    const formattedPhone = rawPhone && !obscurePhone ? formatPhone(rawPhone) : '';

    return {
      id: instructor.id,
      fullName:
        instructor.fullName || `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim(),
      email: instructor.email,
      phone: formattedPhone,
      role: instrumentsText, // Keep for comparison in sorting
      roles: [instrumentsText], // This is what the directory table displays - make it an array for sorting compatibility
      lastName: instructor.lastName || '', // Add lastName for sorting
      firstName: instructor.firstName || '', // Add firstName for sorting
    };
  }

  /**
   * Initialize the login modal functionality
   */
  #initLoginModal() {
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
    });

    // Expose to window for console debugging and runtime access
    window.loginModal = modalElement;
    window.loginModalInstance = this.loginModal;

    // Get modal elements
    const parentTab = document.getElementById('parent-login-tab');
    const employeeTab = document.getElementById('employee-login-tab');
    const parentSection = document.getElementById('parent-login-section');
    const employeeSection = document.getElementById('employee-login-section');
    const parentPhoneInput = document.getElementById('parent-phone-input');
    const employeeCodeInput = document.getElementById('employee-access-code');
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
    loginButton.addEventListener('click', e => {
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
      onConfirm: event => {
        if (!loginButton.disabled) {
          this.#handleLogin();
        }
      },
      onCancel: event => {
        this.loginModal.close();
      },
    });
  }

  /**
   * Initialize login type switching functionality
   */
  #initLoginTypeSwitching(parentTab, employeeTab, parentSection, employeeSection) {
    // Parent tab click handler
    parentTab.addEventListener('click', e => {
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
    employeeTab.addEventListener('click', e => {
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
  #initParentPhoneInput(phoneInput, loginButton) {
    phoneInput.addEventListener('input', e => {
      // Format phone number as user types
      if (typeof window.formatPhoneAsTyped === 'function') {
        const formattedValue = window.formatPhoneAsTyped(e.target.value);
        e.target.value = formattedValue;
      } else {
        // Fallback formatting - basic cleanup
        const digits = e.target.value.replace(/\D/g, '').substring(0, 10);
        if (digits.length <= 3) {
          e.target.value = digits;
        } else if (digits.length <= 6) {
          e.target.value = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        } else {
          e.target.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
      }

      if (this.currentLoginType === 'parent') {
        this.#validateCurrentInput();
      }
    });

    // Handle focus events to ensure validation runs
    phoneInput.addEventListener('focus', e => {
      if (this.currentLoginType === 'parent') {
        setTimeout(() => {
          this.#validateCurrentInput();
        }, 50);
      }
    });

    // Handle paste events
    phoneInput.addEventListener('paste', e => {
      setTimeout(() => {
        if (typeof window.formatPhoneAsTyped === 'function') {
          const formattedValue = window.formatPhoneAsTyped(e.target.value);
          e.target.value = formattedValue;
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
  #initEmployeeCodeInput(codeInput, loginButton) {
    codeInput.addEventListener('input', e => {
      // Only allow numeric input, max 6 digits
      const numericValue = e.target.value.replace(/[^0-9]/g, '').substring(0, 6);
      e.target.value = numericValue;

      if (this.currentLoginType === 'employee') {
        this.#validateCurrentInput();
      }
    });

    // Handle focus events to ensure validation runs
    codeInput.addEventListener('focus', e => {
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
  #validateCurrentInput() {
    const loginButton = document.getElementById('login-submit-btn');
    let isValid = false;

    if (this.currentLoginType === 'parent') {
      const phoneInput = document.getElementById('parent-phone-input');
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
      const codeInput = document.getElementById('employee-access-code');
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
  #focusCurrentInput() {
    if (this.currentLoginType === 'parent') {
      const phoneInput = document.getElementById('parent-phone-input');
      phoneInput.focus();
    } else {
      const codeInput = document.getElementById('employee-access-code');
      codeInput.focus();
    }
  }

  /**
   * Reset login modal to initial state
   */
  #resetLoginModal(parentPhoneInput, employeeCodeInput, loginButton) {
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
    parentTab.classList.remove('inactive-login-type');
    parentTab.classList.add('active-login-type');
    employeeTab.classList.remove('active-login-type');
    employeeTab.classList.add('inactive-login-type');

    // Show parent section, hide employee section
    parentSection.style.display = 'block';
    parentSection.classList.remove('inactive-section');
    parentSection.classList.add('active-section');
    employeeSection.style.display = 'none';
    employeeSection.classList.remove('active-section');
    employeeSection.classList.add('inactive-section');
  }

  /**
   * Initialize all application modals (Terms, Privacy, and Login)
   */
  #initializeAllModals() {
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
  #initTermsModal() {
    const termsModal = document.getElementById('terms-modal');
    if (!termsModal) {
      console.warn('⚠️ Terms of Service modal element not found');
      return;
    }

    const termsBtn = termsModal.querySelector('.modal-footer .modal-close');

    // Initialize modal with default dismissible behavior for footer links
    this.termsModal = M.Modal.init(termsModal, {
      dismissible: true,
      opacity: 0.5,
      preventScrolling: true,
    });

    // Make available globally
    window.termsModal = termsModal;
    window.termsModalInstance = this.termsModal;

    // Add custom click handler for "I Understand" button
    if (termsBtn) {
      termsBtn.addEventListener('click', e => {
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
          this.termsModal.destroy();
          this.termsModal = M.Modal.init(termsModal, {
            dismissible: true,
            opacity: 0.5,
            preventScrolling: true,
          });

          // Reattach keyboard handlers after reinitializing the modal
          const newTermsBtn = termsModal.querySelector('.modal-footer .modal-close');
          ModalKeyboardHandler.attachKeyboardHandlers(termsModal, {
            allowEscape: true,
            allowEnter: true,
            onConfirm: event => {
              if (newTermsBtn) {
                newTermsBtn.click();
              }
            },
            onCancel: event => {
              this.termsModal.close();
            },
          });

          // Execute the callback if it exists (for initial login flow)
          if (window.termsOnConfirmationCallback) {
            window.termsOnConfirmationCallback();
            window.termsOnConfirmationCallback = null; // Clear after use
          }
        }

        // Close the modal normally
        this.termsModal.close();
      });
    }

    // Attach keyboard handlers for normal usage (when dismissible)
    ModalKeyboardHandler.attachKeyboardHandlers(termsModal, {
      allowEscape: true,
      allowEnter: true,
      onConfirm: event => {
        // Handle Enter key press for Terms of Service
        if (termsBtn) {
          termsBtn.click();
        }
      },
      onCancel: event => {
        // Handle ESC key press for Terms of Service

        // Check if this is non-dismissible mode
        const hasAcceptedTerms = window.UserSession.hasAcceptedTermsOfService();
        if (!hasAcceptedTerms && window.termsOnConfirmationCallback) {
          // In non-dismissible mode, prevent ESC
          return;
        }

        // Allow normal ESC behavior
        this.termsModal.close();
      },
    });
  }

  /**
   * Initialize Privacy Policy modal with dismissible behavior
   */
  #initPrivacyModal() {
    const privacyModal = document.getElementById('privacy-modal');
    if (!privacyModal) {
      console.warn('⚠️ Privacy Policy modal element not found');
      return;
    }

    const privacyBtn = privacyModal.querySelector('.modal-footer .modal-close');

    // Initialize with normal dismissible settings
    this.privacyModal = M.Modal.init(privacyModal, {
      dismissible: true, // Allow normal dismissal behavior
      opacity: 0.5, // Standard opacity
      preventScrolling: true,
    });

    // Make available globally
    window.privacyModal = privacyModal;
    window.privacyModalInstance = this.privacyModal;

    // Attach keyboard handlers
    ModalKeyboardHandler.attachKeyboardHandlers(privacyModal, {
      allowEscape: true,
      allowEnter: true,
      onConfirm: event => {
        // Handle Enter key press for Privacy Policy - trigger button click
        if (privacyBtn) {
          privacyBtn.click();
        } else {
          this.privacyModal.close();
        }
      },
      onCancel: event => {
        // Handle ESC key press for Privacy Policy
        this.privacyModal.close();
      },
    });
  }

  /**
   * Update login button state based on stored access code
   */
  #updateLoginButtonState() {
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
  async handleLogin() {
    let loginValue = '';
    const loginType = this.currentLoginType;

    if (loginType === 'parent') {
      const phoneInput = document.getElementById('parent-phone-input');
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
      const codeInput = document.getElementById('employee-access-code');
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
    this.loginModal.close();

    await this.#attemptLoginWithCode(
      loginValue,
      loginType,
      () => {
        // Handle successful login
        // Clear the inputs
        document.getElementById('parent-phone-input').value = '';
        document.getElementById('employee-access-code').value = '';

        // Reset UI state after modal close to prevent scroll lock
        setTimeout(() => {
          this.#resetUIState();
        }, 200); // Small delay to let modal close animation complete
      },
      () => {
        // Handle failed login - reopen modal and focus appropriate input
        this.loginModal.open();
        setTimeout(() => {
          this.#focusCurrentInput();
        }, 300); // Delay to ensure modal is open before focusing
      }
    );
  }

  /**
   * Handle login form submission
   */
  async #handleLogin() {
    // Delegate to public method
    await this.handleLogin();
  }

  async #attemptLoginWithCode(
    loginValue,
    loginType,
    onSuccessfulLogin = null,
    onFailedLogin = null
  ) {
    console.log('Login attempt with value:', loginValue, 'type:', loginType);

    try {
      this.#setPageLoading(true);

      // Send login data to backend
      const authenticatedUser = await HttpService.post(ServerFunctions.authenticateByAccessCode, {
        accessCode: loginValue,
        loginType: loginType,
      });

      // Check if authentication was successful (non-null response)
      const loginSuccess = authenticatedUser !== null && !authenticatedUser?.systemError;

      if (loginSuccess) {
        // Save the login value securely in the browser
        window.AccessCodeManager.saveAccessCodeSecurely(loginValue, loginType);

        // Update login button state to show "Change User"
        this.#updateLoginButtonState();

        onSuccessfulLogin?.();

        // Clear cached data and reset initialization flags for new user
        this.#resetInitializationFlags();

        // Clear cached data properties
        this.admins = null;
        this.instructors = null;
        this.students = null;
        this.registrations = null;
        this.classes = null;
        this.rooms = null;
        this.currentUser = null;

        // Load user data with the authenticated user

        // Determine default role to click (admin -> instructor -> parent)
        let roleToClick = null;
        if (authenticatedUser.admin) {
          roleToClick = 'admin';

          // For admin users, we'll explicitly show admin tabs and click the first one
        } else if (authenticatedUser.instructor) {
          roleToClick = 'instructor';
        } else if (authenticatedUser.parent) {
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
    } catch (error) {
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
  clearUserSession() {
    window.AccessCodeManager.clearStoredAccessCode();
    this.#resetInitializationFlags();
    this.#updateLoginButtonState();
    M.toast({ html: 'User session cleared', classes: 'blue darken-1', displayLength: 2000 });
  }

  /**
   * Reset all initialization flags (useful for testing or when switching users)
   */
  #resetInitializationFlags() {
    this.adminContentInitialized = false;
    this.instructorContentInitialized = false;
    this.parentContentInitialized = false;

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
  #resetUIState() {
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
        container.scrollTop = 0;
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
      fixedElements.forEach(element => {
        if (element.id === 'admin-selected-lesson-display') {
          element.style.display = 'none';
        }
      });

      // Remove any modal overlay classes that might be stuck
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');

      // Remove any potential overlay elements
      const overlays = document.querySelectorAll('.modal-overlay');
      overlays.forEach(overlay => overlay.remove());
    } catch (error) {
      console.error('❌ Error resetting UI state:', error);
    }
  }

  /**
   * Show the login button after app configuration loads
   */
  #showLoginButton() {
    try {
      const loginButtonContainer = document.getElementById('login-button-container');
      if (loginButtonContainer) {
        loginButtonContainer.hidden = false;
      }
    } catch (error) {
      console.error('❌ Error showing login button:', error);
    }
  }

  /**
   * Show Terms of Service modal with confirmation callback
   * @param {Function} onConfirmation - Callback to execute when user accepts terms
   */
  #showTermsOfService(onConfirmation) {
    const termsModal = document.getElementById('terms-modal');
    const hasAcceptedTerms = window.UserSession.hasAcceptedTermsOfService();

    // Store the confirmation callback globally for the modal to access
    window.termsOnConfirmationCallback = onConfirmation;

    // Configure modal as non-dismissible for first-time users
    if (!hasAcceptedTerms && this.termsModal) {
      // Temporarily make the modal non-dismissible for initial terms acceptance
      this.termsModal.destroy();
      this.termsModal = M.Modal.init(termsModal, {
        dismissible: false,
        opacity: 0.8,
        preventScrolling: true,
        onCloseStart: function () {
          return false; // Prevent closing
        },
      });

      // Add keyboard event prevention for non-dismissible mode (only block ESC, allow Enter)
      const keydownHandler = e => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
        // Allow Enter key to work for button activation
      };

      // Add click prevention for non-dismissible mode (only prevent overlay clicks)
      const clickHandler = e => {
        // Only prevent clicks on the overlay, not on modal content
        if (e.target === termsModal) {
          e.stopPropagation();
          e.preventDefault();
        }
      };

      termsModal.addEventListener('keydown', keydownHandler);
      termsModal.addEventListener('click', clickHandler);

      // Store handlers for cleanup
      termsModal._tempKeydownHandler = keydownHandler;
      termsModal._tempClickHandler = clickHandler;

      // Reattach keyboard handlers for the non-dismissible modal
      const termsBtn = termsModal.querySelector('.modal-footer .modal-close');
      ModalKeyboardHandler.attachKeyboardHandlers(termsModal, {
        allowEscape: false, // Block ESC in non-dismissible mode
        allowEnter: true, // Allow Enter for button activation
        onConfirm: event => {
          if (termsBtn) {
            termsBtn.click();
          }
        },
        onCancel: event => {
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
window.ViewModel = ViewModel;
