# Feature Specification: Route & Endpoint Cleanup

**Feature Branch**: `005-route-cleanup`
**Created**: 2026-02-21
**Status**: Draft
**Input**: Deferred from spec 004 — standardize route patterns, move parent tabs to explicit trimester params, consolidate duplicate endpoints

## Problem

The API route layer has accumulated inconsistencies across three rounds of feature development:

1. **Trimester parameter delivery is inconsistent**: Admin tabs use route params (`/admin/tabs/wait-list/:trimester`), except Admin Registration which uses a query param (`/admin/tabs/registration?trimester=X`). Instructor tabs use query params. Parent Weekly Schedule uses a route param. Parent Contact and Parent Registration derive trimesters server-side with no client param at all.

2. **Two parent tabs derive trimesters internally**: Parent Contact and Parent Registration call `periodService` to determine current/next trimester. This couples the backend to "now" — the frontend cannot request data for a specific trimester, and these endpoints cannot be cached, retried with explicit params, or tested deterministically without mocking time.

3. **Duplicate attendance endpoints**: Three POST endpoints exist for attendance operations (`/attendance`, `/recordAttendance`, `/removeAttendance`) — a mix of legacy and current patterns.

4. **Non-RESTful verb-based routes**: `/authenticateByAccessCode`, `/testConnection`, `/testSheetData`, `/recordAttendance`, `/removeAttendance` use verb-based naming instead of resource-based patterns.

## User Scenarios & Testing

### User Story 1 — Standardize Trimester Delivery for Parent Tabs (Priority: P1)

As a developer, I want all tab endpoints to accept trimester as an explicit parameter so that every tab follows the same data-fetching pattern and the frontend controls which trimester to display.

**Why this priority**: This is the primary work deferred from spec 004. It eliminates server-side trimester derivation from tab endpoints, making them stateless and testable. It also requires frontend changes (the only user story that does), making it the most complex piece.

**Independent Test**: Parent Contact and Parent Registration tabs load the correct data when the frontend passes an explicit trimester value. Existing behavior is preserved — the frontend determines the trimester(s) to request rather than the backend.

**Acceptance Scenarios**:

1. **Given** a parent user viewing the Contact tab, **When** the frontend requests contact data with an explicit trimester, **Then** the backend returns admins and instructors relevant to that trimester's registrations without calling `periodService`.
2. **Given** a parent user viewing the Registration tab, **When** the frontend requests registration data with explicit current and next trimester values, **Then** the backend returns registration data for both trimesters using the provided values.
3. **Given** the frontend needs dual-trimester data for Parent Registration, **When** it loads the tab, **Then** it makes two separate requests (one per trimester) or passes both values, and assembles the combined view client-side.
4. **Given** Admin Registration tab currently uses `?trimester=X` as a query param, **When** the route is updated to use `/:trimester` as a route param, **Then** the frontend is updated to match and the tab continues to function identically.

---

### User Story 2 — Consolidate Attendance Endpoints (Priority: P2)

As a developer, I want a single RESTful attendance resource so that there is one way to record and remove attendance records.

**Why this priority**: Removes duplicate endpoints that violate Constitution I (one way to do each thing). Lower priority than US1 because the duplicates currently work — this is a cleanup, not a functional gap.

**Independent Test**: Attendance recording and removal work through the consolidated endpoints. Legacy endpoints are removed. Frontend uses the new endpoints.

**Acceptance Scenarios**:

1. **Given** the legacy `/recordAttendance` and `/removeAttendance` endpoints exist with no frontend callers, **When** they are removed, **Then** `POST /attendance` remains as the sole attendance endpoint and no functionality is lost.
2. **Given** the legacy endpoints have no frontend callers, **When** the routes are removed, **Then** no frontend changes are needed for attendance.

---

### User Story 3 — Rename Verb-Based Routes to Resource-Based (Priority: P3)

As a developer, I want all routes to follow resource-based naming conventions so that the API surface is consistent and predictable.

**Why this priority**: Cosmetic consistency. The verb-based routes work, but they violate common REST conventions and make the API harder to reason about for new developers.

**Independent Test**: Renamed endpoints return the same responses as before. Frontend callers are updated to use new paths.

