# Quickstart: Verifying Summer Registration After Implementation

**Branch**: `014-summer-registration` | **Date**: 2026-05-27

This document is for an operator/QA verifying that 014 works end-to-end
in a deployed environment. For implementation guidance, see
[plan.md](plan.md), [research.md](research.md), and [tasks.md](tasks.md)
(once generated).

---

## Prerequisites

- A deployed environment (local dev, staging, or prod) with the 014
  code rolled out.
- A test parent account with at least one student stored at grade 5
  (any grade between 0 and 7 works; we use 5 as the canonical
  example).
- A test instructor with `gradeRange { min: 6, max: 8 }` (eligible for
  bumped-grade students but not the current grade) and another with
  `gradeRange { min: 4, max: 5 }` (eligible only for current grade).
- Admin access to the spreadsheet for sheet inspection.

---

## 1. Verify sheet creation (FR-002, SC-004)

Open the spreadsheet for the target environment. Confirm:

- [ ] A sheet named `registrations_summer` exists.
- [ ] A sheet named `registrations_summer_audit` exists.
- [ ] `registrations_summer` has the same column headers as
      `registrations_fall` (same order, same names).
- [ ] `registrations_summer_audit` has the same column headers as
      `registrations_fall_audit`.

If any of the above is missing, the 014 migration did not run. Check
the GCP logs around app startup for migration errors.

---

## 2. Verify the period config (FR-001)

Open the `periods` sheet. Confirm:

- [ ] At least one row with `trimester: 'summer'` exists (with the
      appropriate `periodType` and `startDate` for the test scenario).

If you need to set up the summer enrollment window for testing, add
rows by hand (admin operation).

---

## 3. Verify the period heading shows (FR-006, SC-001)

As the test parent, log in. Navigate to the **Registration** tab.

