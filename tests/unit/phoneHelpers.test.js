/**
 * Tests for phone number formatting utilities
 */
import { formatPhone, isValidUnformattedPhone, stripPhoneFormatting } from '../../src/web/js/utilities/phoneHelpers.js';

describe('Phone Number Formatting Utilities', () => {
  describe('formatPhone', () => {
    test('should format 10-digit unformatted phone numbers correctly', () => {
      expect(formatPhone('4159451122')).toBe('(415) 945-1122');
      expect(formatPhone('6505551234')).toBe('(650) 555-1234');
    });

    test('should handle already formatted numbers', () => {
      expect(formatPhone('(415) 945-1122')).toBe('(415) 945-1122');
      expect(formatPhone('415-945-1122')).toBe('(415) 945-1122');
      expect(formatPhone('415.945.1122')).toBe('(415) 945-1122');
      expect(formatPhone('415 945 1122')).toBe('(415) 945-1122');
    });

    test('should return original string for invalid lengths', () => {
      expect(formatPhone('415945112')).toBe('415945112'); // 9 digits
      expect(formatPhone('41594511222')).toBe('41594511222'); // 11 digits
      expect(formatPhone('+1 415 945 1122')).toBe('+1 415 945 1122'); // 11+ digits with country code
    });

    test('should handle empty or null inputs', () => {
      expect(formatPhone('')).toBe('');
      expect(formatPhone(null)).toBe('');
      expect(formatPhone(undefined)).toBe('');
    });
  });

  describe('isValidUnformattedPhone', () => {
    test('should validate 10-digit numbers', () => {
      expect(isValidUnformattedPhone('4159451122')).toBe(true);
      expect(isValidUnformattedPhone('(415) 945-1122')).toBe(true); // strips formatting first
    });

    test('should reject invalid lengths', () => {
      expect(isValidUnformattedPhone('415945112')).toBe(false); // 9 digits
      expect(isValidUnformattedPhone('41594511222')).toBe(false); // 11 digits
    });

    test('should reject non-numeric or empty inputs', () => {
      expect(isValidUnformattedPhone('')).toBe(false);
      expect(isValidUnformattedPhone('abc1234567')).toBe(false);
      expect(isValidUnformattedPhone(null)).toBe(false);
      expect(isValidUnformattedPhone(undefined)).toBe(false);
    });
  });

  describe('stripPhoneFormatting', () => {
    test('should remove all formatting characters', () => {
      expect(stripPhoneFormatting('(415) 945-1122')).toBe('4159451122');
      expect(stripPhoneFormatting('415-945-1122')).toBe('4159451122');
      expect(stripPhoneFormatting('415.945.1122')).toBe('4159451122');
      expect(stripPhoneFormatting('+1 (415) 945-1122')).toBe('14159451122');
    });

    test('should handle empty inputs', () => {
      expect(stripPhoneFormatting('')).toBe('');
      expect(stripPhoneFormatting(null)).toBe('');
      expect(stripPhoneFormatting(undefined)).toBe('');
    });
  });

  describe('Directory Table Integration', () => {
    test('should format phone numbers for directory display', () => {
      const employees = [
        { name: 'John Smith', phone: '4159451122' },
        { name: 'Jane Doe', phone: '6505551234' },
        { name: 'Bob Johnson', phone: '(650) 555-5678' },
        { name: 'Alice Brown', phone: '415-945-9999' },
        { name: 'No Phone Person', phone: '' }
      ];

      employees.forEach(employee => {
        const formattedPhone = employee.phone ? formatPhone(employee.phone) : '';
        if (employee.phone) {
          // Should be properly formatted if valid
          if (isValidUnformattedPhone(employee.phone)) {
            expect(formattedPhone).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
          }
        } else {
          expect(formattedPhone).toBe('');
        }
      });
    });
  });
});
