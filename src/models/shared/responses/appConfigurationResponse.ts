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

/** Single source of truth for registration configuration defaults */
export const DEFAULT_REGISTRATION_CONFIG: RegistrationConfig = {
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

export interface DirectorInfo {
  fullName: string;
  email: string;
  displayEmail: string | null;
  phone: string | null;
  displayPhone: string | null;
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
  director?: DirectorInfo | null;
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
  director: DirectorInfo | null;

  constructor(data: AppConfigurationResponseData = {}) {
    this.currentPeriod = data.currentPeriod || null;
    this.nextPeriod = data.nextPeriod || null;
    this.rockBandClassIds = Array.isArray(data.rockBandClassIds) ? data.rockBandClassIds : [];
    this.currentTrimester = data.currentTrimester || null;
    this.nextTrimester = data.nextTrimester || null;
    this.availableTrimesters = Array.isArray(data.availableTrimesters)
      ? data.availableTrimesters
      : TRIMESTER_SEQUENCE;
    this.defaultTrimester = data.defaultTrimester || null;
    this.maintenanceMode = data.maintenanceMode || false;
    this.maintenanceMessage = data.maintenanceMessage || null;
    this.registrationConfig = data.registrationConfig || null;
    this.director = data.director || null;
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
      director: this.director,
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
      director: null,
    });
  }
}
