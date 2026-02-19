# Implementation Plan: Architecture Simplification

**Branch**: `001-architecture-simplification` | **Date**: 2026-02-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-architecture-simplification/spec.md`

## Summary

Simplify the Tonic codebase by removing value object ID wrappers (StudentId, RegistrationId, InstructorId), consolidating to a single `toJSON()` serialization path, standardizing all API responses in the `{ success, data }` envelope, routing all frontend fetches through `HttpService`, removing dead code from models, and standardizing constructor signatures. This is a bottom-up refactoring: models → database → API → frontend → cleanup.

## Technical Context

**Language/Version**: Node.js with ES modules
**Primary Dependencies**: Express v4, Google Sheets API v4, MaterializeCSS (frontend)
**Storage**: Google Sheets API v4 (single spreadsheet, column-index mapped, 5-minute in-memory cache)
**Testing**: Jest with ES module support, Supertest for integration tests
**Target Platform**: Google Cloud Platform (server), browser (frontend)
**Project Type**: Web application (single process serves API + bundled frontend)
**Performance Goals**: N/A (refactoring — no behavior change)
**Constraints**: All existing tests must pass. All three user roles must function end-to-end.
**Scale/Scope**: ~95 source files affected across models, database, controllers, services, and frontend

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | This feature *is* the simplification. Every change removes complexity. |
| II. Data Consistency | PASS | Primary goal: one canonical shape per entity across all layers. |
| III. Single Serialization Path | PASS | Primary goal: `toJSON()` only, delete `toDataObject()` and `UserTransformService`. |
| IV. Uniform API Responses | PASS | Primary goal: all endpoints return `{ success, data }` envelope. |
| V. Single Data Fetch Pattern | PASS | Primary goal: all frontend calls through `HttpService`. |
| VI. No Dead Code | PASS | Primary goal: remove 40+ dead properties/methods, 4 dead files. |
| VII. Shared Models Are the Contract | PASS | Models in `src/models/shared/` remain the shared source of truth. Constructor standardization improves this. |
| VIII. Role-Based Architecture | PASS | No change to role architecture. All three roles verified in smoke test. |
| IX. Trimester-Aware by Default | PASS | No change to trimester logic. Registration table partitioning unaffected. |
| X. Google Sheets Is the Database | PASS | `appendRecord` consolidation improves the database layer. Column mappings unchanged. |

**Post-Phase 1 re-check**: All principles still pass. The design adds no new complexity — it only removes existing violations of principles II, III, IV, V, and VI.

## Project Structure

### Documentation (this feature)

```text
specs/001-architecture-simplification/
├── plan.md              # This file
├── research.md          # Phase 0: decisions on field names, factory methods, etc.
├── data-model.md        # Phase 1: target state of every model
├── contracts/           # Phase 1: API response envelope, model serialization contracts
│   ├── api-response-envelope.md
│   └── model-serialization.md
├── quickstart.md        # Phase 1: implementation quickstart
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── models/shared/           # Shared models (Student, Registration, Instructor, Admin, Parent, Class, Room, AttendanceRecord)
│   ├── responses/           # AuthenticatedUserResponse, AppConfigurationResponse
│   └── requests/            # studentRequests.js (TO DELETE)
├── utils/values/            # Value objects and enums (ID value objects TO DELETE, enums KEEP)
├── database/
│   └── googleSheetsDbClient.js  # appendRecord/v2 consolidation
├── repositories/            # registrationRepository, userRepository, programRepository, attendanceRepository, dropRequestRepository
├── services/
│   └── userTransformService.js  # TO DELETE
├── controllers/
│   ├── userController.js        # Remove UserTransformService usage, defensive ID unwrapping
│   ├── registrationController.js # Remove defensive ID unwrapping
│   ├── attendanceController.js
│   ├── feedbackController.js
│   └── systemController.js      # Wrap raw res.json() in successResponse()
├── web/js/
│   ├── data/
│   │   ├── httpService.js       # No changes needed
│   │   └── apiClient.js         # TO DELETE
│   ├── tabs/                    # 8 tab files: replace direct fetch() with HttpService, remove ?.value patterns
│   ├── viewModel.js             # Replace direct fetch(), remove ?.value patterns
│   ├── main.js                  # Replace direct fetch()
│   ├── components/              # Remove typeof id === 'object' checks
│   └── workflows/               # Remove typeof id === 'object' checks

tests/
├── unit/
└── integration/
```

**Structure Decision**: Existing monorepo structure. No new directories created. This is a refactoring within the existing layout.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
