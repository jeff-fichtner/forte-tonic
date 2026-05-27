# Feature Specification: Summer Registration

**Feature Branch**: `014-summer-registration`
**Created**: 2026-05-27
**Status**: Draft
**Part of**: School-year rollover initiative (Parts 1-3)
**Next**: Part 2 — [015-school-year-rollover](../015-school-year-rollover/spec.md)

> **Naming note.** Internally — in code, in the spreadsheet (`registrations_summer`),
> in API payloads, in logs — this period is called `summer`. **In any UI
> label a parent or admin sees on the website**, it is displayed as
> "Next Fall." A single UI-side translation helper handles this: pass in the
> period value, get back the display string. All four periods route through
> the same helper, so the rendering rule is uniform; only `summer`'s mapping
> differs from its identifier. Backend-generated artifacts (reports, audit
> logs, exported data) are not covered — if they print raw `summer` it is
> acceptable. No such backend-generated artifacts exist today.
>
> **Forward note.** This spec treats `summer` as a stable fourth trimester
> for the duration of this school year. The `summer` period itself persists
> as a recurring fourth-trimester registration window in subsequent years —
> what changes in Part 2 ([015-school-year-rollover](../015-school-year-rollover/spec.md))
> is the data: rows in `registrations_summer` get migrated into the next
> year's `registrations_fall` and stop being "next year's" registrations
> at that point.

## Overview

Add a fourth registration period — `summer` — and reshape the system so all
four trimester periods (`fall`, `winter`, `spring`, `summer`) behave
**identically to each other** by the end of this work. Today, the existing
three periods share most behavior but the students endpoint is
period-agnostic (one list shared across every period view). After this
work, every trimester period follows the same per-period pattern: the
students endpoint accepts a required `period` parameter, and every caller
passes it.

The system already has per-trimester registration sheets (`registrations_fall`,
`registrations_winter`, `registrations_spring`); `registrations_summer` is the
fourth, structurally identical, generated from the same shared column schema.

The **single functional difference** between `summer` and the other three
periods: when the students endpoint is called with `period=summer`, the
backend returns each student with `grade` incremented by 1, so
grade-eligibility filtering reflects next year's grade. For fall/winter/spring
the returned list is unchanged in content — same students, same grades — but
the endpoint contract is now parameterized. The contract change is invisible
to parents: a parent registering for winter sees the same students with the
same grades they always did.

Everything else — the registration form, conflict detection, period
gating via configured open/close dates, availability computation, parent
and admin permissions — is unchanged. **Parents cannot edit registrations
in place; no PATCH/PUT endpoint is exposed to them.** What parents *can*
do today, and continue to be able to do for `summer`, is two things:
(a) create brand-new registrations, and (b) replace a carried-forward
registration *once* — by selecting it from the modify selector and
submitting a new registration that points to the old one via
`replaceRegistrationId`, which causes the backend to delete the old row
and write the new one. This is a one-shot path that only works for
registrations created by the turnover script (i.e., those with
`linkedPreviousRegistrationId` set). Dropping registrations remains
admin-only across all four periods. Nothing about *who* can do *what*
changes.

Two small display additions affect all four periods: (1) the
Registration tab gains a period heading inside its content,
identifying which trimester the form targets (FR-006) — for `summer`
the heading reads "Next Fall"; and (2) when no students are available
to register, the Registration tab shows a visible empty-state message
(FR-007) instead of silently hiding the form as it does today. Both
additions are uniform across all four periods.

## User Scenarios & Testing *(mandatory)*

> **Terminology in this section.** "Summer" refers to the period's internal
> identifier (the value of the `period` field, the sheet name, etc.). The
> top-level tabs in the parent UI ("Weekly Schedule," "Registration,"
> "Contact Us") do not change — they are always present. What changes when
> the `summer` period is the active enrollment period is the *content* of
> the Registration tab: the form inside it targets the `summer` period and
> shows a period heading inside the tab via the display-name helper
> (FR-005). For `summer`, that heading reads "Next Fall." The period
> heading is a new uniform addition to the Registration tab — see FR-006.
> Acceptance tests targeting the period heading in the rendered UI MUST
> select by the display string ("Next Fall"), not by the raw identifier.

