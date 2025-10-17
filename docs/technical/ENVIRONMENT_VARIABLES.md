# Environment Variables Reference

This document serves as the single source of truth for all environment variables used across the Tonic application.

## Core Environment Variables

### Required for All Environments

| Variable | Description | Example | Used In |
|----------|-------------|---------|---------|
| `NODE_ENV` | Application environment | `development`, `staging`, `production` | All environments |
| `WORKING_SPREADSHEET_ID` | Google Sheets spreadsheet ID | `your-spreadsheet-id-here` | All environments |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email | `service-account@project.iam.gserviceaccount.com` | All environments |
| `GOOGLE_PRIVATE_KEY` | Service account private key | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----` | All environments |

### Optional Variables

| Variable | Description | Default | Used In |
|----------|-------------|---------|---------|
| `PORT` | Server port | `3000` | Development only (set automatically in production) |
| `SERVICE_URL` | Base URL for the deployed service | - | Staging and production |
| `LOG_LEVEL` | Logging level | `info` | All environments |
| `ROCK_BAND_CLASS_IDS` | Comma-separated Rock Band class IDs for waitlist handling | `G001,G002` | All environments |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` | If email features used |
| `EMAIL_PORT` | SMTP port | `587` | If email features used |
| `EMAIL_USER` | Email username | - | If email features used |
| `EMAIL_PASS` | Email password | - | If email features used |

## Environment-Specific Files

### `.env.example` (Local Development Template)
- Purpose: Template for local development
- Usage: Copy to `.env` and fill in actual values
- Environment: `development`

### `.env.test` (Testing Environment)
- Purpose: Automated testing configuration
- Usage: Used by Jest test runner
- Environment: `test`

## Configuration Sources

### Primary Configuration
- **`src/config/environment.js`** - Runtime environment configuration
- **`src/services/configurationService.js`** - Service configuration management
- **`src/build/Dockerfile`** - Container build configuration

### Documentation
- **`docs/technical/NODE_SETUP.md`** - Local development setup
- **`scripts/README.md`** - Build and deployment scripts

## Variable Naming Conventions

All variables follow consistent naming patterns for clarity and maintainability:

- **`GOOGLE_SERVICE_ACCOUNT_EMAIL`** - Google Cloud service account email address
- **`GOOGLE_PRIVATE_KEY`** - Google Cloud service account private key (with newlines)
- **`WORKING_SPREADSHEET_ID`** - ID of the Google Sheets database
- **`NODE_ENV`** - Application environment (development, staging, production, test)
- **`PORT`** - Server port (defaults to 3000)
- **`LOG_LEVEL`** - Logging verbosity (error, warn, info, debug)

## Environment Setup Examples

### Local Development
```bash
# Copy template
cp .env.example .env

# Edit with your values
NODE_ENV=development
WORKING_SPREADSHEET_ID=your-dev-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-dev-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="your-dev-private-key"
```

### Production Environment
```bash
# Set in your hosting platform
NODE_ENV=production
SERVICE_URL=https://your-domain.com
WORKING_SPREADSHEET_ID=your-prod-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-prod-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="your-prod-private-key"
```

### Staging Environment
```bash
# Set in your hosting platform
NODE_ENV=staging
SERVICE_URL=https://staging.your-domain.com
WORKING_SPREADSHEET_ID=your-staging-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-staging-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="your-staging-private-key"
```

## Security Notes

- ✅ All environment files are in `.gitignore`
- ✅ Only templates are committed to version control
- ✅ Production keys should use separate service accounts
- ✅ Staging should use copies of production data, not live data
- ❌ Never commit actual keys or sensitive values

## Troubleshooting

### Common Issues
1. **Variable name mismatch** - Use the standard names listed above
2. **Missing newlines in private key** - Ensure proper escaping (`\n`)
3. **Wrong service account permissions** - Verify Google Sheets access
4. **Environment not set** - Check `NODE_ENV` is correctly configured

### Validation Commands
```bash
# Check environment variables are loaded
node -e "console.log(process.env.NODE_ENV)"
node -e "console.log(process.env.WORKING_SPREADSHEET_ID ? 'Spreadsheet ID set' : 'Missing spreadsheet ID')"

# Test configuration service
node -e "import('./src/core/services/configurationService.js').then(c => console.log('Config loaded'))"
```
