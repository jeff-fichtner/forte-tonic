/**
 * Modern ES Module entry point for Tonic
 * This file uses ES module imports to load all required dependencies
 */

// Import all required modules
import './constants.js';
import './data/httpService.js';
import '/models/shared/responses/authenticatedUserResponse.js';
import '/models/shared/admin.js';
import '/models/shared/class.js';
import '/models/shared/instructor.js';
import '/models/shared/parent.js';
import '/models/shared/registration.js';
import '/models/shared/room.js';
import '/models/shared/student.js';
import './components/navTabs.js';
import './components/select.js';
import './components/table.js';
import './workflows/adminRegistrationForm.js';
import './workflows/parentRegistrationForm.js';
import './data/apiClient.js';
import './utilities/domHelpers.js';
import './utilities/durationHelpers.js';
import './utilities/promiseHelpers.js';
import './utilities/phoneHelpers.js';
import './utilities/modalKeyboardHandler.js';
import './utilities/classManager.js';
import './extensions/durationExtensions.js';
import './extensions/numberExtensions.js';
import './extensions/stringExtensions.js';
import './viewModel.js';

// Tab-based architecture
import { TabController } from './core/tabController.js';
import { EmployeeDirectoryTab } from './tabs/employeeDirectoryTab.js';
import { InstructorWeeklyScheduleTab } from './tabs/instructorWeeklyScheduleTab.js';
import { ParentContactTab } from './tabs/parentContactTab.js';
import { ParentWeeklyScheduleTab } from './tabs/parentWeeklyScheduleTab.js';
import { ParentRegistrationTab } from './tabs/parentRegistrationTab.js';
import { AdminWaitListTab } from './tabs/adminWaitListTab.js';
import { AdminMasterScheduleTab } from './tabs/adminMasterScheduleTab.js';
import { AdminRegistrationTab } from './tabs/adminRegistrationTab.js';

/**
 * Access code manager for secure storage and retrieval of access codes
 */
const AccessCodeManager = {
  // Private cache for memory fallback
  _accessCodeCache: null,

  /**
   * Save access code securely in the browser
   * @param {string} accessCode - The access code to save
   * @param {string} loginType - The type of login ('parent' or 'employee')
   */
  saveAccessCodeSecurely(accessCode, loginType = 'employee') {
    try {
      // Use sessionStorage for secure, session-based storage
      // Data persists only for the browser session and is cleared when tab is closed
      const secureData = {
        accessCode: accessCode,
        loginType: loginType,
        timestamp: Date.now(),
        sessionId: this.generateSessionId(),
      };

      // Store encrypted/encoded data
      const encodedData = btoa(JSON.stringify(secureData)); // Base64 encode for basic obfuscation
      sessionStorage.setItem('forte_auth_session', encodedData);
    } catch (error) {
      console.error('Failed to save access code securely:', error);
      // Fallback to memory storage if sessionStorage fails
      this._accessCodeCache = {
        accessCode: accessCode,
        loginType: loginType,
        timestamp: Date.now(),
      };
    }
  },

  /**
   * Generate a unique session ID
   * @returns {string} A unique session identifier
   */
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Retrieve the securely stored access code
   * @returns {string|null} The stored access code or null if not found/expired
   */
  getStoredAccessCode() {
    try {
      const encodedData = sessionStorage.getItem('forte_auth_session');
      if (!encodedData) {
        return this._accessCodeCache?.accessCode || null;
      }

      const secureData = JSON.parse(atob(encodedData));

      // Check if session is still valid (optional: add expiration logic)
      const sessionAge = Date.now() - secureData.timestamp;

      if (sessionAge > window.SessionConfig.MAX_AGE_MS) {
        this.clearStoredAccessCode();
        return null;
      }

      return secureData.accessCode;
    } catch (error) {
      console.error('Failed to retrieve stored access code:', error);
      return this._accessCodeCache?.accessCode || null;
    }
  },

  /**
   * Retrieve the securely stored access code and login type
   * @returns {object | null} Object with accessCode and loginType, or null if not found/expired
   */
  getStoredAuthData() {
    try {
      const encodedData = sessionStorage.getItem('forte_auth_session');
      if (!encodedData) {
        if (!this._accessCodeCache) {
          return null;
        }
        if (!this._accessCodeCache.loginType) {
          console.error('loginType not found in access code cache');
          return null;
        }
        return {
          accessCode: this._accessCodeCache.accessCode,
          loginType: this._accessCodeCache.loginType,
        };
      }

      const secureData = JSON.parse(atob(encodedData));

      // Check if session is still valid (optional: add expiration logic)
      const sessionAge = Date.now() - secureData.timestamp;

      if (sessionAge > window.SessionConfig.MAX_AGE_MS) {
        this.clearStoredAccessCode();
        return null;
      }

      if (!secureData.loginType) {
        console.error('loginType not found in stored auth data');
        return null;
      }

      return {
        accessCode: secureData.accessCode,
        loginType: secureData.loginType,
      };
    } catch (error) {
      console.error('Failed to retrieve stored auth data:', error);
      if (!this._accessCodeCache) {
        return null;
      }
      if (!this._accessCodeCache.loginType) {
        console.error('loginType not found in access code cache');
        return null;
      }
      return {
        accessCode: this._accessCodeCache.accessCode,
        loginType: this._accessCodeCache.loginType,
      };
    }
  },

  /**
   * Clear the stored access code (for logout)
   */
  clearStoredAccessCode() {
    try {
      sessionStorage.removeItem('forte_auth_session');
      this._accessCodeCache = null;
      return true;
    } catch (error) {
      console.error('Failed to clear stored access code:', error);
      return false;
    }
  },
};

