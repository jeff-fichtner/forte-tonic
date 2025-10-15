# Scripts Directory# Scripts Directory



This directory contains utility scripts for managing the Tonic application deployment and versioning.This directory contains utility scripts for managing the Tonic application deployment and versioning.



## 📁 Available Scripts## 📁 Available Scripts



### Version Management### Version Management

- **`version-manager.sh`** - Semantic version management (patch/minor/major increments)- **`version-manager.sh`** - Semantic version management (patch/minor/major increments)

- **`check-deployed-version.sh`** - Verify deployed versions on GCP Cloud Run- **`check-deployed-version.sh`** - Verify deployed versions on GCP Cloud Run



## 🔧 Script Usage## 🔧 Script Usage



### Version Management### Version Management

The version manager handles semantic versioning for releases:The version manager handles semantic versioning for releases:



```bash```bash

# Auto-increment patch version for development# Auto-increment patch version for development

./scripts/version-manager.sh auto./scripts/version-manager.sh auto



# Manual version increments# Manual version increments

./scripts/version-manager.sh patch    # 1.1.8 → 1.1.9./scripts/version-manager.sh patch    # 1.1.8 → 1.1.9

./scripts/version-manager.sh minor    # 1.1.8 → 1.2.0./scripts/version-manager.sh minor    # 1.1.8 → 1.2.0

./scripts/version-manager.sh major    # 1.1.8 → 2.0.0./scripts/version-manager.sh major    # 1.1.8 → 2.0.0



# Check for version overflow# Check for version overflow

./scripts/version-manager.sh check-overflow./scripts/version-manager.sh check-overflow

``````



### Deployment Verification### 2. Deploy to Staging

Check what version is currently deployed:```bash

# Ensure you're on develop branch

```bashgit checkout develop

# Check staging deploymentgit push origin develop

./scripts/check-deployed-version.sh staging

# Or use the deployment script

# Check production deployment  ./scripts/deploy.sh staging

./scripts/check-deployed-version.sh production```

```

### 3. Deploy to Production

This will show:```bash

- Health endpoint version info# Ensure you're on main branch  

- Detailed version endpoint datagit checkout main

- Local package.json version for comparisongit push origin main

- Environment and build information

# Or use the deployment script

## 🚀 Deployment Process./scripts/deploy.sh production

```

Deployment is handled automatically by Google Cloud Build:

## 🔧 Build Commands Used by Render

### Staging Deployment

1. **Create and push a version tag:**- **Build Command:** `npm ci` (or use prebuild script)

   ```bash- **Start Command:** `npm start`

   # Increment version (using version manager)- **Health Check:** `/api/health`

   ./scripts/version-manager.sh patch

   ## 📊 Environment Variables Required

   # Create and push tag

   git add package.jsonSet environment variables in your Render dashboard for each service. **See `docs/ENVIRONMENT_VARIABLES.md` for the complete list and configuration details.**

   git commit -m "Bump version to $(node -p 'require("./package.json").version')"

   git tag "v$(node -p 'require("./package.json").version')"## 🔍 Health Monitoring

   git push origin dev --tags

   ```Both services expose a health endpoint:

- **Production:** `https://tonic-production.onrender.com/api/health`  

2. **Cloud Build automatically:**- **Staging:** `https://tonic-staging.onrender.com/api/health`

   - Triggers on semver tags (^v[0-9]+\.[0-9]+\.[0-9]+$)

   - Builds Docker image## 🛠️ Local Testing of Build Process

   - Deploys to `tonic-staging` Cloud Run service

```bash

3. **Verify deployment:**# Test the full build process locally

   ```bashnpm run deploy:check

   ./scripts/check-deployed-version.sh staging

   ```# Test environment-specific builds

npm run build:production

### Production Deploymentnpm run build:staging

1. **Merge to main branch:**

   ```bash# Test health endpoint

   git checkout mainnpm run health

   git merge dev```

   git push origin main

   ```## 📋 Deployment Checklist



2. **Cloud Build automatically:**- [ ] Environment variables configured in Render dashboard

   - Triggers on main branch pushes- [ ] Service accounts created and keys downloaded

   - Builds Docker image- [ ] Google Sheets permissions granted to service accounts

   - Deploys to `tonic-production` Cloud Run service- [ ] Custom domains configured (optional)

- [ ] Health checks passing

3. **Verify deployment:**- [ ] Both staging and production services deployed

   ```bash

   ./scripts/check-deployed-version.sh production## 🚨 Troubleshooting

   ```

### Common Build Issues

## 📋 Script Prerequisites1. **Environment variables not set** - Check Render dashboard configuration

2. **Google Sheets access denied** - Verify service account permissions

Make sure scripts are executable:3. **Health check failing** - Check if `/api/health` endpoint is accessible

```bash4. **Build timeout** - Consider upgrading Render plan for more resources

chmod +x scripts/*.sh

```### Debug Commands

```bash

Required tools:# Check environment setup

- `curl` - For API endpoint testingnode -e "console.log(process.env)"

- `python3` - For JSON formatting (optional, graceful fallback)

- `node` - For version management# Test Google Sheets connection

- `git` - For version taggingcurl -X POST https://your-app.onrender.com/api/testConnection



## 🔍 Troubleshooting# Monitor deployment logs

# (View in Render dashboard under service logs)

### Version Mismatch Issues```

If deployed version doesn't match expected:

## 🔄 Deployment Workflow

1. **Check if Cloud Build ran:**

   - Visit Google Cloud Console → Cloud Build → History1. **Development** → Push to feature branch

   - Verify the build succeeded2. **Staging** → Merge to `develop` → Auto-deploy to staging

3. **Production** → Merge to `main` → Auto-deploy to production

2. **Check environment variables:**

   - Deployed apps should have `CLOUD_BUILD=true`This setup provides automated, reliable deployments with proper environment separation and health monitoring.

   - Check Cloud Run service environment variables

3. **Verify tag/branch:**
   - Staging: Check if correct semver tag was pushed
   - Production: Check if main branch has latest changes

### Version Endpoints Showing Different Values
This usually indicates environment variable issues in the deployment. The deployment verification script will show both endpoints to help identify discrepancies.

## 🏗️ Build Configuration

The actual build and deployment configuration is in:
- `src/build/cloudbuild.yaml` - Google Cloud Build configuration
- `src/build/Dockerfile` - Container build instructions

These scripts complement the automated CI/CD pipeline by providing manual verification and version management capabilities.