/**
 * Program Validation Service - validates program catalog business rules
 *
 * Handles program-specific validation:
 * - Group class catalog integrity
 * - Special business cases (waitlist classes)
 * - Program requirements
 */

import { ConfigurationService } from './configurationService.js';
import type { RegistrationData } from '../models/shared/registration.js';
import type { ClassData } from '../models/shared/class.js';

export class ProgramValidationService {
  /**
   * Validate program-specific business rules
   * (Data format validation is handled by RegistrationValidationService)
   */
  static validateRegistration(
    registrationData: RegistrationData,
    groupClass: ClassData | null
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Group class specific program rules
    if (groupClass) {
      // Waitlist classes (Rock Band) don't need scheduling validation
      const rockBandClassIds = ConfigurationService.getRockBandClassIds();
      const isWaitlistClass = groupClass.id ? rockBandClassIds.includes(groupClass.id) : false;

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
