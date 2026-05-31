# Feature Specification: Frontend Test Infrastructure

**Feature Branch**: `019-frontend-test-infrastructure`
**Created**: 2026-05-30
**Status**: Stub
**Part of**: Audit remediation cluster (specs 015–020)
**Previous**: [018-business-rules-to-config](../018-business-rules-to-config/spec.md)
**Next**: [020-project-hygiene](../020-project-hygiene/spec.md)

> **This is a stub, not a spec.** Captures intent only. The real spec is
> authored on this branch when the work is picked up.

## Overview

The frontend SPA — ~4500 lines across registration form components, tabs, and utilities — is effectively untestable today. [config/jest.config.js](../../config/jest.config.js) uses `testEnvironment: 'node'` with no jsdom, so the few frontend "tests" that exist are pure-logic tests that never touch the DOM. This spec sets up jsdom and then backfills coverage for the highest-value DOM components.

## Findings to address

- **Jest jsdom environment.** Add jsdom as a per-test-file environment so DOM-using tests can opt in via `@jest-environment jsdom` pragma, or as the global default for `tests/unit/web/` while leaving `tests/unit/` at node. Decide which.
- **TabController + BaseTab lifecycle tests** exist but only cover the logic, not DOM rendering. Once jsdom is in place, extend them to assert that `render()` actually mutates the DOM correctly.
- **Registration form components.** The 11 files under `src/web/js/components/registrationForm/` are zero-coverage today. Each is a focused responsibility (student selector, class selector, etc.) and is amenable to component-level tests once jsdom is available. Prioritize `cascadingFilterChips.ts` (888 lines, the most complex piece) and `parentPrivateSubmission.ts` (the submit path).
- **HttpService integration.** Tests exist for the logic; once jsdom is available, add a test that exercises the localStorage → headers chain end to end.
- **Stale `viewModel.test.ts`.** This test file exists despite Constitution Principle V saying the viewModel was dissolved. Decide whether to delete it or rename it to whatever it actually tests today. (Also flagged in [020-project-hygiene](../020-project-hygiene/spec.md).)

## Why this is deferred

Adding jsdom is a multi-day infrastructure change — it touches Jest config, ts-jest config, the ESM preset, every test file's environment declarations, and CI runtime. It is also a prerequisite for any future frontend test work, so it deserves its own focused spec rather than being a side task inside [015-audit-remediation](../015-audit-remediation/spec.md).

## Dependencies

- Independent of 016/017/018/020.
- Useful before [022-intent-phase-reduction](../022-intent-phase-reduction/spec.md) if that work touches the registration UI.
