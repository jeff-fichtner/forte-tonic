# Quickstart: 004 — Service Layer Cleanup

## Verification Strategy

This is a refactor — no new features, no API changes. Verification is about confirming identical behavior.

### 1. Existing Tests Pass

```bash
npm test
```

All 534 existing tests must pass unchanged. Any failure indicates a regression in the rewiring.

### 2. EntityQueryService Unit Tests

New tests in `tests/unit/entityQueryService.test.ts` covering:

- `getStudents()` — no filters returns all; `{ parentId }` filters by parent1Id/parent2Id
- `getInstructors()` — no filters returns all; `{ instructorIds }` filters by ID set
- `getRegistrations({ trimester })` — delegates to repository trimester fetch
- `getRegistrations({ trimester, studentIds })` — filters by student ID set
- `getRegistrations({ trimester, instructorId })` — filters by instructor
- `getRegistrations({ trimester, excludeWaitlist: true })` — excludes waitlist registrations
- `getClasses()`, `getAdmins()`, `getRooms()` — pass-through to repository

### 3. Manual Smoke Test (if staging available)

For each of the 8 tabs, compare response before and after:
1. Login as admin → Master Schedule tab, Registration tab, Wait List tab
2. Login as instructor → Directory tab, Weekly Schedule tab
3. Login as parent → Contact tab, Weekly Schedule tab, Registration tab

Response payloads should be identical.

### 4. Typecheck

```bash
npx tsc --noEmit
```

Must pass clean — the rewiring changes function signatures and imports.
