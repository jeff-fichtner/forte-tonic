import { jest } from '@jest/globals';

// Mock the logger before importing
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  getLogger: jest.fn(() => mockLogger),
}));

const { buildHttpRequestLog, getCloudLogger } = await import(
  '../../../src/common/gcpLogger.js'
);

describe('gcpLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GCP_PROJECT_ID;
  });

  describe('buildHttpRequestLog', () => {
    test('should build httpRequest object with all fields', () => {
      const mockReq = {
        method: 'GET',
        originalUrl: '/api/users/123',
        url: '/api/users/123',
        get: jest.fn(header => {
          if (header === 'user-agent') return 'Mozilla/5.0';
          if (header === 'referer') return 'https://example.com';
          return null;
        }),
        ip: '192.168.1.1',
      };

      const mockRes = {
        statusCode: 200,
      };

      const startTime = Date.now() - 150; // 150ms ago

      const result = buildHttpRequestLog(mockReq, mockRes, startTime);

      expect(result).toHaveProperty('requestMethod', 'GET');
      expect(result).toHaveProperty('requestUrl', '/api/users/123');
      expect(result).toHaveProperty('status', 200);
      expect(result).toHaveProperty('userAgent', 'Mozilla/5.0');
      expect(result).toHaveProperty('remoteIp', '192.168.1.1');
      expect(result).toHaveProperty('referer', 'https://example.com');
      expect(result).toHaveProperty('latency');
      expect(result.latency).toMatch(/^\d+\.\d{3}s$/);
    });

    test('should use statusCode parameter if provided', () => {
      const mockReq = {
        method: 'POST',
        originalUrl: '/api/users',
        get: jest.fn(() => null),
        ip: '127.0.0.1',
      };

      const mockRes = { statusCode: 200 };
      const startTime = Date.now();

      const result = buildHttpRequestLog(mockReq, mockRes, startTime, 400);

      expect(result.status).toBe(400);
    });

    test('should fall back to res.statusCode if parameter not provided', () => {
      const mockReq = {
        method: 'DELETE',
        originalUrl: '/api/users/123',
        get: jest.fn(() => null),
        ip: '127.0.0.1',
      };

      const mockRes = { statusCode: 204 };
      const startTime = Date.now();

      const result = buildHttpRequestLog(mockReq, mockRes, startTime);

      expect(result.status).toBe(204);
    });

    test('should calculate latency correctly', () => {
      const mockReq = {
        method: 'GET',
        originalUrl: '/api/test',
        get: jest.fn(() => null),
        ip: '127.0.0.1',
      };

      const mockRes = { statusCode: 200 };
      const startTime = Date.now() - 1234; // 1.234 seconds ago

      const result = buildHttpRequestLog(mockReq, mockRes, startTime);

      expect(result.latency).toMatch(/^1\.2\d{2}s$/);
    });

    test('should handle missing optional headers gracefully', () => {
      const mockReq = {
        method: 'GET',
        originalUrl: '/api/test',
        get: jest.fn(() => null),
        ip: '127.0.0.1',
      };

      const mockRes = { statusCode: 200 };
      const startTime = Date.now();

      const result = buildHttpRequestLog(mockReq, mockRes, startTime);

      expect(result.userAgent).toBeUndefined();
      expect(result.referer).toBeUndefined();
      expect(result.requestMethod).toBe('GET');
      expect(result.status).toBe(200);
    });

    test('should use req.url as fallback if originalUrl not present', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/fallback',
        get: jest.fn(() => null),
        ip: '127.0.0.1',
      };

      const mockRes = { statusCode: 200 };
      const startTime = Date.now();

      const result = buildHttpRequestLog(mockReq, mockRes, startTime);

      expect(result.requestUrl).toBe('/api/fallback');
    });
  });

  describe('getCloudLogger', () => {
    test('should return logger with info, warning, error methods', () => {
      const logger = getCloudLogger();

      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warning');
      expect(logger).toHaveProperty('error');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warning).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    test('should call underlying logger.info with JSON string for object data', () => {
      const logger = getCloudLogger();

      logger.info({ message: 'Test message', context: { userId: '123' } });

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const loggedArg = mockLogger.info.mock.calls[0][0];
      expect(typeof loggedArg).toBe('string');

      const parsed = JSON.parse(loggedArg);
      expect(parsed).toHaveProperty('severity', 'INFO');
      expect(parsed).toHaveProperty('message', 'Test message');
      expect(parsed.context).toEqual({ userId: '123' });
    });

    test('should call underlying logger.warn with JSON string for object data', () => {
      const logger = getCloudLogger();

      logger.warning({ message: 'Warning message' });

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      const loggedArg = mockLogger.warn.mock.calls[0][0];
      expect(typeof loggedArg).toBe('string');

      const parsed = JSON.parse(loggedArg);
      expect(parsed).toHaveProperty('severity', 'WARNING');
      expect(parsed).toHaveProperty('message', 'Warning message');
    });

    test('should call underlying logger.error with JSON string for object data', () => {
      const logger = getCloudLogger();

      logger.error({ message: 'Error message', error: { stack: '...' } });

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      const loggedArg = mockLogger.error.mock.calls[0][0];
      expect(typeof loggedArg).toBe('string');

      const parsed = JSON.parse(loggedArg);
      expect(parsed).toHaveProperty('severity', 'ERROR');
      expect(parsed).toHaveProperty('message', 'Error message');
    });

    test('should handle string input', () => {
      const logger = getCloudLogger();

      logger.info('Simple string message');

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const loggedArg = mockLogger.info.mock.calls[0][0];
      expect(typeof loggedArg).toBe('string');

      const parsed = JSON.parse(loggedArg);
      expect(parsed).toHaveProperty('severity', 'INFO');
      expect(parsed).toHaveProperty('message', 'Simple string message');
    });

    test('should add trace context when GCP_PROJECT_ID and traceId present', () => {
      process.env.GCP_PROJECT_ID = 'test-project-123';

      const logger = getCloudLogger();

      logger.info({
        message: 'Test with trace',
        traceId: 'trace-abc-123',
      });

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const loggedArg = mockLogger.info.mock.calls[0][0];
      const parsed = JSON.parse(loggedArg);

      expect(parsed['logging.googleapis.com/trace']).toBe(
        'projects/test-project-123/traces/trace-abc-123'
      );
    });

    test('should not add trace context when GCP_PROJECT_ID missing', () => {
      const logger = getCloudLogger();

      logger.info({
        message: 'Test without trace',
        traceId: 'trace-abc-123',
      });

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const loggedArg = mockLogger.info.mock.calls[0][0];
      const parsed = JSON.parse(loggedArg);

      expect(parsed).not.toHaveProperty('logging.googleapis.com/trace');
    });

    test('should not add trace context when traceId missing', () => {
      process.env.GCP_PROJECT_ID = 'test-project-123';

      const logger = getCloudLogger();

      logger.info({
        message: 'Test without traceId',
      });

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const loggedArg = mockLogger.info.mock.calls[0][0];
      const parsed = JSON.parse(loggedArg);

      expect(parsed).not.toHaveProperty('logging.googleapis.com/trace');
    });
  });
});
