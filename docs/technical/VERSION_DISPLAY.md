# Version Display System

This system provides automatic version display for the staging environment while keeping development clean.

## How It Works

### Development Environment
- **Version**: Always shows `v0.0.0-dev`
- **Build Date**: Static date `2025-01-01T00:00:00.000Z`
- **Git Commit**: Shows `new-dev`
- **Display**: Version badge is **hidden** in development

### Staging Environment (Cloud Build)
- **Version**: Uses actual `package.json` version
- **Build Date**: Current timestamp when deployed
- **Git Commit**: From `BUILD_GIT_COMMIT` environment variable
- **Display**: Version badge is **visible** in upper-right corner

### Production Environment
- **Version**: Uses actual `package.json` version
- **Build Date**: Current timestamp when deployed
- **Git Commit**: From `BUILD_GIT_COMMIT` environment variable
- **Display**: Version badge is **hidden** in production

## Environment Detection

The system detects build server environments using:
- `process.env.CI` (CI/CD build environment - GitHub Actions, Cloud Build)

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

### Version Management and Deployment
```bash
# Increment version (patch increment recommended)
./scripts/version-manager.sh patch

# Increment minor version
./scripts/version-manager.sh minor

# Increment major version
./scripts/version-manager.sh major

# After version increment, commit and deploy
git add package.json
git commit -m "Bump version to $(node -p 'require("./package.json").version')"
git tag "v$(node -p 'require("./package.json").version')"
git push origin dev --tags  # Triggers Cloud Build deployment
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
- Check if `CI` environment variable is set on build server
- Verify git commit hash in `BUILD_GIT_COMMIT`

### Deployment Issues
- Ensure scripts are executable: `chmod +x scripts/*.sh`
- Check git status before deploying
- Verify all tests pass before deployment
