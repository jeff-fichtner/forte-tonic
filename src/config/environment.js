/**
 * Environment Configuration for Render Deployments
 * Manages different settings for staging vs production environments
 */

import { LogLevel, NodeEnv } from '../core/utilities/logger.js';

const environment = process.env.NODE_ENV || NodeEnv.DEVELOPMENT;

const config = {
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
    baseUrl: process.env.RENDER_EXTERNAL_URL || 'https://tonic-staging.onrender.com',
    logLevel: LogLevel.INFO,
  },

  [NodeEnv.PRODUCTION]: {
    port: process.env.PORT || 3000,
    spreadsheetId: process.env.WORKING_SPREADSHEET_ID,
    serviceAccount: {
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY,
    },
    baseUrl: process.env.RENDER_EXTERNAL_URL || 'https://tonic.yourschool.edu',
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

// Only log environment info when not in test mode
if (environment !== 'test') {
  console.log(`🌍 Environment: ${environment}`);
  console.log(`🔗 Base URL: ${currentConfig.baseUrl}`);
  console.log(`📊 Log Level: ${currentConfig.logLevel}`);
}
