# Version Display System

This system provides automatic version display for the staging environment while keeping development clean.

## How It Works

### Development Environment
- **Version**: Always shows `v0.0.0-dev`
- **Build Date**: Static date `2025-01-01T00:00:00.000Z`
- **Git Commit**: Shows `local-dev`
- **Display**: Version badge is **hidden** in development

### Staging Environment (Render Build Server)
- **Version**: Uses actual `package.json` version
- **Build Date**: Current timestamp when deployed
- **Git Commit**: From `RENDER_GIT_COMMIT` environment variable
- **Display**: Version badge is **visible** in upper-right corner

### Production Environment
- **Version**: Uses actual `package.json` version 
- **Build Date**: Current timestamp when deployed
- **Git Commit**: From `RENDER_GIT_COMMIT` environment variable
- **Display**: Version badge is **hidden** in production

## Environment Detection

The system detects build server environments using:
- `process.env.RENDER` (Render.com build environment)
- `process.env.CI` (Generic CI environment)

## Usage

### Manual Version Increment
```bash
# Increment patch version (1.0.0 -> 1.0.1)
./scripts/version-manager.sh bump patch

# Increment minor version (1.0.0 -> 1.1.0)
./scripts/version-manager.sh bump minor

# Increment major version (1.0.0 -> 2.0.0)
./scripts/version-manager.sh bump major
```

### Deploy to Staging with Version Increment
```bash
# Deploy with patch increment (recommended)
./scripts/deploy-staging.sh patch

# Deploy with minor increment
./scripts/deploy-staging.sh minor

# Deploy with major increment
./scripts/deploy-staging.sh major
```

## Version Display Features

### Visual Design
- **Position**: Fixed to upper-right corner
- **Style**: Blue badge with white text
- **Font**: Monospace for clear version reading
- **Responsive**: Adapts to mobile screens

### Interactive Features
- **Click**: Shows detailed version information popup
- **Hover**: Slightly enlarges and brightens
- **Tooltip**: Displays full version details

### Information Shown
- **Main Display**: `vX.Y.Z STAGING | abc123d`
- **Click Popup**: Full version, environment, build date, git commit

## API Endpoint

The version information is available via REST API:

```bash
GET /api/version
```

Response:
```json
{
  "number": "1.2.3",
  "buildDate": "2025-08-04T08:11:14.160Z",
  "gitCommit": "abc123def456789",
  "environment": "staging",
  "isStaging": true,
  "displayVersion": true
}
```

## Benefits

1. **Clean Development**: No version pollution during local development
2. **Clear Staging**: Easy identification of deployed version on staging
3. **Automated Deployment**: Version increments only when deploying
4. **Git Integration**: Links deployments to specific commits
5. **Environment Awareness**: Different behavior per environment

## Troubleshooting

### Version Not Showing
- Check if `NODE_ENV=staging`
- Verify `displayVersion: true` in version object
- Check browser console for JavaScript errors

### Wrong Version Displayed
- Ensure `package.json` version was updated before deployment
- Check if `RENDER` environment variable is set on build server
- Verify git commit hash in `RENDER_GIT_COMMIT`

### Deployment Issues
- Ensure scripts are executable: `chmod +x scripts/*.sh`
- Check git status before deploying
- Verify all tests pass before deployment
