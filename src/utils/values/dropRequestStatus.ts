/**
 * Drop Request Status Constants
 * ==============================
 *
 * Status values for drop request workflow
 */

export const DropRequestStatus = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const);

export type DropRequestStatusValue = (typeof DropRequestStatus)[keyof typeof DropRequestStatus];
