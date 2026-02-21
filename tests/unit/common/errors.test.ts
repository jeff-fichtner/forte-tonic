import { jest } from '@jest/globals';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../../../src/common/errors.js';
import { HTTP_STATUS, ERROR_CODE } from '../../../src/common/errorConstants.js';

describe('Custom Error Classes', () => {
  describe('NotFoundError', () => {
    test('should create error with default code', () => {
      const error = new NotFoundError('User not found');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('User not found');
      expect(error.code).toBe(ERROR_CODE.NOT_FOUND);
      expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('should create error with custom code', () => {
      const error = new NotFoundError('User not found', ERROR_CODE.USER_NOT_FOUND);

      expect(error.code).toBe(ERROR_CODE.USER_NOT_FOUND);
      expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('should have stack trace', () => {
      const error = new NotFoundError('User not found');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('NotFoundError');
    });

    test('should be instanceof Error and NotFoundError', () => {
      const error = new NotFoundError('Test');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof NotFoundError).toBe(true);
    });
  });

  describe('ValidationError', () => {
    test('should create error with details', () => {
      const details = { field: 'email', reason: 'Invalid format' };
      const error = new ValidationError('Validation failed', details);

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe(ERROR_CODE.VALIDATION_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.details).toEqual(details);
    });

    test('should create error without details', () => {
      const error = new ValidationError('Validation failed');

      expect(error.details).toEqual({});
    });

    test('should have stack trace', () => {
      const error = new ValidationError('Invalid data');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });

    test('should be instanceof Error and ValidationError', () => {
      const error = new ValidationError('Test');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof ValidationError).toBe(true);
    });
  });

  describe('UnauthorizedError', () => {
    test('should create error with default message', () => {
      const error = new UnauthorizedError();

      expect(error.name).toBe('UnauthorizedError');
      expect(error.message).toBe('Authentication required');
      expect(error.code).toBe(ERROR_CODE.UNAUTHORIZED);
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should create error with custom message', () => {
      const error = new UnauthorizedError('Invalid token');

      expect(error.message).toBe('Invalid token');
      expect(error.code).toBe(ERROR_CODE.UNAUTHORIZED);
    });

    test('should have stack trace', () => {
      const error = new UnauthorizedError();
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('UnauthorizedError');
    });

    test('should be instanceof Error and UnauthorizedError', () => {
      const error = new UnauthorizedError();
      expect(error instanceof Error).toBe(true);
      expect(error instanceof UnauthorizedError).toBe(true);
    });
  });

  describe('ForbiddenError', () => {
    test('should create error with default message', () => {
      const error = new ForbiddenError();

      expect(error.name).toBe('ForbiddenError');
      expect(error.message).toBe('Insufficient permissions');
      expect(error.code).toBe(ERROR_CODE.FORBIDDEN);
      expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
    });

    test('should create error with custom message', () => {
      const error = new ForbiddenError('Admin access required');

      expect(error.message).toBe('Admin access required');
      expect(error.code).toBe(ERROR_CODE.FORBIDDEN);
    });

    test('should have stack trace', () => {
      const error = new ForbiddenError();
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ForbiddenError');
    });

    test('should be instanceof Error and ForbiddenError', () => {
      const error = new ForbiddenError();
      expect(error instanceof Error).toBe(true);
      expect(error instanceof ForbiddenError).toBe(true);
    });
  });

  describe('ConflictError', () => {
    test('should create error with default code', () => {
      const error = new ConflictError('Resource already exists');

      expect(error.name).toBe('ConflictError');
      expect(error.message).toBe('Resource already exists');
      expect(error.code).toBe(ERROR_CODE.CONFLICT);
      expect(error.statusCode).toBe(HTTP_STATUS.CONFLICT);
    });

    test('should create error with custom code', () => {
      const error = new ConflictError('Duplicate email', 'DUPLICATE_EMAIL');

      expect(error.message).toBe('Duplicate email');
      expect(error.code).toBe('DUPLICATE_EMAIL');
      expect(error.statusCode).toBe(HTTP_STATUS.CONFLICT);
    });

    test('should have stack trace', () => {
      const error = new ConflictError('Conflict');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ConflictError');
    });

    test('should be instanceof Error and ConflictError', () => {
      const error = new ConflictError('Test');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof ConflictError).toBe(true);
    });
  });

  describe('Error Differentiation', () => {
    test('should be able to differentiate between error types', () => {
      const notFound = new NotFoundError('Not found');
      const validation = new ValidationError('Invalid');
      const unauthorized = new UnauthorizedError();
      const forbidden = new ForbiddenError();
      const conflict = new ConflictError('Conflict');

      expect(notFound instanceof NotFoundError).toBe(true);
      expect(notFound instanceof ValidationError).toBe(false);

      expect(validation instanceof ValidationError).toBe(true);
      expect(validation instanceof NotFoundError).toBe(false);

      expect(unauthorized instanceof UnauthorizedError).toBe(true);
      expect(unauthorized instanceof ForbiddenError).toBe(false);

      expect(forbidden instanceof ForbiddenError).toBe(true);
      expect(forbidden instanceof UnauthorizedError).toBe(false);

      expect(conflict instanceof ConflictError).toBe(true);
      expect(conflict instanceof NotFoundError).toBe(false);
    });

    test('should have unique status codes', () => {
      const errors = [
        new NotFoundError('Test'),
        new ValidationError('Test'),
        new UnauthorizedError(),
        new ForbiddenError(),
        new ConflictError('Test'),
      ];

      const statusCodes = errors.map(e => e.statusCode);
      const uniqueStatusCodes = [...new Set(statusCodes)];

      expect(uniqueStatusCodes).toHaveLength(statusCodes.length);
    });
  });
});
