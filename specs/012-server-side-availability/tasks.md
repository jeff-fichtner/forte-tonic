# Tasks: Server-Side Availability Pre-Computation

**Input**: Design documents from `/specs/012-server-side-availability/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared type and service registration — no behavior changes yet

- [x] T001 [P] Create `AvailableTimeSlot` interface in `src/models/shared/availableTimeSlot.ts` per data-model.md (fields: instructorId, day, dayName, time, timeFormatted, length, instrument)
- [x] T002 [P] Add `export type { AvailableTimeSlot }` re-export to `src/models/shared/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Server-side computation service — MUST complete before any user story work

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create `AvailabilityService` class in `src/services/availabilityService.ts` with `computeAvailableTimeSlots(instructors, registrations, studentGrades, lessonLengths, excludeRegistrationId)` method. Port algorithm from client-side `generateInstructorTimeSlots()` + `isInstructorGradeEligible()` in `src/web/js/utilities/registrationForm/availabilityEngine.ts`. Reuse `RegistrationService.timeToMinutes()` and `RegistrationService.timesOverlap()` for time parsing and conflict detection. Include private helpers `formatTimeFromMinutes()` and `formatDisplayTime()` for slot display fields. Return `Record<string, AvailableTimeSlot[]>` keyed by `String(grade)`. See plan.md Phase 1b for full algorithm.
- [x] T004 Register `AvailabilityService` in `src/infrastructure/container/serviceContainer.ts`: add to `ServiceMap` interface, `ServiceKeys` array, and `#registerServices()` factory. No constructor dependencies.
- [x] T005 Create `tests/unit/services/availabilityService.test.ts` with test cases: grade eligibility filtering, time conflict detection, slot generation with various instructor schedules, multi-grade keying, `excludeRegistrationId` exclusion, null grade key, empty instructors/registrations edge cases. Use test data factory pattern (`makeInstructor()`, `makeRegistration()`) matching existing patterns in `tests/unit/web/availabilityEngine.test.ts`.

**Checkpoint**: `AvailabilityService` exists with passing tests. No endpoint or client changes yet.

---

## Phase 3: User Story 1 + 4 — Server Endpoint & Client Filter Pipeline (Priority: P1) MVP

**Goal**: Parent loads registration tab, sees cascading filter chips with accurate counts derived from server-computed slots. Chip taps filter locally — no network requests. Data accuracy matches previous client-side computation.

**Independent Test**: Load parent registration tab, verify chips render with counts. Tap chips in sequence — downstream counts update instantly with no network activity in DevTools. Run unit tests to confirm server output matches expected slot computation.

**Note**: US1 (browse availability) and US4 (data accuracy) are combined because US4's acceptance criteria are verified by US1's unit tests and the integration test.

### Server — Endpoint Integration

- [x] T006 [US1] Modify `getParentRegistrationTabData()` in `src/controllers/registrationController.ts`: after the existing `Promise.all` fetch, extract unique grades from `parentStudents`, read optional `excludeRegistrationId` from `req.query`, call `availabilityService.computeAvailableTimeSlots()` with fetched instructors, the correct trimester's registrations (current trimester during registration periods, next trimester during enrollment — per existing endpoint logic and FR-010), unique grades, and lesson lengths from `registrationConfig` (same source as `userController.ts` line 79 — not a hardcoded duplicate), include `availableTimeSlots` in response data object.
- [x] T007 [US1] Update integration test in `tests/integration/registrationController.test.ts`: add test case for `GET /api/parent/tabs/registration/:trimester` asserting response includes `availableTimeSlots` field with correct shape (`Record<string, AvailableTimeSlot[]>`).

### Client — Data Pipeline

