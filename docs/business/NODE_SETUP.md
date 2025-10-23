# Node.js Migration Setup Guide

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create environment file:**

   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables in `.env`:**

   ```env
   NODE_ENV=development
   PORT=3000

   # Google Service Account credentials
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   # See docs/ENVIRONMENT_VARIABLES.md for complete reference and example values
   ```

4. **Run the server:**

   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

5. **Access the application:**
   - Open http://localhost:3000
   - The app uses service account authentication for Google Sheets access

## What Changed

### Backend Migration

- ✅ **Google Apps Script → Node.js + Express.js**
- ✅ **GAS APIs → Google Sheets/Drive APIs**
- ✅ **Service account authentication** for Google Sheets access
- ✅ **All original function names preserved** (getStudents, getClasses, etc.)

### Frontend Compatibility

- ✅ **Same API function names** - `getStudents()`, `getAdmins()`, `getInstructors()`, etc.
- ✅ **Same response format** - JSON strings matching original behavior
- ✅ **Same pagination** - page/pageSize parameters work identically
- ✅ **Same error handling** - Error messages preserved

### File Structure

```
src/
├── server.js              # Main Node.js server (replaces GAS runtime)
├── core/                   # Business logic (all converted to ES6 modules)
│   ├── clients/           # Google Sheets/Drive API clients
│   ├── models/            # Data models
│   ├── repositories/      # Data access layer
│   └── services/          # Business services
└── web/                   # Frontend files (unchanged)
    ├── index.html         # Main UI
    └── js/                # Client-side JavaScript
```

## Google Cloud Setup Required

1. **Create Google Cloud Project**
2. **Enable APIs:**
   - Google Sheets API
3. **Create Service Account:**
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Download JSON key file
   - Extract client_email and private_key for environment variables
4. **Share Google Sheets:**
   - Share your working spreadsheet with the service account email
   - Give Editor permissions

## Frontend Changes (Optional)

To use the new Node.js backend, replace the httpService include in your HTML:

**Original (Google Apps Script):**

```html
<script src="web/js/data/httpService.html"></script>
```

**New (Node.js):**

```html
<script src="web/js/data/httpService_node.html"></script>
```

Or keep the original httpService.html and it will automatically work with the Node.js server since the API endpoints match exactly.

## Migration Benefits

1. **Better Performance** - No more Google Apps Script execution limits
2. **Real Database Operations** - Proper async/await instead of blocking calls
3. **Modern Development** - ES6 modules, npm packages, proper debugging
4. **Scalability** - Can be deployed to any cloud platform
4. **Service Account Authentication** - Direct API access instead of user authentication

## Troubleshooting

- **API access issues**: Check Google Cloud Service Account configuration and spreadsheet permissions
- **Spreadsheet access**: Ensure service account has proper permissions
- **CORS errors**: Verify origin URLs in environment configuration
- **Missing data**: Check Google Sheets API quotas and permissions
