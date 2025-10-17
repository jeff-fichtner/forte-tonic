import dotenv from 'dotenv';
import { createLogger } from '../src/utils/logger.js';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock config service for logger initialization
const mockConfigService = {
  getLoggingConfig: () => ({
    enableLogging: false, // Disable logging in tests to reduce noise
    logLevel: 'error',
  }),
  getEnvironment: () => 'test',
  getServerConfig: () => ({
    logLevel: 'error',
    nodeEnv: 'test',
  }),
};

// Initialize logger for tests
createLogger(mockConfigService);

// Global test setup
global.console = {
  ...console,
  // Uncomment to ignore console logs during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
