/**
 * Browser-compatible UUID utility
 * Provides UUID generation and validation without external dependencies
 */

/**
 * Generate a UUID v4 compatible string
 * @returns {string} UUID string
 */
export function uuidv4() {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validate a UUID string
 * @param {string} uuid - UUID string to validate
 * @returns {boolean} True if valid UUID format
 */
export function validate(uuid) {
  if (typeof uuid !== 'string') return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Provide named exports that match the uuid package API
export { uuidv4 as v4, validate as uuidValidate };
