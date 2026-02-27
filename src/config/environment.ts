/**
 * Environment Configuration
 * Manages different settings for staging vs production environments
 */

import { LogLevel, NodeEnv, createLogger } from '../utils/logger.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getFrontendVersionHash } from '../utils/versionHash.js';

const configDir: string = dirname(fileURLToPath(import.meta.url));
const packageJsonPath: string = join(configDir, '../../package.json');
const packageJson: { version: string } = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const environment: string = process.env.NODE_ENV || NodeEnv.DEVELOPMENT;

interface ServiceAccount {
  email: string | undefined;
  privateKey: string | undefined;
}

interface EnvironmentConfig {
  port: number | string;
  spreadsheetId: string | undefined;
  serviceAccount: ServiceAccount;
  baseUrl: string | undefined;
  logLevel: string;
}

const config: Record<string, EnvironmentConfig> = {
  [NodeEnv.DEVELOPMENT]: {
    port: 3000,
    spreadsheetId: process.env.WORKING_SPREADSHEET_ID,
    serviceAccount: {
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY,
    },
    baseUrl: 'http://localhost:3000',
    logLevel: LogLevel.DEBUG,
  },

  [NodeEnv.TEST]: {
    port: process.env.PORT || 3001,
    spreadsheetId: process.env.WORKING_SPREADSHEET_ID || 'test-spreadsheet-id',
    serviceAccount: {
      email:
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
        'test-service-account@test-project.iam.gserviceaccount.com',
      privateKey: process.env.GOOGLE_PRIVATE_KEY || 'test-private-key',
    },
    baseUrl: 'http://localhost:3001',
    logLevel: LogLevel.ERROR, // Minimal logging for tests
  },

  [NodeEnv.STAGING]: {
    port: process.env.PORT || 3000,
    spreadsheetId: process.env.WORKING_SPREADSHEET_ID,
    serviceAccount: {
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY,
    },
    baseUrl: process.env.SERVICE_URL,
    logLevel: process.env.LOG_LEVEL || LogLevel.INFO,
  },

  [NodeEnv.PRODUCTION]: {
    port: process.env.PORT || 3000,
    spreadsheetId: process.env.WORKING_SPREADSHEET_ID,
    serviceAccount: {
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY,
    },
    baseUrl: process.env.SERVICE_URL,
    logLevel: process.env.LOG_LEVEL || LogLevel.WARN,
  },
};

export const currentConfig: EnvironmentConfig = config[environment];

export const isProduction: boolean = environment === NodeEnv.PRODUCTION;
export const isStaging: boolean = environment === NodeEnv.STAGING;
export const isDevelopment: boolean = environment === NodeEnv.DEVELOPMENT;
export const isTest: boolean = environment === NodeEnv.TEST;

interface FeatureFlags {
  debugMode: boolean;
  detailedErrors: boolean;
  devTools: boolean;
}

// Environment-specific features
export const features: Record<string, FeatureFlags> = {
  development: {
    debugMode: true,
    detailedErrors: true,
    devTools: true,
  },
  test: {
    debugMode: false,
    detailedErrors: false,
    devTools: false,
  },
  staging: {
    debugMode: true,
    detailedErrors: true,
    devTools: false,
  },
  production: {
    debugMode: false,
    detailedErrors: false,
    devTools: false,
  },
};

export const currentFeatures: FeatureFlags = features[environment];

interface VersionInfo {
  number: string;
  buildDate: string;
  gitCommit: string | null;
  gitTag: string | null;
  environment: string;
  isStaging: boolean;
  displayVersion: boolean;
  frontendHash: string;
}

// Version information
export const version: VersionInfo = {
  number: getVersionNumber(),
  buildDate: getBuildDate(),
  gitCommit: process.env.BUILD_GIT_COMMIT || getLocalGitCommit(),
  gitTag: process.env.BUILD_GIT_TAG || null,
  environment,
  isStaging: environment === NodeEnv.STAGING,
  displayVersion: environment !== NodeEnv.PRODUCTION, // Show in all environments except production
  frontendHash: getFrontendVersionHash(), // Cache-busting hash for frontend assets
};

/**
 * Get version number - only use package.json version on build server
 */
function getVersionNumber(): string {
  // On CI/build server, use package.json version
  if (process.env.CI) {
    return packageJson.version;
  }

  // For local development, use a static dev version
  return '0.0.0-dev';
}

/**
 * Get build date - only use current date on build server
 */
function getBuildDate(): string {
  // On CI/build server, use current timestamp
  if (process.env.CI) {
    return new Date().toISOString();
  }

  // For local development, use a static date
  return '2025-01-01T00:00:00.000Z';
}

/**
 * Get local git commit hash for development
 */
function getLocalGitCommit(): string {
  // For local development, just return a static identifier
  // The actual git commit will be available on the build server via BUILD_GIT_COMMIT
  return 'new-dev';
}

// Only log environment info when not in test mode
if (environment !== 'test') {
  // Create a minimal logger for startup (can't use full configService here due to circular dependency)
  const logger = createLogger({ getServerConfig: () => ({ nodeEnv: environment }) });
  logger.info(`Environment: ${environment}`);
  logger.info(`Base URL: ${currentConfig.baseUrl}`);
  logger.info(`Log Level: ${currentConfig.logLevel}`);
  if (version.displayVersion) {
    logger.info(`Version: ${version.number} (${version.gitCommit?.substring(0, 7)})`);
  }
}
