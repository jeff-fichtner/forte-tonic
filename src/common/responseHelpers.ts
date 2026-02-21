/**
 * Response Helper Functions
 * Standardized response formatting with GCP Cloud Logging integration
 */

import type { Request, Response } from 'express';
import { getCloudLogger, buildHttpRequestLog } from './gcpLogger.js';
import { HTTP_STATUS, ERROR_TYPE, ERROR_CODE, LOG_SEVERITY } from './errorConstants.js';

// --- API Response Types (from contracts/api-responses.ts) ---

/** Success response envelope */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/** Error detail object */
export interface ApiErrorDetail {
  message: string;
  code: string;
  type: string;
  requestData?: Record<string, unknown>;
}

/** Error response envelope */
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

/** Union type for all API responses */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Options for successResponse helper */
export interface SuccessResponseOptions {
  message?: string | null;
  statusCode?: number;
  req?: Request | null;
  startTime?: number | null;
  context?: Record<string, unknown>;
}

/** Options for errorResponse helper */
export interface ErrorResponseOptions {
  req?: Request | null;
  startTime?: number | null;
  context?: Record<string, unknown>;
  includeRequestData?: boolean;
}

/** Error with optional application-specific properties */
interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

function normalizeError(error: unknown): AppError {
  if (error instanceof Error) {
    return error as AppError;
  }

  const fallback = new Error('An unexpected error occurred') as AppError;
  if (typeof error === 'string') {
    fallback.message = error;
  }
  return fallback;
}

// --- Helper Functions ---

/**
 * Send a success response with optional GCP logging
 *
 * @param res - Express response object
 * @param data - Response data to send
 * @param options - Optional configuration
 */
export function successResponse<T>(
  res: Response,
  data: T,
  options: SuccessResponseOptions = {},
): void {
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
 * @param res - Express response object
 * @param error - Error object to handle
 * @param options - Optional configuration
 */
export function errorResponse(
  res: Response,
  error: unknown,
  options: ErrorResponseOptions = {},
  fallbackStatusCode?: number,
): void {
  const normalizedError = normalizeError(error);
  const { req = null, startTime = null, context = {}, includeRequestData = false } = options;

  // Determine HTTP status code from error
  const statusCode = fallbackStatusCode ?? determineStatusCode(normalizedError);

  // Determine log severity: 4xx = WARNING, 5xx = ERROR
  const severity = statusCode >= 500 ? LOG_SEVERITY.ERROR : LOG_SEVERITY.WARNING;

  // Build structured log entry for GCP Cloud Logging
  const logEntry: Record<string, unknown> = {
    message: normalizedError.message || 'An unexpected error occurred',
    severity,
    error: {
      name: normalizedError.name,
      message: normalizedError.message,
      stack: normalizedError.stack,
      code: normalizedError.code || ERROR_CODE.INTERNAL_ERROR,
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
  const errorPayload: { success: false; error: ApiErrorDetail; requestData?: Record<string, unknown> } = {
    success: false,
    error: {
      message: getClientMessage(normalizedError, statusCode),
      code: normalizedError.code || ERROR_CODE.INTERNAL_ERROR,
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
 * @param error - Error object
 * @returns HTTP status code
 */
export function determineStatusCode(error: AppError): number {
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
 * @param error - Error object
 * @param statusCode - HTTP status code
 * @returns Client-safe error message
 */
function getClientMessage(error: AppError, statusCode: number): string {
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
 * @param statusCode - HTTP status code
 * @returns Error type
 */
function getErrorType(statusCode: number): string {
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
 * @param req - Express request object
 * @returns Sanitized request data
 */
function sanitizeRequestData(req: Request): Record<string, unknown> {
  const data = (req.body || {}) as Record<string, unknown>;

  // Create a shallow copy to avoid mutating the original
  const sanitized: Record<string, unknown> = { ...data };

  // Remove sensitive fields that should never be in error responses
  const sensitiveFields: string[] = [
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
