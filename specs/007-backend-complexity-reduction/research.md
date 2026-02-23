# Research: Backend Complexity Reduction

**Date**: 2026-02-22
**Branch**: `007-backend-complexity-reduction`

## R1: Registration Repository Pattern Duplication

**Decision**: Extract a private `_fetchRegistrations(tableName)` method that encapsulates the `getAllRecords` + `fromDatabaseRow` + null-filter boilerplate.

**Rationale**: 7 methods repeat the identical inline mapper. The constructor already defines a mapper at line 33 but methods ignore it. A single shared method eliminates 7 copies of the same boilerplate.

**Alternatives considered**: Using the constructor-defined mapper directly was considered, but `convertToModel` in `BaseRepository` has its own issues (unsafe `data as T` cast). A private helper on `RegistrationRepository` is the minimal change.

**Scope**: 7 methods in `registrationRepository.ts` — `getById`, `getByStudentId`, `getByInstructorId`, `getActiveRegistrations`, `getRegistrationsForTrimester`, `getFromTable`, `updateIntent`.

## R2: Drop Request Repository Pattern Duplication

**Decision**: Extract a private `_getAllDropRequests()` method that calls `getAllRecords` with the standard mapper once, then have `findById`, `findByParentId`, `findByStatus`, `findByRegistrationId`, and `findAll` use it.

**Rationale**: 5 methods independently fetch the entire table with the same mapper. A single shared method eliminates duplication.

**Alternatives considered**: Caching within the repository was considered but would add complexity. The DB client already has a 5-minute cache, so the performance impact is negligible.

## R3: `_getNextTrimester` Duplication

**Decision**: Keep the `PeriodService._getNextTrimester` implementation (which has validation) and have `UserController` import it. Add `_getPreviousTrimester` to `PeriodService` as well since `UserController` has one.

**Rationale**: `PeriodService` is the canonical owner of trimester cycle logic per Constitution Principle IX. The controller version silently returns `Fall` on invalid input (bug), while the service version throws (correct).

**Alternatives considered**: A standalone utility was considered, but `PeriodService` already owns trimester logic and is available via the service container.

## R4: `RegistrationInput` Type Duplication

**Decision**: Export the type from `registrationValidationService.ts` (which is the validation layer) and import it in `registrationApplicationService.ts`.

**Rationale**: The type is `RegistrationData & Record<string, unknown>`. The validation service is the canonical place for registration data shape definitions.

**Alternatives considered**: Creating a separate types file was considered but adds a file for a single type alias. Exporting from the existing validation service is simpler.

## R5: Environment Configuration Duplication

**Decision**: Make `environment.ts` the canonical source for environment-specific config objects (production, staging, development, test), and have `ConfigurationService.getServerConfig()` delegate to `environment.ts` instead of reading env vars independently.

**Rationale**: `environment.ts` already handles environment detection and per-environment defaults. `ConfigurationService` re-reads the same 7 env vars. Consolidating avoids the risk of one being updated without the other.

**Alternatives considered**: Removing `environment.ts` entirely was considered, but it provides structured per-environment config objects that `ConfigurationService` doesn't replicate. The config objects are used by `app.ts` directly.

## R6: Drop Request Error Classes → Common Errors

**Decision**: Replace all 7 custom error classes with the 5 existing common error classes (`NotFoundError`, `ValidationError`, `ForbiddenError`, `ConflictError`), passing descriptive messages.

**Mapping**:
| Custom Class | Status | Replacement |
|-------------|--------|-------------|
| `DropRequestError` (base) | 400 | `ValidationError` |
| `DropRequestNotFoundError` | 404 | `NotFoundError` |
| `UnauthorizedDropRequestError` | 403 | `ForbiddenError` |
| `InvalidPeriodError` | 400 | `ValidationError` |
| `DuplicateDropRequestError` | 409 | `ConflictError` |
| `RegistrationNotFoundError` | 404 | `NotFoundError` |
| `InvalidStatusTransitionError` | 400 | `ValidationError` |

**Rationale**: The custom classes add no behavior beyond a `statusCode` and `name`. The common errors carry the same `statusCode`. The controller error handler matches on `statusCode`, not class name.

**Impact**: Tests that `catch` and check `instanceof DropRequestError` need to check `instanceof ValidationError` (etc.) or check `statusCode` directly.

## R7: Dead Code Confirmed (Zero Callers)

The following items were identified as potential simplifications but are actually **dead code** with zero callers:

