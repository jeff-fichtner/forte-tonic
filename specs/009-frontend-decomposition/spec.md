# Feature Specification: Frontend Decomposition

**Feature Branch**: `009-frontend-decomposition`
**Created**: 2026-02-23
**Status**: Draft
**Input**: Decompose the frontend parentRegistrationForm.ts monolith and clean up viewModel.ts registration orchestration. Extract concerns into separate modules, unify entity interfaces, extract registration service, remove vestigial state, and move hardcoded business configuration to backend-served config.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Registration Entity Types (Priority: P1)

A developer maintaining the registration system needs a single authoritative set of entity type definitions (Instructor, Student, Class, Registration, RegistrationSubmitData) shared between the parent and admin registration forms. Currently these interfaces are independently defined in both forms with minor drift. Changes to entity shapes require updating two files and hoping they stay in sync.

**Why this priority**: This is the foundation that all other decomposition stories depend on. Without shared types, extracted modules would each need their own duplicate definitions, defeating the purpose of decomposition.

**Independent Test**: Can be tested by verifying that both registration forms compile and function correctly when importing from the shared type definitions, and that no entity interfaces remain defined inline in either form.

**Acceptance Scenarios**:

1. **Given** entity types are duplicated across parentRegistrationForm.ts and adminRegistrationForm.ts, **When** shared type definitions are created, **Then** both forms import from the shared location and no entity interfaces remain defined inline in either file.
2. **Given** a developer changes an entity field (e.g., adds a property to InstructorLike), **When** they update the shared definition, **Then** both forms receive the change without separate edits.
3. **Given** the existing frontend compiles with zero type errors, **When** types are unified, **Then** the frontend still compiles with zero type errors.

---

### User Story 2 - Parent Registration Form Decomposition (Priority: P2)

The parent registration form is a 3,652-line monolith containing five distinct concerns: availability calculation, cascading filter UI, group registration, private registration submission, and shared presentation helpers. A developer working on any one concern must navigate the entire file, risk unintended changes to unrelated logic, and cannot reuse individual pieces. The form should become a thin orchestrator that delegates to focused modules, matching the pattern already established by the admin registration form (611 lines, 6 delegated components).

**Why this priority**: This is the largest single source of complexity in the frontend. Decomposition unblocks future work (backend-served config, server-computed availability) and reduces change risk for the most critical user-facing workflow.

**Independent Test**: Can be tested by verifying that parent registration (both private lesson and group class) works identically before and after decomposition — same UI behavior, same data submitted, same validation messages — while the orchestrator file is under 800 lines.

**Acceptance Scenarios**:

1. **Given** a parent with one child selects a private lesson, **When** they choose instrument/day/length/instructor filters and pick a time slot, **Then** the cascading filter counts update correctly and the selected lesson data is submitted identically to the pre-decomposition behavior.
2. **Given** a parent with multiple children during enrollment period, **When** they select a student and choose a group class, **Then** grade eligibility filtering, capacity checking, and waitlist detection work identically to pre-decomposition behavior.
3. **Given** the availability engine is extracted to its own module, **When** the same filter selections are made, **Then** the slot counts and available/limited/unavailable classifications are identical to pre-decomposition output.
4. **Given** a developer needs to modify only the cascading filter UI, **When** they locate the relevant code, **Then** it resides in a single focused module without availability calculation or submission logic.

---

### User Story 3 - Registration Service Extraction (Priority: P3)

The viewModel currently contains a 108-line `createRegistrationWithEnrichment` method that handles endpoint routing (admin vs. parent, enrollment vs. non-enrollment), orchestrates delete-then-create for registration replacement, and enriches the response with student/instructor objects. This method also maintains vestigial state arrays (admins, instructors, students, registrations, classes, rooms, nextTrimesterRegistrations) that are initialized to empty and never populated because tabs fetch their own data. The registration orchestration logic should be extracted into a standalone service, and the dead state should be removed.

**Why this priority**: The viewModel registration logic is a correctness risk — the delete-then-create pattern means if creation fails after deletion, the old registration is lost. Extracting it clarifies the orchestration and makes it testable in isolation. Removing vestigial state reduces confusion for future developers.

**Independent Test**: Can be tested by verifying that registration creation (both regular and replacement), endpoint routing, and response enrichment work identically when called through the extracted service, and that viewModel no longer contains registration orchestration logic or unused state arrays.

**Acceptance Scenarios**:

