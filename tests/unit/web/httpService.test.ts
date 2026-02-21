import { jest } from '@jest/globals';

/**
 * Tests for HttpService response unwrapping compatibility layer
 * This ensures backward compatibility when migrating to standardized response format
 */
describe('HttpService Response Compatibility', () => {
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

  describe('Response Format Unwrapping', () => {
    test('should handle standardized success response format', async () => {
      // Mock a standardized response: { success: true, data: {...} }
      const mockData = { id: '123', name: 'Test User' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true, data: mockData }),
      });

      const result = await HttpService.fetch('testEndpoint');

      // Should auto-unwrap and return just the data
      expect(result).toEqual(mockData);
      expect(result).not.toHaveProperty('success');
      expect(result).not.toHaveProperty('data');
    });

    test('should handle legacy raw data response format', async () => {
      // Mock a legacy response: {...} (raw data, no wrapper)
      const mockData = { id: '456', name: 'Legacy User' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockData),
      });

      const result = await HttpService.fetch('legacyEndpoint');

      // Should return data as-is
      expect(result).toEqual(mockData);
    });

    test('should handle standardized response with array data', async () => {
      // Mock array data in standardized format
      const mockData = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true, data: mockData }),
      });

      const result = await HttpService.fetch('arrayEndpoint');

      // Should unwrap and return array
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockData);
    });

    test('should handle legacy array response format', async () => {
      // Mock legacy array response
      const mockData = [
        { id: '3', name: 'User 3' },
        { id: '4', name: 'User 4' },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockData),
      });

      const result = await HttpService.fetch('legacyArrayEndpoint');

      // Should return array as-is
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockData);
    });

    test('should apply mapper to unwrapped data', async () => {
      // Mock standardized response
      const mockData = { id: '789', value: 10 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true, data: mockData }),
      });

      const mapper = data => ({ ...data, value: data.value * 2 });
      const result = await HttpService.fetch('mappedEndpoint', mapper);

      // Mapper should be applied to unwrapped data
      expect(result).toEqual({ id: '789', value: 20 });
    });

    test('should handle null data in standardized format', async () => {
      // Mock null response (used by authenticateByAccessCode)
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(null),
      });

      const result = await HttpService.fetch('nullEndpoint');

      // Should return null as-is (not unwrapped)
      expect(result).toBeNull();
    });

    test('should handle standardized response with null data field', async () => {
      // Mock standardized response with null data
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true, data: null }),
      });

      const result = await HttpService.fetch('nullDataEndpoint');

      // Should unwrap and return null
      expect(result).toBeNull();
    });

    test('should NOT unwrap response without success field', async () => {
      // Mock response with 'data' but no 'success' field
      const mockData = { data: { id: '999' }, other: 'field' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockData),
      });

      const result = await HttpService.fetch('noSuccessFieldEndpoint');

      // Should return as-is (not unwrapped)
      expect(result).toEqual(mockData);
    });

    test('should NOT unwrap response without data field', async () => {
      // Mock response with 'success' but no 'data' field
      const mockData = { success: true, message: 'Operation completed' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockData),
      });

      const result = await HttpService.fetch('noDataFieldEndpoint');

      // Should return as-is (not unwrapped)
      expect(result).toEqual(mockData);
    });

    test('should handle standardized response with message field', async () => {
      // Mock standardized response with optional message
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

      const result = await HttpService.fetch('messageEndpoint');

      // Should unwrap data, message is ignored by frontend
      expect(result).toEqual(mockData);
      expect(result).not.toHaveProperty('message');
    });
  });

  describe('Backward Compatibility Verification', () => {
    test('should maintain compatibility with existing POST /api/registrations', async () => {
      // This endpoint already uses standardized format
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

      // Should unwrap and return just the registration data
      expect(result).toEqual(mockRegistration);
    });

    test('should maintain compatibility with legacy endpoints', async () => {
      // Most existing endpoints return raw data
      const mockClasses = [
        { id: 'cls-1', name: 'Class 1' },
        { id: 'cls-2', name: 'Class 2' },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockClasses),
      });

      const result = await HttpService.fetch('getClasses');

      // Should return raw data as-is
      expect(result).toEqual(mockClasses);
    });
  });

  describe('Error Handling', () => {
    test('should throw error for failed responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(HttpService.fetch('failingEndpoint')).rejects.toThrow('HTTP 500');
    });

    test('should throw error for empty successful response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      await expect(HttpService.fetch('emptyEndpoint')).rejects.toThrow(
        'Successful but empty response'
      );
    });

    test('should throw error for invalid JSON', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'not valid json{',
      });

      await expect(HttpService.fetch('invalidJsonEndpoint')).rejects.toThrow('Error parsing');
    });
  });
});
