# Feature Specification: Backend Test Coverage

**Feature Branch**: `006-backend-test-coverage`
**Created**: 2026-02-22
**Status**: Partial
**Input**: User description: "Comprehensive test coverage for all untested backend files"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Service Layer Test Coverage (Priority: P1)

As a developer, I need comprehensive tests for the two core orchestration services (`registrationApplicationService` and `dropRequestService`) so that registration processing and drop request lifecycle logic is verified before I make sweeping changes to the codebase.

**Why this priority**: These services coordinate the most complex business workflows — registration creation with conflict detection, enrichment, and audit logging; and drop request lifecycle with authorization, status transitions, and registration deletion. Bugs here directly affect parents enrolling students and admins processing drops.

**Independent Test**: Can be fully tested by mocking repositories/dependencies and exercising each public method with representative inputs. Delivers confidence that registration processing and drop request workflows are correct.

**Acceptance Scenarios**:

1. **Given** a valid group registration request, **When** `processRegistration` is called, **Then** class data is auto-populated, conflicts are checked, registration is persisted, and audit is logged
2. **Given** a group registration for a class the student is already enrolled in, **When** `processRegistration` is called, **Then** the duplicate conflict is detected and an error is returned
3. **Given** a valid private lesson registration, **When** `processRegistration` is called, **Then** instructor schedule conflicts are checked, lesson schedule is generated, and registration is persisted
4. **Given** a registration with a bus transportation type on a restricted day/time, **When** `processRegistration` is called, **Then** the bus schedule restriction is enforced
5. **Given** a Rock Band class at capacity, **When** a group registration is submitted, **Then** the waitlist class logic is applied
6. **Given** an admin user, **When** `processRegistration` is called with `skipCapacityCheck`, **Then** capacity validation is bypassed
7. **Given** a valid registration ID, **When** `cancelRegistration` is called, **Then** the registration is deleted from the correct trimester table and audit is logged
8. **Given** registration options with a trimester filter, **When** `getRegistrations` is called, **Then** results are enriched with student, instructor, and class data via batch joins
9. **Given** a parent with a valid registration during REGISTRATION period, **When** `createDropRequest` is called, **Then** a pending drop request is created
10. **Given** a parent attempting to drop another parent's student, **When** `createDropRequest` is called, **Then** an authorization error is returned
11. **Given** a drop request submitted outside the REGISTRATION period, **When** `createDropRequest` is called, **Then** an invalid period error is returned
12. **Given** a pending drop request already exists for a registration, **When** `createDropRequest` is called again, **Then** a duplicate error is returned
13. **Given** a pending drop request, **When** `approveDropRequest` is called, **Then** the registration is deleted and the drop request status transitions to approved with reviewer info
14. **Given** a pending drop request, **When** `rejectDropRequest` is called, **Then** the registration remains and the drop request status transitions to rejected
15. **Given** an already-approved drop request, **When** `approveDropRequest` is called again, **Then** an invalid status transition error is returned
16. **Given** multiple pending drop requests, **When** `getPendingDropRequests` is called, **Then** all are returned enriched with student and registration data

---

### User Story 2 - Controller Layer Test Coverage (Priority: P2)

As a developer, I need tests for the four untested controllers (`userController`, `attendanceController`, `systemController`, `feedbackController`) so that HTTP request handling, input validation, and response formatting are verified.

**Why this priority**: Controllers are the API boundary — they validate inputs, call services/repositories, and format responses. The `userController` contains complex trimester sequencing logic that determines what the frontend displays. The `attendanceController` has duplicate detection. `systemController` has admin-gated cache clearing.

**Independent Test**: Can be tested by mocking the service container and verifying request/response handling for each endpoint. Delivers confidence that API endpoints handle inputs correctly and return expected response shapes.

**Acceptance Scenarios**:

