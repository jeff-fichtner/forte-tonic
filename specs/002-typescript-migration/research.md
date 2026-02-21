# Research: TypeScript Migration

**Feature**: 002-typescript-migration
**Date**: 2026-02-20

## R1: TypeScript Runtime for Node.js Backend

**Decision**: Use `tsx` for running TypeScript directly in Node.js without a compile step.

**Rationale**: `tsx` is a lightweight TypeScript executor built on esbuild. It supports ESM natively, requires no `tsconfig.json` for execution (only for type checking), and has near-zero startup overhead. It replaces `node src/server.js` with `tsx src/server.ts` — no intermediate build step. Node.js 22+ has experimental `--experimental-strip-types` but it doesn't support all TypeScript features (enums, namespaces, parameter properties) and requires `--experimental-transform-types` for some patterns. `tsx` is more reliable for a full migration.

**Alternatives considered**:
- `ts-node`: Heavier, historically problematic with ESM. Requires additional `ts-node/esm` loader configuration. More complex setup than `tsx`.
- Node.js `--experimental-strip-types`: Built-in but limited — doesn't support `enum`, `namespace`, or constructor parameter properties. Would constrain which TypeScript features we can use.
- Pre-compile with `tsc`: Adds a build step for backend. Creates `dist/` directory management. Increases deployment complexity. Unnecessary for a project this size.

## R2: Jest Configuration for TypeScript

**Decision**: Use `ts-jest` with ESM support via `ts-jest/presets/default-esm`.

**Rationale**: The project already uses Jest 29 with `--experimental-vm-modules` for ESM. `ts-jest` provides a Jest transformer that compiles `.ts` files on the fly during test runs. The ESM preset aligns with the project's existing `"type": "module"` configuration. No need to switch test frameworks — the existing 544 tests continue working with minimal config changes.

**Alternatives considered**:
- `@swc/jest`: Faster compilation but less TypeScript strictness during tests. SWC doesn't type-check, which reduces migration confidence.
- `vitest`: Would require rewriting all test files from Jest API to Vitest API. Incompatible with the "no test logic changes" requirement.
- Babel with `@babel/preset-typescript`: Already have Babel in devDependencies but it strips types without checking them. Provides no additional value over `ts-jest`.

## R3: ESLint TypeScript Configuration

**Decision**: Add `typescript-eslint` (v8+) to the existing flat config with `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin`.

**Rationale**: The project uses ESLint v9 with flat config format. `typescript-eslint` v8+ supports flat configs natively via `tseslint.configs.recommended`. The existing `eslint-plugin-jsdoc` can coexist — JSDoc comments remain valid documentation even in TypeScript. The file glob changes from `**/*.js` to `**/*.ts`.

**Alternatives considered**:
- Biome: Would replace both ESLint and Prettier. Too large a change for a type-safety-only migration — violates the "no behavioral changes" constraint.
- Keeping JSDoc-only type checking: Doesn't meet the spec requirement for strict TypeScript compilation.

## R4: Vite TypeScript Support

**Decision**: Vite handles `.ts` files natively via esbuild — no additional plugins required. Update `vite.config.js` to `vite.config.ts` and update resolve aliases to reference `.ts` extensions.

**Rationale**: Vite 7 includes built-in TypeScript support. It uses esbuild for transpilation during dev and build. The existing config only needs alias path updates and entry point changes. Vite does NOT type-check during build (by design) — type checking is a separate `tsc --noEmit` step.

**Alternatives considered**:
- `vite-plugin-checker`: Adds in-process type checking during Vite dev. Useful but adds complexity. Type checking via `tsc --noEmit` as a separate step is simpler and aligns with Simplicity First principle.

## R5: TypeScript Compiler Configuration

**Decision**: Two `tsconfig.json` files — a base config and an override for frontend code.

**Rationale**: Backend targets Node.js (ES2022 module resolution, node types). Frontend targets the browser (DOM types, no node types). Shared models must compile under both. A base `tsconfig.json` with `strict: true` covers the common settings. A `tsconfig.web.json` extends it with DOM lib additions for frontend files. Vite ignores `tsconfig.json` for transpilation but IDEs and `tsc --noEmit` use it for type checking.

