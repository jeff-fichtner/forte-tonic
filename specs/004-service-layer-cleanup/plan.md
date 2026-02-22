# Implementation Plan: Service Layer Cleanup

**Branch**: `004-service-layer-cleanup` | **Date**: 2026-02-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-service-layer-cleanup/spec.md`

## Summary

Extract inline controller filtering logic into a shared `EntityQueryService`, rewire all 8 tab endpoints to use it, remove dead code (Authenticator, 5 unused methods), absorb ProgramValidationService, deduplicate time parsing, and clean up logging levels.

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022, Node.js ESM
**Primary Dependencies**: Express 4, Google Sheets API v4
**Storage**: Google Sheets (single spreadsheet, column-index mapped, 5-min in-memory cache)
**Testing**: Jest with ES module support, ts-jest, Supertest for integration
**Target Platform**: GCP (Cloud Run)
**Project Type**: Web application (Express API + vanilla JS frontend)
**Constraints**: No frontend changes, no route pattern changes, no model changes, no DB layer changes
**Scale/Scope**: 8 tab endpoints to rewire, ~6 dead code deletions, 1 new service file, 1 service absorption, 1 trimester-sequence fix

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | New service is minimum needed — primitive filters, no framework, no config-driven tab registry |
| II. Data Consistency | PASS | No model changes; entity shapes unchanged |
| III. Single Serialization Path | PASS | No changes to toJSON() or serialization |
| IV. Uniform API Responses | PASS | Tab endpoints continue using `successResponse()`; response shapes identical |
| V. Single Data Fetch Pattern | N/A | Frontend not touched |
| VI. No Dead Code | PASS | Explicitly removes dead code (Authenticator, 5 unused methods) |
| VII. Shared Models Are the Contract | PASS | No model changes |
| VIII. Role-Based Architecture | PASS | Tab endpoints remain role-scoped; query service is role-agnostic (filtering is caller's responsibility) |
| IX. Trimester-Aware by Default | PASS | `getRegistrations` takes trimester as parameter; period logic stays in PeriodService |
| X. Google Sheets Is the Database | PASS | Query service delegates to repositories; no direct Sheets access |

**Complexity Justification**: The new `EntityQueryService` adds one file to the service layer. This is justified because the alternative (status quo) has the same filtering logic reimplemented in 8 places with inconsistencies. One file replacing 8 inline copies is a net simplification.

## Project Structure

### Documentation (this feature)

```text
specs/004-service-layer-cleanup/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output (minimal — no unknowns)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── services/
│   ├── entityQueryService.ts        # NEW — filtered entity access
│   ├── registrationApplicationService.ts  # MODIFIED — absorb ProgramValidationService, remove dead methods, dedup time parsing
│   ├── registrationConflictService.ts     # MODIFIED — remove dead methods, logging cleanup
│   ├── programValidationService.ts        # DELETED — absorbed into RegistrationApplicationService
│   ├── authenticator.ts                   # DELETED — dead code
│   ├── index.ts                           # MODIFIED — add EntityQueryService export
│   ├── configurationService.ts            # UNCHANGED
│   ├── registrationValidationService.ts   # UNCHANGED
│   ├── periodService.ts                   # UNCHANGED
│   └── dropRequestService.ts              # UNCHANGED
├── controllers/
│   ├── userController.ts            # MODIFIED — rewire 2 tab endpoints
│   └── registrationController.ts    # MODIFIED — rewire 6 tab endpoints
├── infrastructure/
│   └── container/
│       └── serviceContainer.ts      # MODIFIED — register EntityQueryService

tests/
├── unit/
│   ├── entityQueryService.test.ts         # NEW — unit tests for query service
│   └── authenticator.test.ts              # DELETED — dead code
```

**Structure Decision**: Single new file (`entityQueryService.ts`) in existing `services/` directory. No new directories, no structural changes.

## Architecture

### EntityQueryService Design

```typescript
// src/services/entityQueryService.ts

interface StudentFilters {
  parentId?: string;
}

