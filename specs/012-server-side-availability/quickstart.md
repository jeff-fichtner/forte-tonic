# Quickstart: Server-Side Availability Pre-Computation

**Branch**: `012-server-side-availability` | **Date**: 2026-03-02

## What This Feature Does

Moves the private lesson availability computation from the browser to the server. The parent registration tab endpoint now returns pre-computed available time slots alongside existing data. The client stores these slots in memory and filters them locally when parents interact with cascading filter chips — no server round-trips during chip interaction.

## Key Files

### New Files

| File | Purpose |
|------|---------|
| `src/services/availabilityService.ts` | Server-side slot computation (ports logic from client engine) |
| `src/models/shared/availableTimeSlot.ts` | Shared type definition for pre-computed slots |
| `tests/unit/services/availabilityService.test.ts` | Unit tests for server-side computation |

### Modified Files

| File | Change |
|------|--------|
| `src/controllers/registrationController.ts` | Call availability service in `getParentRegistrationTabData` |
| `src/infrastructure/container/serviceContainer.ts` | Register `AvailabilityService` |
| `src/models/shared/index.ts` | Export `AvailableTimeSlot` type |
| `src/web/js/tabs/parentRegistrationTab.ts` | Pass slots through data pipeline; re-fetch on modify |
| `src/web/js/workflows/parentRegistrationForm.ts` | Accept + route slot data by grade |
| `src/web/js/components/registrationForm/cascadingFilterChips.ts` | Use pre-computed slots instead of engine functions |
| `src/web/js/utilities/registrationForm/availabilityEngine.ts` | Remove server-ported functions |
| `tests/unit/web/availabilityEngine.test.ts` | Remove tests for deleted functions |
| `scripts/postman/tonic-api.postman_collection.json` | Document new query param and response field |

## How to Verify

1. **Run tests**: `npm test` — all existing + new tests pass
2. **Build frontend**: `npm run build:frontend` — no errors
3. **Manual verification**:
   - Load parent registration tab
   - Confirm chips show availability counts
   - Open browser DevTools Network tab
   - Tap filter chips — no network requests should fire
   - Switch students — chips update, no network requests
   - (Enrollment period) Select "Modify" from dropdown — one network request fires, then chips update

## Architecture Summary

```
Server:
  getParentRegistrationTabData()
    → AvailabilityService.computeAvailableTimeSlots(instructors, registrations, grades)
    → Returns { instructors, students, classes, registrations, availableTimeSlots }

Client:
  ParentRegistrationTab.fetchData()
    → Stores availableTimeSlots[grade] per student
    → CascadingFilterChips receives flat slot array
    → Chip tap → Array.filter() + count → update DOM (no fetch)
```
