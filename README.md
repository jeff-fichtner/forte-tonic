# Tonic Music Registration System

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A comprehensive Node.js web application for automated student registration in after-school music lessons and programs. Built for educational institutions, Tonic provides a role-based registration system with Google Sheets integration for data persistence.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [User Roles](#user-roles)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## Overview

Tonic is designed to streamline music program registration for schools by providing:

- **AccessCode-based Authentication**: Secure login system for parents, instructors, and administrators
- **Role-based Access Control**: Different functionality based on user type (Parent/Employee/Admin)
- **Google Sheets Integration**: All data persisted to Google Sheets via Google Sheets API
- **Responsive Frontend**: Vanilla JavaScript SPA with ViewModel pattern and Materialize CSS
- **RESTful API**: Clean Controller-Repository architecture with Express.js

Originally built as a Google Apps Script application, Tonic has been migrated to Node.js for improved performance, scalability, and maintainability while preserving all original functionality.

## Key Features

### For Parents
- Register students for music lessons using phone number authentication
- View available classes and time slots
- Manage student registrations and attendance
- Real-time availability checking

### For Instructors  
- Access class rosters and student information
- Mark attendance for lessons
- View teaching schedule
- Manage class-specific details

### For Administrators
- Full system access and user management
- Create and modify classes, rooms, and schedules
- Generate reports and analytics
- System configuration and maintenance
- Cache management and data operations

### Technical Features
- **Caching System**: Intelligent caching with TTL for improved performance
- **Data Validation**: Comprehensive validation for all user inputs
- **Audit Trail**: Complete logging of all data modifications
- **Error Handling**: Robust error handling with user-friendly messages
- **Mobile Responsive**: Works seamlessly on all devices

## System Architecture

### Backend Architecture
```
src/
├── controllers/          # HTTP request handlers
├── repositories/         # Data access layer
├── services/            # Business logic layer
├── models/              # Domain models (shared with frontend)
├── middleware/          # Express middleware (auth, validation)
├── routes/              # API route definitions
├── database/            # Google Sheets client
├── utils/               # Utility functions and helpers
└── web/                 # Frontend assets
```

### Key Architectural Patterns
- **Controller-Repository Pattern**: Clean separation of concerns
- **Domain-Driven Design**: Rich domain models with business logic
- **Service Layer**: Business operations abstracted from controllers
- **Dependency Injection**: Service container for dependency management
- **Factory Pattern**: Model creation with multiple construction methods

### Authentication System
- **Parent Login**: Phone number (10-digit) authentication
- **Employee Login**: 6-digit AccessCode authentication  
- **Role Detection**: Automatic login type detection with fallback
- **Operator Mode**: Special administrative access mode

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Console account
- Google Sheets with appropriate structure
- Service account with Sheets API access

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tonic
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Google Cloud Console**
   - Enable Google Sheets API
   - Create a Service Account
   - Download the JSON key file
   - Share your Google Sheets with the service account email

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```bash
   NODE_ENV=development
   WORKING_SPREADSHEET_ID=your-spreadsheet-id-here
   GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   PORT=3000
   ```

   See [docs/technical/ENVIRONMENT_VARIABLES.md](docs/technical/ENVIRONMENT_VARIABLES.md) for complete variable reference.

5. **Run the application**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:3000
   - Use appropriate access codes based on your user role

## User Roles

### Parent Users
- **Authentication**: 10-digit phone number
- **Capabilities**: Student registration, schedule viewing, attendance tracking
- **Access Level**: Limited to own children's data

### Instructor Users  
- **Authentication**: 6-digit AccessCode
- **Capabilities**: Class management, attendance marking, roster access
- **Access Level**: Classes they teach

### Admin Users
- **Authentication**: 6-digit AccessCode  
- **Capabilities**: Full system access, user management, system configuration
- **Access Level**: Complete system administration

## API Documentation

### Authentication Endpoints
- `POST /api/authenticateByAccessCode` - Authenticate user by access code
- `POST /api/getOperatorUser` - Get current operator user

### User Management
- `POST /api/getAdmins` - Retrieve all administrators
- `POST /api/getInstructors` - Retrieve all instructors  
- `POST /api/getStudents` - Retrieve students (paginated)

### Registration System
- `POST /api/registrations` - Create new registration
- `POST /api/unregister` - Remove registration
- `POST /api/getRegistrations` - Get registrations (paginated)
- `POST /api/getClasses` - Get available classes (paginated)

### Attendance System
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/summary/:registrationId` - Get attendance summary

### System Operations
- `GET /api/health` - Health check endpoint
- `GET /api/version` - Application version
- `POST /api/admin/clearCache` - Clear system cache (admin only)

For detailed API documentation, see the generated docs at `docs/generated/`.

## Development

### Available Scripts

```bash
# Development
npm run dev                 # Start with auto-reload
npm start                  # Start production server

# Testing  
npm test                   # Run all tests
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests only
npm run test:coverage      # Run with coverage report

# Code Quality
npm run format             # Format code with Prettier
npm run lint               # Run ESLint
npm run format:all         # Format and lint fix
npm run check:all          # Check formatting and linting

# Documentation
npm run docs               # Generate API documentation
npm run docs:serve         # Serve documentation with live reload
```

### Testing Strategy

- **Unit Tests**: Individual component testing with Jest
- **Integration Tests**: API endpoint testing with Supertest  
- **Mock Testing**: Google Sheets API mocking for CI/CD
- **Debug Tests**: Development debugging utilities

### Code Standards

- **ESLint**: Enforced coding standards with Prettier integration
- **ES Modules**: Modern JavaScript module system
- **JSDoc**: Comprehensive code documentation
- **Conventional Commits**: Structured commit messages

## Deployment

### Production Deployment (Render)

The project includes Infrastructure-as-Code configuration for Render deployment:

1. **Two-Environment Setup**
   - **Production**: `main` branch → `tonic-production` service
   - **Staging**: `develop` branch → `tonic-staging` service

2. **Deploy with Blueprint**
   ```bash
   # Deploy using config/render.yaml
   # In Render Dashboard: New Blueprint → Select repository → Use config/render.yaml
   ```

3. **Environment Variables**
   Set required variables in Render Dashboard (see [ENVIRONMENT_VARIABLES.md](docs/technical/ENVIRONMENT_VARIABLES.md))

For detailed deployment instructions, see [docs/business/RENDER_DEPLOYMENT.md](docs/business/RENDER_DEPLOYMENT.md).

### Local Development Scripts

```bash
# Version management
npm run version:increment        # Patch version bump
npm run version:increment:minor  # Minor version bump  
npm run version:increment:major  # Major version bump

# Deployment preparation
npm run build                   # Run all checks and tests
npm run deploy:check           # Pre-deployment verification
```

## Project Structure

```
tonic/
├── 📁 src/                     # Application source code
│   ├── 📁 controllers/         # HTTP request handlers  
│   ├── 📁 repositories/        # Data access layer
│   ├── 📁 services/           # Business logic services
│   ├── 📁 models/             # Domain models (shared)
│   ├── 📁 middleware/         # Express middleware
│   ├── 📁 routes/             # API route definitions
│   ├── 📁 database/           # Google Sheets integration
│   ├── 📁 utils/              # Utility functions
│   ├── 📁 web/                # Frontend application
│   │   ├── 📁 js/             # JavaScript modules
│   │   │   ├── 📁 components/ # Reusable UI components
│   │   │   ├── 📁 data/       # Data access layer
│   │   │   ├── 📁 utilities/  # Frontend utilities
│   │   │   ├── 📁 workflows/  # Business workflows
│   │   │   └── viewModel.js   # Main application logic
│   │   ├── 📁 css/            # Stylesheets
│   │   └── index.html         # Main HTML file
│   ├── app.js                 # Express application setup
│   └── server.js              # Server entry point
├── 📁 gas-src/                # Google Apps Script utilities
│   ├── 📁 gas-migrations/     # Database migration scripts
│   └── Code.js                # Main GAS functions
├── 📁 tests/                  # Test suite
│   ├── 📁 unit/               # Unit tests
│   ├── 📁 integration/        # Integration tests
│   └── 📁 debug/              # Debug utilities
├── 📁 docs/                   # Documentation
│   ├── 📁 business/           # Business documentation
│   ├── 📁 technical/          # Technical documentation
│   └── 📁 generated/          # Auto-generated docs
├── 📁 config/                 # Configuration files
├── 📁 scripts/                # Deployment and utility scripts  
└── 📁 dev/                    # Development tools
    ├── 📁 tools/              # Analysis and development tools
    └── 📁 credentials/        # Development credentials
```

### Key Directories Explained

- **`src/`**: Main application source code with clean architecture separation
- **`src/web/`**: Single-page frontend application with ViewModel pattern
- **`gas-src/`**: Google Apps Script utilities and database migrations
- **`docs/`**: Comprehensive documentation split by audience (business/technical)
- **`tests/`**: Full test suite with multiple testing strategies
- **`config/`**: Build tools configuration (ESLint, Prettier, Babel, etc.)
- **`dev/`**: Development tools including codebase analysis utilities

## Google Apps Script Integration

### Data Persistence
- All data stored in Google Sheets via Google Sheets API
- Service account authentication for secure access
- Automatic data validation and type conversion
- Caching layer for improved performance

### Migration System
The `gas-src/` directory contains a complete migration system for database schema changes:

```bash
cd gas-src
npm run deploy        # Deploy migrations to Google Apps Script
npm run open          # Open GAS editor to run migrations
```

### Available Migrations
- **Active Migrations**: Current schema updates in `gas-migrations/active/`
- **Development Migrations**: Testing data in `gas-migrations/dev/`  
- **Recurring Migrations**: Periodic maintenance in `gas-migrations/recurring/`

## Contributing

### Development Workflow

1. **Fork and clone** the repository
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes** following code standards
4. **Add tests** for new functionality
5. **Run quality checks**: `npm run check:all`
6. **Commit changes**: Follow conventional commit format
7. **Push branch**: `git push origin feature/amazing-feature`
8. **Create Pull Request** with comprehensive description

### Code Quality Requirements
- All code must pass ESLint and Prettier checks
- Unit tests required for new functionality
- Integration tests for API changes
- JSDoc documentation for public methods
- No console errors or warnings

### Branch Strategy
- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/*`**: Feature development branches
- **`hotfix/*`**: Critical production fixes

## Documentation

### Business Documentation
- **[Technical Hosting Proposal](docs/business/TECHNICAL_HOSTING_PROPOSAL.md)**: Hosting recommendations
- **[Deployment Checklist](docs/business/DEPLOYMENT_CHECKLIST.md)**: Pre-deployment verification
- **[Privacy Policy](docs/business/PRIVACY_POLICY.md)**: Data handling policies

### Technical Documentation  
- **[Architecture Overview](docs/technical/ARCHITECTURE.md)**: System architecture details
- **[Environment Setup](docs/technical/ENVIRONMENT_VARIABLES.md)**: Configuration guide
- **[Migration Summary](docs/technical/MIGRATION_SUMMARY.md)**: GAS to Node.js migration details

## Security

**Important**: This repository does NOT contain any real credentials or sensitive data. All sensitive information is loaded from environment variables or gitignored credential files.

- Service account credentials via environment variables
- No hardcoded API keys or secrets
- Secure HTTPS-only production configuration
- Content Security Policy headers
- Input validation and sanitization

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For questions, issues, or contributions:

1. **Check existing issues** in the GitHub repository
2. **Review documentation** in the `docs/` directory  
3. **Create new issue** with detailed description
4. **Contact maintainers** for urgent matters

---

**Version**: 1.1.0  
**Last Updated**: August 31, 2025  
**Node.js**: 18+