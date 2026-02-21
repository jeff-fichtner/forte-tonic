/**
 * Trimester constants
 * Used across the application for trimester selection and validation
 */
export const Trimester = {
  FALL: 'fall',
  WINTER: 'winter',
  SPRING: 'spring',
} as const;

export type TrimesterValue = (typeof Trimester)[keyof typeof Trimester];

/**
 * Array of trimesters in chronological order
 * Fall -> Winter -> Spring -> Fall (cycles)
 */
export const TRIMESTER_SEQUENCE: TrimesterValue[] = Object.values(Trimester);

/**
 * Validate if a string is a valid trimester
 * @param value - Value to validate
 * @returns True if valid trimester
 */
export function isValidTrimester(value: string): boolean {
  return TRIMESTER_SEQUENCE.includes(value as TrimesterValue);
}
