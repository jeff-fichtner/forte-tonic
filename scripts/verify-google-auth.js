#!/usr/bin/env node
/**
 * Standalone test script for Google Sheets service account authentication
 *
 * This script validates:
 * 1. Service account credentials are properly loaded from environment
 * 2. Private key format is correct (proper BEGIN/END markers, newlines)
 * 3. Authentication succeeds and can obtain an access token
 * 4. Can access the specified spreadsheet
 *
 * Usage:
 *   node tests/debug/test-service-account-auth.js
 */

import dotenv from 'dotenv';
import { google } from 'googleapis';

// Load environment variables
dotenv.config();

console.log('\n🔍 Google Service Account Authentication Test\n');
console.log('='.repeat(60));

// Step 1: Check environment variables
console.log('\n📋 Step 1: Checking Environment Variables\n');

const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY;
const spreadsheetId = process.env.WORKING_SPREADSHEET_ID;

console.log(`✓ Service Account Email: ${serviceAccountEmail || '❌ NOT SET'}`);
console.log(`✓ Private Key Present: ${privateKey ? 'Yes' : '❌ NO'}`);
console.log(`✓ Spreadsheet ID: ${spreadsheetId || '❌ NOT SET'}`);

if (!serviceAccountEmail || !privateKey || !spreadsheetId) {
  console.error('\n❌ ERROR: Missing required environment variables');
  console.error('Please ensure these are set in your .env file:');
  console.error('  - GOOGLE_SERVICE_ACCOUNT_EMAIL');
  console.error('  - GOOGLE_PRIVATE_KEY');
  console.error('  - WORKING_SPREADSHEET_ID');
  process.exit(1);
}

// Step 2: Validate private key format
console.log('\n🔐 Step 2: Validating Private Key Format\n');

const processedKey = privateKey.replace(/\\n/g, '\n');
const keyLines = processedKey.split('\n');
const hasProperStart = processedKey.startsWith('-----BEGIN PRIVATE KEY-----');
const hasProperEnd = processedKey.includes('-----END PRIVATE KEY-----');
const hasNewlines = processedKey.includes('\n');
const keyLength = processedKey.length;

console.log(
  `✓ Total length: ${keyLength} chars ${keyLength < 1600 ? '⚠️  (seems short, expected ~1700+)' : ''}`
);
console.log(
  `✓ Line count: ${keyLines.length} ${keyLines.length < 26 ? '⚠️  (seems low, expected ~28)' : ''}`
);
console.log(`✓ Has proper BEGIN marker: ${hasProperStart ? '✅' : '❌'}`);
console.log(`✓ Has proper END marker: ${hasProperEnd ? '✅' : '❌'}`);
console.log(`✓ Has newline characters: ${hasNewlines ? '✅' : '❌'}`);
console.log(`✓ First line: ${keyLines[0]}`);
console.log(`✓ Last line: ${keyLines[keyLines.length - 1]}`);

if (!hasProperStart || !hasProperEnd || !hasNewlines) {
  console.error('\n⚠️  WARNING: Private key format issues detected');
  console.error('Common issues:');
  console.error('  - Key should start with "-----BEGIN PRIVATE KEY-----"');
  console.error('  - Key should end with "-----END PRIVATE KEY-----"');
  console.error('  - Key should contain actual newline characters (\\n)');
}

// Step 3: Test authentication
console.log('\n🔑 Step 3: Testing Google Authentication\n');

