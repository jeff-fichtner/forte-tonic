# Implementation Plan: Frontend Tab Layer Cleanup

**Branch**: `010-frontend-tab-cleanup` | **Date**: 2026-02-27 | **Spec**: [spec.md](spec.md)

## Summary

Fix five structural problems in the frontend tab layer identified after the HttpResult migration: (1) `#getTrimester()` throws instead of returning a result in two admin tabs, causing unhandled promise rejections; (2) trimester-reading and selector-wiring logic is copy-pasted across three admin tabs; (3) directory sort/row-build logic is copy-pasted across two directory tabs; (4) debug `console.log` calls remain in production code; (5) `registrationHelpers.ts` is dead code. Additionally, add an initialization gate in `viewModel.ts` so that a failed `getAppConfiguration` call surfaces as a full-page error instead of silent continuation.

The approach: create `AdminBaseTab` as an intermediate class, create `directoryHelpers.ts` as a shared utility, update all affected tabs, strip debug logs, delete dead code, and add the config gate.

---

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022, browser environment
**Primary Dependencies**: MaterializeCSS 1.0.0 (CDN), Vite 7.x (build)
**Storage**: N/A — frontend only; API calls via `HttpService`
**Testing**: No frontend tests exist for the affected files; this cleanup does not introduce new tests
**Target Platform**: Browser (Chrome/Safari/Firefox)
**Project Type**: Web application (frontend layer only — all changes are in `src/web/js/`)
**Performance Goals**: No regressions — trimester selector wiring and directory rendering are not on any hot path
**Constraints**: Must not change observable behaviour; `console.warn` calls for data integrity issues must be preserved
**Scale/Scope**: 10 files modified, 2 files created, 1 file deleted

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | ✅ Pass | `AdminBaseTab` consolidates genuinely identical code. No speculative abstractions — the three admin tabs and two directory tabs are the complete set. |
| II. Data Consistency | ✅ Pass | `EmployeeDisplay` becomes the single canonical shape for directory rendering; removes the current dual-definition. |
| III. Single Serialization Path | ✅ Pass | No serialization changes — frontend only. |
| IV. Uniform API Responses | ✅ Pass | No API changes. `getTrimester()` returning `null` → `{ ok: false }` aligns with the existing `HttpResult` contract. |
| V. Single Data Fetch Pattern | ✅ Pass | All API calls remain through `HttpService`. |
| VI. No Dead Code | ✅ Pass | `registrationHelpers.ts` is deleted (never imported). Debug logs are removed. |
| VII. Shared Models Are the Contract | ✅ Pass | `EmployeeDisplay` is a frontend-only interface; it lives in `utilities/`, not `models/shared/`, which is correct since it is not a backend entity. |
| VIII. Role-Based Architecture | ✅ Pass | `AdminBaseTab` correctly groups admin-specific logic. No role boundary violations. |
| IX. Trimester-Aware by Default | ✅ Pass | `getTrimester()` consolidation ensures all three admin tabs read trimester identically. |
| X. Google Sheets Is the Database | ✅ Pass | No persistence changes. |
| XI. Uniform CRUD Backend | ✅ Pass | No backend changes. |

**Gate result: PASS — proceed to implementation.**

---

## Project Structure

### Documentation (this feature)

