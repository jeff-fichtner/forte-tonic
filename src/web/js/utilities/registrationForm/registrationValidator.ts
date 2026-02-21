/**
 * Registration Form Validation Utilities
 * Shared validation logic for both admin and parent registration forms
 */

import {
  BusDeadlines,
  RegistrationFormText,
  TransportationType,
} from '../../constants/registrationFormConstants.js';
import { parseTime, formatTimeFromMinutes, calculateEndTime } from './timeHelpers.js';

/**
 * Validate bus time restrictions for Late Bus transportation
 * @param {string} day - Day of the week (e.g., 'Monday', 'Wednesday')
 * @param {string} startTime - Start time in HH:MM format
 * @param {number} lengthMinutes - Duration in minutes
 * @param {string} transportationType - Selected transportation type
 * @returns {{isValid: boolean, errorMessage: string|null}} Validation result
 */
export function validateBusTimeRestrictions(day, startTime, lengthMinutes, transportationType) {
  // Only validate if Late Bus is selected
  if (transportationType !== TransportationType.BUS && transportationType !== 'bus') {
    return { isValid: true, errorMessage: null };
  }

  // Parse start time and calculate end time
  const startMinutes = parseTime(startTime);
  const endMinutes = startMinutes + lengthMinutes;

  // Convert end time back to time string for display
  const endTimeDisplay = formatTimeFromMinutes(endMinutes);

  // Get bus deadline for the selected day
  const deadlineTime = BusDeadlines[day];
  if (!deadlineTime) {
    return { isValid: true, errorMessage: null }; // Unknown day, allow
  }

  const deadlineMinutes = parseTime(deadlineTime);
  const deadlineDisplay = formatTimeFromMinutes(deadlineMinutes);

  // Check if lesson ends after bus deadline
  if (endMinutes > deadlineMinutes) {
    const errorMessage = RegistrationFormText.BUS_ERROR_TEMPLATE(
      deadlineDisplay,
      day,
      endTimeDisplay
    );
    return { isValid: false, errorMessage };
  }

  return { isValid: true, errorMessage: null };
}

/**
 * Validate required fields for private registration
 * @param {object} data - Registration data to validate
 * @returns {{isValid: boolean, errors: string[]}} Validation result with error list
 */
export function validatePrivateRegistration(data) {
  const errors = [];

  if (!data.studentId) {
    errors.push('Student');
  }
  if (!data.instructorId) {
    errors.push('Instructor');
  }
  if (data.day === undefined || data.day === null || data.day === '') {
    errors.push('Day');
  }
  if (!data.startTime) {
    errors.push('Start Time');
  }
  if (!data.length) {
    errors.push('Lesson Length');
  }
  if (!data.instrument) {
    errors.push('Instrument');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate required fields for group registration
 * @param {object} data - Registration data to validate
 * @returns {{isValid: boolean, errors: string[]}} Validation result with error list
 */
export function validateGroupRegistration(data) {
  const errors = [];

  if (!data.studentId) {
    errors.push('Student');
  }
  if (!data.classId) {
    errors.push('Class');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate registration data based on registration type
 * @param {object} data - Registration data
 * @param {string} registrationType - 'private' or 'group'
 * @returns {{isValid: boolean, errors: string[]}} Validation result
 */
export function validateRegistrationData(data, registrationType) {
  if (!data.registrationType && !registrationType) {
    return { isValid: false, errors: ['Registration Type'] };
  }

  const type = registrationType || data.registrationType;

  if (type === 'private') {
    return validatePrivateRegistration(data);
  } else if (type === 'group') {
    return validateGroupRegistration(data);
  }

  return { isValid: false, errors: ['Registration Type'] };
}

/**
 * Format validation errors into a user-friendly message
 * @param {string[]} errors - Array of error field names
 * @returns {string} Formatted error message
 */
export function formatValidationErrors(errors) {
  if (errors.length === 0) {
    return '';
  }
  return `${RegistrationFormText.ERROR_VALIDATION}:<br>${errors.join('<br>')}`;
}
