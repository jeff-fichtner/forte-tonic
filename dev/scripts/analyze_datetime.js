#!/usr/bin/env node

import { GoogleSheetsDbClient } from '../../src/core/clients/googleSheetsDbClient.js';
import { DateHelpers } from '../../src/core/helpers/dateHelpers.js';

const dbClient = new GoogleSheetsDbClient();

console.log('📅 ANALYZING DATE/TIME FORMATS IN GOOGLE SHEETS\n');

try {
    // Get some sample classes to examine date/time formats
    console.log('🔍 Examining Classes for StartTime/EndTime formats:');
    const classes = await dbClient.getAllFromSheet('classes');
    
    console.log(`\n📊 Classes data structure:`);
    console.log(`   Type: ${typeof classes}`);
    console.log(`   Length: ${classes?.length}`);
    console.log(`   First item type: ${typeof classes?.[0]}`);
    console.log(`   First item keys: ${classes?.[0] ? Object.keys(classes[0]) : 'N/A'}`);
    console.log(`   First item:`, classes?.[0]);
    
    classes.slice(0, 3).forEach((cls, index) => {
        console.log(`\n📚 Class ${index + 1}:`);
        console.log(`   id: ${cls.id}`);
        console.log(`   dayOfWeek: ${cls.dayOfWeek}`);
        console.log(`   startTime RAW: "${cls.startTime}" (type: ${typeof cls.startTime})`);
        console.log(`   endTime RAW: "${cls.endTime}" (type: ${typeof cls.endTime})`);
        console.log(`   lengthOption: ${cls.lengthOption}`);
        
        // Try parsing with DateHelpers
        try {
            const parsedStart = DateHelpers.parseGoogleSheetsDate(cls.startTime);
            console.log(`   startTime PARSED: "${parsedStart}"`);
        } catch (e) {
            console.log(`   startTime PARSE ERROR: ${e.message}`);
        }
        
        try {
            const parsedEnd = DateHelpers.parseGoogleSheetsDate(cls.endTime);
            console.log(`   endTime PARSED: "${parsedEnd}"`);
        } catch (e) {
            console.log(`   endTime PARSE ERROR: ${e.message}`);
        }
    });
    
    console.log('\n🔍 Examining Registrations for date/time formats:');
    const registrations = await dbClient.getAllFromSheet('registrations');
    
    console.log(`\n📊 Registrations data structure:`);
    console.log(`   Type: ${typeof registrations}`);
    console.log(`   Length: ${registrations?.length}`);
    console.log(`   First item keys: ${registrations?.[0] ? Object.keys(registrations[0]) : 'N/A'}`);
    console.log(`   First item:`, registrations?.[0]);
    
    registrations.slice(0, 3).forEach((reg, index) => {
        console.log(`\n📝 Registration ${index + 1}:`);
        console.log(`   id: ${reg.id}`);
        console.log(`   dayOfWeek: ${reg.dayOfWeek}`);
        console.log(`   startTime RAW: "${reg.startTime}" (type: ${typeof reg.startTime})`);
        console.log(`   lengthOption: ${reg.lengthOption}`);
        
        // Check if there are any actual date fields
        Object.keys(reg).forEach(key => {
            if (key.toLowerCase().includes('date') || key.toLowerCase().includes('created') || key.toLowerCase().includes('modified')) {
                console.log(`   ${key}: "${reg[key]}" (type: ${typeof reg[key]})`);
            }
        });
    });
    
    console.log('\n🔍 Examining Students for any date fields:');
    const students = await dbClient.getAllFromSheet('students');
    
    students.slice(0, 2).forEach((student, index) => {
        console.log(`\n👨‍🎓 Student ${index + 1}:`);
        Object.keys(student).forEach(key => {
            if (key.toLowerCase().includes('date') || key.toLowerCase().includes('birth') || key.toLowerCase().includes('created')) {
                console.log(`   ${key}: "${student[key]}" (type: ${typeof student[key]})`);
            }
        });
    });
    
    console.log('\n📊 DATETIME ANALYSIS SUMMARY:');
    console.log('='.repeat(50));
    
    // Check what Date.now() looks like vs Google Sheets dates
    const now = new Date();
    console.log(`\n⏰ Current JavaScript Date:`);
    console.log(`   new Date(): ${now}`);
    console.log(`   ISO String: ${now.toISOString()}`);
    console.log(`   valueOf(): ${now.valueOf()}`);
    
    // Test Google Sheets epoch
    const googleEpoch = new Date('1899-12-30T00:00:00.000Z');
    console.log(`\n📅 Google Sheets Epoch (1899-12-30):`);
    console.log(`   Date: ${googleEpoch}`);
    console.log(`   valueOf(): ${googleEpoch.valueOf()}`);
    
} catch (error) {
    console.error('❌ Error analyzing datetime formats:', error);
}
