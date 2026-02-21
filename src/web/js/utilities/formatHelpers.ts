/**
 * Format helpers for common string and date formatting operations
 */

import { MonthNames } from '../constants.js';

/**
 * Capitalize the first letter of a string (for display purposes)
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a datetime value for display in tables
 * @param {string|Date|number} timestamp - The timestamp to format
 * @returns {string} Formatted datetime string
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return 'N/A';

  try {
    let date;

    // Handle different input types
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      // Handle ISO strings or other date strings
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      // Handle Google Sheets serial dates or Unix timestamps
      if (timestamp > 1 && timestamp < 100000) {
        // Likely a Google Sheets serial date (days since 1899-12-30)
        const googleEpoch = new Date(1899, 11, 30); // Month is 0-indexed
        const msPerDay = 24 * 60 * 60 * 1000;
        date = new Date(googleEpoch.getTime() + timestamp * msPerDay);
      } else {
        // Assume Unix timestamp (milliseconds or seconds)
        date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
      }
    } else {
      // Try to convert to string and parse
      date = new Date(String(timestamp));
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'Invalid Date';
    }

    // Format as "Aug 10 - 8:11 PM"
    const month = MonthNames[date.getMonth()];
    const day = date.getDate();
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${month} ${day} - ${time}`;
  } catch (error) {
    console.warn('Error formatting timestamp:', timestamp, error);
    return 'Invalid Date';
  }
}
