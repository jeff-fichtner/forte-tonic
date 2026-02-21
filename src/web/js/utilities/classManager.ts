/**
 * ClassManager - Centralized utility for class-related operations
 * Provides methods to check class types and properties
 * Reads configuration from UserSession.appConfig (single source of truth)
 */

interface ClassLike {
  id: string;
  title?: string;
  day?: string;
  startTime?: string;
}

interface RegistrationLike {
  classId: string;
}

class ClassManager {
  /**
   * Get Rock Band class IDs from app configuration
   */
  static getRockBandClassIds(): string[] {
    return (window.UserSession?.getAppConfig()?.rockBandClassIds as string[]) || [];
  }

  /**
   * Check if a class ID represents a Rock Band class (waitlist class)
   */
  static isRockBandClass(classId: string): boolean {
    // Handle both direct string values and objects with .value property
    const id = classId;

    // If no classId provided, it's not a Rock Band class
    if (!id) {
      return false;
    }

    // Trim and normalize for comparison
    const normalizedId = String(id).trim();
    const rockBandIds = this.getRockBandClassIds();

    return rockBandIds.some((rockBandId: string) => String(rockBandId).trim() === normalizedId);
  }

  /**
   * Check if a class ID represents a waitlist class (alias for isRockBandClass)
   */
  static isWaitlistClass(classId: string): boolean {
    return this.isRockBandClass(classId);
  }

  /**
   * Filter registrations to only include Rock Band classes
   */
  static filterRockBandRegistrations(registrations: RegistrationLike[]): RegistrationLike[] {
    return registrations.filter(registration => {
      return this.isRockBandClass(registration.classId);
    });
  }

  /**
   * Format class name with time display, showing special waitlist times for Rock Band classes
   */
  static formatClassNameWithTime(
    cls: ClassLike,
    formatClassNameFn: (cls: ClassLike) => string,
    formatTimeFn: (time: string | undefined) => string
  ): string {
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

  static getRockBandClassLength(): number {
    return 60; // Default length for Rock Band classes
  }
}

// Make it available globally like other managers
window.ClassManager = ClassManager;

export { ClassManager };
