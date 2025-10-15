#!/bin/bash

# Deployed Version Verification Script
# 
# This script checks the currently deployed version on Google Cloud Run
# by querying both the health endpoint and version endpoint, and compares
# them with the local package.json version.
#
# Usage: ./scripts/check-deployed-version.sh [environment]
#
# Arguments:
#   environment  - Either 'staging' or 'production' (default: staging)
#
# Examples:
#   ./scripts/check-deployed-version.sh staging     # Check staging deployment
#   ./scripts/check-deployed-version.sh production  # Check production deployment
#
# This is useful for:
#   - Verifying successful deployments
#   - Debugging version mismatches
#   - Confirming Cloud Build deployed the correct version

ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" = "staging" ]; then
    URL="https://tonic-staging-253019293832.us-west1.run.app"
elif [ "$ENVIRONMENT" = "production" ]; then
    URL="https://tonic-production-253019293832.us-west1.run.app"  # Update with actual production URL
else
    echo "Error: Environment must be 'staging' or 'production'"
    exit 1
fi

echo "🔍 Checking deployed version for: $ENVIRONMENT"
echo "📡 URL: $URL"
echo ""

echo "📋 Health Endpoint (/api/health):"
curl -s "$URL/api/health" | python3 -m json.tool 2>/dev/null || curl -s "$URL/api/health"
echo ""
echo ""

echo "🏷️  Version Endpoint (/api/version):"
curl -s "$URL/api/version" | python3 -m json.tool 2>/dev/null || curl -s "$URL/api/version"
echo ""
echo ""

echo "📦 Local package.json version:"
grep '"version"' package.json | head -1
echo ""

echo "✅ Version check complete!"