# Implementation Plan: Frontend Decomposition

**Branch**: `009-frontend-decomposition` | **Date**: 2026-02-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-frontend-decomposition/spec.md`

## Summary

Decompose the 3,652-line `parentRegistrationForm.ts` monolith into focused modules matching the component delegation pattern established by the 611-line `adminRegistrationForm.ts`. Extract registration orchestration from `viewModel.ts` into a standalone service. Unify duplicated entity interfaces between both forms. Expand the backend configuration endpoint to serve business rules currently hardcoded in frontend constants.

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022
**Primary Dependencies**: Express 4 (backend), Vite 7.x (frontend build), MaterializeCSS 1.0.0 (UI), googleapis (Google Sheets)
**Storage**: Google Sheets (single spreadsheet, column-index mapped, 5-min in-memory cache)
**Testing**: Jest 29.x with ts-jest (ESM preset), supertest 7.x for integration tests
**Target Platform**: Browser (frontend) + Node.js (backend), single Express process serves both
**Project Type**: Web application — shared models run in both environments
**Performance Goals**: Zero behavior change for end users. Frontend compilation with zero type errors.
**Constraints**: No framework changes. Vite build must succeed. All existing tests must pass.
**Scale/Scope**: ~15 files modified or created. 1 backend endpoint expanded. 1 shared model updated.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Each extracted module has a single responsibility. No speculative features. Consolidating 4 near-identical availability methods into 1 parameterized function reduces code, not increases it. |
| II. Data Consistency | PASS | Unifying entity interfaces into a single shared location directly advances this principle. |
| III. Single Serialization Path | PASS | No new serialization paths. AppConfigurationResponse.toJSON() expanded with registrationConfig — still one path. |
| IV. Uniform API Responses | PASS | Configuration endpoint continues to return `{success, data}` envelope. No new endpoints. |
| V. Single Data Fetch Pattern | PASS | RegistrationService wraps HttpService. No direct fetch() calls introduced. |
| VI. No Dead Code | PASS | Removing vestigial viewModel state arrays directly advances this principle. |
| VII. Shared Models Are the Contract | PASS | AppConfigurationResponse in `src/models/shared/` expanded — works in both environments. Frontend entity types are display-layer interfaces, not model classes — they live in `src/web/js/types/`, not `src/models/shared/`. |
| VIII. Role-Based Architecture | PASS | No changes to role-based routing or permissions. |
| IX. Trimester-Aware by Default | PASS | Registration service preserves existing trimester routing logic. Period detection still via PeriodService. |
| X. Google Sheets Is the Database | PASS | No database layer changes. Config values may come from Sheets or environment — backend implementation detail. |

No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/009-frontend-decomposition/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research decisions
├── data-model.md        # Entity definitions
├── quickstart.md        # Verification scenarios
├── contracts/
│   └── configuration-endpoint.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# New files
src/web/js/types/
└── registrationTypes.ts                          # Shared entity interfaces (US1)

src/web/js/utilities/registrationForm/
└── availabilityEngine.ts                         # Availability calculation (US2, FR-002)

src/web/js/components/registrationForm/
├── cascadingFilterChips.ts                       # Cascading filter UI (US2, FR-003)
├── parentGroupRegistration.ts                    # Group registration flow (US2, FR-004)
├── parentPrivateSubmission.ts                    # Private registration submission (US2, FR-005)
└── registrationFormElements.ts                   # Shared DOM element factories (US2, FR-006)

src/web/js/data/
└── registrationService.ts                        # Registration orchestration (US3, FR-008)

# Modified files
src/web/js/workflows/parentRegistrationForm.ts    # Reduced to orchestrator (US2, FR-007)
src/web/js/workflows/adminRegistrationForm.ts     # Import from shared types (US1, FR-001)
src/web/js/viewModel.ts                           # Remove registration logic + vestigial state (US3, FR-008/009)
src/web/js/tabs/parentRegistrationTab.ts          # Use registrationService (US3)
src/web/js/tabs/adminRegistrationTab.ts           # Use registrationService (US3)
src/web/js/constants/registrationFormConstants.ts  # Retain UI text; business config consumed from API (US4)
src/web/js/utilities/registrationForm/timeHelpers.ts         # Accept config parameter (US4)
src/web/js/utilities/registrationForm/registrationValidator.ts # Accept config parameter (US4)
src/web/js/utilities/classManager.ts              # Read rockBandDisplayConfig from appConfig (US4)
src/models/shared/responses/appConfigurationResponse.ts       # Add registrationConfig field (US4)
src/controllers/userController.ts                 # Populate registrationConfig in response (US4)
src/types/global.d.ts                             # Update window type if needed (US3)

# Test files (new)
tests/unit/web/availabilityEngine.test.ts         # Unit tests for extracted availability engine
tests/unit/web/registrationService.test.ts        # Unit tests for extracted registration service
tests/integration/configuration.test.ts           # Verify registrationConfig in API response
```