### User Story 1 — Register for the `summer` period (Priority: P1)

When the `summer` period is the active enrollment period, a parent opens
the existing Registration tab and registers their child for a lesson.
The form inside the tab is scoped to the `summer` period, with a period
heading reading "Next Fall." The flow is the one they already know from
fall, winter, and spring registration.

**Why this priority:** This is the core capability. If a parent can register
under the `summer` period exactly as they would under any other period —
and the data lands in `registrations_summer` with the grade-bump logic
working correctly — Part 1 is functionally complete.

**Independent Test:** With the `summer` period active, open the
Registration tab, verify the period heading reads "Next Fall," complete
the standard registration form for a lesson, and verify a row appears
in `registrations_summer`. The grade bump is *not* stored on the row —
grade is not a column on registration sheets; verify instead that the
student dropdown / display in the form showed the bumped grade while
the parent was filling it out.

**Acceptance Scenarios:**

1. **Given** the `summer` period is open and a parent has a student
   stored at grade 5, **When** the parent opens the Registration tab
   (which shows the period heading "Next Fall" above the standard
   registration form) and completes the form for a Piano lesson,
   **Then** a row is written to `registrations_summer` referencing the
   student, and the form had shown the student as grade 6 (the bumped
   value) during selection. The bumped grade is not persisted anywhere
   — it is only a runtime display/filter value served by the backend
   for the `summer` period.
2. **Given** a parent has multiple students, **When** they register one
   student for the `summer` period and not the others, **Then** only the
   registered student has a row in `registrations_summer`. The other
   students' presence in the current trimester does not auto-create
   `summer` registrations.
3. **Given** a parent registers a student for a `summer` slot that conflicts
   with another `summer` registration, **When** they submit, **Then** the
   conflict is detected via the same rules used for fall/winter/spring and
   the registration is rejected.

---

### User Story 2 — Replace a carried-forward `summer` registration (Priority: P2)

A parent who has a `summer` registration that was **carried forward from
spring by the turnover script** (i.e., its `linkedPreviousRegistrationId`
field is set) wants to change it for next year. They cannot edit it in
place — parents do not have an update endpoint. Instead, they select the
existing registration from the modify selector, fill out the standard
registration form with the new details, and submit. The backend deletes
the old `summer` row (sets `IsDeleted=true` in the audit sheet) and
creates a new `summer` row with the new details and no
`linkedPreviousRegistrationId`. The parent cannot replace that new row
again, because the modify selector only shows registrations that have
`linkedPreviousRegistrationId` set.

**Why this priority:** This is the same flow that already works for
winter→spring carryovers — we are not building it for 014. The story
exists to make the parent-facing constraints explicit: the only
"modify" path available is one-shot replace-via-create, and it applies
only to lessons that exist because the turnover script copied them
forward (not to brand-new `summer` registrations a parent added).

**Independent Test:** Run the turnover script for `spring → summer`,
producing a `registrations_summer` row with `linkedPreviousRegistrationId`
set. As a parent, open the Registration tab during the `summer` enrollment
window, select that registration in the modify selector, submit a new
registration with different details, and verify: the original
`registrations_summer` row is marked deleted; a new `registrations_summer`
row exists with the new details and no `linkedPreviousRegistrationId`;
the modify selector no longer shows that lesson.

**Acceptance Scenarios:**

1. **Given** a parent has a `summer` registration with
   `linkedPreviousRegistrationId` set (created by the turnover script),
   **When** they select it from the modify selector and submit a new
   registration with changed details, **Then** the old row in
   `registrations_summer` is marked deleted, a new row is created with
   the new details and no `linkedPreviousRegistrationId`, and the
   availability computation for the new registration excludes the old
   one via the `excludeRegistrationId` mechanism (per
   [012-server-side-availability](../012-server-side-availability/spec.md)).
