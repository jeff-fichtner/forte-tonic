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

## Recent Changes
- 002-typescript-migration: Added TypeScript 5.x targeting ES2022, running on Node.js (ESM) + Express 4, Google Sheets API v4, tsx (runtime), ts-jest (testing), typescript-eslint (linting)
