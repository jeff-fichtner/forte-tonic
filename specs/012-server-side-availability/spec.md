# Feature Specification: Server-Side Availability Pre-Computation

**Feature Branch**: `012-server-side-availability`
**Created**: 2026-03-02
**Status**: Draft
**Input**: User description: "Move the parent registration tab's availability computation (AvailabilityEngine) from the client to the server. The server pre-computes all valid time slots and returns them as a flat array keyed by student grade. The client stores this array and derives cascading filter chip counts via Array.filter() + counting — no server round-trip on chip taps. The only additional fetch occurs when a parent selects an existing registration to modify during enrollment periods, which re-fetches with an excludeRegistrationId query param."

## User Scenarios & Testing

### User Story 1 - Parent Browses Private Lesson Availability (Priority: P1)

A parent opens the registration tab to find a private lesson for their child. The system displays cascading filter chips (Instrument, Day, Length, Instructor) with accurate availability counts. The parent taps chips to narrow their options. Each chip tap instantly updates downstream chip counts and the visible time slot grid — with no perceptible delay and no additional server communication.

**Why this priority**: This is the core interaction loop for the most common registration action. Every parent registering for a private lesson uses these filters multiple times per session.

**Independent Test**: Can be fully tested by loading the registration tab, verifying chip counts appear, tapping chips in sequence, and confirming downstream counts update instantly without network requests visible in browser developer tools.

**Acceptance Scenarios**:

1. **Given** a parent loads the registration tab, **When** the page finishes loading, **Then** all four filter chip rows (Instrument, Day, Length, Instructor) display with accurate availability counts matching what the previous client-side engine would have computed.
2. **Given** the parent taps an Instrument chip (e.g., "Piano"), **When** downstream chips regenerate, **Then** Day, Length, and Instructor chip counts reflect only slots for that instrument — and no network request is made.
3. **Given** the parent taps a Day chip after selecting an Instrument, **When** downstream chips regenerate, **Then** Length and Instructor counts reflect the combined filter — and no network request is made.
4. **Given** the parent applies all four filters, **When** the time slot grid updates, **Then** only matching instructor cards and slots are visible.
5. **Given** a chip has zero availability, **When** it is rendered, **Then** it appears visually disabled (unavailable styling) and cannot be selected.

---

### User Story 2 - Parent Switches Between Children (Priority: P1)

A parent with multiple children switches the student selector. The filter chips and time slot grid update to reflect the newly selected child's grade eligibility — different grades may show different instructors and availability counts. This happens without an additional server call.

**Why this priority**: Parents with multiple children are a common case. Grade-based instructor eligibility directly affects which slots are available, so switching students must update availability correctly.

**Independent Test**: Can be tested by logging in as a parent with two children in different grades, selecting each child in sequence, and verifying that chip counts and visible instructors change appropriately.

**Acceptance Scenarios**:

1. **Given** a parent has children in grade 2 and grade 6, **When** the parent switches from the grade-2 child to the grade-6 child, **Then** the filter chips update to reflect instructor grade eligibility for grade 6 — without a server request.
2. **Given** a parent switches students, **When** any previous filter selections exist, **Then** all filters and the time slot selection are reset.

---

### User Story 3 - Parent Modifies an Existing Registration During Enrollment (Priority: P2)

During enrollment periods, a parent selects an existing registration to modify from the "Modify" dropdown. The system refreshes availability data excluding the selected registration from conflict checks, so the parent sees their current time slot as available for re-selection along with any other slots freed by removing that registration's conflict.

**Why this priority**: Registration modification is a secondary but important enrollment-period workflow. It requires accurate conflict exclusion to prevent parents from losing their current slot when exploring alternatives.

**Independent Test**: Can be tested during an enrollment period by selecting an existing registration from the Modify dropdown, then verifying that the parent's current slot (and any slots previously blocked only by that registration) appear as available.

**Acceptance Scenarios**:

1. **Given** a parent is in an enrollment period with existing registrations, **When** the parent selects a registration from the Modify dropdown, **Then** the system fetches updated availability data that excludes the selected registration from conflict checks.
2. **Given** the re-fetch completes, **When** the filter chips and time slot grid update, **Then** the parent's current time slot appears as available.
3. **Given** the parent selects "Create New" from the Modify dropdown, **When** the availability refreshes, **Then** all registrations are included in conflict checks (no exclusion).