2. **Given** a parent has replaced a carried-forward registration
   once (so the new row has no `linkedPreviousRegistrationId`),
   **When** they reopen the Registration tab, **Then** the modify
   selector does not show that lesson. The parent has no UI path to
   change it again. (Admins can still modify or drop on the parent's
   behalf.)
3. **Given** a parent has a brand-new `summer` registration they
   created themselves (no `linkedPreviousRegistrationId`), **When**
   they reopen the Registration tab, **Then** the modify selector
   does not show that lesson. Brand-new parent-created registrations
   are not modifiable by parents — same as today's other trimesters.

---

### Edge Cases

- **Grade advancement.** The system models grade, not age or birthday.
  The grade bump is a flat +1 from each student's currently-stored grade,
  applied to everyone — the system does not model students being held
  back. If a held-back case needs to be handled in the future, that's a
  separate decision; for now every student advances one grade.
- **A student is in the school's top grade.** The school's highest
  grade is 8. An 8th-grade student would bump to 9, but they would not
  be returned to a parent in `summer`-period requests (they aren't
  continuing at this school), so no row gets written. This is enforced
  by the existing student-eligibility filter; the grade-bump transform
  doesn't change which students are eligible to be returned. A parent
  whose only child is in 8th grade will see the empty-state message
  in the Registration tab during the `summer` period (see FR-007).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001:** The system MUST support `summer` as a registration period value
  alongside the existing `fall`, `winter`, `spring` values, following the
  same period-config conventions (admin-configurable open/close dates). The
  existing mechanism that returns `[currentTrimester, nextTrimester]` during
  enrollment periods MUST accept `summer` as a valid `nextTrimester` value
  when spring is the current trimester and the `summer` enrollment period
  has opened — exactly as it already accepts winter as next during fall and
  spring as next during winter.
- **FR-002:** Two new sheets MUST exist, following the same paired
  convention as the other per-trimester periods: `registrations_summer`
  (the registration data) and `registrations_summer_audit` (the audit
  trail). Both share the same column schema as their fall / winter /
  spring counterparts, generated from the existing shared schemas
  (`Registration.columns` and `Registration.auditColumns`). **Sheet
  creation** follows the established pattern in this codebase:
  a new Google Apps Script migration (modeled after the archived
  [Migration_REEN005_CreateTrimesterTables.js](../../gas/src/mig/archive/Migration_REEN005_CreateTrimesterTables.js)
  that originally created the fall/winter/spring sheets) manually
  creates `registrations_summer` and `registrations_summer_audit` with
  the same column structure. The 013-style runtime migration system is
  not used for creating new sheets — its `MigrationContext` only
  supports column-level changes on existing sheets. **Code-side
  registration** of the new sheets happens via the `trimesters` array
  constant in
  [src/database/googleSheetsDbClient.ts](../../src/database/googleSheetsDbClient.ts):
  adding `'summer'` to that array is what surfaces both sheets
  (registration + audit) to the rest of the data layer. No other
  location enumerates trimester-specific sheet names.
- **FR-003:** The base student-fetch operation (`getStudents` and its
  underlying repository call) MUST require a `period` parameter — not
  optional, not summer-only. **Every caller** of the student-fetch chain
  MUST pass `period`, including derivative or filtered calls (e.g.,
  "students for this parent," "students with these IDs," etc.). No call
  path may resolve to a student fetch without specifying a period. When
  `period=summer`, the backend MUST return each student with `grade`
  incremented by 1. **This bump is purely a runtime transform on the
  served response** — it is NOT written back to the `students` sheet,
  NOT stored on `registrations_summer` rows (which don't have a grade
  column), and NOT recorded anywhere persistent. The next summer the
  same logic runs again against the (unchanged) stored grade. For all
  other periods, the returned list MUST be identical in content to
  today's behavior — same students, unchanged grades. The frontend is
  responsible for fetching students per the active period, even when
  this means duplicate fetches across views that differ only by
  grade-bump for `summer`; accepting that duplication is an intentional
  tradeoff to keep the grade-bump logic entirely on the backend.
  **The grade-bump transform is the only observable behavior unique to
  the `summer` period.**
