# Route Changes Contract

**Branch**: `005-route-cleanup` | **Date**: 2026-02-21

All endpoints return `{ success: true, data: <payload> }` per Constitution IV.

## US1: Trimester Standardization

### Parent Contact Tab

**Before**: `GET /api/parent/tabs/contact?parentId=X`
**After**: `GET /api/parent/tabs/contact/:trimester?parentId=X`

Response shape (unchanged per trimester call):
```json
{
  "success": true,
  "data": {
    "admins": [Admin],
    "instructors": [Instructor]
  }
}
```

Frontend makes:
- 1 call during registration period (current trimester)
- 2 calls during enrollment periods (current + next trimester), merges instructor arrays client-side
- Admins are returned in each call but are trimester-independent (same result either way)

### Parent Registration Tab

**Before**: `GET /api/parent/tabs/registration?parentId=X`
**After**: `GET /api/parent/tabs/registration/:trimester?parentId=X`

Response shape (unchanged per trimester call):
```json
{
  "success": true,
  "data": {
    "instructors": [Instructor],
    "students": [Student],
    "classes": [Class],
    "registrations": [Registration]
  }
}
```

Frontend makes 2 calls (current + next trimester). Maps:
- Call with `currentTrimester` → `currentTrimesterRegistrations`
- Call with `nextTrimester` → `nextTrimesterRegistrations`
- `instructors`, `students`, `classes` are the same in both calls (not trimester-scoped)

### Admin Registration Tab

**Before**: `GET /api/admin/tabs/registration?trimester=X`
**After**: `GET /api/admin/tabs/registration/:trimester`

Response shape (unchanged):
```json
{
  "success": true,
  "data": {
    "instructors": [Instructor],
    "students": [Student],
    "classes": [Class],
    "registrations": [Registration]
  }
}
```

### Instructor Weekly Schedule Tab

**Before**: `GET /api/instructor/tabs/weekly-schedule?instructorId=X&trimester=Y` (trimester optional, with wasteful all-registrations fallback)
**After**: `GET /api/instructor/tabs/weekly-schedule/:trimester?instructorId=X` (trimester required)

Response shape (unchanged):
```json
{
  "success": true,
  "data": {
    "registrations": [Registration],
    "students": [Student],
    "instructors": [Instructor],
    "classes": [Class]
  }
}
```

Returns 400 if trimester is missing (previously fell back to fetching all registrations across all trimesters).

## US2: Attendance Consolidation

### Deleted Endpoints

- ~~`POST /api/recordAttendance`~~ — removed (no frontend callers)
- ~~`POST /api/removeAttendance`~~ — removed (no frontend callers)

### Retained Endpoint (no changes)

`POST /api/attendance` — markAttendance (existing, actively used)

## US3: Route Renames

### Authentication

**Before**: `POST /api/authenticateByAccessCode`
**After**: `POST /api/auth/access-code`

Request/response shape unchanged:
```json
// Request
{ "accessCode": "string", "loginType": "string" }

// Response
{ "success": true, "data": AuthenticatedUserResponse }
```

### Admin Diagnostics

**Before**: `POST /api/testConnection`
**After**: `POST /api/admin/test-connection`

**Before**: `POST /api/testSheetData`
**After**: `POST /api/admin/test-sheet-data`

Request/response shapes unchanged for both.

## Complete Route Table (After Changes)

Tab endpoints with trimester param (all use `:trimester` route param):

| Method | Path | Controller |
|--------|------|------------|
| GET | `/admin/tabs/master-schedule/:trimester` | getAdminMasterScheduleTabData |
| GET | `/admin/tabs/wait-list/:trimester` | getAdminWaitListTabData |
| GET | `/admin/tabs/registration/:trimester` | getAdminRegistrationTabData |
| GET | `/parent/tabs/weekly-schedule/:trimester` | getParentWeeklyScheduleTabData |
| GET | `/parent/tabs/contact/:trimester` | getParentContactTabData |
| GET | `/parent/tabs/registration/:trimester` | getParentRegistrationTabData |
| GET | `/instructor/tabs/weekly-schedule/:trimester` | getInstructorWeeklyScheduleTabData |
| GET | `/instructor/tabs/directory` | getInstructorDirectoryTabData |

Note: All tab endpoints that need trimester now use `:trimester` as a required route param. Instructor directory is the only tab with no trimester param (it's trimester-independent).
