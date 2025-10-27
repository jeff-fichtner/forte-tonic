/**
 * Message Display Utility
 * Handles error and info message display for registration forms
 */

/**
 * Get or create an error message container
 * @param {string} containerId - ID for the error container
 * @param {string} targetElementId - ID of element to insert after
 * @returns {HTMLElement} The error container element
 */
export function getOrCreateErrorContainer(containerId, targetElementId) {
  let errorContainer = document.getElementById(containerId);

  if (!errorContainer) {
    // Create error container
    errorContainer = document.createElement('div');
    errorContainer.id = containerId;
    errorContainer.style.cssText =
      'margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #d32f2f; font-size: 14px; display: none;';

    // Insert after the target element
    const targetElement = document.getElementById(targetElementId);
    const inputField = targetElement?.closest('.input-field');
    if (inputField) {
      inputField.parentNode.insertBefore(errorContainer, inputField.nextSibling);
    }
  }

  return errorContainer;
}

/**
 * Show an error message
 * @param {string} containerId - ID of the error container
 * @param {string} message - Error message to display
 */
export function showErrorMessage(containerId, message) {
  const errorContainer = document.getElementById(containerId);
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  }
}

/**
 * Clear an error message
 * @param {string} containerId - ID of the error container
 */
export function clearErrorMessage(containerId) {
  const errorContainer = document.getElementById(containerId);
  if (errorContainer) {
    errorContainer.style.display = 'none';
    errorContainer.textContent = '';
  }
}

/**
 * Get or create an info/warning message container
 * @param {string} containerId - ID for the message container
 * @param {string} targetElementId - ID of element to insert after
 * @returns {HTMLElement} The message container element
 */
export function getOrCreateInfoContainer(containerId, targetElementId) {
  let messageContainer = document.getElementById(containerId);

  if (!messageContainer) {
    // Create info message container
    messageContainer = document.createElement('div');
    messageContainer.id = containerId;

    // Insert after the target element
    const targetElement = document.getElementById(targetElementId);
    const inputField = targetElement?.closest('.input-field');
    if (inputField) {
      inputField.parentNode.insertBefore(messageContainer, inputField.nextSibling);
    }
  }

  return messageContainer;
}

/**
 * Show an info or warning message
 * @param {string} containerId - ID of the message container
 * @param {string} message - Message to display
 * @param {string} type - Message type ('info' or 'warning')
 */
export function showInfoMessage(containerId, message, type = 'info') {
  const messageContainer = document.getElementById(containerId);

  if (!messageContainer) {
    return;
  }

  // Set styles based on message type
  if (type === 'info') {
    messageContainer.style.cssText =
      'margin-top: 10px; padding: 10px; background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; color: #1976d2; font-size: 14px; display: block;';
  } else if (type === 'warning') {
    messageContainer.style.cssText =
      'margin-top: 10px; padding: 10px; background: #fff3e0; border: 1px solid #ff9800; border-radius: 4px; color: #f57c00; font-size: 14px; display: block;';
  }

  messageContainer.textContent = message;
}

/**
 * Clear an info message
 * @param {string} containerId - ID of the message container
 */
export function clearInfoMessage(containerId) {
  const messageContainer = document.getElementById(containerId);
  if (messageContainer) {
    messageContainer.style.display = 'none';
    messageContainer.textContent = '';
  }
}
