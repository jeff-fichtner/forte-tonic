import { GoogleSheetsDbClient } from '../../src/database/googleSheetsDbClient.js';
import { configService } from '../../src/services/configurationService.js';
import { createLogger } from '../../src/utils/logger.js';

async function analyzeSheetsForMigration(newSheetName, targetSheets = []) {
  console.log('🔍 MIGRATION ANALYSIS: Sheet Replacement Planning\n');
  console.log(`📋 New Source Sheet: "${newSheetName}"`);
  console.log(`🎯 Target Sheets to Replace: [${targetSheets.join(', ')}]\n`);
  
  try {
    // Initialize logger and client
    const logger = createLogger(configService);
    const client = new GoogleSheetsDbClient(configService);

    console.log('✅ Client initialized successfully\n');
    
    // Get spreadsheet metadata
    const spreadsheetInfo = await client.sheets.spreadsheets.get({
      spreadsheetId: client.spreadsheetId,
    });

    console.log(`📋 Spreadsheet: "${spreadsheetInfo.data.properties.title}"`);
    
    const sheetAnalysis = {};
    const sheetsToAnalyze = [newSheetName, ...targetSheets];
    
    // Analyze each relevant sheet
    for (const sheetName of sheetsToAnalyze) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 ANALYZING: "${sheetName}"`);
      console.log(`${'='.repeat(60)}`);
      
      const sheet = spreadsheetInfo.data.sheets.find(s => s.properties.title === sheetName);
      
      if (!sheet) {
        console.log(`❌ Sheet "${sheetName}" not found!`);
        sheetAnalysis[sheetName] = { exists: false };
        continue;
      }

      const analysis = {
        exists: true,
        dimensions: {
          rows: sheet.properties.gridProperties.rowCount,
          columns: sheet.properties.gridProperties.columnCount
        }
      };

      try {
        // Get ALL data from the sheet (not just first 100 rows)
        const response = await client.sheets.spreadsheets.values.get({
          spreadsheetId: client.spreadsheetId,
          range: `${sheetName}!A:Z`, // Get all data
        });

        const values = response.data.values || [];
        analysis.actualRows = values.length;
        
        if (values.length > 0) {
          analysis.headers = values[0];
          analysis.headerCount = values[0].length;
          
          console.log(`📊 Dimensions: ${analysis.dimensions.rows} rows × ${analysis.dimensions.columns} cols`);
          console.log(`📈 Actual Data: ${analysis.actualRows} rows with data`);
          console.log(`📋 Headers (${analysis.headerCount}): [${analysis.headers.join(', ')}]`);
          
          // Analyze data types and patterns
          if (values.length > 1) {
            analysis.dataTypes = {};
            analysis.sampleRows = values.slice(1, Math.min(6, values.length)); // Sample first 5 data rows
            
            console.log(`\n📊 DATA ANALYSIS:`);
            
            // Analyze each column
            for (let colIndex = 0; colIndex < analysis.headers.length; colIndex++) {
              const header = analysis.headers[colIndex];
              const columnData = values.slice(1).map(row => row[colIndex]).filter(val => val !== undefined && val !== '');
              
              if (columnData.length > 0) {
                const dataType = analyzeColumnDataType(columnData);
                analysis.dataTypes[header] = dataType;
                
                console.log(`   ${header}: ${dataType.type} (${columnData.length} non-empty values)`);
                if (dataType.samples.length > 0) {
                  console.log(`      Samples: [${dataType.samples.slice(0, 3).join(', ')}]`);
                }
              }
            }
            
            console.log(`\n📋 SAMPLE DATA ROWS:`);
            analysis.sampleRows.forEach((row, index) => {
              console.log(`   Row ${index + 2}: [${row.slice(0, 5).join(' | ')}${row.length > 5 ? ' | ...' : ''}]`);
            });
          }
        } else {
          console.log(`📭 Sheet is empty`);
          analysis.headers = [];
          analysis.dataTypes = {};
        }
        
      } catch (error) {
        console.log(`❌ Error reading data: ${error.message}`);
        analysis.error = error.message;
      }
      
      sheetAnalysis[sheetName] = analysis;
    }
    
    // Generate migration recommendations
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔧 MIGRATION RECOMMENDATIONS`);
    console.log(`${'='.repeat(60)}`);
    
    const sourceSheet = sheetAnalysis[newSheetName];
    if (!sourceSheet || !sourceSheet.exists) {
      console.log(`❌ Cannot generate migration - source sheet "${newSheetName}" not found!`);
      return sheetAnalysis;
    }
    
    console.log(`\n📋 SOURCE SHEET SUMMARY:`);
    console.log(`   Name: ${newSheetName}`);
    console.log(`   Rows: ${sourceSheet.actualRows}`);
    console.log(`   Headers: [${sourceSheet.headers?.join(', ') || 'None'}]`);
    
    console.log(`\n🎯 TARGET SHEETS ANALYSIS:`);
    targetSheets.forEach(targetName => {
      const targetSheet = sheetAnalysis[targetName];
      if (targetSheet?.exists) {
        console.log(`\n   📝 ${targetName}:`);
        console.log(`      Current rows: ${targetSheet.actualRows}`);
        console.log(`      Current headers: [${targetSheet.headers?.join(', ') || 'None'}]`);
        
        // Compare headers
        if (sourceSheet.headers && targetSheet.headers) {
          const commonHeaders = sourceSheet.headers.filter(h => targetSheet.headers.includes(h));
          const sourceOnly = sourceSheet.headers.filter(h => !targetSheet.headers.includes(h));
          const targetOnly = targetSheet.headers.filter(h => !sourceSheet.headers.includes(h));
          
          console.log(`      📊 Header Analysis:`);
          console.log(`         Common: [${commonHeaders.join(', ')}]`);
          if (sourceOnly.length > 0) {
            console.log(`         New in source: [${sourceOnly.join(', ')}]`);
          }
          if (targetOnly.length > 0) {
            console.log(`         Missing from source: [${targetOnly.join(', ')}]`);
          }
        }
      } else {
        console.log(`\n   ❌ ${targetName}: Sheet not found`);
      }
    });
    
    // Generate migration script template
    console.log(`\n📝 SUGGESTED MIGRATION STEPS:`);
    console.log(`   1. Backup target sheets: [${targetSheets.join(', ')}]`);
    console.log(`   2. Clear data from target sheets (preserve headers if needed)`);
    console.log(`   3. Copy data from "${newSheetName}" to target sheets`);
    console.log(`   4. Update headers if needed`);
    console.log(`   5. Verify data integrity`);
    console.log(`   6. Test application functionality`);
    
    return sheetAnalysis;

  } catch (error) {
    console.error('❌ Error analyzing sheets:', error.message);
    throw error;
  }
}

