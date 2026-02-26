/**
 * Registration Repository
 * =======================
 *
 * Repository for simplified registration model with UUID primary keys
 */

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

  constructor(
    dbClient: GoogleSheetsDbClient,
    configService: ConfigurationService,
    periodService: PeriodService
  ) {
    super('registrations', (record) => Registration.fromDatabaseRow(record), dbClient, configService);
    this.periodService = periodService;
  }

  /**
   * Fetch all valid registrations from a single table.
   */
  private async _fetchRegistrations(tableName: string): Promise<Registration[]> {
    return this.fetchAll(tableName, (record) => {
      if (!record || !record.id) return null;
      try {
        return Registration.fromDatabaseRow(record);
      } catch {
        return null;
      }
    });
  }

  /**
   * Derive the table name for a trimester
   */
  private _tableName(trimester: string): string {
    if (!isValidTrimester(trimester)) {
      throw new Error(`Invalid trimester: ${trimester}`);
    }
    return `registrations_${trimester.toLowerCase()}`;
  }

  /**
   * Find a registration by ID across all trimester tables
   */
  override async findById(id: string): Promise<Registration | null> {
    try {
      for (const table of REGISTRATION_TABLES) {
        const registrations = await this._fetchRegistrations(table);
        const registration = registrations.find(reg => reg.id === id);
        if (registration) {
          return registration;
        }
      }
      return null;
    } catch (error) {
      this.logger.error('Error finding registration by ID:', error);
      throw error;
    }
  }

  /**
   * Get all registrations for a student across all trimester tables
   */
  async getByStudentId(studentId: string): Promise<Registration[]> {
    try {
      const allRegistrations: Registration[] = [];
      for (const table of REGISTRATION_TABLES) {
        const registrations = await this._fetchRegistrations(table);
        allRegistrations.push(...registrations);
      }
      return allRegistrations.filter(reg => reg.studentId === studentId);
    } catch (error) {
      this.logger.error('Error getting registrations by student ID:', error);
      throw error;
    }
  }

  /**
   * Get all registrations for an instructor across all trimester tables
   */
  async getByInstructorId(instructorId: string): Promise<Registration[]> {
    try {
      const allRegistrations: Registration[] = [];
      for (const table of REGISTRATION_TABLES) {
        const registrations = await this._fetchRegistrations(table);
        allRegistrations.push(...registrations);
      }
      return allRegistrations.filter(reg => reg.instructorId === instructorId);
    } catch (error) {
      this.logger.error('Error getting registrations by instructor ID:', error);
      throw error;
    }
  }

  /**
   * Get all registrations from the current trimester table.
   * Since status field was removed, all registrations are considered active.
   */
  override async findAll(_options: Record<string, unknown> = {}): Promise<Registration[]> {
    try {
      const currentTable = await this.periodService.getCurrentTrimesterTable();
      this.logger.info(`📋 Getting registrations from table: ${currentTable}`);
      const registrations = await this._fetchRegistrations(currentTable);
      this.logger.info(`✅ Found ${registrations.length} registrations`);
      return registrations;
    } catch (error) {
      this.logger.error('Error getting registrations:', error);
      throw error;
    }
  }

  /**
   * Get registrations for a specific trimester
   */
  async getRegistrationsForTrimester(trimester: string): Promise<Registration[]> {
    try {
      if (!trimester) {
        this.logger.info('📋 No trimester provided');
        return [];
      }

      const tableName = this._tableName(trimester);
      this.logger.info(`📋 Getting registrations from table: ${tableName}`);
      return await this._fetchRegistrations(tableName);
    } catch (error) {
      this.logger.error(`Error getting registrations for trimester ${trimester}:`, error);
      throw error;
    }
  }

  /**
   * Get registrations from the next trimester table
   */
  async getNextTrimesterRegistrations(): Promise<Registration[]> {
    const nextTrimester = await this.periodService.getNextTrimester();
    if (!nextTrimester) {
      return [];
    }
    return this.getRegistrationsForTrimester(nextTrimester);
  }

  /**
   * Create a new registration in a trimester-specific table
   */
  override async create(registrationData: Record<string, unknown>, targetTrimester: string): Promise<Registration> {
    const data = registrationData as RegistrationData;
    try {
      if (!targetTrimester) {
        throw new Error('targetTrimester is required - must explicitly specify which trimester to save to');
      }

      const tableName = this._tableName(targetTrimester);
      this.logger.info(`📝 Creating registration in table: ${tableName}`);

      const registration = new Registration({
        id: data.id || UuidUtility.generateUuid(),
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
        linkedPreviousRegistrationId: data.linkedPreviousRegistrationId || null,
        createdAt: new Date().toISOString(),
        createdBy:
          data.createdBy ||
          (() => {
            throw new Error('createdBy is required for audit trail');
          })(),
        isWaitlistClass: data.isWaitlistClass,
      });

      await this.dbClient.appendRecord(tableName, { ...registration.toJSON() });

      const auditSheet = `${tableName}_audit`;
      await this.#writeAuditRecord(registration, data.createdBy || '', auditSheet);

      this.logger.info(`✅ Created registration: ${registration.id}`);
      return registration;
    } catch (error) {
      this.logger.error('Error creating registration:', error);
      throw error;
    }
  }

  /**
   * Delete a registration by ID from the specified trimester table.
   * Overrides base delete because registrations are stored in trimester-specific tables.
   */
  // @ts-expect-error -- extended signature: base is (id, deletedBy), this adds required trimester
  override async delete(id: string, userId: string, trimester: string): Promise<boolean> {
    try {
      if (!userId) {
        throw new Error('userId is required for audit trail');
      }
      if (!trimester) {
        throw new Error('trimester is required to locate the registration table');
      }

      const tableName = this._tableName(trimester);

      const registration = await this.findById(id);
      if (!registration) {
        throw new Error(`Registration with ID ${id} not found`);
      }

      this.logger.info(`🗑️ Deleting registration from table: ${tableName}`);

      await this.dbClient.deleteRecord(tableName, id, userId);

      const auditSheet = `${tableName}_audit`;
      await this.#writeAuditRecord(registration, userId, auditSheet, true);

      return true;
    } catch (error) {
      this.logger.error('Error deleting registration:', error);
      throw error;
    }
  }

  /**
   * Write a registration audit record to the corresponding audit sheet.
   */
  async #writeAuditRecord(
    registration: Registration,
    performedBy: string,
    auditSheet: string,
    isDeleted: boolean = false
  ): Promise<void> {
    const now = new Date().toISOString();
    const json = registration.toJSON();
    const auditRecord: Record<string, unknown> = {
      ...json,
      id: UuidUtility.generateUuid(),
      registrationId: registration.id,
      isDeleted,
      deletedAt: isDeleted ? now : '',
      deletedBy: isDeleted ? performedBy : '',
      updatedAt: now,
      updatedBy: performedBy,
    };
    await this.dbClient.appendRecord(auditSheet, auditRecord, 'USER_ENTERED');
  }

  /**
   * Update reenrollment intent for a registration
   */
  async updateIntent(
    registrationId: string,
    intent: string,
    submittedBy: string
  ): Promise<Registration> {
    const registrations = await this.findAll();
    const registration = registrations.find(r => r.id === registrationId);

    if (!registration) {
      throw new Error('Registration not found');
    }

    registration.updateIntent(intent as 'keep' | 'drop' | 'change', submittedBy);

    // Find which trimester table contains this registration
    let targetSheet: string | null = null;
    for (const table of REGISTRATION_TABLES) {
      const tableRegistrations = await this._fetchRegistrations(table);
      if (tableRegistrations.find(reg => reg.id === registrationId)) {
        targetSheet = table;
        break;
      }
    }

    if (!targetSheet) {
      throw new Error('Registration not found in any trimester sheet');
    }

    await this.dbClient.updateRecord(
      targetSheet,
      { ...registration.toJSON() },
      submittedBy
    );

    const auditSheet = `${targetSheet}_audit`;
    await this.#writeAuditRecord(registration, submittedBy, auditSheet);

    return registration;
  }
}
