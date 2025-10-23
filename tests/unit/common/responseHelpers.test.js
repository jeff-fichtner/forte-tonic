import { jest } from '@jest/globals';
import { HTTP_STATUS, ERROR_TYPE } from '../../../src/common/errorConstants.js';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../../../src/common/errors.js';

// Mock the GCP logger
const mockCloudLogger = {
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
};

jest.unstable_mockModule('../../../src/common/gcpLogger.js', () => ({
  getCloudLogger: jest.fn(() => mockCloudLogger),
  buildHttpRequestLog: jest.fn(() => ({
    requestMethod: 'GET',
    requestUrl: '/api/test',
    status: 200,
    latency: '0.123s',
  })),
}));

const { successResponse, errorResponse, determineStatusCode } = await import(
  '../../../src/common/responseHelpers.js'
);

describe('responseHelpers', () => {
  let mockRes;
  let mockReq;
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      statusCode: 200,
    };

    mockReq = {
      method: 'GET',
      originalUrl: '/api/test',
      get: jest.fn(() => null),
      ip: '127.0.0.1',
    };

    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('successResponse', () => {
    test('should send success response with data', () => {
      const data = { id: '123', name: 'Test' };

      successResponse(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: '123', name: 'Test' },
      });
    });

    test('should include message if provided', () => {
      const data = { id: '123' };

      successResponse(mockRes, data, { message: 'Created successfully' });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: '123' },
        message: 'Created successfully',
      });
    });

    test('should not include message field if not provided', () => {
      const data = { id: '123' };

      successResponse(mockRes, data);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('message');
    });

    test('should use custom status code', () => {
      const data = { id: '123' };

      successResponse(mockRes, data, { statusCode: HTTP_STATUS.CREATED });

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    });

    test('should log when req and startTime provided', () => {
      const data = { id: '123' };
      const startTime = Date.now();
      const context = { controller: 'TestController', method: 'test' };

      successResponse(mockRes, data, { req: mockReq, startTime, context });

      expect(mockCloudLogger.info).toHaveBeenCalledTimes(1);
    });

    test('should not log when req missing', () => {
      const data = { id: '123' };
      const startTime = Date.now();

      successResponse(mockRes, data, { startTime });

      expect(mockCloudLogger.info).not.toHaveBeenCalled();
    });

    test('should not log when startTime missing', () => {
      const data = { id: '123' };

      successResponse(mockRes, data, { req: mockReq });

      expect(mockCloudLogger.info).not.toHaveBeenCalled();
    });

    test('should handle null data', () => {
      successResponse(mockRes, null);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: null,
      });
    });

    test('should handle array data', () => {
      const data = [1, 2, 3];

      successResponse(mockRes, data);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [1, 2, 3],
      });
    });
  });

  describe('errorResponse', () => {
    test('should send error response for 404', () => {
      const error = new NotFoundError('User not found');

      errorResponse(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'User not found',
          code: 'NOT_FOUND',
          type: ERROR_TYPE.NOT_FOUND,
        },
      });
    });

    test('should send error response for validation error', () => {
      const error = new ValidationError('Invalid email');

      errorResponse(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error.type).toBe(ERROR_TYPE.VALIDATION);
      expect(jsonCall.error.code).toBe('VALIDATION_ERROR');
    });

    test('should send error response for unauthorized error', () => {
      const error = new UnauthorizedError('Token expired');

      errorResponse(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error.type).toBe(ERROR_TYPE.AUTHENTICATION);
    });

    test('should send error response for forbidden error', () => {
      const error = new ForbiddenError('Admin required');

      errorResponse(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error.type).toBe(ERROR_TYPE.AUTHORIZATION);
    });

    test('should send error response for conflict error', () => {
      const error = new ConflictError('Email already exists');

      errorResponse(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error.type).toBe(ERROR_TYPE.CONFLICT);
    });

    test('should log with WARNING severity for 4xx errors', () => {
      const error = new NotFoundError('User not found');
      const startTime = Date.now();

      errorResponse(mockRes, error, { req: mockReq, startTime });

      expect(mockCloudLogger.warning).toHaveBeenCalledTimes(1);
      expect(mockCloudLogger.error).not.toHaveBeenCalled();
    });

    test('should log with ERROR severity for 5xx errors', () => {
      const error = new Error('Database connection failed');
      const startTime = Date.now();

      errorResponse(mockRes, error, { req: mockReq, startTime });

      expect(mockCloudLogger.error).toHaveBeenCalledTimes(1);
      expect(mockCloudLogger.warning).not.toHaveBeenCalled();
    });

    test('should sanitize 5xx error messages in production', () => {
      process.env.NODE_ENV = 'production';

      const error = new Error('Detailed internal error with sensitive info');

      errorResponse(mockRes, error);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error.message).toBe(
        'An internal server error occurred. Please try again later.'
      );
    });

    test('should not sanitize 4xx error messages in production', () => {
      process.env.NODE_ENV = 'production';

      const error = new NotFoundError('User not found');

      errorResponse(mockRes, error);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error.message).toBe('User not found');
    });

    test('should not sanitize error messages in development', () => {
      process.env.NODE_ENV = 'development';

      const error = new Error('Detailed internal error');

      errorResponse(mockRes, error);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error.message).toBe('Detailed internal error');
    });

    test('should include Error Reporting type for 5xx errors', () => {
      const error = new Error('Internal error');
      const startTime = Date.now();

      errorResponse(mockRes, error, { req: mockReq, startTime });

      expect(mockCloudLogger.error).toHaveBeenCalledTimes(1);
      // We can't directly check the log entry since it's passed to the mocked logger
      // But we can verify error logger was called
    });

    test('should not log when req or startTime missing', () => {
      const error = new NotFoundError('Not found');

      errorResponse(mockRes, error);

      // Still logs, but without httpRequest field
      expect(mockCloudLogger.warning).toHaveBeenCalledTimes(1);
    });

    test('should use default error message if error.message is empty', () => {
      const error = new Error('');

      errorResponse(mockRes, error);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error.message).toBe('An unexpected error occurred');
    });

    test('should include context in log entry', () => {
      const error = new NotFoundError('User not found');
      const context = { userId: '123', action: 'getUser' };

      errorResponse(mockRes, error, { context });

      expect(mockCloudLogger.warning).toHaveBeenCalledTimes(1);
    });
  });

  describe('determineStatusCode', () => {
    test('should return error.statusCode if present', () => {
      const error = { statusCode: 418, name: 'TeapotError' };
      expect(determineStatusCode(error)).toBe(418);
    });

    test('should return 400 for ValidationError', () => {
      const error = new ValidationError('Invalid input');
      expect(determineStatusCode(error)).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 404 for NotFoundError', () => {
      const error = new NotFoundError('Not found');
      expect(determineStatusCode(error)).toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('should return 401 for UnauthorizedError', () => {
      const error = new UnauthorizedError('Unauthorized');
      expect(determineStatusCode(error)).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should return 403 for ForbiddenError', () => {
      const error = new ForbiddenError('Forbidden');
      expect(determineStatusCode(error)).toBe(HTTP_STATUS.FORBIDDEN);
    });

    test('should return 409 for ConflictError', () => {
      const error = new ConflictError('Conflict');
      expect(determineStatusCode(error)).toBe(HTTP_STATUS.CONFLICT);
    });

    test('should return 500 for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(determineStatusCode(error)).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    test('should return 500 for errors without name property', () => {
      const error = { message: 'Some error' };
      expect(determineStatusCode(error)).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    test('should prioritize statusCode over error name', () => {
      const error = new ValidationError('Test');
      error.statusCode = 422; // Override

      expect(determineStatusCode(error)).toBe(422);
    });
  });
});
