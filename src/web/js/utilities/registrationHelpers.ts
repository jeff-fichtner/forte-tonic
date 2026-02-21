/**
 * Helper functions for registration operations
 */

/**
 * Sort registrations by day, then start time, then length, then registration type (private first, then group)
 * @param {Array} registrations - Array of registration objects
 * @returns {Array} Sorted array of registrations
 */
export function sortRegistrations(registrations) {
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return [...registrations].sort((a, b) => {
    // 1. Sort by day
    const dayA = dayOrder.indexOf(a.day);
    const dayB = dayOrder.indexOf(b.day);
    if (dayA !== dayB) {
      return dayA - dayB;
    }

    // 2. Sort by start time
    const timeA = a.startTime || '';
    const timeB = b.startTime || '';
    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }

    // 3. Sort by length (numeric)
    const lengthA = parseInt(a.length) || 0;
    const lengthB = parseInt(b.length) || 0;
    if (lengthA !== lengthB) {
      return lengthA - lengthB;
    }

    // 4. Sort by registration type (private first, then group)
    const typeA = a.registrationType || '';
    const typeB = b.registrationType || '';
    if (typeA !== typeB) {
      // 'private' comes before 'group' alphabetically, which is what we want
      return typeA.localeCompare(typeB);
    }

    return 0;
  });
}
