/**
 * Modern ES Module entry point for Tonic
 * This file uses ES module imports to load all required dependencies
 */

// Import all required modules
import './constants.js';
import './data/httpService.js';
import '/models/shared/responses/authenticatedUserResponse.js';
import '/models/shared/responses/operatorUserResponse.js';
import '/models/shared/admin.js';
import '/models/shared/class.js';
import '/models/shared/instructor.js';
import '/models/shared/parent.js';
import '/models/shared/registration.js';
import '/models/shared/room.js';
import '/models/shared/student.js';
import './components/autocomplete.js';
import './components/checkbox.js';
import './components/input.js';
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
import './extensions/durationExtensions.js';
import './extensions/numberExtensions.js';
import './extensions/stringExtensions.js';
import './viewModel.js';

/**
 * Access code manager for secure storage and retrieval of access codes
 */
const AccessCodeManager = {
  // Private cache for memory fallback
  _accessCodeCache: null,

  /**
   * Save access code securely in the browser
   * @param {string} accessCode - The access code to save
   */
  saveAccessCodeSecurely(accessCode) {
    try {
      // Use sessionStorage for secure, session-based storage
      // Data persists only for the browser session and is cleared when tab is closed
      const secureData = {
        accessCode: accessCode,
        timestamp: Date.now(),
        sessionId: this.generateSessionId()
      };

      // Store encrypted/encoded data
      const encodedData = btoa(JSON.stringify(secureData)); // Base64 encode for basic obfuscation
      sessionStorage.setItem('forte_auth_session', encodedData);

      console.log('Access code saved securely in session storage');
    } catch (error) {
      console.error('Failed to save access code securely:', error);
      // Fallback to memory storage if sessionStorage fails
      this._accessCodeCache = {
        accessCode: accessCode,
        timestamp: Date.now()
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
      const maxSessionAge = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

      if (sessionAge > maxSessionAge) {
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
   * Clear the stored access code (for logout)
   */
  clearStoredAccessCode() {
    try {
      sessionStorage.removeItem('forte_auth_session');
      this._accessCodeCache = null;
      console.log('Stored access code cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear stored access code:', error);
      return false;
    }
  }
};

/**
 * User session storage for current user data
 */
const UserSession = {
  operatorUser: null,

  saveOperatorUser(user) {
    this.operatorUser = user;
    console.log('Operator user saved to user session');
  },

  getOperatorUser() {
    return this.operatorUser;
  },

  clearOperatorUser() {
    this.operatorUser = null;
    console.log('Operator user cleared from user session');
  }
};

/**
 * Initialize the application
 */
async function initializeApplication() {
  try {
    console.log('Initializing Tonic application...');

    // Make UserSession and AccessCodeManager available globally before ViewModel initialization
    window.UserSession = UserSession;
    window.AccessCodeManager = AccessCodeManager;

    // Initialize the main ViewModel
    const viewModel = new ViewModel();
    await viewModel.initializeAsync();

    // Store globally for debugging and other scripts
    window.viewModel = viewModel;

    console.log('✓ Application initialized successfully');
  } catch (error) {
    console.error('✗ Error initializing application:', error);

    // Show user-friendly error messages
    if (error.message.includes('authorize') || error.message.includes('authenticated')) {
      alert('Please authorize the application to access your account.');
    } else {
      alert(
        `Failed to initialize the application: ${error.message}\n\nPlease refresh the page and try again.`
      );
    }

    throw error;
  }
}

/**
 * Initialize version display for staging environments
 */
async function initializeVersionDisplay() {
  try {
    console.log('🏷️ Initializing version display...');
    const response = await fetch('/api/version');
    const versionInfo = await response.json();

    console.log('🏷️ Version info received:', versionInfo);

    if (versionInfo.displayVersion) {
      const versionDisplay = document.getElementById('version-display');
      const versionNumber = document.getElementById('version-number-text');
      const versionEnv = document.getElementById('version-env');
      const versionCommit = document.getElementById('version-commit');

      console.log('🏷️ Version display elements:', {
        versionDisplay: !!versionDisplay,
        versionNumber: !!versionNumber,
        versionEnv: !!versionEnv,
        versionCommit: !!versionCommit
      });

      if (versionDisplay && versionNumber && versionEnv && versionCommit) {
        versionNumber.textContent = versionInfo.number;
        versionEnv.textContent = versionInfo.environment.toUpperCase();
        versionCommit.textContent = versionInfo.gitCommit.substring(0, 7);

        versionDisplay.style.display = 'block';

        // Add click handler to show detailed version info
        versionDisplay.addEventListener('click', () => {
          const details = `
Version: ${versionInfo.number}
Environment: ${versionInfo.environment}
Build Date: ${new Date(versionInfo.buildDate).toLocaleString()}
Git Commit: ${versionInfo.gitCommit}
          `.trim();

          alert(details);
        });

        console.log(`🏷️ Version display initialized: v${versionInfo.number} (${versionInfo.environment})`);
      } else {
        console.warn('🏷️ Version display elements not found in DOM');
      }
    } else {
      console.log('🏷️ Version display disabled for this environment');
    }
  } catch (error) {
    console.warn('🏷️ Failed to initialize version display:', error);
    // Don't throw - version display is not critical
  }
}

/**
 * Main application entry point
 */
async function main() {
  try {
    await initializeApplication();
    
    // Version display is optional and not critical
    try {
      await initializeVersionDisplay();
    } catch (error) {
      console.warn('Version display initialization failed:', error);
    }
  } catch (error) {
    console.error('Fatal error starting application:', error);
  }
}

main();