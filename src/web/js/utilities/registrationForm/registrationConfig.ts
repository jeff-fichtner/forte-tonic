/**
 * Registration Config Helper
 *
 * Reads registrationConfig from backend-served AppConfiguration and merges
 * with default fallback values. This is the single point of access for
 * business configuration that was previously hardcoded in constants.
 */

import type { RegistrationConfig } from '../../../../models/shared/responses/appConfigurationResponse.js';
import { UserSession } from '../../auth/session.js';

/** Default values matching the previously-hardcoded constants */
const DEFAULTS: RegistrationConfig = {
  busDeadlines: {
    Monday: '16:45',
    Tuesday: '16:45',
    Wednesday: '16:15',
    Thursday: '16:45',
    Friday: '16:45',
  },
  lessonLengths: [30, 45, 60],
  operationalHours: { startHour: 14, endHour: 18 },
  schedulingIntervalMinutes: 15,
  defaultInstruments: ['Piano', 'Guitar', 'Violin', 'Voice', 'Drums', 'Bass', 'Other'],
  defaultInstrument: 'Piano',
  rockBandDisplayConfig: {
    timesDescription: 'Monday 3-4 PM or Monday 4-5 PM or Friday 3-4 PM',
    defaultLengthMinutes: 60,
  },
};

/**
 * Get the registration configuration from the backend-served app config,
 * falling back to hardcoded defaults for any missing fields.
 */
export function getRegistrationConfig(): RegistrationConfig {
  const remote = (UserSession.getAppConfig?.() as Record<string, unknown> | null)
    ?.registrationConfig as Partial<RegistrationConfig> | null | undefined;

  if (!remote) return DEFAULTS;

  return {
    busDeadlines: remote.busDeadlines ?? DEFAULTS.busDeadlines,
    lessonLengths: remote.lessonLengths ?? DEFAULTS.lessonLengths,
    operationalHours: remote.operationalHours ?? DEFAULTS.operationalHours,
    schedulingIntervalMinutes:
      remote.schedulingIntervalMinutes ?? DEFAULTS.schedulingIntervalMinutes,
    defaultInstruments: remote.defaultInstruments ?? DEFAULTS.defaultInstruments,
    defaultInstrument: remote.defaultInstrument ?? DEFAULTS.defaultInstrument,
    rockBandDisplayConfig: remote.rockBandDisplayConfig ?? DEFAULTS.rockBandDisplayConfig,
  };
}
