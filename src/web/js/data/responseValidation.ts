import type { HttpResult } from './httpService.js';

/**
 * Validate that all required fields are present and truthy on a successful HTTP response.
 * Collapses the repeated "if (!result.data.X || !result.data.Y)" pattern into a single call.
 *
 * Returns the original result if all fields are present, or an error result listing missing fields.
 */
export function validateResponseFields<T extends object>(
  result: HttpResult<T>,
  requiredFields: (keyof T & string)[]
): HttpResult<T> {
  if (!result.ok) return result;

  const missing = requiredFields.filter(field => !result.data[field]);
  if (missing.length > 0) {
    return { ok: false, error: { message: `Invalid response: missing ${missing.join(', ')}` } };
  }

  return result;
}
