#!/bin/bash

# Tonic GAS Setup Script
# This script helps set up the Google Apps Script project for first-time use

echo "🚀 TONIC GOOGLE APPS SCRIPT SETUP"
echo "=================================="
echo ""

# Check if .env exists in config directory
if [ ! -f "../config/.env" ]; then
    echo "❌ No .env file found in config directory"
    echo "Please create ../config/.env and add GOOGLE_APPS_SCRIPT_ID"
    exit 1
fi

# Check if GOOGLE_APPS_SCRIPT_ID is set
if ! grep -q "GOOGLE_APPS_SCRIPT_ID" "../config/.env"; then
    echo "❌ GOOGLE_APPS_SCRIPT_ID not found in ../config/.env"
    echo "Please add this line to your .env file:"
    echo "GOOGLE_APPS_SCRIPT_ID=your-google-apps-script-project-id"
    exit 1
fi

echo "✅ Environment file found"

# Generate .clasp.json
echo "📋 Generating .clasp.json from environment variables..."
npm run setup

# Check if clasp is installed
if ! command -v clasp &> /dev/null; then
    echo "❌ clasp CLI not found"
    echo "Install with: npm install -g @google/clasp"
    exit 1
fi

echo "✅ clasp CLI found"

# Check if logged in to clasp
if ! clasp list &> /dev/null; then
    echo "🔐 Not logged in to clasp"
    echo "Please run: clasp login"
    exit 1
fi

echo "✅ clasp authentication verified"
echo ""
echo "🎉 Setup complete! You can now:"
echo "   • npm run deploy     - Deploy to Google Apps Script"
echo "   • npm run open       - Open the project in browser"
echo "   • clasp push         - Direct clasp deployment"
echo ""
