# Tasks: Route & Endpoint Cleanup

**Input**: Design documents from `/specs/005-route-cleanup/`
**Prerequisites**: plan.md, spec.md, research.md, contracts/route-changes.md

**Organization**: Tasks are grouped by user story. No test tasks — spec does not request TDD.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create branch and verify starting state

- [X] T001 Create and checkout branch `005-route-cleanup` from `main`
- [X] T002 Run existing test suite to confirm green baseline (`npm test`)

**Checkpoint**: Tests pass on clean branch — safe to begin changes.

---

## Phase 2: User Story 1 — Standardize Trimester Delivery (Priority: P1)

**Goal**: All tab endpoints accept trimester as an explicit route param. Parent Contact and Parent Registration no longer derive trimesters server-side. Admin Registration and Instructor Weekly Schedule move from query param to route param.

**Independent Test**: All 4 modified tab endpoints return correct data when passed explicit trimester values. Frontend loads tabs identically to before.

### Route Changes (api.ts)

- [X] T003 [US1] Update route `GET /parent/tabs/contact` → `GET /parent/tabs/contact/:trimester` in src/routes/api.ts (line 136)
- [X] T004 [US1] Update route `GET /parent/tabs/registration` → `GET /parent/tabs/registration/:trimester` in src/routes/api.ts (line 141)
- [X] T005 [US1] Update route `GET /admin/tabs/registration` → `GET /admin/tabs/registration/:trimester` in src/routes/api.ts (line 147)
- [X] T006 [US1] Update route `GET /instructor/tabs/weekly-schedule` → `GET /instructor/tabs/weekly-schedule/:trimester` in src/routes/api.ts (lines 132-135)

### Controller Changes

- [X] T007 [US1] Refactor `getParentContactTabData` (line 489) in src/controllers/userController.ts — replace `periodService.getCurrentTrimester()`/`getNextTrimester()` with `req.params.trimester`; fetch registrations for the single provided trimester only; return `{ admins, instructors }` (same response shape, but now scoped to one trimester instead of combining two internally); remove periodService import if no longer used
- [X] T008 [US1] Refactor `getParentRegistrationTabData` in src/controllers/registrationController.ts — replace `periodService.getCurrentTrimester()`/`getNextTrimester()` with `req.params.trimester`; return `{ instructors, students, classes, registrations }` for the single provided trimester only; response shape per contracts/route-changes.md
- [X] T009 [US1] Refactor `getAdminRegistrationTabData` in src/controllers/registrationController.ts — replace `req.query.trimester` with `req.params.trimester`
- [X] T010 [US1] Refactor `getInstructorWeeklyScheduleTabData` (line 790) in src/controllers/registrationController.ts — replace `req.query.trimester` (line 795) with `req.params.trimester`; delete the else branch (lines 821-824) that calls `registrationRepository.getRegistrations()` and filters client-side — keep only the `queryService.getRegistrations({ trimester, ... })` path; add 400 error response if trimester param is absent (same pattern as the existing instructorId check at lines 797-811)

### Frontend Changes

- [X] T011 [P] [US1] Update `ParentContactTab.fetchData()` in src/web/js/tabs/parentContactTab.ts — make 2 calls during enrollment (current + next trimester with trimester in path segment), 1 call during registration period; merge instructor arrays client-side (admins are returned in each response but are trimester-independent — use admins from first response only); URL pattern: `parent/tabs/contact/${trimester}?parentId=${parentId}`
- [X] T012 [P] [US1] Update `ParentRegistrationTab.fetchData()` in src/web/js/tabs/parentRegistrationTab.ts — make 2 calls (current + next trimester with trimester in path segment); map responses to `currentTrimesterRegistrations` and `nextTrimesterRegistrations`; URL pattern: `parent/tabs/registration/${trimester}?parentId=${parentId}`
- [X] T013 [P] [US1] Update `AdminRegistrationTab.fetchData()` in src/web/js/tabs/adminRegistrationTab.ts — change URL from `admin/tabs/registration?trimester=${trimester}` to `admin/tabs/registration/${trimester}` (line 46)
- [X] T014 [P] [US1] Update `InstructorWeeklyScheduleTab.fetchData()` in src/web/js/tabs/instructorWeeklyScheduleTab.ts — change URL from `instructor/tabs/weekly-schedule?instructorId=${instructorId}&trimester=${trimester}` to `instructor/tabs/weekly-schedule/${trimester}?instructorId=${instructorId}` (line 48)

### Integration Test Updates

- [X] T015 [P] [US1] Update parent contact tab tests in tests/integration/userController.test.ts — change route paths to include `:trimester` param
- [X] T016 [P] [US1] Update admin registration, parent registration, and instructor weekly schedule tests in tests/integration/registrationController.test.ts — change route paths to use `:trimester` route param instead of query param

### Validation

- [X] T017 [US1] Run test suite and verify all US1-related tests pass (`npm test`)

**Checkpoint**: All 4 tab endpoints accept trimester as route param. Frontend loads all tabs correctly. Tests pass.

---

## Phase 3: User Story 2 — Consolidate Attendance Endpoints (Priority: P2)

