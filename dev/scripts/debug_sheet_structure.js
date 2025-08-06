import { GoogleSheetsDbClient } from '../../src/database/googleSheetsDbClient.js';
import { configService } from '../../src/services/configurationService.js';
import { createLogger } from '../../src/utils/logger.js';

const logger = createLogger(configService);

console.log('🔍 DEBUGGING GOOGLE SHEETS STRUCTURE');
console.log('=====================================');

const dbClient = new GoogleSheetsDbClient(configService);

async function debugSheetStructure() {
  try {
    console.log('\n📋 STEP 1: Getting spreadsheet metadata...');
    
    const spreadsheet = await dbClient.sheets.spreadsheets.get({
      spreadsheetId: dbClient.spreadsheetId
    });
    
    console.log('📊 Spreadsheet Title:', spreadsheet.data.properties.title);
    console.log('📑 Number of sheets:', spreadsheet.data.sheets.length);
    
    console.log('\n📄 SHEETS INFORMATION:');
    spreadsheet.data.sheets.forEach((sheet, index) => {
      console.log(`  Sheet ${index}:`);
      console.log(`    Title: "${sheet.properties.title}"`);
      console.log(`    SheetId: ${sheet.properties.sheetId}`);
      console.log(`    Index: ${sheet.properties.index}`);
      console.log(`    Grid Properties:`, sheet.properties.gridProperties);
      console.log('');
    });
    
    console.log('\n🎯 STEP 2: Checking permissions by reading data...');
    
    // Try to read from the registrations sheet
    const response = await dbClient.sheets.spreadsheets.values.get({
      spreadsheetId: dbClient.spreadsheetId,
      range: 'registrations!A1:C5'
    });
    
    console.log('✅ Successfully read data. First 5 rows:');
    console.log(response.data.values);
    
    console.log('\n🧪 STEP 3: Testing write permissions...');
    
    // Test if we can append a test row
    const testData = [['TEST_ID_' + Date.now(), 'TEST', 'TEST']];
    
    try {
      await dbClient.sheets.spreadsheets.values.append({
        spreadsheetId: dbClient.spreadsheetId,
        range: 'registrations!A:C',
        valueInputOption: 'RAW',
        resource: {
          values: testData
        }
      });
      console.log('✅ Write permissions confirmed - can append data');
      
      // Now try to delete that test row
      console.log('\n🗑️  STEP 4: Testing delete permissions...');
      
      // First get the total number of rows to find our test row
      const allData = await dbClient.sheets.spreadsheets.values.get({
        spreadsheetId: dbClient.spreadsheetId,
        range: 'registrations!A:C'
      });
      
      const totalRows = allData.data.values.length;
      console.log(`📊 Total rows in sheet: ${totalRows}`);
      
      // The test row should be the last row
      const lastRow = allData.data.values[totalRows - 1];
      console.log('📝 Last row data:', lastRow);
      
      if (lastRow[0].startsWith('TEST_ID_')) {
        console.log('🎯 Found our test row at the end, attempting to delete it...');
        
        // Get the correct sheetId for the registrations sheet
        const registrationsSheet = spreadsheet.data.sheets.find(sheet => 
          sheet.properties.title === 'registrations'
        );
        
        if (!registrationsSheet) {
          throw new Error('Could not find registrations sheet');
        }
        
        const sheetId = registrationsSheet.properties.sheetId;
        console.log(`📋 Using sheetId: ${sheetId} for registrations sheet`);
        
        const deleteRequest = {
          spreadsheetId: dbClient.spreadsheetId,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: totalRows - 1, // 0-based index for the last row
                  endIndex: totalRows
                }
              }
            }]
          }
        };
        
        console.log('🚀 Sending delete request:', JSON.stringify(deleteRequest, null, 2));
        
        const deleteResponse = await dbClient.sheets.spreadsheets.batchUpdate(deleteRequest);
        console.log('✅ Delete response status:', deleteResponse.status);
        
        // Verify the deletion worked
        const verifyData = await dbClient.sheets.spreadsheets.values.get({
          spreadsheetId: dbClient.spreadsheetId,
          range: 'registrations!A:C'
        });
        
        const newTotalRows = verifyData.data.values.length;
        console.log(`📊 Rows after deletion: ${newTotalRows}`);
        
        if (newTotalRows === totalRows - 1) {
          console.log('🎉 SUCCESS! Delete permissions confirmed - test row was deleted');
        } else {
          console.log('❌ PROBLEM: Row count did not decrease after deletion');
        }
        
      } else {
        console.log('❌ Could not find our test row');
      }
      
    } catch (writeError) {
      console.error('❌ Write/delete permissions issue:', writeError.message);
    }
    
  } catch (error) {
    console.error('❌ Error debugging sheet structure:', error);
  }
}

debugSheetStructure().catch(console.error);
