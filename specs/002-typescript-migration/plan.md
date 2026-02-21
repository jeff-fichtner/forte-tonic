# Implementation Plan: TypeScript Migration

**Branch**: `002-typescript-migration` | **Date**: 2026-02-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-typescript-migration/spec.md`

## Summary

Convert the entire Tonic codebase (118 source files, 32 test files) from JavaScript ESM to TypeScript with `strict: true`. No runtime behavior changes. Backend runs via `tsx` (no compile step). Frontend continues through Vite (native TS support). Tests via `ts-jest` ESM preset. All 544 existing tests must pass with unchanged assertions.

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022, running on Node.js (ESM)
**Primary Dependencies**: Express 4, Google Sheets API v4, tsx (runtime), ts-jest (testing), typescript-eslint (linting)
**Storage**: Google Sheets API v4 (unchanged)
**Testing**: Jest 29 + ts-jest with ESM preset, Supertest for integration
**Target Platform**: Node.js backend + browser frontend (Vite-bundled)
**Project Type**: Web application (single repo, shared models between backend and frontend)
**Performance Goals**: No regression — identical runtime behavior
**Constraints**: Zero `any` except at documented Google Sheets API and MaterializeCSS boundaries
**Scale/Scope**: 118 source files + 32 test files = 150 files to migrate

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | File-by-file rename + annotation. No restructuring, no new abstractions. Two tsconfig files (backend/frontend) is the minimum — one would pollute backend with DOM types. |
| II. Data Consistency | PASS | No data shape changes. Type annotations formalize existing shapes. |
| III. Single Serialization Path | PASS | `toJSON()` methods unchanged. TypeScript return types document existing contracts. |
| IV. Uniform API Responses | PASS | Response envelope gets a generic type `ApiResponse<T>` — formalizes existing pattern. |
| V. Single Data Fetch Pattern | PASS | `HttpService` gets generic type parameters — formalizes existing pattern. |
| VI. No Dead Code | PASS | No new code beyond type annotations, interfaces, and config files. |
| VII. Shared Models Are the Contract | PASS | Models stay in `src/models/shared/`. Both tsconfig files include this directory. Import paths change extension only (`.js` → `.ts`). |
| VIII. Role-Based Architecture | PASS | No architectural changes. |
| IX. Trimester-Aware by Default | PASS | No business logic changes. |
| X. Google Sheets Is the Database | PASS | Database layer gets types at the boundary. `any` is documented per SC-005 for raw Sheets API responses. |

**Post-Phase 1 re-check**: No violations introduced. The two tsconfig files and the MaterializeCSS declaration file are the only new files beyond renames — justified in research.md (R5, R6).

## New Dependencies

| Package | Purpose | Dev? |
|---------|---------|------|
| `typescript` | Type checker (`tsc --noEmit`) | Yes |
| `tsx` | TypeScript execution for Node.js (replaces `node` in scripts) | Yes |
| `ts-jest` | Jest transformer for TypeScript test files | Yes |
| `@types/express` | Type definitions for Express | Yes |
| `@types/cors` | Type definitions for cors middleware | Yes |
| `@types/lodash` | Type definitions for lodash | Yes |
| `@types/nodemailer` | Type definitions for nodemailer | Yes |
| `@types/supertest` | Type definitions for supertest | Yes |
| `typescript-eslint` | TypeScript parser and rules for ESLint flat config | Yes |
| `@types/node` | Node.js type definitions | Yes |

**Removed dependencies** (no longer needed after migration):
- `@babel/core`, `@babel/preset-env`, `babel-jest` — TypeScript replaces Babel for transpilation
- `eslint-plugin-jsdoc` — TypeScript types replace JSDoc type annotations (JSDoc comments for documentation remain valid but the plugin's type-checking rules become redundant)

## Project Structure

### Documentation (this feature)

```text
specs/002-typescript-migration/
├── plan.md              # This file
├── research.md          # Phase 0: technology decisions
├── data-model.md        # Phase 1: type interfaces
├── quickstart.md        # Phase 1: integration guide
├── contracts/           # Phase 1: API type contracts
│   ├── api-responses.ts # Response envelope types
│   ├── http-service.ts  # Frontend HTTP client types
│   └── database.ts      # Database layer types
└── tasks.md             # Phase 2: task breakdown
```

### Source Code (repository root)

```text
src/
├── types/                          # NEW: type declarations
│   ├── materialize.d.ts            # MaterializeCSS M namespace
│   └── global.d.ts                 # App-wide globals (ViewModel, etc.)
├── models/shared/                  # RENAME: .js → .ts, add interfaces
│   ├── index.ts
│   ├── admin.ts
│   ├── attendanceRecord.ts
│   ├── class.ts
│   ├── instructor.ts
│   ├── instruments.ts
│   ├── lengthOptions.ts
│   ├── parent.ts
│   ├── registration.ts
│   ├── room.ts
│   ├── student.ts
│   └── responses/
│       ├── appConfigurationResponse.ts
│       └── authenticatedUserResponse.ts
├── infrastructure/                 # RENAME: .js → .ts, add types
├── repositories/                   # RENAME: .js → .ts, add types
├── services/                       # RENAME: .js → .ts, add types
├── controllers/                    # RENAME: .js → .ts, add types
├── database/                       # RENAME: .js → .ts, typed boundary
├── middleware/                     # RENAME: .js → .ts, add types
├── routes/                         # RENAME: .js → .ts, add types
├── common/                         # RENAME: .js → .ts, add types
├── config/                         # RENAME: .js → .ts, add types
├── constants/                      # RENAME: .js → .ts, add types
├── cache/                          # RENAME: .js → .ts, add types
├── email/                          # RENAME: .js → .ts, add types
├── utils/                          # RENAME: .js → .ts, add types
├── web/js/                         # RENAME: .js → .ts, add types
├── app.ts                          # RENAME from app.js
└── server.ts                       # RENAME from server.js

tests/
├── setup.ts                        # RENAME from setup.js
├── scripts/test.ts                 # RENAME from test.js
├── unit/                           # RENAME: all .test.js → .test.ts
└── integration/                    # RENAME: all .test.js → .test.ts

config/
├── jest.config.ts                  # RENAME + update for ts-jest
├── eslint.config.ts                # RENAME + update for typescript-eslint
└── .prettierrc.json                # Unchanged (Prettier handles .ts natively)

tsconfig.json                       # NEW: base config (backend)
tsconfig.web.json                   # NEW: frontend config (extends base)
vite.config.ts                      # RENAME from vite.config.js
```

**Structure Decision**: Existing directory layout preserved exactly. The only new directory is `src/types/` for declaration files. All other changes are file renames (`.js` → `.ts`) and content annotation.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