- **FR-004:** After this work, all four trimester periods MUST be
  *behaviorally* identical to each other. "Behavior" here means: what
  actions a parent or admin can take, how the system computes availability
  and conflicts, what data is read or written, what permissions apply.
  The only behavioral exception is the grade-bump transform on the students
  endpoint for `summer` (FR-003). Display strings (period labels, UI text)
  are not covered by this requirement — those are governed by FR-005. No
  `summer`-specific UI flow, action set, or permission model is introduced;
  conversely, no per-period special-casing for the existing three periods
  is introduced either. If a behavior exists for one period, it exists for
  all four.
- **FR-005:** The frontend MUST provide a single period-to-label translation
  helper. Every UI surface that displays a period MUST route through this
  helper — period selectors, period headings (FR-006), schedule section
  labels, confirmation messages, error messages, breadcrumbs, page titles.
  No UI may hardcode a period string. (Note: the parent dashboard's
  top-level tabs are "Weekly Schedule," "Registration," and "Contact Us"
  — they do not include the period name, so they are not affected by this
  rule.) All four periods are routed through the same helper for
  uniformity, even though only `summer` has a non-identity mapping today
  (`fall → "Fall"`, `winter → "Winter"`, `spring → "Spring"`,
  `summer → "Next Fall"`). The rule applies to both parent-facing and
  admin-facing website UI. Backend-generated text (reports, audit log
  exports, log lines, raw API payload values) is **out of scope** — those
  may continue to use the `summer` identifier directly, and none exist
  today that surface the raw identifier to end users.
