# Tasks: TypeScript Migration

**Input**: Design documents from `/specs/002-typescript-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested. Existing 544 tests are migrated (file format change) but no new test tasks are generated.

**Organization**: Tasks organized by user story. US1 (type safety) and US2 (behavior preservation) are tightly coupled — they're implemented together since every file migration must satisfy both. US3 (IDE support) is a natural consequence of US1. US4 (build pipeline) is foundational.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install TypeScript tooling, create configuration files, set up the compilation and runtime environment.

- [x] T001 Install TypeScript and runtime dependencies: `npm install -D typescript tsx ts-jest @types/node @types/express @types/cors @types/lodash @types/nodemailer @types/supertest typescript-eslint`
- [x] T002 Remove superseded Babel dependencies: `npm uninstall @babel/core @babel/preset-env babel-jest`
- [x] T003 Remove superseded JSDoc linting plugin: `npm uninstall eslint-plugin-jsdoc`
- [x] T004 Create tsconfig.json at repository root (backend config per quickstart.md)
- [x] T005 Create tsconfig.web.json at repository root (frontend config extending base per quickstart.md)
- [x] T006 Create src/types/materialize.d.ts with MaterializeCSS M namespace declarations for toast, Modal, Tooltip, FormSelect, Tabs, Sidenav
- [x] T007 Create src/types/global.d.ts with app-wide global declarations (ViewModel, ModalKeyboardHandler, AccessCodeManager, ClassManager on window)
- [x] T008 Rename and update config/eslint.config.js → config/eslint.config.ts with typescript-eslint parser and rules per quickstart.md
- [x] T009 Rename and update config/jest.config.js → config/jest.config.ts with ts-jest ESM preset per quickstart.md
- [x] T010 [P] Remove config/babel.config.js (no longer needed)
- [x] T011 Rename and update vite.config.js → vite.config.ts (update alias paths)
- [x] T012 Update package.json scripts: start → tsx, dev → nodemon --exec tsx, test → tsx test runner, add typecheck script, update format/lint globs to .ts per quickstart.md
- [x] T013 Verify setup: run `npx tsc --noEmit` (expect errors from missing .ts files — confirms compiler works)

**Checkpoint**: TypeScript tooling installed, configs created. Ready to migrate source files.

---

## Phase 2: Foundational — Models & Shared Types

**Purpose**: Migrate all shared models and utility types. These are imported by every other layer, so they must be converted first.

### Constants and Enums

- [x] T014 [P] Rename and type src/models/shared/instruments.js → instruments.ts (add `as const` assertion)
- [x] T015 [P] Rename and type src/models/shared/lengthOptions.js → lengthOptions.ts (add `as const` assertion)
- [x] T016 [P] Rename and type src/constants/intentTypes.js → intentTypes.ts
- [x] T017 [P] Rename and type src/utils/values/dropRequestStatus.js → dropRequestStatus.ts
- [x] T018 [P] Rename and type src/utils/values/keys.js → keys.ts
- [x] T019 [P] Rename and type src/utils/values/periodType.js → periodType.ts
- [x] T020 [P] Rename and type src/utils/values/registrationType.js → registrationType.ts
- [x] T021 [P] Rename and type src/utils/values/trimester.js → trimester.ts

### Utility Modules

- [x] T022 [P] Rename and type src/utils/cloneUtility.js → cloneUtility.ts
- [x] T023 [P] Rename and type src/utils/dateHelpers.js → dateHelpers.ts
- [x] T024 [P] Rename and type src/utils/enhancedDateHelpers.js → enhancedDateHelpers.ts
- [x] T025 [P] Rename and type src/utils/helpers.js → helpers.ts
- [x] T026 [P] Rename and type src/utils/logger.js → logger.ts
- [x] T027 [P] Rename and type src/utils/nativeDateTimeHelpers.js → nativeDateTimeHelpers.ts
- [x] T028 [P] Rename and type src/utils/uuidUtility.js → uuidUtility.ts
- [x] T029 [P] Rename and type src/utils/versionHash.js → versionHash.ts

### Shared Model Classes (with interfaces from data-model.md)

- [x] T030 [P] Rename and type src/models/shared/student.js → student.ts (add StudentData interface, type constructor, getters, toJSON return type, fromDatabaseRow parameter/return types)
- [x] T031 [P] Rename and type src/models/shared/admin.js → admin.ts (add AdminData interface, type constructor, getters, toJSON, fromDatabaseRow, fromApiData)
- [x] T032 [P] Rename and type src/models/shared/parent.js → parent.ts (add ParentData interface, type constructor, toJSON, fromDatabaseRow, fromApiData)
- [x] T033 [P] Rename and type src/models/shared/instructor.js → instructor.ts (add InstructorData, DayAvailability, InstructorAvailability, GradeRange interfaces, type all methods)
- [x] T034 [P] Rename and type src/models/shared/room.js → room.ts (add RoomData interface, type constructor, getters, toJSON, fromDatabaseRow)
- [x] T035 [P] Rename and type src/models/shared/class.js → class.ts (add ClassData interface, type constructor, getters, toJSON, fromDatabaseRow)
- [x] T036 [P] Rename and type src/models/shared/attendanceRecord.js → attendanceRecord.ts (add AttendanceRecordData interface)
- [x] T037 Rename and type src/models/shared/registration.js → registration.ts (add RegistrationData, RegistrationType, ReenrollmentIntent types, type constructor, validation, toJSON, fromDatabaseRow, fromApiData, createNew, generateSchedule, toDatabaseRow)
- [x] T038 [P] Rename and type src/models/shared/responses/appConfigurationResponse.js → appConfigurationResponse.ts (add AppConfigurationResponseData, Period interfaces)
- [x] T039 [P] Rename and type src/models/shared/responses/authenticatedUserResponse.js → authenticatedUserResponse.ts (add AuthenticatedUserResponseData interface)
- [x] T040 Update src/models/shared/index.js → index.ts (update barrel exports, re-export interfaces)

### Common Modules

- [x] T041 [P] Rename and type src/common/errorConstants.js → errorConstants.ts
- [x] T042 [P] Rename and type src/common/errors.js → errors.ts
- [x] T043 [P] Rename and type src/common/gcpLogger.js → gcpLogger.ts
- [x] T044 Rename and type src/common/responseHelpers.js → responseHelpers.ts (add ApiSuccessResponse, ApiErrorResponse, SuccessResponseOptions, ErrorResponseOptions types from contracts/api-responses.ts)
- [x] T045 [P] Rename and type src/common/errorHandling.js → errorHandling.ts

### Config Modules

- [x] T046 [P] Rename and type src/config/constants.js → constants.ts
- [x] T047 [P] Rename and type src/config/environment.js → environment.ts

- [x] T048 Verify foundational phase: run `npx tsc --noEmit` on models/utils/common — resolve any type errors in these files before proceeding

**Checkpoint**: All shared types, models, utilities, and constants are TypeScript. Every downstream file can import typed models.

---

## Phase 3: User Story 1 & 2 — Type Safety + Behavior Preservation (Priority: P1) 🎯 MVP

**Goal**: Migrate all backend infrastructure, repositories, services, and controllers to TypeScript with full type annotations. All existing tests must continue to pass.

**Independent Test**: Run `npx tsc --noEmit` for zero type errors. Run `npm test` for 544 passing tests. Run `npm start` and hit health endpoint.

### Infrastructure

- [ ] T049 [P] [US1] Rename and type src/infrastructure/base/baseService.js → baseService.ts
- [ ] T050 [P] [US1] Rename and type src/infrastructure/base/baseController.js → baseController.ts
- [ ] T051 [US1] Rename and type src/infrastructure/container/serviceContainer.js → serviceContainer.ts (add ServiceContainer interface with typed get/register/resolve)

### Cache and Email

- [ ] T052 [P] [US1] Rename and type src/cache/cacheService.js → cacheService.ts (add CacheService interface from contracts/database.ts)
- [ ] T053 [P] [US1] Rename and type src/email/emailClient.js → emailClient.ts

### Database Layer

- [ ] T054 [US1] Rename and type src/database/googleSheetsDbClient.js → googleSheetsDbClient.ts (add SheetInfo, SheetRow types from contracts/database.ts; document `any` at Google Sheets API boundary per SC-005; type all public methods with RowMapper<T> generic)

### Repositories

- [ ] T055 [P] [US1] Rename and type src/repositories/baseRepository.js → baseRepository.ts (type IRepository<T> interface and BaseRepository abstract class)
- [ ] T056 [P] [US1] Rename and type src/repositories/userRepository.js → userRepository.ts
- [ ] T057 [P] [US1] Rename and type src/repositories/registrationRepository.js → registrationRepository.ts
- [ ] T058 [P] [US1] Rename and type src/repositories/programRepository.js → programRepository.ts
- [ ] T059 [P] [US1] Rename and type src/repositories/attendanceRepository.js → attendanceRepository.ts
- [ ] T060 [P] [US1] Rename and type src/repositories/dropRequestRepository.js → dropRequestRepository.ts
- [ ] T061 [US1] Update src/repositories/index.js → index.ts (update barrel exports)

### Services

- [ ] T062 [P] [US1] Rename and type src/services/configurationService.js → configurationService.ts
- [ ] T063 [P] [US1] Rename and type src/services/authenticator.js → authenticator.ts
- [ ] T064 [P] [US1] Rename and type src/services/periodService.js → periodService.ts
- [ ] T065 [P] [US1] Rename and type src/services/registrationApplicationService.js → registrationApplicationService.ts
- [ ] T066 [P] [US1] Rename and type src/services/registrationConflictService.js → registrationConflictService.ts
- [ ] T067 [P] [US1] Rename and type src/services/registrationValidationService.js → registrationValidationService.ts
- [ ] T068 [P] [US1] Rename and type src/services/programValidationService.js → programValidationService.ts
- [ ] T069 [P] [US1] Rename and type src/services/dropRequestService.js → dropRequestService.ts
- [ ] T070 [US1] Update src/services/index.js → index.ts (update barrel exports)

### Middleware

- [ ] T071 [P] [US1] Rename and type src/middleware/auth.js → auth.ts (type req.currentUser, Express Request augmentation)
- [ ] T072 [P] [US1] Rename and type src/middleware/requestDataNormalizer.js → requestDataNormalizer.ts
- [ ] T073 [P] [US1] Rename and type src/middleware/versionInjection.js → versionInjection.ts

### Controllers

- [ ] T074 [P] [US1] Rename and type src/controllers/userController.js → userController.ts
- [ ] T075 [P] [US1] Rename and type src/controllers/registrationController.js → registrationController.ts
- [ ] T076 [P] [US1] Rename and type src/controllers/attendanceController.js → attendanceController.ts
- [ ] T077 [P] [US1] Rename and type src/controllers/feedbackController.js → feedbackController.ts
- [ ] T078 [P] [US1] Rename and type src/controllers/systemController.js → systemController.ts

### Routes and App Entry

- [ ] T079 [US1] Rename and type src/routes/api.js → api.ts (type all route handlers with Request/Response)
- [ ] T080 [P] [US1] Rename and type src/routes/static.js → static.ts
- [ ] T081 [US1] Rename and type src/app.js → app.ts (type Express app initialization, middleware stack)
- [ ] T082 [US1] Rename and type src/server.js → server.ts (entry point)

### Backend Verification

- [ ] T083 [US2] Run `npx tsc --noEmit` — resolve all backend type errors to zero
- [ ] T084 [US2] Run `npm start` — verify server starts and health endpoint responds

**Checkpoint**: All backend source files are TypeScript. Server runs. Type checker passes on backend.

---

## Phase 4: User Story 1 & 2 (continued) — Frontend Migration (Priority: P1)

**Goal**: Migrate all frontend JavaScript to TypeScript. Vite build must succeed. Frontend must load and function identically.

**Independent Test**: Run `npx tsc --noEmit -p tsconfig.web.json` for zero errors. Run `npm run build:frontend` for successful Vite build.

### Frontend Constants

- [ ] T085 [P] [US1] Rename and type src/web/js/constants.js → constants.ts
- [ ] T086 [P] [US1] Rename and type src/web/js/constants/intentConstants.js → intentConstants.ts
- [ ] T087 [P] [US1] Rename and type src/web/js/constants/periodTypeConstants.js → periodTypeConstants.ts
- [ ] T088 [P] [US1] Rename and type src/web/js/constants/registrationFormConstants.js → registrationFormConstants.ts
- [ ] T089 [P] [US1] Rename and type src/web/js/constants/trimesterConstants.js → trimesterConstants.ts
- [ ] T090 [P] [US1] Rename and type src/web/js/constants/userTypeConstants.js → userTypeConstants.ts

### Frontend Extensions

- [ ] T091 [P] [US1] Rename and type src/web/js/extensions/durationExtensions.js → durationExtensions.ts
- [ ] T092 [P] [US1] Rename and type src/web/js/extensions/numberExtensions.js → numberExtensions.ts
- [ ] T093 [P] [US1] Rename and type src/web/js/extensions/stringExtensions.js → stringExtensions.ts

### Frontend Data Layer

- [ ] T094 [US1] Rename and type src/web/js/data/httpService.js → httpService.ts (add generic type parameters from contracts/http-service.ts)
- [ ] T095 [P] [US1] Rename and type src/web/js/data/indexedDbClient.js → indexedDbClient.ts

### Frontend Utilities

- [ ] T096 [P] [US1] Rename and type src/web/js/utilities/classManager.js → classManager.ts
- [ ] T097 [P] [US1] Rename and type src/web/js/utilities/classNameFormatter.js → classNameFormatter.ts
- [ ] T098 [P] [US1] Rename and type src/web/js/utilities/clipboardHelpers.js → clipboardHelpers.ts
- [ ] T099 [P] [US1] Rename and type src/web/js/utilities/domHelpers.js → domHelpers.ts
- [ ] T100 [P] [US1] Rename and type src/web/js/utilities/durationHelpers.js → durationHelpers.ts
- [ ] T101 [P] [US1] Rename and type src/web/js/utilities/formatHelpers.js → formatHelpers.ts
- [ ] T102 [P] [US1] Rename and type src/web/js/utilities/modalKeyboardHandler.js → modalKeyboardHandler.ts
- [ ] T103 [P] [US1] Rename and type src/web/js/utilities/periodHelpers.js → periodHelpers.ts
- [ ] T104 [P] [US1] Rename and type src/web/js/utilities/phoneHelpers.js → phoneHelpers.ts
- [ ] T105 [P] [US1] Rename and type src/web/js/utilities/promiseHelpers.js → promiseHelpers.ts
- [ ] T106 [P] [US1] Rename and type src/web/js/utilities/registrationHelpers.js → registrationHelpers.ts
- [ ] T107 [P] [US1] Rename and type src/web/js/utilities/registrationForm/messageDisplay.js → messageDisplay.ts
- [ ] T108 [P] [US1] Rename and type src/web/js/utilities/registrationForm/registrationValidator.js → registrationValidator.ts
- [ ] T109 [P] [US1] Rename and type src/web/js/utilities/registrationForm/timeHelpers.js → timeHelpers.ts

### Frontend Components

- [ ] T110 [P] [US1] Rename and type src/web/js/components/dropRequestModal.js → dropRequestModal.ts
- [ ] T111 [P] [US1] Rename and type src/web/js/components/navTabs.js → navTabs.ts
- [ ] T112 [P] [US1] Rename and type src/web/js/components/select.js → select.ts
- [ ] T113 [P] [US1] Rename and type src/web/js/components/table.js → table.ts
- [ ] T114 [P] [US1] Rename and type src/web/js/components/registrationForm/classSelector.js → classSelector.ts
- [ ] T115 [P] [US1] Rename and type src/web/js/components/registrationForm/instructorSelector.js → instructorSelector.ts
- [ ] T116 [P] [US1] Rename and type src/web/js/components/registrationForm/lessonDetailsForm.js → lessonDetailsForm.ts
- [ ] T117 [P] [US1] Rename and type src/web/js/components/registrationForm/registrationTypeSelector.js → registrationTypeSelector.ts
- [ ] T118 [P] [US1] Rename and type src/web/js/components/registrationForm/studentSelector.js → studentSelector.ts
- [ ] T119 [P] [US1] Rename and type src/web/js/components/registrationForm/transportationSelector.js → transportationSelector.ts

### Frontend Core and Tabs

- [ ] T120 [P] [US1] Rename and type src/web/js/core/baseTab.js → baseTab.ts
- [ ] T121 [P] [US1] Rename and type src/web/js/core/tabController.js → tabController.ts
- [ ] T122 [P] [US1] Rename and type src/web/js/tabs/adminMasterScheduleTab.js → adminMasterScheduleTab.ts
- [ ] T123 [P] [US1] Rename and type src/web/js/tabs/adminRegistrationTab.js → adminRegistrationTab.ts
- [ ] T124 [P] [US1] Rename and type src/web/js/tabs/adminWaitListTab.js → adminWaitListTab.ts
- [ ] T125 [P] [US1] Rename and type src/web/js/tabs/employeeDirectoryTab.js → employeeDirectoryTab.ts
- [ ] T126 [P] [US1] Rename and type src/web/js/tabs/instructorWeeklyScheduleTab.js → instructorWeeklyScheduleTab.ts
- [ ] T127 [P] [US1] Rename and type src/web/js/tabs/parentContactTab.js → parentContactTab.ts
- [ ] T128 [P] [US1] Rename and type src/web/js/tabs/parentRegistrationTab.js → parentRegistrationTab.ts
- [ ] T129 [P] [US1] Rename and type src/web/js/tabs/parentWeeklyScheduleTab.js → parentWeeklyScheduleTab.ts

### Frontend Workflows and Entry Points

- [ ] T130 [P] [US1] Rename and type src/web/js/workflows/adminRegistrationForm.js → adminRegistrationForm.ts
- [ ] T131 [P] [US1] Rename and type src/web/js/workflows/parentRegistrationForm.js → parentRegistrationForm.ts
- [ ] T132 [P] [US1] Rename and type src/web/js/feedback.js → feedback.ts
- [ ] T133 [US1] Rename and type src/web/js/viewModel.js → viewModel.ts
- [ ] T134 [US1] Rename and type src/web/js/main.js → main.ts (update script reference in src/web/index.html)

### Frontend Verification

- [ ] T135 [US2] Run `npx tsc --noEmit -p tsconfig.web.json` — resolve all frontend type errors to zero
- [ ] T136 [US2] Run `npm run build:frontend` — verify Vite build succeeds
- [ ] T137 [US2] Update src/web/index.html script tag from main.js to main.ts (if Vite requires it)

**Checkpoint**: All frontend source files are TypeScript. Vite build succeeds. Frontend type checker passes.

---

## Phase 5: User Story 2 (continued) — Test Migration (Priority: P1)

**Goal**: Migrate all test files to TypeScript. All 544 tests must pass with no changes to test logic or assertions.

**Independent Test**: Run `npm test` — all 544 tests pass.

### Test Infrastructure

- [ ] T138 Rename and type tests/setup.js → setup.ts
- [ ] T139 Rename and type tests/scripts/test.js → test.ts (update to use tsx for spawning jest)

### Unit Tests

- [ ] T140 [P] [US2] Rename and type tests/unit/simple.test.js → simple.test.ts
- [ ] T141 [P] [US2] Rename and type tests/unit/authenticator.test.js → authenticator.test.ts
- [ ] T142 [P] [US2] Rename and type tests/unit/emailClient.test.js → emailClient.test.ts
- [ ] T143 [P] [US2] Rename and type tests/unit/enums.test.js → enums.test.ts
- [ ] T144 [P] [US2] Rename and type tests/unit/googleSheetsDbClient.test.js → googleSheetsDbClient.test.ts
- [ ] T145 [P] [US2] Rename and type tests/unit/groupRegistrationService.test.js → groupRegistrationService.test.ts
- [ ] T146 [P] [US2] Rename and type tests/unit/parentWeeklySchedule.test.js → parentWeeklySchedule.test.ts
- [ ] T147 [P] [US2] Rename and type tests/unit/phoneHelpers.test.js → phoneHelpers.test.ts
- [ ] T148 [P] [US2] Rename and type tests/unit/userRepository.test.js → userRepository.test.ts
- [ ] T149 [P] [US2] Rename and type tests/unit/viewModel.test.js → viewModel.test.ts
- [ ] T150 [P] [US2] Rename and type tests/unit/common/errorConstants.test.js → errorConstants.test.ts
- [ ] T151 [P] [US2] Rename and type tests/unit/common/errors.test.js → errors.test.ts
- [ ] T152 [P] [US2] Rename and type tests/unit/common/gcpLogger.test.js → gcpLogger.test.ts
- [ ] T153 [P] [US2] Rename and type tests/unit/common/responseHelpers.test.js → responseHelpers.test.ts
- [ ] T154 [P] [US2] Rename and type tests/unit/core/baseTab.test.js → baseTab.test.ts
- [ ] T155 [P] [US2] Rename and type tests/unit/core/tabController.test.js → tabController.test.ts
- [ ] T156 [P] [US2] Rename and type tests/unit/models/registration.test.js → registration.test.ts
- [ ] T157 [P] [US2] Rename and type tests/unit/repositories/dropRequestRepository.test.js → dropRequestRepository.test.ts
- [ ] T158 [P] [US2] Rename and type tests/unit/repositories/registrationRepository.test.js → registrationRepository.test.ts
- [ ] T159 [P] [US2] Rename and type tests/unit/services/periodService.test.js → periodService.test.ts
- [ ] T160 [P] [US2] Rename and type tests/unit/services/registrationConflictService.test.js → registrationConflictService.test.ts
- [ ] T161 [P] [US2] Rename and type tests/unit/services/registrationValidationService.test.js → registrationValidationService.test.ts
- [ ] T162 [P] [US2] Rename and type tests/unit/utils/trimester.test.js → trimester.test.ts
- [ ] T163 [P] [US2] Rename and type tests/unit/web/httpService.test.js → httpService.test.ts

### Integration Tests

- [ ] T164 [P] [US2] Rename and type tests/integration/appConfiguration.test.js → appConfiguration.test.ts
- [ ] T165 [P] [US2] Rename and type tests/integration/errorHandling.test.js → errorHandling.test.ts
- [ ] T166 [P] [US2] Rename and type tests/integration/getInstructorByAccessCode.test.js → getInstructorByAccessCode.test.ts
- [ ] T167 [P] [US2] Rename and type tests/integration/intentEndpoint.test.js → intentEndpoint.test.ts
- [ ] T168 [P] [US2] Rename and type tests/integration/registrationController.test.js → registrationController.test.ts
- [ ] T169 [P] [US2] Rename and type tests/integration/server.test.js → server.test.ts

### Test Verification

- [ ] T170 [US2] Run `npm test` — verify all 544 tests pass with no assertion changes

**Checkpoint**: All tests are TypeScript. All 544 tests pass. Behavior preservation confirmed.

---

## Phase 6: User Story 4 — Build Pipeline (Priority: P1)

**Goal**: Ensure all npm scripts work correctly with the TypeScript codebase.

**Independent Test**: Run each npm script and confirm success.

- [ ] T171 [US4] Rename start.js → start.ts (root-level entry if used)
- [ ] T172 [US4] Run `npm run typecheck` (both tsconfig.json and tsconfig.web.json) — zero errors
- [ ] T173 [US4] Run `npm start` — server starts successfully
- [ ] T174 [US4] Run `npm test` — all 544 tests pass
- [ ] T175 [US4] Run `npm run build:frontend` — Vite build succeeds
- [ ] T176 [US4] Run `npm run lint` — ESLint processes all .ts files without errors
- [ ] T177 [US4] Run `npm run format:check` — Prettier validates all .ts files
- [ ] T178 [US4] Run `npm run check:all` — full pipeline succeeds (format + lint + typecheck + test)

**Checkpoint**: All npm scripts work. Build pipeline is fully operational with TypeScript.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, audit, and validation across the full codebase.

- [ ] T179 Audit all `any` usages: grep for `any` across src/ — verify each is at a documented external boundary (Google Sheets API, MaterializeCSS) with an explanatory comment
- [ ] T180 Verify no .js source files remain in src/ (only .ts files, plus .d.ts declarations)
- [ ] T181 Verify no .js test files remain in tests/ (only .ts files)
- [ ] T182 [P] Update .prettierignore and .eslintignore (if they exist) to reference .ts instead of .js
- [ ] T183 Run `npm run format` on full codebase to auto-format all .ts files
- [ ] T184 Run final `npm run check:all` — zero format issues, zero lint errors, zero type errors, 544 tests pass
- [ ] T185 Verify `npm run build:staging` completes successfully (full production build pipeline)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — models/utils must be TS before anything imports them
- **Backend (Phase 3)**: Depends on Phase 2 — repos/services/controllers import models
- **Frontend (Phase 4)**: Depends on Phase 2 — frontend imports shared models; can run in parallel with Phase 3
- **Tests (Phase 5)**: Depends on Phase 3 + Phase 4 — tests import source modules
- **Pipeline (Phase 6)**: Depends on Phase 5 — validates everything works together
- **Polish (Phase 7)**: Depends on Phase 6 — final audit and cleanup

### User Story Dependencies

- **US1 (Type Safety)**: Delivered incrementally through Phases 2–4
- **US2 (Behavior Preservation)**: Verified at each phase checkpoint
- **US3 (IDE Support)**: Automatic consequence of US1 — no dedicated tasks needed
- **US4 (Build Pipeline)**: Phase 6, depends on all source migrations

### Within Each Phase

- Tasks marked [P] can run in parallel (different files, no import dependencies)
- Tasks without [P] have sequential dependencies (barrel exports, entry points, verification steps)
- Verification tasks (T048, T083, T084, T135, T136, T170, T172–T178, T184–T185) must run after all tasks in their phase

### Parallel Opportunities

Phase 2 has the most parallelism — all model files can be migrated simultaneously:
- T014–T021 (constants) — all parallel
- T022–T029 (utilities) — all parallel
- T030–T039 (models) — all parallel except T037 (Registration, largest model)

Phase 3 repositories (T055–T060) and services (T062–T069) can run in parallel within their groups.

Phase 4 frontend files (T085–T132) are almost entirely parallel — only T133, T134 (viewModel, main) are sequential.

Phase 5 test files (T140–T169) are all parallel.

---

## Implementation Strategy

### MVP First (Phases 1–3)

1. Complete Phase 1: Setup (T001–T013)
2. Complete Phase 2: Foundational models and types (T014–T048)
3. Complete Phase 3: Backend migration (T049–T084)
4. **STOP and VALIDATE**: Backend compiles, server starts, integration tests pass
5. This is deployable — frontend continues running from existing .js (Vite handles both)

### Full Migration (Phases 4–7)

6. Complete Phase 4: Frontend migration (T085–T137)
7. Complete Phase 5: Test migration (T138–T170)
8. Complete Phase 6: Pipeline validation (T171–T178)
9. Complete Phase 7: Polish and audit (T179–T185)

---

## Notes

- [P] tasks = different files, no cross-dependencies
- [US1]/[US2] labels on most tasks since type safety and behavior preservation are tested together
- Import extensions stay as `.js` even after rename (TypeScript ESM convention per research.md R5)
- Each "Rename and type" task means: `git mv file.js file.ts`, add type annotations, update imports in that file
- Do NOT change any runtime logic — only add types
- When a file imports from another file being migrated, the `.js` import extension continues to work
