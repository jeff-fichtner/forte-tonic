# Feature Specification: TypeScript Migration

**Feature Branch**: `002-typescript-migration`
**Created**: 2026-02-20
**Status**: Draft
**Input**: User description: "TypeScript migration - Convert the entire Tonic codebase from plain JavaScript (ESM) to TypeScript"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Gets Type Errors on Invalid Code (Priority: P1)

A developer working on the Tonic codebase writes code that passes an incorrect argument type to a model constructor, accesses a nonexistent property, or returns the wrong shape from a service method. The TypeScript compiler catches this at build time before the code ever runs.

**Why this priority**: Type safety at compile time is the primary value proposition of the migration. Without this, the migration has no purpose.

**Independent Test**: Introduce a deliberate type error (e.g., passing a number where a string is expected) and confirm the compiler reports it. The entire existing test suite (544 tests) continues to pass after migration.

**Acceptance Scenarios**:

1. **Given** a developer modifies a model constructor call with an incorrect property type, **When** they run the TypeScript compiler, **Then** the compiler reports a type error with the specific file, line, and expected type.
2. **Given** a developer accesses a property that does not exist on a model, **When** they run the TypeScript compiler, **Then** the compiler reports the property as not existing on that type.
3. **Given** the fully migrated codebase with no intentional errors, **When** the developer runs the type checker, **Then** zero type errors are reported.

---

### User Story 2 - Existing Application Behavior Is Preserved (Priority: P1)

After the migration, every API endpoint, every frontend interaction, and every background process behaves identically to the pre-migration JavaScript version. No user-facing behavior changes.

**Why this priority**: Equal to P1 with type safety — a migration that breaks existing functionality is unacceptable.

**Independent Test**: Run the full test suite (unit + integration). Run the frontend build. Start the server and verify all API endpoints respond with the same envelope format. Verify the frontend loads and renders correctly.

**Acceptance Scenarios**:

1. **Given** the migrated codebase, **When** the full test suite runs, **Then** all 544 existing tests pass without modification to test assertions or expected values.
2. **Given** the migrated codebase, **When** the frontend is built, **Then** the build succeeds and produces the same output structure.
3. **Given** the migrated codebase, **When** the server starts, **Then** all API endpoints return responses in the `{ success, data }` envelope format.

---

### User Story 3 - Developer Gets IDE Autocompletion and Navigation (Priority: P2)

A developer opens the Tonic project in a TypeScript-aware editor. They get autocompletion for model properties, can jump-to-definition on service methods, and see inline type information on hover.

**Why this priority**: IDE support is a major productivity benefit but is a natural consequence of P1 — if types compile, editors use them automatically.

**Independent Test**: Open any controller file, hover over a model instance, and confirm property names and types are displayed. Use "Go to Definition" on a service method call and confirm it navigates to the correct file and line.

**Acceptance Scenarios**:

1. **Given** a developer opens a controller file, **When** they hover over a model property access, **Then** the IDE displays the property's type.
2. **Given** a developer opens a frontend tab file, **When** they type a model variable followed by `.`, **Then** the IDE suggests all available properties and methods.

---

### User Story 4 - Build Pipeline Works End-to-End (Priority: P1)

The existing npm scripts (`start`, `dev`, `test`, `build:frontend`, `build:staging`, `lint`, `format`) all work correctly with the TypeScript codebase. No manual compilation step is required beyond what the scripts handle.

**Why this priority**: If the build pipeline is broken, no one can develop, test, or deploy.

**Independent Test**: Run each npm script and confirm it succeeds.

**Acceptance Scenarios**:

1. **Given** the migrated codebase, **When** a developer runs the start command, **Then** the server starts and serves the application.
2. **Given** the migrated codebase, **When** a developer runs the test command, **Then** all tests execute and pass.
3. **Given** the migrated codebase, **When** a developer runs the frontend build, **Then** the bundler builds the frontend bundle successfully.
4. **Given** the migrated codebase, **When** a developer runs the linter, **Then** all source files are processed without configuration errors.

---

### Edge Cases

- What happens when a shared model is imported by both the backend and the frontend? The type system must compile for both targets.
- How are untyped external library responses (e.g., raw spreadsheet data returned as arrays) handled? The database layer must type-narrow from raw data to typed models.
- How are the `fromDatabaseRow(row)` factory methods typed given they accept untyped arrays? Row arrays are typed as `string[]` and narrowed within the factory.
- How are third-party UI library globals typed in frontend code? A minimal type declaration file covers the used subset.
- How do test mocking patterns work with typed modules? Mock types must remain compatible with real module types.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All source files in `src/` MUST be converted from JavaScript to TypeScript with type annotations
- **FR-002**: All test files in `tests/` MUST be converted from JavaScript to TypeScript
- **FR-003**: Every model class MUST have a corresponding interface defining its data shape (constructor input and serialized output)
- **FR-004**: Every repository, service, and controller method MUST have typed parameters and return types
- **FR-005**: The database layer MUST type its row data as string array inputs and return typed model instances
- **FR-006**: Frontend code MUST have type declarations for browser globals used by third-party libraries
- **FR-007**: The frontend HTTP service MUST use generics so callers specify expected response types
- **FR-008**: The project MUST compile cleanly with strict type checking enabled
- **FR-009**: The frontend bundler MUST be configured to process TypeScript files
- **FR-010**: The test runner MUST be configured to execute TypeScript test files
- **FR-011**: The linter MUST be configured with TypeScript-aware parsing and rules
- **FR-012**: Code formatting MUST continue to work on TypeScript files
- **FR-013**: The server MUST run TypeScript without a separate manual compile step
- **FR-014**: No runtime behavior MUST change — this is a type-safety-only migration
- **FR-015**: Shared models MUST remain importable by both backend and frontend code paths

### Key Entities

- **Model Interfaces**: Interfaces matching each model's constructor input shape (e.g., `StudentData`, `AdminData`, `RegistrationData`)
- **API Response Types**: Generic response envelope type matching `{ success, data }` and `{ success, error }` patterns
- **Database Row Types**: Typed arrays for each sheet's column layout
- **Service Container Types**: Interface defining all registered services and their types

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Type checker reports zero errors when run against the full codebase with strict checking enabled
- **SC-002**: All 544 existing tests pass after migration with no changes to test logic, assertions, or expected values (file format and import path changes are expected)
- **SC-003**: Frontend build completes successfully and produces functionally identical output
- **SC-004**: Server starts and all API endpoints respond correctly (verified by integration tests)
- **SC-005**: Zero `any` types except at documented external boundaries (Google Sheets API responses, MaterializeCSS globals); each instance requires a comment explaining why
- **SC-006**: All npm scripts (`start`, `dev`, `test`, `lint`, `format`, `build:frontend`, `build:staging`) execute successfully

## Clarifications

### Session 2026-02-20

- Q: Should the spec define a maximum acceptable count of `any` usages, or is the rule simply "zero `any` except at documented external boundaries"? → A: Zero `any` except at documented external boundaries (no numeric cap). Each instance requires a comment explaining why.

## Assumptions

- The current Node.js version supports modern TypeScript tooling
- Strict type checking is the target — including null checks, no implicit any, strict function types
- External dependencies have community type definitions available
- The migration is file-by-file rename and annotation — no restructuring of directories or module boundaries
- Test files are migrated alongside source files, not left as JavaScript
- Shell scripts in `scripts/` remain as shell scripts (not converted to TypeScript)
