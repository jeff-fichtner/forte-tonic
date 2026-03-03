import { PeriodType } from '/utils/values/periodType.js';
import type { Period } from '/models/shared/responses/appConfigurationResponse.js';
import { UserSession } from '../auth/session.js';

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

/**
 * Check if the current active period is the intent/reenrollment period.
 * Reads from UserSession — use in render methods for UI conditionals.
 */
export function isCurrentPeriodIntent(): boolean {
  const period = UserSession.getCurrentPeriod();
  return period?.periodType === PeriodType.INTENT;
}
