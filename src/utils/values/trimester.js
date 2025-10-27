/**
 * Trimester constants
 * Used across the application for trimester selection and validation
 */
export const Trimester = {
  FALL: 'fall',
  WINTER: 'winter',
  SPRING: 'spring',
};

/**
 * Array of trimesters in chronological order
 * Fall → Winter → Spring → Fall (cycles)
 */
export const TRIMESTER_SEQUENCE = Object.values(Trimester);

/**
 * Validate if a string is a valid trimester
 * @param {string} value - Value to validate
 * @returns {boolean} True if valid trimester
 */
export function isValidTrimester(value) {
  return TRIMESTER_SEQUENCE.includes(value);
}
