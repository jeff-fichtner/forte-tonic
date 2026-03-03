# Implementation Plan: Server-Side Availability Pre-Computation

**Branch**: `012-server-side-availability` | **Date**: 2026-03-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/012-server-side-availability/spec.md`

## Summary

Move private lesson availability computation from the client-side `availabilityEngine.ts` to a new server-side `AvailabilityService`. The parent registration tab endpoint returns pre-computed time slots keyed by student grade. The client stores this flat array and derives cascading filter chip counts via `Array.filter()` + counting — no server round-trip on chip interaction. One re-fetch occurs when a parent selects a registration to modify during enrollment periods.

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022
**Primary Dependencies**: Express 4 (backend), Vite 7.x (frontend build), MaterializeCSS 1.0.0 (UI)
**Storage**: Google Sheets API v4 (single spreadsheet, column-index mapped, 5-min in-memory cache)
**Testing**: Jest 29.x with ts-jest ESM preset, Supertest 7.x for integration tests
**Target Platform**: Node.js server + browser (vanilla JS, no framework)
**Project Type**: Web application (Express server serves both API and bundled frontend)
**Performance Goals**: Slot computation < 100ms server-side for ~15 instructors; chip filtering imperceptible on client
**Constraints**: Payload size ~20-180 KB for slot arrays; existing Google Sheets 5-min cache applies
**Scale/Scope**: ~10-15 instructors, ~5 instruments, 5 days, 3 lesson lengths; ~30 concurrent parent users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Flat array is the simplest viable structure. No new abstractions beyond one service + one type. |
| II. Data Consistency | PASS | `AvailableTimeSlot` is a plain interface in `src/models/shared/`. Same shape everywhere. |
| III. Single Serialization Path | PASS | `AvailableTimeSlot` is a plain object — no `toJSON()` needed. Express serializes it directly. |
| IV. Uniform API Responses | PASS | Response uses existing `successResponse()` / `errorResponse()` envelope. |
| V. Single Data Fetch Pattern | PASS | All client calls go through `HttpService`. Re-fetch on modify uses same endpoint. |
| VI. No Dead Code | PASS | Client engine functions that move to server are deleted. |
| VII. Shared Models Are the Contract | PASS | New type lives in `src/models/shared/availableTimeSlot.ts`. |
| VIII. Role-Based Architecture | PASS | Computation added to existing `parent/tabs/registration` endpoint. |
| IX. Trimester-Aware by Default | PASS | Server uses correct registration set based on trimester parameter. |
| X. Google Sheets Is the Database | N/A | No new persistence. Reads existing cached data. |
| XI. Uniform CRUD Backend | PASS | No new endpoints. Availability computation augments existing tab data endpoint. Controller delegates to service. |

**Post-design re-check**: All principles still pass. The `AvailabilityService` class with a single `computeAvailableTimeSlots()` method follows the service container pattern. The `excludeRegistrationId` query param is a data-scoping filter on an existing endpoint, not a new feature-named route.

## Project Structure

### Documentation (this feature)

```text
specs/012-server-side-availability/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: AvailableTimeSlot entity definition
├── quickstart.md        # Phase 1: verification guide
├── contracts/           # Phase 1: API contract changes
│   └── parent-registration-tab.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── models/shared/
│   ├── availableTimeSlot.ts          # NEW: shared type definition
│   └── index.ts                      # MODIFY: add re-export
├── services/
│   └── availabilityService.ts        # NEW: server-side slot computation
├── controllers/
│   └── registrationController.ts     # MODIFY: call availability service
├── infrastructure/container/
│   └── serviceContainer.ts           # MODIFY: register new service
└── web/js/
    ├── tabs/
    │   └── parentRegistrationTab.ts  # MODIFY: pass slots, handle re-fetch
    ├── workflows/
    │   └── parentRegistrationForm.ts # MODIFY: accept + route slot data
    ├── components/registrationForm/
    │   └── cascadingFilterChips.ts   # MODIFY: use pre-computed slots
    └── utilities/registrationForm/
        └── availabilityEngine.ts     # MODIFY: remove ported functions

