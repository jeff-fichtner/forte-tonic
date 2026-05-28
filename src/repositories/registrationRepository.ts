/**
 * Registration Repository
 * =======================
 *
 * Repository for simplified registration model with UUID primary keys
 */

import { BaseRepository, type AuditEvent, type BuiltAuditRecord } from './baseRepository.js';
import { Registration } from '../models/shared/registration.js';
import type { RegistrationData } from '../models/shared/registration.js';
import { UuidUtility } from '../utils/uuidUtility.js';
import { isValidTrimester } from '../utils/values/trimester.js';
import {
  type GoogleSheetsDbClient,
  dataSheetForTrimester,
  auditSheetForTrimester,
} from '../database/googleSheetsDbClient.js';
import type { ConfigurationService } from '../services/configurationService.js';
import type { PeriodService } from '../services/periodService.js';

export class RegistrationRepository extends BaseRepository<Registration> {
  periodService: PeriodService;

  constructor(
    dbClient: GoogleSheetsDbClient,
    configService: ConfigurationService,
    periodService: PeriodService
  ) {
    super('registrations', record => Registration.fromDatabaseRow(record), dbClient, configService);
    this.periodService = periodService;
  }

  /**
   * Fetch all valid registrations from a single table.
   * Hydrates isWaitlistClass from config since it is not persisted in the DB.
   */
  private async _fetchRegistrations(tableName: string): Promise<Registration[]> {
    const rockBandClassIds = this.configService.getRockBandClassIds();
    const registrations = await this.fetchAll(tableName, record => {
      if (!record || !record.id) return null;
      try {
        return Registration.fromDatabaseRow(record);
      } catch {
        return null;
      }
    });
    for (const reg of registrations) {
      reg.isWaitlistClass = rockBandClassIds.includes(reg.classId);
    }
    return registrations;
  }

  /**
   * Derive the table name for a trimester via the dbClient's mapping.
   * Validation happens inside `dataSheetForTrimester` (throws on invalid).
   */
  private _tableName(trimester: string): string {
    if (!isValidTrimester(trimester)) {
      throw new Error(`Invalid trimester: ${trimester}`);
    }
    return dataSheetForTrimester(trimester);
  }

  /**
   * Find a registration by ID within a specific trimester table.
   */
  async findByIdInTrimester(id: string, trimester: string): Promise<Registration | null> {
    try {
      const tableName = this._tableName(trimester);
      const registrations = await this._fetchRegistrations(tableName);
      return registrations.find(reg => reg.id === id) ?? null;
    } catch (error) {
      this.logger.error('Error finding registration by ID:', error);
      throw error;
    }
  }

  /**
   * Get all registrations from the current trimester table.
   * Since status field was removed, all registrations are considered active.
   */
  override async findAll(_options: Record<string, unknown> = {}): Promise<Registration[]> {
    try {
      // Ask the period service for the trimester identifier, then translate
      // to a sheet name internally — sheet names are a data-layer concern.
      const trimester = await this.periodService.getCurrentTrimester();
      const currentTable = this._tableName(trimester);
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
  override async create(
    registrationData: Record<string, unknown>,
    targetTrimester: string
  ): Promise<Registration> {
    const data = registrationData as RegistrationData;
    try {
      if (!targetTrimester) {
        throw new Error(
          'targetTrimester is required - must explicitly specify which trimester to save to'
        );
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

      await this.writeAudit(registration, data.createdBy || '', 'create', {
        trimester: targetTrimester,
      });

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

      const registration = await this.findByIdInTrimester(id, trimester);
      if (!registration) {
        throw new Error(`Registration with ID ${id} not found in ${tableName}`);
      }

      this.logger.info(`🗑️ Deleting registration from table: ${tableName}`);

      await this.dbClient.deleteRecord(tableName, id, userId);

      await this.writeAudit(registration, userId, 'delete', { trimester });

      return true;
    } catch (error) {
      this.logger.error('Error deleting registration:', error);
      throw error;
    }
  }

  /**
   * Build the registration audit record. Audit sheet is per-trimester
   * (`registrations_<trimester>_audit`), so the trimester must be threaded
   * through `context` from the call site.
   */
  protected override buildAuditRecord(
    registration: Registration,
    performedBy: string,
    event: AuditEvent,
    context?: Record<string, unknown>
  ): BuiltAuditRecord {
    const trimester = context?.trimester;
    if (typeof trimester !== 'string' || !trimester) {
      throw new Error('Registration audit requires `trimester` in context');
    }
    const isDeleted = event === 'delete';
    const now = new Date().toISOString();
    return {
      sheet: auditSheetForTrimester(trimester),
      record: {
        ...registration.toJSON(),
        id: UuidUtility.generateUuid(),
        registrationId: registration.id,
        isDeleted,
        deletedAt: isDeleted ? now : '',
        deletedBy: isDeleted ? performedBy : '',
        updatedAt: now,
        updatedBy: performedBy,
      },
    };
  }

  /**
   * Update reenrollment intent for a registration
   */
  async updateIntent(
    registrationId: string,
    trimester: string,
    intent: string,
    submittedBy: string
  ): Promise<Registration> {
    const targetSheet = this._tableName(trimester);
    const registrations = await this._fetchRegistrations(targetSheet);
    const registration = registrations.find(r => r.id === registrationId);

    if (!registration) {
      throw new Error('Registration not found');
    }

    registration.updateIntent(intent as 'keep' | 'drop' | 'change', submittedBy);

    await this.dbClient.updateRecord(targetSheet, { ...registration.toJSON() }, submittedBy);

    await this.writeAudit(registration, submittedBy, 'update', { trimester });

    return registration;
  }
}
