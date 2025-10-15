/**
 * Centralized logging utility for the entire application
 * Provides conditional logging based on environment configuration
 */

import { configService as defaultConfigService } from '../services/configurationService.js';

/**
 * Log levels enum - ordered by severity
 */
export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

/**
 * Node environment enum
 */
export const NodeEnv = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
  TEST: 'test',
};

/**
 * Logger class that provides conditional logging based on environment configuration
 */
export class Logger {
  constructor(configService) {
    this.configService = configService;
    this.logLevelPriority = {
      [LogLevel.ERROR]: 0,
      [LogLevel.WARN]: 1,
      [LogLevel.INFO]: 2,
      [LogLevel.DEBUG]: 3,
    };
  }

  /**
   * Check if a log level should be output based on current configuration
   */
  shouldLog(level) {
    const serverConfig = this.configService.getServerConfig();
    const currentLogLevel = serverConfig.logLevel || LogLevel.INFO;
    const currentEnv = serverConfig.nodeEnv || NodeEnv.PRODUCTION;

    // Always log in development mode
    if (currentEnv === NodeEnv.DEVELOPMENT) {
      return true;
    }

    // In test mode, only log errors and warnings to keep output clean
    if (currentEnv === NodeEnv.TEST) {
      return level === LogLevel.ERROR || level === LogLevel.WARN;
    }

    // For other environments, respect the configured log level
    const requestedPriority = this.logLevelPriority[level];
    const configuredPriority = this.logLevelPriority[currentLogLevel];

    return requestedPriority <= configuredPriority;
  }

  /**
   * Log an error message
   */
  error(...args) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error('❌', ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(...args) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn('⚠️', ...args);
    }
  }

  /**
   * Log an info message
   */
  info(...args) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log('ℹ️', ...args);
    }
  }

  /**
   * Log a debug message
   */
  debug(...args) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log('🐛', ...args);
    }
  }

  /**
   * Log with custom emoji/prefix (for maintaining existing log styles)
   */
  log(prefix, ...args) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(prefix, ...args);
    }
  }
}

/**
 * Create a singleton logger instance
 * This will be imported and used throughout the application
 */
let loggerInstance = null;

export function createLogger(configService) {
  if (!loggerInstance) {
    loggerInstance = new Logger(configService);
  }
  return loggerInstance;
}

export function getLogger() {
  if (!loggerInstance) {
    // Auto-initialize with default config service if not already initialized
    // This allows any module to call getLogger() without explicit initialization
    loggerInstance = new Logger(defaultConfigService);
  }
  return loggerInstance;
}
