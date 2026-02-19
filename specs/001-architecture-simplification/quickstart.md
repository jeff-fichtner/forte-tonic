# Quickstart: Architecture Simplification

**Branch**: `001-architecture-simplification`

## Implementation Order

This is a bottom-up refactoring. Each phase produces a consistent contract that the next phase depends on.

```
Phase 1: Models (IDs, serialization, constructors, dead code)
  └→ Phase 2: Database (appendRecord consolidation, repository cleanup)
       └→ Phase 3: API (response envelope, UserTransformService removal, controller cleanup)
            └→ Phase 4: Frontend (HttpService routing, ?.value removal, field name fixes)
                 └→ Phase 5: Cleanup (dead imports, dead files, test suite, smoke test)
```

## Key Rules

1. **Tests must pass after each phase.** Don't proceed to the next phase with broken tests.
2. **Backend and frontend auth changes are atomic.** The auth endpoint envelope change and the frontend login handler update must be in the same commit.
3. **One canonical name per field.** The database column name wins: `phone` (not `phoneNumber`), `specialties` (stays as-is, already canonical).
4. **`toJSON()` is the only serialization method.** Delete `toDataObject()`, `toDatabaseModel()`, `UserTransformService`. Keep `toDatabaseRow()` (that's for writing to Sheets, not API serialization).
5. **`fromDatabaseRow()` is the only required factory.** Keep `fromApiData()` only on Admin, Instructor, Parent (used by `AuthenticatedUserResponse`). Delete all other unused factories.

## Files to Delete (after all phases)

| File | Reason |
|------|--------|
| `src/utils/values/studentId.js` | Value object ID removed |
| `src/utils/values/instructorId.js` | Value object ID removed |
| `src/utils/values/registrationId.js` | Value object ID removed |
| `src/utils/values/age.js` | Unused after Student simplification |
| `src/utils/values/email.js` | Unused after Student simplification |
| `src/utils/values/lessonTime.js` | Only used by dead method |
| `src/utils/values/registrationType.js` | Never imported |
| `src/utils/values/lengthOptions.js` | Never imported |
| `src/models/shared/requests/studentRequests.js` | Never imported |
| `src/models/shared/responses/studentResponses.js` | Never imported |
| `src/services/userTransformService.js` | Replaced by model `toJSON()` |
| `src/web/js/data/apiClient.js` | Empty class, never used |

## Verification Commands

```bash
# Run all tests
npm test

# Run just unit tests
npx jest tests/unit/

# Run integration tests
npx jest tests/integration/

# Build frontend (catches import errors)
npm run build:frontend

# Full build check
npm run check:all
```
