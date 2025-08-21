# Tonic - Claude Code Project Memory

## Project Overview
**Tonic** is a student registration automation system for after-school lessons and programs. Originally built as a Google Apps Script project, it has been migrated to Node.js while preserving all functionality and user interface.

## Tech Stack
- **Backend**: Node.js + Express.js (ES Modules)
- **Database**: Google Sheets (via Google Sheets API)
- **Frontend**: Vanilla JavaScript (ES Modules), HTML, CSS
- **Authentication**: Google Service Account authentication + access codes
- **Testing**: Jest (unit + integration)
- **Deployment**: Google Cloud Run (staging/production)

## Key Commands

### Development
```bash
npm run dev              # Start with nodemon
npm start               # Production start
npm run start:direct   # Direct server start
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

## Architecture

### Backend Structure
```
src/
├── app.js                    # Express app configuration
├── server.js                 # Server entry point
├── controllers/              # Request handlers
├── services/                 # Business logic
├── repositories/             # Data access layer
├── models/shared/           # Domain models
├── middleware/              # Auth & request processing
├── routes/                  # Route definitions
├── utils/                   # Utilities & helpers
└── web/                     # Frontend assets
```

### Key Services
- **Authentication**: Access code-based auth + operator support
- **User Management**: Admin, Instructor, Parent, Student models
- **Registration**: Student registration workflow
- **Google Sheets Integration**: Custom database client
- **Email**: Nodemailer integration

## User Types & Authentication
- **Operator**: System operator (configured via environment)
- **Admin**: School administrators
- **Instructor**: Music instructors
- **Parent**: Student parents/guardians
- **Student**: Enrolled students

Authentication uses access codes stored in Google Sheets, with operator email override capability.

## Environment Setup
Required environment variables (see `.env.example`):
- Google Cloud credentials and spreadsheet IDs
- Email configuration
- Operator settings
- Port and environment configs

## Database
Uses Google Sheets as database with custom client (`googleSheetsDbClient.js`). Includes migration system in `gas-src/` for database management.

## Testing Strategy
- Unit tests for individual modules
- Integration tests for API endpoints
- Mocking for Google Sheets and external services
- Coverage reporting available

## Deployment
- **Staging**: Google Cloud Run with auto-deployment
- **Production**: Manual deployment process
- Scripts in `/scripts/` for deployment automation

## Current Branch Status
- Working on: `feature/86aavnr89-gcp` (GCP deployment setup)
- Base branch: `main`
- Modified files: `scripts/setup-gcp-cicd.sh`

## Development Notes
- Project migrated from Google Apps Script to Node.js
- ES Modules throughout (no CommonJS)
- Comprehensive documentation in `/docs/`
- Service container pattern for dependency injection
- Follows professional Node.js patterns

## Common Tasks
- **New feature**: Start with planning using TodoWrite tool
- **Bug fixes**: Check logs, run tests, use debugging scripts
- **Code changes**: Always run `npm run check:all` before committing
- **Authentication debugging**: Check middleware/auth.js:68-183 for user extraction logic