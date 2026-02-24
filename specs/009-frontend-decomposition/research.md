# Research: Frontend Decomposition

## R1: Component Pattern for Parent Form Modules

**Decision**: Follow the existing admin registration form component pattern — constructor receives DOM element IDs + data + callbacks, private methods for internal logic, public getters for state, `clear()` for reset.

**Rationale**: 6 existing components in `src/web/js/components/registrationForm/` already establish this pattern. The admin form at 611 lines demonstrates how effective delegation looks. Consistency reduces learning cost for future developers.

**Alternatives considered**:
- Event-based communication between components: Rejected because existing components use callbacks, and changing the pattern would require rewriting the admin form too.
- Reactive state management (observable/store pattern): Rejected as over-engineering per Constitution Principle I (Simplicity First). The callback pattern works for the current interaction complexity.

## R2: Where to Place Shared Entity Types

**Decision**: Create `src/web/js/types/registrationTypes.ts` for shared entity interfaces (InstructorLike, StudentLike, ClassLike, RegistrationLike, RegistrationSubmitData, DaySchedule, TimeSlot).

**Rationale**: The `src/web/js/` tree already has `constants/`, `utilities/`, `components/`, `data/`, `workflows/`, `tabs/`, `core/`, `extensions/`. A `types/` directory follows standard TypeScript project conventions and separates type definitions from runtime code. Both forms, the availability engine, and the registration service will import from this location.

**Alternatives considered**:
- `src/types/` (existing directory): Contains `global.d.ts` for window declarations. Mixing runtime-importable interfaces with ambient declarations would be confusing.
- Inline in a barrel file at `src/web/js/index.ts`: No barrel file exists; creating one just for types adds unnecessary indirection.
- Inside `src/models/shared/`: These interfaces are frontend-only display types with `[key: string]: unknown` index signatures, not the canonical model shapes used by the backend. Mixing them would violate Constitution Principle VII.

## R3: Availability Engine Extraction Strategy

**Decision**: Extract to `src/web/js/utilities/registrationForm/availabilityEngine.ts` as a collection of pure functions (not a class). Consolidate the 4 near-identical `#calculateCascading*Availability` methods into a single parameterized function.

**Rationale**: The 4 methods share identical structure — filter instructors by grade/instrument, iterate days, get schedule, get registrations, iterate 30-min increments × lesson lengths, check conflicts. The only difference is which dimension they aggregate by. A single function with a `groupBy` parameter eliminates ~500 lines of duplication.

**Alternatives considered**:
- Class-based engine with state: Rejected because the calculation is stateless — it takes data in and returns counts. A class would add ceremony without benefit.
- Keep as 4 separate functions: Rejected because the duplication is the core problem. The spec explicitly calls out "duplicated slot calculation logic across 4 near-identical methods."

## R4: Registration Service Extraction

**Decision**: Create `src/web/js/data/registrationService.ts` as a static-method class matching the `HttpService` pattern. Contains `createRegistration()` (with endpoint routing, delete-then-create, enrichment) and `deleteRegistration()`.

**Rationale**: Placing it in `data/` alongside `httpService.ts` follows the existing convention that data access lives in that directory. Static methods match the `HttpService` pattern that the rest of the frontend already uses.

**Alternatives considered**:
- Instance-based service: Rejected because `HttpService` is static-only and the registration service wraps it. Mixing patterns adds confusion.
- Keep in viewModel but extract to a separate method: Rejected because the spec explicitly requires removing registration orchestration from viewModel.

## R5: Configuration Endpoint Expansion

**Decision**: Add a `registrationConfig` nested object to the existing `AppConfigurationResponse` containing: `busDeadlines`, `lessonLengths`, `operationalHours`, `schedulingIntervalMinutes`, `defaultInstruments`, and `rockBandDisplayConfig`. Source values from a new `registrationConfig` section in the application config (environment variables or Google Sheets config row).

**Rationale**: Nesting under `registrationConfig` keeps the top-level `AppConfigurationResponse` clean and groups related business rules. The existing `rockBandClassIds` stays at top level for backward compatibility. The backend already has `ConfigurationService` which can source these values.

**Alternatives considered**:
- Flat fields on AppConfigurationResponse: Rejected because 6+ new fields would clutter the top-level response. Grouping is cleaner.
- Separate endpoint (`/api/registration-config`): Rejected per spec assumption — "No new endpoint is needed." One config endpoint, one response, one cache.
- Hardcode in backend config file instead of Google Sheets: Either source works. The key point is the frontend reads from the API response, not from its own constants. The backend implementation detail is flexible.

## R6: Cascading Filter UI Extraction

**Decision**: Extract to `src/web/js/components/registrationForm/cascadingFilterChips.ts` as a class. This is a UI component (manages DOM elements, event listeners, visual state) that the parent form orchestrator instantiates.

**Rationale**: The cascading filter system (instrument → day → length → instructor) is a self-contained UI pattern with its own event handling, chip generation, and cascade propagation. It fits the component pattern better than a utility function because it owns DOM state.

**Alternatives considered**:
- Pure functions in utilities: Rejected because the filter system manages DOM elements, event listeners, and visual state transitions. These are component responsibilities.
- Separate files per filter dimension: Rejected because the cascade logic inherently couples the dimensions — changing instrument regenerates day/length/instructor chips. Splitting by dimension would scatter the cascade logic.

## R7: Group Registration Extraction

**Decision**: Extract to `src/web/js/components/registrationForm/parentGroupRegistration.ts` as a component class. Handles class dropdown population, grade eligibility filtering, capacity checking, waitlist detection, validation, and submission data assembly.

**Rationale**: The admin form already has `ClassSelector` for basic class selection. The parent form adds grade filtering, capacity enforcement, and waitlist detection on top. These parent-specific behaviors justify a dedicated component rather than extending `ClassSelector`.

**Alternatives considered**:
- Extend existing ClassSelector: Rejected because ClassSelector is a simple dropdown wrapper. The parent's group registration logic (grade filtering, capacity, waitlist) is business logic on top of the selector, not selector behavior.
- Split into separate capacity/eligibility/waitlist modules: Rejected as over-decomposition — these are tightly coupled to the group class selection flow and don't need independent reuse.

## R8: Private Registration Submission Extraction

**Decision**: Extract to `src/web/js/components/registrationForm/parentPrivateSubmission.ts`. Handles time slot validation, registration data assembly, trimester routing, and replaceRegistrationId handling for the private lesson flow.

**Rationale**: This is the counterpart to group registration — the other submission pathway. It reads from the selected time slot (set by the cascading filter/time slot grid) and builds the API payload.

**Alternatives considered**:
- Merge with the availability engine: Rejected because submission and availability calculation are distinct concerns. The engine computes what's available; submission packages what was selected.
- Keep inline in the orchestrator: Rejected because the submission logic includes validation, trimester routing, and replacement handling — enough complexity to justify isolation.

## R9: Presentation Helpers Extraction

**Decision**: Extract to `src/web/js/components/registrationForm/registrationFormElements.ts`. Contains pure functions for creating DOM elements: filter chips, instructor cards, time slot elements.

**Rationale**: These are stateless element factories — they take data and return DOM nodes. They don't own state or manage events (those responsibilities stay with the components that use them).

**Alternatives considered**:
- Keep in individual components: Each component could create its own elements. Rejected because the chip creation logic is shared across all 4 filter dimensions.
- CSS class-based styling instead of inline: Out of scope per spec. The extraction preserves current inline CSS behavior.
