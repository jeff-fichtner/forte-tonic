# Contracts: Google Sheets Migration System

No API contracts — this feature adds no new HTTP endpoints. The migration system is internal startup infrastructure that operates at the Google Sheets API level before the Express server starts accepting traffic.

## Internal Contracts

The following TypeScript interfaces serve as the internal contracts:

- **`MigrationModule`** — the shape a migration file must export (`id` + `migrate`)
- **`MigrationContext`** — the API surface available to migration authors
- **`MigrationRecord`** — the shape of a row in the `_migrations` tracking sheet

See [data-model.md](../data-model.md) for full interface definitions.
