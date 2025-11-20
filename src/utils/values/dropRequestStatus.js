/**
 * Drop Request Status Constants
 * ==============================
 *
 * Defines valid status values for drop requests to avoid magic strings
 * throughout the codebase.
 *
 * @constant {Object} DropRequestStatus
 * @property {string} PENDING - Initial state when parent submits drop request
 * @property {string} APPROVED - Admin approved and registration deleted
 * @property {string} REJECTED - Admin rejected, registration remains active
 */
export const DropRequestStatus = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

/**
 * All valid status values as an array
 * @type {string[]}
 */
export const ALL_STATUSES = Object.values(DropRequestStatus);

/**
 * Validates if a given status is valid
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid status
 */
export function isValidDropRequestStatus(status) {
  return ALL_STATUSES.includes(status);
}
