/**
 * Drop Request Model
 * Simple data holder - no complex business logic
 */

import { UuidUtility } from '../../utils/uuidUtility.js';
import { DropRequestStatus } from '../../utils/values/dropRequestStatus.js';

export interface DropRequestData {
  id: string;
  registrationId: string;
  parentId: string;
  reason: string;
  requestedAt: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
}

export interface DropRequestJSON {
  id: string;
  registrationId: string;
  parentId: string;
  reason: string;
  requestedAt: string;
  status: string;
  reviewedBy: string;
  reviewedAt: string;
  adminNotes: string;
}

export class DropRequest {
  id: string;
  registrationId: string;
  parentId: string;
  reason: string;
  requestedAt: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;

  constructor(data: Partial<DropRequestData> = {}) {
    this.id = data.id || UuidUtility.generateUuid();
    this.registrationId = data.registrationId || '';
    this.parentId = data.parentId || '';
    this.reason = data.reason || '';
    this.requestedAt = data.requestedAt || new Date().toISOString();
    this.status = data.status || DropRequestStatus.PENDING;
    this.reviewedBy = data.reviewedBy || null;
    this.reviewedAt = data.reviewedAt || null;
    this.adminNotes = data.adminNotes || null;
  }

  /**
   * Convert to plain object for database storage
   */
  toJSON(): DropRequestJSON {
    return {
      id: this.id,
      registrationId: this.registrationId,
      parentId: this.parentId,
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
  static fromDatabaseRow(row: string[]): DropRequest {
    return new DropRequest({
      id: row[0],
      registrationId: row[1],
      parentId: row[2],
      reason: row[3],
      requestedAt: row[4],
      status: row[5],
      reviewedBy: row[6] || null,
      reviewedAt: row[7] || null,
      adminNotes: row[8] || null,
    });
  }
}