**Goal**: Delete legacy `POST /recordAttendance` and `POST /removeAttendance` endpoints. `POST /attendance` (markAttendance) remains as the sole attendance endpoint.

**Independent Test**: Legacy attendance routes return 404. `POST /attendance` continues working. No frontend impact.

- [X] T018 [US2] Delete routes `POST /recordAttendance` and `POST /removeAttendance` from src/routes/api.ts (lines 119-120)
- [X] T019 [US2] Delete `recordAttendance` and `removeAttendance` methods from src/controllers/attendanceController.ts
- [X] T020 [US2] Remove tests for deleted legacy attendance endpoints in tests/integration/attendanceController.test.ts
- [X] T021 [US2] Run test suite and verify all US2-related tests pass (`npm test`)

**Checkpoint**: Legacy attendance endpoints removed. `POST /attendance` unaffected. Tests pass.

---

## Phase 4: User Story 3 — Rename Verb-Based Routes (Priority: P3)

**Goal**: Rename `authenticateByAccessCode` → `auth/access-code`, `testConnection` → `admin/test-connection`, `testSheetData` → `admin/test-sheet-data`.

**Independent Test**: Renamed endpoints return identical responses. Frontend authenticates using new path.

### Route Changes

- [X] T022 [US3] Rename route `POST /authenticateByAccessCode` → `POST /auth/access-code` in src/routes/api.ts (line 47)
- [X] T023 [P] [US3] Rename route `POST /testConnection` → `POST /admin/test-connection` in src/routes/api.ts (line 50)
- [X] T024 [P] [US3] Rename route `POST /testSheetData` → `POST /admin/test-sheet-data` in src/routes/api.ts (line 53)

### Frontend Changes

- [X] T025 [US3] Update `ServerFunctions.authenticateByAccessCode` value from `'authenticateByAccessCode'` to `'auth/access-code'` in src/web/js/constants.ts (line 87)

### Integration Test Updates

- [X] T026 [P] [US3] Update auth endpoint path in tests/integration/userController.test.ts — change `/api/authenticateByAccessCode` to `/api/auth/access-code`
- [X] T027 [P] [US3] Update test-connection and test-sheet-data paths in tests/integration/systemController.test.ts — change `/api/testConnection` to `/api/admin/test-connection`, `/api/testSheetData` to `/api/admin/test-sheet-data`

### Validation

- [X] T028 [US3] Run test suite and verify all US3-related tests pass (`npm test`)

**Checkpoint**: All verb-based routes renamed. Frontend auth works. Tests pass.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T029 Run full test suite (`npm test`) to verify all changes work together
- [X] T030 Verify no dead imports remain — check for: `periodService` imports in src/controllers/userController.ts and src/controllers/registrationController.ts; unused `recordAttendance`/`removeAttendance` imports in src/controllers/attendanceController.ts; unused `registrationRepository` import in registrationController.ts (if only used in deleted fallback branch)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US1)**: Depends on Phase 1 — the bulk of the work
- **Phase 3 (US2)**: Depends on Phase 1 — independent of US1 (different files except api.ts)
- **Phase 4 (US3)**: Depends on Phase 1 — independent of US1/US2 (different files except api.ts)
- **Phase 5 (Polish)**: Depends on all prior phases

### User Story Dependencies

- **US1, US2, US3**: All independent of each other. They share api.ts but modify different route lines, so they can be done sequentially in any order. Recommended order: US1 → US2 → US3 (priority order).

### Within US1

- T003-T006 (routes) can run in parallel — different lines in same file
- T007-T010 (controllers) — T007 and T008 touch different controllers [P]; T008, T009, T010 are in the same controller file (registrationController.ts), so they run sequentially
- T011-T014 (frontend) — all [P], different files
- T015-T016 (tests) — all [P], different files
- T017 (validation) — depends on all prior US1 tasks

### Parallel Opportunities

```text
# US1 frontend changes (all different files):
T011: parentContactTab.ts
T012: parentRegistrationTab.ts
T013: adminRegistrationTab.ts
T014: instructorWeeklyScheduleTab.ts

# US1 test updates (different files):
T015: userController.test.ts
T016: registrationController.test.ts

# US3 route renames (different lines in api.ts, different test files):
T023 + T024: testConnection + testSheetData routes
T026 + T027: auth tests + system tests
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: US1 — trimester standardization
3. **STOP and VALIDATE**: All tab endpoints accept explicit trimester, frontend works
4. This delivers the primary value — stateless, testable, deterministic tab endpoints

### Incremental Delivery

1. US1 → Trimester standardization (most complex, highest value)
2. US2 → Delete legacy attendance (quick cleanup, 4 tasks)
3. US3 → Route renames (cosmetic consistency, 7 tasks)
4. Polish → Final verification

---

## Notes

- All route changes are in src/routes/api.ts — coordinate sequential edits within each US
- Response shapes MUST remain identical per FR-009 and contracts/route-changes.md
- Parent Contact and Registration frontend changes are the most complex (dual-trimester call pattern)
- No model, repository, or database changes in this feature
- `periodService` imports should be removed from controllers only if fully unused after changes
