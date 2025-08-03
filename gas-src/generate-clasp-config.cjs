#!/usr/bin/env node

/**
 * Generate .clasp.json from environment variables
 * This script reads the GOOGLE_APPS_SCRIPT_ID from .env and creates/updates .clasp.json
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from the parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const scriptId = process.env.GOOGLE_APPS_SCRIPT_ID;

if (!scriptId) {
  console.error('❌ GOOGLE_APPS_SCRIPT_ID not found in environment variables');
  console.error('Please add GOOGLE_APPS_SCRIPT_ID to your .env file');
  process.exit(1);
}

const claspConfig = {
  "scriptId": scriptId,
  "filePushOrder": [
    "appsscript.json",
    "Code.js",
    "gas-migrations/Config.js",
    "gas-migrations/Migration001_StructuralImprovements.js",
    "gas-migrations/archive/Migration002_AddClassNamesToRegistration_ARCHIVED.js", 
    "gas-migrations/archive/Migration003_ProcessParents_PROCESSED.js",
    "gas-migrations/dev/Migration_DEV001_RealisticFakeData.js",
    "gas-migrations/TEMPLATE_Migration.js"
  ]
};

const claspJsonPath = path.join(__dirname, '.clasp.json');

try {
  fs.writeFileSync(claspJsonPath, JSON.stringify(claspConfig, null, 2));
  console.log('✅ .clasp.json generated successfully');
  console.log(`📋 Script ID: ${scriptId}`);
} catch (error) {
  console.error('❌ Failed to write .clasp.json:', error.message);
  process.exit(1);
}