function analyzeColumnDataType(columnData) {
  const samples = columnData.slice(0, 5); // First 5 samples
  
  // Check for common patterns
  const allNumbers = columnData.every(val => !isNaN(val) && val !== '');
  const allEmails = columnData.every(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val));
  const allDates = columnData.every(val => !isNaN(Date.parse(val)));
  const allUUIDs = columnData.every(val => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
  const allPhones = columnData.every(val => /^[\d\-\(\)\s\+\.]{10,}$/.test(val));
  
  if (allUUIDs) return { type: 'UUID', samples };
  if (allEmails) return { type: 'Email', samples };
  if (allPhones) return { type: 'Phone', samples };
  if (allNumbers) return { type: 'Number', samples };
  if (allDates) return { type: 'Date', samples };
  
  return { type: 'Text', samples };
}

// Example usage - modify these parameters for your specific case
const NEW_SHEET_NAME = 'incoming-students'; // Replace with your new sheet name
const TARGET_SHEETS = ['students', 'parents']; // Replace with sheets to be replaced

// Run the analysis
analyzeSheetsForMigration(NEW_SHEET_NAME, TARGET_SHEETS)
  .then((analysis) => {
    console.log('\n🎉 Migration analysis completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Review the analysis above');
    console.log('   2. Create a migration script based on the recommendations');
    console.log('   3. Test the migration on a copy of the data first');
  })
  .catch((error) => {
    console.error('\n💥 Analysis failed:', error.message);
    process.exit(1);
  });
