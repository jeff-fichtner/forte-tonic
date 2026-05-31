/**
 * @file Integration test for migration system
 * Verifies migrations run during app startup and failures block the app
 */

import { jest } from '@jest/globals';

// Mock googleapis BEFORE importing anything that uses it
const mockSheetsApi = {
  spreadsheets: {
    values: {
      get: jest.fn(),
      append: jest.fn(),
      update: jest.fn(),
      batchUpdate: jest.fn(),
    },
    get: jest.fn(),
    batchUpdate: jest.fn(),
  },
};

jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({})),
    },
    sheets: jest.fn().mockReturnValue(mockSheetsApi),
  },
}));

// Mock fs/promises for migration file discovery
const mockReaddir = jest.fn<() => Promise<string[]>>();
jest.unstable_mockModule('node:fs/promises', () => ({
  readdir: mockReaddir,
}));

// Mock config service
jest.unstable_mockModule('../../src/services/configurationService.js', () => {
  const mockConfig = {
    getGoogleSheetsAuth: () => ({
      clientEmail: 'test@test.com',
      privateKey: 'fake-key',
    }),
    getGoogleSheetsConfig: () => ({
      spreadsheetId: 'test-spreadsheet-id',
    }),
    getServerConfig: () => ({
      port: 3000,
      nodeEnv: 'test',
      isDevelopment: false,
    }),
    getBaseUrl: () => 'http://localhost:3000',
    getEmailConfig: () => ({
      sendGridApiKey: '',
      fromEmail: '',
      fromName: '',
    }),
    getVersionConfig: () => ({
      version: '1.0.0',
    }),
  };
  return { configService: mockConfig, ConfigurationService: jest.fn() };
});

// Mock GCP logger
const mockCloudLogger = {
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
};
jest.unstable_mockModule('../../src/common/gcpLogger.js', () => ({
  getCloudLogger: () => mockCloudLogger,
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Default: _migrations sheet exists, no migrations recorded, no migration files
  mockSheetsApi.spreadsheets.get.mockResolvedValue({
    data: {
      sheets: [{ properties: { title: '_migrations', sheetId: 999 } }],
    },
  });
  mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
    data: { values: undefined },
  });
  mockSheetsApi.spreadsheets.values.append.mockResolvedValue({});
  mockReaddir.mockResolvedValue([]);
});

describe('Migration system integration', () => {
  test('should complete startup with no pending migrations', async () => {
    const { runPendingMigrations } = await import(
      '../../src/infrastructure/migration/migrationRunner.js'
    );

    const mockDbClient = {
      sheets: mockSheetsApi,
      spreadsheetId: 'test-spreadsheet-id',
    };

    // Should not throw
    await expect(runPendingMigrations(mockDbClient)).resolves.toBeUndefined();
  });

  test('should fail startup when migration file cannot be loaded', async () => {
    mockReaddir.mockResolvedValue(['001-bad-migration.ts']);

    const { runPendingMigrations } = await import(
      '../../src/infrastructure/migration/migrationRunner.js'
    );

    const mockDbClient = {
      sheets: mockSheetsApi,
      spreadsheetId: 'test-spreadsheet-id',
    };

    // Should throw — bad migration file prevents startup
    await expect(runPendingMigrations(mockDbClient)).rejects.toThrow();
  });
});