**Structure Decision**: Follows the existing project layout. New frontend modules go under their natural directories (`types/`, `utilities/registrationForm/`, `components/registrationForm/`, `data/`). No new top-level directories.

## Implementation Phases

### Phase 1: Foundation — Shared Types (US1)

Create the shared type definitions file and update both forms to import from it.

**Files created**: `src/web/js/types/registrationTypes.ts`
**Files modified**: `parentRegistrationForm.ts`, `adminRegistrationForm.ts`

**Approach**:
1. Create `registrationTypes.ts` with the superset of all entity interfaces from both forms (InstructorLike, DaySchedule, StudentLike, ClassLike, RegistrationLike, RegistrationSubmitData, TimeSlot).
2. The parent form has richer interfaces (gradeRange, availability on InstructorLike; minimumGrade, maximumGrade, size, isRestricted on ClassLike). The shared types use the parent form's richer definitions — the admin form simply doesn't use the extra optional fields.
3. Remove inline interface definitions from both form files. Replace with imports.
4. Verify: `tsc --noEmit -p tsconfig.web.json` passes with zero errors.

### Phase 2: Extract Modules from Parent Form (US2)

Extract the 5 concerns into separate modules. Do this sequentially — each extraction must compile before the next begins.

**Step 2a: Presentation Helpers** (`registrationFormElements.ts`)
- Extract `#createFilterChip()`, `#createInstructorCard()`, `#createTimeSlotElement()`.
- These are pure element factories — they take data, return DOM elements.
- No dependencies on form state. Cleanest extraction.

**Step 2b: Availability Engine** (`availabilityEngine.ts`)
- Extract `#isInstructorAvailableOnDay()`, `#isInstructorGradeEligible()`, `#calculateAvailableSlotsForDay()`, `#checkTimeSlotConflict()`, `#getFilteredRegistrationsForConflictCheck()`.
- Consolidate `#calculateCascadingDayAvailability()`, `#calculateCascadingLengthAvailability()`, `#calculateCascadingInstructorAvailability()`, `#calculateFilteredInstrumentAvailability()` into a single parameterized function.
- All functions become pure — they accept data (instructors, registrations, filter state, config) and return availability counts. No DOM access, no `this` references.
- Also extract `#generateInstructorTimeSlots()` which generates the full time slot array for an instructor.

**Step 2c: Cascading Filter UI** (`cascadingFilterChips.ts`)
- Extract chip generation methods: `#generateInstrumentChips()`, `#generateDayChips()`, `#generateLengthChips()`, `#generateInstructorChips()`.
- Extract filter state management: `#attachFilterChipListeners()`, `#clearDownstreamSelections()`, `#updateCascadingChips()`, `#filterTimeSlots()`, `#regenerateFilteredTimeSlots()`.
- This becomes a class that takes a container element, an availability engine reference, and presentation helpers. It owns the filter DOM state and cascade propagation.

**Step 2d: Group Registration** (`parentGroupRegistration.ts`)
- Extract `#populateParentClassesDropdown()`, `#handleClassSelection()`, `#validateGroupRegistration()`, `#getCreateGroupRegistrationData()`, `#attachGroupSubmitButtonListener()`, `#clearGroupForm()`.
- Takes: classes array, registrations array, students array, container element, submit callback, appConfig reference.

**Step 2e: Private Registration Submission** (`parentPrivateSubmission.ts`)
- Extract `#validateRegistration()`, `#getCreateRegistrationData()`, `#attachSubmitButtonListener()`.
- Takes: selected lesson state, registrations, appConfig, submit callback.

**Step 2f: Reduce Orchestrator**
- The remaining `parentRegistrationForm.ts` becomes the orchestrator:
  - Constructor receives data and sendDataFunction (unchanged signature)
  - `#initializeHybridInterface()` instantiates sub-components
  - `updateData()` passes new data to sub-components
  - `#populateStudentSelector()` stays (student selection drives everything downstream)
  - `#attachRegistrationTypeListener()` stays (switches between private/group containers)
  - `clearSelection()`, `destroy()` stay
  - `_isEnrollmentPeriodActive()`, `_canAccessNextTrimester()`, `_renderRegistrationSelector()` stay (enrollment-specific orchestration)
