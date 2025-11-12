# Scripts Directory

This directory contains utility scripts for managing the Tonic application deployment and versioning.

## 📁 Available Scripts

### Setup Verification

- **`verify-google-auth.js`** - Standalone verification of Google Sheets service account authentication
- **`db-schema-extractor.js`** - Extract database schema from Google Sheets for analysis

### Version Management

- **`version-manager.sh`** - Semantic version management (patch/minor/major increments)

### Data Migration

- **`migrations/prod-to-staging-full.js`** - Full production to staging data migration

## 🔧 Script Usage

### Setup Verification

Verify Google Sheets service account authentication during initial setup or after credential changes:

```bash
# Run the verification script
npm run verify:google-auth

# Or run directly
node scripts/verify-google-auth.js
```

This script validates:
- Environment variables are set correctly
- Private key format is valid
- Authentication succeeds with Google
- Can access the configured spreadsheet

Use this when:
- Setting up a new environment (dev/staging/production)
- Rotating service account credentials
- Troubleshooting authentication failures during app startup

### Database Schema Extraction

Extract the actual schema from the staging Google Sheets database:

```bash
node scripts/db-schema-extractor.js
```

This script:
- Dynamically discovers all sheets in the spreadsheet
- Analyzes column structure and data types
- Provides sample values for each column
- Generates a comprehensive schema summary

### Version Management

The version manager handles semantic versioning for releases:

```bash
# Auto-increment patch version for development
./scripts/version-manager.sh auto

# Manual version increments
./scripts/version-manager.sh patch    # 1.1.8 → 1.1.9
./scripts/version-manager.sh minor    # 1.1.8 → 1.2.0
./scripts/version-manager.sh major    # 1.1.8 → 2.0.0

# Check for version overflow
./scripts/version-manager.sh check-overflow
```

## 🚀 Deployment Process

Deployment is handled automatically by **Google Cloud Build** when pushing to specific branches or tags.

### Staging Deployment

1. **Create and push a version tag:**

   ```bash
   # Increment version (using version manager)
   ./scripts/version-manager.sh patch

   # Create and push tag
   git add package.json
   git commit -m "Bump version to $(node -p 'require("./package.json").version')"
   git tag "v$(node -p 'require("./package.json").version')"
   git push origin dev --tags
   ```

2. **Cloud Build automatically:**
   - Triggers on semver tags (^v[0-9]+\.[0-9]+\.[0-9]+$)
   - Builds Docker image
   - Deploys to `tonic-staging` Cloud Run service

3. **Verify deployment:**

   ```bash
   # Check staging deployment
   curl https://tonic-staging-253019293832.us-west1.run.app/api/health
   curl https://tonic-staging-253019293832.us-west1.run.app/api/version
   ```

### Production Deployment

1. **Merge to main branch:**

   ```bash
   git checkout main
   git merge dev
   git push origin main
   ```

2. **Cloud Build automatically:**
   - Triggers on main branch pushes
   - Builds Docker image
   - Deploys to `tonic-production` Cloud Run service

3. **Verify deployment:**

   ```bash
   # Check production deployment
   curl https://tonic-production-432276680561.us-west1.run.app/api/health
   curl https://tonic-production-432276680561.us-west1.run.app/api/version
   ```

## 📊 Environment Variables Required

Environment variables are configured in Google Cloud Run service settings. **See [docs/technical/ENVIRONMENT_VARIABLES.md](../docs/technical/ENVIRONMENT_VARIABLES.md) for the complete list and configuration details.**

## 🔍 Health Monitoring

Both services expose a health endpoint:

- **Production:** `https://tonic-production-432276680561.us-west1.run.app/api/health`
- **Staging:** `https://tonic-staging-253019293832.us-west1.run.app/api/health`

## 🛠️ Local Testing of Build Process

```bash
# Test the full build process locally
npm run deploy:check

# Test environment-specific builds
npm run build:production
npm run build:staging

# Test health endpoint (local)
npm run health
```

## 📋 Deployment Checklist

- [ ] Environment variables configured in Google Cloud Run
- [ ] Service accounts created and keys downloaded
- [ ] Google Sheets permissions granted to service accounts
- [ ] Secret Manager configured for sensitive credentials
- [ ] Custom domains configured (optional)
- [ ] Health checks passing
- [ ] Both staging and production services deployed

## 🚨 Troubleshooting

### Common Build Issues

1. **Environment variables not set** - Check Cloud Run service configuration
2. **Google Sheets access denied** - Verify service account permissions
3. **Health check failing** - Check if `/api/health` endpoint is accessible
4. **Build timeout** - Check Cloud Build logs for errors

### Debug Commands

```bash
# Check environment setup (local)
node -e "console.log(process.env)"

# Test Google Sheets connection
curl -X POST https://your-app.run.app/api/testConnection

# View Cloud Build logs
gcloud builds list --limit=5
gcloud builds log <BUILD_ID>

# View Cloud Run logs
gcloud run services logs read tonic-staging --limit=50
gcloud run services logs read tonic-production --limit=50
```

### Version Mismatch Issues

If deployed version doesn't match expected:

1. **Check if Cloud Build ran:**
   - Visit Google Cloud Console → Cloud Build → History
   - Verify the build succeeded

2. **Check environment variables:**
   - Deployed apps should have `CLOUD_BUILD=true`
   - Check Cloud Run service environment variables

3. **Verify tag/branch:**
   - Staging: Check if correct semver tag was pushed
   - Production: Check if main branch has latest changes

### Version Endpoints Showing Different Values

This usually indicates environment variable issues in the deployment. Check both `/api/health` and `/api/version` endpoints to identify discrepancies.

## 🔄 Deployment Workflow

1. **Development** → Push to feature branch
2. **Staging** → Create version tag → Auto-deploy to Cloud Run staging
3. **Production** → Merge to `main` → Auto-deploy to Cloud Run production

This setup provides automated, reliable deployments with proper environment separation and health monitoring.

## 🏗️ Build Configuration

The actual build and deployment configuration is in:
- `src/build/cloudbuild.yaml` - Google Cloud Build configuration
- `src/build/Dockerfile` - Container build instructions

## 📋 Script Prerequisites

Make sure scripts are executable:

```bash
chmod +x scripts/*.sh
```

Required tools:
- `curl` - For API endpoint testing
- `node` - For version management
- `git` - For version tagging
- `gcloud` - For Google Cloud Platform management (optional, for debugging)

These scripts complement the automated CI/CD pipeline by providing manual verification and version management capabilities.
