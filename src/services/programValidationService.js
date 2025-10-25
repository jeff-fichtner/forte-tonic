/**
 * Program Validation Service - validates program catalog business rules
 *
 * Handles program-specific validation:
 * - Group class catalog integrity
 * - Special business cases (waitlist classes)
 * - Program requirements
 */

import { ConfigurationService } from './configurationService.js';

export class ProgramValidationService {
  /**
   * Validate program-specific business rules
   * (Data format validation is handled by RegistrationValidationService)
   */
  static validateRegistration(registrationData, groupClass) {
    const errors = [];

    // Group class specific program rules
    if (groupClass) {
      // Waitlist classes (Rock Band) don't need scheduling validation
      const rockBandClassIds = ConfigurationService.getRockBandClassIds();
      const isWaitlistClass = rockBandClassIds.includes(groupClass.id);

      // For non-waitlist classes, ensure class has required scheduling data
      if (!isWaitlistClass && (!groupClass.day || !groupClass.startTime || !groupClass.length)) {
        errors.push('Group class must have day, start time, and length');
      }

      // All group classes must have a title
      if (!groupClass.title) {
        errors.push('Group class title is required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
