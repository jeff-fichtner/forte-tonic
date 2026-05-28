export default {
  rootDir: '..',
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Frontend root-slash aliases — must mirror vite.config.ts + tsconfig.web.json
    '^/utils/(.*)\\.js$': '<rootDir>/src/utils/$1',
    '^/models/(.*)\\.js$': '<rootDir>/src/models/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, diagnostics: false }],
  },
  testMatch: ['**/tests/**/*.test.ts'],
  moduleDirectories: ['node_modules', 'src'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  clearMocks: true,
  testTimeout: 10000,
  verbose: true,
  moduleFileExtensions: ['ts', 'js', 'mjs'],
  forceExit: true,
  detectOpenHandles: true,
};
