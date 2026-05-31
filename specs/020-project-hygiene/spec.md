# Feature Specification: Project Hygiene

**Feature Branch**: `020-project-hygiene`
**Created**: 2026-05-30
**Status**: Stub
**Part of**: Audit remediation cluster (specs 015–020)
**Previous**: [019-frontend-test-infrastructure](../019-frontend-test-infrastructure/spec.md)

> **This is a stub, not a spec.** Captures intent only. The real spec is
> authored on this branch when the work is picked up.

## Overview

A grab-bag of project-management cleanup items the audit identified. None is a code change of consequence; each is a decision about how the project is organized, tracked, or labeled. Bundled here because each is too small to be its own spec and because they share an "agree once, sweep" shape.

## Findings to address

- **`gas/` directory: legacy or active?** The pre-migration Google Apps Script source still lives at [gas/](../../gas/). It has its own `package.json`, runs `npm install` in CI, but isn't shipped. Decide: archive it (move to a `legacy/` branch or external repo), delete it, or document its active purpose. Until decided, every new contributor wonders.
- **`specs/` archival hygiene.** 16+ feature specs exist; many describe an architecture that has since changed. Specs 002, 003, 005–014 are all shipped. Decide whether shipped specs get a `Status: Archived` tag, get moved to a `specs/archived/` subdirectory, or stay as-is. Either way, document the rule so a new contributor reading the specs knows which ones are still load-bearing.
- **`dev/plans/` status markings.** Eight planning docs under [dev/plans/](../../dev/plans/) with no `Status: Done | Active | Abandoned` markers. A 5-minute pass adds a one-line status header to each.
- **`.claude/CLAUDE.md` "Recent Changes" staleness.** Only one entry (from 002-typescript-migration) appears in the auto-grown section, despite 13 specs having shipped since. Either it's a `speckit` tooling bug, in which case fix the hook, or it needs a manual top-up. Decide which.
- **Postman collection currency.** Constitution Testing section requires that [scripts/postman/tonic-api.postman_collection.json](../../scripts/postman/tonic-api.postman_collection.json) match the routes. No test enforces this. Either add a script that diffs the collection against [src/routes/api.ts](../../src/routes/api.ts) at lint time, or do a one-time manual reconciliation and document the manual sync expectation more loudly than the constitution currently does.
- **`viewModel` carve-out vs. rename.** Constitution Principle V says the viewModel was dissolved in spec 011. But [feedback.ts](../../src/web/js/feedback.ts) still uses a `FeedbackViewModel` interface, and [tests/unit/web/viewModel.test.ts](../../tests/unit/web/) still exists. Two choices: (a) rename them so the constitution is true, or (b) amend Principle V to document the carve-out. Pick one.
- **API_TESTING.md replacement.** If [015-audit-remediation](../015-audit-remediation/spec.md) US1 chose "replace the file with a pointer to the Postman collection," verify that worked. If it chose "fix the curl examples in place," verify the examples still work.

## Why this is deferred

None of these is a code-shape change; each is a decision that, once made, is mechanical to apply. Pulling them into [015-audit-remediation](../015-audit-remediation/spec.md) would have padded that spec with a long tail of paper cuts. Doing them as one focused sweep here is faster.

## Dependencies

- Should ship after [015-audit-remediation](../015-audit-remediation/spec.md) so the doc work doesn't conflict.
- Independent of 016/017/018/019.
