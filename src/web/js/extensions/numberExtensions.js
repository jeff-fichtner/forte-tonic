// convert int to string (or K if 0)
/**
 *
 */
function formatGrade(grade) {
  // Handle both numeric 0 and string "0" for kindergarten
  return (grade === 0 || grade === '0') ? 'K' : (grade?.toString() ?? '');
}

// convert 24-hour time to 12-hour format with AM/PM
/**
 * Formats time from 24-hour format (e.g., "15:00") to 12-hour format (e.g., "3:00 PM")
 * @param {string} time24 - Time in 24-hour format (HH:MM)
 * @returns {string} Time in 12-hour format with AM/PM
 */
function formatTime(time24) {
  if (!time24 || typeof time24 !== 'string') return time24 || 'N/A';
  
  const [hours, minutes] = time24.split(':').map(num => parseInt(num, 10));
  if (isNaN(hours) || isNaN(minutes)) return time24;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// add formatGrade to Number prototype
Number.prototype.formatGrade = function () {
  const grade = this.valueOf(); // Ensure `this` is converted to a primitive number
  return formatGrade(grade); // Pass the primitive number to formatGrade
};

// ES module export for proper module loading
export { formatGrade, formatTime };
