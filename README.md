# Tonic

Designed to automate student registration for after school lessons and programs.

## Node.js Setup (Migrated from Google Apps Script)

1. **Clone repository:**

   ```bash
   git clone <repository-url>
   cd tonic
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your Google Cloud credentials and spreadsheet IDs
   ```

4. **Set up Google Cloud Console:**
   - Enable Google Sheets API
   - Create a Service Account and download the JSON key file
   - Share your Google Sheet with the service account email

5. **Run the application:**

   ```bash
   npm start
   # or for development:
   npm run dev
   ```

6. **Access the application:**
   - Open http://localhost:3000
   - Authenticate with Google
   - Use the application as before

## 🔒 Security

**Important:** This repository does NOT contain any real credentials or sensitive data. All sensitive information is loaded from environment variables or gitignored credential files.

- See `docs/ENVIRONMENT_VARIABLES.md` for configuration
- See `dev/credentials/README.md` for development setup
- Never commit real API keys, private keys, or production data

## Migration Notes

This project has been migrated from Google Apps Script to Node.js while preserving all original functionality:

- ✅ Same API endpoints and behavior
- ✅ Same user interface
- ✅ Service account authentication for Google Sheets access
- ✅ Same data operations (now uses Google Sheets API)
- ✅ Better performance and scalability

For detailed setup instructions, see [docs/NODE_SETUP.md](docs/NODE_SETUP.md)

## Google Apps Script Migrations

This project includes Google Apps Script migrations for database management:

### Quick Start

```bash
cd gas-src
npm run init    # First time setup and validation
npm run deploy  # Deploy migrations to Google Apps Script
```

### Environment Setup

Add to your `.env` file:

```bash
GOOGLE_APPS_SCRIPT_ID=your-google-apps-script-project-id
```

For detailed instructions, see [gas-src/README.md](gas-src/README.md)

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - Application architecture and design
- [Node.js Setup](docs/NODE_SETUP.md) - Detailed setup instructions
- [Migration Summary](docs/MIGRATION_SUMMARY.md) - Migration from Google Apps Script
- [Frontend ES Modules](docs/FRONTEND_ES_MODULES_MIGRATION.md) - Frontend modernization
- [Environment Setup](docs/ENV_CONSOLIDATION.md) - Environment configuration
- [Test Cleanup](docs/TEST_CLEANUP.md) - Testing setup and cleanup
- [Formatting Setup](docs/FORMATTING_SETUP.md) - Code formatting configuration
- [Render Deployment](docs/RENDER_DEPLOYMENT.md) - Deployment instructions

## Original Google Apps Script Version

The original GAS version setup instructions have been preserved in [docs/MIGRATION_SUMMARY.md](docs/MIGRATION_SUMMARY.md) for reference.