- [ ] During a non-enrollment window (e.g., mid-fall), the period
      heading inside the Registration tab reads "Fall" (or the current
      trimester's display label).
- [ ] During a `summer` enrollment window (e.g., during spring
      instruction with summer enrollment active), the period heading
      inside the Registration tab reads **"Next Fall"** (not
      "Summer").

The Registration tab itself remains labeled "Registration" — the
heading is *inside* the tab content.

---

## 4. Verify the grade bump (FR-003, SC-002)

Set up: ensure the test student is stored at grade 5; ensure the test
instructor "Smith" has `gradeRange { min: 6, max: 8 }`; ensure
instructor "Jones" has `gradeRange { min: 4, max: 5 }`.

### 4a. Summer period

With the `summer` period active:

- [ ] Open the Registration tab. Period heading reads "Next Fall."
- [ ] Open the student selector. The grade shown next to the student
      is **6** (not 5).
- [ ] In the instructor selector, **Smith** appears as a valid choice
      (eligible for grade 6).
- [ ] In the instructor selector, **Jones** does NOT appear (not
      eligible for grade 6).

### 4b. Fall / winter / spring period

Switch to a non-summer period:

- [ ] Open the Registration tab. Period heading reads "Fall" /
      "Winter" / "Spring" as appropriate.
- [ ] The student's grade is shown as **5** (the stored value).
- [ ] **Smith** does NOT appear (not eligible for grade 5).
- [ ] **Jones** DOES appear (eligible for grade 5).

This is the bidirectional check SC-002 requires.

### 4c. Verify the bump is not persisted

After a `summer` registration:

- [ ] Open the `students` sheet. The test student's `grade` column
      still reads **5** (not 6). The bump is a runtime transform,
      never written back.
- [ ] Open `registrations_summer`. The new row references the student
      by ID. There is no `grade` column on the registrations sheet (so
      the bump can't possibly be stored there either).

---

## 5. Verify the empty-state message (FR-007)

Set up: configure a test parent whose only child is in 8th grade (so
that no students are returned for `summer`).

- [ ] During the `summer` period, that parent opens the Registration
      tab.
- [ ] The Registration tab content area shows a centered text
      message: "No students available for registration" (or
      equivalent — sourced from the `STUDENT_EMPTY` constant).
- [ ] The registration form is not visible.
- [ ] The same parent during fall / winter / spring sees the message
      ONLY if they have no students available for that period (per
      that period's rules).

---

## 6. Verify "Summer" never appears in UI (SC-005)

Open browser DevTools. Search the rendered DOM for the literal string
"Summer" (case-sensitive).

- [ ] No matches. (Hits in CSS class names like `summer-section` or
      data attributes are OK — see SC-005 exclusion.)
- [ ] Search for "Next Fall." Matches found at: Registration tab
      heading, navigation buttons (if any), Weekly Schedule tab
      labels (if the period is summer), confirmation message text
      (parametrized cancellation policy).

---

## 7. Verify the modify-via-replace flow (FR-008, User Story 2)

Set up: run the extended GAS turnover script
(`Migration_REEN006_ChangeTrimester.js` with
`TARGET_TRIMESTER = 'summer'`) against a test spreadsheet that has
spring registrations with `reenrollmentIntent: 'keep'` or `'change'`.

After the script's `run()` and `apply()`:

- [ ] `registrations_summer` contains rows copied from
      `registrations_spring`.
- [ ] Each copied row has a new UUID and `linkedPreviousRegistrationId`
      pointing to its source spring registration.
- [ ] Rows with `reenrollmentIntent: 'drop'` are NOT copied.
- [ ] Each copied row has `reenrollmentIntent`, `intentSubmittedAt`,
      `intentSubmittedBy` blanked.
- [ ] `registrations_summer_audit` has matching audit rows.

Then, as the test parent (with a child whose summer registration was
carried forward):

- [ ] The Registration tab during `summer` shows a modify selector
      dropdown.
- [ ] The dropdown lists the carried-forward registration as
      "Modify: <details>".
- [ ] Selecting it pre-populates the form.
- [ ] Submitting with changed details:
  - [ ] The original row in `registrations_summer` is marked deleted
        (`IsDeleted=true` in the audit sheet).
  - [ ] A new row is written to `registrations_summer` with the
        changed details and NO `linkedPreviousRegistrationId`.
- [ ] After submit, reopen the Registration tab. The modify selector
      no longer shows that lesson.

---

## 8. Verify regression: existing trimesters unchanged (SC-003)

Pick any pre-014 flow on a non-summer trimester (e.g., create a
winter registration, modify a spring registration, etc.):

- [ ] The flow works identically to pre-014 behavior.
- [ ] Students display at their stored grades (no bump).
- [ ] Period heading reads "Fall" / "Winter" / "Spring" (the new
      heading is the one display addition).
- [ ] Empty-state message shows when no students are available (the
      other display addition).

---

## 9. Verify period-display-name helper is universal (SC-005)

Grep the frontend source:

```bash
grep -rn "'Fall'\|'Winter'\|'Spring'\|'Summer'" src/web/
```

- [ ] Zero matches for "Summer" as a display string (only the
      identifier `'summer'` should appear in code, which is
      lowercase).
- [ ] All other display matches are inside the periodDisplayName
      helper module itself or in test fixtures (acceptable).
- [ ] No matches in tab components, registration form components,
      etc. — all rendering goes through the helper.

---

## 10. Verify constitution amendment (FR-009)

Open [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md):

- [ ] Preamble reads "across four trimesters (fall, winter, spring,
      summer)" — not "three."
- [ ] Principle IX lists all four per-trimester registration sheets
      (`registrations_fall`, `_winter`, `_spring`, `_summer`).
- [ ] Sync impact report at the top describes this amendment.
- [ ] Version footer increments (e.g., 2.3.0 → 2.3.1).
- [ ] `Last Amended` date updated.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| App fails to start after deploy | Migration `002-create-summer-sheets` errored; check GCP logs |
| 400 errors on existing endpoints after deploy | A caller of `getStudents` is missing the `period` parameter — check the error message for the calling code path |
| "Summer" appears in UI somewhere | Missed a hardcoded string in the FR-005 migration |
| Grade bump applies during fall/winter/spring | Bug in the conditional in `userRepository.getStudents` |
| Modify selector empty during summer | Either no carried-forward rows exist (GAS turnover not run) or the filter logic for `linkedPreviousRegistrationId` is broken |

---

## Sign-off

If all checks above pass, 014 is functionally complete. Confirm:

- [ ] All FRs verified (FR-001 through FR-009)
- [ ] All SCs verified (SC-001 through SC-006)
- [ ] No regression in pre-014 flows
- [ ] Postman collection updated
- [ ] Audit logs in GCP show no unexpected errors during a 24-hour
      smoke window

Then mark spec.md `Status: Implemented` per project convention.