- [x] T008 [US1] Update `src/web/js/tabs/parentRegistrationTab.ts`: add `availableTimeSlots: Record<string, AvailableTimeSlot[]>` to `RegistrationTabData` and `RegistrationApiResponse` interfaces. Pass `availableTimeSlots` to `ParentRegistrationForm` constructor and `updateData()`.
- [x] T009 [US1] Update `src/web/js/workflows/parentRegistrationForm.ts`: accept `availableTimeSlots: Record<string, AvailableTimeSlot[]>` in constructor and `updateData()`. Store as instance property. When student changes, look up `availableTimeSlots[String(selectedStudent.grade)]` and pass grade-specific array to `CascadingFilterChips`. Pass `instructors` array to `CascadingFilterChips` for name display on cards.

### Client — Cascading Filter Chips Rewrite

- [x] T010 [US1] Rewrite computation logic in `src/web/js/components/registrationForm/cascadingFilterChips.ts`: add `availableTimeSlots: AvailableTimeSlot[]` and `instructors: InstructorLike[]` to config. Add instance state for selections (`#selectedInstrument`, `#selectedDay`, `#selectedLength`, `#selectedInstructor`). Add `#applyUpstreamFilters(dimension)` helper. Replace all `calculateCascadingAvailability()` and `generateInstructorTimeSlots()` calls with flat array filter+count operations per plan.md Phase 2c. Keep existing DOM rendering functions (`createFilterChip()`, `createInstructorCard()`, chip click handlers, cascading reset logic) unchanged.

### Client — Dead Code Removal

- [x] T011 [US1] Remove server-ported functions from `src/web/js/utilities/registrationForm/availabilityEngine.ts`: delete `calculateCascadingAvailability()`, `generateInstructorTimeSlots()`, `checkTimeSlotConflict()`, `calculateAvailableSlotsForDay()`, `getDimensionKeys()`, `getInstructorInstruments()`, `getFilteredRegistrationsForConflictCheck()`. Keep `isInstructorGradeEligible()`, `filterByInstrument()`, `getRegistrationDayName()`, `isInstructorAvailableOnDay()` (only if still referenced).
- [x] T012 [US1] Update `tests/unit/web/availabilityEngine.test.ts`: remove test suites for deleted functions. Keep tests for retained functions (`isInstructorGradeEligible`, `filterByInstrument`, etc.).

**Checkpoint**: Parent registration tab loads with server-computed slots. Chips filter locally. All unit and integration tests pass. `npm run build:frontend` succeeds.

---

## Phase 4: User Story 2 — Switch Between Children (Priority: P1)

**Goal**: Parent switches student selector and chip counts update to reflect grade-specific availability — no server call.

**Independent Test**: Log in as parent with children in different grades. Switch between children. Verify chip counts and visible instructors change. Verify no network requests fire.

- [x] T013 [US2] Verify student-switch behavior in `src/web/js/workflows/parentRegistrationForm.ts`: confirm that the student-change handler looks up `availableTimeSlots[String(grade)]` for the newly selected student and passes the grade-specific array to `CascadingFilterChips`. Confirm all filter selections and time slot grid are reset on student switch. If a modify-registration was active (excludeRegistrationId), switching students must clear that state and revert to the original (non-excluded) slot data. Add or adjust logic if the existing student-change handler does not already trigger chip re-initialization with the new slot array.

**Checkpoint**: Switching students updates chips with grade-appropriate data. No network requests on switch.

---

## Phase 5: User Story 3 — Modify Registration Re-Fetch (Priority: P2)

**Goal**: During enrollment periods, selecting a registration to modify re-fetches availability excluding that registration from conflicts, so the parent's current slot appears available.

**Independent Test**: During enrollment period, select "Modify" from dropdown. Verify one network request fires with `excludeRegistrationId` param. Verify parent's current slot appears in the available grid.

- [x] T014 [US3] Add re-fetch method to `src/web/js/tabs/parentRegistrationTab.ts`: when a modify-registration is selected, re-fetch the same endpoint with `?excludeRegistrationId=<id>` appended. Update `availableTimeSlots` in stored data and push to `ParentRegistrationForm.updateData()`. Provide a callback to `ParentRegistrationForm` for triggering the re-fetch.
- [x] T015 [US3] Update `src/web/js/workflows/parentRegistrationForm.ts`: when modify-registration is selected from the dropdown, call the tab-level re-fetch callback. When re-fetch completes and `updateData()` is called with new slot data, re-initialize `CascadingFilterChips` with updated slots. When "Create New" is selected, revert to original slot data (no exclusion).

