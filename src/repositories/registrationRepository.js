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
import { UuidUtility } from '../utils/uuidUtility.js';
import { isValidTrimester } from '../utils/values/trimester.js';

export class RegistrationRepository extends BaseRepository {
  /**
   * @param {object} dbClient - Database client instance
   * @param {object} configService - Configuration service for logger initialization
   * @param {object} periodService - Period service for trimester management
   */
  constructor(dbClient, configService, periodService) {
    super('registrations', Registration, dbClient, configService);
    this.periodService = periodService;
  }

  /**
   * Get registration by UUID (new format)
   * Caching is handled at the GoogleSheetsDbClient layer
   */
  async getById(id) {
    try {
      const registrationId = typeof id === 'string' ? new RegistrationId(id) : id;

      // Registrations are stored in trimester-specific sheets, so we need to search all three
      const tables = ['registrations_fall', 'registrations_winter', 'registrations_spring'];

      for (const table of tables) {
        const allRegistrations = await this.dbClient.getAllRecords(table, row => {
          if (!row || !row[0]) return null;
          try {
            return Registration.fromDatabaseRow
              ? Registration.fromDatabaseRow(row)
              : new Registration(row);
          } catch (error) {
            return null;
          }
        });

        // Filter out null values and find registration by UUID
        const validRegistrations = allRegistrations.filter(reg => reg !== null);
        const registration = validRegistrations.find(
          reg => reg.id.getValue() === registrationId.getValue()
        );

        if (registration) {
          return registration;
        }
      }

      return null;
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
      // Registrations are stored in trimester-specific sheets, so we need to search all three
      const tables = ['registrations_fall', 'registrations_winter', 'registrations_spring'];
      let allRegistrations = [];

      for (const table of tables) {
        const tableRegistrations = await this.dbClient.getAllRecords(table, row => {
          if (!row || !row[0]) return null;
          try {
            return Registration.fromDatabaseRow
              ? Registration.fromDatabaseRow(row)
              : new Registration(row);
          } catch (error) {
            return null;
          }
        });

        // Filter out null values
        const validRegistrations = tableRegistrations.filter(reg => reg !== null);
        allRegistrations = allRegistrations.concat(validRegistrations);
      }

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
      // Registrations are stored in trimester-specific sheets, so we need to search all three
      const tables = ['registrations_fall', 'registrations_winter', 'registrations_spring'];
      let allRegistrations = [];

      for (const table of tables) {
        const tableRegistrations = await this.dbClient.getAllRecords(table, row => {
          if (!row || !row[0]) return null;
          try {
            return Registration.fromDatabaseRow
              ? Registration.fromDatabaseRow(row)
              : new Registration(row);
          } catch (error) {
            return null;
          }
        });

        // Filter out null values
        const validRegistrations = tableRegistrations.filter(reg => reg !== null);
        allRegistrations = allRegistrations.concat(validRegistrations);
      }

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
   * Get all active registrations from the current trimester table
   * Note: Since status field was removed, all registrations are considered active
   */
  async getActiveRegistrations() {
    try {
      // Get current trimester table name from period service
      const currentTable = await this.periodService.getCurrentTrimesterTable();

      this.logger.info(`📋 Getting active registrations from table: ${currentTable}`);

      // Get all registrations from database
      const allRegistrations = await this.dbClient.getAllRecords(currentTable, row => {
        // Skip empty rows
        if (!row || !row[0]) {
          return null;
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

      this.logger.info(`✅ Found ${validRegistrations.length} active registrations`);

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
   * Get registrations for a specific trimester
   * @param {string} trimester - Trimester name (fall, winter, spring)
   * @returns {Promise<Array<Registration>>} Array of registrations
   */
  async getRegistrationsForTrimester(trimester) {
    try {
      if (!trimester) {
        this.logger.info('📋 No trimester provided');
        return [];
      }

      if (!isValidTrimester(trimester)) {
        throw new Error(`Invalid trimester: ${trimester}`);
      }

      const tableName = `registrations_${trimester.toLowerCase()}`;
      this.logger.info(`📋 Getting registrations from table: ${tableName}`);

      // Get all registrations from database
      const allRegistrations = await this.dbClient.getAllRecords(tableName, row => {
        // Skip empty rows
        if (!row || !row[0]) {
          return null;
        }

        try {
          return Registration.fromDatabaseRow
            ? Registration.fromDatabaseRow(row)
            : new Registration(row);
        } catch (error) {
          this.logger.error(`Error parsing registration row: ${JSON.stringify(row)}`, error);
          return null;
        }
      });

      // Filter out null values from parsing errors
      return allRegistrations.filter(reg => reg !== null);
    } catch (error) {
      this.logger.error(`Error getting registrations for trimester ${trimester}:`, error);
      throw error;
    }
  }

  /**
   * Get registrations from the next trimester table
   * @deprecated Use getRegistrationsForTrimester() with explicit trimester instead
   */
  async getNextTrimesterRegistrations() {
    const nextTrimester = await this.periodService.getNextTrimester();
    return this.getRegistrationsForTrimester(nextTrimester);
  }

  /**
   * Alias for backward compatibility
   * @deprecated Use getNextTrimesterRegistrations() instead
   */
  async getEnrollmentRegistrations() {
    return this.getNextTrimesterRegistrations();
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
   * @param {object} registrationData - Registration data
   * @param {string} targetTrimester - Required trimester (fall, winter, spring)
   */
  async create(registrationData, targetTrimester) {
    try {
      // Trimester is required - caller must explicitly specify which trimester to write to
      if (!targetTrimester) {
        throw new Error(
          'targetTrimester is required - must explicitly specify which trimester to save to'
        );
      }

      if (!isValidTrimester(targetTrimester)) {
        throw new Error(`Invalid trimester: ${targetTrimester}`);
      }

      const tableName = `registrations_${targetTrimester.toLowerCase()}`;

      this.logger.info(`📝 Creating registration in table: ${tableName}`);

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
        isWaitlistClass: registrationData.isWaitlistClass, // Pass flag for validation
      });

      // Use the new appendRecordv2 method that handles direct Google Sheets append and audit
      await this.dbClient.appendRecordv2(tableName, registration, registrationData.createdBy);
      // Cache cleared automatically by dbClient

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

      // Get current trimester table name from period service
      const currentTable = await this.periodService.getCurrentTrimesterTable();

      const registrationId = typeof id === 'string' ? new RegistrationId(id) : id;

      // First verify the registration exists using cached data
      const registration = await this.getById(registrationId);
      if (!registration) {
        throw new Error(`Registration with ID ${registrationId.getValue()} not found`);
      }

      this.logger.info(`🗑️ Deleting registration from table: ${currentTable}`);

      // Use the database client's deleteRecord method which handles audit trails and proper deletion
      await this.dbClient.deleteRecord(currentTable, registrationId.getValue(), userId);
      // Cache cleared automatically by dbClient

      return true;
    } catch (error) {
      this.logger.error('Error deleting registration:', error);
      throw error;
    }
  }

  /**
   * Generate a UUID v4 string using UuidUtility
   */
  generateUUID() {
    // Try using crypto.randomUUID() if available (Node.js 16.7.0+)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback to UuidUtility for consistent UUID generation
    return UuidUtility.generateUuid();
  }

  /**
   * Update reenrollment intent for a registration
   * Includes authorization check - only allows updates to registrations the user has access to
   * @param {string} registrationId - Registration ID
   * @param {string} intent - One of: 'keep', 'drop', 'change'
   * @param {string} submittedBy - Email/identifier of who submitted
   * @returns {Promise<Registration>} Updated registration
   * @throws {Error} If registration not found or access denied
   */
  async updateIntent(registrationId, intent, submittedBy) {
    // Get all registrations (filtered by user's authorized access)
    const registrations = await this.getRegistrations();

    // Find the registration - if not found, user doesn't have access or it doesn't exist
    const registration = registrations.find(r => (r.id.value || r.id) === registrationId);

    if (!registration) {
      throw new Error('Registration not found');
    }

    // Update the intent
    registration.updateIntent(intent, submittedBy);

    // Save to database
    await this.dbClient.updateRecord(
      this.entityName,
      {
        id: registration.id.value || registration.id,
        studentId: registration.studentId.value || registration.studentId,
        instructorId: registration.instructorId.value || registration.instructorId,
        day: registration.day,
        startTime: registration.startTime,
        length: registration.length,
        registrationType: registration.registrationType,
        roomId: registration.roomId,
        instrument: registration.instrument,
        transportationType: registration.transportationType,
        notes: registration.notes,
        classId: registration.classId,
        classTitle: registration.classTitle,
        expectedStartDate: registration.expectedStartDate,
        createdAt: registration.createdAt,
        createdBy: registration.createdBy,
        reenrollmentIntent: registration.reenrollmentIntent,
        intentSubmittedAt: registration.intentSubmittedAt,
        intentSubmittedBy: registration.intentSubmittedBy,
      },
      submittedBy
    );
    // Cache cleared automatically by dbClient

    return registration;
  }

  /**
   * Get all registrations for a specific trimester
   * @param {string} trimester - 'fall', 'winter', or 'spring'
   * @returns {Promise<Array<Registration>>} Array of registration objects
   * @throws {Error} If trimester is invalid
   */
  async getRegistrationsByTrimester(trimester) {
    if (!isValidTrimester(trimester)) {
      throw new Error(`Invalid trimester: ${trimester}`);
    }

    const tableName = `registrations_${trimester}`;
    return await this.getFromTable(tableName);
  }

  /**
   * Get all registrations from a specific trimester table
   * Used during enrollment periods to read from current or next trimester
   * @param {string} tableName - Table name like "registrations_fall"
   * @returns {Promise<Array<Registration>>} Array of registrations from specified table
   */
  async getFromTable(tableName) {
    try {
      this.logger.info(`📋 Getting registrations from table: ${tableName}`);

      const allRegistrations = await this.dbClient.getAllRecords(tableName, row => {
        // Skip empty rows
        if (!row || !row[0]) {
          return null;
        }

        try {
          return Registration.fromDatabaseRow
            ? Registration.fromDatabaseRow(row)
            : new Registration(row);
        } catch (error) {
          this.logger.warn(
            `⚠️ Skipping invalid registration row - ID: ${row[0]}, classId: ${row[11]}, error: ${error.message}`
          );
          return null;
        }
      });

      const validRegistrations = (allRegistrations || []).filter(reg => reg !== null);
      this.logger.info(`✅ Found ${validRegistrations.length} registrations in ${tableName}`);
      return validRegistrations;
    } catch (error) {
      this.logger.error(`Error getting registrations from table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Create a registration in a specific trimester table
   * Used during enrollment periods to create in next trimester table
   * @param {string} tableName - Table name like "registrations_winter"
   * @param {object} registrationData - Registration data object
   * @returns {Promise<Registration>} Created registration
   * @throws {Error} If createdBy is missing or table write fails
   */
  async createInTable(tableName, registrationData) {
    try {
      this.logger.info(`📝 Creating registration in table: ${tableName}`);

      // Generate UUID if not provided
      const registrationId = registrationData.id || this.generateUUID();

      // Create Registration instance
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
        linkedPreviousRegistrationId: registrationData.linkedPreviousRegistrationId || null,
        createdAt: new Date().toISOString(),
        createdBy:
          registrationData.createdBy ||
          (() => {
            throw new Error('createdBy is required for audit trail');
          })(),
      });

      // Write to specific table (appendRecordv2 handles audit automatically)
      await this.dbClient.appendRecordv2(tableName, registration, registrationData.createdBy);
      // Cache cleared automatically by dbClient

      this.logger.info(`✅ Created registration in ${tableName}: ${registrationId}`);
      return registration;
    } catch (error) {
      this.logger.error(`Error creating registration in table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Find a registration by ID in a specific table
   * @param {string} tableName - Table name to search in
   * @param {string} id - Registration ID
   * @returns {Promise<Registration|null>} Registration or null if not found
   */
  async findByIdInTable(tableName, id) {
    try {
      const registrationId = typeof id === 'string' ? new RegistrationId(id) : id;

      // Get all registrations from the specified table
      const registrations = await this.getFromTable(tableName);

      // Find the registration with matching ID
      const registration = registrations.find(reg => {
        const regId = reg.id?.value || reg.id;
        return regId === registrationId.getValue();
      });

      return registration || null;
    } catch (error) {
      this.logger.error(`Error finding registration in table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a registration from a specific table
   * @param {string} tableName - Table name to delete from
   * @param {string} id - Registration ID
   * @param {string} userId - User performing the deletion (for audit)
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteFromTable(tableName, id, userId) {
    try {
      if (!userId) {
        throw new Error('userId is required for audit trail');
      }

      const registrationId = typeof id === 'string' ? new RegistrationId(id) : id;

      // First verify the registration exists
      const registration = await this.findByIdInTable(tableName, registrationId);
      if (!registration) {
        throw new Error(
          `Registration with ID ${registrationId.getValue()} not found in table ${tableName}`
        );
      }

      this.logger.info(`🗑️ Deleting registration from table: ${tableName}`);

      // Use the database client's deleteRecord method which handles audit trails and proper deletion
      await this.dbClient.deleteRecord(tableName, registrationId.getValue(), userId);
      // Cache cleared automatically by dbClient

      return true;
    } catch (error) {
      this.logger.error(`Error deleting registration from table ${tableName}:`, error);
      throw error;
    }
  }
}
