#!/bin/bash

# Simple version increment script
# Usage: ./scripts/version-bump.sh [patch|minor|major]

set -e

VERSION_TYPE=${1:-patch}

echo "🔢 Incrementing $VERSION_TYPE version..."

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 Current version: $CURRENT_VERSION"

# Increment version
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ New version: $NEW_VERSION"

# Show the diff
git diff package.json

echo ""
echo "Version bumped from $CURRENT_VERSION to $NEW_VERSION"
echo "Run 'git add package.json && git commit -m \"chore: bump version to $NEW_VERSION\"' to commit the change."
