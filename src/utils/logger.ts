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
} as const;

export type LogLevelValue = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Node environment enum
 */
export const NodeEnv = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
  TEST: 'test',
} as const;

export type NodeEnvValue = (typeof NodeEnv)[keyof typeof NodeEnv];

interface ServerConfig {
  logLevel?: string;
  nodeEnv?: string;
}

interface ConfigService {
  getServerConfig(): ServerConfig;
}

/**
 * Logger class that provides conditional logging based on environment configuration
 */
export class Logger {
  private configService: ConfigService;
  private logLevelPriority: Record<string, number>;

  constructor(configService: ConfigService) {
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
  shouldLog(level: LogLevelValue): boolean {
    const serverConfig: ServerConfig = this.configService.getServerConfig();
    const currentLogLevel: string = serverConfig.logLevel || LogLevel.INFO;
    const currentEnv: string = serverConfig.nodeEnv || NodeEnv.PRODUCTION;

    // Always log in development mode
    if (currentEnv === NodeEnv.DEVELOPMENT) {
      return true;
    }

    // In test mode, only log errors and warnings to keep output clean
    if (currentEnv === NodeEnv.TEST) {
      return level === LogLevel.ERROR || level === LogLevel.WARN;
    }

    // For other environments, respect the configured log level
    const requestedPriority: number = this.logLevelPriority[level];
    const configuredPriority: number = this.logLevelPriority[currentLogLevel];

    return requestedPriority <= configuredPriority;
  }

  /**
   * Log an error message
   */
  error(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error('❌', ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn('⚠️', ...args);
    }
  }

  /**
   * Log an info message
   */
  info(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log('ℹ️', ...args);
    }
  }

  /**
   * Log a debug message
   */
  debug(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log('🐛', ...args);
    }
  }

  /**
   * Log with custom emoji/prefix (for maintaining existing log styles)
   */
  log(prefix: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(prefix, ...args);
    }
  }
}

/**
 * Create a singleton logger instance
 * This will be imported and used throughout the application
 */
let loggerInstance: Logger | null = null;

export function createLogger(configService: ConfigService): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(configService);
  }
  return loggerInstance;
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    // Auto-initialize with default config service if not already initialized
    // This allows any module to call getLogger() without explicit initialization
    loggerInstance = new Logger(defaultConfigService);
  }
  return loggerInstance;
}
