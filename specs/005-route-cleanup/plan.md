# Implementation Plan: Route & Endpoint Cleanup

**Branch**: `005-route-cleanup` | **Date**: 2026-02-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-route-cleanup/spec.md`

## Summary

Standardize API route patterns across three areas: (1) move parent contact and parent registration tabs to accept explicit trimester route params instead of deriving server-side via periodService, move admin registration tab from query param to route param; (2) delete legacy attendance endpoints with no frontend callers; (3) rename verb-based routes to resource-based patterns. No model or database changes — routing and controller param extraction only.

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022
**Primary Dependencies**: Express 4, Google Sheets API v4
**Storage**: Google Sheets (single spreadsheet, column-index mapped)
**Testing**: Jest with ES module support, Supertest for integration
**Target Platform**: Node.js server + vanilla JS frontend (Vite-bundled)
**Project Type**: Web application (single-process Express serves API + frontend)
**Performance Goals**: N/A — routing changes only, no new computation
**Constraints**: Response shapes MUST remain identical (FR-009)
**Scale/Scope**: ~11 route changes, ~7 frontend callers, ~4 controller methods modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Minimum changes — route paths and param extraction only |
| II. Data Consistency | PASS | No entity shape changes |
| III. Single Serialization Path | PASS | No serialization changes |
| IV. Uniform API Responses | PASS | All endpoints already use `successResponse()`/`errorResponse()` |
| V. Single Data Fetch Pattern | PASS | Frontend callers already use `HttpService` |
| VI. No Dead Code | PASS | Deleting legacy endpoints removes dead code |
| VII. Shared Models | PASS | No model changes |
| VIII. Role-Based Architecture | PASS | Tab endpoints remain under `/api/{role}/tabs/` |
| IX. Trimester-Aware | PASS | Moving trimester to explicit params improves determinism |
| X. Google Sheets | N/A | No database layer changes |

No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-route-cleanup/
├── plan.md
├── research.md
├── contracts/
│   └── route-changes.md
└── tasks.md
```

### Source Code (files modified)

```text
src/
├── routes/
│   └── api.ts                          # Route definitions (all changes)
├── controllers/
│   ├── userController.ts               # Parent Contact: trimester from route param
│   ├── registrationController.ts       # Parent Reg + Admin Reg: trimester from route param
│   ├── attendanceController.ts         # Delete recordAttendance/removeAttendance methods
│   └── systemController.ts            # No changes (handlers stay, routes move)
└── web/js/
    ├── constants.ts                    # Update ServerFunctions entries
    ├── tabs/
    │   ├── parentContactTab.ts             # Two calls with trimester in path
    │   ├── parentRegistrationTab.ts         # Two calls with trimester in path
    │   ├── adminRegistrationTab.ts          # Query param → route param
    │   └── instructorWeeklyScheduleTab.ts   # Query param → route param
    └── viewModel.ts                    # No direct changes (reads from ServerFunctions constant)

tests/
├── integration/
│   ├── userController.test.ts          # Update parent contact test routes, auth endpoint path
│   ├── registrationController.test.ts  # Update admin reg + parent reg + instructor schedule test routes
│   ├── attendanceController.test.ts    # Remove tests for deleted legacy endpoints
│   └── systemController.test.ts        # Update test-connection/test-sheet-data paths
└── unit/
    └── (no unit test changes expected)
```

**Structure Decision**: Existing project structure. No new files created except the contracts doc. Changes touch routes, controllers, frontend tabs, and integration tests.

## Implementation Approach

### US1: Standardize Trimester Delivery (P1)

**Parent Contact Tab** (`GET /parent/tabs/contact` → `GET /parent/tabs/contact/:trimester`):
- Controller: Replace `periodService.getCurrentTrimester()`/`getNextTrimester()` with `req.params.trimester`
- Single-trimester endpoint: fetches registrations for the given trimester only
- Frontend: Makes two calls (currentTrimester, nextTrimester) during enrollment, one during registration period. Merges instructor lists client-side. Fetches admins once (trimester-independent).

**Parent Registration Tab** (`GET /parent/tabs/registration` → `GET /parent/tabs/registration/:trimester`):
- Controller: Replace `periodService.getCurrentTrimester()`/`getNextTrimester()` with `req.params.trimester`
- Single-trimester endpoint: returns `{ instructors, students, classes, registrations }` for one trimester
- Frontend: Makes two calls (currentTrimester, nextTrimester). Maps responses to `currentTrimesterRegistrations` and `nextTrimesterRegistrations`.

**Admin Registration Tab** (`GET /admin/tabs/registration?trimester=X` → `GET /admin/tabs/registration/:trimester`):
- Controller: Replace `req.query.trimester` with `req.params.trimester`
- Frontend: Replace query param URL with path param URL

**Instructor Weekly Schedule Tab** (`GET /instructor/tabs/weekly-schedule?instructorId=X&trimester=Y` → `GET /instructor/tabs/weekly-schedule/:trimester?instructorId=X`):
- Controller: Replace `req.query.trimester` with `req.params.trimester`. Remove the fallback branch that fetches all registrations when no trimester is provided — the frontend always sends one. Make trimester required (return 400 if missing).
- Frontend: Move trimester from query param to path segment

### US2: Consolidate Attendance Endpoints (P2)

- Delete routes: `POST /recordAttendance`, `POST /removeAttendance` from api.ts
- Delete controller methods: `AttendanceController.recordAttendance`, `AttendanceController.removeAttendance`
- Keep: `POST /attendance` (markAttendance) — the active, richer endpoint
- No frontend changes needed (legacy endpoints have no callers)

### US3: Rename Verb-Based Routes (P3)

| Current | New | Frontend Impact |
|---------|-----|-----------------|
| `POST /authenticateByAccessCode` | `POST /auth/access-code` | Update `ServerFunctions.authenticateByAccessCode` value in constants.ts |
| `POST /testConnection` | `POST /admin/test-connection` | None (no frontend callers) |
| `POST /testSheetData` | `POST /admin/test-sheet-data` | None (no frontend callers) |

## Complexity Tracking

No violations to justify.
