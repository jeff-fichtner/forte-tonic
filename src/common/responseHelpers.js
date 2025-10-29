/**
 * Response Helper Functions
 * Standardized response formatting with GCP Cloud Logging integration
 */

import { getCloudLogger, buildHttpRequestLog } from './gcpLogger.js';
import { HTTP_STATUS, ERROR_TYPE, ERROR_CODE, LOG_SEVERITY } from './errorConstants.js';

/**
 * Send a success response with optional GCP logging
 *
 * @param {object} res - Express response object
 * @param {any} data - Response data to send
 * @param {object} options - Optional configuration
 * @param {string} options.message - Optional success message
 * @param {number} options.statusCode - HTTP status code (default: 200)
 * @param {object} options.req - Express request (for logging)
 * @param {number} options.startTime - Request start time (for logging)
 * @param {object} options.context - Additional context for logs
 */
export function successResponse(res, data, options = {}) {
  const { message = null, statusCode = HTTP_STATUS.OK, req = null, startTime = null } = options;

  // Log successful requests if req and startTime provided
  if (req && startTime) {
    const logger = getCloudLogger();
    logger.info({
      message: message || 'Request completed successfully',
      httpRequest: buildHttpRequestLog(req, res, startTime, statusCode),
      context: options.context,
    });
  }

  // Send success response
  res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
  });
}

/**
 * Send an error response with GCP Cloud Logging and Error Reporting integration
 *
 * @param {object} res - Express response object
 * @param {Error} error - Error object to handle
 * @param {object} options - Optional configuration
 * @param {object} options.req - Express request (for logging)
 * @param {number} options.startTime - Request start time (for logging)
 * @param {object} options.context - Additional context for logs
 * @param {boolean} options.includeRequestData - Include sanitized request data in error response (for save operations)
 */
export function errorResponse(res, error, options = {}) {
  const { req = null, startTime = null, context = {}, includeRequestData = false } = options;

  // Determine HTTP status code from error
  const statusCode = determineStatusCode(error);

  // Determine log severity: 4xx = WARNING, 5xx = ERROR
  const severity = statusCode >= 500 ? LOG_SEVERITY.ERROR : LOG_SEVERITY.WARNING;

  // Build structured log entry for GCP Cloud Logging
  const logEntry = {
    message: error.message || 'An unexpected error occurred',
    severity,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code || ERROR_CODE.INTERNAL_ERROR,
    },
    context,
  };

  // Add httpRequest field if available (enables request correlation)
  if (req && startTime) {
    logEntry.httpRequest = buildHttpRequestLog(req, res, startTime, statusCode);
  }

  // Add Error Reporting type for 5xx errors (automatic aggregation in GCP)
  if (statusCode >= 500) {
    logEntry['@type'] =
      'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent';
  }

  // Log to GCP Cloud Logging
  const logger = getCloudLogger();
  if (severity === LOG_SEVERITY.ERROR) {
    logger.error(logEntry);
  } else {
    logger.warning(logEntry);
  }

  // Build error response payload
  const errorPayload = {
    success: false,
    error: {
      message: getClientMessage(error, statusCode),
      code: error.code || ERROR_CODE.INTERNAL_ERROR,
      type: getErrorType(statusCode),
    },
  };

  // Include sanitized request data for save operations (if enabled)
  // This helps clients retry failed operations and provides better UX
  if (includeRequestData && req) {
    errorPayload.requestData = sanitizeRequestData(req);
  }

  // Send error response to client (sanitized)
  res.status(statusCode).json(errorPayload);
}

/**
 * Determine HTTP status code from error object
 *
 * @param {Error} error - Error object
 * @returns {number} HTTP status code
 */
export function determineStatusCode(error) {
  // Use error's statusCode if present
  if (error.statusCode) {
    return error.statusCode;
  }

  // Map error names to status codes
  if (error.name === 'ValidationError') return HTTP_STATUS.BAD_REQUEST;
  if (error.name === 'NotFoundError') return HTTP_STATUS.NOT_FOUND;
  if (error.name === 'ConflictError') return HTTP_STATUS.CONFLICT;
  if (error.name === 'UnauthorizedError') return HTTP_STATUS.UNAUTHORIZED;
  if (error.name === 'ForbiddenError') return HTTP_STATUS.FORBIDDEN;

  // Default to 500 for unknown errors
  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Get client-safe error message
 * Sanitizes internal error messages in production
 *
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code
 * @returns {string} Client-safe error message
 */
function getClientMessage(error, statusCode) {
  // Don't leak internal error details in production for 5xx errors
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    return 'An internal server error occurred. Please try again later.';
  }

  return error.message || 'An unexpected error occurred';
}

/**
 * Get error type from status code
 * Used for client-side error categorization
 *
 * @param {number} statusCode - HTTP status code
 * @returns {string} Error type
 */
function getErrorType(statusCode) {
  if (statusCode === HTTP_STATUS.BAD_REQUEST || statusCode === HTTP_STATUS.UNPROCESSABLE_ENTITY) {
    return ERROR_TYPE.VALIDATION;
  }

  if (statusCode === HTTP_STATUS.UNAUTHORIZED) return ERROR_TYPE.AUTHENTICATION;
  if (statusCode === HTTP_STATUS.FORBIDDEN) return ERROR_TYPE.AUTHORIZATION;
  if (statusCode === HTTP_STATUS.NOT_FOUND) return ERROR_TYPE.NOT_FOUND;
  if (statusCode === HTTP_STATUS.CONFLICT) return ERROR_TYPE.CONFLICT;
  if (statusCode >= 500) return ERROR_TYPE.SERVER;

  return ERROR_TYPE.CLIENT;
}

/**
 * Sanitize request data for inclusion in error responses
 * Removes sensitive fields and includes relevant context
 *
 * @param {object} req - Express request object
 * @returns {object} Sanitized request data
 */
function sanitizeRequestData(req) {
  const data = req.body || {};

  // Create a shallow copy to avoid mutating the original
  const sanitized = { ...data };

  // Remove sensitive fields that should never be in error responses
  const sensitiveFields = [
    'password',
    'accessCode',
    'token',
    'apiKey',
    'secret',
    'privateKey',
    'authorization',
  ];

  sensitiveFields.forEach(field => {
    delete sanitized[field];
  });

  // Include URL parameters if present (useful for PUT/PATCH/DELETE operations)
  if (req.params && Object.keys(req.params).length > 0) {
    sanitized._urlParams = req.params;
  }

  // Include query parameters if present (useful for filtered GET operations)
  if (req.query && Object.keys(req.query).length > 0) {
    sanitized._queryParams = req.query;
  }

  return sanitized;
}
