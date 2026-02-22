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

## Recent Changes
- 002-typescript-migration: Added TypeScript 5.x targeting ES2022, running on Node.js (ESM) + Express 4, Google Sheets API v4, tsx (runtime), ts-jest (testing), typescript-eslint (linting)
