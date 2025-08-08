/**
 * Debug script to get exact instructor column headers
 */

import { serviceContainer } from './src/infrastructure/container/serviceContainer.js';

async function debugInstructorColumns() {
  console.log('🔍 DEBUGGING INSTRUCTOR COLUMNS');
  console.log('================================');

  try {
    // Initialize service container
    await serviceContainer.initialize();
    
    // Get database client
    const dbClient = serviceContainer.get('dbClient');
    
    // Get raw data from instructors sheet
    console.log('📊 Getting raw instructor data...');
    const rawData = await dbClient.dbClient.getRange('instructors', 'A1:ZZ2');
    
    if (rawData && rawData.length > 0) {
      console.log('📋 Column Headers:');
      console.log(rawData[0]);
      console.log('');
      console.log('📋 First Data Row (if exists):');
      if (rawData.length > 1) {
        console.log(rawData[1]);
      } else {
        console.log('No data rows found');
      }
      
      // Show column index mapping
      console.log('');
      console.log('📋 Column Index Mapping:');
      rawData[0].forEach((header, index) => {
        console.log(`  ${index}: ${header}`);
      });
      
    } else {
      console.log('❌ No data found in instructors sheet');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugInstructorColumns();
