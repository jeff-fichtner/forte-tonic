import { jest } from '@jest/globals';
import { Authenticator } from '../../src/services/authenticator.js';

describe('Authenticator', () => {
  describe('getSignedInUser', () => {
    test('should return user email when user exists', () => {
      const mockReq = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      const result = Authenticator.getSignedInUser(mockReq);
      expect(result).toBe('test@example.com');
    });

    test('should return null when request is null', () => {
      const result = Authenticator.getSignedInUser(null);
      expect(result).toBeNull();
    });

    test('should return null when request is undefined', () => {
      const result = Authenticator.getSignedInUser(undefined);
      expect(result).toBeNull();
    });

    test('should return null when user is not in request', () => {
      const mockReq = {};
      const result = Authenticator.getSignedInUser(mockReq);
      expect(result).toBeNull();
    });

    test('should return null when user is null', () => {
      const mockReq = { user: null };
      const result = Authenticator.getSignedInUser(mockReq);
      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    test('should return true when user is authenticated', () => {
      const mockReq = {
        isAuthenticated: jest.fn().mockReturnValue(true),
      };

      const result = Authenticator.isAuthenticated(mockReq);
      expect(result).toBe(true);
      expect(mockReq.isAuthenticated).toHaveBeenCalled();
    });

    test('should return false when user is not authenticated', () => {
      const mockReq = {
        isAuthenticated: jest.fn().mockReturnValue(false),
      };

      const result = Authenticator.isAuthenticated(mockReq);
      expect(result).toBe(false);
    });

    test('should return false when request is null', () => {
      const result = Authenticator.isAuthenticated(null);
      expect(result).toBe(false);
    });

    test('should return false when request is undefined', () => {
      const result = Authenticator.isAuthenticated(undefined);
      expect(result).toBe(false);
    });

    test('should return false when isAuthenticated method does not exist', () => {
      const mockReq = {};
      const result = Authenticator.isAuthenticated(mockReq);
      expect(result).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    test('should return access token when user exists', () => {
      const mockReq = {
        user: {
          email: 'test@example.com',
          accessToken: 'mock-access-token',
        },
      };

      const result = Authenticator.getAccessToken(mockReq);
      expect(result).toBe('mock-access-token');
    });

    test('should return null when request is null', () => {
      const result = Authenticator.getAccessToken(null);
      expect(result).toBeNull();
    });

    test('should return null when request is undefined', () => {
      const result = Authenticator.getAccessToken(undefined);
      expect(result).toBeNull();
    });

    test('should return null when user is not in request', () => {
      const mockReq = {};
      const result = Authenticator.getAccessToken(mockReq);
      expect(result).toBeNull();
    });

    test('should return null when user is null', () => {
      const mockReq = { user: null };
      const result = Authenticator.getAccessToken(mockReq);
      expect(result).toBeNull();
    });

    test('should handle user with undefined accessToken', () => {
      const mockReq = {
        user: {
          email: 'test@example.com',
          // accessToken is undefined
        },
      };

      const result = Authenticator.getAccessToken(mockReq);
      expect(result).toBeUndefined();
    });
  });
});
