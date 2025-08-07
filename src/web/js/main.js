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
import './extensions/durationExtensions.js';
import './extensions/numberExtensions.js';
import './extensions/stringExtensions.js';
import './viewModel.js';

/**
 * Initialize the application
 */
async function initializeApplication() {
  try {
    console.log('Initializing Tonic application...');

    // Initialize version display first (for staging environments)
    await initializeVersionDisplay();

    // Ensure ViewModel is available
    if (typeof ViewModel === 'undefined') {
      throw new Error('ViewModel is not available. Check that all modules loaded correctly.');
    }

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
