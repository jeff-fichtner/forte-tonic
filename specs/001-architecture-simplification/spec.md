# Feature Specification: Architecture Simplification

**Feature Branch**: `001-architecture-simplification`
**Created**: 2026-02-18
**Status**: Draft
**Input**: User description: "Simplify the codebase architecture by removing value object IDs, consolidating serialization to toJSON(), standardizing API response envelopes, routing all frontend fetches through HttpService, and removing dead code across all models"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Entity Identity (Priority: P1)

Every entity in the system (Student, Registration, Instructor, Admin, Parent, Class) uses plain string IDs. When a developer reads any ID from any layer — model, database, API response, frontend state — it is always a string. No value objects, no defensive unwrapping, no `id?.value || id` patterns.

**Why this priority**: The value object ID system is the root cause of defensive unwrapping patterns across all layers. Every other simplification depends on IDs being plain strings first.

**Independent Test**: Can be verified by confirming that all model constructors store IDs as plain strings, that no `extractStringValue` or `extractValue` functions exist in the codebase, and that all existing tests pass with the simplified ID handling.

**Acceptance Scenarios**:

1. **Given** a Student created from a database row, **When** accessing `student.id`, **Then** it returns a plain string (not an object with a `.value` property)
2. **Given** a Registration with a studentId reference, **When** comparing `registration.studentId === student.id`, **Then** simple `===` string comparison succeeds without unwrapping
3. **Given** any model instance, **When** searching for `?.value`, `extractStringValue`, or `typeof id === 'object'` in the codebase, **Then** zero matches are found

---

### User Story 2 - Single Serialization Path (Priority: P1)

Every model defines exactly one `toJSON()` method that produces its canonical shape. When Express sends a model as JSON, the output is predictable and consistent. No competing serialization systems exist.

**Why this priority**: Multiple serialization paths (`toJSON()`, `toDataObject()`, `UserTransformService`) produce different shapes for the same entity, forcing consumers to handle multiple representations. This must be resolved alongside ID simplification to prevent shape conflicts.

**Independent Test**: Can be verified by confirming that every model has a `toJSON()` method, that no `toDataObject()` methods or `UserTransformService` exist, and that `JSON.stringify(anyModel)` produces a flat object with consistent field names.

**Acceptance Scenarios**:

1. **Given** any model instance, **When** calling `JSON.stringify(model)`, **Then** the output is a flat object with string IDs and one canonical name per field
2. **Given** the codebase, **When** searching for `toDataObject` or `UserTransformService`, **Then** zero matches are found
3. **Given** a Student serialized from the API and a Student serialized in the frontend, **When** comparing field names, **Then** they are identical (no `phone`/`phoneNumber` or `specialties`/`instruments` divergence)

---

### User Story 3 - Uniform API Responses (Priority: P2)

Every API endpoint returns responses in the standard envelope: `{ success: true, data: <payload> }` on success and `{ success: false, error: { message, code, type } }` on failure. No endpoint bypasses this envelope.

**Why this priority**: The authentication endpoint currently returns raw data outside the envelope, forcing the frontend to special-case its response handling. Standardizing this after serialization is fixed ensures the frontend can treat all API calls identically.

**Independent Test**: Can be verified by calling every API endpoint and confirming the response body always contains a `success` boolean at the top level, with data nested under `data` on success.

**Acceptance Scenarios**:

1. **Given** a valid access code, **When** calling the authentication endpoint, **Then** the response is `{ success: true, data: { ... } }` (not raw user data)
2. **Given** an invalid access code, **When** calling the authentication endpoint, **Then** the response is `{ success: false, error: { message, code, type } }`
3. **Given** any API endpoint, **When** the response is successful, **Then** the payload is always nested under `data` — never returned at the top level

---

### User Story 4 - Single Frontend Fetch Pattern (Priority: P2)

All API calls from the frontend go through `HttpService`. No direct `fetch()` calls exist in tabs, viewModel, main.js, or any other frontend code. Envelope unwrapping, auth headers, and error handling happen in one place.

**Why this priority**: Three fetch patterns (HttpService, manual fetch with envelope unwrap, raw fetch with no unwrap) create inconsistent error handling and data access. After the API layer is standardized, the frontend can rely on a single fetch path.

**Independent Test**: Can be verified by searching the frontend codebase for direct `fetch()` calls outside of HttpService and confirming zero matches.

**Acceptance Scenarios**:

1. **Given** the frontend codebase, **When** searching for `fetch(` outside HttpService, **Then** zero matches are found
2. **Given** any tab making an API call, **When** it receives data, **Then** the data is already unwrapped from the envelope (HttpService handles this)
3. **Given** the empty `ApiClient` class, **When** searching for it in the codebase, **Then** it no longer exists

---

### User Story 5 - Clean Database Layer (Priority: P2)

The database client has a single `appendRecord` method for writing rows. No `v2` variants or duplicate write paths exist. All `fromDatabaseRow()` factory methods return models with plain string IDs — no value objects leak from the persistence layer. Repositories perform simple string comparisons for ID lookups with no post-processing or defensive unwrapping.

**Why this priority**: The database layer sits between models and the API. After Story 1 standardizes IDs in models, the database layer must be verified and cleaned up before the API layer (Story 3) can trust what it receives. The dual `appendRecord`/`appendRecordv2` methods are an independent inconsistency in this layer.

**Independent Test**: Can be verified by confirming a single `appendRecord` method exists (no `v2`), that `fromDatabaseRow()` on every model returns plain string IDs, and that repository `findBy`/`findById` methods use simple `===` comparison.

**Acceptance Scenarios**:

