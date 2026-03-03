# Research: Server-Side Availability Pre-Computation

**Branch**: `012-server-side-availability` | **Date**: 2026-03-02

## Decision 1: Time Utility Reuse on Server

**Decision**: Reuse `RegistrationService.timeToMinutes()` and `RegistrationService.timesOverlap()` for time parsing and conflict detection in the new availability service.

**Rationale**: These are static methods on `RegistrationService` with the exact same time-to-minutes conversion and overlap logic used by the client-side `parseTime()` and `checkTimeSlotConflict()`. Calling them directly avoids duplication.

**Alternatives considered**:
- Creating a shared time utility in `src/utils/` — rejected because the existing static methods are already accessible and creating a new utility module for two functions violates Simplicity First.
- Duplicating the logic in the availability service — rejected because it creates drift risk between conflict detection in availability computation and submission-time validation.

## Decision 2: Time Display Formatting on Server

**Decision**: Implement `formatTimeFromMinutes()` and `formatDisplayTime()` as private helpers within the availability service, matching the client-side `timeHelpers.ts` logic.

**Rationale**: The server needs to produce `time` (HH:MM) and `timeFormatted` (H:MM AM/PM) fields for each slot. The client-side `timeHelpers.ts` lives in `src/web/js/` (a browser-only directory). These are trivial 3-line functions — duplicating them is simpler than creating a shared utility module that would need to work in both ESM environments with different import paths.

**Alternatives considered**:
- Moving `timeHelpers.ts` to `src/models/shared/` — rejected because it would require changing Vite path aliases and all existing frontend imports for no functional benefit.
- Having the client compute `timeFormatted` from `time` — rejected because it pushes unnecessary computation back to the client and requires the client to import time helpers for something the server can do once.

## Decision 3: Lesson Lengths Source

**Decision**: Pass `lessonLengths` as a parameter to `computeAvailableTimeSlots()`. The controller reads it from `registrationConfig` — the same config object that `userController.ts` already constructs (line 79: `lessonLengths: [30, 45, 60]`) and serves to the client via `/api/getAppConfiguration`.

**Rationale**: The server already owns this value — `userController.ts` sends `registrationConfig.lessonLengths` to the client, and the client-side `registrationConfig.ts` reads it via `getRegistrationConfig().lessonLengths`. The availability service should consume the same source rather than hardcoding a duplicate. The service accepts it as a parameter (not a dependency) because it's a pure computation — the caller provides all inputs.

**Alternatives considered**:
- Hardcoding `[30, 45, 60]` in the availability service — rejected because the value already exists in a canonical location (`userController.ts` registrationConfig). Hardcoding creates a second source of truth that can drift.
- Injecting `configService` as a dependency — rejected because the service is stateless and operates on caller-provided data. Adding a dependency for one config value violates Simplicity First.

## Decision 4: AvailableTimeSlot Service Architecture

**Decision**: Create `AvailabilityService` as a stateless class with a single public method, registered in the service container. No repository or database dependencies — it operates on in-memory arrays passed by the controller.

**Rationale**: The availability computation is a pure function: instructors + registrations + grades in, slots out. It needs no database access of its own. The controller already fetches instructors, registrations, and students — it passes them to the service. This keeps the service testable without mocking any infrastructure.

**Alternatives considered**:
- Static utility function (no class) — rejected because the service container pattern expects class instances with `ServiceKeys` registration. A standalone function would break the project's DI convention.
- Adding a method to `RegistrationService` — rejected because it would bloat an already large service (~900 lines) with unrelated responsibility. The availability computation is a distinct concern from registration CRUD.

## Decision 5: TimeSlot.instructor Field

**Decision**: The new `AvailableTimeSlot` type does NOT include a full `InstructorLike` object. It includes only `instructorId`.

**Rationale**: The existing `TimeSlot.instructor?: InstructorLike` field is optional and unused by DOM rendering code. `createTimeSlotElement()` and `createInstructorCard()` only use scalar fields (`instructorId`, `day`, `time`, `length`, `instrument`). The `createInstructorCard()` function receives the instructor object separately. Including the full instructor in each slot would multiply payload size by ~10x for no benefit.

**Alternatives considered**: None — the codebase evidence is clear that the field is unused in rendering.

## Decision 6: Grade Key for Null Grades

**Decision**: Use the string `"null"` as the grade key for students with no grade set. The client looks up `availableTimeSlots[String(grade)]` — when grade is `null`, `String(null)` produces `"null"`.

**Rationale**: Matches existing behavior where `isInstructorGradeEligible()` returns `true` for null grades (all instructors eligible). The server computes a slot array for the `"null"` key with no grade filtering applied.

**Alternatives considered**:
- Using `"all"` as the key — rejected because it could collide with a future concept. `String(null)` = `"null"` is the natural JavaScript mapping.
