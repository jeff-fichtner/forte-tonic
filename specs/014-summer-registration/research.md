# Phase 0 Research: Summer Registration

**Branch**: `014-summer-registration` | **Date**: 2026-05-27

This document resolves the open research items for the 014 implementation
plan. The spec is heavily clarified (5 clarifications recorded), so
research focuses on three pragmatic questions that affect the
implementation approach: (1) where hardcoded period display strings
live in the frontend (for FR-005's all-at-once migration), (2) every
caller of the student-fetch chain (for FR-003's required-`period`
enforcement), and (3) how the periods table actually represents the
"current → next" trimester relationship in code (for FR-001's
`[currentTrimester, nextTrimester]` extension).

---

## Decision 1: Sheet creation goes through the 013 migration system

**Decision:** Extend `MigrationContext` with a `createSheet(name,
columns)` primitive and write a numbered 014 migration that creates
`registrations_summer` and `registrations_summer_audit` at app startup.

**Rationale:** Clarification Q1 (2026-05-27) makes this explicit. The
013 auto-migration system is the project's chosen runtime mechanism for
schema evolution. GAS is reserved for manual ops (the turnover script).
The current `MigrationContext` only supports column-level operations on
existing sheets — adding `createSheet` is the smallest extension that
fits the existing pattern.

**Alternatives considered:**
- **GAS sheet-creation migration (modeled after archived REEN005).**
  Rejected per Q1 — GAS is being phased out for non-manual work.
- **Auto-create on first read.** Rejected. Would couple the data layer
  to spreadsheet mutation, making behavior implicit and per-environment.

---

## Decision 2: Add `'summer'` to the existing `Trimester` enum and `TRIMESTER_SEQUENCE`

**Decision:** Update [src/utils/values/trimester.ts](../../src/utils/values/trimester.ts)
to include `SUMMER: 'summer'`. `isValidTrimester()` and
`TRIMESTER_SEQUENCE` will automatically pick up the new value because
they are derived from the `Trimester` object.

**Rationale:** The enum is the canonical list of valid trimester
values. The existing validator and sequence are computed from it. One
edit, propagation to all consumers via existing derivation.

**Alternatives considered:**
- **Add `summer` as a special case outside the enum.** Rejected —
  contradicts FR-004 (all four periods behaviorally identical) and
  Principle II (data consistency, one canonical shape).

**Sequence implications:** `TRIMESTER_SEQUENCE` becomes
`['fall', 'winter', 'spring', 'summer']`. The
`getNextTrimesterInSequence()` method in `PeriodService` already does
modulo-arithmetic on the sequence, so adding `summer` automatically
gives `spring → summer → fall` cycling. Verify in tests but no code
change beyond the enum is needed for sequence resolution.

---

## Decision 3: Add `'summer'` to the `trimesters` array in the dbClient

**Decision:** Update [src/database/googleSheetsDbClient.ts:220](../../src/database/googleSheetsDbClient.ts#L220)
from `['fall', 'winter', 'spring']` to `['fall', 'winter', 'spring', 'summer']`.
This is the single source for per-trimester sheet config generation
(lines 271-287).

**Rationale:** FR-002 + verification in the spec's pre-research
exploration. The array auto-generates sheet configs for both
`registrations_${t}` and `registrations_${t}_audit` from a single
source. No other location enumerates trimester sheet names.

**Alternatives considered:** None — this is the project's chosen
convention.

---

## Decision 4: FR-003 enforcement requires updating 14+ callers

**Decision:** The student-fetch chain currently has these entry points
that must be updated to pass `period` (and `getStudents` itself must
throw on missing `period`):

| # | File | Line | Method / context |
|---|------|------|------------------|
| 1 | [userRepository.ts](../../src/repositories/userRepository.ts) | 101 | `getStudents()` — base method (`this.fetchAll(Keys.STUDENTS, ...)`) |
| 2 | [userRepository.ts](../../src/repositories/userRepository.ts) | 135 | `getStudentById()` — derivative |
| 3 | [entityQueryService.ts](../../src/services/entityQueryService.ts) | 46 | `getStudents(filters)` wrapper |
| 4 | [userController.ts](../../src/controllers/userController.ts) | 302 | `getParentContactTabData()` |
| 5 | [registrationController.ts](../../src/controllers/registrationController.ts) | 279 | `getAdminWaitListTabData()` |
| 6 | [registrationController.ts](../../src/controllers/registrationController.ts) | 350 | `getInstructorWeeklyScheduleTabData()` |
| 7 | [registrationController.ts](../../src/controllers/registrationController.ts) | 408 | `getParentWeeklyScheduleTabData()` |
| 8 | [registrationController.ts](../../src/controllers/registrationController.ts) | 466 | `getAdminMasterScheduleTabData()` |
| 9 | [registrationController.ts](../../src/controllers/registrationController.ts) | 520 | `getParentRegistrationTabData()` |
| 10 | [registrationController.ts](../../src/controllers/registrationController.ts) | 582 | `getAdminRegistrationTabData()` |
| 11 | [registrationService.ts](../../src/services/registrationService.ts) | 216 | `processRegistration()` (via `getStudentById`) |
| 12 | [registrationService.ts](../../src/services/registrationService.ts) | 430 | `getRegistrations()` |
| 13 | [dropRequestService.ts](../../src/services/dropRequestService.ts) | 99 | `createDropRequest()` (via `getStudentById`) |
| 14 | [dropRequestService.ts](../../src/services/dropRequestService.ts) | 284 | `getPendingDropRequests()` |

**Rationale:** FR-003 mandates a required `period` parameter at the
lowest layer (`userRepository.getStudents`) with no silent default.
Clarification Q5 (2026-05-27) confirms missing values throw at the
entry point. Every caller above must therefore source a `period` value
from either (a) a request param, (b) the period service, or (c) an
explicit caller-supplied value depending on context. Most controllers
already have a `trimester` value available from the request (they're
trimester-aware endpoints); they just need to pass it through.

**Where does `period` come from for each caller?**
- **Tab endpoints** (entries 4–10): the controller already accepts a
  `:trimester` route param or has access to `currentTrimester` via the
  app config — pass that.
- **Service entries** (entries 11–14): the service is being called from
  a controller that already has trimester context — propagate it down
  the call.
- **Base method** (entry 1): the parameter becomes required in the
  method signature.

**Alternatives considered:**
- **TypeScript type system only (no runtime throw).** Rejected per
  Q5 — runtime safety catches forgotten callers during integration
  tests, not just compile time.
- **Default to current trimester via periodService.** Rejected per Q5
  — silent defaults mask bugs.

---

## Decision 5: FR-005 all-at-once migration touches 6 known sites

**Decision:** Introduce a frontend period-to-label helper (likely at
`src/web/js/utilities/periodDisplayName.ts`), then convert all
hardcoded period display strings in the same PR.

**Identified sites** (exhaustive, from frontend exploration):

| # | File | Line(s) | Current code | Notes |
|---|------|---------|--------------|-------|
| 1 | [parentWeeklyScheduleTab.ts](../../src/web/js/tabs/parentWeeklyScheduleTab.ts) | 183-184 | `${capitalizedName} Trimester Schedule` heading | Dynamic capitalization via charAt |
| 2 | [parentWeeklyScheduleTab.ts](../../src/web/js/tabs/parentWeeklyScheduleTab.ts) | 237, 240 | `No scheduled lessons for ${capitalizedName} trimester` | Same pattern |
| 3 | [navTabs.ts](../../src/web/js/components/navTabs.ts) | 395 | `trimester.charAt(0).toUpperCase() + trimester.slice(1)` button label (enrollment) | |
| 4 | [navTabs.ts](../../src/web/js/components/navTabs.ts) | 437 | Same as #3 (non-enrollment branch) | |
| 5 | [parentPrivateSubmission.ts](../../src/web/js/components/registrationForm/parentPrivateSubmission.ts) | 301 | Hardcoded `"Fall Trimester"` in cancellation policy text | Must be parameterized by active period |
| 6 | [parentGroupRegistration.ts](../../src/web/js/components/registrationForm/parentGroupRegistration.ts) | 574 | Hardcoded `"Fall Trimester"` in cancellation policy text | Same |

**Helper signature (proposed):**

```ts
export function periodDisplayName(period: string): string;
// 'fall' → 'Fall', 'winter' → 'Winter', 'spring' → 'Spring', 'summer' → 'Next Fall'
```

**Location:** New file at
`src/web/js/utilities/periodDisplayName.ts`. The
`src/web/js/utilities/` directory already contains `trimesterHelpers.ts`
(trimester business logic) and `periodHelpers.ts` (period type checks);
a third utility file is added for single-responsibility — display-name
mapping is a presentation concern, distinct from the business-logic
helpers. The alternative (folding the function into `trimesterHelpers.ts`)
was considered and rejected on the same grounds: keeping presentation
separate from business logic makes the SC-005 grep-audit easier (one
file is the canonical home of period display strings) and avoids
growing `trimesterHelpers.ts` into a grab-bag.

**Rationale:** FR-005 + Q4 clarification. Centralized mapping; one
swap-in across all 6 sites; SC-005 grep-verifiable as a single state.

**Alternatives considered:**
- **Fold into `trimesterHelpers.ts`.** Rejected — see Location note;
  presentation should be separated from business logic.
- **Pass display label from backend.** Rejected — the constitution
  prefers frontend-only display concerns (no API payload shape change),
  and FR-005 explicitly scopes this to the frontend.
- **Library-based i18n.** Rejected — overkill for 4 strings.

---

## Decision 6: Periods table uses derivation, not a stored `targetTrimester`

**Decision:** For Part 1 (014), use the existing `period.trimester`
field as the registration target. The periods table schema
(`PERIOD_COLUMNS = ['trimester', 'periodType', 'startDate']`) does not
include a separate write-target column; the target sheet is derived
at runtime by
[`PeriodService.getEnrollmentTrimesterTable()`](../../src/services/periodService.ts#L161)
from those three fields. No schema change to the periods table is
required for 014.

**Rationale:** The runtime derivation handles every case 014 needs:
- During a `summer` enrollment period (held during spring): the
  period row has `trimester=spring, periodType=priorityEnrollment`
  (or `openEnrollment`); `getEnrollmentTrimesterTable()` returns
  `registrations_${getNextTrimesterInSequence('spring')}` =
  `registrations_summer`.
- During the `summer` registration period (active summer instruction):
  the period row has `trimester=summer, periodType=registration`;
  `getEnrollmentTrimesterTable()` returns `registrations_summer` via
  the current-trimester branch.

Both cases resolve correctly without any new field. (Constitution
2.3.0 — amended during this planning phase — describes this exact
derivation, replacing an earlier reference to a `targetTrimester`
column that did not actually exist.)

**Alternatives considered:**
- **Add a `targetTrimester` column to the periods table in 014.**
  Rejected — derivation handles every Part 1 case. If Part 2's August
  rollover migration ([021-school-year-rollover](../021-school-year-rollover/spec.md))
  ever needs an arbitrary write-target (e.g., a period that lives in
  spring but writes directly to next year's fall, skipping summer
  entirely), that's a 021 scope decision, not a 014 task.

---

## Decision 7: Reuse existing `GAS Migration_REEN006_ChangeTrimester.js`

**Decision:** Extend the existing GAS turnover script's
`_getSourceTrimester()` switch to support `summer`:

```js
_getSourceTrimester() {
  if (this.TARGET_TRIMESTER === 'winter') return 'fall';
  if (this.TARGET_TRIMESTER === 'spring') return 'winter';
  if (this.TARGET_TRIMESTER === 'summer') return 'spring';  // NEW
  throw new Error(`Invalid TARGET_TRIMESTER: ${this.TARGET_TRIMESTER}`);
}
```

**Rationale:** FR-008. Single targeted change; all other turnover
mechanics already work generically.

**Alternatives considered:**
- **Rewrite as a 013 auto-migration.** Rejected — Q1 clarification
  scopes 013 to schema/structural changes; the turnover is a manual
  data operation that admins run during the school year. Keeping it in
  GAS is intentional.

---

## Decision 8: Empty-state message visual treatment

**Decision:** Plain centered text in the Registration tab's content
area, sourced from the existing dead `STUDENT_EMPTY` constant.

**Rationale:** Clarification Q2 (2026-05-27). Simplest possible
implementation. The constant exists at
[registrationFormConstants.ts:10](../../src/web/js/constants/registrationFormConstants.ts#L10)
but is never used today — this work wires it up.

**Implementation note:** The current behavior at
[parentRegistrationForm.ts:256-260](../../src/web/js/workflows/parentRegistrationForm.ts#L256-L260)
is `studentSection.style.display = 'none'` plus
`#hideAllRegistrationContainers()`. The change: instead of hiding
everything, render a centered text node with the constant value.

**Alternatives considered:**
- Material card-panel, icon + message. Rejected per Q2.

---

## Decision 9: Period heading is always rendered

**Decision:** The FR-006 period heading appears whenever the
Registration tab renders a form — which is always, because the form
falls back to the current trimester when no enrollment period is active.

**Rationale:** Clarification Q3 (2026-05-27) confirmed by code at
[parentRegistrationTab.ts:92-103](../../src/web/js/tabs/parentRegistrationTab.ts#L92-L103).
The fallback path keeps the form rendered with current-trimester data
when `ctx.nextTrimester` is null/undefined.

---

## Open items intentionally deferred

The following items are NOT resolved here; they belong to planning
phase or later:

- **Exact UI styling specifics** (font size, margin) for the period
  heading — left to implementation discretion; "same component, same
  placement, same styling" across all four periods is the constraint
  (FR-006).
- **API contract change shape** — covered in `contracts/` (Phase 1).
- **Test file naming and structure** — covered in tasks.md (Phase 2).

---

## Summary

All NEEDS CLARIFICATION items from Technical Context are resolved.
Spec is fully clarified (5 clarifications + 9 FRs + 6 SCs). Codebase
exploration confirmed the implementation touch points. Constitutional
drift identified during planning (the `targetTrimester` claim) was
fixed in constitution version 2.3.0 alongside other documentation
updates; FR-009 captures the remaining doc-sync task (three trimesters →
four) that ships with the 014 implementation. Phase 1 (data-model,
contracts, quickstart) can proceed.