1. **Given** a parent creates a new private registration during enrollment period, **When** the registration service is called, **Then** the correct endpoint is selected and the registration is created with the correct trimester.
2. **Given** a parent replaces an existing registration during enrollment, **When** the replacement flow runs, **Then** the old registration is deleted and the new one is created with the same behavior as before extraction.
3. **Given** an admin creates a registration outside enrollment period, **When** the registration service is called, **Then** the regular endpoint is used regardless of period type.
4. **Given** the viewModel after extraction, **When** a developer inspects its properties, **Then** no data arrays (admins, instructors, students, registrations, classes, rooms, nextTrimesterRegistrations) exist on the class.
5. **Given** tabs that call createRegistrationWithEnrichment, **When** they invoke it after extraction, **Then** they call the standalone service (directly or via a thin viewModel passthrough) with identical behavior.

---

### User Story 4 - Backend-Served Business Configuration (Priority: P4)

The frontend hardcodes business configuration that changes with the school's operational schedule: bus departure deadlines per day (Wednesday 4:15 PM, other days 4:45 PM), lesson lengths (30/45/60 minutes), operational hours (2 PM - 6 PM), scheduling interval (15 minutes), the instrument catalog, and Rock Band class display times and default length. When these values change (e.g., a new lesson length option, a bus schedule change, adding an instrument), a frontend code change and redeployment is required. These values should come from the backend configuration endpoint so that changes can be made in data without code changes.

**Why this priority**: This has the widest operational impact — bus deadlines, lesson lengths, and hours change with school policy. However, it requires backend changes (expanding the configuration endpoint) in addition to frontend changes, making it the most cross-cutting story.

**Independent Test**: Can be tested by modifying a business configuration value in the backend (e.g., changing Wednesday bus deadline from 4:15 PM to 4:30 PM) and verifying the frontend reflects the change without any frontend code change or redeployment.

**Acceptance Scenarios**:

1. **Given** the configuration endpoint returns bus deadlines per day, **When** the frontend validates a bus transportation selection, **Then** it uses the server-provided deadlines rather than hardcoded values.
2. **Given** the configuration endpoint returns available lesson lengths, **When** the parent registration form generates length filter chips, **Then** it displays exactly the lengths from the configuration response.
3. **Given** the configuration endpoint returns operational hours and scheduling interval, **When** the time slot generation runs, **Then** it uses the server-provided values for start hour, end hour, and interval.
4. **Given** the configuration endpoint returns the instrument catalog, **When** no instructor has specialties defined, **Then** the fallback instrument comes from the server-provided default rather than a hardcoded value.
5. **Given** the configuration endpoint returns Rock Band class display metadata (times string, default length), **When** a Rock Band class is formatted for display, **Then** the formatted string uses server-provided times rather than the hardcoded string.

---

### Edge Cases

- What happens if the configuration endpoint is unavailable when the frontend loads? The frontend should fall back to sensible defaults (the current hardcoded values) so the application remains functional.
- What happens if a new lesson length is added via configuration but the frontend UI doesn't have styling for it? The filter chip system should render any number of length options dynamically without hardcoded styling per length.
- What happens if the availability engine is extracted but receives empty or null instructor data? It should return zero availability across all dimensions without errors, matching current behavior.
- What happens if the registration service's delete-then-create replacement encounters a network failure between the delete and create? Current behavior (registration lost) is preserved — this is a pre-existing risk documented for future improvement, not introduced by decomposition.
- What happens during decomposition if the parent form's inline CSS styles (currently in JavaScript) are extracted? They should render identically — visual regression is not acceptable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a single shared location for registration entity type definitions (InstructorLike, StudentLike, ClassLike, RegistrationLike, RegistrationSubmitData, DaySchedule, TimeSlot) used by both parent and admin registration forms.
- **FR-002**: System MUST extract the availability calculation engine from parentRegistrationForm into a standalone module that accepts instructor data, registration data, and filter selections, and returns availability counts per dimension (instrument, day, length, instructor).
- **FR-003**: System MUST extract cascading filter UI logic (chip generation, filter state management, downstream cascade updates) from parentRegistrationForm into a standalone module.
- **FR-004**: System MUST extract group registration logic (class dropdown population, grade eligibility filtering, capacity checking, waitlist detection, group validation, group submission data assembly) from parentRegistrationForm into a standalone module.
- **FR-005**: System MUST extract private registration submission logic (time slot validation, registration data assembly, trimester routing, replaceRegistrationId handling) from parentRegistrationForm into a standalone module.
- **FR-006**: System MUST extract shared presentation helpers (filter chip creation with availability styling, instructor card creation, time slot element creation) from parentRegistrationForm into a standalone module.
- **FR-007**: The resulting parentRegistrationForm MUST be an orchestrator under 800 lines that delegates to the extracted modules, matching the delegation pattern of adminRegistrationForm.
- **FR-008**: System MUST extract the registration creation orchestration (endpoint routing, delete-then-create replacement, response enrichment) from viewModel into a standalone registration service.
- **FR-009**: System MUST remove vestigial state arrays (admins, instructors, students, registrations, classes, rooms, nextTrimesterRegistrations) from viewModel that are initialized but never populated.
- **FR-010**: The backend configuration endpoint MUST serve bus departure deadlines per day, available lesson lengths, operational hours (start and end), scheduling interval, default instrument, and Rock Band class display metadata (times string, default length).
- **FR-011**: The frontend MUST consume business configuration values from the configuration endpoint response rather than hardcoded constants, with fallback to current defaults if the endpoint response omits any value.
- **FR-012**: All existing parent registration functionality (private lessons, group classes, enrollment period behavior, bus validation, grade filtering, capacity checking) MUST work identically after decomposition — this is a zero-behavior-change refactor for end users.
- **FR-013**: The frontend MUST continue to compile with zero type errors after all changes.

