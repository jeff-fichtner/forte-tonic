/**
 * Registration Repository
 * =======================
 *
 * Repository for simplified registration model with UUID primary keys
 */

import crypto from 'crypto';
import { BaseRepository } from './baseRepository.js';
import { Registration } from '../models/shared/registration.js';
import type { RegistrationData } from '../models/shared/registration.js';
import { UuidUtility } from '../utils/uuidUtility.js';
import { isValidTrimester } from '../utils/values/trimester.js';
import type { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';
import type { ConfigurationService } from '../services/configurationService.js';
import type { PeriodService } from '../services/periodService.js';

const REGISTRATION_TABLES = ['registrations_fall', 'registrations_winter', 'registrations_spring'];

export class RegistrationRepository extends BaseRepository<Registration> {
  periodService: PeriodService;

  /**
   * @param dbClient - Database client instance
   * @param configService - Configuration service for logger initialization
   * @param periodService - Period service for trimester management
   */
  constructor(
    dbClient: GoogleSheetsDbClient,
    configService: ConfigurationService,
    periodService: PeriodService
  ) {
    super('registrations', Registration, dbClient, configService);
    this.periodService = periodService;
  }

  /**
   * Get registration by UUID (new format)
   * Caching is handled at the GoogleSheetsDbClient layer
   */
  async getById(id: string): Promise<Registration | null> {
    try {
      // Registrations are stored in trimester-specific sheets, so we need to search all three
      for (const table of REGISTRATION_TABLES) {
        const allRegistrations = await this.dbClient.getAllRecords(table, (row: string[]) => {
          if (!row || !row[0]) {
            return null;
          }
          try {
            return Registration.fromDatabaseRow(row);
          } catch {
            return null;
          }
        });

        // Filter out null values and find registration by UUID
        const validRegistrations = allRegistrations.filter(
          (reg): reg is Registration => reg !== null
        );
        const registration = validRegistrations.find(reg => reg.id === id);

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
  async getByStudentId(studentId: string): Promise<Registration[]> {
    try {
      // Registrations are stored in trimester-specific sheets, so we need to search all three
      const allRegistrations: Registration[] = [];

      for (const table of REGISTRATION_TABLES) {
        const tableRegistrations = await this.dbClient.getAllRecords(table, (row: string[]) => {
          if (!row || !row[0]) {
            return null;
          }
          try {
            return Registration.fromDatabaseRow(row);
          } catch {
            return null;
          }
        });

        // Filter out null values
        const validRegistrations = tableRegistrations.filter(
          (reg): reg is Registration => reg !== null
        );
        allRegistrations.push(...validRegistrations);
      }

      // Filter registrations by student ID
      return allRegistrations.filter(reg => reg.studentId === studentId);
    } catch (error) {
      this.logger.error('Error getting registrations by student ID:', error);
      throw error;
    }
  }

  /**
   * Get all registrations for an instructor
   */
  async getByInstructorId(instructorId: string): Promise<Registration[]> {
    try {
      // Registrations are stored in trimester-specific sheets, so we need to search all three
      const allRegistrations: Registration[] = [];

      for (const table of REGISTRATION_TABLES) {
        const tableRegistrations = await this.dbClient.getAllRecords(table, (row: string[]) => {
          if (!row || !row[0]) {
            return null;
          }
          try {
            return Registration.fromDatabaseRow(row);
          } catch {
            return null;
          }
        });

        // Filter out null values
        const validRegistrations = tableRegistrations.filter(
          (reg): reg is Registration => reg !== null
        );
        allRegistrations.push(...validRegistrations);
      }

      // Filter registrations by instructor ID
      return allRegistrations.filter(reg => reg.instructorId === instructorId);
    } catch (error) {
      this.logger.error('Error getting registrations by instructor ID:', error);
      throw error;
    }
  }

  /**
   * Get all active registrations from the current trimester table
   * Note: Since status field was removed, all registrations are considered active
   */
  async getActiveRegistrations(): Promise<Registration[]> {
    try {
      // Get current trimester table name from period service
      const currentTable = await this.periodService.getCurrentTrimesterTable();

      this.logger.info(`📋 Getting active registrations from table: ${currentTable}`);

      // Get all registrations from database
      const allRegistrations = await this.dbClient.getAllRecords(currentTable, (row: string[]) => {
        // Skip empty rows
        if (!row || !row[0]) {
          return null;
        }

        try {
          return Registration.fromDatabaseRow(row);
        } catch (error) {
          this.logger.warn(
            'Skipping invalid registration row:',
            row[0],
            (error as Error).message
          );
          return null;
        }
      });

      // Handle case where allRegistrations is undefined/null
      if (!allRegistrations) {
        this.logger.warn('No registrations data returned from database client');
        return [];
      }

      // Filter out null entries from skipped rows
      const validRegistrations = allRegistrations.filter((reg): reg is Registration => reg !== null);

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
  override async findAll(_options: Record<string, unknown> = {}): Promise<Registration[]> {
    return this.getActiveRegistrations();
  }

  /**
   * Get registrations for a specific trimester
   * @param trimester - Trimester name (fall, winter, spring)
   * @returns Array of registrations
   */
  async getRegistrationsForTrimester(trimester: string): Promise<Registration[]> {
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
      const allRegistrations = await this.dbClient.getAllRecords(tableName, (row: string[]) => {
        // Skip empty rows
        if (!row || !row[0]) {
          return null;
        }

        try {
          return Registration.fromDatabaseRow(row);
        } catch (error) {
          this.logger.error(`Error parsing registration row: ${JSON.stringify(row)}`, error);
          return null;
        }
      });

      // Filter out null values from parsing errors
      return allRegistrations.filter((reg): reg is Registration => reg !== null);
    } catch (error) {
      this.logger.error(`Error getting registrations for trimester ${trimester}:`, error);
      throw error;
    }
  }

  /**
   * Get registrations from the next trimester table
   * @deprecated Use getRegistrationsForTrimester() with explicit trimester instead
   */
  async getNextTrimesterRegistrations(): Promise<Registration[]> {
    const nextTrimester = await this.periodService.getNextTrimester();
    if (!nextTrimester) {
      return [];
    }
    return this.getRegistrationsForTrimester(nextTrimester);
  }

  /**
   * Alias for backward compatibility
   * @deprecated Use getNextTrimesterRegistrations() instead
   */
  async getEnrollmentRegistrations(): Promise<Registration[]> {
    return this.getNextTrimesterRegistrations();
  }

  /**
   * Alias for getById for service compatibility
   */
  override async findById(id: string): Promise<Registration | null> {
    return this.getById(id);
  }

  /**
   * Alias for getByStudentId for service compatibility
   */
  async findByStudentId(studentId: string): Promise<Registration[]> {
    return this.getByStudentId(studentId);
  }

  /**
   * Get registrations (alias for getActiveRegistrations for service compatibility)
   */
  async getRegistrations(_options: Record<string, unknown> = {}): Promise<Registration[]> {
    return this.getActiveRegistrations();
  }

  /**
   * Create a new registration
   * @param registrationData - Registration data
   * @param targetTrimester - Required trimester (fall, winter, spring)
   */
  override async create(registrationData: Record<string, unknown>, targetTrimester: string): Promise<Registration> {
    const data = registrationData as unknown as RegistrationData; // SC-005: generic Record parameter → typed model
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
      const registrationId = data.id || this.generateUUID();

      // Create Registration instance with a data object
      const registration = new Registration({
        id: registrationId,
        studentId: data.studentId,
        instructorId: data.instructorId,
        day: data.day,
        startTime: data.startTime,
        length: data.length,
        registrationType: data.registrationType,
        roomId: data.roomId,
        instrument: data.instrument,
        transportationType: data.transportationType,
        notes: data.notes,
        classId: data.classId,
        classTitle: data.classTitle,
        expectedStartDate: data.expectedStartDate,
        createdAt: new Date().toISOString(),
        createdBy:
          data.createdBy ||
          (() => {
            throw new Error('createdBy is required for audit trail');
          })(),
        isWaitlistClass: data.isWaitlistClass,
      });

      await this.dbClient.appendRecord(tableName, registration, data.createdBy || '');

      return registration;
    } catch (error) {
      this.logger.error('Error creating registration:', error);
      throw error;
    }
  }

  /**
   * Delete a registration by ID
   */
  async delete(id: string, userId: string): Promise<boolean> {
    try {
      if (!userId) {
        throw new Error('userId is required for audit trail');
      }

      // Get current trimester table name from period service
      const currentTable = await this.periodService.getCurrentTrimesterTable();

      // First verify the registration exists using cached data
      const registration = await this.getById(id);
      if (!registration) {
        throw new Error(`Registration with ID ${id} not found`);
      }

      this.logger.info(`🗑️ Deleting registration from table: ${currentTable}`);

      // Use the database client's deleteRecord method which handles audit trails and proper deletion
      await this.dbClient.deleteRecord(currentTable, id, userId);

      return true;
    } catch (error) {
      this.logger.error('Error deleting registration:', error);
      throw error;
    }
  }

  /**
   * Generate a UUID v4 string using UuidUtility
   */
  generateUUID(): string {
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
   * @param registrationId - Registration ID
   * @param intent - One of: 'keep', 'drop', 'change'
   * @param submittedBy - Email/identifier of who submitted
   * @returns Updated registration
   * @throws If registration not found or access denied
   */
  async updateIntent(
    registrationId: string,
    intent: string,
    submittedBy: string
  ): Promise<Registration> {
    // Get all registrations (filtered by user's authorized access)
    const registrations = await this.getRegistrations();

    // Find the registration - if not found, user doesn't have access or it doesn't exist
    const registration = registrations.find(r => r.id === registrationId);

    if (!registration) {
      throw new Error('Registration not found');
    }

    // Update the intent
    registration.updateIntent(intent as 'keep' | 'drop' | 'change', submittedBy);

    // Determine which trimester sheet this registration belongs to
    // Search across all trimester sheets to find the record
    let targetSheet: string | null = null;

    for (const table of REGISTRATION_TABLES) {
      const allRegistrations = await this.dbClient.getAllRecords(table, (row: string[]) => {
        if (!row || !row[0]) {
          return null;
        }
        try {
          return Registration.fromDatabaseRow(row);
        } catch {
          return null;
        }
      });

      const found = allRegistrations.find(reg => reg && reg.id === registrationId);

      if (found) {
        targetSheet = table;
        break;
      }
    }

    if (!targetSheet) {
      throw new Error('Registration not found in any trimester sheet');
    }

    // Save to the correct trimester-specific database sheet
    await this.dbClient.updateRecord(
      targetSheet,
      {
        id: registration.id,
        studentId: registration.studentId,
        instructorId: registration.instructorId,
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

    return registration;
  }

  /**
   * Get all registrations for a specific trimester
   * @param trimester - 'fall', 'winter', or 'spring'
   * @returns Array of registration objects
   * @throws If trimester is invalid
   */
  async getRegistrationsByTrimester(trimester: string): Promise<Registration[]> {
    if (!isValidTrimester(trimester)) {
      throw new Error(`Invalid trimester: ${trimester}`);
    }

    const tableName = `registrations_${trimester}`;
    return await this.getFromTable(tableName);
  }

  /**
   * Get all registrations from a specific trimester table
   * Used during enrollment periods to read from current or next trimester
   * @param tableName - Table name like "registrations_fall"
   * @returns Array of registrations from specified table
   */
  async getFromTable(tableName: string): Promise<Registration[]> {
    try {
      this.logger.info(`📋 Getting registrations from table: ${tableName}`);

      const allRegistrations = await this.dbClient.getAllRecords(tableName, (row: string[]) => {
        // Skip empty rows
        if (!row || !row[0]) {
          return null;
        }

        try {
          return Registration.fromDatabaseRow(row);
        } catch (error) {
          this.logger.warn(
            `⚠️ Skipping invalid registration row - ID: ${row[0]}, classId: ${row[11]}, error: ${(error as Error).message}`
          );
          return null;
        }
      });

      const validRegistrations = (allRegistrations || []).filter(
        (reg): reg is Registration => reg !== null
      );
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
   * @param tableName - Table name like "registrations_winter"
   * @param registrationData - Registration data object
   * @returns Created registration
   * @throws If createdBy is missing or table write fails
   */
  async createInTable(tableName: string, registrationData: RegistrationData): Promise<Registration> {
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

      await this.dbClient.appendRecord(tableName, registration, registrationData.createdBy || '');

      this.logger.info(`✅ Created registration in ${tableName}: ${registrationId}`);
      return registration;
    } catch (error) {
      this.logger.error(`Error creating registration in table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Find a registration by ID in a specific table
   * @param tableName - Table name to search in
   * @param id - Registration ID
   * @returns Registration or null if not found
   */
  async findByIdInTable(tableName: string, id: string): Promise<Registration | null> {
    try {
      // Get all registrations from the specified table
      const registrations = await this.getFromTable(tableName);

      // Find the registration with matching ID
      const registration = registrations.find(reg => reg.id === id);

      return registration || null;
    } catch (error) {
      this.logger.error(`Error finding registration in table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a registration from a specific table
   * @param tableName - Table name to delete from
   * @param id - Registration ID
   * @param userId - User performing the deletion (for audit)
   * @returns True if deleted successfully
   */
  async deleteFromTable(tableName: string, id: string, userId: string): Promise<boolean> {
    try {
      if (!userId) {
        throw new Error('userId is required for audit trail');
      }

      // First verify the registration exists
      const registration = await this.findByIdInTable(tableName, id);
      if (!registration) {
        throw new Error(`Registration with ID ${id} not found in table ${tableName}`);
      }

      this.logger.info(`🗑️ Deleting registration from table: ${tableName}`);

      // Use the database client's deleteRecord method which handles audit trails and proper deletion
      await this.dbClient.deleteRecord(tableName, id, userId);

      return true;
    } catch (error) {
      this.logger.error(`Error deleting registration from table ${tableName}:`, error);
      throw error;
    }
  }
}
