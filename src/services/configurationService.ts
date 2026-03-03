import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const configDir = dirname(fileURLToPath(import.meta.url));

// Load environment variables from config/.env (or .env in project root as fallback)
dotenv.config({ path: join(configDir, '../../config/.env') });
dotenv.config(); // Fallback to root .env if config/.env doesn't exist

export interface GoogleSheetsAuthConfig {
  clientEmail: string | undefined;
  privateKey: string | undefined;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string | undefined;
}

export interface ServerConfig {
  port: string | number;
  nodeEnv: string;
  serviceUrl: string | undefined;
  logLevel: string;
  isDevelopment: boolean;
  isTest: boolean;
  isProduction: boolean;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | undefined;
  smtpPassword: string | undefined;
  defaultFromAddress: string | undefined;
}

export interface ApplicationConfig {
  rockBandClassIds: string[];
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

interface InternalConfig {
  googleServiceAccountEmail: string | undefined;
  googlePrivateKey: string | undefined;
  spreadsheetId: string | undefined;
  port: string | number;
  nodeEnv: string;
  serviceUrl: string | undefined;
  logLevel: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | undefined;
  smtpPassword: string | undefined;
  defaultFromAddress: string | undefined;
  rockBandClassIds: string[];
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

/**
 * Centralized configuration service that abstracts environment variable access
 * Classes should depend on this service rather than directly accessing process.env.
 */
export class ConfigurationService {
  _config: InternalConfig;

  constructor() {
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
      smtpPort: parseInt(process.env.SMTP_PORT as string) || 587,
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
  getGoogleSheetsAuth(): GoogleSheetsAuthConfig {
    return {
      clientEmail: this._config.googleServiceAccountEmail,
      privateKey: this._config.googlePrivateKey,
    };
  }

  /**
   * Get Google Sheets spreadsheet configuration.
   */
  getGoogleSheetsConfig(): GoogleSheetsConfig {
    return {
      spreadsheetId: this._config.spreadsheetId,
    };
  }

  /**
   * Get server configuration.
   * Note: Overlapping env vars (PORT, NODE_ENV, SERVICE_URL, LOG_LEVEL, GOOGLE_SERVICE_ACCOUNT_EMAIL,
   * GOOGLE_PRIVATE_KEY, WORKING_SPREADSHEET_ID) are also read by src/config/environment.ts.
   * Both read from process.env at startup; a circular dependency (logger → configService → environment → logger)
   * prevents direct delegation. The canonical per-environment defaults live in environment.ts.
   */
  getServerConfig(): ServerConfig {
    return {
      port: this._config.port,
      nodeEnv: this._config.nodeEnv,
      serviceUrl: this._config.serviceUrl,
      logLevel: this._config.logLevel,
      isDevelopment: this._config.nodeEnv !== 'production',
      isTest: this._config.nodeEnv === 'test',
      isProduction: this._config.nodeEnv === 'production',
    };
  }

  /**
   * Get base URL based on environment.
   */
  getBaseUrl(): string | undefined {
    const serverConfig = this.getServerConfig();
    if (serverConfig.isDevelopment) {
      return `http://localhost:${serverConfig.port}`;
    }

    // In staging/production, SERVICE_URL is set by Cloud Run deployment
    if (serverConfig.serviceUrl) {
      return serverConfig.serviceUrl;
    }

    // Fallback - should never happen in properly configured deployments
    console.warn('⚠️ SERVICE_URL not set - base URL will be undefined');
    return undefined;
  }

  /**
   * Get email configuration.
   */
  getEmailConfig(): EmailConfig {
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
  getApplicationConfig(): ApplicationConfig {
    return {
      rockBandClassIds: this._config.rockBandClassIds,
      maintenanceMode: this._config.maintenanceMode,
      maintenanceMessage: this._config.maintenanceMessage,
    };
  }

  isMaintenanceModeEnabled(): boolean {
    return this._config.maintenanceMode === true;
  }

  getMaintenanceMessage(): string {
    return this._config.maintenanceMessage;
  }

  getRockBandClassIds(): string[] {
    return this._config.rockBandClassIds;
  }

  get(key: keyof InternalConfig): InternalConfig[keyof InternalConfig] {
    return this._config[key];
  }

  isDevelopment(): boolean {
    return this.getServerConfig().isDevelopment;
  }

  isTest(): boolean {
    return this.getServerConfig().isTest;
  }

  isProduction(): boolean {
    return this.getServerConfig().isProduction;
  }

  validate(): void {
    const requiredConfigs: (keyof InternalConfig)[] = [
      'googleServiceAccountEmail',
      'googlePrivateKey',
      'spreadsheetId',
    ];

    const missing = requiredConfigs.filter(key => !this._config[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }
}

// Export singleton instance
export const configService = new ConfigurationService();
