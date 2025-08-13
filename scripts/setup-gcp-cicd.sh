#!/bin/bash

# GCP CI/CD Setup Script
# This script sets up Google Cloud Build CI/CD pipeline for Tonic app
# Run this once to configure your GCP project

set -e

# Configuration
PROJECT_ID="${1:-tonic-production}"  # Use provided project ID or default
REGION="us-central1"
SERVICE_NAME="tonic-staging"
REPO_OWNER="ndemoss-mcds"
REPO_NAME="Tonic"

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
gcloud services enable sourcerepo.googleapis.com

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
echo "🔒 Setting up secrets in Secret Manager..."

# Check if secrets exist, create if they don't
create_secret_if_not_exists() {
    local secret_name=$1
    local description=$2
    
    if gcloud secrets describe $secret_name >/dev/null 2>&1; then
        echo "✅ Secret '$secret_name' already exists"
    else
        echo "📝 Creating secret: $secret_name"
        echo "Please enter the value for $description:"
        read -s secret_value
        echo "$secret_value" | gcloud secrets create $secret_name --data-file=-
        echo "✅ Secret '$secret_name' created"
    fi
}

# Create required secrets
create_secret_if_not_exists "working-spreadsheet-id" "Working Spreadsheet ID"
create_secret_if_not_exists "google-service-account-email" "Google Service Account Email"
create_secret_if_not_exists "google-private-key" "Google Private Key (paste the entire key including -----BEGIN/END-----)"
create_secret_if_not_exists "github-token" "GitHub Personal Access Token (with repo permissions)"

echo ""
echo "🔗 Creating Cloud Build trigger..."

# Create build trigger for dev branch
gcloud builds triggers create github \
    --repo-name=$REPO_NAME \
    --repo-owner=$REPO_OWNER \
    --branch-pattern=dev \
    --build-config=cloudbuild.yaml \
    --description="Auto CI/CD for dev branch: Test → Deploy → Increment Version" \
    --name="tonic-dev-cicd" || echo "⚠️  Trigger may already exist"

echo ""
echo "🏗️  Testing the setup with a sample build..."

# Trigger a test build
echo "This will run: gcloud builds submit --config cloudbuild.yaml"
read -p "Run test build now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    gcloud builds submit --config cloudbuild.yaml
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
