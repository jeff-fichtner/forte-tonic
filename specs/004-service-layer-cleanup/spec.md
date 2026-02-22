# 004 — Service Layer Cleanup

## Problem

Tab endpoints in controllers contain 50+ lines of inline data filtering/assembly logic each. The same filtering patterns (e.g., "get students for this parent", "get instructors who teach these students") are reimplemented per-tab with subtle inconsistencies. When a tab is added or modified, the data it returns depends on the developer remembering to include the right entities with the right filtering — there is no shared contract.

Additionally, the service layer contains dead code (unused methods, an unused service class) and duplicated utility logic that should be cleaned up.

### Current State

- **8 tab endpoints** across 3 roles (admin, instructor, parent), each hand-assembling data by fetching full datasets from repositories and filtering inline in the controller
- **Filtering inconsistencies**: e.g., instructor weekly schedule returns ALL instructors while parent weekly schedule filters to relevant ones; parent registration returns all instructors unfiltered
- **Dead code**: `Authenticator` service (0 production callers), 2 unused methods on `RegistrationApplicationService`, 3 unused methods on `RegistrationConflictService`
- **`ProgramValidationService`**: 1 method, 48 lines, only called from one place — too thin for its own file
- **Duplicated time parsing**: `RegistrationApplicationService` reimplements `#parseTime`/`#formatTimeFromMinutes` when `DateHelpers` already provides this
- **Noisy logging**: `RegistrationConflictService` logs per-iteration at `info` level during conflict checks

### Desired State

- Tab endpoints are thin: parse params, call service methods, return response
- Entity fetching with standard filters lives in a shared query layer — each filter combination is written once
- Dead code removed
- Services that are too thin are absorbed into their callers
- Logging is appropriate to severity level

## Scope

### In Scope

1. **Entity query service** — new service with reusable, filterable entity fetch methods
2. **Tab endpoint rewiring** — controllers call query service instead of inline filtering
3. **Dead code removal** — `Authenticator`, unused methods
4. **Absorb `ProgramValidationService`** — fold into `RegistrationApplicationService`
5. **Deduplicate time parsing** — use `DateHelpers` in `RegistrationApplicationService`
6. **Logging cleanup** — downgrade per-iteration conflict logging to `debug`
7. **Remove inline trimester sequence math** — Parent Registration tab reimplements `TRIMESTER_SEQUENCE` cycling; replace with `periodService.getNextTrimester()`

### Out of Scope

