# Feature Specification: Backend Complexity Reduction

**Feature Branch**: `007-backend-complexity-reduction`
**Created**: 2026-02-22
**Status**: Implemented
**Input**: User description: "Reduce unnecessary complexity across the backend codebase. Consolidate duplicated patterns, simplify over-engineered abstractions, improve type safety, and remove questionable assumptions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consolidate Duplicated Patterns (Priority: P1)

As a developer working on this codebase, I encounter the same logic repeated in multiple places. When a bug is found in one copy, the other copies remain broken. Consolidating duplicated patterns into single shared implementations reduces the surface area for bugs and makes the codebase easier to maintain.

**Why this priority**: Duplicated code is the highest-risk complexity — it actively causes bugs when one copy is updated and others are not. This directly violates Constitution Principle I ("one way to do each thing").

**Independent Test**: Can be verified by confirming that each previously-duplicated pattern now has exactly one implementation, all existing tests still pass, and no behavioral changes occur.

**Acceptance Scenarios**:

1. **Given** the registration repository has ~8 repetitions of the same fetch-parse-filter block, **When** a shared helper is extracted, **Then** each method delegates to the shared helper and all existing registration tests pass.
2. **Given** the drop request repository repeats fetch-all-then-filter logic in every query method, **When** a shared internal method is extracted, **Then** each query method uses the shared method and all drop request tests pass.
3. **Given** `_getNextTrimester` logic exists in both the period service and the user controller, **When** the logic is consolidated into one location, **Then** both callers use the same implementation and trimester cycling behavior is unchanged.
4. **Given** `RegistrationInput` is defined identically in two service files, **When** it is moved to a single shared location, **Then** both services import the same type and no type errors are introduced.
5. **Given** environment configuration is read by both `environment.ts` and `ConfigurationService`, **When** environment variable reading is consolidated, **Then** there is one canonical source for configuration and the other is removed or delegates to it.

---

### User Story 2 - Simplify Over-Engineered Abstractions (Priority: P2)

As a developer reading this codebase, I encounter unnecessary layers of indirection: error class hierarchies that duplicate existing error classes, pass-through factory methods, dual-mode constructors, and trivial accessor wrappers. These make the code harder to understand without providing value.

**Why this priority**: Over-engineering increases cognitive load for every developer who reads or modifies the code. This violates Constitution Principle I (minimum required) and Principle VII (single constructor(data) pattern).

**Independent Test**: Can be verified by confirming that each simplified pattern behaves identically to its predecessor, all tests pass, and no external API contract changes occur.

**Acceptance Scenarios**:

1. **Given** the drop request service defines 7 custom error classes that duplicate the common error module, **When** the custom hierarchy is replaced with the existing common error classes, **Then** error handling behavior (status codes, messages) is unchanged and all tests pass.
2. **Given** `Admin.fromApiData()`, `Instructor.fromApiData()`, and `Parent.fromApiData()` are one-line wrappers that call `new ClassName(data)`, **When** callers are updated to use the constructor directly, **Then** the factory methods are removed and all tests pass.
3. **Given** `AuthenticatedUserResponse` has a dual-mode constructor accepting either an object or positional arguments, **When** the constructor is simplified to the single `constructor(data)` pattern per Constitution Principle VII, **Then** all callers are updated and tests pass.
4. **Given** `AppConfigurationResponse` has dead accessor methods (`hasCurrentPeriod()`, `getPeriodType()`, etc.) with zero callers, **When** the methods are removed, **Then** no callers are affected and all tests pass.

---

### User Story 3 - Improve Type Safety (Priority: P3)

As a developer, I encounter 18 `as unknown as` double-casts spread across the codebase. These are escape hatches that bypass the type system, hiding real misalignments between data shapes at different layers. Fixing the underlying type misalignments eliminates the need for these casts.

**Why this priority**: Type casts hide bugs at compile time that surface at runtime. Fixing them improves correctness but requires careful analysis of data flow between layers, making it lower priority than the more straightforward deduplication and simplification work.

**Independent Test**: Can be verified by removing each cast, fixing the underlying type mismatch, and confirming the code compiles without errors and all tests pass.

**Acceptance Scenarios**:

1. **Given** the codebase contains 18 `as unknown as` double-casts across 9 files, **When** the underlying type misalignments are fixed, **Then** the double-casts are removed and the code compiles cleanly.
2. **Given** `BaseRepository.convertToModel` falls back to `data as T` (unchecked cast), **When** the fallback is replaced with an explicit mapping or the method requires a mapper function, **Then** the unsafe cast is eliminated.
3. **Given** `UserRepository` extends `BaseRepository<Record<string, unknown>>` despite managing 5 entity types, **When** the generic parameter is corrected or the class stops pretending to be generic, **Then** the type mismatch is resolved.

---

