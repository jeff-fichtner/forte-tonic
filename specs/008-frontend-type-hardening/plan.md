# Implementation Plan: Frontend Type Hardening

**Branch**: `008-frontend-type-hardening` | **Date**: 2026-02-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-frontend-type-hardening/spec.md`

## Summary

Add explicit TypeScript type annotations to all frontend source files (`src/web/js/`), fix `tsconfig.web.json` so `tsc` actually compiles web files, extend existing `global.d.ts` and `materialize.d.ts` declarations, and add declaration merging for prototype extensions. This is a types-only change with no behavioral modifications — the goal is to bring the frontend from "syntactic TypeScript" (renamed `.ts` files with implicit `any` everywhere) to genuine type safety enforced by the compiler.

**Critical discovery**: `tsconfig.web.json` inherits `exclude: ["src/web/**/*.ts"]` from the base `tsconfig.json`, which means `tsc --noEmit -p tsconfig.web.json` currently compiles only 3 files (pulled in transitively via `global.d.ts` imports). The other 44 files are silently excluded. When all web files are actually compiled, there are **~1,856 errors** (423 implicit-any, 937 property-not-found, 110 cannot-find-name, ~386 null-safety violations). Fixing the tsconfig is a prerequisite for all other work.

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022, browser environment
**Primary Dependencies**: Vite 7.x (build), MaterializeCSS 1.0.0 (CDN, UI library)
**Storage**: N/A (frontend only; API calls via HttpService)
**Testing**: No frontend unit tests exist; validation is `tsc --noEmit -p tsconfig.web.json` + Vite build
**Target Platform**: Browser (ES2022, DOM, DOM.Iterable)
**Project Type**: Web application — frontend portion of monorepo
**Performance Goals**: N/A (types-only change, no runtime impact)
**Constraints**: Zero behavioral changes; all runtime behavior must remain identical
**Scale/Scope**: 47 `.ts` files in `src/web/js/`, ~12,000 lines of frontend code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Types-only changes are the minimum needed to satisfy the type safety requirement. No new abstractions introduced. |
| II. Data Consistency | PASS | No changes to entity shapes. Shared models in `src/models/shared/` are already typed. |
| III. Single Serialization Path | N/A | No model serialization changes. |
| IV. Uniform API Responses | N/A | No API changes. |
| V. Single Data Fetch Pattern | PASS | HttpService is already well-typed; this feature ensures callers are also typed. |
| VI. No Dead Code | PASS | FR-009 consolidates duplicated `formatDateTime`. No new dead code introduced. |
| VII. Shared Models Are the Contract | PASS | Shared models are already TypeScript; this feature makes the frontend consumers type-safe. |
| VIII. Role-Based Architecture | N/A | No role/permission changes. |
| IX. Trimester-Aware by Default | N/A | No trimester logic changes. |
| X. Google Sheets Is the Database | N/A | No database changes. |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/008-frontend-type-hardening/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output (verification scenarios)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── types/                          # Type declaration files
│   ├── global.d.ts                 # Window interface augmentation (EXTEND)
│   ├── materialize.d.ts            # MaterializeCSS types (EXTEND if needed)
│   └── express.d.ts                # Server-side (NO CHANGE)
├── web/
│   └── js/
│       ├── main.ts                 # Entry point (NO CHANGE — already typed)
│       ├── viewModel.ts            # Central orchestrator (TYPE — US5)
│       ├── constants.ts            # App constants (TYPE — US2)
│       ├── feedback.ts             # Feedback modal (TYPE — US3)
│       ├── core/
│       │   ├── baseTab.ts          # Abstract tab base (NO CHANGE — already typed)
│       │   └── tabController.ts    # Tab lifecycle (NO CHANGE — already typed)
│       ├── tabs/                   # 8 tab files (TYPE — US4)
│       ├── components/             # UI components (TYPE — US3)
│       │   └── registrationForm/   # 6 form sub-components (TYPE — US3)
│       ├── workflows/              # Registration form workflows (TYPE — US5)
│       │   ├── adminRegistrationForm.ts
│       │   └── parentRegistrationForm.ts
│       ├── data/
│       │   ├── httpService.ts      # API client (NO CHANGE — already typed)
│       │   └── indexedDbClient.ts  # IndexedDB wrapper (TYPE — US3)
│       ├── utilities/              # Helper functions (TYPE — US1)
│       │   └── registrationForm/   # Form-specific helpers (TYPE — US1)
│       ├── extensions/             # Prototype extensions (TYPE — US1)
│       └── constants/              # Feature constants (TYPE — US2)
├── models/shared/                  # Shared models (NO CHANGE — already typed)
└── utils/                          # Shared utilities (NO CHANGE — already typed)

tsconfig.web.json                   # Frontend TS config (FIX exclude — Phase 1/Setup)
```

