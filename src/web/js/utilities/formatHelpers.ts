/**
 * Format helpers for common string and date formatting operations
 */

/**
 * Capitalize the first letter of a string (for display purposes)
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a datetime value for display in tables
 * Handles Date objects, ISO strings, Unix timestamps, and Google Sheets serial dates
 * @param {string|Date|number} timestamp - The timestamp to format
 * @returns {string} Formatted datetime string in "M/D/YYYY, H:MM AM/PM" format
 */
export function formatDateTime(timestamp: string | Date | number): string {
  if (!timestamp) return 'N/A';

  try {
    let date: Date;

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

    // Format: "M/D/YYYY, H:MM AM/PM"
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;

    return `${month}/${day}/${year}, ${hours}:${minutesStr} ${ampm}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Error formatting date';
  }
}
