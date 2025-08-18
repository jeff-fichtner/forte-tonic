#!/bin/bash

# GCP CI/CD Cleanup Script
# This script removes all resources created by setup-gcp-cicd.sh
# Use this if you need to start over

set -e

PROJECT_ID="${1:-tonic-production}"
REGION="us-central1"
SERVICE_NAME="tonic-staging"

echo "🧹 Cleaning up GCP CI/CD Pipeline for Tonic"
echo "==========================================="
echo "Project ID: $PROJECT_ID"
echo ""

# Set project
gcloud config set project $PROJECT_ID

# Get Cloud Build service account email
BUILD_SA=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")@cloudbuild.gserviceaccount.com
echo "🔑 Cloud Build Service Account: $BUILD_SA"

echo ""
echo "🗑️  Removing IAM permissions..."

# Remove Cloud Build permissions
gcloud projects remove-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BUILD_SA" \
    --role="roles/run.admin" || echo "⚠️  Permission may not exist"

gcloud projects remove-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BUILD_SA" \
    --role="roles/secretmanager.secretAccessor" || echo "⚠️  Permission may not exist"

gcloud projects remove-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BUILD_SA" \
    --role="roles/iam.serviceAccountUser" || echo "⚠️  Permission may not exist"

gcloud projects remove-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BUILD_SA" \
    --role="roles/source.admin" || echo "⚠️  Permission may not exist"

echo ""
echo "🔒 Deleting secrets from Secret Manager..."

# Delete secrets (will prompt for confirmation)
gcloud secrets delete working-spreadsheet-id --quiet || echo "⚠️  Secret may not exist"
gcloud secrets delete google-service-account-email --quiet || echo "⚠️  Secret may not exist"  
gcloud secrets delete google-private-key --quiet || echo "⚠️  Secret may not exist"
gcloud secrets delete github-token --quiet || echo "⚠️  Secret may not exist"

echo ""
echo "🔗 Deleting Cloud Build trigger..."

# Delete build trigger
gcloud builds triggers delete tonic-dev-cicd --quiet || echo "⚠️  Trigger may not exist"

echo ""
echo "☁️  Deleting Cloud Run service..."

# Delete Cloud Run service
gcloud run services delete $SERVICE_NAME --region=$REGION --quiet || echo "⚠️  Service may not exist"

echo ""
echo "🐳 Listing container images (manual cleanup required)..."
echo "Run these commands to delete container images if needed:"
echo ""
gcloud container images list --repository=gcr.io/$PROJECT_ID || echo "No images found"

echo ""
echo "✅ Cleanup Complete!"
echo "==================="
echo ""
echo "📋 What was removed:"
echo "  ✅ IAM permissions for Cloud Build service account"
echo "  ✅ Secrets deleted from Secret Manager" 
echo "  ✅ Build trigger deleted"
echo "  ✅ Cloud Run service deleted"
echo ""
echo "⚠️  What was NOT removed:"
echo "  • GCP APIs (left enabled - safe to keep)"
echo "  • Container images (list shown above for manual cleanup)"
echo ""
echo "🔄 To start over:"
echo "  Run: ./scripts/setup-gcp-cicd.sh $PROJECT_ID"
