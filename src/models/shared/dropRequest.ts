/**
 * Drop Request Model
 * Simple data holder - no complex business logic
 */

import { UuidUtility } from '../../utils/uuidUtility.js';
import { DropRequestStatus } from '../../utils/values/dropRequestStatus.js';

export interface DropRequestData {
  [key: string]: unknown;
  id: string;
  registrationId: string;
  parentId: string;
  trimester: string;
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
  trimester: string;
  reason: string;
  requestedAt: string;
  status: string;
  reviewedBy: string;
  reviewedAt: string;
  adminNotes: string;
}

export class DropRequest {
  /** Column schema: positional order of fields in the drop_requests spreadsheet */
  static readonly columns = [
    'id', 'registrationId', 'parentId', 'trimester', 'reason',
    'requestedAt', 'status', 'reviewedBy', 'reviewedAt', 'adminNotes',
  ] as const;

  id: string;
  registrationId: string;
  parentId: string;
  trimester: string;
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
    this.trimester = data.trimester || '';
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
  static fromDatabaseRow(record: Record<string, string>): DropRequest {
    return new DropRequest({
      id: record.id,
      registrationId: record.registrationId,
      parentId: record.parentId,
      trimester: record.trimester,
      reason: record.reason,
      requestedAt: record.requestedAt,
      status: record.status,
      reviewedBy: record.reviewedBy || null,
      reviewedAt: record.reviewedAt || null,
      adminNotes: record.adminNotes || null,
    });
  }
}