**Structure Decision**: Existing monorepo structure. All changes are in-place type annotations on existing files plus extending existing `.d.ts` files. No new directories. The only new artifact is declaration merging for prototype extensions (added to `global.d.ts` or a new `extensions.d.ts`).

## Key Technical Decisions

### D1: Fix tsconfig.web.json exclude inheritance

The base `tsconfig.json` has `exclude: ["src/web/**/*.ts"]` to prevent the server-side compilation from picking up browser files. `tsconfig.web.json` extends the base but doesn't override `exclude`, so it inherits this exclusion — meaning `tsc -p tsconfig.web.json` silently skips all web files.

**Fix**: Add `"exclude": ["node_modules", "dist"]` to `tsconfig.web.json` to override the inherited exclusion. This is the single most important change — without it, no type annotations are compiler-verified.

### D2: Incremental error resolution strategy

With ~1,856 errors appearing when web files are actually compiled, fixing everything at once is impractical. The strategy is bottom-up by dependency:

1. Fix tsconfig (errors become visible)
2. Extend global.d.ts + add prototype declarations (eliminates ~937 property-not-found + ~110 cannot-find-name errors)
3. Type utilities (eliminates errors in leaf modules)
4. Type components (eliminates errors in mid-level modules)
5. Type tabs (eliminates errors in tab layer)
6. Type workflows + viewModel (eliminates remaining errors)

Each phase should produce a compilable state — not necessarily zero errors, but monotonically decreasing.

### D3: DOM element typing approach

Three patterns for `document.getElementById` null-safety:

- **Non-null assertion** (`getElementById('known-id')!`) — use when element is statically guaranteed in `index.html`
- **Optional chaining** (`element?.style.display`) — use when element may be conditionally present
- **Generic querySelector** (`querySelector<HTMLInputElement>('.selector')`) — use for typed element access

Prefer the simplest option per call site. Do not add runtime null guards where the element is guaranteed to exist in the static HTML.

### D4: Existing global.d.ts and materialize.d.ts

These files already exist with partial coverage:

- `global.d.ts` declares `window.M`, `window.UserSession`, `window.AccessCodeManager`, phone helpers, constants, etc. — but uses `Record<string, unknown>` and escape hatches (`ViewModelType` with index signature) rather than concrete types. Several globals are declared as `unknown` (`Table`, `Select`, `NavTabs`, `DomHelpers`, `DurationHelpers`, `PromiseHelpers`, `IndexedDbClient`).
- `materialize.d.ts` has good coverage of Modal, Autocomplete, FormSelect, Tabs, toast, updateTextFields.
- Missing from global.d.ts: `window.viewModel` (lowercase instance), `window.tabController`, `window.loginModal`, `window.loginModalInstance`, `window.termsModal`, `window.termsModalInstance`, `window.privacyModal`, `window.privacyModalInstance`, `window.termsOnConfirmationCallback`, `window.TONIC_ENV`, `window.overrideMaintenanceMode`, `window.clearServerCache`.

The plan is to **extend** these files with concrete types as each class gets typed, then replace the `unknown` placeholders with proper class types.

### D5: Prototype extension declarations

`String.prototype.capitalize` and `Number.prototype.formatGrade`/`formatTime` need TypeScript declaration merging:

```typescript
// In global.d.ts or extensions.d.ts
interface String {
  capitalize(): string;
}
interface Number {
  formatGrade(): string;
  formatTime(): string;
}
```

`Duration.prototype.to12HourFormat`/`to24HourFormat` (added in `durationExtensions.ts`) also need declarations.

### D6: No frontend tests

There are no frontend unit tests. Validation is:
1. `tsc --noEmit -p tsconfig.web.json` — zero errors
2. `npm run build:frontend` (Vite build) — success
3. Manual smoke test — admin/instructor/parent login flows work

## Complexity Tracking

> No Constitution violations to justify.

No entries needed.