- Target: under 800 lines.

### Phase 3: Registration Service Extraction (US3)

**Files created**: `src/web/js/data/registrationService.ts`
**Files modified**: `viewModel.ts`, `parentRegistrationTab.ts`, `adminRegistrationTab.ts`, possibly `global.d.ts`

**Approach**:
1. Create `RegistrationService` as a static-method class in `src/web/js/data/`.
2. Move `createRegistrationWithEnrichment` logic into `RegistrationService.create()`. It receives the registration data, enrichment context (students/instructors arrays), and current user info. Returns the enriched registration.
3. Move `requestDeleteRegistrationAsync` and `submitIntent` into `RegistrationService.delete()` and `RegistrationService.submitIntent()`.
4. Update `parentRegistrationTab.ts` and `adminRegistrationTab.ts` to call `RegistrationService` directly instead of `window.viewModel.createRegistrationWithEnrichment()`.
5. Remove from viewModel: `createRegistrationWithEnrichment`, `requestDeleteRegistrationAsync`, `submitIntent`.
6. Remove vestigial state arrays from viewModel: `admins`, `instructors`, `students`, `registrations`, `classes`, `rooms`, `nextTrimesterRegistrations`. Update `loadUserData()` to remove the empty array initializations.
7. If other code references `window.viewModel.createRegistrationWithEnrichment`, add a thin passthrough during transition, then remove once all callers are updated.

### Phase 4: Backend-Served Configuration (US4)

**Files modified**: `appConfigurationResponse.ts`, `userController.ts`, `registrationFormConstants.ts`, `timeHelpers.ts`, `registrationValidator.ts`, `classManager.ts`, `availabilityEngine.ts`, `cascadingFilterChips.ts`, `parentGroupRegistration.ts`, `parentPrivateSubmission.ts`, `lessonDetailsForm.ts`

**Step 4a: Backend — Expand Configuration Endpoint**
1. Add `RegistrationConfig` interface and `registrationConfig` field to `AppConfigurationResponse`.
2. In `UserController.getAppConfiguration`, populate `registrationConfig` from config source. Initially hardcode the current values in the controller — the data source (Sheets config row or environment) is an implementation detail that can be refined later.
3. Add integration test verifying `registrationConfig` appears in the response.

**Step 4b: Frontend — Create Config Access Helper**
1. Create a helper function `getRegistrationConfig()` that reads `window.UserSession.getAppConfig()?.registrationConfig` and merges with defaults for any missing fields.
2. This is the single point where fallback logic lives.

**Step 4c: Frontend — Update Consumers**
1. `registrationValidator.ts`: `validateBusTimeRestrictions()` accepts `busDeadlines` parameter instead of importing `BusDeadlines` constant.
2. `timeHelpers.ts`: `generateTimeOptions()` accepts `startHour`, `endHour`, `intervalMinutes` parameters instead of reading `TimeSlotConfig` constant.
3. `classManager.ts`: `formatClassNameWithTime()` reads `rockBandDisplayConfig` from appConfig instead of hardcoded string. `getRockBandClassLength()` reads from config.
4. `availabilityEngine.ts`: Slot generation accepts lesson lengths and operational hours as parameters.
5. `cascadingFilterChips.ts`: Reads lesson lengths from config for chip generation.
6. `parentGroupRegistration.ts`: Passes bus deadlines to validator.
7. `parentPrivateSubmission.ts`: Passes bus deadlines to validator.
8. `lessonDetailsForm.ts`: Reads `defaultInstruments` and time options from config.
9. `registrationFormConstants.ts`: Remove `BusDeadlines`, `TimeSlotConfig`, `LessonLengths`, `DefaultInstruments`. Retain `RegistrationFormText`, `WeekDays`, `DayNames`, `TransportationType` (UI/structural constants).

### Phase 5: Verification

1. `tsc --noEmit` — zero errors (backend)
2. `tsc --noEmit -p tsconfig.web.json` — zero errors (frontend)
3. `npx vite build` — Vite build succeeds
4. `npm test` — all existing tests pass
5. New unit tests pass for availability engine and registration service
6. New integration test passes for configuration endpoint
7. `parentRegistrationForm.ts` line count < 800
8. Zero entity interfaces duplicated between forms
9. Zero vestigial state arrays in viewModel
10. Manual verification: parent registration (private + group) works identically
