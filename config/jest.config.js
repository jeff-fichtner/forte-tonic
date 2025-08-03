export default {
  rootDir: '..',
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  moduleDirectories: ['node_modules', 'src'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  clearMocks: true,
  testTimeout: 10000,
  verbose: true,
  // Explicitly set moduleFileExtensions for ES modules
  moduleFileExtensions: ['js', 'mjs'],
  // Force Jest to use the correct environment
  forceExit: true,
  detectOpenHandles: true,
  // Remove extensionsToTreatAsEsm as it conflicts with "type": "module" in package.json
  // Jest automatically treats .js files as ES modules when package.json has "type": "module"
};
