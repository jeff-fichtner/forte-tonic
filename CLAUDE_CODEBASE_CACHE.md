# Claude Codebase Cache - Tonic Music Registration System

**Last Updated:** August 31, 2025 at 16:11:28 PDT  
**Branch:** feature/86aavnr89-gcp  
**Status:** EXCELLENT CONDITION ✅

## Project Overview

The Tonic Music Registration System is a Node.js web application for automated student registration in after-school music lessons and programs. Successfully migrated from Google Apps Script to Node.js while preserving all functionality and dramatically improving maintainability and scalability.

## Development Commands & Quick Reference

### Development

```bash
npm run dev              # Start with nodemon
npm start               # Production start
npm run start:direct    # Direct server start
```

### Testing

```bash
npm test               # Run all tests
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests only
npm run test:coverage  # With coverage
npm run test:watch     # Watch mode
```

### Code Quality

```bash
npm run lint           # ESLint check
npm run lint:fix       # Auto-fix ESLint issues
npm run format         # Prettier formatting
npm run format:check   # Check formatting
npm run format:all     # Format + lint fix
npm run check:all      # Format check + lint + test
npm run build          # Full check (format + lint + test)
```

### Documentation

```bash
npm run docs           # Generate HTML docs
npm run docs:serve     # Serve docs with watch
```

## Current Health Status

- **ESLint Errors:** 0 ✅
- **ESLint Warnings:** 81 (Cosmetic only - unused variables, etc.)
- **Tests Status:** 151/151 PASSING ✅
- **Files Analyzed:** 221 files (221,511 lines of code)
- **Version:** 1.1.0
- **Deployment Status:** READY FOR PRODUCTION
- **Documentation Status:** CONSOLIDATED ✅

## Architecture Summary

- **Backend:** Express.js with Controller-Repository-Service pattern
- **Database:** Google Sheets API integration with caching layer
- **Frontend:** Vanilla JavaScript SPA with ViewModel pattern
- **Authentication:** Role-based access control (Parent/Instructor/Admin/Operator)
- **Deployment:** Docker + Google Cloud Run with CI/CD pipeline

## Key Features

- Multi-role registration system with phone number and access code authentication
- Real-time class availability checking and registration management
- Google Sheets integration for data persistence and spreadsheet-based workflows
- Responsive frontend with Materialize CSS and custom components
- Comprehensive testing suite with Jest (unit + integration tests)
- Production-ready Docker containerization and cloud deployment

## Current Development Focus

**Active Branch:** `feature/86aavnr89-gcp`

- Google Cloud Platform CI/CD implementation
- Enhanced deployment automation with Cloud Build
- Infrastructure as Code improvements
- Advanced development tooling and analysis capabilities

## Authentication & User Management

- **Operator**: System operator (configured via environment)
- **Admin**: School administrators
- **Instructor**: Music instructors
- **Parent**: Student parents/guardians (phone number authentication)
- **Student**: Enrolled students

Authentication uses access codes stored in Google Sheets, with operator email override capability. Phone number authentication for parents uses 10-digit validation.

## File Structure

```
src/
├── controllers/         # HTTP request handlers (4 files)
├── repositories/        # Data access layer (8 files)
├── services/           # Business logic layer (8 files)
├── models/             # Domain models (shared with frontend)
├── middleware/         # Express middleware (auth, validation)
├── routes/             # API route definitions
├── database/           # Google Sheets client
├── utils/              # Utility functions and helpers
└── web/                # Frontend SPA
    ├── js/             # JavaScript modules
    │   ├── components/ # Reusable UI components
    │   ├── data/       # Data access layer
    │   ├── utilities/  # Frontend utilities
    │   ├── workflows/  # Business workflows
    │   └── viewModel.js # Main application logic
    ├── css/            # Stylesheets
    └── index.html      # Main HTML file
```

## Technical Specifications

- **Node.js:** 18+ with ES Modules
- **Framework:** Express.js
- **Database:** Google Sheets API
- **Frontend:** Vanilla JavaScript, HTML5, CSS3 (Materialize)
- **Testing:** Jest with Supertest for integration tests
- **Code Quality:** ESLint + Prettier with JSDoc documentation
- **Deployment:** Docker containers on Google Cloud Run
- **CI/CD:** Google Cloud Build with automated pipelines

## Environment Configuration

- **Development:** `.env` with local configuration
- **Testing:** `.env.test` with isolated test data
- **Production:** Environment variables via Google Secret Manager
- **Security:** Helmet.js, CORS, proper credential management

## API Endpoints (Key)

- `POST /api/authenticateByAccessCode` - User authentication
- `POST /api/getOperatorUser` - Operator user retrieval
- `POST /api/registrations` - Student registration management
- `POST /api/getClasses` - Class availability checking
- `POST /api/attendance` - Attendance tracking
- `GET /api/health` - Health check endpoint
- `POST /api/admin/clearCache` - Cache management (admin only)

## Recent Major Changes

1. **ESLint Error Resolution:** Removed all 21 ESLint errors by eliminating unused private methods and fixing unreachable code
2. **GCP Infrastructure Enhancement:** Comprehensive CI/CD pipeline with Cloud Build integration
3. **Code Quality Improvements:** Enhanced analysis methodology with auto-fix capabilities
4. **Documentation Updates:** Complete README overhaul and technical documentation
5. **Authentication Improvements:** Enhanced user authentication process and validation

## Deployment Information

- **Current Status:** Ready for production deployment
- **Docker:** Multi-stage builds optimized for Cloud Run
- **Health Checks:** `/api/health` endpoint configured
- **Environment:** Cloud-native with proper secret management
- **Scaling:** Auto-scaling Cloud Run service configuration

## Development Setup

```bash
npm install              # Install dependencies
cp .env.example .env     # Configure environment
npm run dev             # Start development server
npm test                # Run test suite
npm run lint            # Check code quality
npm run format          # Format code
```

## Environment Configuration

Required environment variables (see `.env.example`):

- Google Cloud credentials and spreadsheet IDs
- Email configuration (optional)
- Operator settings
- Port and environment configs

## Common Development Tasks

- **New feature**: Start with planning using TodoWrite tool if complex
- **Bug fixes**: Check logs, run tests, use debugging scripts in `/tests/debug/`
- **Code changes**: Always run `npm run check:all` before committing
- **Authentication debugging**: Check `middleware/auth.js` for user extraction logic

## Documentation Organization

**Main Documentation:**

- `/README.md` - Project overview and setup
- `/docs/` - Business and technical documentation (organized)
- `/CLAUDE_CODEBASE_CACHE.md` - AI assistant reference (this file)

**Development Tools:**

- `/dev/tools/codebase-analysis/` - Automated analysis system
- Recent analysis: 221 files, 16,479 auth patterns, 3,446 API patterns

## Cache Validation

This cache represents the actual state of the codebase as of August 31, 2025 at 16:11 PDT. All information is based on fresh filesystem analysis, live command execution, and comprehensive AI-powered analysis.

**Documentation Consolidation Completed:**

- Merged duplicate Claude documentation files
- Removed redundant analysis templates
- Organized documentation structure with clear navigation
- Updated all cross-references and links

**Codebase Status:** EXCELLENT - Zero blocking issues, all tests passing, ready for production deployment.

## Recent Changes & Next Steps

1. **Documentation consolidation completed** ✅
2. Deploy to staging environment for validation
3. Merge feature/86aavnr89-gcp branch to main
4. Execute production deployment
5. Set up monitoring and alerting

---

_This cache is maintained by Claude Code and reflects the current state of the Tonic Music Registration System codebase._
