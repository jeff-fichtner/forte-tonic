# Render Wind-Down Checklist

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
- [ ] Ensure GCP stays warm
- [ ] Update finalsite to show GCP URL (which should be now live and tested)

## 3 Test production
- [ ] `git push origin render/main`
- [ ] Verify log: `[Migration Notice] Migration mode ENABLED`
- [ ] Test [production](https://tonic-kxz5.onrender.com/)
- [ ] Verify application loads without errors
- [ ] Test Google Sheets integration (read/write)
- [ ] Check browser console for errors
 
### Rollback IF NEEDED
- [ ] Check out previous commit
- [ ] `git push origin render/main`

## 4 Staging Decommission Prep
- [ ] Reset `dev`
- [ ] Confirm CI/CD no longer deploys to Render staging

## 5 Staging Decommission
- [ ] Render Dashboard → tonic-staging → Settings → Delete Service

## 6 Staging Decommission Cleanup
- [ ] Update deployment docs
- [ ] Confirm migration notice continues working on Render

## 7 Production Decommission Prep
- [ ] Confirm no active production users
- [ ] Confirm team aware of production decommission
- [ ] Confirm CI/CD no longer deploys to Render production

## 8 Production Decommission ⚠️ POINT OF NO RETURN ⚠️
- [ ] Render Dashboard → tonic-production → Settings → Delete Service

## 9 Old Tonic Project GCP Wind-down
- [ ] Delete project
- [ ] Remove service account access to dev/prod sheets for old service accounts

## 9 Final checks
- [ ] No Render code in codebase
- [ ] No Render environment variables
- [ ] Git branches cleaned up
- [ ] CI/CD only references GCP
- [ ] No broken documentation links
- [ ] Render account deleted or services removed
- [ ] GCP production fully operational
- [ ] 100% traffic on GCP Cloud Run
- [ ] Monitoring/alerting configured for GCP
- [ ] All Render documentation removed/updated
- [ ] Remove unnecessary security permissions for jeff