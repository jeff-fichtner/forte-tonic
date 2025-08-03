#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the test file from command line arguments
const testFile = process.argv[2];

if (!testFile) {
  console.error('Please provide a test file path');
  process.exit(1);
}

const command = ['node', '--experimental-vm-modules', 'node_modules/.bin/jest', '--config', 'config/jest.config.js', '--runInBand', '--no-cache', testFile];

console.log(`Running debug for test file: ${testFile}`);
console.log(`Command: ${command.join(' ')}`);

const child = spawn(command[0], command.slice(1), {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..', '..'), // Go up two levels from .vscode/build to workspace root
  env: {
    ...process.env,
    NODE_ENV: 'test'
  }
});

child.on('exit', (code) => {
  process.exit(code);
});
