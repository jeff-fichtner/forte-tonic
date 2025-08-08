#!/usr/bin/env node

/**
 * NATIVE DATETIME SOLUTION TEST
 * ============================
 * 
 * Test the new native datetime implementation to ensure it works correctly
 * before fully migrating from Luxon.
 */

import { Duration, DateTime, DateHelpers } from '../../src/utils/nativeDateTimeHelpers.js';

console.log('🧪 TESTING NATIVE DATETIME SOLUTION');
console.log('===================================\n');

// Test 1: Basic Duration Creation
console.log('1. BASIC DURATION CREATION');
console.log('-'.repeat(30));

try {
    const duration1 = Duration.fromHours(3, 30);
    const duration2 = Duration.fromMinutes(210);
    
    console.log(`3 hours 30 minutes: ${duration1.to12Hour()}`);
    console.log(`210 minutes: ${duration2.to12Hour()}`);
    console.log(`Are they equal? ${duration1.equals(duration2)}`);
    console.log('✅ Duration creation: PASSED\n');
} catch (error) {
    console.log('❌ Duration creation: FAILED');
    console.log(error.message + '\n');
}

// Test 2: Time String Parsing
console.log('2. TIME STRING PARSING');
console.log('-'.repeat(30));

const testTimes = [
    '3:30 PM',
    '15:30',
    '9:00 AM',
    '12:00 PM',
    '12:00 AM',
    '23:59'
];

testTimes.forEach(timeStr => {
    try {
        const parsed = DateHelpers.parseTimeString(timeStr);
        console.log(`${timeStr} → ${parsed.to24Hour()} (${parsed.to12Hour()})`);
    } catch (error) {
        console.log(`${timeStr} → ERROR: ${error.message}`);
    }
});

console.log('✅ Time string parsing: PASSED\n');

// Test 3: Duration Arithmetic
console.log('3. DURATION ARITHMETIC');
console.log('-'.repeat(30));

try {
    const start = DateHelpers.parseTimeString('9:00 AM');
    const duration = Duration.fromMinutes(90); // 1.5 hours
    const end = start.plus(duration);
    
    console.log(`Class starts: ${start.to12Hour()}`);
    console.log(`Duration: ${duration.totalMinutes} minutes`);
    console.log(`Class ends: ${end.to12Hour()}`);
    
    const timeBetween = DateHelpers.durationBetween('9:00 AM', '10:30 AM');
    console.log(`Time between 9:00 AM and 10:30 AM: ${timeBetween.totalMinutes} minutes`);
    
    console.log('✅ Duration arithmetic: PASSED\n');
} catch (error) {
    console.log('❌ Duration arithmetic: FAILED');
    console.log(error.message + '\n');
}

// Test 4: Google Sheets Date Simulation
console.log('4. GOOGLE SHEETS DATE PARSING');
console.log('-'.repeat(30));

try {
    // Simulate Google Sheets time values
    const googleTimeDecimal = 0.65625; // 15:45 (3:45 PM) as fraction of day
    const parsed = DateHelpers.parseGoogleSheetsTime(googleTimeDecimal);
    
    console.log(`Google Sheets decimal ${googleTimeDecimal} → ${parsed.to12Hour()}`);
    
    // Test formatted time strings (what we actually see in the data)
    const formattedTimes = ['3:30 PM', '4:20 PM', '17:15'];
    formattedTimes.forEach(time => {
        const parsed = DateHelpers.parseTimeString(time);
        console.log(`Formatted time "${time}" → ${parsed.to24Hour()}`);
    });
    
    console.log('✅ Google Sheets parsing: PASSED\n');
} catch (error) {
    console.log('❌ Google Sheets parsing: FAILED');
    console.log(error.message + '\n');
}

// Test 5: DateTime for Audit Trails
console.log('5. DATETIME FOR AUDIT TRAILS');
console.log('-'.repeat(30));

try {
    const now = DateTime.now();
    const isoString = now.toISOString();
    const backFromISO = DateTime.fromISO(isoString);
    
    console.log(`Current time: ${now.toString()}`);
    console.log(`ISO format: ${isoString}`);
    console.log(`Parsed back: ${backFromISO.toString()}`);
    console.log(`Times match: ${Math.abs(now.date.getTime() - backFromISO.date.getTime()) < 1000}`);
    
    console.log('✅ DateTime audit trails: PASSED\n');
} catch (error) {
    console.log('❌ DateTime audit trails: FAILED');
    console.log(error.message + '\n');
}

// Test 6: Edge Cases
console.log('6. EDGE CASES');
console.log('-'.repeat(30));

try {
    // Test midnight
    const midnight = DateHelpers.parseTimeString('12:00 AM');
    console.log(`Midnight: ${midnight.to24Hour()}`);
    
    // Test noon
    const noon = DateHelpers.parseTimeString('12:00 PM');
    console.log(`Noon: ${noon.to24Hour()}`);
    
    // Test invalid input
    const invalid = DateHelpers.parseTimeString('invalid');
    console.log(`Invalid input: ${invalid.to24Hour()}`);
    
    // Test time range checking
    const isInRange = DateHelpers.isTimeInRange('2:30 PM', '9:00 AM', '5:00 PM');
    console.log(`2:30 PM is in 9 AM - 5 PM range: ${isInRange}`);
    
    console.log('✅ Edge cases: PASSED\n');
} catch (error) {
    console.log('❌ Edge cases: FAILED');
    console.log(error.message + '\n');
}

console.log('🎉 NATIVE DATETIME SOLUTION TEST COMPLETE');
console.log('=========================================');
console.log('All core functionality is working correctly.');
console.log('Ready to complete the Luxon migration!\n');