1. **Given** the database client, **When** searching for `appendRecordv2` or `appendRecord` variants, **Then** only one `appendRecord` method exists
2. **Given** any model's `fromDatabaseRow()` output, **When** accessing ID fields, **Then** all IDs are plain strings
3. **Given** any repository's `findById` method, **When** comparing IDs, **Then** it uses simple `===` string comparison with no unwrapping

---

### User Story 6 - No Dead Code in Models (Priority: P3)

Model classes contain only properties and methods that are populated from the database and called from at least one code path. No placeholder properties, stub methods, or unused compatibility aliases exist.

**Why this priority**: Dead code creates false expectations about what the system supports. After the structural changes in Stories 1-5, a cleanup pass removes accumulated dead weight. This is lower priority because dead code doesn't break functionality — it just misleads developers.

**Independent Test**: Can be verified by searching for each property and method identified as dead code and confirming they have been removed, then running the full test suite to confirm nothing depended on them.

**Acceptance Scenarios**:

1. **Given** the Admin model, **When** inspecting its properties, **Then** no `permissions`, `isSuperAdmin`, or `lastLoginDate` properties exist
2. **Given** the Student model, **When** inspecting its methods, **Then** no `getAgeCategory()`, `canTakeAdvancedLessons()`, or `needsSpecialAccommodations()` methods exist
3. **Given** any model, **When** every property is traced to a data source (database column or computed from database data), **Then** all properties have a source — none are placeholders

---

### User Story 7 - Standardized Constructor Signatures (Priority: P3)

All models use a single `constructor(data)` pattern accepting a data object. No positional argument constructors exist. Factory methods (`fromDatabaseRow`, `fromApiData`) pass data objects to the constructor.

**Why this priority**: Inconsistent constructors (some take data objects, some take positional args) make it harder to reason about model creation. This is a lower-risk cleanup that rounds out the model standardization.

**Independent Test**: Can be verified by inspecting each model's constructor signature and confirming it accepts a single `data` parameter, and that all factory methods pass data objects.

**Acceptance Scenarios**:

1. **Given** the Parent model, **When** creating an instance, **Then** the constructor accepts `constructor(data)` with named properties, not `constructor(id, email, lastName, firstName, options)`
2. **Given** the Class model, **When** creating an instance, **Then** the constructor accepts `constructor(data)` with named properties, not positional arguments
3. **Given** any model's factory methods, **When** they create instances, **Then** they pass a single data object to the constructor

---

### Edge Cases

- What happens when existing tests construct models with value object IDs? Tests must be updated to pass plain strings.
- What happens when the frontend references non-canonical field names (`phone` instead of `phoneNumber`)? These references must be found and updated as part of Story 2.
- What happens when a model's `toJSON()` output changes shape? The frontend code consuming that shape must be updated in the same change to avoid runtime breakage.
- How is the authentication endpoint change coordinated between backend and frontend? Both sides must be updated together — the endpoint response format and the frontend login handler that parses it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All model ID fields MUST be stored as plain strings — no value objects wrapping primitive types
- **FR-002**: No `extractStringValue`, `extractValue`, or equivalent coercion functions MUST exist in the codebase
- **FR-003**: No defensive ID unwrapping patterns (`?.value`, `typeof x === 'object'`, `.getValue()`) MUST exist in the codebase
- **FR-004**: Every model MUST define exactly one `toJSON()` method as the single serialization path
- **FR-005**: No competing serialization systems (`toDataObject()`, `UserTransformService`, manual mapping in controllers) MUST exist
- **FR-006**: Each concept MUST have exactly one canonical field name — no dual-name fields for the same data
- **FR-007**: Every API endpoint MUST return responses in the `{ success, data }` / `{ success, error }` envelope
- **FR-008**: All frontend API calls MUST route through `HttpService` — no direct `fetch()` calls
- **FR-009**: All model constructors MUST use the `constructor(data)` single-object pattern
- **FR-010**: No model properties or methods MUST exist that are not populated from the database or called from at least one code path
- **FR-011**: The database layer MUST return models with plain string IDs — no value objects leaking from the persistence layer
- **FR-012**: All existing tests MUST pass after each phase of changes
- **FR-013**: The `appendRecord` / `appendRecordv2` dual write methods MUST be consolidated into a single method

### Key Entities

- **Student**: Core entity with id, name, grade, parent references. Currently wraps id in StudentId value object.
- **Registration**: Links student to instructor for a trimester. Currently wraps id, studentId, instructorId in value objects.
- **Instructor**: Teaching staff with id, name, specialties. Currently wraps id in InstructorId value object.
- **Admin**: Administrative users with id, name, access code. Already uses plain string IDs.
- **Parent**: Parent/guardian with id, name, contact info. Already uses plain string IDs but has positional constructor.
- **Class**: Lesson scheduling entity. Already uses plain string IDs but has positional constructor.

## Assumptions

- The canonical field name decisions (`phone` vs `phoneNumber`, `specialties` vs `instruments`) will be determined during the planning phase by inspecting which name the database column uses
- Factory methods that are not called from any code path (`fromApiData` on some models) will be removed rather than preserved
- The empty `ApiClient` class serves no purpose and can be deleted without impact

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero instances of `?.value`, `extractStringValue`, `typeof id === 'object'`, or equivalent patterns in the codebase (currently 20+)
- **SC-002**: Zero direct `fetch()` calls in frontend code outside of HttpService (currently 4+)
- **SC-003**: Zero model properties or methods that cannot be traced to a database column or active caller (currently 15+ identified dead properties/methods)
- **SC-004**: Every API endpoint returns the standard `{ success, data }` envelope with zero exceptions (currently 1 exception: authentication)
- **SC-005**: All existing unit and integration tests pass after the full set of changes
- **SC-006**: Each of the three user roles (admin, instructor, parent) can complete their primary workflows: login, view data, and perform their role-specific actions (registration, attendance, schedule viewing)
