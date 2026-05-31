# API Reference

Every HTTP endpoint exposed by the Tonic backend. The source of truth is [src/routes/api.ts](../../src/routes/api.ts); this document follows it. For internal architecture see [ARCHITECTURE.md](ARCHITECTURE.md); for frontend consumption see [FRONTEND.md](FRONTEND.md).

## Maintenance contract

This document MUST be updated in the same PR as any change to:

- [src/routes/api.ts](../../src/routes/api.ts) — endpoint definitions.
- Any controller method referenced from a route (the controllers under [src/controllers/](../../src/controllers/)).
- Request/response shapes referenced by any endpoint, including changes to [src/common/responseHelpers.ts](../../src/common/responseHelpers.ts) (the success/error envelope) or controller payloads.

If your PR touches one of those surfaces and you didn't update this file, you're shipping documentation drift.

The Postman collection at [scripts/postman/tonic-api.postman_collection.json](../../scripts/postman/tonic-api.postman_collection.json) MUST also be kept in lockstep — same rule.

## Request/response envelope

Every endpoint returns one of two shapes:

```json
// Success
{ "success": true, "data": <payload> }

// Failure
{ "success": false, "error": { "message": "...", "code": "...", "type": "..." } }
```

Frontend code branches on `error.type` for client-side logic and uses `error.code` for support / debugging. The `type` is a coarse category (e.g., `AUTHENTICATION`, `VALIDATION`, `CONFLICT`); the `code` is a specific identifier (`UNAUTHORIZED`, `INVALID_TRIMESTER`, etc.).

Success endpoints that have nothing to return still send `{ "success": true, "data": null }`.

## Headers

Authenticated endpoints require two request headers:

| Header | Required | Description |
|---|---|---|
| `x-access-code` | yes | The user's access code (6-digit for employees, 10-digit phone for parents). |
| `x-login-type` | optional | Either `employee` or `parent`. If omitted, the format of `x-access-code` is used to auto-detect. |

The same access code can also be sent in the request body as `accessCode` or in the query string as `accessCode`. Priority order: body > header > query.

## Status codes

- **200 OK** — successful read; the response carries `data`.
- **201 Created** — successful create; the response carries the new entity.
- **400 Bad Request** — validation failure (missing fields, invalid trimester, etc.). The `data` is null and `error` describes what was wrong.
- **401 Unauthorized** — no valid authentication on a route that requires it. The frontend treats this as session-expired and forces a logout.
- **403 Forbidden** — authenticated but lacks permission for this specific action (e.g., a parent trying to delete a registration). The frontend shows an error but does NOT log out.
- **404 Not Found** — the resource doesn't exist.
- **409 Conflict** — a write conflicts with the current state (e.g., scheduling overlap).
- **500 Internal Server Error** — unexpected failure. In production the message is replaced with a generic string to avoid leaking internals.

## Public endpoints

Four endpoints require no authentication. They are deliberately scoped so a fresh browser can bootstrap the SPA.

### GET /api/health

Liveness check. Returns a fixed payload.

**Response:** `{ "success": true, "data": { "status": "healthy", "timestamp": "..." } }`

### GET /api/version

Returns the build version + hash. Used by the frontend to detect stale browser caches.

**Response:** `{ "success": true, "data": { "version": "1.4.8", "hash": "abc12345", "buildDate": "2026-05-31T..." } }`

### GET /api/configuration

Returns the app-level configuration used by the SPA to render initial state. Includes the current period, the next period, the period sequence, and the lesson-length / registration-config knobs.

**Response:** `{ "success": true, "data": AppConfigurationResponse }`. The `AppConfigurationResponse` type is defined at [src/models/shared/responses/appConfigurationResponse.ts](../../src/models/shared/responses/appConfigurationResponse.ts).

### POST /api/auth/access-code

Authenticate a user by access code. This is the only endpoint where unauthenticated callers can submit credentials.

**Request:**
```json
{ "accessCode": "1234567890", "loginType": "parent" }
```

`loginType` is optional; if omitted, the format of the access code is used to auto-detect (10-digit numeric → parent, 6-digit → employee).

