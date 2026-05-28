# API Contracts: Summer Registration

This feature introduces **no new API endpoints**. All changes are
either contract amendments to existing endpoints (parameter expansion,
new accepted values) or internal-only (the migration system, the GAS
turnover script, the constitution amendment).

The files in this directory document the contract amendments to
existing endpoints in machine-readable form (alongside the prose
explanations in [spec.md](../spec.md) and [data-model.md](../data-model.md)).

## Files

- [contract-changes.md](contract-changes.md) — narrative summary of all
  contract amendments
- [students-endpoint.yaml](students-endpoint.yaml) — OpenAPI fragment for
  the parameterized students endpoint (FR-003)
- [registrations-endpoint.yaml](registrations-endpoint.yaml) — OpenAPI
  fragment showing the trimester values now include `summer` (FR-001)
- [period-config.yaml](period-config.yaml) — schema fragment for the
  new `summer` rows in the `periods` table
