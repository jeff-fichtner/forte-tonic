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

    // TEMPORARILY FORCE NAV SECTION LINKS TO BE HIDDEN
    const navLinks = document.getElementById('nav-mobile');
    if (navLinks) {
      navLinks.hidden = true;
      console.log('🚫 NAV SECTION LINKS TEMPORARILY HIDDEN PER REQUEST');
    }

    // Debug UI visibility state on start
    console.log('Initial UI visibility state:');
    const loginButton = document.getElementById('login-button-container');
    const tabs = document.querySelectorAll('.tabs .tab');
    const pageContent = document.getElementById('page-content');
    const loadingContainer = document.getElementById('page-loading-container');
    
    console.log(`- Login Button Hidden: ${loginButton?.hidden || 'not found'}`);
    console.log(`- Nav Links Hidden: ${navLinks?.hidden || 'not found'}`);
    console.log(`- All Tabs Hidden: ${Array.from(tabs).every(tab => tab.hidden)}`);
    console.log(`- Page Content Hidden: ${pageContent?.hidden || 'not found'}`);
    console.log(`- Loading Container Visible: ${!loadingContainer?.hidden || 'not found'}`);

    // Make UserSession available globally before ViewModel initialization
    window.UserSession = UserSession;

    // Initialize the main ViewModel
    const viewModel = new ViewModel();
    await viewModel.initializeAsync();

    // FORCE NAV SECTION LINKS TO STAY HIDDEN AFTER INITIALIZATION
    const navLinksElement = document.getElementById('nav-mobile');
    if (navLinksElement) {
      navLinksElement.hidden = true;
      console.log('🚫 NAV SECTION LINKS FORCED HIDDEN AFTER INITIALIZATION');
    }

    // Debug UI visibility state after initialization
    console.log('UI visibility state after initialization:');
    console.log(`- Login Button Hidden: ${loginButton?.hidden || 'not found'}`);
    console.log(`- Nav Links Hidden: ${navLinks?.hidden || 'not found'}`);
    console.log(`- All Tabs Hidden: ${Array.from(tabs).every(tab => tab.hidden)}`);
    console.log(`- Page Content Hidden: ${pageContent?.hidden || 'not found'}`);
    console.log(`- Loading Container Visible: ${!loadingContainer?.hidden || 'not found'}`);

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
    
    // Add mutation observer to ensure nav links stay hidden
    const navLinks = document.getElementById('nav-mobile');
    if (navLinks) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'hidden' && !navLinks.hidden) {
            console.log('🚫 Detected attempt to show nav links - forcing hidden');
            navLinks.hidden = true;
          }
        });
      });
      
      observer.observe(navLinks, { attributes: true });
      console.log('🔒 Added observer to ensure nav links stay hidden');
    }
    
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

// Start the application when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
