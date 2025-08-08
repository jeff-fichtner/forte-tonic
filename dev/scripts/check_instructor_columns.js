import { GoogleSheetsDbClient } from '../../src/database/googleSheetsDbClient.js';
import { configService } from '../../src/services/configurationService.js';
import { createLogger } from '../../src/utils/logger.js';

async function checkInstructorColumns() {
  console.log('🔍 CHECKING INSTRUCTOR COLUMN STRUCTURE');
  console.log('========================================');

  // Initialize logger first
  const logger = createLogger(configService);
  const client = new GoogleSheetsDbClient(configService);
  
  try {
    // Get the first row (headers) and a few data rows
    const response = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: 'instructors!A1:Z5'
    });

    const values = response.data.values || [];
    
    if (values.length === 0) {
      console.log('❌ No data found in instructors sheet');
      return;
    }

    const headers = values[0];
    console.log('\n📋 FULL COLUMN HEADERS:');
    headers.forEach((header, index) => {
      console.log(`   ${index}: ${header}`);
    });

    console.log('\n📊 SAMPLE DATA ROWS:');
    values.slice(1, 4).forEach((row, rowIndex) => {
      console.log(`\nRow ${rowIndex + 1}:`);
      row.forEach((cell, colIndex) => {
        if (colIndex < headers.length) {
          console.log(`   ${headers[colIndex]}: ${cell || 'empty'}`);
        }
      });
    });

    // Look for instrument-related columns
    console.log('\n🎵 INSTRUMENT-RELATED COLUMNS:');
    headers.forEach((header, index) => {
      if (header && header.toLowerCase().includes('instrument')) {
        console.log(`   ${index}: ${header}`);
      }
    });

  } catch (error) {
    console.error('❌ Error checking instructor columns:', error);
  }
}

checkInstructorColumns();
