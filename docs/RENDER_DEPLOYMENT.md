# Render Deployment Guide

## Environment Variables Setup

### Required Environment Variables for Render

Set these in your Render dashboard under "Environment":

```
PORT=3000
WORKING_SPREADSHEET_ID=your-actual-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
your-private-key-content
-----END PRIVATE KEY-----"
```

**Note:** Don't set `PORT` - Render provides this automatically.

### Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable APIs:
   - Google Drive API
   - Google Sheets API
4. Create Service Account:
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Download JSON key file

### Render Deployment Steps

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Configure build and start commands:
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
4. Set environment variables as listed above
5. Deploy!

### Local Development

1. Copy `.env.template` to `.env`
2. Fill in your actual Google Service Account credentials
3. Run `npm install`
4. Run `node src/server.js`

### Important Notes

- The application automatically detects the environment and configures URLs accordingly
- Render provides `RENDER_EXTERNAL_HOSTNAME` which is used for production URLs
- Make sure both local and production redirect URIs are added to Google Cloud Console
- Keep your `.env` file local only - never commit it to version control