### Key Entities

- **Registration Configuration**: Business rules that govern the registration system — bus deadlines, lesson lengths, operational hours, scheduling interval, instrument catalog, Rock Band display metadata. Currently scattered across frontend constants; will be served from the backend.
- **Availability Calculation**: The computed result of crossing instructors, their schedules, existing registrations, and filter selections to determine how many open slots exist per instrument/day/length/instructor. Currently computed inline in parentRegistrationForm; will be a standalone calculation module.
- **Registration Service**: The orchestration logic for creating registrations — endpoint selection based on role and period type, delete-then-create replacement flow, response enrichment with student/instructor data. Currently embedded in viewModel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The parentRegistrationForm orchestrator file is under 800 lines (down from 3,652).
- **SC-002**: Zero entity interface definitions remain duplicated between the parent and admin registration forms — all shared types come from one location.
- **SC-003**: The viewModel file has zero registration orchestration logic and zero vestigial data arrays.
- **SC-004**: All existing frontend tests pass without modification (except import path changes).
- **SC-005**: The frontend compiles with zero type errors (`tsc --noEmit` for both backend and web configs).
- **SC-006**: A business configuration value (e.g., bus deadline, lesson length) can be changed on the backend and reflected in the frontend without any frontend code change.
- **SC-007**: Parent registration (both private and group) produces identical behavior for end users — same filter counts, same validation messages, same submitted data payloads.

## Assumptions

- The existing admin registration form component pattern (StudentSelector, InstructorSelector, ClassSelector, etc.) is the correct architectural reference for decomposition. The parent form will follow this pattern where applicable, adding new components for concerns the admin form does not have (availability engine, cascading filters).
- The availability calculation will remain client-side in this spec. Moving it to a server-computed endpoint is a future optimization that decomposition enables but does not include.
- The delete-then-create registration replacement pattern is preserved as-is. Making it atomic (single backend endpoint) is a future improvement that extraction enables but does not include.
- The configuration endpoint expansion adds fields to the existing `/api/getAppConfiguration` response. No new endpoint is needed.
- Rock Band class identification will continue to use the `rockBandClassIds` array already served by the configuration endpoint. The new fields are only for display metadata (times string, default length) currently hardcoded in classManager.
- Fallback defaults for configuration values will use the current hardcoded values, ensuring zero disruption if the backend is not yet updated when the frontend changes deploy.
- The Vite build and `tsc --noEmit -p tsconfig.web.json` are the compilation verification gates.

## Scope Boundaries

**In scope**:
- Extracting modules from parentRegistrationForm.ts
- Unifying entity interfaces between parent and admin forms
- Extracting registration service from viewModel
- Removing vestigial viewModel state
- Adding business configuration fields to the backend configuration endpoint
- Frontend consumption of backend-served configuration with fallback defaults

**Out of scope**:
- Server-computed availability (replacing the client-side availability engine with a backend endpoint)
- Atomic registration replacement (single backend endpoint for delete+create)
- Visual redesign of the parent registration UI
- Modifying the admin registration form's existing component structure
- Performance optimization of the availability calculation algorithm
- Rewriting the cascading filter system's UX behavior
