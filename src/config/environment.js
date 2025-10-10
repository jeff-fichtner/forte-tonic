/**
 * Environment Configuration for Google Cloud Run Deployments
 * Manages different settings for staging vs production environments
 */

import { LogLevel, NodeEnv } from '../utils/logger.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const environment = process.env.NODE_ENV || NodeEnv.DEVELOPMENT;

const config = {
  [NodeEnv.DEVELOPMENT]: {
    port: 3000,
    spreadsheetId: process.env.WORKING_SPREADSHEET_ID,
    serviceAccount: {
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY,
    },
    operatorEmail: process.env.OPERATOR_EMAIL,
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
    operatorEmail: process.env.OPERATOR_EMAIL || 'your-operator-email@domain.com',
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
    operatorEmail: process.env.OPERATOR_EMAIL,
    baseUrl: process.env.CLOUD_RUN_SERVICE_URL || 'https://tonic-staging-staging.run.app',
    logLevel: LogLevel.INFO,
  },

  [NodeEnv.PRODUCTION]: {
    port: process.env.PORT || 3000,
    spreadsheetId: process.env.WORKING_SPREADSHEET_ID,
    serviceAccount: {
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY,
    },
    operatorEmail: process.env.OPERATOR_EMAIL,
    baseUrl: process.env.CLOUD_RUN_SERVICE_URL || 'https://tonic-production.run.app',
    logLevel: LogLevel.WARN,
  },
};

export const currentConfig = config[environment];

export const isProduction = environment === NodeEnv.PRODUCTION;
export const isStaging = environment === 'staging';
export const isDevelopment = environment === 'development';
export const isTest = environment === 'test';

// Environment-specific features
export const features = {
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

export const currentFeatures = features[environment];

// Version information
export const version = {
  number: getVersionNumber(),
  buildDate: getBuildDate(),
  gitCommit: process.env.BUILD_GIT_COMMIT || getLocalGitCommit(),
  environment,
  isStaging: environment === NodeEnv.STAGING,
  displayVersion: environment !== NodeEnv.PRODUCTION, // Show in all environments except production
};

/**
 * Get version number - only use package.json version on build server
 */
function getVersionNumber() {
  // On Cloud Build server, use package.json version
  if (process.env.CLOUD_BUILD || process.env.CI) {
    return packageJson.version;
  }

  // For local development, use a static dev version
  return '0.0.0-dev';
}

/**
 * Get build date - only use current date on build server
 */
function getBuildDate() {
  // On Cloud Build server, use current timestamp
  if (process.env.CLOUD_BUILD || process.env.CI) {
    return new Date().toISOString();
  }

  // For local development, use a static date
  return '2025-01-01T00:00:00.000Z';
}

/**
 * Get local git commit hash for development
 */
function getLocalGitCommit() {
  // For local development, just return a static identifier
  // The actual git commit will be available on the build server via BUILD_GIT_COMMIT
  return 'local-dev';
}

// Only log environment info when not in test mode
if (environment !== 'test') {
  console.log(`🌍 Environment: ${environment}`);
  console.log(`🔗 Base URL: ${currentConfig.baseUrl}`);
  console.log(`📊 Log Level: ${currentConfig.logLevel}`);
  if (version.displayVersion) {
    console.log(`🏷️  Version: ${version.number} (${version.gitCommit?.substring(0, 7)})`);
  }
}