/**
 * User session storage for current user data
 */
const UserSession = {
  appConfig: null,

  saveAppConfig(config) {
    this.appConfig = config;
  },

  getAppConfig() {
    return this.appConfig;
  },

  getCurrentPeriod() {
    return this.appConfig?.currentPeriod;
  },

  getNextPeriod() {
    return this.appConfig?.nextPeriod;
  },

  clearAppConfig() {
    this.appConfig = null;
  },

  /**
   * Check if the user has accepted the Terms of Service
   * @returns {boolean} True if terms have been accepted
   */
  hasAcceptedTermsOfService() {
    return localStorage.getItem('hasAcceptedTermsOfService') === 'true';
  },

  /**
   * Mark that the user has accepted the Terms of Service
   */
  acceptTermsOfService() {
    localStorage.setItem('hasAcceptedTermsOfService', 'true');
  },

  /**
   * Mark that the user has not accepted the Terms of Service (for testing/reset purposes)
   */
  unacceptTermsOfService() {
    localStorage.removeItem('hasAcceptedTermsOfService');
  },
};

/**
 * Load director information from API and populate HTML elements
 * Fetches admins and finds the one marked as director (isDirector=true)
 */
async function loadDirectorInfo() {
  try {
    // Fetch all admins from API
    const response = await fetch('/api/admins');
    if (!response.ok) {
      console.warn('Failed to fetch admins for director info');
      return;
    }

    const admins = await response.json();

    // Check if admins is null or not an array (unauthenticated user)
    if (!admins || !Array.isArray(admins)) {
      return; // Silently fail - user not authenticated yet
    }

    // Find the director (admin with isDirector=true)
    const director = admins.find(admin => admin.isDirector);

    if (director) {
      // Populate HTML elements with director info
      const nameElement = document.getElementById('director-name');
      const emailElement = document.getElementById('director-email');
      const phoneElement = document.getElementById('director-phone');

      if (nameElement) nameElement.textContent = director.fullName;
      if (emailElement) emailElement.textContent = director.displayEmail || director.email;
      if (phoneElement)
        phoneElement.textContent = director.displayPhone || director.phoneNumber || 'N/A';
    } else {
      console.warn('No director found in admins data');
      // Leave "Loading..." text if no director found
    }
  } catch (error) {
    console.error('Error loading director info:', error);
    // Leave "Loading..." text on error
  }
}

/**
 * Initialize application
 */
