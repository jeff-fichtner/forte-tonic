/**
 * Drop Request Repository
 * =========================
 *
 * Repository for drop request management with UUID primary keys.
 * Handles mid-trimester lesson drop requests that require admin approval.
 */

import { BaseRepository } from './baseRepository.js';
import { DropRequest } from '../models/shared/dropRequest.js';
import type { DropRequestData } from '../models/shared/dropRequest.js';
import { Keys } from '../utils/values/keys.js';
import { UuidUtility } from '../utils/uuidUtility.js';
import { DropRequestStatus } from '../utils/values/dropRequestStatus.js';
import type { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';
import type { ConfigurationService } from '../services/configurationService.js';

export { DropRequest } from '../models/shared/dropRequest.js';
export type { DropRequestData, DropRequestJSON } from '../models/shared/dropRequest.js';

/**
 * Repository for drop requests
 */
export class DropRequestRepository extends BaseRepository<DropRequest> {
  constructor(dbClient: GoogleSheetsDbClient, configService?: ConfigurationService) {
    super(
      Keys.DROP_REQUESTS,
      record => DropRequest.fromDatabaseRow(record),
      dbClient,
      configService
    );
  }

  /**
   * Create a new drop request
   */
  override async create(
    requestData: Record<string, unknown>,
    createdBy: string
  ): Promise<DropRequest> {
    try {
      this.logger.info(
        `📝 Creating new drop request for registration: ${String(requestData.registrationId)} by ${createdBy}`
      );

      const dropRequest = new DropRequest({
        id: UuidUtility.generateUuid(),
        registrationId: '',
        parentId: '',
        trimester: '',
        reason: '',
        requestedAt: new Date().toISOString(),
        status: DropRequestStatus.PENDING,
        reviewedBy: null,
        reviewedAt: null,
        adminNotes: null,
        ...requestData,
      } as DropRequestData);
      await this.dbClient.appendRecord(Keys.DROP_REQUESTS, { ...dropRequest.toJSON() });

      this.logger.info(`✅ Created drop request with ID: ${dropRequest.id}`);
      return dropRequest;
    } catch (error) {
      this.logger.error('❌ Error creating drop request:', error);
      throw new Error(`Failed to create drop request: ${(error as Error).message}`);
    }
  }

  /**
   * Update an existing drop request
   */
  override async update(
    id: string,
    updateData: Record<string, unknown>,
    updatedBy: string = ''
  ): Promise<DropRequest> {
    try {
      this.logger.info(`📝 Updating drop request: ${id}`);

      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Drop request not found: ${id}`);
      }

      const updated = new DropRequest({
        ...existing,
        ...(updateData as Partial<DropRequestData>),
        id,
      } as DropRequestData);

      await this.dbClient.updateRecord(Keys.DROP_REQUESTS, { ...updated.toJSON() }, updatedBy);

      this.logger.info(`✅ Updated drop request: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error('❌ Error updating drop request:', error);
      throw new Error(`Failed to update drop request: ${(error as Error).message}`);
    }
  }

  /**
   * Find all drop requests for a specific parent
   */
  async findByParentId(parentId: string): Promise<DropRequest[]> {
    return this.findBy('parentId', parentId);
  }

  /**
   * Find all drop requests with a specific status
   */
  async findByStatus(status: string): Promise<DropRequest[]> {
    return this.findBy('status', status);
  }

  /**
   * Find drop request by registration ID
   * Returns single result since a registration has at most one active drop request
   */
  async findByRegistrationId(registrationId: string): Promise<DropRequest | null> {
    const results = await this.findBy('registrationId', registrationId);
    return results[0] ?? null;
  }
}
