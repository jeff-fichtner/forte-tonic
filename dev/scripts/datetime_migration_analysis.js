#!/usr/bin/env node

/**
 * GOOGLE SHEETS STRUCTURE ANALYSIS AND MIGRATION PLAN
 * ===================================================
 * 
 * This script analyzes the current Google Sheets structure and provides
 * a migration plan to fix datetime handling and column mapping issues.
 */

import { GoogleSheetsDbClient } from '../../src/core/clients/googleSheetsDbClient.js';
import { EnhancedDateHelpers } from '../../src/core/helpers/enhancedDateHelpers.js';

const dbClient = new GoogleSheetsDbClient();

console.log('🔍 GOOGLE SHEETS STRUCTURE & DATETIME MIGRATION ANALYSIS\n');

async function analyzeSheetStructure() {
    try {
        // Get raw sheet data to understand actual column structure
        console.log('📊 ANALYZING ACTUAL SHEET STRUCTURE:\n');
        
        const sheets = ['classes', 'registrations', 'students', 'instructors', 'parents'];
        
        for (const sheetName of sheets) {
            console.log(`🔍 ${sheetName.toUpperCase()} SHEET:`);
            
            try {
                const data = await dbClient.getAllFromSheet(sheetName);
                
                if (data && data.length > 0) {
                    console.log(`   📋 Columns: ${Object.keys(data[0]).join(', ')}`);
                    console.log(`   📊 Records: ${data.length}`);
                    
                    // Sample first record
                    console.log(`   🔍 Sample record:`, data[0]);
                    
                    // Look for datetime-related fields
                    const dateTimeFields = Object.keys(data[0]).filter(key => 
                        key.toLowerCase().includes('time') || 
                        key.toLowerCase().includes('date') || 
                        key.toLowerCase().includes('created') || 
                        key.toLowerCase().includes('modified')
                    );
                    
                    if (dateTimeFields.length > 0) {
                        console.log(`   ⏰ DateTime fields: ${dateTimeFields.join(', ')}`);
                        
                        // Analyze datetime formats
                        dateTimeFields.forEach(field => {
                            const value = data[0][field];
                            console.log(`      ${field}: "${value}" (${typeof value})`);
                            
                            try {
                                const parsed = EnhancedDateHelpers.parse(value);
                                console.log(`      ✅ Parsed as: ${parsed.to12HourString() || parsed.toISOString() || 'null'}`);
                            } catch (e) {
                                console.log(`      ❌ Parse error: ${e.message}`);
                            }
                        });
                    }
                } else {
                    console.log(`   ⚠️  No data found`);
                }
                
            } catch (error) {
                console.log(`   ❌ Error accessing ${sheetName}: ${error.message}`);
            }
            
            console.log('');
        }
        
        console.log('=' * 60);
        console.log('🚨 IDENTIFIED ISSUES:\n');
        
        console.log('1. COLUMN MAPPING MISMATCHES:');
        console.log('   - Code expects specific column names that don\'t match sheets');
        console.log('   - This causes data to appear in wrong fields');
        console.log('   - Need to update googleSheetsDbClient.js column mappings\n');
        
        console.log('2. DATETIME FORMAT INCONSISTENCIES:');
        console.log('   - Some fields contain formatted time strings ("3:30 PM")');
        console.log('   - Others might contain Google Sheets serial dates');
        console.log('   - Need unified parsing strategy\n');
        
        console.log('3. MISSING AUDIT FIELDS:');
        console.log('   - No created/modified timestamps');
        console.log('   - Difficult to track data changes\n');
        
        console.log('🔧 RECOMMENDED FIXES:\n');
        
        console.log('1. UPDATE COLUMN MAPPINGS:');
        console.log('   - Fix googleSheetsDbClient.js to match actual sheet headers');
        console.log('   - Standardize header naming across all sheets\n');
        
        console.log('2. IMPLEMENT ENHANCED DATETIME HANDLING:');
        console.log('   - Use EnhancedDateHelpers for all datetime parsing');
        console.log('   - Support multiple input formats gracefully');
        console.log('   - Provide consistent output formats\n');
        
        console.log('3. ADD AUDIT COLUMNS TO SHEETS:');
        console.log('   - CreatedAt, CreatedBy, ModifiedAt, ModifiedBy');
        console.log('   - Use consistent datetime format (ISO 8601)\n');
        
        console.log('4. MIGRATE EXISTING TIME DATA:');
        console.log('   - Convert all time strings to consistent format');
        console.log('   - Ensure Google Sheets uses proper time formatting\n');
        
        generateMigrationScript();
        
    } catch (error) {
        console.error('❌ Analysis failed:', error);
    }
}