- Route pattern changes (that's 005)
- Model changes
- Database layer changes
- Frontend changes
- Changes to DropRequestService, PeriodService, RegistrationValidationService, ConfigurationService (these are clean)
- Moving Parent Contact and Parent Registration to accept trimester as route params (deferred to 005 — requires frontend changes)

## Functional Requirements

### FR-1: Entity Query Service

Create a service that provides filtered entity access with a consistent interface. Methods:

| Method | Filter Parameters | Returns |
|--------|------------------|---------|
| `getStudents(filters?)` | `{ parentId? }` | `Student[]` |
| `getInstructors(filters?)` | `{ instructorIds? }` | `Instructor[]` |
| `getRegistrations(filters?)` | `{ trimester, studentIds?, instructorId?, excludeWaitlist? }` | `Registration[]` |
| `getClasses()` | none | `Class[]` |
| `getAdmins()` | none | `Admin[]` |
| `getRooms()` | none | `Room[]` |

Filtering rules (single source of truth):
- `getStudents({ parentId })`: filter where `parent1Id === parentId || parent2Id === parentId`
- `getInstructors({ instructorIds })`: filter to instructors whose ID is in the provided set. The caller is responsible for extracting instructor IDs from registrations — the query service doesn't own cross-entity chains
- `getRegistrations({ trimester, studentIds })`: fetch by trimester, filter to registrations where `studentId` is in the provided set
- `getRegistrations({ trimester, instructorId, excludeWaitlist })`: fetch by trimester, filter by instructorId, optionally exclude waitlist registrations

When no filters are provided, return all records (same as current behavior for unfiltered tabs).

### FR-2: Tab Endpoint Rewiring

Each of the 8 tab endpoints must be rewritten to:
1. Parse request params (no change)
2. Call entity query service methods with appropriate filters
3. Return `successResponse(res, data)` (no change)

The response shape for each tab must remain identical — this is a refactor, not a behavior change.

Tab → query mapping:

| Tab | Entities | Filters |
|-----|----------|---------|
| Admin Master Schedule | registrations, students, instructors, classes | `{ trimester }` |
| Admin Registration | registrations, students, instructors, classes | `{ trimester }` |
| Admin Wait List | registrations, students | `{ trimester }` + waitlist class filter |
| Instructor Directory | admins, instructors | none |
| Instructor Weekly Schedule | registrations, students, instructors, classes | `{ trimester, instructorId, excludeWaitlist }` + student scoping |
| Parent Contact | admins, instructors | `{ parentId }` → student scoping → instructor scoping |
| Parent Weekly Schedule | registrations, students, instructors, classes | `{ trimester, parentId }` → student scoping |
| Parent Registration | registrations (current + next), students, instructors, classes | `{ parentId }` → student scoping, dual-trimester fetch |

### FR-3: Dead Code Removal

Delete with no replacement:
- `src/services/authenticator.ts` and its test file
- `RegistrationApplicationService.getRegistrationDetails()` (lines 404-442)
- `RegistrationApplicationService.getStudentRegistrations()` (lines 447-476)
- `RegistrationConflictService.checkScheduleConflicts()` (lines 212-233)
- `RegistrationConflictService.generateRegistrationId()` (lines 417-423)
- `RegistrationConflictService.isUniqueRegistrationId()` (lines 431-433)

### FR-4: Absorb ProgramValidationService

- Move `ProgramValidationService.validateRegistration()` logic into `RegistrationApplicationService` as a private method
- Delete `src/services/programValidationService.ts`
- Update imports in `RegistrationApplicationService`

### FR-5: Deduplicate Time Parsing

Replace `RegistrationApplicationService.#parseTime()` and `#formatTimeFromMinutes()` with equivalent `DateHelpers` methods in `#validateBusTimeRestrictions()`.

### FR-6: Logging Cleanup

In `RegistrationConflictService`:
- Change per-iteration `logger.info` calls inside `find()` callbacks to `logger.debug`
- Keep method-level entry/exit logging at `info`

### FR-7: Remove Inline Trimester Sequence Math

In `RegistrationController.getParentRegistrationTabData()` (lines 1048-1051), the controller imports `TRIMESTER_SEQUENCE` and manually computes the next trimester:
```typescript
const index = TRIMESTER_SEQUENCE.findIndex(t => t.toLowerCase() === currentTrimester.toLowerCase());
const nextTrimester = TRIMESTER_SEQUENCE[(index + 1) % TRIMESTER_SEQUENCE.length];
```

Replace with `periodService.getNextTrimester()`. Only `PeriodService` should own trimester sequence knowledge (Constitution IX). The `TRIMESTER_SEQUENCE` import stays in `registrationController.ts` because `getRegistrations()` (line 244) still uses it — but this method no longer does.

## Non-Functional Requirements

- All existing tests must pass after changes
- Tab endpoint response shapes must be byte-identical to current behavior (same keys, same filtering logic, same data)
- New query service methods must be unit-testable with mocked repositories

## User Stories

### US-1: Entity Query Service (P1)
As a developer, I can call `entityQueryService.getStudents({ parentId })` and get correctly filtered students, so that every tab using this filter gets the same result.

**Acceptance**: Query service exists, registered in container, all filter combinations produce correct results matching current tab behavior.

### US-2: Tab Endpoint Rewiring (P1)
As a developer, I can add a new tab by composing existing query methods, so that I don't need to reimplement filtering logic.

**Acceptance**: All 8 tab endpoints use query service, response shapes unchanged, no inline filtering in controllers.

### US-3: Dead Code Removal (P2)
As a developer, the codebase contains no unused service methods or classes.

**Acceptance**: `Authenticator` deleted, 5 unused methods removed, all tests pass.

### US-4: Service Consolidation (P2)
As a developer, `ProgramValidationService` logic is consolidated into its only caller.

**Acceptance**: `ProgramValidationService` file deleted, validation logic preserved in `RegistrationApplicationService`.

### US-5: Code Quality (P3)
As a developer, duplicated utility code and noisy logging are cleaned up.

**Acceptance**: Time parsing uses `DateHelpers`, conflict logging uses appropriate levels, `TRIMESTER_SEQUENCE` removed from `registrationController.ts` (replaced with `periodService.getNextTrimester()`).

## Trimester Source Notes

6 of 8 tab endpoints receive trimester as a route/query parameter from the frontend. Two exceptions:

- **Parent Contact**: Derives current + next trimester internally via `periodService`. No trimester in the route. Response is `{ admins, instructors }` — trimesters are an internal implementation detail.
- **Parent Registration**: Derives current + next trimester internally via `periodService`. No trimester in the route. Response returns `{ nextTrimesterRegistrations, currentTrimesterRegistrations, students, instructors, classes }`.

These two tabs derive trimesters server-side because they need dual-trimester data. Changing them to accept trimester params would require frontend changes (out of scope — deferred to 005 route cleanup). The EntityQueryService takes explicit trimester params regardless; the controller is responsible for obtaining the trimester value before calling it.

## Risks

- **Tab response regression**: The rewiring must produce identical responses. Integration tests against tab endpoints (if they exist) will catch regressions; manual verification may be needed for tabs without test coverage.
- **Cross-entity filtering complexity**: The "get instructors for a parent's students" query chains through students → registrations → instructors. Each tab endpoint composes primitive query service calls to build this chain — the composition logic must match current inline behavior exactly.