| Item | File | Confirmed Zero Callers |
|------|------|----------------------|
| `AppConfigurationResponse.hasCurrentPeriod()` | appConfigurationResponse.ts:75 | Yes |
| `AppConfigurationResponse.getPeriodType()` | appConfigurationResponse.ts:79 | Yes |
| `AppConfigurationResponse.getTrimester()` | appConfigurationResponse.ts:83 | Yes |
| `AppConfigurationResponse.isMaintenanceModeEnabled()` | appConfigurationResponse.ts:87 | Yes |
| `hasPermission()` | authenticatedUserResponse.ts:71 | Yes |
| `IRepository<T>` interface | baseRepository.ts:10 | Yes (exported but never imported) |
| `ServiceContainer.has()` | serviceContainer.ts:222 | Yes |
| `ServiceContainer.getServiceNames()` | serviceContainer.ts:229 | Yes |

**Note**: `Room.displayName` getter was initially considered dead code, but it's used by `toJSON()` and is part of the `RoomJSON` interface (API contract). Removing it would be a behavioral change.

**Decision**: Delete all 8 items as dead code (Constitution Principle VI). This is simpler than "simplifying" — they just get removed.

## R8: `fromApiData` — Minimal Callers

**Call sites**: Only 2 locations total:
1. `authenticatedUserResponse.ts:36-38` — calls `Admin.fromApiData()`, `Instructor.fromApiData()`, `Parent.fromApiData()`
2. `web/js/viewModel.ts:28` — calls `AppConfigurationResponse.fromApiData()`

**Decision**: Replace call sites with direct `new ClassName(data)` constructor calls, then delete the `fromApiData` methods.

## R9: `AuthenticatedUserResponse` Constructor — Single Caller

**Call sites**: Only 1 — `userController.ts:292-296` uses the positional form.

**Decision**: Convert the single caller to the object form `new AuthenticatedUserResponse({ email, admin, instructor, parent })`, then remove the positional branch from the constructor. This aligns with Constitution Principle VII (single `constructor(data)` pattern).

## R10: `window` Global Assignments

**3 files affected**:
1. `authenticatedUserResponse.ts:113-114` — writes to window
2. `appConfigurationResponse.ts:125-126` — writes to window
3. `class.ts:115` — reads from window (`DurationHelpers`)

**Decision**: Remove the 2 write assignments (debug convenience, not production functionality). The `class.ts` read is different — it's accessing a runtime helper. Research needed: is `DurationHelpers` ever assigned to `window`?

## R11: `as unknown as` Casts — By Category

**18 total, grouped by root cause:**

| Category | Count | Files | Root Cause |
|----------|-------|-------|-----------|
| `window` global access | 3 | authenticatedUserResponse, appConfigurationResponse, class | Browser global typing |
| Model `.toJSON()` → `Record<string, unknown>` | 3 | registrationRepository (×2), dropRequestRepository | `toJSON()` returns typed interface, storage API needs `Record` |
| Untyped data → model interface | 4 | registrationRepository, dropRequestRepository, attendanceRepository (×2) | Repository receives `Record<string, string>` from DB, needs typed shape |
| Service-layer data coercion | 4 | registrationApplicationService (×4) | Passing typed models where slightly different interfaces expected |
| Constructor parameter typing | 1 | userController | `AppConfigurationResponse` constructor parameter type mismatch |
| String → Date assumption | 2 | class.ts (×2) | Property typed as `Date` but actually receives strings |
| Frontend tab casting | 1 | tabController.ts | Tab instance type mismatch |

**Decision**: Fix by category:
- Remove 3 `window` casts by removing `window` assignments (R10)
- Fix `toJSON()` casts by adding `Record<string, unknown>` return type or using `{ ...obj.toJSON() }` spread
- Fix untyped-data casts by improving DB client return type or adding mapper functions
- Fix service-layer casts by aligning interface definitions
- Fix `class.ts` Date casts by correcting property types to `string`
- Leave `tabController.ts` cast (frontend, out of scope)

## R12: Hard-coded 12 Sessions

**Location**: `attendanceRepository.ts:172` — `(filtered.length / 12) * 100`

**Decision**: Derive the denominator from the actual number of scheduled sessions for that registration. The attendance records themselves contain date information; counting distinct scheduled dates gives the actual session count.

**Alternative considered**: A configuration value was considered but would need per-class granularity (some classes meet weekly for 12 weeks, others may differ). Deriving from data is more accurate.
