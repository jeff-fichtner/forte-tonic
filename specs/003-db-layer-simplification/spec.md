# Feature Specification: DB Layer Simplification

**Feature Branch**: `003-db-layer-simplification`
**Created**: 2026-02-21
**Status**: Implemented
**Input**: User description: "Simplify the backend database layer for maintainability and SQL readiness. Data comes in and out uniformly. Google Sheets quirks (timestamp parsing, etc.) should be hidden in the Sheets layer itself since they won't exist with SQL."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Single Column Schema Definition (Priority: P1)

Each entity's column-to-field mapping is defined once, in the model, and used by the DB client for all read/write operations. Today the mapping is defined twice: as a `columnMap` in `googleSheetsDbClient.ts` (~380 lines of `workingSheetInfo`) and as hardcoded array indices in each model's `fromDatabaseRow()`. These can silently drift.

**Why this priority**: This is the foundational change. Every other story depends on column definitions living in one place. It also eliminates the largest block of duplicated code in the codebase (6 duplicated registration/audit column maps plus a legacy variant).

**Independent Test**: For any model, changing a column order in its schema definition and running the test suite confirms that reads and writes both use the same source of truth. No test should reference column indices directly.

**Acceptance Scenarios**:

1. **Given** a model with a `static columns` definition, **When** the DB client reads a sheet, **Then** it uses that column list to convert `string[]` rows into `Record<string, string>` objects before passing them to the model.
2. **Given** a model with a `static columns` definition, **When** the DB client writes a record, **Then** it uses that column list to convert the model's plain-object output into a positional `string[]` row.
3. **Given** the registration column schema is defined once, **When** any of the 3 trimester sheets or their audit sheets are accessed, **Then** they all reference the same column definition — no per-trimester duplication.
4. **Given** `googleSheetsDbClient.ts`, **When** the refactor is complete, **Then** the `workingSheetInfo` block contains only sheet name, start row, and a reference to the model's column schema — no inline column maps.

---

### User Story 2 — Models Receive Named Fields, Not Arrays (Priority: P1)

Model constructors and factory methods receive `Record<string, string>` (named fields), never `string[]` (positional arrays). The DB client is responsible for the array-to-object conversion using the model's column schema.

**Why this priority**: Co-equal with US1 — together they establish the uniform data flow. This is the key change for SQL readiness: SQL returns named columns natively, so models that expect named fields work with both Sheets and SQL without modification.

**Independent Test**: Every model's constructor can be called with a `Record<string, string>` and produces a valid instance. No model code references `row[N]` for any integer N.

**Acceptance Scenarios**:

1. **Given** a raw `string[]` row from Google Sheets, **When** the DB client processes it, **Then** it converts it to `Record<string, string>` using the model's column schema before invoking the model factory.
2. **Given** a model's `fromDatabaseRow` method, **When** it is refactored, **Then** it accepts `Record<string, string>` (not `string[]`) and delegates to the constructor.
3. **Given** any model constructor, **When** it receives data, **Then** all fields are accessed by name (e.g., `data.studentId`), never by position (e.g., `data[1]`).
4. **Given** a model's `toDatabaseRow` is removed, **When** writing, **Then** the DB client converts the model's `toJSON()` or named-field output back to `string[]` using the column schema.

---

### User Story 3 — Sheets-Specific Parsing Hidden in DB Client (Priority: P2)

All Google Sheets format quirks — time format parsing, boolean string conversion, date string coercion — and field-name remappings (`isDeactivated` → `isActive` with inversion) are handled in the Sheets DB client layer, not in models. Models receive clean, typed-ready values.

**Why this priority**: Depends on US1/US2 (the named-field pipeline must exist first). This is what makes the models truly storage-agnostic. When swapping to SQL, only the DB adapter changes — models stay identical.

**Independent Test**: Grep the models directory for Google Sheets-specific parsing (`parseTimeString`, `instanceof Date` checks on string fields, `.toLowerCase() === 'true'` boolean parsing). None should remain. The same model constructor works whether the data came from Sheets or from a test fixture with clean values.

**Acceptance Scenarios**:

