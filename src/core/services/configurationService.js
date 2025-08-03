import dotenv from 'dotenv';

// Load environment variables once
dotenv.config();

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
      renderExternalHostname: process.env.RENDER_EXTERNAL_HOSTNAME,

      // Email Configuration
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT) || 587,
      smtpSecure: process.env.SMTP_SECURE === 'true' || false,
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
      defaultFromAddress: process.env.DEFAULT_FROM_EMAIL || process.env.SMTP_USER,
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
      renderExternalHostname: this._config.renderExternalHostname,
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
      : `https://${serverConfig.renderExternalHostname || 'your-render-app-name.onrender.com'}`;
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
    const requiredConfigs = [
      'googleServiceAccountEmail',
      'googlePrivateKey',
      'spreadsheetId',
    ];

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
      renderExternalHostname: process.env.RENDER_EXTERNAL_HOSTNAME,
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
