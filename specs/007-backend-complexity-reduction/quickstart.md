# Quickstart: Backend Complexity Reduction Verification

## Pre-flight

Before starting any work, establish the baseline:

```bash
npx tsc --noEmit          # Must be 0 errors
npm test                  # Record test count (currently 702 tests, 41 suites)
grep -r "as unknown as" src/ | wc -l   # Record cast count (currently 18)
```

## Verification After Each Phase

### After US1 (Consolidate Duplicated Patterns)

1. **Registration repository**: Confirm one `_fetchRegistrations` method exists. Verify each of the 7 former duplication sites now delegates to it.
2. **Drop request repository**: Confirm one `_getAllDropRequests` method exists. Verify each of the 5 query methods uses it.
3. **Trimester cycling**: Confirm `_getNextTrimester` and `_getPreviousTrimester` are only in `periodService.ts`. Verify `userController.ts` imports from `periodService`.
4. **RegistrationInput**: Confirm the type is exported from one file only. Verify both services import it.
5. **Environment config**: Confirm `ConfigurationService.getServerConfig()` delegates to `environment.ts` instead of reading env vars directly.
6. **Run tests**: `npm test` — same count, 0 failures.
7. **Run typecheck**: `npx tsc --noEmit` — 0 errors.

### After US2 (Simplify Abstractions)

1. **Drop request errors**: Confirm zero custom error classes in `dropRequestService.ts`. Verify imports from `common/errors.ts`.
2. **fromApiData**: Confirm the method is removed from Admin, Instructor, Parent, AppConfigurationResponse. Verify callers use constructors directly.
3. **AuthenticatedUserResponse**: Confirm constructor accepts only the object form. Verify the single caller (userController:292) uses object form.
4. **Dead code removed**: Confirm these are gone:
   - `AppConfigurationResponse.hasCurrentPeriod()`, `.getPeriodType()`, `.getTrimester()`, `.isMaintenanceModeEnabled()`
   - `AuthenticatedUserResponse.hasPermission()`
   - `IRepository<T>` interface and its export
   - `ServiceContainer.has()`, `.getServiceNames()`
5. **Run tests**: Same count, 0 failures.
6. **Run typecheck**: 0 errors.

### After US3 (Type Safety)

1. **Cast count**: `grep -r "as unknown as" src/ | wc -l` — should be 0 (excluding any intentionally documented exceptions in `web/js/` frontend code).
2. **class.ts Date types**: Confirm `startTime` and `endTime` are typed as `string`, not `Date`.
3. **BaseRepository.convertToModel**: Confirm no `data as T` fallback — mapper is required.
4. **Run tests**: Same count, 0 failures.
5. **Run typecheck**: 0 errors.

### After US4 (Assumptions and Vestigial Patterns)

1. **Attendance rate**: Confirm no hard-coded `12` in `attendanceRepository.ts`. Verify session count is derived from data.
2. **Window globals**: `grep -r "window" src/models/shared/ | wc -l` — should be 0.
3. **ServiceContainer**: Confirm `has()` and `getServiceNames()` methods are removed. Confirm `singleton` flag is removed from `RegisterOptions` if all registrations use the default.
4. **Run tests**: Same count, 0 failures.
5. **Run typecheck**: 0 errors.

## Final Verification

```bash
npx tsc --noEmit                              # 0 errors
npm test                                       # Same or fewer tests (dead code test removal), 0 failures
grep -r "as unknown as" src/ | wc -l          # 0 (or 1 for tabController.ts frontend)
grep -r "window" src/models/shared/ | wc -l   # 0
wc -l src/**/*.ts | tail -1                    # Fewer total lines than baseline
```