- **FR-006:** The Registration tab MUST display a period heading inside
  its content, identifying which trimester the registration form targets.
  The heading MUST be present for **all four** trimester periods (not
  just `summer`) — same component, same placement, same styling — so the
  Registration tab uniformly tells parents which period they're
  registering for. The heading text MUST come from the display-name
  helper (FR-005): "Fall," "Winter," "Spring," or "Next Fall." During
  enrollment overlap windows where the Registration tab is scoped to
  the next trimester (e.g., spring is current but the Registration tab
  is enrolling into `summer`), the heading reflects the trimester the
  form is enrolling into — there is no need for a "current vs. next"
  toggle because the Registration tab only edits one trimester at a
  time (consistent with today's behavior).
- **FR-007:** When the student-fetch returns an empty list for the
  active period (e.g., a parent's only child is in 8th grade and the
  active period is `summer`, so no students are returned), the
  Registration tab MUST display a visible empty-state message — same
  message, same placement, same styling — for **all four** trimester
  periods. Today the Registration tab silently hides the form when no
  students are returned; that silent-hide behavior is replaced by an
  explicit empty-state message. The message text is period-agnostic
  (e.g., "No students available for registration") and is NOT routed
  through the display-name helper. The dead constant `STUDENT_EMPTY`
  in [src/web/js/constants/registrationFormConstants.ts](../../src/web/js/constants/registrationFormConstants.ts)
  is the natural home for this string; the empty-state UI hooks into
  it where today no rendering occurs.
- **FR-008:** The existing Google Apps Script turnover migration
  ([gas/src/mig/recurring/Migration_REEN006_ChangeTrimester.js](../../gas/src/mig/recurring/Migration_REEN006_ChangeTrimester.js))
  MUST be extended to support `spring → summer` as a valid
  source/target pair, in addition to the existing `fall → winter` and
  `winter → spring`. Specifically: `_getSourceTrimester()` MUST return
  `'spring'` when `TARGET_TRIMESTER === 'summer'`; all other turnover
  semantics (intent filtering — copy `keep`/`change`/blank, skip
  `drop` — UUID regeneration, `linkedPreviousRegistrationId` linking,
  clearing of intent columns, audit-record creation, working-copy /
  apply two-phase pattern) MUST work identically for the new pair.
  No other behavior change in this script. The script remains
  manually-run by admins from the GAS editor; this 014 work does not
  change *when* or *how* it's invoked.

### Key Entities

- **`registrations_summer` sheet** — same column structure as
  `registrations_fall` / `_winter` / `_spring`. No new schema concepts.
- **`registrations_summer_audit` sheet** — paired audit sheet for
  `registrations_summer`, same column structure as the other
  `registrations_*_audit` sheets. Created at the same time as
  `registrations_summer` in the same GAS sheet-creation migration
  (see FR-002).
- **Turnover script (GAS, manually run)** —
  [Migration_REEN006_ChangeTrimester.js](../../gas/src/mig/recurring/Migration_REEN006_ChangeTrimester.js).
  Today supports `fall → winter` and `winter → spring`. This work
  extends it to also support `spring → summer`. The script is the
  copy-forward mechanism that materializes the next trimester's
  registrations based on parents' intent declarations from the
  previous trimester; not part of the running app.
- **Parent modify-via-replace flow** — the existing parent-side
  mechanism for changing a carried-forward registration. The parent
  selects a registration in the modify selector (a dropdown that
  appears only during enrollment periods, populated exclusively from
  next-trimester registrations whose `linkedPreviousRegistrationId`
  is set) and submits a new registration with `replaceRegistrationId`
  pointing to the selected row. The backend deletes the selected row
  (`IsDeleted=true` in the audit sheet) and creates the new row.
  Because the new row does NOT have `linkedPreviousRegistrationId`
  set, it cannot appear in the modify selector again — making this
  effectively a one-shot replace per carried-forward registration.
  **This is the *only* way parents can change a registration**;
  in-place edit endpoints do not exist for parents. Existing
  behavior — 014 inherits it as-is for the `summer` period.
- **Registration period config** — extended to include `summer` with its
  own open/close dates.
- **Period display-name helper (frontend)** — a single UI-side function that
  maps a period identifier to its display label. Mapping today: `fall →
  "Fall"`, `winter → "Winter"`, `spring → "Spring"`, `summer → "Next Fall"`.
  This is the single source of truth for any UI rendering of a period; no
  UI surface may hardcode the period name. Used uniformly for both parents
  and admins. Does not apply to backend artifacts — those may keep using
  raw period identifiers.
- **Registration tab period heading** — a new heading inside the
  Registration tab's content, identifying which trimester the form
  targets. Present for all four periods. Text comes from the
  display-name helper. Adding this affects fall, winter, and spring as
  well as `summer`: today no such heading exists, and after this work
  all four periods show one.
- **Registration tab empty-state message** — a new visible message
  shown in the Registration tab when no students are available for
  the active period. Replaces today's silent-hide behavior. Period-
  agnostic text (e.g., "No students available for registration");
  applies uniformly to all four periods. Sources the text from the
  existing-but-unused `STUDENT_EMPTY` constant.
- **Student** — no schema change. Grade is bumped on the fly by the
  backend when serving summer-period requests. The bumped value is
  never written back; the stored `grade` field is untouched.
- **Student-fetch path (endpoint + service + repository)** — `period` becomes
  a required parameter at the lowest layer (`getStudents`) and propagates up
  through every caller, including derivative/filtered helpers ("students for
  this parent," "students with these IDs"). Today the path is period-agnostic
  (single fetch, single list shared across every period view); after this
  change it follows the same parameterized pattern as the registrations
  path. For fall/winter/spring the returned list is unchanged from today;
  for `summer` it applies the grade-bump transform.

## Out of Scope

- **Any new registration concept.** The `summer` period is just another
  trimester period. No new actions, no new permission model, no new sheet
  schema. If a feature doesn't exist for winter or spring, it isn't being
  added here.
- **Per-trimester class sheets.** Classes are used as-is from the single
  existing sheet during summer. A future spec may split classes per-trimester.
- **Any new parent edit capability.** Parents continue to have only
  two operations: create new registrations, and replace a single
  carried-forward registration via the existing
  `replaceRegistrationId` flow. No PATCH/PUT endpoint is being added.
  No "edit my registration" UI is being added. The constraint that
  only carried-forward registrations (those with
  `linkedPreviousRegistrationId` set) appear in the modify selector
  is inherited as-is.
- **The August migration itself.** Part 2 ([015-school-year-rollover](../015-school-year-rollover/spec.md))
  handles copying `registrations_summer` into the next year's
  `registrations_fall` sheet and re-pairing with students at their new grades.
- **Intent phase changes.** Part 3 ([016-intent-phase-reduction](../016-intent-phase-reduction/spec.md)).
  (014 *does* extend the existing turnover script to handle
  `spring → summer`, but it does not change *how* intent works or
  *whether* the intent phase is invoked — only adds the new pair to
  an existing mechanism.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001:** A parent can complete a `summer` registration using the same
  UI flow they use for fall/winter/spring — no `summer`-specific UI
  affordances exist. (The "Next Fall" display label, per FR-005, is a
  labeling difference, not a flow difference.)
- **SC-002:** Grade-eligibility filtering for `summer` uses next-year grades.
  Verified by integration test: given an instructor whose grade range
  includes grade 6 but excludes grade 5, a student stored at grade 5 sees
  that instructor as eligible during `summer` (grade-bump applied), but
  does NOT see them during fall/winter/spring (no bump applied).
  Conversely, given an instructor whose range includes grade 5 but excludes
  grade 6, the student does NOT see that instructor during `summer` but
  does see them during the other three periods.
- **SC-003:** User-observable *behavior* for fall/winter/spring is
  unchanged. Parents and admins see the same students, same grades,
  same flow on those three periods as before. The endpoint contract
  changes (callers now pass `period`), but the data they get back for
  non-`summer` periods is identical to today. Two visible *display*
  changes apply to all four periods (not summer-specific): the new
  period heading in the Registration tab (FR-006) and the new
  empty-state message when no students are available (FR-007). Both
  are added uniformly. No behavioral change.
- **SC-004:** Rows in `registrations_summer` are indistinguishable in
  structure from rows in `registrations_fall` / `_winter` / `_spring`
  (other than living in their own sheet). Same columns, same value formats.
- **SC-005:** Every period label rendered in the website UI (parent or
  admin surfaces) routes through the display-name helper, with no
  hardcoded period *display* strings in UI code. (Non-display uses of a
  period value in UI source — e.g., a CSS class like `fall-section`, a
  test selector, an internal data attribute — are not subject to this
  rule.) As a consequence, the `summer` period renders as "Next Fall"
  everywhere in the UI — including the new Registration tab period
  heading (FR-006). Backend-generated output (logs, API payload values,
  sheet contents) continues to use the raw `summer` identifier — that is
  intentional and not a regression. Verifiable by code search for
  hardcoded period display strings in UI source and by inspecting the
  rendered DOM for the Registration tab period heading and any other
  period selectors.
- **SC-006:** The turnover script (FR-008) successfully copies
  registrations from `registrations_spring` into `registrations_summer`
  when `TARGET_TRIMESTER === 'summer'`, applying the same intent-based
  filtering, UUID regeneration, linking, and audit creation it already
  applies for fall→winter and winter→spring. Verified end-to-end on a
  test dataset: run + apply produces a `registrations_summer` sheet
  with the expected rows (keep/change/blank intent rows copied, drop
  rows skipped) and a matching `registrations_summer_audit` sheet. The
  existing fall→winter and winter→spring paths are unchanged — no
  regression.