async function initializeApplication() {
  try {
    // Log version information
    try {
      const versionResponse = await fetch('/api/version');
      const versionInfo = await versionResponse.json();
      console.log(
        `Tonic v${versionInfo.number} (${versionInfo.environment}) [${versionInfo.gitCommit.substring(0, 7)}]`
      );
    } catch (error) {
      console.warn('Could not fetch version info:', error);
    }

    // Make UserSession and AccessCodeManager available globally before ViewModel initialization
    window.UserSession = UserSession;
    window.AccessCodeManager = AccessCodeManager;

    // Initialize the main ViewModel
    const viewModel = new ViewModel();
    await viewModel.initializeAsync();

    // Store globally for debugging and other scripts
    window.viewModel = viewModel;

    // Initialize TabController for tab-based architecture
    const tabController = new TabController();
    tabController.initialize();

    // Register tabs
    const employeeDirectoryTab = new EmployeeDirectoryTab();
    tabController.registerTab('instructor-forte-directory', employeeDirectoryTab);

    const parentContactTab = new ParentContactTab();
    tabController.registerTab('parent-contact-us', parentContactTab);

    const adminWaitListTab = new AdminWaitListTab();
    tabController.registerTab('admin-wait-list', adminWaitListTab);

    const instructorWeeklyScheduleTab = new InstructorWeeklyScheduleTab();
    tabController.registerTab('instructor-weekly-schedule', instructorWeeklyScheduleTab);

    const parentWeeklyScheduleTab = new ParentWeeklyScheduleTab();
    tabController.registerTab('parent-weekly-schedule', parentWeeklyScheduleTab);

    const adminMasterScheduleTab = new AdminMasterScheduleTab();
    tabController.registerTab('admin-master-schedule', adminMasterScheduleTab);

    const parentRegistrationTab = new ParentRegistrationTab();
    tabController.registerTab('parent-registration', parentRegistrationTab);

    const adminRegistrationTab = new AdminRegistrationTab();
    tabController.registerTab('admin-registration', adminRegistrationTab);

    // Make TabController available globally for NavTabs integration
    window.tabController = tabController;

    // Now that TabController is ready, auto-click the default section if specified
    if (viewModel.roleToClick) {
      const navLink = document.querySelector(`a[data-section="${viewModel.roleToClick}"]`);
      if (navLink) {
        navLink.click();
      }
    }

    // Expose maintenance mode override function globally
    // Usage: window.overrideMaintenanceMode() in browser console
    window.overrideMaintenanceMode = function () {
      if (viewModel && typeof viewModel.overrideMaintenanceMode === 'function') {
        return viewModel.overrideMaintenanceMode();
      } else {
        console.error('✗ Override function not available. Please refresh and try again.');
        return false;
      }
    };

    // Expose server cache clearing function globally (admin only)
    // Usage: window.clearServerCache('your-admin-code') in browser console
    window.clearServerCache = async function (adminCode) {
      if (!adminCode) {
        console.error('✗ Admin code required. Usage: window.clearServerCache("your-admin-code")');
        return false;
      }

      try {
        console.log('🧹 Clearing server cache...');
        const response = await fetch('/api/admin/clearCache', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ adminCode }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('✗ Failed to clear cache:', errorData.error || response.statusText);
          return false;
        }

        const result = await response.json();
        console.log('✓ Server cache cleared successfully by:', result.clearedBy);
        console.log('  Message:', result.message);
        return true;
      } catch (error) {
        console.error('✗ Error clearing server cache:', error);
        return false;
      }
    };

    // Load director info for Terms of Service display
    // This is a non-critical operation, so we don't await it
    loadDirectorInfo();
  } catch (error) {
    console.error('✗ Error initializing application:', error);

    // Show user-friendly error messages
    if (error.message.includes('authorize') || error.message.includes('authenticated')) {
      alert('Please authorize the application to access your account.');
    } else {
      alert(
        `Failed to initialize the application: ${error.message}

Please refresh the page and try again.`
      );
    }

    throw error;
  }
}

/**
 * Environment constants (must match backend NodeEnv values)
 */
const NodeEnv = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
  TEST: 'test',
};

/**
 * Initialize version display for staging environments
 */
async function initializeVersionDisplay() {
  try {
    const response = await fetch('/api/version');
    const versionInfo = await response.json();

    // Set global environment information for use throughout the application
    window.TONIC_ENV = {
      environment: versionInfo.environment,
      isDevelopment: versionInfo.environment === NodeEnv.DEVELOPMENT,
      isStaging: versionInfo.environment === NodeEnv.STAGING,
      isProduction: versionInfo.environment === NodeEnv.PRODUCTION,
      version: versionInfo.number,
      gitCommit: versionInfo.gitCommit,
      // Export NodeEnv constants for use throughout the app
      NodeEnv,
    };

    if (versionInfo.displayVersion) {
      const versionDisplay = document.getElementById('version-display');
      const versionNumber = document.getElementById('version-number-text');
      const versionEnv = document.getElementById('version-env');
      const versionCommit = document.getElementById('version-commit');

      if (versionDisplay && versionNumber && versionEnv && versionCommit) {
        versionNumber.textContent = versionInfo.number;
        versionEnv.textContent = versionInfo.environment.toUpperCase();
        versionCommit.textContent = versionInfo.gitCommit.substring(0, 7);

        versionDisplay.style.display = 'block';

        // Add click handler to copy commit ID and show detailed version info
        versionDisplay.addEventListener('click', async () => {
          // Copy commit ID to clipboard
          try {
            await navigator.clipboard.writeText(versionInfo.gitCommit);
          } catch (error) {
            console.warn('Failed to copy commit ID:', error);
          }

          const details = `
Version: ${versionInfo.number}
${versionInfo.gitTag ? `Git Tag: ${versionInfo.gitTag}\n` : ''}Environment: ${versionInfo.environment}
Build Date: ${new Date(versionInfo.buildDate).toLocaleString()}
Git Commit: ${versionInfo.gitCommit}

✓ Commit ID copied to clipboard!
          `.trim();

          alert(details);
        });
      }
    }
  } catch (error) {
    // Don't throw - version display is not critical
  }
}

/**
 * Main application entry point
 */
async function main() {
  try {
    // Initialize version info first so window.TONIC_ENV is available during app initialization
    try {
      await initializeVersionDisplay();
    } catch (error) {
      console.warn('Version display initialization failed:', error);
    }

    await initializeApplication();
  } catch (error) {
    console.error('Fatal error starting application:', error);
  }
}

main();
