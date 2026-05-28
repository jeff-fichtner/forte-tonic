/**
 * Case-insensitive enum-value normalization for sheet-derived data.
 *
 * Admins enter values into the spreadsheet by hand. To stay tolerant of
 * accidental casing (`Fall`, `PriorityEnrollment`, `SUMMER`) while keeping
 * the rest of the codebase strict about canonical-cased identifiers, we
 * normalize at the database-mapping layer.
 *
 * Unknown values throw (fail-loud) so a typo in the spreadsheet surfaces
 * at app startup rather than as silent misbehavior much later.
 */

/**
 * Match `raw` case-insensitively against a list of canonical enum values
 * and return the canonical-cased value.
 *
 * @param raw         Raw value from the spreadsheet (may have any casing)
 * @param validValues The canonical-cased values that are accepted
 * @param fieldName   Optional field name for the error message (e.g.,
 *                    "periodType") to aid debugging
 * @returns The canonical-cased value matching `raw`
 * @throws  Error if `raw` does not match any canonical value (after
 *          case-insensitive comparison)
 *
 * Returns `null` only when `raw` is null/undefined/empty — empty cells in
 * the spreadsheet are not invalid values, they're missing values, and the
 * caller decides how to handle them.
 *
 * @example
 *   normalizeEnumValue('FALL', ['fall', 'winter', 'spring', 'summer'])
 *     // → 'fall'
 *   normalizeEnumValue('PriorityEnrollment', Object.values(PeriodType))
 *     // → 'priorityEnrollment'
 *   normalizeEnumValue('typo', ['fall', 'winter'])
 *     // → throws Error
 */
export function normalizeEnumValue(
  raw: string | null | undefined,
  validValues: readonly string[],
  fieldName = 'enum value'
): string | null {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }

  const rawLower = raw.toLowerCase();
  const match = validValues.find(v => v.toLowerCase() === rawLower);

  if (match === undefined) {
    throw new Error(
      `Invalid ${fieldName}: '${raw}'. ` +
        `Expected one of (case-insensitive): ${validValues.join(', ')}.`
    );
  }

  return match;
}
