# Build Configuration

This directory contains the Google Cloud Platform build configuration files for the Tonic application.

## Files

### `cloudbuild.yaml`
- **Purpose**: Google Cloud Build CI/CD pipeline configuration
- **Triggers**: Automated deployment on push to dev/main branches
- **Workflow**: Test → Build → Deploy → Version increment
- **Location**: Must be referenced as `src/build/cloudbuild.yaml` in build triggers

### `Dockerfile`
- **Purpose**: Container image definition for the Node.js application
- **Base Image**: node:18-alpine (multi-stage build for optimization)
- **Build Context**: Project root (referenced as `src/build/Dockerfile`)
- **Target**: Production-ready container for Cloud Run

## Setup

The build trigger in GCP should reference these files with their relative paths:
- Build config: `src/build/cloudbuild.yaml`
- Dockerfile: `src/build/Dockerfile` (specified with `-f` flag)

## Usage

### Manual Build
```bash
# From project root
gcloud builds submit --config src/build/cloudbuild.yaml
```

### Automatic Deployment
- Push to `dev` branch → Creates `v*-dev` tag → Triggers staging deployment
- Merge to `main` branch → Creates `v*` tag → Triggers production deployment

## Cloud Build Trigger Configuration

Tonic uses tag-based deployments to ensure only tested code is deployed.

### Required Triggers in GCP Console

You must create **two separate triggers** in Google Cloud Console:

#### Staging Trigger

Navigate to: **Cloud Build → Triggers → Create Trigger**

Settings:
- **Name:** `tonic-staging-deploy`
- **Description:** Deploy to staging on dev pre-release tags
- **Event:** Tag
- **Source Repository:** (your GitHub repo)
- **Tag (regex):** `^v[0-9]+\.[0-9]+\.[0-9]+-dev$`
- **Configuration:** Cloud Build configuration file
- **Location:** `src/build/cloudbuild.yaml`
- **Substitution variables:**
  - `_ENV_TYPE` = `staging`
  - `_DEPLOY_REGION` = `us-west1`

**Example tags that trigger:** `v1.1.16-dev`, `v1.2.0-dev`, `v2.0.0-dev`

#### Production Trigger

Navigate to: **Cloud Build → Triggers → Create Trigger**

Settings:
- **Name:** `tonic-production-deploy`
- **Description:** Deploy to production on release tags
- **Event:** Tag
- **Source Repository:** (your GitHub repo)
- **Tag (regex):** `^v[0-9]+\.[0-9]+\.[0-9]+$`
- **Configuration:** Cloud Build configuration file
- **Location:** `src/build/cloudbuild.yaml`
- **Substitution variables:**
  - `_ENV_TYPE` = `production`
  - `_DEPLOY_REGION` = `us-west1`

**Example tags that trigger:** `v1.1.16`, `v1.2.0`, `v2.0.0`

### Tag Pattern Explanation

**Staging tags** must include `-dev` suffix:
- ✅ `v1.1.16-dev` - Matches staging trigger
- ❌ `v1.1.16` - Does NOT match staging trigger

**Production tags** must NOT have any suffix:
- ✅ `v1.1.16` - Matches production trigger
- ❌ `v1.1.16-dev` - Does NOT match production trigger

### How Tags Are Created

**Dev branch** (GitHub Actions):
- Automatically increments version in package.json
- Creates tag with `-dev` suffix: `v1.1.17-dev`
- Triggers staging deployment

**Main branch** (GitHub Actions):
- Creates tag from existing version (no increment)
- Tag has no suffix: `v1.1.17`
- Triggers production deployment

### Testing Triggers

Test your triggers manually:

```bash
# Test staging trigger
git tag v1.1.99-dev
git push origin v1.1.99-dev

# Test production trigger
git tag v1.1.99
git push origin v1.1.99
```

Monitor in GCP Console: **Cloud Build → History**
