#!/bin/bash
# Pre-build script for Render deployment
# This runs before npm install

echo "🔧 Starting pre-build setup..."

# Log environment info
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Environment: $NODE_ENV"

# Ensure we have the correct Node version
if ! node --version | grep -q "v18\|v20"; then
    echo "⚠️ Warning: Node.js version should be 18 or 20 for optimal performance"
fi

# Check if essential environment variables are set
if [ -z "$WORKING_SPREADSHEET_ID" ]; then
    echo "❌ Error: WORKING_SPREADSHEET_ID environment variable is not set"
    exit 1
fi

if [ -z "$GOOGLE_SERVICE_ACCOUNT_EMAIL" ]; then
    echo "❌ Error: GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable is not set"
    exit 1
fi

if [ -z "$GOOGLE_PRIVATE_KEY" ]; then
    echo "❌ Error: GOOGLE_PRIVATE_KEY environment variable is not set"
    exit 1
fi

echo "✅ Pre-build checks passed"
echo "📊 Spreadsheet ID: ${WORKING_SPREADSHEET_ID:0:10}..."
echo "📧 Service Account: ${GOOGLE_SERVICE_ACCOUNT_EMAIL}"

# Clean up any potential cache issues
npm cache clean --force

echo "🚀 Pre-build complete, proceeding to npm install..."