1. **Given** a Google Sheets time value (decimal like `0.65625` or string like `"3:30 PM"`), **When** the DB client reads the Classes sheet, **Then** it converts the value to 24-hour format (`"15:30"`) before passing it to the Class model.
2. **Given** the Instructors sheet has an `isDeactivated` column (string), **When** the DB client reads the row, **Then** it maps this to `isActive: boolean` (inverting the value) before passing it to the Instructor model. This is a field-name remapping with type coercion, not a Sheets format quirk, but it belongs in the DB client as a field transform because the model should receive clean, ready-to-use field names.
3. **Given** an ISO date string from a Sheets cell, **When** the DB client reads a registration row, **Then** date fields arrive at the model as ISO strings — the model parses them to `Date` objects in its constructor, not via Sheets-specific logic.
4. **Given** models in `src/models/shared/`, **When** searched for Sheets-specific parsing in `fromDatabaseRow` methods, **Then** no `fromDatabaseRow` calls `DateHelpers.parseTimeString()` or checks `instanceof Date` as a guard against Sheets returning Date objects. (Note: models may still import `DateHelpers` for display-formatting getters like `formattedStartTime` — that is display logic, not Sheets parsing, and is acceptable.)

---

### User Story 4 — Audit Record Creation Moved Out of DB Client (Priority: P2)

Audit trail logic (registration audit records, attendance audit records) moves from `googleSheetsDbClient.ts` into the repository layer. The DB client becomes a generic read/write adapter with no domain knowledge.

**Why this priority**: Depends on US1/US2. The DB client currently knows the internal structure of registration and attendance records in order to create audit entries. This couples storage to domain logic and makes the DB client harder to swap for SQL.

**Independent Test**: The `GoogleSheetsDbClient` class has zero references to `RegistrationRecord`, `AttendanceRecord`, or any domain-specific field names. Audit record creation is testable at the repository level with mocked DB writes.

**Acceptance Scenarios**:

1. **Given** `googleSheetsDbClient.ts`, **When** the refactor is complete, **Then** it contains no `#createRegistrationAuditRecord` or `#createAttendanceAuditRecord` methods.
2. **Given** a registration is created or updated, **When** the repository handles the write, **Then** the repository (not the DB client) creates and writes the audit record as a separate operation.
3. **Given** an attendance record is created or deleted, **When** the repository handles the write, **Then** the repository creates and writes the attendance audit record.
4. **Given** the DB client's `appendRecord` method, **When** called, **Then** it appends the row and returns — no implicit side-effect audit writes.

---

### User Story 5 — Flatten BaseRepository (Priority: P3)

Eliminate or radically simplify `BaseRepository`. Today every concrete repository overrides most of its methods, making the base class an indirection layer that obscures data flow rather than reducing code.

**Why this priority**: Lower priority because it's a code organization improvement, not a data-flow change. But it removes a layer of abstraction that makes the codebase harder to follow.

**Independent Test**: Each repository's public API still works identically (same method signatures, same return types). Existing tests pass without modification.

**Acceptance Scenarios**:

1. **Given** `BaseRepository`, **When** the refactor is complete, **Then** it provides only genuinely shared behavior: holding a `dbClient` reference, providing `logger`, and offering a `findAll` + `findById` default implementation that repositories can use or override.
2. **Given** `UserRepository`, **When** it no longer extends `BaseRepository<Record<string, unknown>>`, **Then** it directly holds a `dbClient` and `logger` with no generic type parameter abuse.
3. **Given** `DropRequestRepository`, **When** it no longer overrides every method, **Then** shared methods from the base are used directly where applicable.

---

### User Story 6 — Deduplicate Registration Sheet Configuration (Priority: P1)

Registration column definitions are duplicated across `googleSheetsDbClient.ts`: the 20-field registration map is copy-pasted for 3 trimester sheets, and the 26-field audit map is copy-pasted for 3 trimester audit sheets (plus a legacy `REGISTRATIONSAUDIT` entry with 24 fields). After this change, there is one registration column definition and one audit column definition, parameterized by trimester name. The legacy `REGISTRATIONSAUDIT` entry is reconciled or removed.

**Why this priority**: Co-dependent with US1. The deduplication is a direct consequence of moving column definitions to the model. A column change today requires editing 6-7 nearly-identical blocks.

**Independent Test**: A single change to the registration column schema (e.g., adding a column) requires changing exactly one definition, not six.

**Acceptance Scenarios**:

1. **Given** the registration column schema, **When** it is defined, **Then** it appears exactly once in the codebase. The audit column schema also appears exactly once (extending the registration schema with audit-specific fields).
2. **Given** a trimester name like `"fall"`, **When** the DB client needs sheet configuration for `registrations_fall`, **Then** it constructs the sheet name from the trimester and references the shared registration column schema.
3. **Given** a trimester audit sheet like `registrations_fall_audit`, **When** the DB client needs its configuration, **Then** it constructs the sheet name from the trimester and references the shared audit column schema.
4. **Given** the legacy `REGISTRATIONSAUDIT` sheet config (24 fields, missing `linkedPreviousRegistrationId`), **When** the refactor is complete, **Then** it either uses the same audit schema as the trimester audit sheets or is explicitly documented as a separate legacy schema.

