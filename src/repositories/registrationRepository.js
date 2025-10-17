/**
 * Registration Repository
 * =======================
 *
 * Repository for simplified registration model with UUID primary keys
 */

import crypto from 'crypto';
import { BaseRepository } from './baseRepository.js';
import { Registration } from '../models/shared/registration.js';
import { RegistrationId } from '../utils/values/registrationId.js';

export class RegistrationRepository extends BaseRepository {
  constructor(dbClient) {
    super('registrations', Registration, dbClient);
  }

  /**
   * Get registration by UUID (new format)
   */
  async getById(id) {
    try {
      const registrationId = typeof id === 'string' ? new RegistrationId(id) : id;

      // Check cache first
      const cacheKey = `registrations:${registrationId.getValue()}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTtl) {
          return cached.data;
        }
      }

      // Use cached database client method instead of direct API call
      const allRegistrations = await this.dbClient.getCachedData('registrations', row =>
        Registration.fromDatabaseRow ? Registration.fromDatabaseRow(row) : new Registration(row)
      );

      // Find registration by UUID
      const registration = allRegistrations.find(
        reg => reg.id.getValue() === registrationId.getValue()
      );

      if (registration) {
        // Cache the individual result
        this.cache.set(cacheKey, {
          data: registration,
          timestamp: Date.now(),
        });
      }

      return registration || null;
    } catch (error) {
      this.logger.error('Error getting registration by ID:', error);
      throw error;
    }
  }

  /**
   * Get all registrations for a student
   */
  async getByStudentId(studentId) {
    try {
      // Use cached database client method instead of direct API call
      const allRegistrations = await this.dbClient.getCachedData('registrations', row =>
        Registration.fromDatabaseRow ? Registration.fromDatabaseRow(row) : new Registration(row)
      );

      // Filter registrations by student ID
      return allRegistrations.filter(
        reg => reg.studentId && reg.studentId.getValue() === studentId
      );
    } catch (error) {
      this.logger.error('Error getting registrations by student ID:', error);
      throw error;
    }
  }

  /**
   * Get all registrations for an instructor
   */
  async getByInstructorId(instructorId) {
    try {
      // Use cached database client method instead of direct API call
      const allRegistrations = await this.dbClient.getCachedData('registrations', row =>
        Registration.fromDatabaseRow ? Registration.fromDatabaseRow(row) : new Registration(row)
      );

      // Filter registrations by instructor ID
      return allRegistrations.filter(
        reg => reg.instructorId && reg.instructorId.getValue() === instructorId
      );
    } catch (error) {
      this.logger.error('Error getting registrations by instructor ID:', error);
      throw error;
    }
  }

  /**
   * Get all active registrations
   * Note: Since status field was removed, all registrations are considered active
   */
  async getActiveRegistrations() {
    try {
      // Use cached database client method instead of direct API call
      const allRegistrations = await this.dbClient.getCachedData('registrations', row => {
        // Skip header rows and invalid data
        if (
          !row ||
          !row[0] ||
          row[0] === 'Id' ||
          row[0] === 'id' ||
          row[0].toLowerCase().includes('uuid') ||
          row[0].toLowerCase().includes('registration')
        ) {
          return null; // Skip this row
        }

        try {
          return Registration.fromDatabaseRow
            ? Registration.fromDatabaseRow(row)
            : new Registration(row);
        } catch (error) {
          this.logger.warn(`Skipping invalid registration row:`, row[0], error.message);
          return null; // Skip invalid rows
        }
      });

      // Handle case where allRegistrations is undefined/null
      if (!allRegistrations) {
        this.logger.warn('No registrations data returned from database client');
        return [];
      }

      // Filter out null entries from skipped rows
      const validRegistrations = allRegistrations.filter(reg => reg !== null);

      // Since status field was removed, all registrations are considered active
      return validRegistrations;
    } catch (error) {
      this.logger.error('Error getting active registrations:', error);
      throw error;
    }
  }

  /**
   * Get all registrations (alias for getActiveRegistrations for service compatibility)
   */
  async findAll() {
    return this.getActiveRegistrations();
  }

  /**
   * Alias for getById for service compatibility
   */
  async findById(id) {
    return this.getById(id);
  }

  /**
   * Alias for getByStudentId for service compatibility
   */
  async findByStudentId(studentId) {
    return this.getByStudentId(studentId);
  }

  /**
   * Get registrations (alias for getActiveRegistrations for service compatibility)
   */
  async getRegistrations() {
    return this.getActiveRegistrations();
  }

  /**
   * Create a new registration
   */
  async create(registrationData) {
    try {
      // Generate UUID if not provided
      const registrationId = registrationData.id || this.generateUUID();

      // Create Registration instance with a data object
      const registration = new Registration({
        id: registrationId,
        studentId: registrationData.studentId,
        instructorId: registrationData.instructorId,
        day: registrationData.day,
        startTime: registrationData.startTime,
        length: registrationData.length,
        registrationType: registrationData.registrationType,
        roomId: registrationData.roomId,
        instrument: registrationData.instrument,
        transportationType: registrationData.transportationType,
        notes: registrationData.notes,
        classId: registrationData.classId,
        classTitle: registrationData.classTitle,
        expectedStartDate: registrationData.expectedStartDate,
        createdAt: new Date().toISOString(),
        createdBy:
          registrationData.createdBy ||
          (() => {
            throw new Error('createdBy is required for audit trail');
          })(),
      });

      // Use the new appendRecordv2 method that handles direct Google Sheets append and audit
      await this.dbClient.appendRecordv2('registrations', registration, registrationData.createdBy);

      // Clear cache after mutation to ensure data consistency
      this.clearCache();
      this.dbClient.clearCache('registrations');

      // Cache the new registration
      this.cache.set(registrationId, registration);

      return registration;
    } catch (error) {
      this.logger.error('Error creating registration:', error);
      throw error;
    }
  }

  /**
   * Delete a registration by ID
   */
  async delete(id, userId) {
    try {
      if (!userId) {
        throw new Error('userId is required for audit trail');
      }

      const registrationId = typeof id === 'string' ? new RegistrationId(id) : id;

      // First verify the registration exists using cached data
      const registration = await this.getById(registrationId);
      if (!registration) {
        throw new Error(`Registration with ID ${registrationId.getValue()} not found`);
      }

      // Use the database client's deleteRecord method which handles audit trails and proper deletion
      await this.dbClient.deleteRecord('registrations', registrationId.getValue(), userId);

      // Clear cache after mutation
      this.clearCache();
      this.dbClient.clearCache('registrations');

      return true;
    } catch (error) {
      this.logger.error('Error deleting registration:', error);
      throw error;
    }
  }

  /**
   * Generate a UUID v4 string
   */
  generateUUID() {
    // Try using crypto.randomUUID() if available
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback to Math.random() based UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}
