/**
 * Database Schema Extractor
 *
 * Extracts the actual schema from the staging Google Sheets database
 * by dynamically discovering sheets and analyzing their structure.
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Infer data type from a value
 */
function inferDataType(value) {
  if (value === null || value === undefined || value === '') {
    return 'null/empty';
  }

  const str = String(value).trim();

  // UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return 'uuid';
  }

  // Email pattern
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
    return 'email';
  }

  // Boolean
  if (str === 'TRUE' || str === 'FALSE' || str === 'true' || str === 'false') {
    return 'boolean';
  }

  // Number
  if (!isNaN(str) && str !== '') {
    return 'number';
  }

  // Date patterns (ISO format or common date formats)
  if (/^\d{4}-\d{2}-\d{2}/.test(str) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    return 'date';
  }

  return 'string';
}

/**
 * Analyze column data types and get sample values
 */
function analyzeColumn(columnData, columnName) {
  // Skip empty columns
  const nonEmptyValues = columnData.filter(v => v !== null && v !== undefined && v !== '');

  if (nonEmptyValues.length === 0) {
    return {
      name: columnName,
      dataType: 'empty',
      samples: [],
      nonEmptyCount: 0,
    };
  }

  // Infer data type from first few non-empty values
  const typeCounts = {};
  const samples = nonEmptyValues.slice(0, 3);

  samples.forEach(value => {
    const type = inferDataType(value);
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  // Get most common type
  const dataType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

  return {
    name: columnName,
    dataType,
    samples,
    nonEmptyCount: nonEmptyValues.length,
  };
}

async function extractSchema() {
  try {
    console.log('🔍 Starting database schema extraction...\n');

    // Load credentials from migration-config.json
    const credentialsPath = join(__dirname, 'credentials', 'migration-config.json');
    console.log('📁 Loading credentials from:', credentialsPath);

    const credentialsData = await fs.readFile(credentialsPath, 'utf-8');
    const config = JSON.parse(credentialsData);
    const STAGING_SPREADSHEET_ID = config.staging.spreadsheetId;
    const stagingCreds = config.staging.serviceAccount;

    console.log('✅ Credentials loaded\n');

    // Authenticate with service account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: stagingCreds.clientEmail,
        private_key: stagingCreds.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get all sheet names dynamically
    console.log('📋 Discovering sheets...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: STAGING_SPREADSHEET_ID,
    });

    const sheetNames = spreadsheet.data.sheets.map(sheet => sheet.properties.title);
    console.log(`✅ Found ${sheetNames.length} sheets\n`);

    // Extract schema for each sheet
    const schemas = {};

    for (const sheetName of sheetNames) {
      console.log(`\n📊 Analyzing sheet: ${sheetName}`);
      console.log('─'.repeat(80));

      // Get all data (unbounded range to capture all columns)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: STAGING_SPREADSHEET_ID,
        range: sheetName,
      });

      const rows = response.data.values || [];

      if (rows.length === 0) {
        console.log('  ⚠️  Sheet is empty\n');
        schemas[sheetName] = { columns: [], rowCount: 0 };
        continue;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      console.log(`  📏 Columns: ${headers.length}`);
      console.log(`  📄 Data Rows: ${dataRows.length}\n`);

      // Analyze each column
      const columns = [];
      for (let i = 0; i < headers.length; i++) {
        const columnName = headers[i];
        const columnData = dataRows.map(row => row[i]);
        const analysis = analyzeColumn(columnData, columnName);

        columns.push(analysis);

        // Display column info
        const sampleStr = analysis.samples.length > 0
          ? analysis.samples.map(s => `"${s}"`).join(', ')
          : '(empty)';

        console.log(`  ${String(i + 1).padStart(2, ' ')}. ${analysis.name.padEnd(25, ' ')} | ${analysis.dataType.padEnd(10, ' ')} | ${analysis.nonEmptyCount} values | Samples: ${sampleStr}`);
      }

      schemas[sheetName] = {
        columns,
        rowCount: dataRows.length,
      };
    }

    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📈 SCHEMA SUMMARY');
    console.log('='.repeat(80) + '\n');

    for (const [sheetName, schema] of Object.entries(schemas)) {
      console.log(`${sheetName}:`);
      console.log(`  - ${schema.columns.length} columns`);
      console.log(`  - ${schema.rowCount} rows`);
      console.log(`  - Columns: ${schema.columns.map(c => c.name).join(', ')}\n`);
    }

    console.log('✅ Schema extraction complete!\n');

    return schemas;

  } catch (error) {
    console.error('❌ Error extracting schema:', error.message);
    if (error.errors) {
      console.error('Details:', error.errors);
    }
    throw error;
  }
}

// Run the extraction
extractSchema().catch(console.error);