**Response on match:**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "parent": { "id": "PARENT1", "firstName": "Jane", "lastName": "Doe", ... },
    "admin": null,
    "instructor": null
  }
}
```

Exactly one of `admin` / `instructor` / `parent` is populated; the other two are `null`.

**Response on no match:** `{ "success": true, "data": null }`. Note: this is NOT a 401. The endpoint behaves as a lookup probe, not authenticate-or-fail — returning 401 would trigger the frontend's session-expired logout flow, which is wrong for a failed login attempt by someone who isn't logged in yet. See [FRONTEND.md](FRONTEND.md) HttpService section for the full 401-vs-403 contract.

## Authenticated endpoints

The remaining 15 endpoints require `requireAuth` middleware to pass. Each one's controller method is listed alongside the route for source-of-truth lookup.

### Admin

#### POST /api/admin/clear-cache

Forces a full cache flush across the cache service and the dbClient enriched-students cache. Admin-only — non-admin callers receive 403.

**Request body:** empty.

**Response:** `{ "success": true, "data": { "message": "Cache cleared" } }`

Controller: `SystemController.clearCache`.

### Registrations

#### POST /api/registrations

Create a registration. Used by both parents and admins.

**Request:**
```json
{
  "studentId": "STUDENT1",
  "instructorId": "INSTRUCTOR1@example.com",
  "registrationType": "private",
  "trimester": "fall",
  "day": "Monday",
  "startTime": "14:00",
  "length": 30,
  "instrument": "Piano",
  "transportationType": "pickup",
  "classId": null,
  "notes": ""
}
```

For group lessons, `registrationType` is `"group"` and `classId` is required (`instructorId`/`day`/`startTime` are derived from the class).

If `replaceRegistrationId` is present, this is a "modify a carried-forward registration" flow: the controller first authorizes that the caller can replace the old row, then calls `processRegistration` for the new one, then deletes the old. Delete-after-create order is intentional — a failed create must not strand the parent without a lesson.

**Response on success:** `201 Created` with the created registration.

**Response on validation failure:** `400 Bad Request` with `error.code` indicating which field failed (`INVALID_TRIMESTER`, `MISSING_REQUIRED_FIELD`, etc.).

**Response on schedule conflict:** `409 Conflict`.

Controller: `RegistrationController.createRegistration`.

#### DELETE /api/registrations/:trimester/:id

Delete a registration. Admin-only — parent callers receive 403.

**Path params:** `trimester` is one of `fall`/`winter`/`spring`/`summer`. `id` is the registration UUID.

**Response on success:** `200 OK` with `data: { success: true }`.

**Response on invalid trimester:** `400 Bad Request`. The error envelope matches what `POST /api/registrations` returns for an invalid trimester — pinned by the integration test.

Controller: `RegistrationController.deleteRegistration`.

#### PATCH /api/registrations/:trimester/:id/intent

Update the re-enrollment intent on an existing registration. Used during the intent period when parents decide whether to keep or drop a registration for the next trimester.

**Request:**
```json
{ "intent": "keep" }
```

`intent` is `"keep"`, `"drop"`, or `"change"`.

**Response on success:** `200 OK` with the updated registration.

Controller: `RegistrationController.updateIntent`.

### Attendance

#### POST /api/attendance

Mark attendance for a registration. Used by instructors.

**Request:**
```json
{
  "registrationId": "...",
  "weekNumber": 3,
  "status": "present",
  "notes": ""
}
```

**Response on success:** `201 Created` with the attendance record.

Controller: `AttendanceController.markAttendance`.

#### GET /api/attendance/summary/:registrationId

Return a summary of all attendance records for one registration across all weeks.

**Response:** `{ "success": true, "data": { "registrationId": "...", "records": [...], "totals": {...} } }`

Controller: `AttendanceController.getAttendanceSummary`.

### Feedback

#### POST /api/feedback

Submit free-form feedback. The body is logged structurally; there is no automated routing to a ticket system.

**Request:**
```json
{ "message": "...", "state": {} }
```

`state` is an optional snapshot of the UI state when the feedback was submitted (used to reproduce bugs).

**Response on success:** `200 OK` with `data: { success: true }`.

Controller: `FeedbackController.submitFeedback`.

### Tab data

The eight tab-data endpoints follow the convention `GET /api/{role}/tabs/{tab-name}[/:trimester]`. Each one returns exactly the data its corresponding frontend tab needs — no over-fetching. Most accept a `:trimester` path param and use it both to select which trimester's data to return and as the `period` argument forwarded to `userRepository.getStudents` (the summer grade-bump is fired this way).

#### GET /api/instructor/tabs/directory

The Directory tab for instructors. Returns the list of instructors at the school + their availability for the term.

Controller: `UserController.getInstructorDirectoryTabData`.

#### GET /api/instructor/tabs/weekly-schedule/:trimester

The Weekly Schedule tab for instructors. Returns the registrations assigned to the authenticated instructor for the given trimester, plus their availability windows.

Controller: `RegistrationController.getInstructorWeeklyScheduleTabData`.

#### GET /api/parent/tabs/contact/:trimester

The Contact tab for parents. Returns the parent's children + each child's current-trimester registrations + the instructors teaching those registrations (for contact info).

Controller: `UserController.getParentContactTabData`.

#### GET /api/parent/tabs/weekly-schedule/:trimester

The Weekly Schedule tab for parents. Returns each of the parent's children's registrations for the trimester, grouped by day.

Controller: `RegistrationController.getParentWeeklyScheduleTabData`.

#### GET /api/parent/tabs/registration/:trimester

The Registration tab for parents. Returns everything the parent registration form needs: the parent's children, instructors, classes, existing registrations, and the computed available time slots.

**Query params:** `parentId` (required), `excludeRegistrationId` (optional, used during the modify-via-replace flow so the slot being modified is not flagged as occupied).

When `:trimester` is `summer`, the student grades returned are bumped by +1 and any student with a bumped grade exceeding `MAX_GRADE` is dropped. See [ARCHITECTURE.md](ARCHITECTURE.md) Trimester & period model.

Controller: `RegistrationController.getParentRegistrationTabData`.

#### GET /api/admin/tabs/wait-list/:trimester

The Wait List tab for admins. Returns wait-listed registrations for the trimester so an admin can review and promote.

Controller: `RegistrationController.getAdminWaitListTabData`.

#### GET /api/admin/tabs/master-schedule/:trimester

The Master Schedule tab for admins. Returns all registrations for the trimester, grouped by instructor.

Controller: `RegistrationController.getAdminMasterScheduleTabData`.

#### GET /api/admin/tabs/registration/:trimester

The Registration tab for admins. Same shape as the parent variant but scoped to all students rather than one parent's children.

Controller: `RegistrationController.getAdminRegistrationTabData`.
