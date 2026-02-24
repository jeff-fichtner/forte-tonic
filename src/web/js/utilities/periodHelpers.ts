import { PeriodType } from '/utils/values/periodType.js';
import type { Period } from '/models/shared/responses/appConfigurationResponse.js';

/**
 * Check if the current period is an enrollment period
 * Enrollment periods include Priority Enrollment and Open Enrollment
 * @param {object} period - Period object with periodType property
 * @returns {boolean} True if current period is an enrollment period
 */
export function isEnrollmentPeriod(period: Period | null | undefined): boolean {
  if (!period) return false;

  return (
    period.periodType === PeriodType.PRIORITY_ENROLLMENT ||
    period.periodType === PeriodType.OPEN_ENROLLMENT
  );
}
