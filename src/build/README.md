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
- Push to `dev` branch → triggers staging deployment
- Push to `main` branch → triggers production deployment
