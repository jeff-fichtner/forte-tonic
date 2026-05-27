# Feature Specification: Frontend Type Hardening

**Feature Branch**: `008-frontend-type-hardening`
**Created**: 2026-02-23
**Status**: Partial
**Input**: User description: "draw up next spec to migrate frontend to typescript"

## Context

The frontend codebase (`src/web/js/`) was converted from JavaScript to TypeScript files (`.js` → `.ts`) during the 002-typescript-migration. However, the migration was syntactic — 47 files were renamed and `tsconfig.web.json` was added with `strict: true`, but the vast majority of code retains implicit `any` typing. Method parameters, return types, class properties, and DOM interactions are untyped across ~80% of the frontend source.

**Critical tsconfig bug**: `tsconfig.web.json` inherits `exclude: ["src/web/**/*.ts"]` from the base `tsconfig.json`, which means `tsc --noEmit -p tsconfig.web.json` silently skips 44 of 47 web files. The current "passing" tsc is illusory. When web files are actually compiled, there are **~1,856 errors**.

**Current state by the numbers:**
- **47 `.ts` files** in `src/web/js/`
- **~1,856 tsc errors** when web files are actually compiled (currently hidden by tsconfig bug)
- **~423 implicit-any errors** (untyped method parameters)
- **~937 property-not-found errors** (window globals, event.target, DOM element properties)
- **~110 cannot-find-name errors** (bare M references, undeclared globals)
- **~386 null-safety violations** (document.getElementById returning null)
- Existing `global.d.ts` has partial coverage — many globals declared as `unknown`
- Existing `materialize.d.ts` has good coverage of M API
- **5 prototype extensions** (`String.prototype.capitalize`, `Number.prototype.formatGrade`, `Number.prototype.formatTime`, `Duration.prototype.to12HourFormat`, `Duration.prototype.to24HourFormat`) with no declaration merging
- **0 explicit `any` keywords** — the team avoided writing `any` but also avoided writing types at all

**Worst offenders by file size:**
- `parentRegistrationForm.ts` — 3,529 lines, ~55 untyped methods, all parameters untyped
- `viewModel.ts` — 1,373 lines, ~15 untyped methods, no class property declarations
- `adminMasterScheduleTab.ts` — 782 lines, 9 untyped parameters
- `parentWeeklyScheduleTab.ts` — 758 lines, 16 untyped parameters
- `navTabs.ts` — 564 lines, all methods untyped
- `adminRegistrationForm.ts` — 516 lines, all methods untyped

**Well-typed files (no work needed):**
- `baseTab.ts`, `tabController.ts`, `httpService.ts`, `modalKeyboardHandler.ts`, `phoneHelpers.ts`, `main.ts`

## User Scenarios & Testing

### User Story 1 — Type All Utility and Extension Files (Priority: P1)

Add TypeScript annotations to all utility functions, helper modules, and prototype extensions in `src/web/js/utilities/` and `src/web/js/extensions/`. Create type declarations for prototype extensions so TypeScript recognizes `String.prototype.capitalize()` and `Number.prototype.formatGrade()`.

**Why this priority**: Utilities are imported across the entire frontend. Typing them first establishes correct parameter and return types that propagate to all callers, making subsequent stories easier. These are the smallest files (~7–142 lines each) with the most widespread impact.

**Independent Test**: Run `tsc --noEmit -p tsconfig.web.json` — all utility files compile cleanly with no implicit `any` on their exported signatures. Prototype extensions are recognized by TypeScript on string and number literals.

**Acceptance Scenarios**:

1. **Given** a utility function like `timeHelpers.ts:formatDisplayTime(time24)`, **When** a developer hovers over the function in an IDE, **Then** the parameter type (`string`) and return type (`string`) are displayed without `any`.
2. **Given** `stringExtensions.ts` extends `String.prototype.capitalize`, **When** `"hello".capitalize()` is written in a `.ts` file under `tsconfig.web.json`, **Then** TypeScript recognizes the method without error and shows the return type as `string`.
3. **Given** all utility functions have typed signatures, **When** a caller passes the wrong type (e.g., a number to `capitalize`), **Then** `tsc` reports a type error.

---

### User Story 2 — Declare Window Globals and MaterializeCSS Types (Priority: P2)

Extend the existing `global.d.ts` to augment the `Window` interface with all globals used across the frontend that are currently missing or typed as `unknown`: `viewModel` (instance), `tabController`, `TONIC_ENV`, modal instances, and all other `window.*` assignments found in `constants.ts` and throughout the codebase. Strengthen existing declarations that use `Record<string, unknown>` or `unknown` placeholders with concrete types. Verify that the existing `materialize.d.ts` covers all MaterializeCSS API surface actually used.

**Why this priority**: Every tab and component reads from `window.*` globals. Without declarations, all global access is implicit `any`, undermining type safety in all other files. This is a prerequisite for meaningful typing of tabs and components.

