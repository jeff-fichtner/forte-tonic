# Feature Specification: Business Rules to Configuration

**Feature Branch**: `018-business-rules-to-config`
**Created**: 2026-05-30
**Status**: Stub
**Part of**: Audit remediation cluster (specs 015–020)
**Previous**: [017-uniform-crud-completion](../017-uniform-crud-completion/spec.md)
**Next**: [019-frontend-test-infrastructure](../019-frontend-test-infrastructure/spec.md)

> **This is a stub, not a spec.** Captures intent only. The real spec is
> authored on this branch when the work is picked up.

## Overview

Several business rules live as literals in the code. When the rule changes, code changes. The audit flagged these as candidates for "move to configurable storage" but each is a distinct decision — different storage (env var vs. spreadsheet cell vs. a config sheet), different change cadence, different ownership.

## Findings to address

- **Bus end-times per day.** [registrationService.ts](../../src/services/registrationService.ts) hardcodes the latest lesson-end time per weekday (e.g., 16:45 for Mon/Tue/Thu, 16:15 for Wed) to enforce bus-transportation feasibility. When the bus schedule changes, the file changes. Decide where the source-of-truth bus schedule lives.
- **12-lessons-per-trimester literal.** [registrationService.ts](../../src/services/registrationService.ts) `#generateLessonSchedule()` assumes 12 lessons. Trimesters with different lengths produce wrong schedules. Decide: per-trimester config, per-period config, or per-registration override.
- **`FORTE_PROGRAM_EMAIL`.** [config/constants.ts](../../src/config/constants.ts) hardcodes `'forte@mcds.org'`. The existing TODO comment in that file flags this as multi-tenant prep. Decide whether multi-tenancy is actually on the roadmap or whether the constant just gets moved to an env var.
- **Sweep for other literals.** Before this spec ships, do a pass for other business-rule literals that should be configurable. Likely candidates: grade ranges (`MAX_GRADE`), email subject/body templates, time-window deadlines for any other workflow.

## Why this is deferred

Each of these is a small change in isolation, but each is also a "where should this live" decision that touches operations (who edits the config?), deployment (does a change require a redeploy?), and the data store (do we add a config sheet to the spreadsheet, or use env vars, or both?). Putting it into [015-audit-remediation](../015-audit-remediation/spec.md) would have prematurely picked an answer.

## Dependencies

- Independent of the other 016/017/019/020 specs. Could ship in parallel with any of them.
- Should land before [021-school-year-rollover](../021-school-year-rollover/spec.md) if the rollover work needs to read the lessons-per-trimester value.
