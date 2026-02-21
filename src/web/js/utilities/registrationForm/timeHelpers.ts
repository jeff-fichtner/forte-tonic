/**
 * Time Helper Utilities for Registration Forms
 * Shared time parsing, formatting, and generation functions
 */

import { TimeSlotConfig } from '../../constants/registrationFormConstants.js';

/**
 * Parse time string to minutes since midnight
 * Supports both "HH:MM" (24-hour) and "H:MM AM/PM" (12-hour) formats
 * @param {string} timeStr - Time string to parse
 * @returns {number|null} Minutes since midnight, or null if invalid
 */
export function parseTime(timeStr) {
  if (!timeStr) return null;

  // Handle AM/PM format (e.g., "3:00 PM", "11:30 AM")
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;

    if (period === 'PM' && hours !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }

    return hour24 * 60 + (minutes || 0);
  }

  // Handle 24-hour format (e.g., "15:00", "09:30")
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Format minutes since midnight to HH:MM format (24-hour)
 * @param {number} minutes - Minutes since midnight
 * @returns {string} Time in HH:MM format
 */
export function formatTimeFromMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Format 24-hour time to 12-hour display format
 * @param {string} time24 - Time in HH:MM format
 * @returns {string} Time in "H:MM AM/PM" format
 */
export function formatDisplayTime(time24) {
  const [hours, minutes] = time24.split(':');
  const hour12 = parseInt(hours) % 12 || 12;
  const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Generate array of time slot options for dropdowns
 * Uses configuration from TimeSlotConfig
 * @returns {Array<{value: string, label: string}>} Array of time options
 */
export function generateTimeOptions() {
  const times = [];
  const { START_HOUR, END_HOUR, INTERVAL_MINUTES } = TimeSlotConfig;

  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += INTERVAL_MINUTES) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = formatDisplayTime(timeString);
      times.push({ value: timeString, label: displayTime });
    }
  }

  return times;
}

/**
 * Calculate end time given start time and duration
 * @param {string} startTime - Start time in HH:MM format
 * @param {number} lengthMinutes - Duration in minutes
 * @returns {string} End time in HH:MM format
 */
export function calculateEndTime(startTime, lengthMinutes) {
  const startMinutes = parseTime(startTime);
  const endMinutes = startMinutes + lengthMinutes;
  return formatTimeFromMinutes(endMinutes);
}

/**
 * Check if a time is before another time
 * @param {string} time1 - First time
 * @param {string} time2 - Second time
 * @returns {boolean} True if time1 is before time2
 */
export function isTimeBefore(time1, time2) {
  return parseTime(time1) < parseTime(time2);
}

/**
 * Check if a time is after another time
 * @param {string} time1 - First time
 * @param {string} time2 - Second time
 * @returns {boolean} True if time1 is after time2
 */
export function isTimeAfter(time1, time2) {
  return parseTime(time1) > parseTime(time2);
}