**Acceptance Scenarios**:

1. **Given** `/authenticateByAccessCode` exists, **When** renamed to a resource-based pattern (e.g., `POST /auth/access-code`), **Then** the frontend authenticates identically using the new path.
2. **Given** `/testConnection` and `/testSheetData` exist, **When** renamed to resource-based patterns under `/admin/` (e.g., `POST /admin/test-connection`), **Then** admin diagnostic operations work identically.

---

### Edge Cases

- What happens when the frontend requests a trimester that has no data (e.g., future trimester with no registrations)? The backend returns empty arrays — same as current behavior for tabs that already accept trimester params.
- What happens if the frontend sends an invalid or missing trimester to a parent tab that previously derived it server-side? The backend returns a validation error. The frontend must determine the correct trimester before making the request.
- What happens to clients calling the old legacy attendance URLs after the rename? The old routes are removed. There are no external API consumers — only the bundled frontend, which is updated in the same release.

## Scope

### In Scope

1. Move Parent Contact and Parent Registration tabs to accept explicit trimester param(s)
2. Move Admin Registration tab from `?trimester=X` to `/:trimester` route param
3. Update frontend callers for all changed routes
4. Consolidate attendance endpoints (`/recordAttendance`, `/removeAttendance` → unified pattern)
5. Rename verb-based routes to resource-based patterns
6. Remove `periodService` calls from tab endpoints that will receive explicit trimester params
7. Move Instructor Weekly Schedule trimester from optional query param to required route param, removing the wasteful all-registrations fallback

### Out of Scope

- Model changes
- Database layer changes
- New features or additional tab endpoints
- Authentication flow changes (access-code mechanism stays the same, only the route path changes)
- Changes to endpoints that are already consistent (admin master schedule, admin wait list, parent weekly schedule, instructor directory)

## Requirements

### Functional Requirements

- **FR-001**: Parent Contact tab endpoint MUST accept trimester as a parameter instead of deriving it from `periodService`
- **FR-002**: Parent Registration tab endpoint MUST accept current and next trimester as parameters instead of deriving them from `periodService`
- **FR-003**: Admin Registration tab endpoint MUST accept trimester as a route param (`:trimester`), consistent with other admin tab endpoints
- **FR-004**: All tab endpoints that accept trimester MUST use route params (`:trimester`), not query params
- **FR-005**: The frontend MUST determine the current and next trimester values (via a configuration/period endpoint or cached period data) and pass them explicitly to tab endpoints
- **FR-006**: Legacy attendance endpoints (`/recordAttendance`, `/removeAttendance`) MUST be consolidated into a RESTful pattern and the legacy routes removed
- **FR-007**: Verb-based route names (`/authenticateByAccessCode`, `/testConnection`, `/testSheetData`) MUST be renamed to resource-based patterns
- **FR-008**: All frontend callers MUST be updated to use the new route paths
- **FR-009**: Response shapes from all modified endpoints MUST remain identical — this is a routing change, not a data change
- **FR-010**: The frontend MUST have a way to obtain the current and next trimester values before loading parent tabs that previously derived them server-side

### Assumptions

- The existing `/configuration` endpoint (or an equivalent mechanism) can provide the frontend with current/next trimester values, so parent tabs can pass them explicitly. If not, a lightweight period endpoint may be needed.
- There are no external API consumers — only the bundled frontend calls these endpoints. Route renames do not require deprecation periods or versioning.
- The dual-trimester needs of Parent Contact and Parent Registration can be handled by the frontend making two separate requests per trimester, consistent with how Parent Weekly Schedule already works (one request per trimester).

## Success Criteria

### Measurable Outcomes

- **SC-001**: All tab endpoints accept trimester as an explicit parameter — zero tab endpoints derive trimester server-side
- **SC-002**: All tab endpoints use the same parameter delivery method (route params for trimester)
- **SC-003**: Zero duplicate endpoints exist for the same operation (attendance consolidation complete)
- **SC-004**: All route names follow resource-based naming — zero verb-based route paths remain
- **SC-005**: All existing tests pass after changes, and response shapes from modified endpoints are identical to before
- **SC-006**: Frontend correctly loads all tabs with explicit trimester values — no user-visible behavior change