interface InstructorFilters {
  instructorIds?: string[];
}

interface RegistrationFilters {
  trimester: string;
  studentIds?: string[];
  instructorId?: string;
  excludeWaitlist?: boolean;
}

class EntityQueryService extends BaseService {
  constructor(
    userRepository: UserRepository,
    programRepository: ProgramRepository,
    registrationRepository: RegistrationRepository,
    configService: ConfigurationService
  )

  async getStudents(filters?: StudentFilters): Promise<Student[]>
  async getInstructors(filters?: InstructorFilters): Promise<Instructor[]>
  async getRegistrations(filters: RegistrationFilters): Promise<Registration[]>
  async getClasses(): Promise<Class[]>
  async getAdmins(): Promise<Admin[]>
  async getRooms(): Promise<Room[]>
}
```

**Repository delegation**: `getStudents`, `getInstructors`, `getAdmins`, `getRooms` delegate to `userRepository`. `getClasses` delegates to `programRepository`. `getRegistrations` delegates to `registrationRepository`.

### Service Container Registration

```typescript
// In serviceContainer.ts #registerServices()
this.register('entityQueryService', () => {
  return new EntityQueryService(
    this.get('userRepository'),
    this.get('programRepository'),
    this.get('registrationRepository'),
    configService
  );
});
```

### Tab Endpoint Pattern (after rewiring)

```typescript
// Example: parentWeeklyScheduleTabData
static async getParentWeeklyScheduleTabData(req, res) {
  const { parentId } = req.query;
  const { trimester } = req.params;
  const queryService = serviceContainer.get('entityQueryService');

  const students = await queryService.getStudents({ parentId });
  const studentIds = students.map(s => s.id);
  const [registrations, classes] = await Promise.all([
    queryService.getRegistrations({ trimester, studentIds }),
    queryService.getClasses(),
  ]);
  const instructorIds = [...new Set(registrations.map(r => r.instructorId))];
  const instructors = await queryService.getInstructors({ instructorIds });

  return successResponse(res, { registrations, students, instructors, classes });
}
```

### ProgramValidationService Absorption

The single `validateRegistration()` static method moves into `RegistrationApplicationService` as:

```typescript
// Private method in RegistrationApplicationService
#validateProgramRules(
  registrationData: RegistrationData,
  groupClass: ClassData | null
): { isValid: boolean; errors: string[] }
```

The `ConfigurationService.getRockBandClassIds()` static call within it stays unchanged (it's used in other places too).

### Time Parsing Deduplication

Replace in `#validateBusTimeRestrictions()`:
- `this.#parseTime(timeStr)` → `DateHelpers.parseTimeString(timeStr).totalMinutes`
- `this.#formatTimeFromMinutes(minutes)` → `new TonicDuration(minutes).to24Hour()`

Then delete both `#parseTime()` and `#formatTimeFromMinutes()` private methods.

## Tab Endpoint Rewiring Reference

Each tab's current inline logic and its query service equivalent:

### Admin Master Schedule (`registrationController.ts:981-1020`)
**Current**: 4 parallel fetches, no filtering
**After**: `getRegistrations({ trimester })`, `getStudents()`, `getInstructors()`, `getClasses()` — all parallel, no filters except trimester

### Admin Registration (`registrationController.ts:1101-1151`)
**Current**: 4 parallel fetches, no filtering
**After**: Same as Admin Master Schedule

### Admin Wait List (`registrationController.ts:723-790`)
**Current**: Fetches registrations + students, filters registrations to Rock Band class IDs, filters students to those with waitlist registrations
**After**: `getRegistrations({ trimester })` then in-controller filter to Rock Band IDs (this filter is waitlist-specific, not a general query pattern), `getStudents()` then filter to registration studentIds

### Instructor Directory (`userController.ts:452-483`)
**Current**: 2 parallel fetches (admins, instructors), no filtering
**After**: `getAdmins()`, `getInstructors()` — parallel, no filters