---

### Edge Cases

- What happens when a Google Sheets row has fewer columns than the schema expects? The DB client must pad missing columns with empty strings, as it does today.
- What happens when a model's column schema is updated but the actual spreadsheet hasn't been updated? The system must handle missing trailing columns gracefully (empty string defaults), same as current behavior.
- What happens to `fromDatabaseRow` callers on the frontend (browser)? Currently no browser-side code in `src/web/` calls `fromDatabaseRow`. If this changes before implementation, any new callers must pass `Record<string, string>`, not `string[]`.
- What happens to `PeriodService._parsePeriodRow`? It currently does its own positional parsing (`row[0]`, `row[1]`, `row[2]`). It must be updated to receive named fields from the DB client like all other consumers.
- `Registration.fromDatabaseRow` contains a `typeof window !== 'undefined'` guard to determine `isWaitlistClass` via browser ClassManager or server-side title check. When `fromDatabaseRow` is refactored to accept named fields, this environment-specific logic should move to the caller (repository or DB client field transform), not remain in the model factory.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each model MUST define its column schema as a static property (ordered array of field names) that serves as the single source of truth for column-to-field mapping.
- **FR-002**: `GoogleSheetsDbClient` MUST use model column schemas to convert between positional `string[]` rows and named `Record<string, string>` objects in both read and write directions.
- **FR-003**: `GoogleSheetsDbClient` MUST NOT contain domain-specific logic (audit record creation, entity-specific field knowledge). It MUST be a generic sheet read/write adapter.
- **FR-004**: Model constructors and factory methods MUST accept `Record<string, string>` (named fields), not `string[]` (positional arrays).
- **FR-005**: All Google Sheets-specific data transformations (time format parsing, boolean string conversion, date coercion) MUST occur in the DB client layer before data reaches models.
- **FR-006**: The registration column schema MUST be defined exactly once and shared across all 3 trimester sheets and their audit variants.
- **FR-007**: `toDatabaseRow()` methods on models MUST be removed. The DB client MUST handle object-to-row conversion using the column schema.
- **FR-008**: All existing tests MUST pass after refactoring. No behavioral changes to API responses, data persistence, or query results.
- **FR-009**: `fromDatabaseRow` methods in `src/models/shared/` MUST NOT contain Sheets-specific parsing logic. Models may import utility modules for display formatting in getters.
- **FR-010**: The `workingSheetInfo` configuration in the DB client MUST contain only sheet name, start row, and a reference to the column schema — no inline column maps.

### Key Entities

- **Column Schema**: An ordered array of field names defined on each model (e.g., `Registration.columns = ['id', 'studentId', 'instructorId', ...]`). Position in the array corresponds to column position in the spreadsheet. Used by the DB client for all row ↔ object conversions.
- **Sheet Config**: Minimal per-sheet configuration in the DB client: sheet name, start row, reference to column schema, optional audit sheet name. Replaces the current ~380-line `workingSheetInfo` block.
- **Field Transform**: An optional per-field transformation defined in the DB client layer for Sheets-specific parsing (e.g., `isDeactivated` string → `isActive` boolean, time decimal → 24-hour string). These transforms are Sheets-adapter concerns and do not exist in models.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero column-index references (`row[N]`) exist in any model file under `src/models/shared/`.
- **SC-002**: The `workingSheetInfo` block in `googleSheetsDbClient.ts` is reduced from ~380 lines to under 80 lines.
- **SC-003**: The registration column schema appears exactly 1 time in the codebase (not 6). The audit column schema also appears exactly 1 time.
- **SC-004**: `googleSheetsDbClient.ts` contains zero references to domain-specific types (`RegistrationRecord`, `AttendanceRecord`) and zero audit-construction logic. Field transform definitions (which reference column names like `isDeactivated`, `startTime`, etc.) are acceptable — they are Sheets-adapter concerns, not domain logic.
- **SC-005**: All 544 existing tests pass with no modifications to test assertions (test infrastructure changes like mock setup are acceptable).
- **SC-006**: No `fromDatabaseRow` method in `src/models/shared/` calls Sheets-specific parsing functions (`DateHelpers.parseTimeString`, `instanceof Date` guards). Models may still import `DateHelpers` for display-formatting getters.
- **SC-007**: Adding a new column to the registration schema requires changing exactly 1 file (the model), not 6+ locations.
