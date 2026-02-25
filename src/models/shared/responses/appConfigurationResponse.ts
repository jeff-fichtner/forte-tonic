import { TRIMESTER_SEQUENCE } from '../../../utils/values/trimester.js';

export interface Period {
  periodType: string;
  trimester: string | null;
  targetTrimester?: string;
  startDate: Date | string | null;
  isCurrentPeriod?: boolean;
}

/** Business configuration for registration forms, served from backend */
export interface RegistrationConfig {
  busDeadlines: Record<string, string>;
  lessonLengths: number[];
  operationalHours: { startHour: number; endHour: number };
  schedulingIntervalMinutes: number;
  defaultInstruments: string[];
  defaultInstrument: string;
  rockBandDisplayConfig: { timesDescription: string; defaultLengthMinutes: number };
}

export interface AppConfigurationResponseData {
  currentPeriod?: Period | null;
  nextPeriod?: Period | null;
  rockBandClassIds?: string[];
  currentTrimester?: string | null;
  nextTrimester?: string | null;
  availableTrimesters?: string[];
  defaultTrimester?: string | null;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  registrationConfig?: RegistrationConfig | null;
}

/**
 * AppConfigurationResponse model - represents application configuration data
 * Returned by /api/getAppConfiguration endpoint
 */
export class AppConfigurationResponse {
  currentPeriod: Period | null;
  nextPeriod: Period | null;
  rockBandClassIds: string[];
  currentTrimester: string | null;
  nextTrimester: string | null;
  availableTrimesters: string[];
  defaultTrimester: string | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  registrationConfig: RegistrationConfig | null;

  constructor(data: AppConfigurationResponseData | null) {
    if (typeof data === 'object' && data !== null) {
      const {
        currentPeriod,
        nextPeriod,
        rockBandClassIds,
        currentTrimester,
        nextTrimester,
        availableTrimesters,
        defaultTrimester,
        maintenanceMode,
        maintenanceMessage,
        registrationConfig,
      } = data;

      this.currentPeriod = currentPeriod || null;
      this.nextPeriod = nextPeriod || null;
      this.rockBandClassIds = Array.isArray(rockBandClassIds) ? rockBandClassIds : [];
      this.currentTrimester = currentTrimester || null;
      this.nextTrimester = nextTrimester || null;
      this.availableTrimesters = Array.isArray(availableTrimesters)
        ? availableTrimesters
        : TRIMESTER_SEQUENCE;
      this.defaultTrimester = defaultTrimester || null;
      this.maintenanceMode = maintenanceMode || false;
      this.maintenanceMessage = maintenanceMessage || null;
      this.registrationConfig = registrationConfig || null;
    } else {
      this.currentPeriod = null;
      this.nextPeriod = null;
      this.rockBandClassIds = [];
      this.currentTrimester = null;
      this.nextTrimester = null;
      this.availableTrimesters = TRIMESTER_SEQUENCE;
      this.defaultTrimester = null;
      this.maintenanceMode = false;
      this.maintenanceMessage = null;
      this.registrationConfig = null;
    }
  }

  toJSON(): AppConfigurationResponseData {
    return {
      currentPeriod: this.currentPeriod,
      nextPeriod: this.nextPeriod,
      rockBandClassIds: this.rockBandClassIds,
      currentTrimester: this.currentTrimester,
      nextTrimester: this.nextTrimester,
      availableTrimesters: this.availableTrimesters,
      defaultTrimester: this.defaultTrimester,
      maintenanceMode: this.maintenanceMode,
      maintenanceMessage: this.maintenanceMessage,
      registrationConfig: this.registrationConfig,
    };
  }

  static empty(): AppConfigurationResponse {
    return new AppConfigurationResponse({
      currentPeriod: null,
      nextPeriod: null,
      rockBandClassIds: [],
      currentTrimester: null,
      nextTrimester: null,
      availableTrimesters: TRIMESTER_SEQUENCE,
      defaultTrimester: null,
      maintenanceMode: false,
      maintenanceMessage: null,
      registrationConfig: null,
    });
  }
}