function generateMigrationScript() {
    console.log('📝 MIGRATION SCRIPT PROPOSAL:\n');
    
    const migrationScript = `
/**
 * TONIC DATETIME MIGRATION SCRIPT
 * ==============================
 */

// Step 1: Update Google Sheets Column Headers
const REQUIRED_COLUMN_UPDATES = {
    classes: {
        current: ['Id', 'InstructorId', 'Day', 'StartTime', 'Length', 'EndTime', 'Instrument', 'Title', 'Size', 'MinimumGrade', 'MaximumGrade'],
        proposed: ['Id', 'InstructorId', 'DayOfWeek', 'StartTime', 'LengthMinutes', 'EndTime', 'Instrument', 'Title', 'MaxStudents', 'MinGrade', 'MaxGrade', 'CreatedAt', 'ModifiedAt']
    },
    registrations: {
        current: ['Id', 'StudentId', 'InstructorId', 'Day', 'StartTime', 'Length', 'RegistrationType', 'RoomId', 'SchoolYear', 'CreatedBy'],
        proposed: ['Id', 'StudentId', 'InstructorId', 'DayOfWeek', 'StartTime', 'LengthMinutes', 'RegistrationType', 'RoomId', 'SchoolYear', 'Status', 'CreatedBy', 'CreatedAt', 'ModifiedAt']
    },
    students: {
        current: ['Id', 'StudentId', 'LastName', 'FirstName', 'LastNickname', 'FirstNickname', 'Grade', 'Parent1Id', 'Parent2Id', ...],
        proposed: ['Id', 'LastName', 'FirstName', 'LastNickname', 'FirstNickname', 'Grade', 'DateOfBirth', 'Parent1Id', 'Parent2Id', 'CreatedAt', 'ModifiedAt']
    }
};

// Step 2: Update googleSheetsDbClient.js Column Mappings
const FIXED_COLUMN_MAPPINGS = {
    classes: {
        sheet: 'classes',
        startRow: 2,
        columnMap: {
            id: 0,              // Id
            instructorId: 1,    // InstructorId  
            dayOfWeek: 2,       // DayOfWeek (was Day)
            startTime: 3,       // StartTime
            lengthMinutes: 4,   // LengthMinutes (was Length)
            endTime: 5,         // EndTime
            instrument: 6,      // Instrument
            title: 7,           // Title
            maxStudents: 8,     // MaxStudents (was Size)
            minGrade: 9,        // MinGrade (was MinimumGrade)
            maxGrade: 10,       // MaxGrade (was MaximumGrade)
            createdAt: 11,      // CreatedAt (new)
            modifiedAt: 12      // ModifiedAt (new)
        }
    }
};

// Step 3: Time Format Standardization
const TIME_FORMAT_RULES = {
    input: ['3:30 PM', '15:30', 'Google Sheets Serial Date'],
    storage: 'HH:MM (24-hour format)',
    display: 'h:mm AM/PM (12-hour format)',
    api: 'ISO 8601 for full datetimes'
};
`;
    
    console.log(migrationScript);
}

// Run the analysis
analyzeSheetStructure();