**Configuration approach**:
- `tsconfig.json` (root): `strict: true`, `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, covers `src/` excluding `src/web/`
- `tsconfig.web.json`: extends base, adds `DOM` and `DOM.Iterable` to lib, includes `src/web/` and `src/models/shared/`

**Alternatives considered**:
- Single tsconfig with both node and DOM libs: Works but pollutes backend code with DOM globals (document, window) that shouldn't be available. Two configs provide cleaner separation.
- Three configs (base, backend, frontend): Over-engineering for this project size. Two is sufficient.

## R6: Type Declaration for MaterializeCSS

**Decision**: Create a minimal `src/types/materialize.d.ts` declaring the `M` namespace with only the methods actually used in the codebase.

**Rationale**: MaterializeCSS does not have `@types/materialize-css` maintained for the version in use. The codebase uses a small subset of the `M` API (toast, Modal, Tooltip, FormSelect, Tabs, Sidenav). A hand-written declaration file covering just these is simpler and more accurate than pulling in a potentially mismatched community type package.

**Alternatives considered**:
- `@types/materialize-css`: Exists on npm but may not match the exact version/API surface used. Adds an external dependency for minimal value.
- `declare const M: any`: Violates SC-005 (no `any` except at documented boundaries). Defeats the purpose of typing frontend code.

## R7: Google Sheets API Typing Strategy

**Decision**: Type the Google Sheets responses at the boundary in `googleSheetsDbClient.ts` using `any` for raw API responses (documented external boundary per SC-005), then narrow immediately to typed structures within the client methods.

**Rationale**: The Google Sheets API returns `sheets_v4.Schema$ValueRange` which contains `values?: any[][]`. This is an inherently untyped boundary — the Sheets API has no schema for cell contents. The `@types/googleapis` package types the API methods but cell values are always `any`. Each `fromDatabaseRow()` factory method already handles the narrowing from array to typed model — TypeScript annotations on these methods formalize what's already happening.

**Alternatives considered**:
- Typed tuples for each sheet's column layout: Over-engineering. The column order is already encoded in `fromDatabaseRow()` destructuring. Adding tuple types duplicates this information.
- Runtime validation library (zod, io-ts): Adds a dependency for runtime validation that doesn't exist today. Violates "no behavioral changes" — the current code trusts the sheet data shape.

## R8: Shared Model Import Strategy

**Decision**: Shared models in `src/models/shared/` remain in place. Both backend and frontend import them via the same paths. Vite resolves them via aliases. The backend resolves them via Node.js module resolution. Both tsconfig files include `src/models/shared/` in their scope.

**Rationale**: The current architecture already works this way. TypeScript doesn't change the import mechanism — it only adds type checking. The barrel export in `src/models/shared/index.ts` (renamed from `.js`) continues to work for both targets.

**Alternatives considered**:
- Separate shared package: Would require a monorepo setup (npm workspaces, turborepo). Massive scope increase for zero functional benefit.
- Duplicate types: Maintain separate type definitions for backend and frontend. Violates Constitution Principle VII (shared models are the contract).

## R9: Nodemon TypeScript Support

**Decision**: Replace `nodemon src/server.js` with `nodemon --exec tsx src/server.ts` for the `dev` script.

**Rationale**: Nodemon watches for file changes and restarts the process. It needs to know to use `tsx` instead of `node` to execute TypeScript files. Adding `--exec tsx` is the minimal configuration change. Alternatively, a `nodemon.json` config file can specify `tsx` as the execution command and watch `.ts` extensions.

**Alternatives considered**:
- `tsx --watch`: `tsx` has a built-in watch mode. Simpler than nodemon but less configurable (no ignore patterns, no delay). Nodemon is already a dependency and well-understood.

## R10: Migration File Ordering Strategy

**Decision**: Migrate in dependency order: types/interfaces first → models → repositories → services → controllers → routes → frontend → tests.

**Rationale**: Each layer depends on the layers below it. Starting with type definitions and model interfaces means every subsequent file can import real types instead of using temporary `any` placeholders. This avoids the "fix later" anti-pattern where `any` leaks upward through the codebase.

**Alternatives considered**:
- Alphabetical file-by-file: No dependency awareness. Would require many temporary `any` annotations that need cleanup passes.
- Frontend first: Frontend has the most files but depends on shared models. Would require stub types that get replaced later — wasted effort.
- All at once (big bang): Rename all files, add `any` everywhere, then tighten. Creates a period where the codebase compiles but has no real type safety. Against the spec's intent.