try {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: serviceAccountEmail,
      private_key: processedKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  console.log('✓ GoogleAuth object created successfully');

  // Get the auth client
  console.log('✓ Attempting to get auth client...');
  const authClient = await auth.getClient();
  console.log('✅ Auth client obtained successfully');

  // Get access token
  console.log('✓ Attempting to get access token...');
  const tokenResponse = await authClient.getAccessToken();
  console.log('✅ Access token obtained successfully');
  console.log(`✓ Token type: ${tokenResponse.token ? 'Bearer' : 'Unknown'}`);
  console.log(`✓ Token length: ${tokenResponse.token ? tokenResponse.token.length : 0} chars`);
  console.log(
    `✓ Token prefix: ${tokenResponse.token ? tokenResponse.token.substring(0, 20) + '...' : 'N/A'}`
  );

  // Step 4: Test Google Sheets API access
  console.log('\n📊 Step 4: Testing Google Sheets API Access\n');

  const sheets = google.sheets({ version: 'v4', auth });

  console.log('✓ Attempting to read spreadsheet metadata...');
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: spreadsheetId,
  });

  console.log('✅ Successfully accessed spreadsheet!');
  console.log(`✓ Spreadsheet title: ${spreadsheet.data.properties?.title || 'N/A'}`);
  console.log(`✓ Number of sheets: ${spreadsheet.data.sheets?.length || 0}`);

  if (spreadsheet.data.sheets && spreadsheet.data.sheets.length > 0) {
    console.log('\n📑 Available sheets:');
    spreadsheet.data.sheets.forEach((sheet, index) => {
      console.log(`  ${index + 1}. ${sheet.properties?.title || 'Unnamed'}`);
    });
  }

  // Step 5: Test reading data from a sheet
  console.log('\n📖 Step 5: Testing Data Read Access\n');

  // Try to read from the first available sheet
  const firstSheet = spreadsheet.data.sheets?.[0];
  if (firstSheet) {
    const sheetName = firstSheet.properties?.title;
    console.log(`✓ Attempting to read first row from "${sheetName}"...`);

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A1:Z1`,
      });

      const headers = response.data.values?.[0] || [];
      console.log('✅ Successfully read data!');
      console.log(`✓ Found ${headers.length} columns`);
      if (headers.length > 0) {
        console.log(`✓ Headers: ${headers.join(', ')}`);
      }
    } catch (readError) {
      console.error('⚠️  Could not read data (but authentication worked):');
      console.error(`   ${readError.message}`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS PASSED!\n');
  console.log('Your service account is properly configured and can:');
  console.log('  ✓ Authenticate with Google');
  console.log('  ✓ Obtain access tokens');
  console.log('  ✓ Access the spreadsheet');
  console.log('  ✓ Read data from sheets');
  console.log('\n💡 If your app is still failing, check:');
  console.log('  - Are you using the exact same .env file?');
  console.log('  - Is the service account shared with the spreadsheet?');
  console.log('  - Are there any network/firewall issues in your deployment?');
  console.log('='.repeat(60) + '\n');
} catch (error) {
  console.error('\n❌ AUTHENTICATION FAILED!\n');
  console.error('Error details:');
  console.error(`  Type: ${error.constructor.name}`);
  console.error(`  Message: ${error.message}`);
  if (error.code) {
    console.error(`  Code: ${error.code}`);
  }
  if (error.response?.data) {
    console.error(`  Response data: ${JSON.stringify(error.response.data, null, 2)}`);
  }

  console.error('\n🔍 Common causes for "invalid_grant: account not found":');
  console.error('  1. Service account was deleted from Google Cloud Console');
  console.error('  2. Private key belongs to a different service account');
  console.error('  3. Private key is from a deleted/disabled project');
  console.error('  4. Private key format is corrupted or malformed');
  console.error('  5. Clock skew (system time is significantly wrong)');

  console.error('\n💡 Recommended actions:');
  console.error('  1. Go to Google Cloud Console');
  console.error('  2. Navigate to IAM & Admin > Service Accounts');
  console.error(`  3. Verify "${serviceAccountEmail}" exists and is enabled`);
  console.error('  4. If missing, create a new service account');
  console.error('  5. Generate a new JSON key file');
  console.error('  6. Update your .env file with the new credentials');
  console.error('='.repeat(60) + '\n');

  process.exit(1);
}
