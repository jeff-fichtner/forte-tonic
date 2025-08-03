# Render Deployment Setup

This directory contains build configuration and automation for deploying Tonic to Render.

## 📁 Files in This Setup

### Core Configuration
- **`config/render.yaml`** - Infrastructure as Code blueprint for both staging and production
- **`.env.render.template`** - Template for environment variables needed in Render
- **`package.json`** - Enhanced with Render-optimized build scripts

### Build Scripts
- **`scripts/render-prebuild.sh`** - Pre-build validation and setup
- **`scripts/render-postbuild.sh`** - Post-build testing and verification  
- **`scripts/deploy.sh`** - Automated deployment script

### CI/CD
- **`.github/workflows/ci-cd.yml`** - GitHub Actions for automated testing

## 🚀 Quick Deployment Guide

### 1. Initial Setup

```bash
# Copy environment template
cp .env.render.template .env.render
# Edit with your actual values (don't commit this file)

# Make scripts executable
chmod +x scripts/*.sh
```

### 2. Deploy to Staging
```bash
# Ensure you're on develop branch
git checkout develop
git push origin develop

# Or use the deployment script
./scripts/deploy.sh staging
```

### 3. Deploy to Production
```bash
# Ensure you're on main branch  
git checkout main
git push origin main

# Or use the deployment script
./scripts/deploy.sh production
```

## 🔧 Build Commands Used by Render

- **Build Command:** `npm ci` (or use prebuild script)
- **Start Command:** `npm start`
- **Health Check:** `/api/health`

## 📊 Environment Variables Required

Set environment variables in your Render dashboard for each service. **See `docs/ENVIRONMENT_VARIABLES.md` for the complete list and configuration details.**

## 🔍 Health Monitoring

Both services expose a health endpoint:
- **Production:** `https://tonic-production.onrender.com/api/health`  
- **Staging:** `https://tonic-staging.onrender.com/api/health`

## 🛠️ Local Testing of Build Process

```bash
# Test the full build process locally
npm run deploy:check

# Test environment-specific builds
npm run build:production
npm run build:staging

# Test health endpoint
npm run health
```

## 📋 Deployment Checklist

- [ ] Environment variables configured in Render dashboard
- [ ] Service accounts created and keys downloaded
- [ ] Google Sheets permissions granted to service accounts
- [ ] Custom domains configured (optional)
- [ ] Health checks passing
- [ ] Both staging and production services deployed

## 🚨 Troubleshooting

### Common Build Issues
1. **Environment variables not set** - Check Render dashboard configuration
2. **Google Sheets access denied** - Verify service account permissions
3. **Health check failing** - Check if `/api/health` endpoint is accessible
4. **Build timeout** - Consider upgrading Render plan for more resources

### Debug Commands
```bash
# Check environment setup
node -e "console.log(process.env)"

# Test Google Sheets connection
curl -X POST https://your-app.onrender.com/api/testConnection

# Monitor deployment logs
# (View in Render dashboard under service logs)
```

## 🔄 Deployment Workflow

1. **Development** → Push to feature branch
2. **Staging** → Merge to `develop` → Auto-deploy to staging
3. **Production** → Merge to `main` → Auto-deploy to production

This setup provides automated, reliable deployments with proper environment separation and health monitoring.
