/**
 * Error handling constants for GCP-optimized error responses
 * These constants ensure consistency across the application and proper integration
 * with GCP Cloud Logging and Error Reporting.
 */

/**
 * HTTP Status Codes
 * Standard HTTP status codes used throughout the application
 */
export const HTTP_STATUS = {
  // Success codes (2xx)
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // Client error codes (4xx)
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server error codes (5xx)
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

/**
 * Error Types
 * Categories of errors for client-side handling
 */
export const ERROR_TYPE = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  SERVER: 'server',
  CLIENT: 'client',
};

/**
 * Error Codes
 * Specific error codes for better error tracking in GCP Error Reporting
 * Use UPPER_SNAKE_CASE for consistency
 */
export const ERROR_CODE = {
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  REGISTRATION_NOT_FOUND: 'REGISTRATION_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

/**
 * Log Severity Levels
 * Matches GCP Cloud Logging severity levels for proper log indexing
 * @see https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
 */
export const LOG_SEVERITY = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
};
