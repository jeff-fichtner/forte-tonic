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
import { UuidUtility } from '../utils/uuidUtility.js';
import { DropRequestStatus } from '../utils/values/dropRequestStatus.js';

/**
 * Drop Request Model
 * Simple data holder - no complex business logic
 */
export class DropRequest {
  constructor(data = {}) {
    this.id = data.id || UuidUtility.generateUuid();
    this.registrationId = data.registrationId;
    this.parentId = data.parentId;
    this.trimester = data.trimester;
    this.reason = data.reason;
    this.requestedAt = data.requestedAt || new Date().toISOString();
    this.status = data.status || DropRequestStatus.PENDING;
    this.reviewedBy = data.reviewedBy || null;
    this.reviewedAt = data.reviewedAt || null;
    this.adminNotes = data.adminNotes || null;
  }

  /**
   * Convert to plain object for database storage
   */
  toJSON() {
    return {
      id: this.id,
      registrationId: this.registrationId,
      parentId: this.parentId,
      trimester: this.trimester,
      reason: this.reason,
      requestedAt: this.requestedAt,
      status: this.status,
      reviewedBy: this.reviewedBy || '',
      reviewedAt: this.reviewedAt || '',
      adminNotes: this.adminNotes || '',
    };
  }

  /**
   * Create from database row
   */
  static fromDatabaseRow(row) {
    return new DropRequest({
      id: row[0],
      registrationId: row[1],
      parentId: row[2],
      trimester: row[3],
      reason: row[4],
      requestedAt: row[5],
      status: row[6],
      reviewedBy: row[7] || null,
      reviewedAt: row[8] || null,
      adminNotes: row[9] || null,
    });
  }
}

/**
 * Repository for drop requests
 */
export class DropRequestRepository extends BaseRepository {
  /**
   * @param {object} dbClient - Database client instance
   * @param {object} configService - Configuration service for logger initialization
   */
  constructor(dbClient, configService) {
    super('drop_requests', DropRequest, dbClient, configService);

    // Skip cache for drop requests - they change frequently during active periods
    this.skipCache = true;
  }

  /**
   * Create a new drop request
   * @param {object} requestData - Drop request data
   * @param {string} createdBy - User creating the request (typically parent email)
   * @returns {Promise<DropRequest>} Created drop request
   */
  async create(requestData, createdBy) {
    try {
      this.logger.info(
        `📝 Creating new drop request for registration: ${requestData.registrationId}`
      );

      const dropRequest = new DropRequest(requestData);
      const created = await this.dbClient.insertIntoSheet('drop_requests', dropRequest.toJSON());

      this.logger.info(`✅ Created drop request with ID: ${dropRequest.id}`);
      return dropRequest;
    } catch (error) {
      this.logger.error('❌ Error creating drop request:', error);
      throw new Error(`Failed to create drop request: ${error.message}`);
    }
  }

  /**
   * Find drop request by ID
   * @param {string} id - Drop request UUID
   * @returns {Promise<DropRequest|null>} Drop request or null
   */
  async findById(id) {
    try {
      this.logger.info(`🔍 Finding drop request by ID: ${id}`);

      const allRequests = await this.dbClient.getAllRecords('drop_requests', row =>
        DropRequest.fromDatabaseRow(row)
      );

      const request = allRequests.find(req => req.id === id);
      return request || null;
    } catch (error) {
      this.logger.error('❌ Error finding drop request by ID:', error);
      throw new Error(`Failed to find drop request by ID: ${error.message}`);
    }
  }

  /**
   * Find all drop requests for a specific parent
   * @param {string} parentId - Parent UUID
   * @returns {Promise<DropRequest[]>} Array of drop requests
   */
  async findByParentId(parentId) {
    try {
      this.logger.info(`🔍 Finding drop requests for parent: ${parentId}`);

      const allRequests = await this.dbClient.getAllRecords('drop_requests', row =>
        DropRequest.fromDatabaseRow(row)
      );

      return allRequests.filter(req => req.parentId === parentId);
    } catch (error) {
      this.logger.error('❌ Error finding drop requests by parent ID:', error);
      throw new Error(`Failed to find drop requests by parent ID: ${error.message}`);
    }
  }

  /**
   * Find all drop requests with a specific status
   * @param {string} status - Drop request status (use DropRequestStatus constants)
   * @returns {Promise<DropRequest[]>} Array of drop requests
   */
  async findByStatus(status) {
    try {
      this.logger.info(`🔍 Finding drop requests with status: ${status}`);

      const allRequests = await this.dbClient.getAllRecords('drop_requests', row =>
        DropRequest.fromDatabaseRow(row)
      );

      return allRequests.filter(req => req.status === status);
    } catch (error) {
      this.logger.error('❌ Error finding drop requests by status:', error);
      throw new Error(`Failed to find drop requests by status: ${error.message}`);
    }
  }

  /**
   * Find drop request by registration ID
   * Used to check if a drop request already exists for a registration
   * @param {string} registrationId - Registration UUID
   * @returns {Promise<DropRequest|null>} Drop request or null
   */
  async findByRegistrationId(registrationId) {
    try {
      this.logger.info(`🔍 Finding drop request for registration: ${registrationId}`);

      const allRequests = await this.dbClient.getAllRecords('drop_requests', row =>
        DropRequest.fromDatabaseRow(row)
      );

      const request = allRequests.find(req => req.registrationId === registrationId);
      return request || null;
    } catch (error) {
      this.logger.error('❌ Error finding drop request by registration ID:', error);
      throw new Error(`Failed to find drop request by registration ID: ${error.message}`);
    }
  }

  /**
   * Update an existing drop request
   * @param {string} id - Drop request UUID
   * @param {object} updateData - Data to update
   * @param {string} updatedBy - User performing the update
   * @returns {Promise<DropRequest>} Updated drop request
   */
  async update(id, updateData, updatedBy) {
    try {
      this.logger.info(`📝 Updating drop request: ${id}`);

      // Find the request first
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Drop request not found: ${id}`);
      }

      // Merge updates
      const updated = new DropRequest({
        ...existing,
        ...updateData,
        id, // Ensure ID doesn't change
      });

      await this.dbClient.updateRecord('drop_requests', updated.toJSON(), updatedBy);

      this.logger.info(`✅ Updated drop request: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error('❌ Error updating drop request:', error);
      throw new Error(`Failed to update drop request: ${error.message}`);
    }
  }

  /**
   * Get all drop requests
   * @returns {Promise<DropRequest[]>} Array of all drop requests
   */
  async findAll() {
    try {
      this.logger.info('📋 Finding all drop requests');

      const allRequests = await this.dbClient.getAllRecords('drop_requests', row =>
        DropRequest.fromDatabaseRow(row)
      );

      this.logger.info(`✅ Found ${allRequests.length} drop requests`);
      return allRequests;
    } catch (error) {
      this.logger.error('❌ Error finding all drop requests:', error);
      throw new Error(`Failed to find all drop requests: ${error.message}`);
    }
  }
}
