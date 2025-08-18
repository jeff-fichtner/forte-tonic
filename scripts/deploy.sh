#!/bin/bash
# Deployment automation for Google Cloud Run
# Usage: ./scripts/deploy.sh [staging|production]

set -e  # Exit on any error

ENVIRONMENT=${1:-staging}
VALID_ENVIRONMENTS=("staging" "production")

# Validate environment argument
if [[ ! " ${VALID_ENVIRONMENTS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    echo "❌ Error: Invalid environment '$ENVIRONMENT'"
    echo "Usage: $0 [staging|production]"
    echo "Valid environments: ${VALID_ENVIRONMENTS[*]}"
    exit 1
fi

echo "🚀 Starting deployment to $ENVIRONMENT..."

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ Warning: You have uncommitted changes"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi

# Run quality checks
echo "🧪 Running quality checks..."
npm run check:all

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$ENVIRONMENT" = "production" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️ Warning: You're not on the main branch for production deployment"
    echo "Current branch: $CURRENT_BRANCH"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi

if [ "$ENVIRONMENT" = "staging" ] && [ "$CURRENT_BRANCH" != "develop" ]; then
    echo "⚠️ Warning: You're not on the develop branch for staging deployment"
    echo "Current branch: $CURRENT_BRANCH"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi

# Deploy to Cloud Run via Cloud Build
echo "📤 Deploying to $ENVIRONMENT via Cloud Build..."
if [ "$ENVIRONMENT" = "production" ]; then
    git push origin main
    # Cloud Build will automatically deploy to tonic-production service
else
    git push origin dev
    # Cloud Build will automatically deploy to tonic-staging service
fi

echo "✅ Code pushed successfully!"

# Wait for deployment and test
echo "⏳ Waiting for deployment to complete..."

# Get the Cloud Run service URL
echo "🔍 Getting Cloud Run service URL..."
if [ "$ENVIRONMENT" = "prod" ]; then
    SERVICE_NAME="tonic"
else
    SERVICE_NAME="tonic-staging"
fi

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=us-west1 --format="value(status.url)" 2>/dev/null)

if [ -z "$SERVICE_URL" ]; then
    echo "⚠️  Cloud Run service not found. Deployment may still be in progress."
    echo "You can monitor the deployment at:"
    echo "https://console.cloud.google.com/run"
    echo ""
else
    echo "🌐 Service URL: $SERVICE_URL"
    echo ""
    echo "You can monitor the deployment at:"
    echo "https://console.cloud.google.com/run"
    echo ""
    
    # Optional: Wait and test health endpoint
    read -p "Do you want to test the health endpoint? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🩺 Testing health endpoint..."
        if curl -f "$SERVICE_URL/api/health" > /dev/null 2>&1; then
            echo "✅ Health check passed! Deployment successful."
        else
            echo "❌ Health check failed. Please check Cloud Run logs for issues."
            echo "Health URL: $SERVICE_URL/api/health"
            echo "Logs: gcloud logs read --service=$SERVICE_NAME"
            exit 1
        fi
    fi
fi

echo ""
echo "🎉 Deployment to $ENVIRONMENT completed successfully!"
if [ -n "$SERVICE_URL" ]; then
    echo "🌐 Application URL: $SERVICE_URL"
fi
