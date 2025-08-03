import { google } from 'googleapis';
import fs from 'fs';

const SPREADSHEET_ID = '17zTUME5PD3FHQmxyUIUn1S_u8QCVeMNf0VRPZXR0FlE';

async function analyzeGoogleSheets() {
  console.log('🔍 Starting Google Sheets Analysis...\n');
  
  try {
    // Load credentials - handle both running from project root and from scripts directory
    const credentialsPath = fs.existsSync('../credentials/temp_credentials.json') 
      ? '../credentials/temp_credentials.json' 
      : 'dev/credentials/temp_credentials.json';
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    // Initialize Google Auth
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get spreadsheet metadata
    console.log('📊 Getting spreadsheet metadata...');
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
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
        // Get data from the sheet
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
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
