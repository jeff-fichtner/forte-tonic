/**
 * Utility functions for formatting class names in dropdowns
 */

import { formatGrade } from '../extensions/numberExtensions.js';

/**
 * Formats a class name for display in dropdown selects
 * Enhances the existing class properties with proper grade formatting
 * @param {object} cls - Class object with formattedName, title, instrument properties
 * @returns {string} Formatted class name for dropdown display
 */
export function formatClassNameForDropdown(cls) {
  // First try to use the class's existing formattedName
  if (cls.formattedName) {
    return cls.formattedName;
  }

  // Fallback to building a formatted name
  let className = cls.title || cls.instrument || `Class ${cls.id}`;

  // If we have grade information, format it properly
  if (cls.minimumGrade !== undefined && cls.maximumGrade !== undefined) {
    const minGradeFormatted = formatGrade(cls.minimumGrade);
    const maxGradeFormatted = formatGrade(cls.maximumGrade);
    
    if (minGradeFormatted && maxGradeFormatted) {
      const gradeRange = minGradeFormatted === maxGradeFormatted 
        ? minGradeFormatted 
        : `${minGradeFormatted}-${maxGradeFormatted}`;
      
      className = `${className} (${gradeRange})`;
    }
  }

  // Add schedule info if available
  if (cls.day && cls.formattedStartTime) {
    className += `: ${cls.day} at ${cls.formattedStartTime}`;
  }

  return className;
}

/**
 * Enhanced version that specifically ensures kindergarten displays as "K"
 * @param {object} cls - Class object
 * @returns {string} Formatted class name with proper kindergarten handling
 */
export function formatClassNameWithGradeCorrection(cls) {
  let displayName = cls.formattedName || cls.title || cls.instrument || `Class ${cls.id}`;
  
  // Check if the display name contains "kindergarten" and replace it with "K"
  displayName = displayName.replace(/\bkindergarten\b/gi, 'K');
  
  // Also handle the case where it might show "0" instead of "K" in grade ranges
  displayName = displayName.replace(/\b0-/g, 'K-');
  displayName = displayName.replace(/-0\b/g, '-K');
  displayName = displayName.replace(/\(0\)/g, '(K)');
  displayName = displayName.replace(/\(0-/g, '(K-');
  displayName = displayName.replace(/-0\)/g, '-K)');
  
  return displayName;
}