### Instructor Weekly Schedule (`registrationController.ts:797-885`)
**Current**: 4 parallel fetches, filters registrations by instructorId + excludes waitlist, filters students to those in filtered registrations
**After**: `getRegistrations({ trimester, instructorId, excludeWaitlist: true })`, extract studentIds, `getStudents()` then filter to studentIds, `getInstructors()`, `getClasses()` — parallel where possible

### Parent Contact (`userController.ts:490-594`)
**Current**: Fetches admins, students, instructors, registrations (current + next trimester via `Promise.allSettled`), filters students by parentId, filters registrations by studentIds, filters instructors by registration instructorIds. **Trimester source**: derives current/next internally via `periodService.getCurrentTrimester()` / `getNextTrimester()` (no trimester in route).
**After**: Resolve trimesters via `periodService` (unchanged), then `getStudents({ parentId })`, extract studentIds, `getRegistrations({ trimester: current, studentIds })` + optional next trimester via `Promise.allSettled`, extract instructorIds, `getInstructors({ instructorIds })`, `getAdmins()`. Response: `{ admins, instructors }` only.

### Parent Weekly Schedule (`registrationController.ts:893-973`)
**Current**: 4 parallel fetches, filters students by parentId, filters registrations by studentIds, filters instructors by registration instructorIds
**After**: `getStudents({ parentId })`, extract studentIds, `getRegistrations({ trimester, studentIds })`, extract instructorIds, `getInstructors({ instructorIds })`, `getClasses()`

### Parent Registration (`registrationController.ts:1027-1092`)
**Current**: 5 parallel fetches (includes both current and next trimester registrations), filters students by parentId. Registrations are returned **unfiltered** (all registrations for each trimester, not scoped to parent's children). Instructors also unfiltered. **Trimester source**: derives current via `periodService.getCurrentTrimester()`, then computes next via inline `TRIMESTER_SEQUENCE` math (lines 1048-1051).
**After**: Resolve current trimester via `periodService.getCurrentTrimester()`, next via `periodService.getNextTrimester()` (**replaces inline TRIMESTER_SEQUENCE math** — only PeriodService owns sequence knowledge). `TRIMESTER_SEQUENCE` import stays (used by `getRegistrations` at line 244). Then `getStudents({ parentId })`, `getRegistrations({ trimester: next })`, `getRegistrations({ trimester: current })`, `getInstructors()`, `getClasses()`. Response keys: `nextTrimesterRegistrations`, `currentTrimesterRegistrations`, `students`, `instructors`, `classes`.

## Dead Code Removal Checklist

| Item | File | Action |
|------|------|--------|
| `Authenticator` class | `src/services/authenticator.ts` | Delete file |
| `Authenticator` test | `tests/unit/authenticator.test.ts` | Delete file |
| `getRegistrationDetails()` | `src/services/registrationApplicationService.ts:404-442` | Remove method |
| `getStudentRegistrations()` | `src/services/registrationApplicationService.ts:447-476` | Remove method |
| `checkScheduleConflicts()` | `src/services/registrationConflictService.ts:212-233` | Remove method |
| `generateRegistrationId()` | `src/services/registrationConflictService.ts:417-423` | Remove method |
| `isUniqueRegistrationId()` | `src/services/registrationConflictService.ts:431-433` | Remove method |
| `ProgramValidationService` | `src/services/programValidationService.ts` | Delete file (after absorption) |

## Logging Changes

In `registrationConflictService.ts`, the following methods have per-iteration `logger.info` inside `.find()` callbacks that should become `logger.debug`:
- `checkDuplicateRegistration()` — lines inside the `.find()` callback
- `checkStudentScheduleConflict()` — lines inside the `.find()` callback
- `checkInstructorScheduleConflict()` — lines inside the `.find()` callback
- `checkClassCapacity()` — the count logging stays at `info`

Method-level entry/exit banners (`=== CONFLICT CHECK START ===`, etc.) stay at `info`.

## Complexity Tracking

> No constitution violations. No complexity justification needed.
