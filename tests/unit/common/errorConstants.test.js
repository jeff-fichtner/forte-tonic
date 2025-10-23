import {
  HTTP_STATUS,
  ERROR_TYPE,
  ERROR_CODE,
  LOG_SEVERITY,
} from '../../../src/common/errorConstants.js';

describe('errorConstants', () => {
  describe('HTTP_STATUS', () => {
    test('should have correct success status codes', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.NO_CONTENT).toBe(204);
    });

    test('should have correct client error codes', () => {
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.CONFLICT).toBe(409);
      expect(HTTP_STATUS.UNPROCESSABLE_ENTITY).toBe(422);
      expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
    });

    test('should have correct server error codes', () => {
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HTTP_STATUS.BAD_GATEWAY).toBe(502);
      expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
      expect(HTTP_STATUS.GATEWAY_TIMEOUT).toBe(504);
    });
  });

  describe('ERROR_TYPE', () => {
    test('should have all error types defined', () => {
      expect(ERROR_TYPE.VALIDATION).toBe('validation');
      expect(ERROR_TYPE.AUTHENTICATION).toBe('authentication');
      expect(ERROR_TYPE.AUTHORIZATION).toBe('authorization');
      expect(ERROR_TYPE.NOT_FOUND).toBe('not_found');
      expect(ERROR_TYPE.CONFLICT).toBe('conflict');
      expect(ERROR_TYPE.SERVER).toBe('server');
      expect(ERROR_TYPE.CLIENT).toBe('client');
    });

    test('should have 7 error types', () => {
      expect(Object.keys(ERROR_TYPE)).toHaveLength(7);
    });
  });

  describe('ERROR_CODE', () => {
    test('should have all error codes defined', () => {
      expect(ERROR_CODE.NOT_FOUND).toBe('NOT_FOUND');
      expect(ERROR_CODE.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
      expect(ERROR_CODE.REGISTRATION_NOT_FOUND).toBe('REGISTRATION_NOT_FOUND');
      expect(ERROR_CODE.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ERROR_CODE.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ERROR_CODE.FORBIDDEN).toBe('FORBIDDEN');
      expect(ERROR_CODE.CONFLICT).toBe('CONFLICT');
      expect(ERROR_CODE.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });

    test('should use UPPER_SNAKE_CASE format', () => {
      Object.values(ERROR_CODE).forEach(code => {
        expect(code).toMatch(/^[A-Z_]+$/);
      });
    });
  });

  describe('LOG_SEVERITY', () => {
    test('should match GCP Cloud Logging severity levels', () => {
      expect(LOG_SEVERITY.DEBUG).toBe('DEBUG');
      expect(LOG_SEVERITY.INFO).toBe('INFO');
      expect(LOG_SEVERITY.WARNING).toBe('WARNING');
      expect(LOG_SEVERITY.ERROR).toBe('ERROR');
      expect(LOG_SEVERITY.CRITICAL).toBe('CRITICAL');
    });

    test('should have 5 severity levels', () => {
      expect(Object.keys(LOG_SEVERITY)).toHaveLength(5);
    });
  });
});
