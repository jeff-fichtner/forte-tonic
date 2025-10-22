/**
 * AppConfigurationResponse model - represents application configuration data
 * Returned by /api/getAppConfiguration endpoint
 */
export class AppConfigurationResponse {
  /**
   * Creates an AppConfigurationResponse instance
   * @param {object} data - Object with currentPeriod and rockBandClassIds properties
   */
  constructor(data) {
    if (typeof data === 'object' && data !== null) {
      const { currentPeriod, rockBandClassIds } = data;

      this.currentPeriod = currentPeriod || null;
      this.rockBandClassIds = Array.isArray(rockBandClassIds) ? rockBandClassIds : [];
    } else {
      this.currentPeriod = null;
      this.rockBandClassIds = [];
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
   * Serializes the app configuration for API responses
   * @returns {object} Serialized configuration data
   */
  toJSON() {
    return {
      currentPeriod: this.currentPeriod,
      rockBandClassIds: this.rockBandClassIds,
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
    return new AppConfigurationResponse({ currentPeriod: null, rockBandClassIds: [] });
  }
}

// Make AppConfigurationResponse available globally for frontend usage
if (typeof window !== 'undefined') {
  window.AppConfigurationResponse = AppConfigurationResponse;
}
