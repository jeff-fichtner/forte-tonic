/**
 * Registration Repository - handles registration-specific data operations
 */

import { BaseRepository } from './base/baseRepository.js';
import { Registration } from '../models/registration.js';
import { Keys } from '../values/keys.js';
import { RegistrationType } from '../values/registrationType.js';

export class RegistrationRepository extends BaseRepository {
  constructor(dbClient) {
    super(Keys.REGISTRATIONS, Registration, dbClient);
  }

  /**
   * Generate composite ID based on registration type
   */
  generateRegistrationId(data) {
    if (data.registrationType === RegistrationType.GROUP) {
      return `${data.studentId}_${data.classId}`;
    } else {
      return `${data.studentId}_${data.instructorId}_${data.day}_${data.startTime}`;
    }
  }

  /**
   * Creates a new registration with proper ID generation
   */
  async create(registrationData) {
    try {
      console.log('📝 Creating new registration');

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
