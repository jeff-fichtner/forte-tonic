/**
 * UuidUtility Unit Tests
 * ==============================
 *
 * Tests for UUID generation and validation:
 * - generateUuid: produces valid UUIDv4 strings
 * - isValidUuid: validates UUIDv4 format
 */

import { UuidUtility } from '../../../src/utils/uuidUtility.js';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('UuidUtility', () => {
  describe('generateUuid()', () => {
    test('should return a string matching the UUIDv4 format', () => {
      const uuid = UuidUtility.generateUuid();
      expect(uuid).toMatch(UUID_V4_REGEX);
    });

    test('should return different values on subsequent calls', () => {
      const uuid1 = UuidUtility.generateUuid();
      const uuid2 = UuidUtility.generateUuid();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('isValidUuid()', () => {
    test('should return true for a valid UUIDv4', () => {
      const validUuid = UuidUtility.generateUuid();
      expect(UuidUtility.isValidUuid(validUuid)).toBe(true);
    });

    test('should return false for an invalid string', () => {
      expect(UuidUtility.isValidUuid('not-a-uuid')).toBe(false);
    });

    test('should return false for an empty string', () => {
      expect(UuidUtility.isValidUuid('')).toBe(false);
    });
  });
});
