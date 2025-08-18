#!/bin/bash

# Deploy script for staging with version increment
# Usage: ./scripts/deploy-staging.sh [patch|minor|major]

set -e

# Default to patch version increment if not specified
VERSION_TYPE=${1:-patch}

echo "🚀 Starting staging deployment with $VERSION_TYPE version increment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed or not in PATH."
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes. These will be included in the deployment."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 Current version: $CURRENT_VERSION"

#!/bin/bash

# Deploy script for staging with version increment
# Usage: ./scripts/deploy-staging.sh [patch|minor|major]

set -e

# Default to patch version increment if not specified
VERSION_TYPE=${1:-patch}

echo "🚀 Starting staging deployment with $VERSION_TYPE version increment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed or not in PATH."
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes. These will be included in the deployment."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "� Current version: $CURRENT_VERSION"

# Increment version
echo "�🔢 Incrementing $VERSION_TYPE version..."
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ New version: $NEW_VERSION"

# Run tests
echo "🧪 Running tests..."
npm test

# Commit version bump
echo "📝 Committing version bump..."
git add package.json
git commit -m "chore: bump version to $NEW_VERSION for staging deployment"

# Create deployment tag
DEPLOYMENT_TAG="staging-v$NEW_VERSION-$(date +%Y%m%d-%H%M%S)"
echo "🏷️  Creating deployment tag: $DEPLOYMENT_TAG"
git tag $DEPLOYMENT_TAG

# Push to staging branch (this will trigger Render auto-deployment)
echo "🚀 Pushing to dev branch (triggers Render staging deployment)..."
git push origin dev
git push origin $DEPLOYMENT_TAG

echo ""
echo "✅ Staging deployment initiated!"
echo "📦 Version: $NEW_VERSION"
echo "🏷️  Tag: $DEPLOYMENT_TAG"
echo "🌐 Render will automatically deploy when it detects the push to 'dev' branch"
echo "🔗 Check deployment status at: https://console.cloud.google.com/run"
echo ""
echo "📋 The version badge will show v$NEW_VERSION in the staging environment once deployed."
echo "🔍 In development, it will continue to show v0.0.0-dev"

# Run tests
echo "🧪 Running tests..."
npm test

# Commit version bump
echo "📝 Committing version bump..."
git add package.json
git commit -m "chore: bump version to $NEW_VERSION for staging deployment"

# Create deployment tag
DEPLOYMENT_TAG="staging-v$NEW_VERSION-$(date +%Y%m%d-%H%M%S)"
echo "🏷️  Creating deployment tag: $DEPLOYMENT_TAG"
git tag $DEPLOYMENT_TAG

# Push to staging branch (this should trigger Render deployment)
echo "🚀 Pushing to staging..."
git push origin dev
git push origin $DEPLOYMENT_TAG

echo ""
echo "✅ Staging deployment initiated!"
echo "📦 Version: $NEW_VERSION (will be visible after build)"
echo "🏷️  Tag: $DEPLOYMENT_TAG"
echo "🌐 Check deployment status at: https://console.cloud.google.com/run"
echo ""
echo "📝 Note: Version display shows:"
echo "   • Development: v0.0.0-dev (static)"
echo "   • Staging: v$NEW_VERSION (from package.json after build)"
echo ""
echo "Once deployed, the version will be visible in the upper-right corner of the staging site."
