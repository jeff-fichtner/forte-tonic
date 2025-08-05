# Render Deployment Guide

## Two-Environment Architecture (Recommended)

### Option 1: Separate Services for Each Environment ✅

This is the **recommended approach** for production applications:

**Production Service:**
- Service Name: `tonic-production`
- Branch: `main`
- Domain: `tonic.yourschool.edu`

**Staging Service:**
- Service Name: `tonic-staging` 
- Branch: `develop`
- Domain: `tonic-staging.yourschool.edu`

### Benefits of Separate Services
- ✅ Complete environment isolation
- ✅ Independent scaling and resources
- ✅ Safe testing without production impact
- ✅ Different databases/spreadsheets per environment
- ✅ Parallel deployments possible

## Environment Variables Setup

### Production Service Environment Variables

**Environment Variables:** See `docs/ENVIRONMENT_VARIABLES.md` for the complete list of required variables and example values for production and staging environments.

### Setting Environment Variables in Render

1. Go to your service dashboard in Render
2. Navigate to "Environment" tab
3. Add each required variable listed in the documentation
4. Use the appropriate values for production vs staging

**Note:** Don't set `PORT` - Render provides this automatically.

### Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable APIs:
   - Google Drive API
   - Google Sheets API
4. Create Service Accounts (one for each environment):
   - **Production Service Account:** For production data access
   - **Staging Service Account:** For staging data access
   - Download JSON key files for each

### Deployment Workflow

**Development → Staging → Production**

1. **Feature Development:**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git commit -m "Add new feature"
   git push origin feature/new-feature
   ```

2. **Staging Deployment:**
   ```bash
   # Create PR to develop branch
   # After merge to develop → auto-deploys to staging
   ```

3. **Production Deployment:**
   ```bash
   # Create PR from develop to main
   # After merge to main → auto-deploys to production
   ```

## Render Service Configuration

### Render Blueprint (config/render.yaml)

The project includes a Render Blueprint file at `config/render.yaml` that defines both staging and production environments as Infrastructure-as-Code.

**To use this blueprint:**
1. In your Render dashboard, go to "Blueprints"
2. Click "New Blueprint"
3. Connect your GitHub repository
4. Specify the blueprint file path: `config/render.yaml`
5. Render will create both services automatically

### Service Configuration

**All build settings and auto-deploy configuration are defined in `config/render.yaml`.** Do not duplicate these settings manually in the Render dashboard.

### Custom Domains Setup

**Production:**
- Add custom domain: `tonic.yourschool.edu`
- Configure DNS CNAME record

**Staging:**
- Add custom domain: `tonic-staging.yourschool.edu`
- Configure DNS CNAME record

### Data Separation Strategy

**Google Sheets Setup:**
- **Production:** Use your live school data spreadsheet
- **Staging:** Create a copy of production spreadsheet for testing

**Service Account Permissions:**
- **Production Service Account:** Access only to production spreadsheet
- **Staging Service Account:** Access only to staging spreadsheet

## Alternative Architectures

### Option 2: Single Service with Environment Switching

If you prefer one service but want environment control:

```javascript
// In your server configuration
const environment = process.env.NODE_ENV || 'development';
const config = {
  production: {
    spreadsheetId: process.env.PROD_SPREADSHEET_ID,
    serviceAccount: process.env.PROD_SERVICE_ACCOUNT_EMAIL
  },
  staging: {
    spreadsheetId: process.env.STAGING_SPREADSHEET_ID,
    serviceAccount: process.env.STAGING_SERVICE_ACCOUNT_EMAIL
  }
};
```

**Limitations:**
- ⚠️ Only one environment active at a time
- ⚠️ Manual deployment switching required
- ⚠️ Less isolation between environments

## Monitoring & Health Checks

### Health Check Endpoint

Add to your application:

```javascript
// In src/routes/api.js
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});
```

### Render Dashboard Monitoring

- Set up health checks for both services
- Configure alerts for production service downtime
- Monitor resource usage and performance metrics

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
