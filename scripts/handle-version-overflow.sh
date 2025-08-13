#!/bin/bash

# Version overflow handler - automatically increment minor version when patch reaches 999
# Usage: ./scripts/handle-version-overflow.sh

set -e

echo "🔍 Checking for version overflow..."

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 Current version: $CURRENT_VERSION"

# Extract version parts
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

echo "📊 Version parts: Major=$MAJOR, Minor=$MINOR, Patch=$PATCH"

# Check if patch is approaching or at limit
if [ $PATCH -ge 999 ]; then
    echo "🚨 PATCH VERSION OVERFLOW DETECTED!"
    echo "Current patch: $PATCH (limit: 999)"
    echo ""
    echo "🔄 Auto-incrementing minor version and resetting patch to 0..."
    
    NEW_MINOR=$((MINOR + 1))
    NEW_VERSION="$MAJOR.$NEW_MINOR.0"
    
    echo "📈 Version change: $CURRENT_VERSION → $NEW_VERSION"
    
    # Update package.json
    npm version $NEW_VERSION --no-git-tag-version --allow-same-version
    
    # Verify the change
    UPDATED_VERSION=$(node -p "require('./package.json').version")
    echo "✅ Version updated to: $UPDATED_VERSION"
    
    # Create special tag for overflow handling
    OVERFLOW_TAG="overflow-reset-v$NEW_VERSION-$(date +%Y%m%d-%H%M%S)"
    echo "🏷️  Overflow tag: $OVERFLOW_TAG"
    
    echo ""
    echo "📧 NOTIFICATION: Version overflow handled automatically"
    echo "   Old: $CURRENT_VERSION"
    echo "   New: $NEW_VERSION"
    echo "   Reason: Patch version reached maximum (999)"
    
elif [ $PATCH -ge 990 ]; then
    echo "⚠️  WARNING: Patch version approaching limit"
    echo "Current: $PATCH/999 (${PATCH}0% of limit)"
    echo "Consider manually incrementing minor version soon"
    
else
    echo "✅ Version is within normal range ($PATCH/999)"
fi

echo "🎯 Version overflow check complete"
