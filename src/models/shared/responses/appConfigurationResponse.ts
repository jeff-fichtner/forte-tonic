import { TRIMESTER_SEQUENCE } from '../../../utils/values/trimester.js';

export interface Period {
  periodType: string;
  trimester: string;
  targetTrimester: string;
  startDate: string;
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
    });
  }
}

// Make AppConfigurationResponse available globally for frontend usage
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).AppConfigurationResponse = AppConfigurationResponse; // SC-005: browser global not in Window type declaration
}
