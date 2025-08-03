/**
 * Modern ES Module entry point for Tonic
 * This file uses ES module imports to load all required dependencies
 */

// Import all required modules
import './constants.js';
import './data/httpService.js';
import './models/responses/authenticatedUserResponse.js';
import './models/admin.js';
import './models/class.js';
import './models/instructor.js';
import './models/parent.js';
import './models/registration.js';
import './models/room.js';
import './models/student.js';
import './models/studentFull.js';
import './components/autocomplete.js';
import './components/checkbox.js';
import './components/input.js';
import './components/navTabs.js';
import './components/select.js';
import './components/table.js';
import './workflows/adminRegistrationForm.js';
import './data/apiClient.js';
import './data/indexedDbClient.js';
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
      alert(`Failed to initialize the application: ${error.message}\n\nPlease refresh the page and try again.`);
    }
    
    throw error;
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
