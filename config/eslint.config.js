import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        URLSearchParams: 'readonly',
        // Timer functions
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Browser APIs
        performance: 'readonly',
        crypto: 'readonly',
        indexedDB: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        Event: 'readonly',
        Node: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        HTMLElement: 'readonly',
        // Materialize CSS
        M: 'readonly',
        // Application globals
        ViewModel: 'readonly',
        ModalKeyboardHandler: 'readonly',
        // Test globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      jsdoc,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Allow console for development
      'prefer-const': 'error',
      'no-debugger': 'warn',
      'jsdoc/require-description': 'off', // Too strict for now
      'jsdoc/require-description-complete-sentence': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/check-alignment': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': ['error', { definedTags: ['jest-environment'] }],
      'jsdoc/check-types': 'off', // Too strict - complains about "object" vs "{[key: string]: string}"
      'jsdoc/require-jsdoc': 'off', // Too strict for now
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'build/', 'coverage/', '*.min.js'],
  },
];