1. **Given** a fall Intent period, **When** `getAppConfiguration` is called, **Then** available trimesters include the previous trimester (spring) and current (fall)
2. **Given** a fall Priority Enrollment period, **When** `getAppConfiguration` is called, **Then** available trimesters include current (fall) and next (winter)
3. **Given** no current period configured, **When** `getAppConfiguration` is called, **Then** available trimesters defaults to [fall]
4. **Given** a current period with a trimester, **When** `getAppConfiguration` is called, **Then** `nextTrimester` reflects the next trimester in the sequence (not the next period's trimester)
5. **Given** a 10-digit numeric access code, **When** `authenticateByAccessCode` is called, **Then** the system first attempts parent phone lookup
6. **Given** a 6-digit numeric access code, **When** `authenticateByAccessCode` is called, **Then** the system first checks admin, then instructor
7. **Given** no matching user for any access code, **When** `authenticateByAccessCode` is called, **Then** null data is returned (not an error)
8. **Given** a valid admin access code, **When** `getAdminByAccessCode` is called, **Then** the admin record is returned
9. **Given** an invalid access code, **When** `getAdminByAccessCode` is called, **Then** a NotFoundError is returned
10. **Given** a parent ID and trimester, **When** `getParentContactTabData` is called, **Then** only instructors teaching that parent's students are returned
11. **Given** a missing parentId parameter, **When** `getParentContactTabData` is called, **Then** a 400 error is returned
12. **Given** a valid registration and week, **When** `markAttendance` is called, **Then** an attendance record is created with the authenticated user's email
13. **Given** attendance already exists for that registration/week, **When** `markAttendance` is called, **Then** a conflict error is returned
14. **Given** missing required fields (registrationId, week), **When** `markAttendance` is called, **Then** a validation error is returned
15. **Given** a health check request, **When** `getHealth` is called, **Then** it returns 200 with status, environment, version info, and feature flags
16. **Given** a valid admin code, **When** `clearCache` is called, **Then** admin is validated, all database caches are cleared, and the admin email is returned in the response
17. **Given** an invalid admin code, **When** `clearCache` is called, **Then** an unauthorized error is returned
18. **Given** a missing admin code, **When** `clearCache` is called, **Then** a validation error is returned
19. **Given** feedback with message and state, **When** `submitFeedback` is called, **Then** feedback is logged and success is returned
20. **Given** feedback with no message, **When** `submitFeedback` is called, **Then** "(no message provided)" is logged and success is still returned

---

### User Story 3 - Repository Layer Test Coverage (Priority: P3)

As a developer, I need tests for `attendanceRepository` and `baseRepository` so that data access patterns, composite ID generation, duplicate detection, and model conversion are verified.

**Why this priority**: The repository layer sits between business logic and the database. `baseRepository` is the foundation for all repositories — if its CRUD operations or model conversion are wrong, everything breaks. `attendanceRepository` has composite ID generation and audit trail writing that need verification.

**Independent Test**: Can be tested by mocking `GoogleSheetsDbClient` and verifying correct calls are made with expected parameters. Delivers confidence that data access, ID generation, and audit logging work correctly.

**Acceptance Scenarios**:

1. **Given** valid attendance data, **When** `create` is called, **Then** a composite ID is generated from registrationId, week, schoolYear, and trimester
2. **Given** attendance already exists for that composite key, **When** `create` is called, **Then** duplicate creation is prevented
3. **Given** an attendance record is created, **When** the creation succeeds, **Then** an audit record is written to the ATTENDANCEAUDIT sheet
4. **Given** multiple attendance records for a registration, **When** `getAttendanceSummary` is called, **Then** totalSessions and attendanceRate (out of 12) are returned with sorted records
5. **Given** a registrationId and week, **When** `hasAttendance` is called, **Then** it returns true if a matching record exists, false otherwise
6. **Given** multiple registrationIds, **When** `getAttendanceForRegistrations` is called, **Then** attendance records for all specified registrations are returned
7. **Given** entity data and a mapper function, **When** `baseRepository.create` is called, **Then** `dbClient.appendRecord` is called and the result is converted via the mapper
8. **Given** an entity ID and updated data, **When** `baseRepository.update` is called, **Then** `dbClient.updateRecord` is called and the updated record is re-fetched
9. **Given** a mapper that returns null for invalid rows, **When** `baseRepository.findAll` is called, **Then** null entries are filtered from results
10. **Given** a field name and value, **When** `baseRepository.findBy` is called, **Then** all records matching that field value are returned

---

### User Story 4 - Utility Function Test Coverage (Priority: P4)

As a developer, I need tests for utility modules (`nativeDateTimeHelpers`, `dateHelpers`, `cloneUtility`, `uuidUtility`, `versionHash`, `errorHandling`) so that date/time parsing, object cloning, UUID generation, and type assertions are verified.

**Why this priority**: Utility functions are used throughout the codebase. `nativeDateTimeHelpers` is the most complex — it handles time parsing from multiple formats including Google Sheets serial dates, duration arithmetic, and format conversion. Bugs here cascade to scheduling, attendance, and registration logic.

**Independent Test**: Can be tested with pure function calls and expected outputs. No dependencies to mock. Delivers confidence in foundational operations used across all layers.

**Acceptance Scenarios**:

1. **Given** a 24-hour time string "15:30", **When** `convertTo12HourFormat` is called, **Then** "3:30 PM" is returned
2. **Given** midnight "0:00", **When** `convertTo12HourFormat` is called, **Then** "12:00 AM" is returned
3. **Given** null input, **When** `convertTo12HourFormat` is called, **Then** null is returned
4. **Given** a TonicDuration of 90 minutes, **When** `to24Hour()` is called, **Then** "01:30" is returned
5. **Given** a time string "3:30 PM", **When** `TonicDuration.fromTimeString` is called, **Then** a duration of 930 minutes (15*60+30) is created
6. **Given** a Google Sheets serial date number, **When** `parseGoogleSheetsTime` is called, **Then** the correct TonicDuration is returned
7. **Given** two TonicDurations, **When** `plus` is called, **Then** the sum is correct and clamped to 0-1439
8. **Given** a start time after end time, **When** `durationBetween` is called, **Then** overnight wrapping is handled correctly
9. **Given** a time value and range, **When** `isTimeInRange` is called, **Then** correct boolean is returned for in-range and out-of-range values
10. **Given** an object with null values, **When** `CloneUtility.clone` is called, **Then** a deep copy is returned with null values converted to empty strings
11. **Given** any call to `UuidUtility.generateUuid`, **When** the result is checked, **Then** it matches UUIDv4 format
12. **Given** a valid UUID string, **When** `isValidUuid` is called, **Then** true is returned
13. **Given** an invalid string, **When** `isValidUuid` is called, **Then** false is returned
14. **Given** `generateMultiple(5)`, **When** the result is checked, **Then** 5 unique UUIDs are returned
15. **Given** a non-null value, **When** `throwIfNo` is called, **Then** execution continues without error
16. **Given** null or undefined, **When** `throwIfNo` is called, **Then** an error is thrown with the provided message
17. **Given** BUILD_GIT_COMMIT is set, **When** `generateFrontendVersionHash` is called, **Then** the first 8 characters of the commit are returned
18. **Given** no git or env var available, **When** `generateFrontendVersionHash` is called, **Then** a hash derived from package.json version is returned
19. **Given** `getFrontendVersionHash` is called multiple times, **When** results are compared, **Then** the same value is returned each time (cached)

---

### Edge Cases

- What happens when `processRegistration` receives a group registration with a classId that doesn't exist in the system?
- How does `cancelRegistration` behave when the registration doesn't exist in the specified trimester table?
- What happens when `authenticateByAccessCode` receives an access code that matches both admin and instructor?
- How does `getAppConfiguration` handle a period with a null trimester value?
- What happens when `getAttendanceSummary` is called for a registration with zero attendance records?
- How does `TonicDuration` handle minutes at the boundary (0 and 1439)?
- What happens when `CloneUtility.clone` receives an object with circular references?
- How does `parseTimeString` handle completely invalid input (e.g., "not a time")?
- What happens when `baseRepository.update` is called with an ID that doesn't exist?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every public method on `RegistrationApplicationService` MUST have at least one test covering its success path and one covering its primary error path
- **FR-002**: Every public method on `DropRequestService` MUST have tests covering success, authorization failure, invalid period, duplicate prevention, and invalid status transition scenarios
- **FR-003**: Every static endpoint method on `UserController` MUST have tests covering valid input, invalid/missing input, and the correct response shape
- **FR-004**: The trimester sequencing logic in `UserController` MUST be tested for all three trimesters and all period types
- **FR-005**: Every static endpoint method on `AttendanceController` MUST have tests covering valid creation, duplicate detection, and missing field validation
- **FR-006**: `SystemController` MUST have tests covering `getHealth` (response shape, environment info) and `clearCache` (admin auth gating, cache invalidation). `testConnection` and `testSheetData` are excluded — they are low-level diagnostic endpoints that directly invoke Google Sheets API internals and carry minimal business logic risk
- **FR-007**: `FeedbackController.submitFeedback` MUST be tested for both present and absent message scenarios
- **FR-008**: `AttendanceRepository` MUST have tests covering composite ID generation, duplicate prevention, attendance summary calculation, and audit trail writing
- **FR-009**: `BaseRepository` CRUD methods MUST be tested with a mock database client and mapper function
- **FR-010**: Date/time helper classes MUST have tests covering construction, arithmetic, comparison, format conversion, and Google Sheets interop
- **FR-011**: 12-hour format conversion MUST be tested for midnight, noon, AM times, PM times, and null input
- **FR-012**: Object cloning MUST be tested for deep cloning, null-to-empty-string conversion, and nested objects
- **FR-013**: UUID generation MUST be tested for format validation, uniqueness, and batch generation
- **FR-014**: Version hash generation MUST be tested for each fallback path (environment variable, git commit, package version, timestamp)
- **FR-015**: Null assertion utility MUST be tested for null, undefined, and valid value inputs
- **FR-016**: All tests MUST mock external dependencies rather than making real API calls
- **FR-017**: All tests MUST follow the existing test conventions in the codebase
- **FR-018**: All existing tests MUST continue to pass after new tests are added

### Key Entities

- **Registration**: Core entity with group/private types, enriched with student/instructor/class data
- **DropRequest**: Lifecycle entity with pending/approved/rejected status transitions, linked to registration and parent
- **AttendanceRecord**: Composite-keyed entity (registrationId + week + schoolYear + trimester) with audit trail
- **TonicDuration**: Value object representing time-of-day as minutes (0-1439) with arithmetic and format conversion
- **TonicDateTime**: Value object wrapping Date with factory methods for Google Sheets serial dates and ISO strings

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 14 previously untested backend files have at least one test file covering their public methods
- **SC-002**: Service layer tests cover at least 3 paths per public method (success, primary error, edge case) — minimum 40 new tests
- **SC-003**: Controller layer tests cover valid input, invalid input, and response shape per endpoint — minimum 30 new tests
- **SC-004**: Repository layer tests cover CRUD operations, ID generation, and model conversion — minimum 15 new tests
- **SC-005**: Utility layer tests cover all documented input formats and boundary conditions — minimum 30 new tests
- **SC-006**: Total new test count is at least 115 tests
- **SC-007**: All existing tests plus all new tests pass in a single test run
- **SC-008**: No test relies on network access, file system state, or external service calls

## Assumptions

- Tests will use the existing test runner and configuration already present in the project
- Dependencies will be mocked consistently with patterns used in existing test files
- Controller tests will mock request/response objects and the service container rather than using HTTP request libraries
- The 12-session attendance rate denominator is a known constant, not a defect to be tested around
- Private helper methods on controllers can be tested indirectly through the public methods that call them
- Version hash git fallback tests may need to mock the child process to simulate environments without git
