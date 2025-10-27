# Tonic Music Registration System

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Main Branch](https://github.com/jeff-fichtner/forte-tonic/actions/workflows/main-branch.yml/badge.svg)](https://github.com/jeff-fichtner/forte-tonic/actions/workflows/main-branch.yml)
[![Dev Branch](https://github.com/jeff-fichtner/forte-tonic/actions/workflows/dev-branch.yml/badge.svg?branch=dev)](https://github.com/jeff-fichtner/forte-tonic/actions/workflows/dev-branch.yml)

A Node.js web application for automated student registration in after-school music programs. Features role-based access control, Google Sheets integration, and a responsive single-page frontend.

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
- **Modern Stack**: Express.js API + Vanilla JavaScript SPA with ViewModel pattern
- **Platform-Agnostic**: Containerized deployment on any Docker-compatible host

Originally a Google Apps Script application, migrated to Node.js for improved performance and maintainability.

## Key Features

**Parents**: Register students, view schedules, track attendance  
**Instructors**: Manage rosters, mark attendance, view teaching schedule  
**Admins**: Full system access, user management, reporting, cache control

**Technical**: Intelligent caching, data validation, audit logging, mobile-responsive UI

## System Architecture

**Backend**: Controller → Service → Repository pattern with Express.js
**Frontend**: Vanilla JavaScript SPA with ViewModel pattern
**Database**: Google Sheets via API with service account authentication
**Auth**: Phone number (parents) or 6-digit AccessCode (staff)

**Key Components**:
- 9 Services (1 application, 4 domain, 4 supporting)
- 4 Repositories (all extend BaseRepository with consistent caching)
- RESTful API with Express.js
- Service container for dependency injection

See [docs/technical/ARCHITECTURE_COMPLETE.md](docs/technical/ARCHITECTURE_COMPLETE.md) for detailed architecture information.

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

**Authentication**: `/api/authenticateByAccessCode`
**Users**: `/api/getStudents`, `/api/getInstructors`, `/api/getAdmins`
**Registration**: `/api/registrations` (POST, DELETE), `/api/getClasses`
**Attendance**: `/api/attendance`, `/api/attendance/summary/:id`
**System**: `/api/health`, `/api/version`

Full API docs in `docs/generated/`.

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
npm run format && npm run lint && npm test
```

All checks must pass for GitHub Actions to succeed.

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
├── repositories/       # Data access
├── services/          # Business logic
├── models/            # Domain models
├── middleware/        # Auth, validation
├── routes/            # API routes
├── database/          # Google Sheets client
├── utils/             # Helpers
└── web/               # Frontend SPA

gas/                   # Google Apps Script migrations
tests/                 # Unit & integration tests
docs/                  # Documentation
config/                # ESLint, Prettier, Jest
```

## Contributing

1. Fork and create feature branch (`feature/amazing-feature`)
2. Make changes following code standards
3. Add tests for new functionality
4. Run `npm run format && npm run lint && npm test`
5. Commit with conventional commit format
6. Create Pull Request

**Branch Strategy**: `main` (production) ← `dev` (integration) ← `feature/*`

## Documentation

**Business**: [Hosting Proposal](docs/business/TECHNICAL_HOSTING_PROPOSAL.md) | [Privacy Policy](docs/business/PRIVACY_POLICY.md)  
**Technical**: [Architecture](docs/technical/ARCHITECTURE.md) | [Environment Setup](docs/technical/ENVIRONMENT_VARIABLES.md) | [Migration Guide](docs/technical/MIGRATION_SUMMARY.md)

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Version**: 1.1.15
**Last Updated**: October 15, 2025  
**Node.js**: 18+
