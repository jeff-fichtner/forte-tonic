/**
 * Version Hash Unit Tests (T025)
 * ===============================
 *
 * Tests for version hash generation with git/env/package.json fallbacks.
 * Requires mocking child_process, fs, path, url, and crypto modules.
 */

import { jest } from '@jest/globals';

// --- Module mocks (must be set up before dynamic import) ---

const mockExecSync = jest.fn();
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync,
}));

const mockReadFileSync = jest.fn();
jest.unstable_mockModule('fs', () => ({
  readFileSync: mockReadFileSync,
}));

jest.unstable_mockModule('path', () => ({
  join: jest.fn().mockReturnValue('/fake/package.json'),
  dirname: jest.fn().mockReturnValue('/fake'),
}));

jest.unstable_mockModule('url', () => ({
  fileURLToPath: jest.fn().mockReturnValue('/fake/versionHash.ts'),
}));

const mockHashUpdate = jest.fn();
const mockHashDigest = jest.fn();
const mockCreateHash = jest.fn().mockReturnValue({
  update: mockHashUpdate.mockReturnThis(),
  digest: mockHashDigest,
});
jest.unstable_mockModule('crypto', () => ({
  createHash: mockCreateHash,
}));

// Dynamic import after mocks are established
const { generateFrontendVersionHash, getFrontendVersionHash } = await import(
  '../../../src/utils/versionHash.js'
);

describe('versionHash', () => {
  let savedBuildGitCommit: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    // Save and clear the env var before each test
    savedBuildGitCommit = process.env.BUILD_GIT_COMMIT;
    delete process.env.BUILD_GIT_COMMIT;
  });

  afterEach(() => {
    // Restore the env var
    if (savedBuildGitCommit !== undefined) {
      process.env.BUILD_GIT_COMMIT = savedBuildGitCommit;
    } else {
      delete process.env.BUILD_GIT_COMMIT;
    }
  });

  describe('generateFrontendVersionHash()', () => {
    test('should return first 8 chars of BUILD_GIT_COMMIT when env var is set', () => {
      process.env.BUILD_GIT_COMMIT = 'abc123def456789000';

      const result = generateFrontendVersionHash();

      expect(result).toBe('abc123de');
    });

    test('should fall back to git rev-parse when BUILD_GIT_COMMIT is not set', () => {
      mockExecSync.mockReturnValue('abc123def456\n');

      const result = generateFrontendVersionHash();

      expect(result).toBe('abc123de');
      expect(mockExecSync).toHaveBeenCalledWith('git rev-parse HEAD', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
    });

    test('should fall back to package.json version hash when git is unavailable', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git not found');
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({ version: '1.4.0' }));
      mockHashDigest.mockReturnValue('deadbeef01234567');

      const result = generateFrontendVersionHash();

      expect(result).toBe('deadbeef');
      expect(mockReadFileSync).toHaveBeenCalled();
      expect(mockCreateHash).toHaveBeenCalledWith('sha256');
    });

    test('should always return an 8-character string', () => {
      // Test with env var
      process.env.BUILD_GIT_COMMIT = 'abcdef1234567890';
      expect(generateFrontendVersionHash()).toHaveLength(8);

      // Test with git fallback
      delete process.env.BUILD_GIT_COMMIT;
      mockExecSync.mockReturnValue('1234567890abcdef\n');
      expect(generateFrontendVersionHash()).toHaveLength(8);
    });
  });

  describe('getFrontendVersionHash()', () => {
    test('should return the same cached value on repeated calls', () => {
      const first = getFrontendVersionHash();
      const second = getFrontendVersionHash();

      expect(first).toBe(second);
    });
  });
});
