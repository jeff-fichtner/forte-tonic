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
 * Temporary function to bypass initialization and show just navbar with login button
 */
function temporaryBypassInit() {
  console.log('🚧 TEMPORARY BYPASS: Skipping full initialization');
  
  // Hide loading screen
  const loadingContainer = document.getElementById('page-loading-container');
  if (loadingContainer) {
    loadingContainer.style.display = 'none';
    loadingContainer.hidden = true;
  }
  
  // Hide main content (tabs, etc.)
  const pageContent = document.getElementById('page-content');
  if (pageContent) {
    pageContent.hidden = true;
  }
  
  // Hide error content
  const pageErrorContent = document.getElementById('page-error-content');
  if (pageErrorContent) {
    pageErrorContent.hidden = true;
  }
  
  // Nav links are always visible now
  
  // Ensure login button container is positioned properly (nav is always visible)
  const loginButtonContainer = document.getElementById('login-button-container');
  if (loginButtonContainer) {
    loginButtonContainer.setAttribute('data-nav-visible', 'true');
  }
  
  console.log('🚧 Showing minimal UI: Forte title + Nav links + Login button');
}

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

    // Get operator user when page first loads
    const operatorUser = await HttpService.fetch(
      ServerFunctions.getOperatorUser,
      x => OperatorUserResponse.fromApiData(x)
    );
    
    console.log('Operator user loaded:', operatorUser);
    
    // Save user in user session
    UserSession.saveOperatorUser(operatorUser);

    // Show nav links only if operator user returned successfully
    const nav = document.getElementById('nav-mobile');
    if (nav && operatorUser) {
      nav.hidden = false;
      console.log('Nav links shown - operator user authenticated');
      
      // Auto-click on the first present role (admin -> instructor -> parent)
      let roleToClick = null;
      if (operatorUser.isAdmin && operatorUser.isAdmin()) {
        roleToClick = 'admin';
      } else if (operatorUser.isInstructor && operatorUser.isInstructor()) {
        roleToClick = 'instructor';
      } else if (operatorUser.isParent && operatorUser.isParent()) {
        roleToClick = 'parent';
      }
      
      if (roleToClick) {
        // Wait a brief moment for DOM to be ready, then click the nav link
        setTimeout(() => {
          const navLink = document.querySelector(`a[data-section="${roleToClick}"]`);
          if (navLink) {
            console.log(`Auto-clicking ${roleToClick} nav link for operator user`);
            navLink.click();
          }
        }, 100);
      } else {
        // If no specific role matches, click the first nav link
        setTimeout(() => {
          const firstNavLink = document.querySelector('.section-link');
          if (firstNavLink) {
            console.log('No specific role found - auto-clicking first nav link');
            firstNavLink.click();
          }
        }, 100);
      }
    } else {
      console.log('Nav links hidden - no operator user');
    }

    // Initialize the main ViewModel
    const viewModel = new ViewModel();

    // Temporarily bypass loading and show just navbar with login button
    temporaryBypassInit();

    // Store globally for debugging and other scripts
    window.viewModel = viewModel;
    window.operatorUser = operatorUser;
    window.UserSession = UserSession;

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
