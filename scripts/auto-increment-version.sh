#!/bin/bash

# Auto-increment patch version for dev branch builds
# This script is called automatically by Render on dev branch deployments
# Supports 3-digit patch numbers (e.g., 1.0.123)

set -e

echo "🔢 Auto-incrementing patch version for dev build..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 Current version: $CURRENT_VERSION"

# Check if this is a dev branch build (set by Render environment)
if [ "$RENDER_GIT_BRANCH" = "dev" ] || [ "$NODE_ENV" = "staging" ]; then
    echo "🎯 Dev branch detected - auto-incrementing patch version..."
    
    # Extract version parts
    IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
    MAJOR=${VERSION_PARTS[0]}
    MINOR=${VERSION_PARTS[1]}
    PATCH=${VERSION_PARTS[2]}
    
    # Increment patch (supports up to 999)
    NEW_PATCH=$((PATCH + 1))
    
    # Ensure 3-digit support
    if [ $NEW_PATCH -gt 999 ]; then
        echo "⚠️  Warning: Patch version exceeds 999. Consider incrementing minor version."
        echo "Current: $MAJOR.$MINOR.$PATCH"
        echo "Would be: $MAJOR.$MINOR.$NEW_PATCH"
    fi
    
    NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
    
    echo "🔢 Incrementing version: $CURRENT_VERSION → $NEW_VERSION"
    
    # Update package.json
    npm version $NEW_VERSION --no-git-tag-version --allow-same-version
    
    # Verify the change
    UPDATED_VERSION=$(node -p "require('./package.json').version")
    echo "✅ Version updated to: $UPDATED_VERSION"
    
    # Create build tag for tracking
    BUILD_TAG="auto-build-v$NEW_VERSION-$(date +%Y%m%d-%H%M%S)"
    echo "🏷️  Build tag: $BUILD_TAG"
    
    # Log for debugging
    echo "📊 Build Info:"
    echo "  - Branch: ${RENDER_GIT_BRANCH:-unknown}"
    echo "  - Commit: ${RENDER_GIT_COMMIT:-unknown}"
    echo "  - Environment: ${NODE_ENV:-unknown}"
    echo "  - Build Time: $(date)"
    
else
    echo "ℹ️  Not a dev branch build - skipping auto-increment"
    echo "  - Branch: ${RENDER_GIT_BRANCH:-unknown}"
    echo "  - Environment: ${NODE_ENV:-unknown}"
fi

echo "🎯 Auto-increment complete"
