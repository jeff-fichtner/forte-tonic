# Quickstart: DB Layer Simplification

**Branch**: `003-db-layer-simplification`

## What This Changes

This is a backend refactoring. No new features, no API changes, no frontend changes.

**Before**: Column mappings are defined in two places (DB client + model `fromDatabaseRow`). Models parse raw `string[]` arrays with hardcoded indices. The DB client creates audit records with domain-specific knowledge.

**After**: Column mappings are defined once on each model. The DB client converts arrays to named fields. Models receive `Record<string, string>`. Sheets-specific parsing lives in the DB client. Audit records are created by repositories.

## Verification

```bash
# Type check (both backend and frontend tsconfigs)
npm run typecheck

# Run all tests (544 expected)
npm test

# Grep for column-index references in models (should return nothing)
grep -rn 'row\[' src/models/shared/

# Grep for Sheets-specific parsing in model factories (should return nothing)
grep -rn 'parseTimeString\|instanceof Date' src/models/shared/
```

## Key Files

| File | Role |
|------|------|
| `src/database/googleSheetsDbClient.ts` | Sheets adapter — converts rows ↔ named fields, applies field transforms |
| `src/models/shared/*.ts` | Domain models — define `static columns`, receive named fields |
| `src/repositories/*.ts` | Data access — call DB client, handle audit trail creation |
| `src/services/periodService.ts` | Period management — updated to receive named fields |

## Architecture After Refactoring

```
Google Sheets API
  ↓ string[][]
GoogleSheetsDbClient
  ↓ rowToObject(row, columns) → Record<string, string>
  ↓ applyTransforms(record, transforms) → Record<string, unknown>
Repository (mapFunc)
  ↓ Model.fromDatabaseRow(record) or new Model(record)
Service / Controller
  ↓ model.toJSON()
API Response
```

Write path (reverse):
```
Model instance
  ↓ toJSON() → Record<string, unknown>
GoogleSheetsDbClient
  ↓ objectToRow(obj, columns) → string[]
Google Sheets API
```
