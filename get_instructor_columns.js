import { GoogleSheetsDbClient } from './src/database/googleSheetsDbClient.js';
import { configService } from './src/services/configurationService.js';
import { createLogger } from './src/utils/logger.js';

async function getInstructorColumns() {
  console.log('🔍 Getting Instructor Column Headers...\n');
  
  try {
    // Initialize logger first
    const logger = createLogger(configService);
    
    // Initialize client using the config service
    const client = new GoogleSheetsDbClient(configService);

    console.log('✅ Client initialized successfully\n');
    
    // Get just the header row from instructors sheet
    const response = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: `instructors!A1:ZZ1`, // Get all columns in row 1
    });

    const headers = response.data.values?.[0] || [];
    console.log('📋 INSTRUCTOR SHEET COLUMNS:');
    console.log('============================');
    
    headers.forEach((header, index) => {
      console.log(`${index.toString().padStart(2)}: ${header}`);
    });
    
    console.log(`\n📊 Total columns: ${headers.length}`);
    
    // Find AccessCode column
    const accessCodeIndex = headers.findIndex(h => h.toLowerCase().includes('access'));
    if (accessCodeIndex !== -1) {
      console.log(`🔑 AccessCode found at position: ${accessCodeIndex}`);
    } else {
      console.log('❌ AccessCode column not found!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getInstructorColumns();
