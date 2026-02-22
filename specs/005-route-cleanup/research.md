# Research: Route & Endpoint Cleanup

**Branch**: `005-route-cleanup` | **Date**: 2026-02-21

## R1: How do parent tabs currently derive trimesters?

**Decision**: Both parent tabs use `periodService.getCurrentTrimester()` and `periodService.getNextTrimester()` — these calls will be replaced by explicit route params.

**Current flow**:
- `getParentContactTabData` (userController.ts:509-513): Gets `currentTrimester` and `nextTrimester` from periodService, fetches registrations for both to find relevant instructors
- `getParentRegistrationTabData` (registrationController.ts:1002-1004): Gets `currentTrimester` and `nextTrimester` from periodService, coerces nulls to empty strings, fetches registrations for both

**Rationale**: Both tabs need two trimesters. The frontend already has these values from `UserSession.getAppConfig()` (loaded at app init from `GET /configuration`). Passing them as route params eliminates the server-side periodService dependency.

## R2: Can the frontend provide trimester values?

**Decision**: Yes — the `/api/configuration` endpoint already returns `currentTrimester`, `nextTrimester`, and `availableTrimesters`. The frontend stores these in `UserSession.appConfig` at startup.

**Evidence**:
- `AppConfigurationResponse` (appConfigurationResponse.ts) has fields: `currentTrimester`, `nextTrimester`, `availableTrimesters`, `defaultTrimester`
- `UserSession` (main.ts:158-175) stores appConfig and exposes `getCurrentPeriod()`, `getNextPeriod()`, `getAppConfig()`
- Parent Weekly Schedule tab already passes trimester as a route param — it reads from `appConfig.currentTrimester` / `appConfig.nextTrimester`

**FR-010 assumption confirmed**: No new endpoint needed.

## R3: How should parent tabs handle dual-trimester needs?

**Decision**: Two separate requests per trimester, consistent with how Parent Weekly Schedule already works.

**Alternatives considered**:
1. Single request with both trimesters as params — rejected because it breaks the pattern of one-trimester-per-request used by every other tab endpoint
2. Comma-separated trimester list — rejected for same reason, adds parsing complexity

**Rationale**: Parent Weekly Schedule (parentWeeklyScheduleTab.ts:144) already makes two `HttpService.get()` calls — one per trimester — during enrollment periods. Parent Contact and Parent Registration should follow the same pattern.

**Impact on Parent Contact**: Currently returns `{ admins, instructors }` by combining registrations from both trimesters internally. With explicit params, the frontend will make two calls and merge the instructor lists client-side. Admins are trimester-independent so only one fetch is needed.

**Impact on Parent Registration**: Currently returns `{ instructors, students, classes, nextTrimesterRegistrations, currentTrimesterRegistrations }`. With explicit params, two calls will return `{ instructors, students, classes, registrations }` each. The frontend assembles the combined view.

## R4: What are the legacy attendance endpoints doing?

**Decision**: `recordAttendance` and `removeAttendance` are legacy endpoints with no frontend callers. They can be deleted outright.

**Evidence**:
- `POST /recordAttendance` (attendanceController.ts:160) — calls `attendanceRepository.recordAttendance(registrationId, email)`. Simple boolean attendance tracking per registration.
- `POST /removeAttendance` (attendanceController.ts:207) — calls `attendanceRepository.removeAttendance(registrationId, email)`.
- No references in `ServerFunctions` constant (constants.ts). No frontend callers found.
- The newer `POST /attendance` (markAttendance, line 19) provides richer week/trimester/schoolYear tracking and IS referenced in the frontend.

**Consolidation plan**: Delete the two legacy routes and their controller methods. The repository methods remain (they may be used internally or in tests), but the HTTP endpoints are dead.

## R5: What verb-based routes exist and what are the resource-based alternatives?

**Decision**: Three verb-based routes to rename.

| Current | New | Method | Notes |
|---------|-----|--------|-------|
| `POST /authenticateByAccessCode` | `POST /auth/access-code` | POST | Frontend calls via `ServerFunctions.authenticateByAccessCode` |
| `POST /testConnection` | `POST /admin/test-connection` | POST | No frontend callers; admin diagnostic |
| `POST /testSheetData` | `POST /admin/test-sheet-data` | POST | No frontend callers; admin diagnostic |

**Rationale**:
- `auth/access-code` — resource is the access-code authentication mechanism. Placed under `auth/` prefix.
- `admin/test-connection` and `admin/test-sheet-data` — these are admin diagnostic tools. Moving under `admin/` makes their audience clear and follows the existing `admin/clearCache` pattern.

## R6: Admin Registration tab trimester delivery

**Decision**: Change from `?trimester=X` query param to `/:trimester` route param, consistent with admin master-schedule and wait-list tabs.

**Current**: `GET /admin/tabs/registration?trimester=fall` (api.ts:147, registrationController.ts:1051)
**New**: `GET /admin/tabs/registration/:trimester`

**Frontend caller**: adminRegistrationTab.ts:46 — `HttpService.get(\`admin/tabs/registration?trimester=${trimester}\`)` → changes to `HttpService.get(\`admin/tabs/registration/${trimester}\`)`

## R7: Instructor weekly schedule optional trimester

**Decision**: Move from optional query param to required route param, consistent with all other tab endpoints.

**Current**: `GET /instructor/tabs/weekly-schedule?instructorId=X&trimester=Y` (trimester optional). When omitted, server falls back to `registrationRepository.getRegistrations()` — fetches ALL registrations across all trimesters, then filters by instructorId. Wasteful.

**Evidence the frontend always provides it**: instructorWeeklyScheduleTab.ts:46-48 — reads from active trimester button or `currentPeriod?.trimester`. Always populated unless UserSession is broken.

**New**: `GET /instructor/tabs/weekly-schedule/:trimester?instructorId=X`. Remove the fallback branch entirely. Return 400 if trimester missing.