**Independent Test**: Run `tsc --noEmit -p tsconfig.web.json`. All `window.UserSession`, `window.viewModel`, `window.M.toast(...)`, etc. references compile without `any` inference. IDE autocomplete works for `window.M.Modal.init(...)`.

**Acceptance Scenarios**:

1. **Given** `global.d.ts` declares `window.UserSession` with its actual shape, **When** a tab accesses `window.UserSession.getCurrentPeriod()`, **Then** the return type is known to TypeScript (not `any`).
2. **Given** `window.M` is declared with MaterializeCSS types, **When** `window.M.toast({ html: 'msg' })` is called, **Then** TypeScript validates the argument shape.
3. **Given** `window.viewModel` is declared, **When** a new property is accessed that doesn't exist on the type, **Then** `tsc` reports an error.

---

### User Story 3 — Type Component Classes (Priority: P3)

Add type annotations to all class properties, constructor parameters, method parameters, and return types in `src/web/js/components/` (6 registration form sub-components, `navTabs.ts`, `dropRequestModal.ts`, `select.ts`, `table.ts`) and `src/web/js/data/indexedDbClient.ts`. Fix DOM element type narrowing — `document.querySelectorAll` results used as `HTMLInputElement`/`HTMLSelectElement` must be properly cast or use generic overloads.

**Why this priority**: Components are reused by tabs and workflows. Typing them provides correct signatures that propagate upward to their callers (tabs, viewModel, form workflows).

**Independent Test**: Run `tsc --noEmit -p tsconfig.web.json`. All component classes have fully typed public APIs. A caller passing incorrect arguments to a component constructor gets a compile error.

**Acceptance Scenarios**:

1. **Given** `Select` constructor parameters are typed, **When** a caller passes a number where a string element ID is expected, **Then** `tsc` reports a type error.
2. **Given** `indexedDbClient.ts` methods are typed, **When** `getAll(storeName, mapFunction)` is called, **Then** the return type reflects the map function's output type (generic).
3. **Given** `transportationSelector.ts` stores radio buttons, **When** `this.radioButtons` is accessed, **Then** its type is `NodeListOf<HTMLInputElement>` (not `NodeListOf<Element>`), and `.value`, `.checked` are valid properties.

---

### User Story 4 — Type Tab Classes (Priority: P4)

Add type annotations to all 8 tab files in `src/web/js/tabs/`. This includes `fetchData` parameters and return types, all private method signatures, `event.target` narrowing in event handlers, and proper DOM element typing for `querySelector`/`getElementById` results. Declare class instance properties with correct types.

**Why this priority**: Tabs are the primary application logic files. They depend on typed utilities (US1), globals (US2), and components (US3) being in place first. They are also the largest group of files by count.

**Independent Test**: Run `tsc --noEmit -p tsconfig.web.json`. All tab methods have explicit parameter and return types. Event handlers narrow `event.target` to the correct element type.

**Acceptance Scenarios**:

1. **Given** `adminMasterScheduleTab.ts:fetchData(sessionInfo)` is typed, **When** a developer reads the signature, **Then** the `sessionInfo` parameter type and `Promise<void>` return type are explicit.
2. **Given** `parentWeeklyScheduleTab.ts` uses `event.target` in dropdown handlers, **When** the handler accesses `event.target.value`, **Then** TypeScript knows `event.target` is `HTMLSelectElement` (narrowed via cast or type guard).
3. **Given** `employeeDirectoryTab.ts` maps admins/instructors to employee objects, **When** the mapping functions return objects, **Then** the return type is a declared `EmployeeDisplay` interface (or equivalent), not an implicit anonymous object type.

---

### User Story 5 — Type Workflow Classes and ViewModel (Priority: P5)

Add type annotations to the three largest untyped files: `parentRegistrationForm.ts` (3,529 lines), `adminRegistrationForm.ts` (516 lines), and `viewModel.ts` (1,373 lines). This includes all class properties, all method parameters, all return types, and DOM/event type narrowing throughout. Extract interfaces for complex parameter objects and callback signatures.

**Why this priority**: These are the largest and most complex files. They depend on all other typing work (utilities, globals, components, tabs) being substantially complete. Typing them last minimizes churn from upstream type changes.

**Independent Test**: Run `tsc --noEmit -p tsconfig.web.json`. All three files have zero implicit `any` on any method signature. `viewModel.ts` class properties are all explicitly declared with types.

**Acceptance Scenarios**:

1. **Given** `parentRegistrationForm.ts` constructor parameters are typed, **When** the constructor is called with wrong argument types, **Then** `tsc` reports errors.
2. **Given** `viewModel.ts` declares all instance properties, **When** a new property assignment `this.newProp = x` is added without a declaration, **Then** `tsc` reports an error.
3. **Given** callback parameters like `onSuccessfulLogin` in `viewModel.ts` are typed, **When** a caller passes a callback with wrong signature, **Then** `tsc` reports a type error.

