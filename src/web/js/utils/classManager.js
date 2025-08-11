/**
 * ClassManager - Centralized utility for class-related operations
 * Provides methods to check class types and properties
 */

class ClassManager {
  /**
   * Rock Band class IDs that are treated as waitlist classes
   */
  static ROCK_BAND_CLASS_IDS = ['G001', 'G012'];

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
}

// Make it available globally like other managers
window.ClassManager = ClassManager;

export { ClassManager };