**Checkpoint**: Modify-registration triggers re-fetch with exclusion. Chips update with freed slots. "Create New" reverts to full conflict set.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final validation

- [x] T016 [P] Update Postman collection in `scripts/postman/tonic-api.postman_collection.json`: document `excludeRegistrationId` query parameter and `availableTimeSlots` response field on the parent registration tab endpoint.
- [x] T017 Run `quickstart.md` validation: execute all verification steps from `specs/012-server-side-availability/quickstart.md` (run tests, build frontend, manual verification of chips, network activity, student switching, modify-registration flow).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. T001 and T002 are parallel.
- **Foundational (Phase 2)**: Depends on T001 (type import). T003 → T004 → T005 sequential.
- **US1+4 (Phase 3)**: Depends on Phase 2 completion. T006 and T007 parallel. T008 → T009 → T010 sequential. T011 and T012 parallel (after T010).
- **US2 (Phase 4)**: Depends on Phase 3 (T009, T010). Thin verification/adjustment layer.
- **US3 (Phase 5)**: Depends on Phase 3 (T008, T009, T010). T014 → T015 sequential.
- **Polish (Phase 6)**: Depends on all prior phases. T016 is parallel with T017.

### User Story Dependencies

- **US1+4 (P1)**: Depends on Foundational (Phase 2). Core pipeline — all other stories build on this.
- **US2 (P1)**: Depends on US1 (uses the grade-keyed slot lookup established in T009/T010).
- **US3 (P2)**: Depends on US1 (extends the data pipeline from T008/T009 with re-fetch capability).

### Within Each Phase

- Models/types before services
- Services before controller integration
- Server before client (data must exist before client can consume it)
- Implementation before dead code removal
- Dead code removal before test cleanup

### Parallel Opportunities

- T001 and T002 (Phase 1 — different files)
- T006 and T007 (Phase 3 — controller vs test file)
- T011 and T012 (Phase 3 — source cleanup vs test cleanup)
- T016 and T017 (Phase 6 — Postman vs validation)

---

## Parallel Example: Phase 3 (US1+4)

```text
# After Phase 2 complete, launch server tasks in parallel:
T006: Modify registrationController.ts (endpoint integration)
T007: Update registrationController.test.ts (integration test)

# Then sequential client pipeline:
T008: Update parentRegistrationTab.ts (data pipeline)
T009: Update parentRegistrationForm.ts (route slot data)
T010: Rewrite cascadingFilterChips.ts (filter+count logic)

# Then cleanup in parallel:
T011: Remove ported functions from availabilityEngine.ts
T012: Remove ported tests from availabilityEngine.test.ts
```

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + 3)

1. Complete Phase 1: Shared type
2. Complete Phase 2: AvailabilityService with tests
3. Complete Phase 3: Full server→client pipeline (US1+4)
4. **STOP AND VALIDATE**: `npm test`, `npm run build:frontend`, manual chip verification
5. This delivers the core value — server-computed slots with local filtering

### Incremental Delivery

1. Setup + Foundational → Service exists with passing tests
2. Add US1+4 → Full pipeline working → Validate (MVP)
3. Add US2 → Student switching verified → Validate
4. Add US3 → Modify-registration re-fetch → Validate
5. Polish → Postman docs + quickstart validation → Done

## Notes

- Lesson lengths: read from `registrationConfig` (same source as `userController.ts` line 79), not hardcoded in the service
- US1 and US4 are combined because US4 is purely a correctness/testing concern verified by US1's tests
- US2 is thin — the grade-keyed data shape from US1 already supports it; this phase just verifies the student-switch handler works correctly
- The `registrations` array remains in the response — `ParentGroupRegistration` still needs it for capacity checks
