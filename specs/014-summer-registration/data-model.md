# Phase 1 Data Model: Summer Registration

**Branch**: `014-summer-registration` | **Date**: 2026-05-27

This document enumerates every data-model and storage-layer touch
point. Most of the work is **structural extension of existing
entities**, not new entity creation — Principle II (Data Consistency)
and Principle X (Google Sheets Is the Database) drive a "reuse the
shared schema" approach throughout.

---

## Entities

### `Trimester` enum (extended)

**Location:** [src/utils/values/trimester.ts](../../src/utils/values/trimester.ts)

**Change:** Add `SUMMER: 'summer'` as a fourth value.

**Before:**
```ts
export const Trimester = {
  FALL: 'fall',
  WINTER: 'winter',
  SPRING: 'spring',
} as const;
```

**After:**
```ts
export const Trimester = {
  FALL: 'fall',
  WINTER: 'winter',
  SPRING: 'spring',
  SUMMER: 'summer',
} as const;
```

**Derived effects (automatic):**
- `TrimesterValue` type union expands to include `'summer'`.
- `TRIMESTER_SEQUENCE` array becomes `['fall', 'winter', 'spring', 'summer']`.
- `isValidTrimester('summer')` returns `true`.
- `PeriodService.getNextTrimesterInSequence('spring')` returns `'summer'`.
- `PeriodService.getNextTrimesterInSequence('summer')` returns `'fall'`.
- `PeriodService.getPreviousTrimesterInSequence('summer')` returns `'spring'`.
- `PeriodService.getPreviousTrimesterInSequence('fall')` returns `'summer'`.

**Validation rules:** All existing validators that accept a trimester
string will accept `'summer'` after this change. No other code needs
to change for validation purposes.

---

### `Student` (unchanged schema; runtime grade-bump)

**Location:** [src/models/shared/student.ts](../../src/models/shared/student.ts)

**Schema:** No change. The Student model's stored fields are
identical. The `grade` field still holds the student's actual
school-year grade.

**Runtime transform (new):** When `UserRepository.getStudents` is
called with `period === 'summer'`, the returned student list contains
each student with `grade` incremented by 1. This is applied **after**
data is read from the cache, **before** the list is returned to
callers.

**State transitions:** None. The grade-bump is a serving-time
projection, not a state change. The stored value is invariant across
serving contexts.

**Constraints:**
- The bump is `+1` flat — held-back students are not modeled (per
  spec edge cases).
- Students who would exceed the school's highest grade (8) after
  bump (i.e., currently grade 8) are filtered out by the existing
  student-eligibility filter, not by the grade-bump logic itself.

---

### `Registration` (unchanged shared schema; new sheet variant)

**Location:** [src/models/shared/registration.ts](../../src/models/shared/registration.ts)

**Schema:** No change. `Registration.columns` and
`Registration.auditColumns` are reused as-is.

**New sheet variant:** Two new sheets are added in the spreadsheet
that use the existing shared schemas:

- `registrations_summer` — uses `Registration.columns`
- `registrations_summer_audit` — uses `Registration.auditColumns`

These sheets are structurally identical to their fall / winter /
spring counterparts; the only difference is the sheet name. Per
constitution Principle II, the same `Registration` model represents
rows from any per-trimester sheet.

---

### `Period` (unchanged schema)

**Location:** [src/repositories/periodRepository.ts](../../src/repositories/periodRepository.ts)

**Schema:** No change. `PERIOD_COLUMNS = ['trimester', 'periodType',
'startDate']`. The write-target table is derived at runtime by
`PeriodService.getEnrollmentTrimesterTable()` — see
[research.md](research.md) Decision 6.

**New data (operational, not schema):** Admin populates new rows in
the `periods` sheet to configure when `summer` enrollment opens and
closes. This is data entry, not a model change. Example rows:

