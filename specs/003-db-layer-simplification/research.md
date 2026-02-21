# Research: DB Layer Simplification

**Branch**: `003-db-layer-simplification` | **Date**: 2026-02-21

## R1: Where should column schemas live?

**Decision**: On each model class as `static columns: readonly string[]`.

**Rationale**: Models are the single source of truth for entity structure (Constitution VII). The column schema is the mapping between spreadsheet columns and model fields — it defines what the entity looks like in storage. Placing it on the model keeps the "shape of the data" in one file.

**Alternatives considered**:
- Separate schema files (`src/schemas/registration.ts`) — rejected because it splits the entity definition across two files with no benefit. Constitution I (Simplicity First) says one way to do each thing.
- Keep in DB client but deduplicate via shared constants — rejected because it still couples the DB client to domain knowledge (violates FR-003).

## R2: How should field transforms work?

**Decision**: Per-sheet transform maps defined in the DB client layer, alongside the sheet config. A transform is a `Record<string, (value: string) => unknown>` that maps field names to coercion functions. Applied after array→object conversion, before passing to the model.

**Rationale**: Each sheet has its own quirks (Instructors has `isDeactivated` → `isActive` inversion, Classes has time format parsing). These are Sheets-adapter concerns. The transform map is co-located with the sheet config so it's clear which transforms apply to which sheet.

**Transforms identified from codebase analysis**:

| Sheet | Field | Transform |
|-------|-------|-----------|
| Classes | startTime, endTime | `DateHelpers.parseTimeString(v).to24Hour()` |
| Classes | length | `parseInt(v) \|\| 0` |
| Instructors | isDeactivated → isActive | Rename + invert: `!value` (truthy string → false) |
| Instructors | instrument1-4 → specialties | Collect into array, filter falsy |
| Instructors | availability blocks | Restructure 20 flat columns into nested object |
| Attendance | week | `Number(v)` |
| Attendance | attended | `v.toLowerCase() === 'true'` |
| Admin | isDirector | `v === 'TRUE' \|\| v === 'true'` |
| Registration | length | `parseInt(v)` (strict validation in constructor) |
| Periods | trimester | `.toLowerCase()` |
| Periods | startDate | `new Date(v)` with validity check |

**Note on Instructor**: The Instructor transform is the most complex because it restructures 35 flat columns into nested objects (availability, gradeRange, specialties). This restructuring currently lives in `Instructor.fromDatabaseRow()`. The decision is to move the flat-to-nested restructuring into the sheet's transform config, so the Instructor model receives clean named fields with already-structured nested objects.

**Alternative considered**: Leave Instructor restructuring in the model — rejected because it means the model still depends on knowing the spreadsheet's flat column layout, which defeats the purpose of the refactor. With SQL, these would be separate tables or JSON columns.

## R3: What about models that have `toDatabaseRow()`?

**Decision**: Remove `toDatabaseRow()` from Registration and AttendanceRecord. The DB client's write path reverses the column schema: takes the model's `toJSON()` output (or a plain object), reads fields by name using the column schema, and produces a positional `string[]`.

**Rationale**: FR-007 requires this. The DB client already has `#convertObjectToRow()` that does named→positional conversion. Today it's only used by some write paths while others use `toDatabaseRow()`. Unifying to one path means writes go through the same schema as reads.

**Write-path serialization**: Date fields need to be serialized back to ISO strings for Sheets storage. This happens in `toJSON()` already (JSON.stringify handles Date→string). For explicit control, the DB client write path can apply reverse transforms (e.g., `Date.toISOString()`), but in practice `toJSON()` output is already string-safe.

## R4: What about the legacy `REGISTRATIONSAUDIT` entry?

**Decision**: Investigate whether it's actually used. If no code references `Keys.REGISTRATIONSAUDIT` as a sheet key for reads/writes, remove it. If it is used, align it with the trimester audit schema (add `linkedPreviousRegistrationId`).

**Findings**: The `Keys.REGISTRATIONSAUDIT` sheet config exists in `workingSheetInfo` but the code analysis shows audit writes go through trimester-specific audit sheets (`registrations_fall_audit`, etc.), not through `Keys.REGISTRATIONSAUDIT`. Likely vestigial from before trimester-specific sheets were added.

## R5: Unused DB client methods

**Decision**: Remove `getFromSheetByColumnValue()`, `getFromSheetByColumnValueSingle()`, `batchWrite()`, `getAllDataParallel()`, `getMaxIdFromSheet()`, and `archiveSheet()`. Zero production callers exist for any of them.

**Rationale**: Constitution VI (No Dead Code). These methods are defined but never called from production code. Some have test coverage but no actual usage. Removing them simplifies the DB client surface area.

## R6: `Registration.fromDatabaseRow` window check for isWaitlistClass

**Decision**: Move the `isWaitlistClass` determination to the server-side repository. On the server, check `classTitle.toLowerCase().includes('waitlist')` in the repository after constructing the Registration. The model constructor continues to accept `isWaitlistClass` as an input field.

**Rationale**: The `typeof window !== 'undefined'` check in a model violates Constitution VII (minimize environment-specific behavior). Since no browser code calls `fromDatabaseRow` (confirmed in codebase analysis), the browser path is dead code. The server-side title check is the only active logic.

## R7: `PeriodService._parsePeriodRow` positional parsing

**Decision**: Update PeriodService to receive named fields from the DB client like all other consumers. The periods sheet has a column schema (`trimester`, `periodType`, `startDate`). Define it as a simple constant (no model class needed since Period is a service-internal type) and register it in the sheet config.

**Rationale**: FR-002 requires all sheet reads to go through the column-schema pipeline. PeriodService is the only non-model consumer.

## R8: How does `appendRecord` determine row format?

**Decision**: Simplify `appendRecord` to always receive a column schema + plain object. The DB client converts named fields to positional array using the schema. Remove the `Appendable` interface and `toDatabaseRow` codepath.

**Current behavior**: `appendRecord` checks if the record has `toDatabaseRow()` and calls it; otherwise falls back to `#convertObjectToRow()`. After removing `toDatabaseRow()` from models, the check becomes unnecessary.
