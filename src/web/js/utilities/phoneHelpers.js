/**
 * Phone number formatting utilities
 */

/**
 * Formats phone number for display from 10 unformatted digits
 * @param {string} phoneNumber - Phone number to format (should be 10 digits)
 * @returns {string} Formatted phone number as (XXX) XXX-XXXX or original if invalid
 */
export function formatPhone(phoneNumber) {
  if (!phoneNumber) return '';

  // Format as (XXX) XXX-XXXX for 10-digit numbers
  if (phoneNumber.length === 10) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
  }

  // Return original if not standard 10-digit format
  return phoneNumber;
}

/**
 * Validates that a phone number is exactly 10 digits (unformatted)
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if exactly 10 digits
 */
export function isValidUnformattedPhone(phoneNumber) {
  if (!phoneNumber) return false;
  
  const cleaned = phoneNumber.replace(/\D/g, '');
  return cleaned.length === 10;
}

/**
 * Strips all formatting from a phone number, leaving only digits
 * @param {string} phoneNumber - Phone number to strip
 * @returns {string} Only digits
 */
export function stripPhoneFormatting(phoneNumber) {
  if (!phoneNumber) return '';
  return phoneNumber.replace(/\D/g, '');
}

// For backwards compatibility with existing code (browser only)
if (typeof window !== 'undefined') {
  window.formatPhone = formatPhone;
  window.isValidUnformattedPhone = isValidUnformattedPhone;
  window.stripPhoneFormatting = stripPhoneFormatting;
}
