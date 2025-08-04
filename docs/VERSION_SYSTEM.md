# Version System with Render Deployment

This document explains how the version system works with Render's automatic deployment.

## How It Works

### Environment Detection
The system automatically detects whether it's running on Render's build server using environment variables:

```javascript
// In src/config/environment.js
if (process.env.RENDER || process.env.CI) {
  // Use actual package.json version and current timestamp
  return packageJson.version;
} else {
  // Use static dev version
  return '0.0.0-dev';
}
```

### Version Display Logic
- **Development** (`NODE_ENV=development`): Shows version badge with `v0.0.0-dev`
- **Staging** (`NODE_ENV=staging`): Shows version badge with actual version + git commit
- **Production** (`NODE_ENV=production`): No version badge (hidden)

## Render Configuration

### Automatic Deployment
Render is configured to automatically deploy when:
- **Staging**: Commits are pushed to the `dev` branch
- **Production**: Commits are pushed to the `main` branch

### Build Process
1. Render detects push to configured branch
2. Runs `npm ci && npm run build:staging` (or `build:production`)
3. Sets `RENDER=true` environment variable
4. Application detects Render environment and uses actual version
5. Version badge appears with current `package.json` version

### Environment Variables Set by Render
- `RENDER=true` - Indicates running on Render platform
- `RENDER_GIT_COMMIT` - Full git commit hash
- `NODE_ENV` - Set per service (staging/production)

## Deployment Workflow

### For Staging Deployment
```bash
# Increment version and deploy to staging
./scripts/deploy-staging.sh [patch|minor|major]
```

This script:
1. Increments version in `package.json`
2. Runs tests
3. Commits version bump
4. Creates deployment tag
5. Pushes to `dev` branch (triggers Render deployment)

### Manual Version Increment
```bash
# Just increment version without deployment
./scripts/version-bump.sh [patch|minor|major]
```

## Version Badge Behavior

### Local Development
- Shows: `v0.0.0-dev`
- Environment: `DEVELOPMENT`
- Commit: `local-d`

### Staging on Render
- Shows: `v1.2.3` (actual package.json version)
- Environment: `STAGING`
- Commit: First 7 chars of git commit hash

### Production on Render
- Version badge is hidden
- No visual version indicator

## File Structure
```
scripts/
├── deploy-staging.sh      # Full deployment with version increment
├── version-bump.sh        # Version increment only
└── deploy-production.sh   # (Future: production deployment)

src/config/environment.js  # Version detection logic
src/web/js/main.js         # Frontend version display
package.json               # Version source of truth
```

## Testing the System

### Test Version Endpoint
```bash
curl http://localhost:3000/api/version
```

### Test with Render Environment Variables
```bash
RENDER=true NODE_ENV=staging npm start
```

## Troubleshooting

### Version Badge Not Showing
1. Check browser console for initialization messages
2. Verify `/api/version` endpoint returns `displayVersion: true`
3. Check `NODE_ENV` is not set to `production`

### Wrong Version Displayed
1. Verify `RENDER` environment variable is set on build server
2. Check `package.json` version is correct
3. Ensure deployment script ran successfully

### Render Deployment Issues
1. Check Render dashboard for build logs
2. Verify branch triggers are configured correctly
3. Ensure environment variables are set in Render dashboard
