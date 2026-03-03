import { jest } from '@jest/globals';

/**
 * Tests for HttpService — typed HTTP client returning HttpResult<T>.
 * All methods return { ok: true, data } | { ok: false, error } — callers never need try/catch.
 */
describe('HttpService', () => {
  let HttpService;
  let originalFetch;

  beforeEach(async () => {
    // Mock global fetch
    originalFetch = global.fetch;
    global.fetch = jest.fn();

    // Mock window.AccessCodeManager
    global.window = {
      AccessCodeManager: {
        getStoredAuthData: jest.fn(() => null),
      },
    };

    // Dynamically import HttpService (to ensure fresh instance for each test)
    const module = await import('../../../src/web/js/data/httpService.js');
    HttpService = module.HttpService;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('Response Envelope Unwrapping', () => {
    test('should unwrap standardized success response and return data in HttpResult', async () => {
      const mockData = { id: '123', name: 'Test User' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true, data: mockData }),
      });

      const result = await HttpService.get('testEndpoint');

      expect(result).toEqual({ ok: true, data: mockData });
    });

    test('should pass through legacy raw data response in HttpResult', async () => {
      const mockData = { id: '456', name: 'Legacy User' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockData),
      });

      const result = await HttpService.get('legacyEndpoint');

      expect(result).toEqual({ ok: true, data: mockData });
    });

    test('should unwrap standardized response with array data', async () => {
      const mockData = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true, data: mockData }),
      });

      const result = await HttpService.get('arrayEndpoint');

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    test('should pass through legacy array response', async () => {
      const mockData = [
        { id: '3', name: 'User 3' },
        { id: '4', name: 'User 4' },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockData),
      });

      const result = await HttpService.get('legacyArrayEndpoint');

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    test('should handle null JSON response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(null),
      });

      const result = await HttpService.get('nullEndpoint');

      expect(result).toEqual({ ok: true, data: null });
    });

    test('should unwrap standardized response with null data field', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true, data: null }),
      });

      const result = await HttpService.get('nullDataEndpoint');

      expect(result).toEqual({ ok: true, data: null });
    });

    test('should NOT unwrap response without success field', async () => {
      const mockData = { data: { id: '999' }, other: 'field' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockData),
      });

      const result = await HttpService.get('noSuccessFieldEndpoint');

      // Without 'success' field, the object is returned as-is (not unwrapped)
      expect(result).toEqual({ ok: true, data: mockData });
    });

    test('should NOT unwrap response without data field', async () => {
      const mockData = { success: true, message: 'Operation completed' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockData),
      });

      const result = await HttpService.get('noDataFieldEndpoint');

      // Without 'data' field, the object is returned as-is (not unwrapped)
      expect(result).toEqual({ ok: true, data: mockData });
    });

    test('should unwrap standardized response with extra message field', async () => {
      const mockData = { id: '111', status: 'active' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            success: true,
            data: mockData,
            message: 'Operation successful',
          }),
      });

      const result = await HttpService.get('messageEndpoint');

      // Unwraps to just the data — message is discarded
      expect(result).toEqual({ ok: true, data: mockData });
    });
  });

  describe('POST Method', () => {
    test('should unwrap standardized POST response', async () => {
      const mockRegistration = {
        id: 'reg-123',
        studentId: 'stu-456',
        classId: 'cls-789',
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            success: true,
            data: mockRegistration,
          }),
      });

      const result = await HttpService.post('registrations', {
        studentId: 'stu-456',
        classId: 'cls-789',
      });

      expect(result).toEqual({ ok: true, data: mockRegistration });
    });

    test('should pass through legacy GET response', async () => {
      const mockClasses = [
        { id: 'cls-1', name: 'Class 1' },
        { id: 'cls-2', name: 'Class 2' },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockClasses),
      });

      const result = await HttpService.get('getClasses');

      expect(result).toEqual({ ok: true, data: mockClasses });
    });
  });

  describe('Error Handling', () => {
    test('should return HttpResult error for failed responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const result = await HttpService.get('failingEndpoint');

      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('HTTP 500');
      expect(result.error.status).toBe(500);
    });

    test('should return HttpResult error for empty successful response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      const result = await HttpService.get('emptyEndpoint');

      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('Successful but empty response');
    });

    test('should return HttpResult error for invalid JSON', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'not valid json{',
      });

      const result = await HttpService.get('invalidJsonEndpoint');

      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('Error parsing');
    });

    test('should parse structured error response from server', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            success: false,
            error: {
              message: 'Validation failed',
              type: 'VALIDATION_ERROR',
              code: 'INVALID_INPUT',
            },
          }),
      });

      const result = await HttpService.get('validationEndpoint');

      expect(result.ok).toBe(false);
      expect(result.error.message).toBe('Validation failed');
      expect(result.error.type).toBe('VALIDATION_ERROR');
      expect(result.error.code).toBe('INVALID_INPUT');
      expect(result.error.status).toBe(400);
    });
  });
});
