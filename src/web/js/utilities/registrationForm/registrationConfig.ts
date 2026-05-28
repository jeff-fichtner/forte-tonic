/**
 * Registration Config Helper
 *
 * Reads registrationConfig from backend-served AppConfiguration and merges
 * with default fallback values. This is the single point of access for
 * business configuration that was previously hardcoded in constants.
 */

import type { RegistrationConfig } from '/models/shared/responses/appConfigurationResponse.js';
import { DEFAULT_REGISTRATION_CONFIG } from '/models/shared/responses/appConfigurationResponse.js';
import { UserSession } from '../../auth/session.js';

const DEFAULTS: RegistrationConfig = DEFAULT_REGISTRATION_CONFIG;

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
