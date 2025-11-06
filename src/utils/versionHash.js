/**
 * Version Hash Utility
 * Generates a stable hash for frontend cache busting
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '../../package.json');

/**
 * Generate a frontend version hash for cache busting
 * Uses git commit hash in production, package version hash in development
 * @returns {string} 8-character version hash
 */
export function generateFrontendVersionHash() {
  try {
    // Try to get git commit hash first (preferred for production)
    if (process.env.BUILD_GIT_COMMIT) {
      // Use the build server's git commit
      return process.env.BUILD_GIT_COMMIT.substring(0, 8);
    }

    // Try to get local git commit
    try {
      const gitHash = execSync('git rev-parse HEAD', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      return gitHash.substring(0, 8);
    } catch {
      // Git not available or not a git repo, fall back to package.json version
    }

    // Fallback: Use package.json version + timestamp hash
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const versionString = `${packageJson.version}-${Date.now()}`;
    const hash = createHash('sha256').update(versionString).digest('hex');
    return hash.substring(0, 8);
  } catch (error) {
    // Ultimate fallback: timestamp-based hash
    const fallbackHash = createHash('sha256').update(Date.now().toString()).digest('hex');
    return fallbackHash.substring(0, 8);
  }
}

/**
 * Get a stable version hash that doesn't change during runtime
 * This is cached on first call to ensure consistency
 */
let cachedVersionHash = null;

export function getFrontendVersionHash() {
  if (!cachedVersionHash) {
    cachedVersionHash = generateFrontendVersionHash();
  }
  return cachedVersionHash;
}
