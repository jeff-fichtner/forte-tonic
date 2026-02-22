/**
 * Drop Request Repository
 * =========================
 *
 * Repository for drop request management with UUID primary keys.
 * Handles mid-trimester lesson drop requests that require admin approval.
 *
 * Note: skipCache is enabled because drop requests change frequently
 * during active periods and stale data could lead to business logic errors.
 */

import { BaseRepository } from './baseRepository.js';
import { DropRequest } from '../models/shared/dropRequest.js';
import type { DropRequestData } from '../models/shared/dropRequest.js';
import type { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';
import type { ConfigurationService } from '../services/configurationService.js';

export { DropRequest } from '../models/shared/dropRequest.js';
export type { DropRequestData, DropRequestJSON } from '../models/shared/dropRequest.js';

/**
 * Repository for drop requests
 */
export class DropRequestRepository extends BaseRepository<DropRequest> {
  /**
   * @param dbClient - Database client instance
   * @param configService - Configuration service for logger initialization
   */
  constructor(dbClient?: GoogleSheetsDbClient, configService?: ConfigurationService) {
    super('drop_requests', (record) => DropRequest.fromDatabaseRow(record), dbClient, configService);
  }

  /**
   * Create a new drop request
   * @param requestData - Drop request data
   * @param createdBy - User creating the request (typically parent email)
   * @returns Created drop request
   */
  async create(requestData: Record<string, unknown>, createdBy: string = ''): Promise<DropRequest> {
    try {
      this.logger.info(
        `📝 Creating new drop request for registration: ${String(requestData.registrationId)} by ${createdBy}`
      );

      const dropRequest = new DropRequest(requestData as Partial<DropRequestData>);
      await this.dbClient.appendRecord('drop_requests', { ...dropRequest.toJSON() }, createdBy);

      this.logger.info(`✅ Created drop request with ID: ${dropRequest.id}`);
      return dropRequest;
    } catch (error) {
      this.logger.error('❌ Error creating drop request:', error);
      throw new Error(`Failed to create drop request: ${(error as Error).message}`);
    }
  }

  /**
   * Find drop request by ID
   * @param id - Drop request UUID
   * @returns Drop request or null
   */
  async findById(id: string): Promise<DropRequest | null> {
    try {
      this.logger.info(`🔍 Finding drop request by ID: ${id}`);

      const allRequests = await this.dbClient.getAllRecords('drop_requests', (record: Record<string, string>) =>
        DropRequest.fromDatabaseRow(record)
      );

      const request = allRequests.find((req: DropRequest) => req.id === id);
      return request || null;
    } catch (error) {
      this.logger.error('❌ Error finding drop request by ID:', error);
      throw new Error(`Failed to find drop request by ID: ${(error as Error).message}`);
    }
  }

  /**
   * Find all drop requests for a specific parent
   * @param parentId - Parent UUID
   * @returns Array of drop requests
   */
  async findByParentId(parentId: string): Promise<DropRequest[]> {
    try {
      this.logger.info(`🔍 Finding drop requests for parent: ${parentId}`);

      const allRequests = await this.dbClient.getAllRecords('drop_requests', (record: Record<string, string>) =>
        DropRequest.fromDatabaseRow(record)
      );

      return allRequests.filter((req: DropRequest) => req.parentId === parentId);
    } catch (error) {
      this.logger.error('❌ Error finding drop requests by parent ID:', error);
      throw new Error(`Failed to find drop requests by parent ID: ${(error as Error).message}`);
    }
  }

  /**
   * Find all drop requests with a specific status
   * @param status - Drop request status (use DropRequestStatus constants)
   * @returns Array of drop requests
   */
  async findByStatus(status: string): Promise<DropRequest[]> {
    try {
      this.logger.info(`🔍 Finding drop requests with status: ${status}`);

      const allRequests = await this.dbClient.getAllRecords('drop_requests', (record: Record<string, string>) =>
        DropRequest.fromDatabaseRow(record)
      );

      return allRequests.filter((req: DropRequest) => req.status === status);
    } catch (error) {
      this.logger.error('❌ Error finding drop requests by status:', error);
      throw new Error(`Failed to find drop requests by status: ${(error as Error).message}`);
    }
  }

  /**
   * Find drop request by registration ID
   * Used to check if a drop request already exists for a registration
   * @param registrationId - Registration UUID
   * @returns Drop request or null
   */
  async findByRegistrationId(registrationId: string): Promise<DropRequest | null> {
    try {
      this.logger.info(`🔍 Finding drop request for registration: ${registrationId}`);

      const allRequests = await this.dbClient.getAllRecords('drop_requests', (record: Record<string, string>) =>
        DropRequest.fromDatabaseRow(record)
      );

      const request = allRequests.find((req: DropRequest) => req.registrationId === registrationId);
      return request || null;
    } catch (error) {
      this.logger.error('❌ Error finding drop request by registration ID:', error);
      throw new Error(`Failed to find drop request by registration ID: ${(error as Error).message}`);
    }
  }

  /**
   * Update an existing drop request
   * @param id - Drop request UUID
   * @param updateData - Data to update
   * @param updatedBy - User performing the update
   * @returns Updated drop request
   */
  async update(
    id: string,
    updateData: Record<string, unknown>,
    updatedBy: string = ''
  ): Promise<DropRequest> {
    try {
      this.logger.info(`📝 Updating drop request: ${id}`);

      // Find the request first
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Drop request not found: ${id}`);
      }

      // Merge updates
      const updated = new DropRequest({
      ...(existing as unknown as DropRequestData), // SC-005: raw Sheets row → typed model
        ...(updateData as Partial<DropRequestData>),
        id, // Ensure ID doesn't change
      });

      await this.dbClient.updateRecord('drop_requests', updated.toJSON() as unknown as Record<string, string>, updatedBy); // SC-005: typed model → generic storage API

      this.logger.info(`✅ Updated drop request: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error('❌ Error updating drop request:', error);
      throw new Error(`Failed to update drop request: ${(error as Error).message}`);
    }
  }

  /**
   * Get all drop requests
   * @returns Array of all drop requests
   */
  async findAll(_options: Record<string, unknown> = {}): Promise<DropRequest[]> {
    try {
      this.logger.info('📋 Finding all drop requests');

      const allRequests = await this.dbClient.getAllRecords('drop_requests', (record: Record<string, string>) =>
        DropRequest.fromDatabaseRow(record)
      );

      this.logger.info(`✅ Found ${allRequests.length} drop requests`);
      return allRequests;
    } catch (error) {
      this.logger.error('❌ Error finding all drop requests:', error);
      throw new Error(`Failed to find all drop requests: ${(error as Error).message}`);
    }
  }
}