tests/
├── unit/
│   ├── services/
│   │   └── availabilityService.test.ts  # NEW: server computation tests
│   └── web/
│       └── availabilityEngine.test.ts   # MODIFY: remove ported tests
└── integration/
    └── registrationController.test.ts   # MODIFY: verify new response field

scripts/postman/
└── tonic-api.postman_collection.json    # MODIFY: document changes
```

**Structure Decision**: This feature spans both backend (new service + controller modification) and frontend (client refactoring). The project uses a unified `src/` directory with `web/js/` for frontend code. This follows existing patterns — no structural changes needed.

## Implementation Details

### Phase 1: Server-Side Service

#### 1a. Create `src/models/shared/availableTimeSlot.ts`

Plain interface — no class, no constructor:

```typescript
export interface AvailableTimeSlot {
  instructorId: string;
  day: string;          // "monday"
  dayName: string;      // "Monday"
  time: string;         // "14:00"
  timeFormatted: string; // "2:00 PM"
  length: number;       // 30, 45, 60
  instrument: string;
}
```

Export from `src/models/shared/index.ts`:
```typescript
export type { AvailableTimeSlot } from './availableTimeSlot.js';
```

#### 1b. Create `src/services/availabilityService.ts`

Stateless service with one public method. Reuses:
- `RegistrationService.timeToMinutes()` for time parsing (static, callable directly)
- `RegistrationService.timesOverlap()` for conflict detection (static, callable directly)

Internal helpers for display formatting:
- `formatTimeFromMinutes(minutes)` → "HH:MM" (same logic as client `timeHelpers.ts`)
- `formatDisplayTime(time24)` → "H:MM AM/PM" (same logic as client `timeHelpers.ts`)

Algorithm (ports `generateInstructorTimeSlots` + `isInstructorGradeEligible` from client):
1. For each unique grade in input grades (+ `"null"` if any student has null grade):
2. Filter instructors by grade eligibility (min/max range check)
3. For each eligible instructor, for each available day:
   - Get instructor's day schedule (startTime, endTime)
   - Get existing registrations for this instructor on this day
   - For each 30-min slot from startTime to endTime:
     - Skip if base 30-min slot has a conflict
     - For each instrument the instructor teaches:
       - For each lesson length (30, 45, 60):
         - Skip if slot + length exceeds endTime
         - Skip if slot + length has a conflict
         - Emit `AvailableTimeSlot` to the grade's array

Conflict check: exclude the registration with `excludeRegistrationId` (if provided) from the registration list before checking.

#### 1c. Register in `src/infrastructure/container/serviceContainer.ts`

Add to `ServiceMap`, `ServiceKeys`, and `#registerServices()`. No constructor dependencies — the service is stateless.

#### 1d. Modify `getParentRegistrationTabData` in `src/controllers/registrationController.ts`

After fetching instructors, students, registrations, and classes:
1. Extract unique grades from `parentStudents`
2. Read optional `excludeRegistrationId` from `req.query`
3. Call `availabilityService.computeAvailableTimeSlots(instructors, registrations, uniqueGrades, registrationConfig.lessonLengths, excludeRegistrationId)` — lesson lengths come from the same `registrationConfig` object that `userController.ts` serves to the client (no hardcoded duplicate)
4. Include `availableTimeSlots` in response data

### Phase 2: Client-Side Refactoring

#### 2a. Update `src/web/js/tabs/parentRegistrationTab.ts`

- Add `availableTimeSlots: Record<string, AvailableTimeSlot[]>` to `RegistrationTabData` and `RegistrationApiResponse`
- Pass `availableTimeSlots` to `ParentRegistrationForm` constructor and `updateData()`
- Add method to re-fetch with `excludeRegistrationId` query param when modify-registration is selected
- Provide a callback to `ParentRegistrationForm` for triggering re-fetch

