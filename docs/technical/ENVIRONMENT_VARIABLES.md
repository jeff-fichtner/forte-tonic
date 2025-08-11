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
| `PORT` | Server port | `3000` | Development only (Render sets automatically) |
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

### `.env.render.template` (Production Deployment Template)  
- Purpose: Template for Render dashboard configuration
- Usage: Copy values to Render dashboard environment variables
- Environment: `staging` and `production`

### `.env.test` (Testing Environment)
- Purpose: Automated testing configuration
- Usage: Used by Jest test runner
- Environment: `test`

## Configuration Sources

### Primary Configuration
- **`config/render.yaml`** - Deployment configuration (build commands, health checks, etc.)
- **`src/config/environment.js`** - Runtime environment configuration
- **`src/core/services/configurationService.js`** - Service configuration management

### Documentation
- **`docs/RENDER_DEPLOYMENT.md`** - Deployment setup instructions
- **`docs/NODE_SETUP.md`** - Local development setup
- **`scripts/README.md`** - Build and deployment scripts

## Variable Naming Conventions

### ✅ Current Standard (Use These)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` (not `GOOGLE_CLIENT_EMAIL`)
- `WORKING_SPREADSHEET_ID` (not `SPREADSHEET_ID`)
- `NODE_ENV` (standard)
- `PORT` (standard)

### ⚠️ Legacy Variables (Being Phased Out)
- `GOOGLE_CLIENT_EMAIL` → Use `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_APPS_SCRIPT_ID` → No longer needed for Node.js version

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

### Render Production
```bash
# Set in Render dashboard
NODE_ENV=production
WORKING_SPREADSHEET_ID=your-prod-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-prod-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="your-prod-private-key"
```

### Render Staging
```bash
# Set in Render dashboard  
NODE_ENV=staging
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
