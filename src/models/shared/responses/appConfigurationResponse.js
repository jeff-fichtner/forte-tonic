import { TRIMESTER_SEQUENCE } from '../../../utils/values/trimester.js';

/**
 * AppConfigurationResponse model - represents application configuration data
 * Returned by /api/getAppConfiguration endpoint
 */
export class AppConfigurationResponse {
  /**
   * Creates an AppConfigurationResponse instance
   * @param {object} data - Object with currentPeriod, nextPeriod, rockBandClassIds, and trimester properties
   */
  constructor(data) {
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

  /**
   * Checks if there is a current period configured
   * @returns {boolean} True if current period exists
   */
  hasCurrentPeriod() {
    return !!this.currentPeriod;
  }

  /**
   * Gets the current period type (e.g., 'intent', 'priorityEnrollment')
   * @returns {string|null} Period type or null
   */
  getPeriodType() {
    return this.currentPeriod?.periodType || null;
  }

  /**
   * Gets the current trimester (e.g., 'Fall', 'Spring')
   * @returns {string|null} Trimester or null
   */
  getTrimester() {
    return this.currentPeriod?.trimester || null;
  }

  /**
   * Checks if maintenance mode is enabled
   * @returns {boolean} True if maintenance mode is enabled
   */
  isMaintenanceModeEnabled() {
    return this.maintenanceMode === true;
  }

  /**
   * Serializes the app configuration for API responses
   * @returns {object} Serialized configuration data
   */
  toJSON() {
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

  /**
   * Creates an AppConfigurationResponse from API data
   * @param {object} data - API response data
   * @returns {AppConfigurationResponse} New instance
   */
  static fromApiData(data) {
    return new AppConfigurationResponse(data);
  }

  /**
   * Creates an empty configuration response
   * @returns {AppConfigurationResponse} Empty instance
   */
  static empty() {
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
  window.AppConfigurationResponse = AppConfigurationResponse;
}
