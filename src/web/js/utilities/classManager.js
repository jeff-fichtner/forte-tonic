/**
 * ClassManager - Centralized utility for class-related operations
 * Provides methods to check class types and properties
 */

class ClassManager {
  /**
   * Rock Band class IDs that are treated as waitlist classes
   * This will be updated from server configuration
   */
  static ROCK_BAND_CLASS_IDS = []; // Default fallback

  /**
   * Update Rock Band class IDs from server configuration
   * @param {string[]} classIds - Array of Rock Band class IDs from server
   */
  static updateRockBandClassIds(classIds) {
    if (Array.isArray(classIds) && classIds.length > 0) {
      this.ROCK_BAND_CLASS_IDS = classIds;
      console.log('Updated Rock Band class IDs from server configuration:', classIds);
    }
  }

  /**
   * Check if a class ID represents a Rock Band class (waitlist class)
   * @param {string|object} classId - The class ID to check (can be string or object with .value property)
   * @returns {boolean} True if the class is a Rock Band class
   */
  static isRockBandClass(classId) {
    // Handle both direct string values and objects with .value property
    const id = classId?.value || classId;
    return this.ROCK_BAND_CLASS_IDS.includes(id);
  }

  /**
   * Check if a class ID represents a waitlist class (alias for isRockBandClass)
   * @param {string|object} classId - The class ID to check
   * @returns {boolean} True if the class is a waitlist class
   */
  static isWaitlistClass(classId) {
    return this.isRockBandClass(classId);
  }

  /**
   * Get all Rock Band class IDs
   * @returns {string[]} Array of Rock Band class IDs
   */
  static getRockBandClassIds() {
    return [...this.ROCK_BAND_CLASS_IDS];
  }

  /**
   * Filter registrations to only include Rock Band classes
   * @param {Array} registrations - Array of registration objects
   * @returns {Array} Filtered array containing only Rock Band class registrations
   */
  static filterRockBandRegistrations(registrations) {
    return registrations.filter(registration => {
      return this.isRockBandClass(registration.classId);
    });
  }

  /**
   * Format class name with time display, showing special waitlist times for Rock Band classes
   * @param {Object} cls - Class object with properties like id, title, day, startTime
   * @param {Function} formatClassNameFn - Function to format the base class name
   * @param {Function} formatTimeFn - Function to format time
   * @returns {string} Formatted class name with time
   */
  static formatClassNameWithTime(cls, formatClassNameFn, formatTimeFn) {
    const baseName = formatClassNameFn(cls);
    
    // Check if this is a waitlist class (Rock Band class)
    if (this.isRockBandClass(cls.id)) {
      // Show special waitlist times with "or" separators, skip day and actual time
      return `${baseName}: Monday 3-4 PM or Monday 4-5 PM or Friday 3-4 PM`;
    }
    
    // For regular classes, show day and time
    const timeDisplay = formatTimeFn(cls.startTime) || 'TBD';
    const dayDisplay = cls.day || 'TBD';
    return `${baseName}: ${dayDisplay} ${timeDisplay}`;
  }

  static getRockBandClassLength() {
    return 60; // Default length for Rock Band classes
  }

  /**
   * Restricted class IDs that should not be available for parent registration
   * These are classes that should be filtered out from the registration form
   */
  static RESTRICTED_CLASS_IDS = ['G001', 'G012', 'G014'];

  /**
   * Check if a class ID is restricted from parent registration
   * @param {string|object} classId - The class ID to check (can be string or object with .value property)
   * @returns {boolean} True if the class is restricted from registration
   */
  static isRestrictedClass(classId) {
    // Handle both direct string values and objects with .value property
    const id = classId?.value || classId;
    return this.RESTRICTED_CLASS_IDS.includes(id);
  }

  /**
   * Filter classes to exclude restricted ones from parent registration
   * @param {Array} classes - Array of class objects
   * @returns {Array} Filtered array with restricted classes removed
   */
  static filterRestrictedClasses(classes) {
    return classes.filter(cls => !this.isRestrictedClass(cls.id));
  }
}

// Make it available globally like other managers
window.ClassManager = ClassManager;

export { ClassManager };
