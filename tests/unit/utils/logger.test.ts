/**
 * Logger Unit Tests
 * ==================
 *
 * Exercises src/utils/logger.ts — log-level routing based on environment +
 * configured log level.
 *
 * Notable behavior pinned:
 *  - Development mode bypasses the configured log level (all levels log).
 *  - Test mode is opinionated: only error and warn surface.
 *  - Other environments respect the configured log level via a priority map:
 *    ERROR(0) < WARN(1) < INFO(2) < DEBUG(3). A configured level allows that
 *    priority and everything below it.
 */

import { jest } from '@jest/globals';
import { Logger, LogLevel, NodeEnv } from '../../../src/utils/logger.js';

interface MockConfigService {
  getServerConfig: jest.Mock<() => { logLevel?: string; nodeEnv?: string }>;
}

function createMockConfigService(logLevel?: string, nodeEnv?: string): MockConfigService {
  return {
    getServerConfig: jest.fn().mockReturnValue({ logLevel, nodeEnv }),
  };
}

describe('Logger', () => {
  // Spy on the console methods that the logger writes to.
  let errorSpy: jest.SpiedFunction<typeof console.error>;
  let warnSpy: jest.SpiedFunction<typeof console.warn>;
  let logSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  describe('shouldLog (level routing)', () => {
    test('development bypasses the configured level — all levels log', () => {
      const logger = new Logger(createMockConfigService(LogLevel.ERROR, NodeEnv.DEVELOPMENT));
      expect(logger.shouldLog(LogLevel.ERROR)).toBe(true);
      expect(logger.shouldLog(LogLevel.WARN)).toBe(true);
      expect(logger.shouldLog(LogLevel.INFO)).toBe(true);
      expect(logger.shouldLog(LogLevel.DEBUG)).toBe(true);
    });

    test('test mode allows only error and warn', () => {
      const logger = new Logger(createMockConfigService(LogLevel.DEBUG, NodeEnv.TEST));
      expect(logger.shouldLog(LogLevel.ERROR)).toBe(true);
      expect(logger.shouldLog(LogLevel.WARN)).toBe(true);
      expect(logger.shouldLog(LogLevel.INFO)).toBe(false);
      expect(logger.shouldLog(LogLevel.DEBUG)).toBe(false);
    });

    test('production with INFO level: ERROR/WARN/INFO log, DEBUG does not', () => {
      const logger = new Logger(createMockConfigService(LogLevel.INFO, NodeEnv.PRODUCTION));
      expect(logger.shouldLog(LogLevel.ERROR)).toBe(true);
      expect(logger.shouldLog(LogLevel.WARN)).toBe(true);
      expect(logger.shouldLog(LogLevel.INFO)).toBe(true);
      expect(logger.shouldLog(LogLevel.DEBUG)).toBe(false);
    });

    test('production with ERROR level: only ERROR logs', () => {
      const logger = new Logger(createMockConfigService(LogLevel.ERROR, NodeEnv.PRODUCTION));
      expect(logger.shouldLog(LogLevel.ERROR)).toBe(true);
      expect(logger.shouldLog(LogLevel.WARN)).toBe(false);
      expect(logger.shouldLog(LogLevel.INFO)).toBe(false);
      expect(logger.shouldLog(LogLevel.DEBUG)).toBe(false);
    });

    test('production with DEBUG level: everything logs', () => {
      const logger = new Logger(createMockConfigService(LogLevel.DEBUG, NodeEnv.PRODUCTION));
      expect(logger.shouldLog(LogLevel.ERROR)).toBe(true);
      expect(logger.shouldLog(LogLevel.WARN)).toBe(true);
      expect(logger.shouldLog(LogLevel.INFO)).toBe(true);
      expect(logger.shouldLog(LogLevel.DEBUG)).toBe(true);
    });

    test('defaults: no logLevel → INFO, no nodeEnv → production', () => {
      // With defaults, info logs but debug does not. (This is the "no config"
      // safety net — production-shaped behavior.)
      const logger = new Logger(createMockConfigService(undefined, undefined));
      expect(logger.shouldLog(LogLevel.INFO)).toBe(true);
      expect(logger.shouldLog(LogLevel.DEBUG)).toBe(false);
    });

    test('staging respects the configured log level (treated like production)', () => {
      const logger = new Logger(createMockConfigService(LogLevel.WARN, NodeEnv.STAGING));
      expect(logger.shouldLog(LogLevel.ERROR)).toBe(true);
      expect(logger.shouldLog(LogLevel.WARN)).toBe(true);
      expect(logger.shouldLog(LogLevel.INFO)).toBe(false);
    });
  });

  describe('method routing to console', () => {
    test('error() writes to console.error', () => {
      const logger = new Logger(createMockConfigService(LogLevel.ERROR, NodeEnv.PRODUCTION));
      logger.error('boom');
      expect(errorSpy).toHaveBeenCalledWith(expect.any(String), 'boom');
      expect(warnSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    });

    test('warn() writes to console.warn', () => {
      const logger = new Logger(createMockConfigService(LogLevel.WARN, NodeEnv.PRODUCTION));
      logger.warn('careful');
      expect(warnSpy).toHaveBeenCalledWith(expect.any(String), 'careful');
      expect(errorSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    });

    test('info() writes to console.log', () => {
      const logger = new Logger(createMockConfigService(LogLevel.INFO, NodeEnv.PRODUCTION));
      logger.info('hello');
      expect(logSpy).toHaveBeenCalledWith(expect.any(String), 'hello');
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    test('debug() writes to console.log', () => {
      const logger = new Logger(createMockConfigService(LogLevel.DEBUG, NodeEnv.PRODUCTION));
      logger.debug('trace');
      expect(logSpy).toHaveBeenCalledWith(expect.any(String), 'trace');
    });

    test('log(prefix, ...) writes to console.log at DEBUG eligibility', () => {
      const logger = new Logger(createMockConfigService(LogLevel.DEBUG, NodeEnv.PRODUCTION));
      logger.log('🎯', 'tagged');
      expect(logSpy).toHaveBeenCalledWith('🎯', 'tagged');
    });
  });

  describe('short-circuit when level is suppressed', () => {
    test('info() does not call console.log when configured level is ERROR', () => {
      const logger = new Logger(createMockConfigService(LogLevel.ERROR, NodeEnv.PRODUCTION));
      logger.info('should not print');
      expect(logSpy).not.toHaveBeenCalled();
    });

    test('debug() does not call console.log when configured level is INFO', () => {
      const logger = new Logger(createMockConfigService(LogLevel.INFO, NodeEnv.PRODUCTION));
      logger.debug('should not print');
      expect(logSpy).not.toHaveBeenCalled();
    });

    test('info() does NOT print in test mode (only error/warn do)', () => {
      const logger = new Logger(createMockConfigService(LogLevel.DEBUG, NodeEnv.TEST));
      logger.info('should not print in test mode');
      expect(logSpy).not.toHaveBeenCalled();
    });

    test('warn() DOES print in test mode', () => {
      const logger = new Logger(createMockConfigService(LogLevel.ERROR, NodeEnv.TEST));
      logger.warn('warning surfaces in test');
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('variadic arguments', () => {
    test('passes through multiple positional arguments', () => {
      const logger = new Logger(createMockConfigService(LogLevel.INFO, NodeEnv.PRODUCTION));
      logger.info('a', 'b', { c: 1 });
      expect(logSpy).toHaveBeenCalledWith(expect.any(String), 'a', 'b', { c: 1 });
    });

    test('handles zero extra arguments', () => {
      const logger = new Logger(createMockConfigService(LogLevel.INFO, NodeEnv.PRODUCTION));
      logger.info();
      expect(logSpy).toHaveBeenCalledWith(expect.any(String));
    });
  });
});
