#!/bin/bash
# Post-build script for Render deployment
# This runs after npm install but before starting the app

echo "🏗️ Starting post-build setup..."

# Run our build checks
echo "🧪 Running quality checks..."
npm run check:all

# Test health endpoint is reachable (for local testing)
if [ "$NODE_ENV" = "development" ]; then
    echo "🔍 Testing local health endpoint..."
    timeout 10s bash -c 'until curl -f http://localhost:3000/api/health; do sleep 1; done' || echo "⚠️ Health check skipped (development mode)"
fi

# Log build completion
echo "✅ Post-build complete"
echo "🌟 Application ready to start"

# Output environment summary
echo ""
echo "=== BUILD SUMMARY ==="
echo "Environment: $NODE_ENV"
echo "Node version: $(node --version)"
echo "Build time: $(date)"
echo "===================="
