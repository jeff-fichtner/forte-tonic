/**
 * Custom error classes for consistent error handling
 * Each error class includes a statusCode property for HTTP responses
 * and a code property for GCP Error Reporting grouping.
 */

import { HTTP_STATUS, ERROR_CODE } from './errorConstants.js';

/**
 * NotFoundError - Resource not found (404)
 * Use when a requested resource doesn't exist
 */
export class NotFoundError extends Error {
  constructor(message, code = ERROR_CODE.NOT_FOUND) {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
    this.statusCode = HTTP_STATUS.NOT_FOUND;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError);
    }
  }
}

/**
 * ValidationError - Invalid input data (400)
 * Use when request data fails validation
 */
export class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.code = ERROR_CODE.VALIDATION_ERROR;
    this.details = details;
    this.statusCode = HTTP_STATUS.BAD_REQUEST;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * UnauthorizedError - Authentication required (401)
 * Use when user is not authenticated
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
    this.code = ERROR_CODE.UNAUTHORIZED;
    this.statusCode = HTTP_STATUS.UNAUTHORIZED;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnauthorizedError);
    }
  }
}

/**
 * ForbiddenError - Insufficient permissions (403)
 * Use when user is authenticated but lacks required permissions
 */
export class ForbiddenError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
    this.code = ERROR_CODE.FORBIDDEN;
    this.statusCode = HTTP_STATUS.FORBIDDEN;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ForbiddenError);
    }
  }
}

/**
 * ConflictError - Resource conflict (409)
 * Use when a resource already exists or conflicts with current state
 */
export class ConflictError extends Error {
  constructor(message, code = ERROR_CODE.CONFLICT) {
    super(message);
    this.name = 'ConflictError';
    this.code = code;
    this.statusCode = HTTP_STATUS.CONFLICT;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConflictError);
    }
  }
}
