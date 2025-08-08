#!/usr/bin/env node

/**
 * Debug script for running integration tests with breakpoints
 * Usage: node tests/debug/debug-integration-test.js
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

console.log('🔧 Debug Integration Test Runner');
console.log('================================\n');

// Configuration
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
  '--testPathPattern=' + TEST_FILE,
  '--verbose',
  '--no-cache',
  '--detectOpenHandles',
  '--forceExit',
  '--runInBand', // Run tests serially for better debugging
];

// Add specific test pattern if provided
if (SPECIFIC_TEST) {
  jestArgs.push('--testNamePattern=' + SPECIFIC_TEST);
}

// Add debugging flags
const nodeArgs = [
  '--inspect-brk=9229', // Enable debugger with breakpoint
  '--experimental-vm-modules', // Support for ES modules in Jest
];

console.log('🚀 Starting Jest with debugging...');
console.log('Command:', 'node', nodeArgs.concat(['node_modules/.bin/jest']).concat(jestArgs).join(' '));
console.log('');
console.log('🔍 Debugging Instructions:');
console.log('1. Open Chrome and go to: chrome://inspect');
console.log('2. Click "Open dedicated DevTools for Node"');
console.log('3. Set breakpoints in your test file or in the source code');
console.log('4. Click the play button to continue execution');
console.log('');
console.log('💡 Tips:');
console.log('- Look for "debugger;" statements in the test file');
console.log('- You can also set breakpoints in src/controllers/userController.js');
console.log('- Use console.log statements for additional debugging output');
console.log('');

// Spawn the Jest process with debugging
const jestProcess = spawn('node', nodeArgs.concat(['node_modules/.bin/jest']).concat(jestArgs), {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    DEBUG: 'true',
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
