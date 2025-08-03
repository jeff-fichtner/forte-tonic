/**
 * Registration Repository - handles registration-specific data operations
 */

import { BaseRepository } from './base/baseRepository.js';
import { Registration } from '../../domain/entities/registration.js';
import { Keys } from '../values/keys.js';
import { RegistrationType } from '../values/registrationType.js';
import { RegistrationValidationService } from '../../domain/services/registrationValidationService.js';
import { RegistrationConflictService } from '../../domain/services/registrationConflictService.js';

export class RegistrationRepository extends BaseRepository {
  constructor(dbClient) {
    super(Keys.REGISTRATIONS, Registration, dbClient);
  }

  /**
   * Generate composite ID based on registration type
   * Delegates to domain service for consistency
   */
  generateRegistrationId(data) {
    return RegistrationConflictService.generateRegistrationId(data);
  }

  /**
   * Creates a new registration with validation and conflict checking
   */
  async create(registrationData) {
    try {
      console.log('📝 Creating new registration');

      // Domain validation
      const validation = RegistrationValidationService.validateRegistrationData(registrationData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for conflicts
      const existingRegistrations = await this.findAll();
      const conflictCheck = await RegistrationConflictService.checkConflicts(
        registrationData, 
        existingRegistrations
      );
      
      if (conflictCheck.hasConflicts) {
        const conflictMessages = conflictCheck.conflicts.map(c => c.message).join('; ');
        throw new Error(`Registration conflicts detected: ${conflictMessages}`);
      }

      // Generate composite ID
      const id = this.generateRegistrationId(registrationData);
      registrationData.id = id;

      // Add audit fields
      registrationData.registeredBy = registrationData.registeredBy || 'system';
      registrationData.registeredAt = new Date().toISOString();

      // Save via parent
      const created = await super.create(registrationData);

      console.log('✅ Registration saved with ID:', created.id);
      return created;
    } catch (error) {
      console.error('❌ Error creating registration:', error);
      throw new Error(`Failed to create registration: ${error.message}`);
    }
  }

  /**
   * Find registrations by student ID
   */
  async findByStudentId(studentId) {
    return await this.findBy('studentId', studentId);
  }

  /**
   * Find registrations by instructor ID
   */
  async findByInstructorId(instructorId) {
    return await this.findBy('instructorId', instructorId);
  }

  /**
   * Find registrations by class ID
   */
  async findByClassId(classId) {
    return await this.findBy('classId', classId);
  }

  /**
   * Find registrations by school year and trimester
   */
  async findBySchoolYearAndTrimester(schoolYear, trimester) {
    const all = await this.findAll();
    return all.filter(reg => reg.schoolYear === schoolYear && reg.trimester === trimester);
  }

  /**
   * Find active registrations for current school year
   */
  async findActiveRegistrations() {
    const currentYear = new Date().getFullYear();
    const schoolYear = `${currentYear}-${currentYear + 1}`;
    return await this.findBySchoolYearAndTrimester(schoolYear, 'Fall');
  }
}