#### 2b. Update `src/web/js/workflows/parentRegistrationForm.ts`

- Accept `availableTimeSlots: Record<string, AvailableTimeSlot[]>` in constructor and `updateData()`
- When student changes: look up `availableTimeSlots[String(selectedStudent.grade)]` and pass to `CascadingFilterChips`
- When modify-registration selected: call tab-level re-fetch callback, then update chips with new slot data
- Pass `instructors` array to `CascadingFilterChips` for name display (still needed for cards)

#### 2c. Rewrite `src/web/js/components/registrationForm/cascadingFilterChips.ts`

Replace engine calls with flat array operations:

**New config properties**:
- `availableTimeSlots: AvailableTimeSlot[]` (grade-specific array)
- `instructors: InstructorLike[]` (for instructor names on cards/chips)

**New instance state** (replaces DOM reads):
- `#selectedInstrument: string | null`
- `#selectedDay: string | null`
- `#selectedLength: string | null`
- `#selectedInstructor: string | null`

**New helper**: `#applyUpstreamFilters(dimension: string): AvailableTimeSlot[]`
- Filters `#availableTimeSlots` by all active selections upstream of the given dimension
- Cascade order: instrument → day → length → instructor

**Chip generation** becomes filtering + counting:
- `#generateInstrumentChips()`: count slots by `instrument` (no upstream filters)
- `#generateDayChips()`: filter by instrument, count by `day`
- `#generateLengthChips()`: filter by instrument + day, count by `length`
- `#generateInstructorChips()`: filter by instrument + day + length, count by `instructorId`

**Time slot grid**: filter slots by all active selections, group by `instructorId`, create cards via existing `createInstructorCard()`. The `instructor` parameter comes from the `instructors` array (looked up by ID).

**DOM rendering** (unchanged): `createFilterChip()`, `createInstructorCard()`, chip click handlers, cascading reset logic — all remain as-is.

**Remove**: All imports from `availabilityEngine.ts` except `isInstructorGradeEligible` (still needed for instructor chip labels).

#### 2d. Clean up `src/web/js/utilities/registrationForm/availabilityEngine.ts`

Remove functions ported to server:
- `calculateCascadingAvailability()`
- `generateInstructorTimeSlots()`
- `checkTimeSlotConflict()`
- `calculateAvailableSlotsForDay()`
- `getDimensionKeys()` (private)
- `getInstructorInstruments()` (private)
- `getFilteredRegistrationsForConflictCheck()`

Keep:
- `isInstructorGradeEligible()` — used by cascading chips for instructor name display
- `filterByInstrument()` — used by cascading chips for instructor card filtering
- `getRegistrationDayName()` — small utility, still referenced
- `isInstructorAvailableOnDay()` — keep only if still referenced after refactoring

### Phase 3: Tests

#### 3a. New: `tests/unit/services/availabilityService.test.ts`

Port relevant test cases from `tests/unit/web/availabilityEngine.test.ts`:
- Grade eligibility filtering
- Time conflict detection
- Slot generation with various instructor schedules
- Multi-grade keying
- `excludeRegistrationId` exclusion
- Empty instructors / empty registrations edge cases

Use the same test data factory pattern (`makeInstructor()`, `makeRegistration()`, `makeDaySchedule()`).

#### 3b. Update: `tests/unit/web/availabilityEngine.test.ts`

Remove test suites for deleted functions. Keep tests for retained functions (`isInstructorGradeEligible`, `filterByInstrument`, etc.).

#### 3c. Update: `tests/integration/registrationController.test.ts`

Add test case for `GET /api/parent/tabs/registration/:trimester` verifying:
- Response includes `availableTimeSlots` field
- Response shape is `Record<string, AvailableTimeSlot[]>`
- `excludeRegistrationId` query param affects results

#### 3d. Update: `scripts/postman/tonic-api.postman_collection.json`

Document `excludeRegistrationId` query param and `availableTimeSlots` response field on the parent registration tab endpoint.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
