# Render Wind-Down Checklist

`*` indicates current position

## 0 Finish GCP prod deployment
- [x] Verify service account has `roles/secretmanager.secretAccessor`
- [x] Make **Editor** `tonic-production-sa@tonic-production-16201.iam.gserviceaccount.com` on `forte_tonic_prod`
- [x] Finish testing GCP Production

## 1 Test staging
- [x] Validate [staging](https://tonic-staging.onrender.com/) without MIGRATION_URL shows configuration error correctly
- [x] Add to Render tonic-staging environment: `MIGRATION_URL = https://tonic-staging-253019293832.us-west1.run.app` and restart tonic-staging deployment
- [x] Watch Render dashboard for successful build
- [x] Verify log: `[Migration Notice] Migration mode ENABLED`
- [x] Test [staging](https://tonic-staging.onrender.com/)
- [x] Verify application loads without errors
- [x] Test Google Sheets integration (read/write)
- [x] Check browser console for errors

## 2 QA
- [x] Visit Render staging URL
- [x] Verify full-screen migration overlay displays
- [x] Verify "We've Moved!" message
- [x] Verify 10-second countdown works
- [x] Click "Visit New Site" button → navigates to GCP
- [x] Wait for auto-redirect → navigates to GCP after 10s
- [x] Verify GCP staging loads correctly from navigation

## 2.5 Pre-production
- [x] Ensure GCP is configured correctly
- [x] Add to Render tonic-production environment: `MIGRATION_URL = https://tonic-production-432276680561.us-west1.run.app`
- [x] Ensure GCP stays warm
- [x] *Update finalsite to show GCP URL (which should be now live and tested)

## 3 Test production
- [x] `git push origin render/main`
- [x] Verify log: `[Migration Notice] Migration mode ENABLED`
- [x] Test [production](https://tonic-kxz5.onrender.com/)
- [x] Verify application loads without errors
- [x] Test Google Sheets integration (read/write)
- [x] Check browser console for errors
 
### Rollback IF NEEDED
- Check out previous commit
- `git push origin render/main`

## 4 Staging Decommission Prep
- [x] Reset `dev`
- [x] Confirm CI/CD no longer deploys to Render staging

## 5 Staging Decommission
- [x] Render Dashboard → tonic-staging → Settings → Delete Service

## 6 Staging Decommission Cleanup
- [x] Update deployment docs
- [x] Confirm migration notice continues working on Render

## 7 Production Decommission Prep
- [x] Confirm no active production users
- [x] Confirm team aware of production decommission
- [x] Confirm CI/CD no longer deploys to Render production

## 8 Production Decommission ⚠️ POINT OF NO RETURN ⚠️
- [x] Render Dashboard → tonic-production → Settings → Delete Service

## 9 Old Tonic Project GCP Wind-down
- [x] Delete project
- [x] Remove service account access to dev/prod sheets for old service accounts

## 9 Final checks
- [x] No Render code in codebase
- [x] No Render environment variables
- [x] Git branches cleaned up (render/main deleted)
- [x] CI/CD only references GCP
- [x] No broken documentation links
- [x] Render account deleted or services removed
- [x] GCP production fully operational
- [x] 100% traffic on GCP Cloud Run
- [x] Monitoring/alerting configured for GCP
- [x] All Render documentation removed/updated
- [x] Remove unnecessary security permissions for jeff
- [x] Make sure old tonic project and service account and all documents accessing service account are deleted

---

## Migration Complete - November 18, 2025

All Render infrastructure has been successfully decommissioned and replaced with Google Cloud Platform deployment:

### ✅ Completed Items
1. **Code Cleanup**: All Render-specific code and configuration removed
2. **Environment Variables**: Migrated to GCP Cloud Run with Secret Manager
3. **Git Branches**: `render/main` branch deleted (local and remote)
4. **CI/CD Pipeline**: GitHub Actions → Cloud Build → Cloud Run (tag-based deployments)
5. **Documentation**: Updated to reflect GCP deployment, removed Render references
6. **Infrastructure**: Both staging and production services active on GCP
7. **Traffic Migration**: 100% of traffic served from GCP Cloud Run
8. **Monitoring**: GCP Cloud Logging and monitoring configured
9. **Old Infrastructure**: Previous Render services decommissioned
10. **Service Accounts**: Old service accounts removed from spreadsheet access

### Current Deployment Architecture
- **CI/CD**: GitHub Actions (test, version, tag) → Cloud Build (build, deploy)
- **Staging**: Triggered by `v*-dev` tags → `tonic-staging` service
- **Production**: Triggered by `v*` tags → `tonic-production` service
- **Infrastructure**: Cloud Run with 512MB RAM, 1 vCPU, auto-scaling
- **Secrets**: Managed via GCP Secret Manager

This document is retained for historical reference.