---

### User Story 4 - Availability Data Accuracy (Priority: P1)

The server-computed availability matches what the previous client-side engine computed. No instructor slots are missing or incorrectly shown. Conflict detection with existing registrations produces identical results.

**Why this priority**: Data accuracy is a non-negotiable correctness requirement. Parents must see the same availability they would have seen with the previous implementation.

**Independent Test**: Can be validated by running unit tests that compare server-computed slot output against the same input data processed by the original client-side algorithm, asserting identical results.

**Acceptance Scenarios**:

1. **Given** a set of instructors with known schedules and existing registrations, **When** the server computes available time slots, **Then** the result matches the output of the previous client-side computation for the same inputs.
2. **Given** an instructor has a registration conflict on Monday at 3:00 PM for 30 minutes, **When** slots are computed, **Then** the 3:00 PM slot on Monday for that instructor is excluded.
3. **Given** an instructor teaches grades 3-6 and the student is in grade 2, **When** slots are computed for that grade, **Then** no slots appear for that instructor.

---

### Edge Cases

- What happens when a parent has no children in the system? The registration tab hides the form entirely (existing behavior, unchanged).
- What happens when all instructors are fully booked? All chips show zero availability (unavailable styling). The time slot grid is empty.
- What happens when an instructor has no availability schedule configured? That instructor produces zero slots (existing behavior).
- What happens when a parent has children in the same grade? Both children share the same pre-computed slot array (keyed by grade), avoiding redundant computation.
- What happens when a parent selects a registration to modify but then switches students? The modification selection is cleared and availability reverts to the full conflict set.
- What happens when a student has no grade set (null)? The student is treated as eligible for all instructors (existing behavior preserved).

## Requirements

### Functional Requirements

- **FR-001**: The parent registration tab endpoint MUST return pre-computed available time slots alongside existing data (instructors, students, classes, registrations).
- **FR-002**: Pre-computed slots MUST be keyed by student grade, so switching between children of different grades requires no additional server call.
- **FR-003**: Each time slot MUST include: instructor identifier, day, formatted time, lesson length, and instrument — sufficient for the client to render chips and the time slot grid.
- **FR-004**: The server MUST exclude time slots that conflict with existing registrations for the requested trimester.
- **FR-005**: The endpoint MUST accept an optional parameter to exclude a specific registration from conflict checks, supporting the enrollment-period modification workflow.
- **FR-006**: The client MUST derive filter chip availability counts by filtering the pre-computed slot array — not by re-computing from raw instructor schedules.
- **FR-007**: Tapping a filter chip MUST NOT trigger any server communication. All downstream chip regeneration and time slot grid filtering MUST happen locally.
- **FR-008**: The client-side availability computation functions that have been moved to the server MUST be removed from the frontend codebase.
- **FR-009**: The time slot data type MUST be defined in the shared models directory so both server and client reference the same structure.
- **FR-010**: During enrollment periods, the server MUST use registrations from the next trimester for conflict checks. During registration periods, the server MUST use current trimester registrations.

### Key Entities

- **AvailableTimeSlot**: A pre-computed, conflict-free time slot representing one valid instructor-day-time-length-instrument combination. Keyed by student grade in the response. Consumed by the client for filtering and display.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Filter chip interactions (tap to update downstream chips and grid) complete with no visible delay — the user perceives the update as instant.
- **SC-002**: No network requests occur between the initial page load and a registration submission (unless the parent selects a registration to modify during enrollment).
- **SC-003**: Availability counts shown on filter chips are identical to what the previous client-side computation produced for the same data.
- **SC-004**: All existing unit tests for registration-related logic continue to pass.
- **SC-005**: Parents with multiple children can switch between students and see correct grade-appropriate availability without additional server communication.

## Assumptions

- The number of instructors is bounded at roughly 10-15, producing a manageable payload of several hundred to ~1,800 time slot objects (estimated 20-180 KB) — well within acceptable response size.
- Lesson lengths remain the standard set (30, 45, 60 minutes). The server reads these from configuration or uses the existing hardcoded default.
- The existing behavior of the group registration flow (class selector, capacity checks) is unchanged — this feature only affects the private lesson cascading filter system.
- The "Modify" dropdown re-fetch during enrollment periods is acceptable as a single additional network call, since it occurs at a natural decision point and not during chip interaction.
