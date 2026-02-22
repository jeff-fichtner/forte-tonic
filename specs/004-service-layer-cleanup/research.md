# Research: 004 — Service Layer Cleanup

No unknowns identified. All technical decisions are based on existing codebase patterns.

## Decisions

### D-1: Query Service Filter Design — Primitive Filters

**Decision**: Each query service method accepts single-entity filters. Cross-entity chains (e.g., parent → students → registrations → instructors) are composed by the caller, not hidden inside the query service.

**Rationale**: Primitive filters are independently testable, reusable across tabs with different chain requirements, and avoid embedding business logic in the query layer. Each filter method maps cleanly to a future SQL WHERE clause.

**Alternatives considered**:
- Compound methods (e.g., `getInstructorsForParent({ parentId, trimester })`): Rejected because they encode specific cross-entity knowledge, are less reusable, and would need to be duplicated for slight variations (e.g., with/without trimester scoping).

### D-2: EntityQueryService Placement

**Decision**: New file at `src/services/entityQueryService.ts`, registered in the service container as `'entityQueryService'`.

**Rationale**: Follows existing service patterns (extends `BaseService`, takes repositories via constructor, registered as singleton in container). No new directories or patterns introduced.

**Alternatives considered**:
- Adding filter methods directly to repositories: Rejected because some filters require access to multiple repositories (e.g., `getRegistrations` needs `registrationRepository` which itself uses `periodService`). A service that composes across repositories is the right layer.
- Creating a `TabDataService` with per-tab methods: Rejected because this would recreate the current problem (one method per tab with bespoke logic). Primitive entity fetchers are more composable.

### D-3: Time Parsing Deduplication

**Decision**: Replace `#parseTime()` and `#formatTimeFromMinutes()` in `RegistrationApplicationService` with `DateHelpers.parseTimeString(str).totalMinutes` and `new TonicDuration(minutes).to24Hour()`.

**Rationale**: `DateHelpers` already handles both HH:MM and AM/PM formats. The private methods in `RegistrationApplicationService` duplicate this logic. `TonicDuration` provides the exact reverse operation (minutes → HH:MM string).

**Alternatives considered**: None — this is a straightforward deduplication.
