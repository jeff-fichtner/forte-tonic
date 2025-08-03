#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const testType = args[0] || 'all';

const testCommands = {
  all: ['node', '--experimental-vm-modules', 'node_modules/.bin/jest', '--config', 'config/jest.config.js'],
  unit: ['node', '--experimental-vm-modules', 'node_modules/.bin/jest', '--config', 'config/jest.config.js', 'tests/unit'],
  integration: ['node', '--experimental-vm-modules', 'node_modules/.bin/jest', '--config', 'config/jest.config.js', 'tests/integration'],
  watch: ['node', '--experimental-vm-modules', 'node_modules/.bin/jest', '--config', 'config/jest.config.js', '--watch'],
  coverage: ['node', '--experimental-vm-modules', 'node_modules/.bin/jest', '--config', 'config/jest.config.js', '--coverage'],
  debug: ['node', '--inspect-brk', '--experimental-vm-modules', 'node_modules/.bin/jest', '--config', 'config/jest.config.js', '--runInBand']
};

const command = testCommands[testType];

if (!command) {
  console.error(`Unknown test type: ${testType}`);
  console.error('Available types: all, unit, integration, watch, coverage, debug');
  process.exit(1);
}

console.log(`Running ${testType} tests...`);
console.log(`Command: ${command.join(' ')}`);

const child = spawn(command[0], command.slice(1), {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..', '..'),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PATH: `${path.resolve(__dirname, '..', '..', 'node_modules', '.bin')}:${process.env.PATH}`
  }
});

child.on('exit', (code) => {
  process.exit(code);
});
