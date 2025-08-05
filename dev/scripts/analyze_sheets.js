import { GoogleSheetsDbClient } from '../../src/database/googleSheetsDbClient.js';
import { configService } from '../../src/services/configurationService.js';
import { createLogger } from '../../src/utils/logger.js';

async function analyzeGoogleSheets() {
  console.log('🔍 Starting Google Sheets Analysis...\n');
  
  try {
    // Initialize logger first
    const logger = createLogger(configService);
    
    // Initialize client using the config service
    const client = new GoogleSheetsDbClient(configService);

    console.log('✅ Client initialized successfully\n');
    
    // Get spreadsheet metadata using the client's underlying sheets API
    console.log('📊 Getting spreadsheet metadata...');
    const spreadsheetInfo = await client.sheets.spreadsheets.get({
      spreadsheetId: client.spreadsheetId,
    });

    console.log(`📋 Spreadsheet: "${spreadsheetInfo.data.properties.title}"`);
    console.log(`🗂️  Available sheets: ${spreadsheetInfo.data.sheets.length}\n`);

    // Analyze each sheet
    for (const sheet of spreadsheetInfo.data.sheets) {
      const sheetName = sheet.properties.title;
      console.log(`\n📝 Analyzing sheet: "${sheetName}"`);
      console.log(`   Rows: ${sheet.properties.gridProperties.rowCount}`);
      console.log(`   Columns: ${sheet.properties.gridProperties.columnCount}`);

      try {
        // Get data from the sheet using client's sheets API
        const response = await client.sheets.spreadsheets.values.get({
          spreadsheetId: client.spreadsheetId,
          range: `${sheetName}!A1:Z100`, // Get a reasonable range
        });

        const values = response.data.values || [];
        console.log(`   Data rows: ${values.length}`);
        
        if (values.length > 0) {
          console.log(`   Headers: [${values[0].join(', ')}]`);
          
          if (values.length > 1) {
            console.log(`   Sample data row: [${values[1].slice(0, 5).join(', ')}${values[1].length > 5 ? '...' : ''}]`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Error reading data: ${error.message}`);
      }
    }

    console.log('\n✅ Analysis complete!');
    return spreadsheetInfo.data;

  } catch (error) {
    console.error('❌ Error analyzing sheets:', error.message);
    throw error;
  }
}

// Run the analysis
analyzeGoogleSheets()
  .then(() => {
    console.log('\n🎉 Sheet analysis completed successfully!');
  })
  .catch((error) => {
    console.error('\n💥 Analysis failed:', error.message);
    process.exit(1);
  });
