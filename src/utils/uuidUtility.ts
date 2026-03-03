/**
 * UUID Utility for generating cryptographically secure UUIDs
 * Uses globalThis.crypto.randomUUID() which works in both Node.js (≥19) and browsers.
 */

export class UuidUtility {
  /**
   * Generate a UUID v4 (random UUID)
   * @returns A properly formatted UUID v4 string
   */
  static generateUuid(): string {
    return globalThis.crypto.randomUUID();
  }

  /**
   * Validate if a string is a proper UUID v4
   * @param uuid - The string to validate
   * @returns True if valid UUID v4
   */
  static isValidUuid(uuid: string): boolean {
    const uuidRegex: RegExp =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
