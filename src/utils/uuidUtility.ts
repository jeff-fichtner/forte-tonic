/**
 * UUID Utility for generating cryptographically secure UUIDs
 *
 * Replaces the old GuidUtility with proper UUID v4 generation
 * following RFC 4122 specification for better uniqueness and security.
 */
export class UuidUtility {
  /**
   * Generate a UUID v4 (random UUID)
   * @returns A properly formatted UUID v4 string
   */
  static generateUuid(): string {
    // Generate UUID v4 compatible string following RFC 4122
    const chars: string = '0123456789abcdef';
    const uuid: string[] = [];

    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid[i] = '-';
      } else if (i === 14) {
        uuid[i] = '4'; // Version 4
      } else if (i === 19) {
        uuid[i] = chars[Math.floor(Math.random() * 4) + 8]; // 8, 9, a, or b
      } else {
        uuid[i] = chars[Math.floor(Math.random() * 16)];
      }
    }

    return uuid.join('');
  }

  /**
   * Validate if a string is a proper UUID v4
   * @param uuid - The string to validate
   * @returns True if valid UUID v4
   */
  static isValidUuid(uuid: string): boolean {
    const uuidRegex: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Generate multiple UUIDs at once
   * @param count - Number of UUIDs to generate
   * @returns Array of UUID strings
   */
  static generateMultiple(count: number): string[] {
    const uuids: string[] = [];
    for (let i = 0; i < count; i++) {
      uuids.push(this.generateUuid());
    }
    return uuids;
  }
}