| trimester | periodType | startDate |
|-----------|-----------|-----------|
| summer | priorityEnrollment | 2026-04-15 |
| summer | openEnrollment | 2026-05-01 |
| summer | registration | 2026-06-01 |

(Exact dates and which period types apply are admin decisions; this
table is illustrative only.)

---

## Storage Layer

### Sheet registry: `googleSheetsDbClient.ts`

**Location:** [src/database/googleSheetsDbClient.ts:220](../../src/database/googleSheetsDbClient.ts#L220)

**Change:** Single-line edit:

```ts
// Before
const trimesters = ['fall', 'winter', 'spring'];

// After
const trimesters = ['fall', 'winter', 'spring', 'summer'];
```

**Derived effects (automatic, see lines 271-287):**
- Two new sheet configs are generated:
  - `registrations_summer` (with `Registration.columns` and
    `registrationMappings`)
  - `registrations_summer_audit` (with `Registration.auditColumns`)
- These sheets become readable/writable via the same code paths used
  for fall / winter / spring.

---

### Sheet creation: 014 migration file

**Location (new):** `src/migrations/002-create-summer-sheets.ts`

**Schema:** N/A — this is a one-shot migration script, not a model.

**Behavior:**
1. Check for existence of `registrations_summer` sheet.
2. If absent, create it with header row from `Registration.columns`.
3. Check for existence of `registrations_summer_audit` sheet.
4. If absent, create it with header row from `Registration.auditColumns`.
5. Idempotent (re-running is a no-op if both sheets already exist).

**Dependency:** Requires a new `MigrationContext.createSheet(name,
columns)` primitive (see below).

---

### `MigrationContext.createSheet` (new primitive)

**Location:** [src/infrastructure/migration/migrationContext.ts](../../src/infrastructure/migration/migrationContext.ts)

**Interface addition:**

```ts
interface MigrationContext {
  // existing methods
  getSheetHeaders(sheetName: string): Promise<string[]>;
  addColumn(sheetName: string, columnName: string, options?: { after?: string }): Promise<number>;
  readAllRows(sheetName: string): Promise<Record<string, string>[]>;
  updateCell(sheetName: string, row: number, col: number, value: string): Promise<void>;
  batchUpdateColumn(sheetName: string, colIndex: number, values: string[]): Promise<void>;

  // NEW
  createSheet(sheetName: string, columns: readonly string[]): Promise<void>;
}
```

**Behavior:**
1. Check if a sheet with the given name already exists; if so, return
   (idempotent).
2. Use the Sheets API `addSheet` request to create the sheet.
3. Write the column header row at row 1.
4. (Optional: apply default header formatting — bold, frozen — to
   match the existing per-trimester sheets visually. Decided during
   implementation.)

---

## Period registry (frontend)

### `periodDisplayName` helper (new)

**Location (new):** `src/web/js/utilities/periodDisplayName.ts`

**Interface:**

```ts
export function periodDisplayName(period: string): string;
```

**Mapping:**

| Input | Output |
|-------|--------|
| `'fall'` | `'Fall'` |
| `'winter'` | `'Winter'` |
| `'spring'` | `'Spring'` |
| `'summer'` | `'Next Fall'` |

**Behavior on unknown input:** Throw an error (matches FR-003's
fail-loud philosophy applied here too — an unknown period is a bug,
not a runtime condition).

**Used by:** Every frontend surface that displays a period value
(post-FR-005 migration).

---

## Documentation (FR-009)

The project constitution at
[.specify/memory/constitution.md](../../.specify/memory/constitution.md)
contains two factual references to the trimester count that MUST be
updated in lockstep with the 014 implementation:

| Constitution location | Current text | After 014 |
|---|---|---|
| Preamble | "across three trimesters (fall, winter, spring)" | "across four trimesters (fall, winter, spring, summer)" |
| Principle IX | "(`registrations_fall`, `registrations_winter`, `registrations_spring`)" | "(`registrations_fall`, `registrations_winter`, `registrations_spring`, `registrations_summer`)" |

This is a PATCH-level constitution amendment (factual correction
only — no principle change). The sync impact report in the
constitution already notes this pending update.

---

## Data flow for the new behavior

### Student fetch with grade bump (FR-003)

```
Caller (e.g., RegistrationController.getParentRegistrationTabData)
  ↓ getStudents({ parentId, period: 'summer' })
EntityQueryService.getStudents (forwards period)
  ↓
UserRepository.getStudents
  ↓ if period is missing: throw immediately
  ↓ fetchAll(Keys.STUDENTS) → raw student rows
  ↓ filter by parentId (existing logic)
  ↓ if period === 'summer': students = students.map(s => ({ ...s, grade: s.grade + 1 }))
  ↓ filter out students with grade > 8 (existing eligibility filter)
  ↓ return students with bumped grades
```

### Registration write to summer sheet (existing flow, summer enabled)

```
POST /api/registrations { ..., trimester: 'summer' }
  ↓
registrationController.createRegistration
  ↓ validates trimester via isValidTrimester (now accepts 'summer')
RegistrationService.processRegistration
  ↓
RegistrationRepository.create(registration, 'summer')
  ↓ _tableName('summer') → 'registrations_summer'
GoogleSheetsDbClient writes to 'registrations_summer'
  ↓ cache invalidation for that sheet
```

### Sheet creation at app startup (FR-002)

```
app startup
  ↓
MigrationRunner.run() (013 system)
  ↓ reads _migrations sheet, sees 002-create-summer-sheets not yet run
  ↓ executes 002-create-summer-sheets.ts
    ↓ ctx.createSheet('registrations_summer', Registration.columns)
    ↓ ctx.createSheet('registrations_summer_audit', Registration.auditColumns)
  ↓ records '002-create-summer-sheets' as run in _migrations sheet
app.listen() (sheets exist, googleSheetsDbClient's 'summer' config is valid)
```

---

## Cache implications

The existing 5-minute in-memory cache in `googleSheetsDbClient` keys
on sheet name. Adding `registrations_summer` and
`registrations_summer_audit` as new keyed entries follows the existing
pattern automatically.

**Cache invalidation:** Writes to `registrations_summer` invalidate
the `registrations_summer` cache entry; reads from it return cached
data on subsequent hits. This is identical to fall / winter / spring
behavior — no new invalidation logic needed.

**Students cache + grade-bump:** The grade-bump is applied **after**
the cache read, not before. The cache stores the raw student data
(unchanged across periods). Each `getStudents` invocation re-applies
the bump conditional on `period`. This means: (a) the cache stays
period-agnostic, (b) duplicate fetches across periods all hit the
same cache entry, and (c) the FR-003 "duplicate fetches across views"
tradeoff is small in practice — repeated CPU work, not repeated
Sheets API calls.

---

## Migration ordering

The constitution's deployment guarantee (013 runs before
`app.listen()`) handles ordering:

1. Code with `'summer'` in `trimesters` array deploys.
2. App starts; 013 migration runner runs `002-create-summer-sheets`.
3. After migration completes, `registrations_summer` exists.
4. `app.listen()` is called; the data layer can now read from
   `registrations_summer` without error.

If step 2 fails (e.g., Sheets API outage), the app does not start —
no traffic served against a half-initialized data layer.

---

## Out-of-scope data concerns

The following data concerns are **not** addressed by 014:

- **Migrating spring data into summer.** Handled by the GAS turnover
  script (FR-008), not the 013 migration.
- **Cleanup of summer rows after August migration.** Part 2 / 015.
- **Stored write-target field on the periods table.** Not added in
  014 — derivation by `PeriodService.getEnrollmentTrimesterTable()`
  handles all current and Part-1 cases (see [research.md](research.md)
  Decision 6).
- **Per-trimester `classes` sheet split.** Out of scope (spec).
