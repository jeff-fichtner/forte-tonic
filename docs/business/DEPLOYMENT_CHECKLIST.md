# Render Two-Environment Deployment Checklist

## Pre-Deployment Setup

### Google Cloud Setup
- [ ] Create Google Cloud Project
- [ ] Enable Google Sheets API
- [ ] Enable Google Drive API
- [ ] Create **Production** Service Account
- [ ] Create **Staging** Service Account
- [ ] Download JSON key files for both accounts
- [ ] Create staging copy of production spreadsheet
- [ ] Grant service account access to respective spreadsheets

### GitHub Repository Setup
- [ ] Ensure `main` branch is production-ready
- [ ] Create `develop` branch for staging
- [ ] Set up branch protection rules
- [ ] Configure CI/CD if needed

## Render Dashboard Setup

### Step 1: Create Services Using Blueprint

1. **Access Render Dashboard:**
   - [ ] Go to https://dashboard.render.com/
   - [ ] Navigate to "Blueprints" section

2. **Import Blueprint:**
   - [ ] Click "New Blueprint"
   - [ ] Connect your GitHub repository  
   - [ ] Set blueprint file path: `config/render.yaml`
   - [ ] Review the configuration
   - [ ] Click "Create Blueprint"

This will automatically create both production and staging services.

### Step 2: Configure Environment Variables

**Production Domain:**
- [ ] Add custom domain: `tonic.yourschool.edu`
- [ ] Configure DNS CNAME: `tonic-production.onrender.com`
- [ ] Verify SSL certificate

**Staging Domain:**
- [ ] Add custom domain: `tonic-staging.yourschool.edu`
- [ ] Configure DNS CNAME: `tonic-staging.onrender.com`
- [ ] Verify SSL certificate

## Testing Deployment

### Health Check Testing
- [ ] Production health check: `https://[production-url]/api/health`
- [ ] Staging health check: `https://[staging-url]/api/health`

### Functionality Testing
- [ ] Test authentication on both environments
- [ ] Verify Google Sheets connectivity
- [ ] Test all major features
- [ ] Verify environment-specific configurations

### Performance Testing
- [ ] Load testing on staging
- [ ] Monitor resource usage
- [ ] Check response times

## Deployment Workflow

### Daily Development
1. [ ] Create feature branch from `develop`
2. [ ] Develop and test locally
3. [ ] Create PR to `develop`
4. [ ] Test on staging after merge
5. [ ] Create PR from `develop` to `main` for production

### Emergency Hotfixes
1. [ ] Create hotfix branch from `main`
2. [ ] Apply fix and test
3. [ ] Deploy directly to production
4. [ ] Merge back to `develop`

## Monitoring Setup

### Render Dashboard
- [ ] Set up email alerts for production downtime
- [ ] Configure resource usage alerts
- [ ] Monitor deployment logs

### Application Monitoring
- [ ] Test health check endpoints
- [ ] Monitor application logs
- [ ] Set up error tracking if needed

## Security Checklist

- [ ] Environment variables are secure (no hardcoded secrets)
- [ ] Different service accounts for each environment
- [ ] Production data isolated from staging
- [ ] HTTPS enforced on both environments
- [ ] Regular security updates scheduled

## Troubleshooting

### Common Issues
- [ ] Environment variables formatted correctly (especially private keys)
- [ ] Service account permissions configured
- [ ] Spreadsheet IDs are correct
- [ ] Health checks are responding

### Log Monitoring
- [ ] Check Render deployment logs
- [ ] Monitor application startup logs
- [ ] Watch for Google Sheets API errors

## Post-Deployment

- [ ] Document environment URLs
- [ ] Share access credentials with team
- [ ] Schedule regular backups
- [ ] Plan monitoring and maintenance schedule

---

## Quick Commands

### Test Health Endpoints
```bash
# Production
curl https://[production-url]/api/health

# Staging  
curl https://[staging-url]/api/health
```

### Deploy Commands
```bash
# Deploy to staging
git push origin develop

# Deploy to production
git push origin main
```
