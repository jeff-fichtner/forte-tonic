#!/usr/bin/env node

/**
 * Application startup script
 * Ensures correct working directory and starts the server
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Change to the project root directory
process.chdir(__dirname);

console.log('🚀 Starting Tonic application...');
console.log('📁 Working directory:', process.cwd());
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

// Verify we're in the right directory
try {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  console.log('📦 Project:', packageJson.name, 'v' + packageJson.version);
} catch (error) {
  console.error('❌ Error: Cannot find package.json. Are we in the right directory?');
  process.exit(1);
}

// Import and start the server
try {
  await import('./src/server.js');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
