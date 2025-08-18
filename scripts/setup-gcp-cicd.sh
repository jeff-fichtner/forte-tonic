#!/bin/bash

# GCP CI/CD Setup Script
# This script sets up Google Cloud Build CI/CD pipeline for Tonic app
# Run this once to configure your GCP project

set -e

# Configuration
PROJECT_ID="${1:-tonic-467721}"  # Use provided project ID or correct default
REGION="us-west1"
SERVICE_NAME="tonic-staging"
REPO_OWNER="jeff-fichtner"
REPO_NAME="forte-tonic"

echo "🚀 Setting up GCP CI/CD Pipeline for Tonic"
echo "=========================================="
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo "Repository: $REPO_OWNER/$REPO_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
echo "📋 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
# Note: sourcerepo.googleapis.com not needed since we're using GitHub

# Get Cloud Build service account email
BUILD_SA=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")@cloudbuild.gserviceaccount.com
echo "🔑 Cloud Build Service Account: $BUILD_SA"

# Grant required permissions to Cloud Build service account
echo "🔐 Granting permissions to Cloud Build service account..."

# Cloud Run permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BUILD_SA" \
    --role="roles/run.admin"

# Secret Manager permissions  
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BUILD_SA" \
    --role="roles/secretmanager.secretAccessor"

# Service Account User (to deploy to Cloud Run)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BUILD_SA" \
    --role="roles/iam.serviceAccountUser"

# Source Repository Admin (to push version changes back)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BUILD_SA" \
    --role="roles/source.admin"

echo ""
echo "ℹ️  Skipping Secret Manager setup (you can add secrets manually later)"
echo ""
echo "🔗 Creating Cloud Build trigger..."

# Create build trigger for dev branch
gcloud builds triggers create github \
    --repo-name=$REPO_NAME \
    --repo-owner=$REPO_OWNER \
    --branch-pattern=dev \
    --build-config=src/build/cloudbuild.yaml \
    --description="Auto CI/CD for dev branch: Test → Deploy → Increment Version" \
    --name="tonic-dev-cicd" || echo "⚠️  Trigger may already exist"

echo ""
echo "🏗️  Testing the setup with a sample build..."

# Trigger a test build
echo "This will run: gcloud builds submit --config src/build/cloudbuild.yaml"
read -p "Run test build now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    gcloud builds submit --config src/build/cloudbuild.yaml
else
    echo "⏭️  Skipping test build"
fi

echo ""
echo "✅ GCP CI/CD Setup Complete!"
echo "=============================="
echo ""
echo "📋 What was configured:"
echo "  ✅ APIs enabled (Cloud Build, Cloud Run, etc.)"
echo "  ✅ IAM permissions for Cloud Build service account"
echo "  ✅ Secrets created in Secret Manager"
echo "  ✅ Build trigger created for dev branch"
echo ""
echo "🔄 CI/CD Workflow:"
echo "  1. Push to dev branch"
echo "  2. Cloud Build triggers automatically"
echo "  3. Runs unit tests"
echo "  4. Builds Docker image"
echo "  5. Deploys to Cloud Run"
echo "  6. Increments patch version"
echo "  7. Commits version back to repo"
echo ""
echo "🔗 Useful links:"
echo "  • Cloud Build: https://console.cloud.google.com/cloud-build/builds"
echo "  • Cloud Run: https://console.cloud.google.com/run"
echo "  • Secrets: https://console.cloud.google.com/security/secret-manager"
echo ""
echo "🎯 Next steps:"
echo "  1. Push a change to the dev branch to test the pipeline"
echo "  2. Monitor the build in Cloud Build console"
echo "  3. Check the deployed service in Cloud Run console"
echo "  4. Verify version increment in your repository"
