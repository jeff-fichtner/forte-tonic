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

  // Strip all formatting first to get just digits
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX for 10-digit numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
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

/**
 * Formats phone number as user types with automatic formatting
 * @param {string} value - Current input value
 * @returns {string} Formatted phone number
 */
export function formatPhoneAsTyped(value) {
  if (!value) return '';
  
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limitedDigits = digits.substring(0, 10);
  
  // Apply formatting based on length
  if (limitedDigits.length <= 3) {
    return limitedDigits;
  } else if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  } else {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
  }
}

/**
 * Validates phone number format and completeness
 * @param {string} phoneNumber - Phone number to validate (can be formatted or unformatted)
 * @returns {boolean} True if valid 10-digit US phone number
 */
export function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) return false;
  
  const digits = stripPhoneFormatting(phoneNumber);
  
  // Must be exactly 10 digits
  if (digits.length !== 10) return false;
  
  // For development/testing, be more permissive
  // In production, you might want stricter NANP validation
  // For now, just ensure it's 10 digits and not all zeros
  if (digits === '0000000000') return false;
  
  return true;
}

// For backwards compatibility with existing code (browser only)
if (typeof window !== 'undefined') {
  window.formatPhone = formatPhone;
  window.isValidUnformattedPhone = isValidUnformattedPhone;
  window.stripPhoneFormatting = stripPhoneFormatting;
  window.formatPhoneAsTyped = formatPhoneAsTyped;
  window.isValidPhoneNumber = isValidPhoneNumber;
}
