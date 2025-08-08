/**
 * Test script to verify UI visibility behavior on page load
 * This script can be run in the browser console to check if elements are properly hidden/shown
 */

function testUIVisibility() {
  console.log('🧪 Testing UI Visibility Behavior...');
  
  // Check initial state of UI elements
  const loginButton = document.getElementById('login-button-container');
  const navLinks = document.getElementById('nav-mobile');
  const tabs = document.querySelectorAll('.tabs .tab');
  const pageContent = document.getElementById('page-content');
  const loadingContainer = document.getElementById('page-loading-container');
  
  console.log('📊 Initial UI State:');
  console.log(`  Login Button Hidden: ${loginButton?.hidden || 'not found'}`);
  console.log(`  Nav Links Hidden: ${navLinks?.hidden || 'not found'}`);
  console.log(`  All Tabs Hidden: ${Array.from(tabs).every(tab => tab.hidden)}`);
  console.log(`  Page Content Hidden: ${pageContent?.hidden || 'not found'}`);
  console.log(`  Loading Container Visible: ${!loadingContainer?.hidden || 'not found'}`);
  
  // Test after initialization
  setTimeout(() => {
    console.log('📊 After Initialization:');
    console.log(`  Login Button Hidden: ${loginButton?.hidden || 'not found'}`);
    console.log(`  Nav Links Hidden: ${navLinks?.hidden || 'not found'}`);
    console.log(`  All Tabs Hidden: ${Array.from(tabs).every(tab => tab.hidden)}`);
    console.log(`  Page Content Hidden: ${pageContent?.hidden || 'not found'}`);
    console.log(`  Loading Container Visible: ${!loadingContainer?.hidden || 'not found'}`);
    
    const loginButtonText = loginButton?.querySelector('a')?.textContent?.trim();
    console.log(`  Login Button Text: "${loginButtonText}"`);
  }, 2000);
}

// Run the test when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testUIVisibility);
} else {
  testUIVisibility();
}