```text
specs/010-frontend-tab-cleanup/
├── plan.md              ← this file
├── research.md          ← not needed (no unknowns; see Phase 0 note)
├── data-model.md        ← not applicable (no backend entities, no API changes)
├── quickstart.md        ← not applicable (no new setup required)
├── contracts/           ← not applicable (no API changes)
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

**Phase 0 note**: No research was required. All design decisions are deterministic from reading the existing source files. The existing code patterns fully specify the implementation.

**Phase 1 note**: No `data-model.md` or `contracts/` are needed. This cleanup introduces no new API endpoints, no new backend entities, and no schema changes. The only "new shape" is `EmployeeDisplay`, which is a frontend-only rendering interface extracted from two existing files.

### Source Code (affected files)

```text
src/web/js/
├── core/
│   ├── baseTab.ts                          ← unchanged
│   └── adminBaseTab.ts                     ← CREATE (new)
├── tabs/
│   ├── adminMasterScheduleTab.ts           ← MODIFY (extend AdminBaseTab, remove #getTrimester, remove attachEventListeners, remove debug logs)
│   ├── adminWaitListTab.ts                 ← MODIFY (extend AdminBaseTab, remove #getTrimester, remove attachEventListeners)
│   ├── adminRegistrationTab.ts             ← MODIFY (extend AdminBaseTab, remove inlined trimester logic, remove attachEventListeners)
│   ├── employeeDirectoryTab.ts             ← MODIFY (import from directoryHelpers, remove local duplicates)
│   └── parentContactTab.ts                 ← MODIFY (import from directoryHelpers, remove local duplicates)
├── utilities/
│   ├── directoryHelpers.ts                 ← CREATE (new)
│   ├── domHelpers.ts                       ← MODIFY (remove debug console.log calls)
│   └── registrationHelpers.ts              ← DELETE (dead code)
├── components/
│   └── registrationForm/
│       └── parentPrivateSubmission.ts      ← MODIFY (remove debug console.log calls, add TODO comment)
└── viewModel.ts                            ← MODIFY (add config gate in initializeAsync)
```

---

## Design Decisions

### D1: `AdminBaseTab` placement and API

**File**: `src/web/js/core/adminBaseTab.ts`

```typescript
import { BaseTab } from './baseTab.js';
import type { SessionInfo } from './baseTab.js';
import type { HttpResult } from '../data/httpService.js';

export abstract class AdminBaseTab extends BaseTab {
  getTrimester(): string | null {
    const trimesterButtons = document.getElementById('admin-trimester-buttons');
    const activeButton = trimesterButtons?.querySelector<HTMLElement>('.trimester-btn.active');
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    return activeButton?.dataset.trimester || currentPeriod?.trimester || null;
  }

  attachEventListeners(): void {
    const trimesterButtons = document.getElementById('admin-trimester-buttons');
    if (trimesterButtons) {
      this.addEventListener(trimesterButtons, 'click', async (event: Event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('.trimester-btn');
        if (button) {
          trimesterButtons.querySelectorAll('.trimester-btn').forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          await this.reload();
        }
      });
    }
  }
}
```

**Key decisions**:
- `getTrimester()` is `public` (not `#private`) because `AdminMasterScheduleTab.#deleteRegistration` calls it and private fields cannot be called across the inheritance boundary via `this.`
- Returns `string | null` — callers check for null and return `{ ok: false }` from `fetchData`
- `attachEventListeners()` is not abstract — it provides a default implementation. Subclasses that need additional listeners call `super.attachEventListeners()` then add their own. (Currently, none of the three admin tabs need additional listeners beyond trimester wiring, so no overrides are needed.)
- `AdminRegistrationTab` stores the trimester in `this.currentTrimester` after calling `getTrimester()` — this pattern is preserved; the tab calls `this.getTrimester()` from `fetchData`, assigns to `this.currentTrimester`, then passes it to the form.

### D2: `directoryHelpers.ts` shape

The `EmployeeDisplay` interface and both functions are extracted verbatim from `employeeDirectoryTab.ts` (the canonical copy). `parentContactTab.ts` has an identical sort function and an identical row builder — confirmed by reading both files.

```typescript
// src/web/js/utilities/directoryHelpers.ts
export interface EmployeeDisplay {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role?: string;
  roles: string[];
  lastName?: string;
  firstName?: string;
}

export function sortEmployeesForDirectory(employees: EmployeeDisplay[]): EmployeeDisplay[] { ... }
export function buildDirectoryTableRow(employee: EmployeeDisplay): string { ... }
```

Both tabs retain their own `#mapAdminsToEmployees` and `#mapInstructorToEmployee` because:
- `EmployeeDirectoryTab` uses `admin.email` / `admin.phone` (internal contact fields)
- `ParentContactTab` uses `admin.displayEmail` / `admin.displayPhone` (public-facing fields)

### D3: `viewModel.ts` config gate

The existing `initializeAsync()` at line 98 sets `appConfig = configResult.ok ? configResult.data : null` and silently continues if null. The fix adds an explicit check immediately after:

```typescript
if (!appConfig) {
  this.#showConfigError();
  return;
}
```

`#showConfigError()` renders a full-page error in the page body (same target element that `#showMaintenanceMode` uses, to reuse the existing pattern).

### D4: `AdminMasterScheduleTab.#deleteRegistration` — private method calling `getTrimester()`

Currently `#deleteRegistration` calls `this.#getTrimester()`. After the change, `#getTrimester` is removed and `getTrimester()` (public, inherited) is called instead. The `#deleteRegistration` method remains private. This is the only cross-method concern.

### D5: `parentPrivateSubmission.ts` DOM fallback block

Lines 136–172 (the DOM fallback for `selectedLesson` being null) are preserved entirely. Debug logs within this block are removed. A single `// TODO` comment is added at the top of the `if (!selectedLesson)` block:

```typescript
// TODO: This DOM fallback compensates for selectedLesson being null when it should
// not be — likely a race condition or event handler not firing in the timeslot
// selection lifecycle. The root cause requires separate investigation (out of scope).
```

---

## Implementation Order

The tasks are independent and can be done in any order within a group. Dependencies are noted.

**Group A — Foundation (no dependencies)**
1. Create `src/web/js/core/adminBaseTab.ts`
2. Create `src/web/js/utilities/directoryHelpers.ts`

**Group B — Admin tabs (depends on A.1)**
3. Update `adminMasterScheduleTab.ts` — extend `AdminBaseTab`, remove `#getTrimester`, remove `attachEventListeners`, remove debug logs in `render()` and `#excludeRockBandClasses()`
4. Update `adminWaitListTab.ts` — extend `AdminBaseTab`, remove `#getTrimester`, remove `attachEventListeners`
5. Update `adminRegistrationTab.ts` — extend `AdminBaseTab`, remove inlined trimester block, remove `attachEventListeners`

**Group C — Directory tabs (depends on A.2)**
6. Update `employeeDirectoryTab.ts` — import from `directoryHelpers`, remove local `EmployeeDisplay`, `#sortEmployeesForDirectory`, `#buildTableRow`
7. Update `parentContactTab.ts` — import from `directoryHelpers`, remove local duplicates

**Group D — Independent cleanup (no dependencies)**
8. Update `domHelpers.ts` — remove all `console.log`/`console.warn` from `resetMaterializeSelect`; preserve the "element not found" warn
9. Update `parentPrivateSubmission.ts` — remove debug logs, add TODO comment
10. Update `viewModel.ts` — add config gate after `appConfig` is assigned
11. Delete `src/web/js/utilities/registrationHelpers.ts`

---

## Verification Checklist

After implementation, verify:

- [ ] TypeScript compiles without errors (`npm run build` or `npx tsc --noEmit`)
- [ ] No `console.log` in: `adminMasterScheduleTab.ts`, `domHelpers.ts`, `parentPrivateSubmission.ts`
- [ ] `console.warn` for orphaned records/missing students preserved in `adminMasterScheduleTab.ts` and `adminWaitListTab.ts`
- [ ] `getTrimester()` exists only in `adminBaseTab.ts` — grep for `getTrimester` confirms
- [ ] `sortEmployeesForDirectory` and `buildDirectoryTableRow` exist only in `directoryHelpers.ts` — grep confirms
- [ ] `registrationHelpers.ts` deleted — no file at that path, no imports of it
- [ ] All three admin tabs extend `AdminBaseTab` (not `BaseTab` directly)
- [ ] Both directory tabs import `EmployeeDisplay`, `sortEmployeesForDirectory`, `buildDirectoryTableRow` from `directoryHelpers.ts`
- [ ] `viewModel.ts` returns early with a visible page-body error when `appConfig` is null
