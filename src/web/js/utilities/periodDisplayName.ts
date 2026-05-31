/**
 * Period display-name helper.
 *
 * Single source of truth for mapping a period identifier to its user-facing
 * label. All UI surfaces that display a period MUST route through this helper;
 * no UI may hardcode a period display string.
 *
 * The mapping is identity for fall/winter/spring (just capitalized) and
 * `'summer' → 'Next Fall'`. The `summer` period is internally named "summer"
 * for system simplicity but is presented to users as "Next Fall" because
 * that is what the period semantically represents (enrollment for the
 * upcoming school year).
 */

const DISPLAY_NAMES: Readonly<Record<string, string>> = Object.freeze({
  fall: 'Fall',
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Next Fall',
});

/**
 * Map a period identifier to its user-facing display label.
 *
 * @param period - The internal period identifier (must be one of
 *   `'fall' | 'winter' | 'spring' | 'summer'`)
 * @returns The display label suitable for UI rendering
 * @throws If `period` is not a recognized identifier (fail loud — an unknown
 *   period is a programming bug, not a runtime condition)
 */
export function periodDisplayName(period: string): string {
  const label = DISPLAY_NAMES[period];
  if (label === undefined) {
    throw new Error(
      `periodDisplayName: unknown period '${period}'. ` +
        `Expected one of: ${Object.keys(DISPLAY_NAMES).join(', ')}.`
    );
  }
  return label;
}
