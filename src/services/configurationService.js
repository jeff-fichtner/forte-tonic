import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from config/.env (or .env in project root as fallback)
dotenv.config({ path: join(__dirname, '../../config/.env') });
dotenv.config(); // Fallback to root .env if config/.env doesn't exist

/**
 * Centralized configuration service that abstracts environment variable access
 * Classes should depend on this service rather than directly accessing process.env.
 */
export class ConfigurationService {
  /**
   *
   */
  constructor() {
    this.configOverrides = {};
    this._config = {
      // Google Sheets Authentication
      googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      spreadsheetId: process.env.WORKING_SPREADSHEET_ID,

      // Server Configuration
      port: process.env.PORT || 3000,
      nodeEnv: process.env.NODE_ENV || 'development',
      serviceUrl: process.env.SERVICE_URL,
      logLevel: process.env.LOG_LEVEL || 'info',

      // Email Configuration
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT) || 587,
      smtpSecure: process.env.SMTP_SECURE === 'true' || false,
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
      defaultFromAddress: process.env.DEFAULT_FROM_EMAIL || process.env.SMTP_USER,

      // Application Configuration
      rockBandClassIds: process.env.ROCK_BAND_CLASS_IDS
        ? process.env.ROCK_BAND_CLASS_IDS.split(',').map(id => id.trim())
        : [],

      // Maintenance Mode Configuration
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true' || false,
      maintenanceMessage:
        process.env.MAINTENANCE_MESSAGE ||
        'The Forte registration system is currently undergoing updates. We will be back shortly. Thank you for your patience!',
    };
  }

  /**
   * Get Google Sheets authentication configuration.
   */
  getGoogleSheetsAuth() {
    return {
      clientEmail: this._config.googleServiceAccountEmail,
      privateKey: this._config.googlePrivateKey,
    };
  }

  /**
   * Get Google Sheets spreadsheet configuration.
   */
  getGoogleSheetsConfig() {
    return {
      spreadsheetId: this._config.spreadsheetId,
    };
  }

  /**
   * Get server configuration.
   */
  getServerConfig() {
    return {
      port: this._config.port,
      nodeEnv: this._config.nodeEnv,
      cloudRunServiceUrl: this._config.cloudRunServiceUrl,
      logLevel: this._config.logLevel,
      isDevelopment: this._config.nodeEnv !== 'production',
      isTest: this._config.nodeEnv === 'test',
      isProduction: this._config.nodeEnv === 'production',
    };
  }

  /**
   * Get base URL based on environment.
   */
  getBaseUrl() {
    const serverConfig = this.getServerConfig();
    return serverConfig.isDevelopment
      ? `http://localhost:${serverConfig.port}`
      : serverConfig.cloudRunServiceUrl || 'https://your-cloud-run-service.run.app';
  }

  /**
   * Get email configuration.
   */
  getEmailConfig() {
    return {
      smtpHost: this._config.smtpHost,
      smtpPort: this._config.smtpPort,
      smtpSecure: this._config.smtpSecure,
      smtpUser: this._config.smtpUser,
      smtpPassword: this._config.smtpPassword,
      defaultFromAddress: this._config.defaultFromAddress,
    };
  }

  /**
   * Get application configuration.
   */
  getApplicationConfig() {
    return {
      rockBandClassIds: this._config.rockBandClassIds,
      maintenanceMode: this._config.maintenanceMode,
      maintenanceMessage: this._config.maintenanceMessage,
    };
  }

  /**
   * Check if maintenance mode is enabled.
   * @returns {boolean} True if maintenance mode is enabled
   */
  isMaintenanceModeEnabled() {
    return this._config.maintenanceMode === true;
  }

  /**
   * Get maintenance message.
   * @returns {string} Maintenance message
   */
  getMaintenanceMessage() {
    return this._config.maintenanceMessage;
  }

  /**
   * Get Rock Band class IDs for waitlist functionality.
   * @returns {string[]} Array of Rock Band class IDs
   */
  getRockBandClassIds() {
    return this._config.rockBandClassIds;
  }

  /**
   * Static method to get Rock Band class IDs for convenience
   * @returns {string[]} Array of Rock Band class IDs
   */
  static getRockBandClassIds() {
    // Return the env variable directly for static access
    return process.env.ROCK_BAND_CLASS_IDS
      ? process.env.ROCK_BAND_CLASS_IDS.split(',').map(id => id.trim())
      : [];
  }

  /**
   * Get specific configuration value by key.
   * @param {string} key - Configuration key.
   * @returns {any} Configuration value.
   */
  get(key) {
    return this._config[key];
  }

  /**
   * Check if running in development mode.
   */
  isDevelopment() {
    return this.getServerConfig().isDevelopment;
  }

  /**
   * Check if running in test mode.
   */
  isTest() {
    return this.getServerConfig().isTest;
  }

  /**
   * Check if running in production mode.
   */
  isProduction() {
    return this.getServerConfig().isProduction;
  }

  /**
   * Allow configuration overrides for testing.
   * @param {object} overrides - Configuration overrides.
   */
  setConfigOverrides(overrides) {
    this.configOverrides = overrides;
  }

  /**
   * Clear configuration overrides.
   */
  clearConfigOverrides() {
    this.configOverrides = {};
  }

  /**
   * Validate required configuration values.
   * @throws {Error} If required configuration is missing.
   */
  validate() {
    const requiredConfigs = ['googleServiceAccountEmail', 'googlePrivateKey', 'spreadsheetId'];

    const missing = requiredConfigs.filter(key => !this._config[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }

  /**
   * Get configuration for testing purposes.
   * @returns {object} Configuration object with overrides applied.
   */
  getTestConfig() {
    return {
      googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      spreadsheetId: process.env.WORKING_SPREADSHEET_ID,
      port: process.env.PORT || 3000,
      nodeEnv: process.env.NODE_ENV || 'development',
      serviceUrl: process.env.SERVICE_URL,
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT) || 587,
      smtpSecure: process.env.SMTP_SECURE === 'true' || false,
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
      defaultFromAddress: process.env.DEFAULT_FROM_EMAIL || process.env.SMTP_USER,
    };
  }
}

// Export singleton instance
export const configService = new ConfigurationService();
