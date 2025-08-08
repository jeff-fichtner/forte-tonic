#!/usr/bin/env node

/**
 * Simple test runner for the getInstructorByAccessCode integration test
 * Usage: node tests/debug/run-single-test.js
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

console.log('🧪 Single Integration Test Runner');
console.log('=================================\n');

const TEST_FILE = 'tests/integration/getInstructorByAccessCode.test.js';
const SPECIFIC_TEST = process.argv[2]; // Optional: specific test name

console.log(`📁 Project Root: ${projectRoot}`);
console.log(`🧪 Test File: ${TEST_FILE}`);
if (SPECIFIC_TEST) {
  console.log(`🎯 Specific Test: ${SPECIFIC_TEST}`);
}
console.log('');

// Build Jest command
const jestArgs = [
  'node_modules/.bin/jest',
  '--testPathPattern=' + TEST_FILE,
  '--verbose',
  '--no-cache',
  '--detectOpenHandles',
  '--forceExit',
  '--runInBand', // Run tests serially
  '--colors', // Colorful output
];

// Add specific test pattern if provided
if (SPECIFIC_TEST) {
  jestArgs.push('--testNamePattern=' + SPECIFIC_TEST);
}

console.log('🚀 Running test...');
console.log('Command:', 'node', jestArgs.join(' '));
console.log('');

// Spawn the Jest process
const jestProcess = spawn('node', jestArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
  }
});

jestProcess.on('close', (code) => {
  console.log('');
  if (code === 0) {
    console.log('✅ Tests completed successfully');
  } else {
    console.log(`❌ Tests failed with exit code ${code}`);
  }
  process.exit(code);
});

jestProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error);
  process.exit(1);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping test process...');
  jestProcess.kill('SIGINT');
});
