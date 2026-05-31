# Tonic Music Registration System

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
[![Main Branch](https://github.com/jeff-fichtner/forte-tonic/actions/workflows/main-branch.yml/badge.svg)](https://github.com/jeff-fichtner/forte-tonic/actions/workflows/main-branch.yml)
[![Dev Branch](https://github.com/jeff-fichtner/forte-tonic/actions/workflows/dev-branch.yml/badge.svg?branch=dev)](https://github.com/jeff-fichtner/forte-tonic/actions/workflows/dev-branch.yml)

A Node.js web application for automated student registration in after-school music programs. Features role-based access control, Google Sheets integration, and a TypeScript single-page frontend bundled by Vite.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## Overview

- **AccessCode Authentication**: Secure login for parents (phone), instructors, and admins (6-digit codes)
- **Role-Based Access**: Tailored functionality for parents, instructors, and administrators
- **Google Sheets Backend**: All data persisted via Google Sheets API
- **Modern Stack**: TypeScript on Node.js (ESM) with Express.js API + TypeScript SPA bundled by Vite (MaterializeCSS for UI)
- **Platform-Agnostic**: Containerized deployment on any Docker-compatible host

Originally a Google Apps Script application, migrated to Node.js for improved performance and maintainability. A legacy `gas/` directory remains in the repo for reference.

## Key Features

**Parents**: Register students, view schedules, track attendance  
**Instructors**: Manage rosters, mark attendance, view teaching schedule  
**Admins**: Full system access, user management, reporting, cache control

**Technical**: Intelligent caching, data validation, audit logging, mobile-responsive UI

## System Architecture

**Backend**: Controller → Service → Repository pattern with Express.js (TypeScript on Node.js, ESM via `tsx`)
**Frontend**: TypeScript SPA bundled by Vite; MaterializeCSS for UI; all HTTP goes through `HttpService` (the single chokepoint for API calls)
**Database**: Google Sheets API v4 with service account authentication; one spreadsheet per environment
**Auth**: Phone number (parents) or 6-digit AccessCode (staff); sent via `x-access-code` + `x-login-type` headers

**Key Components**:

- 6 Services in [src/services/](src/services/) (availability, configuration, dropRequest, entityQuery, period, registration)
- 6 entity Repositories in [src/repositories/](src/repositories/), all extending `BaseRepository` — note that `periodRepository` is deliberately uncached for time-sensitive routing
- 5-minute in-memory cache per pod ([src/cache/cacheService.ts](src/cache/cacheService.ts)); writes invalidate via `clearAllCache()`
- Homegrown lazy-singleton DI container ([src/infrastructure/container/serviceContainer.ts](src/infrastructure/container/serviceContainer.ts))

See [docs/technical/ARCHITECTURE.md](docs/technical/ARCHITECTURE.md) for the layer flow, error pipeline, cache strategy, auth flow, trimester/period model, DI container, build/deploy, and migrations.

## Getting Started

### Prerequisites

- Node.js 18+
- Google Sheets with service account access
- Google service account credentials (email + private key)

### Quick Start

1. **Install**

   ```bash
   git clone <repository-url>
   cd tonic
   npm install
   ```

2. **Configure**

   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run**

   ```bash
   npm start              # Production
   npm run dev            # Development with auto-reload
   ```

4. **Access**: http://localhost:3000

See [docs/technical/ENVIRONMENT_VARIABLES.md](docs/technical/ENVIRONMENT_VARIABLES.md) for configuration details.

## API Overview

All endpoints are defined in [src/routes/api.ts](src/routes/api.ts). Highlights:

**Public** (no authentication): `GET /api/health`, `GET /api/version`, `GET /api/configuration`, `POST /api/auth/access-code`

**Registration**: `POST /api/registrations`, `DELETE /api/registrations/:trimester/:id`, `PATCH /api/registrations/:trimester/:id/intent`

**Attendance**: `POST /api/attendance`, `GET /api/attendance/summary/:registrationId`

**Feedback**: `POST /api/feedback`

**Tab data**: `GET /api/{parent|instructor|admin}/tabs/{tab-name}/:trimester` — role-scoped tab endpoints return only what the tab needs.

**Admin only**: `POST /api/admin/clear-cache`

Endpoint details (request/response shapes per endpoint) live in [docs/technical/API.md](docs/technical/API.md).

## Development

### Scripts

```bash
# Development
npm run dev                 # Auto-reload development server
npm start                   # Production server

# Testing
npm test                    # All tests
npm run test:unit           # Unit tests only
npm run test:coverage       # With coverage report

# Code Quality
npm run format              # Auto-format with Prettier
npm run lint                # ESLint check
npm run check:all           # Format + lint check
```

### Pre-Commit Checklist

```bash
npm run check:all
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the authoritative checklist. All checks must pass for GitHub Actions to succeed.

## Deployment

Platform-agnostic containerized deployment. Works on any Docker-compatible host.

### Requirements

- Docker support
- Environment variables configured (see [ENVIRONMENT_VARIABLES.md](docs/technical/ENVIRONMENT_VARIABLES.md))
- Google Sheets API access

### Docker Deployment

```bash
docker build -f src/build/Dockerfile -t tonic:latest .
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e WORKING_SPREADSHEET_ID=your-sheet-id \
  -e GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com \
  -e GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..." \
  tonic:latest
```

### CI/CD

Example pipeline in `src/build/cloudbuild.yaml` demonstrates automated Docker builds and deployment. Testing runs via GitHub Actions before versioning and tagging.

## Project Structure

```
src/
├── controllers/        # HTTP handlers
├── repositories/       # Data access (all extend baseRepository)
├── services/           # Business logic
├── models/             # Domain models
│   └── shared/         # Models that run in both Node.js and browser
├── middleware/         # Auth, etc.
├── routes/             # API routes (api.ts is the source of truth)
├── database/           # googleSheetsDbClient.ts — Sheets API wrapper + cache
├── cache/              # 5-min in-memory cache (per pod)
├── common/             # errors, responseHelpers, gcpLogger, errorConstants
├── infrastructure/     # DI container, migration runner
├── migrations/         # Numbered, idempotent runtime migrations (auto-run on startup)
├── utils/              # Helpers
└── web/                # Frontend TypeScript SPA (Vite-bundled in prod)

gas/                    # Legacy Google Apps Script source (predecessor codebase, reference only)
tests/                  # Unit & integration tests (mock googleSheetsDbClient)
docs/                   # Documentation
config/                 # ESLint, Prettier, Jest, .env templates
scripts/                # Build, deploy, migration, Postman collection
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for code standards, commit practices, and the pre-commit checklist.

1. Create a feature branch off `dev`
2. Make changes; include tests for business logic
3. Run `npm run check:all` before every commit
4. Use conventional commit format
5. Open a PR to `dev`

**Branch Strategy**: `main` (production) ← `dev` (integration) ← feature branches

## Documentation

**Business**: [Privacy Policy](docs/business/PRIVACY_POLICY.md) | [Local Setup](docs/business/NODE_SETUP.md)
**Technical**: [Architecture](docs/technical/ARCHITECTURE.md) | [API Reference](docs/technical/API.md) | [Frontend](docs/technical/FRONTEND.md) | [Environment Variables](docs/technical/ENVIRONMENT_VARIABLES.md) | [Version Display](docs/technical/VERSION_DISPLAY.md) | [Branch Protection](docs/technical/BRANCH_PROTECTION.md)

## License

MIT License.

---

**Node.js**: 18+ — see `package.json` for the current version.
