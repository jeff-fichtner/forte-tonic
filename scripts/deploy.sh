#!/bin/bash
# Deployment automation for Render
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

# Push to appropriate branch
echo "📤 Pushing to $ENVIRONMENT branch..."
if [ "$ENVIRONMENT" = "production" ]; then
    git push origin main
    SERVICE_URL="https://tonic-production.onrender.com"
else
    git push origin develop
    SERVICE_URL="https://tonic-staging.onrender.com"
fi

echo "✅ Code pushed successfully!"

# Wait for deployment and test
echo "⏳ Waiting for deployment to complete..."
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "You can monitor the deployment at:"
echo "https://dashboard.render.com/"
echo ""

# Optional: Wait and test health endpoint
read -p "Do you want to wait and test the health endpoint? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "⏳ Waiting 60 seconds for deployment..."
    sleep 60
    
    echo "🩺 Testing health endpoint..."
    if curl -f "$SERVICE_URL/api/health" > /dev/null 2>&1; then
        echo "✅ Health check passed! Deployment successful."
    else
        echo "❌ Health check failed. Please check Render dashboard for issues."
        echo "Health URL: $SERVICE_URL/api/health"
        exit 1
    fi
fi

echo ""
echo "🎉 Deployment to $ENVIRONMENT completed successfully!"
echo "🌐 Application URL: $SERVICE_URL"