### User Story 4 - Address Questionable Assumptions and Vestigial Patterns (Priority: P4)

As a developer, I find hard-coded values, unnecessary browser-coupling in backend code, and leftover abstractions from earlier architectures that no longer serve a purpose. Addressing these removes confusion and prevents subtle bugs.

**Why this priority**: These items are lower risk individually but contribute to overall code confusion. They are safe to address after the higher-priority deduplication and simplification work.

**Independent Test**: Can be verified by confirming each change does not alter observable behavior (or improves it where an incorrect assumption was found) and all tests pass.

**Acceptance Scenarios**:

1. **Given** the attendance rate calculation hard-codes 12 as the total session count, **When** the hard-coded value is replaced with a configurable or derived value, **Then** attendance rates are calculated correctly regardless of actual session count.
2. **Given** backend model files assign classes to `window` for "console debugging," **When** these assignments are removed, **Then** backend models no longer reference browser globals and all backend tests pass.
3. **Given** `hasPermission` uses a prefix-based string check with no actual permission model, **When** the method is documented as intentionally simplified or removed, **Then** the authorization boundary is clear and explicit.
4. **Given** `IRepository<T>` has only one implementation (`BaseRepository<T>`), **When** the interface is removed and callers reference the concrete class, **Then** no functional change occurs and all tests pass.
5. **Given** `ServiceContainer` has unused methods (`has()`, `getServiceNames()`) and a `singleton` flag that all registrations use by default, **When** unused methods and the flag are removed, **Then** the container is simpler and all tests pass.

---

### Edge Cases

- What happens when callers of removed factory methods (`fromApiData`) are in shared model code that runs in both browser and Node.js? All callers must be updated to use `new ClassName(data)` directly; the constructor already accepts the same argument.
- What happens when the `AuthenticatedUserResponse` positional constructor form is used by frontend code? Frontend callers must be migrated to the object form before the positional form is removed.
- What happens when removing `window` global assignments breaks browser-side console debugging? These models are served to the browser via Express static serving; removing `window` assignments only removes a debug convenience, not production functionality.
- What happens when replacing the drop request error classes changes the error `name` property? The controller error handler matches on `statusCode`, not `name`; the replacement common errors preserve `statusCode` semantics.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST maintain identical observable behavior after all changes — same API responses, same error status codes, same business logic outcomes.
- **FR-002**: All existing tests MUST pass after each change (zero regressions).
- **FR-003**: The registration repository MUST have exactly one implementation of the fetch-parse-filter pattern, used by all query methods.
- **FR-004**: The drop request repository MUST have exactly one internal method for fetching and mapping all records, used by all query methods.
- **FR-005**: Trimester cycling logic (`_getNextTrimester`) MUST exist in exactly one location, with all callers using that single implementation.
- **FR-006**: The `RegistrationInput` type MUST be defined in exactly one file and imported by all consumers.
- **FR-007**: Environment configuration MUST be read from one canonical source, not two independent systems.
- **FR-008**: Drop request error handling MUST use the existing common error classes rather than a parallel hierarchy.
- **FR-009**: Model constructors MUST follow the single `constructor(data)` pattern per Constitution Principle VII.
- **FR-010**: `as unknown as` double-casts MUST be eliminated by fixing the underlying type misalignments.
- **FR-011**: The attendance rate calculation MUST not assume a fixed number of sessions per trimester.
- **FR-012**: Backend model files MUST NOT reference browser globals (`window`).
- **FR-013**: Removed methods and patterns MUST have all callers updated before removal — no dangling references.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero duplicated pattern implementations — each previously-duplicated block exists in exactly one place, verified by audit.
- **SC-002**: All existing tests pass with zero regressions after each user story is completed.
- **SC-003**: The number of `as unknown as` double-casts is reduced from 18 to zero.
- **SC-004**: Net line count decreases — the codebase is smaller after this work than before.
- **SC-005**: Zero references to browser globals (`window`) in backend model files.
- **SC-006**: The number of custom error classes in the drop request service is reduced from 7 to zero.
- **SC-007**: The codebase compiles cleanly with zero type errors after all changes.

## Assumptions

- `fromApiData` callers in frontend (browser) code can be updated to use `new ClassName(data)` directly since models are shared code.
- The `AuthenticatedUserResponse` positional constructor form is used in backend code only (service container wiring); frontend uses the object form. If frontend uses the positional form, those callers will be updated to use the object form.
- The `hasPermission` prefix-based approach is an intentional simplification for this application's scale (3 roles, no granular permissions), not a security vulnerability — it will be documented as intentional rather than replaced with a full RBAC system.
- The attendance session count (currently hard-coded to 12) can be derived from actual attendance records or made configurable without requiring database schema changes.
- Removing `window` global assignments will not break production functionality since these are debug-only conveniences.
