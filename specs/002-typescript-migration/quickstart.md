# Quickstart: TypeScript Migration

**Feature**: 002-typescript-migration
**Date**: 2026-02-20

## Migration Pattern per File

Every source file follows the same conversion pattern:

### 1. Rename

```bash
git mv src/models/shared/student.js src/models/shared/student.ts
```

### 2. Add Imports for Types

```typescript
// Before (JavaScript)
export class Student {
  constructor(data) {

// After (TypeScript)
interface StudentData {
  id?: string;
  firstName: string;
  lastName: string;
  // ... from data-model.md
}

export class Student {
  // Private fields need explicit types
  private _firstName: string;
  private _lastName: string;

  // Public fields
  id: string;
  email: string | null;
  grade: string;
  // ...

  constructor(data: StudentData) {
```

### 3. Type Method Signatures

```typescript
// Before
getFullName() {
  return `${this.firstName} ${this.lastName}`;
}

// After
getFullName(): string {
  return `${this.firstName} ${this.lastName}`;
}
```

### 4. Type Factory Methods

```typescript
// Before
static fromDatabaseRow(row) {

// After
static fromDatabaseRow(row: string[]): Student {
```

### 5. Import Extensions Stay as .js

```typescript
// Before
import { Student } from './student.js';

// After — extension stays .js even though the file is .ts
import { Student } from './student.js';
// Note: with NodeNext module resolution, TypeScript requires .js extensions
// in import specifiers. The compiler resolves ./student.js to ./student.ts
// at compile time. This is standard TypeScript ESM behavior.
```

## Configuration Files

### tsconfig.json (backend)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "noEmit": true,
    "lib": ["ES2022"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/web/**/*.ts", "node_modules", "dist"]
}
```

### tsconfig.web.json (frontend)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": []
  },
  "include": ["src/web/**/*.ts", "src/models/shared/**/*.ts", "src/utils/**/*.ts", "src/types/**/*.d.ts"]
}
```

### Jest Config Update

```typescript
// config/jest.config.ts
export default {
  rootDir: '..',
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
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
```

### ESLint Config Update

```typescript
// config/eslint.config.ts
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'error',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'build/', 'coverage/', '*.min.js'],
  },
);
```

## Package.json Script Updates

```json
{
  "scripts": {
    "start": "tsx src/server.ts",
    "start:direct": "tsx src/server.ts",
    "dev": "nodemon --exec tsx src/server.ts",
    "test": "tsx tests/scripts/test.ts all",
    "typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.web.json",
    "format": "prettier --config config/.prettierrc.json ... \"src/**/*.ts\" \"tests/**/*.ts\" ...",
    "lint": "eslint --config config/eslint.config.ts src/ tests/",
    "check:all": "npm run format:check && npm run lint && npm run typecheck && npm test"
  }
}
```

## Validation Checklist

After migration, verify in order:

1. `npx tsc --noEmit` — zero errors (backend)
2. `npx tsc --noEmit -p tsconfig.web.json` — zero errors (frontend)
3. `npm test` — all 544 tests pass
4. `npm run build:frontend` — Vite builds successfully
5. `npm start` — server starts and responds to health check
6. `npm run lint` — no lint errors
7. `npm run format:check` — formatting passes