---

### Edge Cases

- What happens when a `document.getElementById` call returns `null` at runtime? — Existing code does not null-check most calls. This spec focuses on making TypeScript aware of the nullability; whether to add runtime guards is a separate concern. Where a null return would crash at runtime, a non-null assertion (`!`) with a comment is acceptable if the element is guaranteed to exist in the HTML. Prefer optional chaining (`?.`) where the element may legitimately be absent.
- What about the `as unknown as` cast in `tabController.ts`? — This cast was already assessed in 007 and declared acceptable. It remains as-is.
- What about the duplicated `formatDateTime` in `adminWaitListTab.ts` and `parentWeeklyScheduleTab.ts`? — Consolidate to a single typed utility function during US1.
- What about `constants.ts` with 11 `window.*` assignments? — These assignments remain (they are how the app bootstraps globals). US2 ensures they are type-declared. No refactoring of the global pattern itself is in scope.

## Requirements

### Functional Requirements

- **FR-001**: All exported function signatures in `src/web/js/utilities/` MUST have explicit TypeScript parameter types and return types.
- **FR-002**: All prototype extensions (`String.prototype.capitalize`, `Number.prototype.formatGrade`, `Number.prototype.formatTime`) MUST have corresponding TypeScript declaration merging in a `.d.ts` file included by `tsconfig.web.json`.
- **FR-003**: A `global.d.ts` (or equivalent) MUST augment the `Window` interface with type declarations for all `window.*` globals used across the frontend codebase.
- **FR-004**: MaterializeCSS API surface (`M.Modal`, `M.FormSelect`, `M.Autocomplete`, `M.Tabs`, `M.toast`, `M.updateTextFields`) MUST be declared in a local `.d.ts` file with the method signatures actually used.
- **FR-005**: All class properties in component, tab, workflow, and viewModel classes MUST have explicit type declarations (not inferred from constructor assignment to `null`).
- **FR-006**: All method parameters and return types in all `src/web/js/` files MUST have explicit TypeScript annotations. No method signature may rely on implicit `any`.
- **FR-007**: DOM element access via `getElementById` or `querySelector` MUST use proper TypeScript type narrowing — either generic overloads (`querySelector<HTMLInputElement>(...)`), type assertions, or non-null assertions with comments explaining why null is impossible.
- **FR-008**: Event handler `event.target` access MUST narrow to the correct element type (e.g., `HTMLSelectElement`, `HTMLInputElement`) before accessing element-specific properties like `.value`, `.checked`, or `.selectedOptions`.
- **FR-009**: Duplicated `formatDateTime` logic between `adminWaitListTab.ts` and `parentWeeklyScheduleTab.ts` MUST be consolidated into a single typed utility function.
- **FR-010**: `tsc --noEmit -p tsconfig.web.json` MUST pass with zero errors after all changes.
- **FR-011**: The Vite dev build (`npm run dev`) and production build (`npm run build:frontend`) MUST succeed after all changes.
- **FR-012**: No behavioral changes — all runtime behavior MUST remain identical. This is a types-only change (with the exception of FR-009 consolidation, which is a safe refactor).

### Assumptions

- The existing `tsconfig.web.json` inherits `exclude: ["src/web/**/*.ts"]` from the base `tsconfig.json`, which silently excludes 44 of 47 web files from compilation. The first implementation step is fixing this so `tsc` actually compiles all web files. Once fixed, `strict: true` (including `noImplicitAny`) will enforce type annotations across all 47 files.
- `src/web/js/main.ts`, `baseTab.ts`, `tabController.ts`, `httpService.ts`, `modalKeyboardHandler.ts`, and `phoneHelpers.ts` are already well-typed and need no changes.
- The `materialize.d.ts` file in `src/types/` may already partially cover MaterializeCSS. If so, it should be extended rather than duplicated.
- The `feedback.ts` file (159 lines) is classified with components (US3) for typing purposes.

## Success Criteria

### Measurable Outcomes

- **SC-001**: `tsc --noEmit -p tsconfig.web.json` passes with zero errors and zero implicit `any` on any exported or public method signature.
- **SC-002**: Zero `document.getElementById` calls where the result is used without null handling (either optional chaining, null check, or documented non-null assertion).
- **SC-003**: Zero `event.target.value` or `event.target.checked` accesses without prior type narrowing to the correct `HTML*Element` type.
- **SC-004**: All `window.*` global accesses resolve to a declared type (not `any`) when checked via IDE hover or `tsc` diagnostics.
- **SC-005**: Vite production build succeeds and produces identical runtime behavior (verified by manual smoke test of admin, instructor, and parent login flows).
- **SC-006**: The `formatDateTime` utility exists in exactly one location, imported by both files that previously had copies.
