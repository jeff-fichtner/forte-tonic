# API Contract Changes — Summary

**Branch**: `014-summer-registration` | **Date**: 2026-05-27

This feature does NOT introduce new endpoints. It amends the contracts
of existing endpoints. Each amendment is enumerated below.

---

## Change 1: Students endpoint gains a required `period` parameter

**Affected:** All endpoints that serve student data — directly or
indirectly — through the student-fetch chain. See [research.md
Decision 4](../research.md) for the full caller list.

**Before:** The students endpoint (and its various tab-specific
wrappers) returned all students for the parent/admin context, with no
period awareness.

**After:** Every endpoint that returns students MUST include `period`
in its request (path or query, depending on the endpoint's existing
shape). The backend's `getStudents()` throws on missing `period`. For
`period === 'summer'`, each returned student has `grade` incremented by 1
(runtime transform, not stored — see FR-003).

**Concrete endpoint changes:**

| Endpoint | Today | After |
|----------|-------|-------|
| `GET /api/parent/tabs/registration/:trimester` | `:trimester` is the registration target only | `:trimester` continues to be the registration target; the embedded student data is also period-bumped if trimester is `summer` |
| `GET /api/parent/tabs/weekly-schedule` | period-agnostic student list | `period` query param added; student list reflects that period |
| `GET /api/parent/tabs/contact` | period-agnostic student list | `period` query param added |
| `GET /api/admin/tabs/registration` | period-agnostic | `period` query param added |
| `GET /api/admin/tabs/master-schedule` | period-agnostic | `period` query param added |
| `GET /api/admin/tabs/wait-list` | period-agnostic | `period` query param added |
| `GET /api/instructor/tabs/weekly-schedule` | period-agnostic | `period` query param added |

**For non-summer values of `period`, the response is identical to today's
behavior.** Only `period === 'summer'` introduces an observable change
(the grade bump).

**Error behavior:** Endpoints that omit `period` (or send a value not
in `['fall', 'winter', 'spring', 'summer']`) get a 400 response with
the standard error envelope.

---

## Change 2: Registration endpoints accept `summer` as a trimester value

**Affected:**
- `POST /api/registrations` — body field `trimester` now accepts `'summer'`
- `GET /api/parent/tabs/registration/:trimester` — `:trimester` route
  param now accepts `'summer'`
- `DELETE /api/registrations/:trimester/:id` — same
- `PATCH /api/registrations/:trimester/:id/intent` — same
- Any other endpoint with a `:trimester` path param or `trimester`
  body/query field

**Mechanism:** The `isValidTrimester()` validator is data-driven from
the `Trimester` enum (see [data-model.md](../data-model.md)). Adding
`SUMMER: 'summer'` to the enum automatically expands what the
validator accepts. No per-endpoint code changes are needed.

**Response shape:** Unchanged. The `period` field in responses now
includes `'summer'` as a possible value.

---

## Change 3: Period config (periods sheet) accepts `summer` rows

**Affected:** The `periods` sheet (read-only API surface via
`PeriodService.getCurrentPeriod()` / `getNextPeriod()`).

**Before:** Period rows could have `trimester ∈ {'fall', 'winter', 'spring'}`.

**After:** Period rows can have `trimester ∈ {'fall', 'winter', 'spring', 'summer'}`.

**No code change for this** — `PeriodService` reads the `trimester`
value as a string and passes it through. Adding new rows in the
`periods` sheet with `trimester: 'summer'` is operational data entry,
not a contract change. See [data-model.md](../data-model.md) for the
illustrative example.

---

## Change 4: App configuration response includes `summer` in `availableTrimesters`

**Affected:** `GET /api/app-configuration` (or whatever endpoint
returns the app config).

**Before:** During spring-enrollment overlap, the
`availableTrimesters` array might be `['winter', 'spring']`.

**After:** During spring instruction with summer enrollment active,
`availableTrimesters` is `['spring', 'summer']`.

**Mechanism:** `PeriodService.getNextTrimester()` returns `'summer'`
when the current period is spring and a summer enrollment period is
configured. The existing `_getAvailableTrimesters` logic in
`UserController` automatically produces the new array shape (see
spec FR-001).

---

## Change 5 (out-of-band): GAS turnover script

**Affected:** [`Migration_REEN006_ChangeTrimester.js`](../../../gas/src/mig/recurring/Migration_REEN006_ChangeTrimester.js)
— a manually-run Google Apps Script.

**This is not an HTTP contract.** It is documented in [spec.md](../spec.md)
FR-008. Listed here for completeness.

**Before:** `TARGET_TRIMESTER ∈ {'winter', 'spring'}`.
**After:** `TARGET_TRIMESTER ∈ {'winter', 'spring', 'summer'}`.

---

## Change 6 (out-of-band): Constitution amendment

**Affected:** [`.specify/memory/constitution.md`](../../../.specify/memory/constitution.md).

**This is not an HTTP contract.** Documented in [spec.md](../spec.md)
FR-009. The constitution describes the program as operating on three
trimesters and lists three per-trimester registration sheets; both
references must be updated to four when 014 ships. PATCH-level
amendment (factual correction).

---

## Contract change risk

| Change | Risk | Mitigation |
|--------|------|-----------|
| 1 — `period` required everywhere | **High.** Any forgotten caller throws at runtime. | FR-003 mandates throw at lowest layer; integration tests for each modified endpoint; SC-002 verification. |
| 2 — Trimester values expand to include `summer` | Low. Data-driven via enum; no per-endpoint changes. | Validate `isValidTrimester('summer')` returns true; integration test for `POST /api/registrations` with `trimester: 'summer'`. |
| 3 — Period config rows | None for code; operational concern only. | Admin runbook update. |
| 4 — App config response shape | Low. Existing logic produces the new array shape automatically. | Frontend already handles dynamic `availableTrimesters` array. |
| 5 — GAS turnover script | Low. Single-method extension. | SC-006 verification. |

---

## Postman collection

Per constitution: when API endpoints are added, changed, or removed,
the Postman collection MUST be updated.

The collection update for 014 will:
- Add `period` query param to every students/tab endpoint where it
  now applies
- Add `'summer'` as a value option in `:trimester` path param examples
- Add a sample `POST /api/registrations` with `trimester: 'summer'`

Postman update is itemized as a task in [tasks.md](../tasks.md) (Phase 2).
