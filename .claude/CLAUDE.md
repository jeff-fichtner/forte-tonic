<!-- MANUAL ADDITIONS START -->
# Project Instructions for Claude Code

## Constitution

All development on this project is governed by the [Tonic Constitution](../.specify/memory/constitution.md). Read it before making any changes.

## Agent Behavior

- If you identify improvements beyond what was requested, STOP and ASK before adding them.
- Never disable tests to work around failures.

# currentDate
Today's date is 2026-02-18.
<!-- MANUAL ADDITIONS END -->

## Active Technologies
- TypeScript 5.x targeting ES2022, running on Node.js (ESM) + Express 4, Google Sheets API v4, tsx (runtime), ts-jest (testing), typescript-eslint (linting) (002-typescript-migration)
- Google Sheets API v4 (unchanged) (002-typescript-migration)
- TypeScript 5.x targeting ES2022 + Express 4, Google Sheets API v4, googleapis (003-db-layer-simplification)
- Google Sheets (single spreadsheet, column-index mapped) (003-db-layer-simplification)
- TypeScript 5.x targeting ES2022, Node.js ESM + Express 4, Google Sheets API v4 (004-service-layer-cleanup)
- Google Sheets (single spreadsheet, column-index mapped, 5-min in-memory cache) (004-service-layer-cleanup)
- TypeScript 5.x targeting ES2022 + Jest 29.x, ts-jest (ESM preset), supertest 7.x, @jest/globals (006-backend-test-coverage)
- N/A (all tests mock the Google Sheets layer) (006-backend-test-coverage)
- TypeScript 5.x targeting ES2022, browser environmen + Vite 7.x (build), MaterializeCSS 1.0.0 (CDN, UI library) (008-frontend-type-hardening)
- N/A (frontend only; API calls via HttpService) (008-frontend-type-hardening)
- TypeScript 5.x targeting ES2022 + Express 4 (backend), Vite 7.x (frontend build), MaterializeCSS 1.0.0 (UI), googleapis (Google Sheets) (009-frontend-decomposition)
- TypeScript 5.x targeting ES2022, browser environmen + MaterializeCSS 1.0.0 (CDN), Vite 7.x (build) (010-frontend-tab-cleanup)
- N/A — frontend only; API calls via `HttpService` (010-frontend-tab-cleanup)
- TypeScript 5.x targeting ES2022, browser environmen + MaterializeCSS 1.0.0 (CDN), `ModalKeyboardHandler`, `HttpService` (011-dissolve-viewmodel)
- Google Sheets API v4 (single spreadsheet, column-index mapped, 5-min in-memory cache) (012-server-side-availability)
- TypeScript 5.x targeting ES2022, Node.js ESM + Express 4, googleapis (Google Sheets API v4), tsx (runtime) (013-migration-system)
- Google Sheets (single spreadsheet, column-index mapped) — new `_migrations` sheet for tracking (013-migration-system)
- TypeScript 5.x targeting ES2022, Node.js (ESM) for backend; TypeScript 5.x targeting ES2022 for browser code + Express 4, Google Sheets API v4 (googleapis), Vite 7 (frontend build), MaterializeCSS 1.0 (UI), tsx (runtime), Jest 29 with ts-jest (ESM preset) (014-summer-registration)
- Google Sheets (single spreadsheet, column-index mapped, 5-minute in-memory cache); two new sheets — `registrations_summer` and `registrations_summer_audit` — created via 013-style runtime migration at app startup (014-summer-registration)
- TypeScript 5.x targeting ES2022, Node.js (ESM) for backend; TypeScript 5.x targeting ES2022 for browser code + Express 4, Google Sheets API v4 (googleapis), Vite 7 (frontend build), MaterializeCSS 1.0 (UI), tsx (runtime), Jest 29 with ts-jest (ESM preset), Supertest 7 (015-audit-remediation)
- N/A — docs, inline JSDoc comments, tests with mocked `googleSheetsDbClient`, one TypeScript interface relocation; no schema or migration changes (015-audit-remediation)

## Recent Changes
- 015-audit-remediation: Constitution amendment adding Principle XII (Speckit Stays in Speckit Spaces, 2.3.1 → 2.4.0); three new reference docs at `docs/technical/{ARCHITECTURE,API,FRONTEND}.md` plus a `CONTRIBUTING.md` maintenance contract; canonical `AuthenticatedUser` interface consolidated into `src/web/js/auth/session.ts`; uniform `isValidTrimester()` validation across all `RegistrationController` write methods; speckit-lineage sweep across `src/`, `tests/`, `docs/`, and root-level Markdown so the shipped artifact stands alone if `specs/` is deleted; new test coverage for the auth middleware, cache service, two thin repositories, and the logger; new end-to-end test pinning the summer grade-bump from data layer through controller; durable `findings.md` artifact at `specs/015-audit-remediation/findings.md` with 29 audit findings mapped to their owner specs (015 closes some; 016-020 inherit the rest). Two surprising auth-ladder behaviors pinned in tests for a follow-up in 016.
- 002-typescript-migration: Added TypeScript 5.x targeting ES2022, running on Node.js (ESM) + Express 4, Google Sheets API v4, tsx (runtime), ts-jest (testing), typescript-eslint (linting)
