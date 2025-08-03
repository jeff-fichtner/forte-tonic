/**
 * Memory footprint calculator for caching all spreadsheet data
 * This estimates memory usage for server-side caching
 */

// Estimated field sizes in bytes (assuming UTF-8 encoding)
const FIELD_SIZES = {
    // Basic data types
    id: 36,           // UUID: "550e8400-e29b-41d4-a716-446655440000"
    email: 50,        // Average email: "user@domain.com"
    name: 30,         // Average name: "First Last"
    phone: 15,        // Phone: "+1-555-123-4567"
    address: 100,     // Full address
    date: 24,         // ISO date: "2023-01-01T00:00:00.000Z"
    time: 8,          // Time: "09:30 AM"
    grade: 2,         // Grade: "K", "1", "12"
    boolean: 1,       // true/false
    shortText: 50,    // General short text fields
    longText: 200,    // Longer text fields like notes
    instrument: 20,   // "Piano", "Guitar", etc.
    
    // Object overhead
    objectOverhead: 32,  // V8 object header overhead
    arrayOverhead: 16,   // Array header overhead
    stringOverhead: 24   // String object overhead per field
};

// Data model definitions with estimated record counts
const MODELS = {
    Student: {
        fields: {
            id: FIELD_SIZES.id,
            lastName: FIELD_SIZES.name,
            firstName: FIELD_SIZES.name,
            lastNickname: FIELD_SIZES.name,
            firstNickname: FIELD_SIZES.name,
            email: FIELD_SIZES.email,
            dateOfBirth: FIELD_SIZES.date,
            gradeLevel: FIELD_SIZES.grade,
            parent1Id: FIELD_SIZES.id,
            parent2Id: FIELD_SIZES.id,
            parentEmails: FIELD_SIZES.arrayOverhead + (2 * FIELD_SIZES.email), // Array of 2 emails
            emergencyContactName: FIELD_SIZES.name,
            emergencyContactPhone: FIELD_SIZES.phone,
            medicalNotes: FIELD_SIZES.longText,
            isActive: FIELD_SIZES.boolean
        },
        estimatedCount: 500 // Typical K-12 school enrollment
    },
    
    Parent: {
        fields: {
            id: FIELD_SIZES.id,
            email: FIELD_SIZES.email,
            lastName: FIELD_SIZES.name,
            firstName: FIELD_SIZES.name,
            phone: FIELD_SIZES.phone,
            address: FIELD_SIZES.address,
            alternatePhone: FIELD_SIZES.phone,
            relationship: FIELD_SIZES.shortText,
            isEmergencyContact: FIELD_SIZES.boolean,
            isActive: FIELD_SIZES.boolean
        },
        estimatedCount: 800 // ~1.6 parents per student on average
    },
    
    Instructor: {
        fields: {
            id: FIELD_SIZES.id,
            lastName: FIELD_SIZES.name,
            firstName: FIELD_SIZES.name,
            email: FIELD_SIZES.email,
            phone: FIELD_SIZES.phone,
            address: FIELD_SIZES.address,
            instruments: FIELD_SIZES.arrayOverhead + (3 * FIELD_SIZES.instrument), // Array of 3 instruments
            certifications: FIELD_SIZES.longText,
            hourlyRate: 8, // Number
            isActive: FIELD_SIZES.boolean,
            availability: FIELD_SIZES.longText
        },
        estimatedCount: 25 // Teaching staff
    },
    
    Registration: {
        fields: {
            id: FIELD_SIZES.id,
            studentId: FIELD_SIZES.id,
            classId: FIELD_SIZES.id,
            registrationDate: FIELD_SIZES.date,
            status: FIELD_SIZES.shortText,
            paymentStatus: FIELD_SIZES.shortText,
            notes: FIELD_SIZES.longText,
            expectedStartDate: FIELD_SIZES.date,
            registrationType: FIELD_SIZES.shortText,
            isActive: FIELD_SIZES.boolean
        },
        estimatedCount: 750 // Multiple registrations per student
    },
    
    Class: {
        fields: {
            id: FIELD_SIZES.id,
            instructorId: FIELD_SIZES.id,
            day: FIELD_SIZES.shortText,
            startTime: FIELD_SIZES.time,
            endTime: FIELD_SIZES.time,
            length: 4, // Number (minutes)
            instrument: FIELD_SIZES.instrument,
            title: FIELD_SIZES.shortText,
            size: 4, // Number (max students)
            minimumGrade: FIELD_SIZES.grade,
            maximumGrade: FIELD_SIZES.grade,
            roomId: FIELD_SIZES.id,
            description: FIELD_SIZES.longText,
            isActive: FIELD_SIZES.boolean
        },
        estimatedCount: 100 // Various class offerings
    },
    
    Room: {
        fields: {
            id: FIELD_SIZES.id,
            name: FIELD_SIZES.shortText,
            capacity: 4, // Number
            instruments: FIELD_SIZES.arrayOverhead + (2 * FIELD_SIZES.instrument), // Array of 2 instruments
            isActive: FIELD_SIZES.boolean
        },
        estimatedCount: 15 // Classrooms and practice rooms
    }
};

function calculateModelSize(modelName, modelConfig) {
    const { fields, estimatedCount } = modelConfig;
    
    // Calculate size per record
    let recordSize = FIELD_SIZES.objectOverhead; // Base object overhead
    
    for (const [fieldName, fieldSize] of Object.entries(fields)) {
        recordSize += FIELD_SIZES.stringOverhead; // Property name overhead
        recordSize += fieldSize; // Field value size
    }
    
    const totalSize = recordSize * estimatedCount;
    
    return {
        recordSize,
        estimatedCount,
        totalSize,
        totalSizeMB: totalSize / (1024 * 1024)
    };
}

function calculateTotalCacheSize() {
    console.log('📊 TONIC SERVER CACHE MEMORY ANALYSIS');
    console.log('=====================================\n');
    
    let grandTotal = 0;
    
    for (const [modelName, modelConfig] of Object.entries(MODELS)) {
        const analysis = calculateModelSize(modelName, modelConfig);
        
        console.log(`${modelName}:`);
        console.log(`  Records: ${analysis.estimatedCount.toLocaleString()}`);
        console.log(`  Size per record: ${analysis.recordSize} bytes`);
        console.log(`  Total size: ${(analysis.totalSize / 1024).toFixed(1)} KB (${analysis.totalSizeMB.toFixed(2)} MB)`);
        console.log('');
        
        grandTotal += analysis.totalSize;
    }
    
    // Add cache overhead (Redis/memory overhead ~20-30%)
    const cacheOverhead = grandTotal * 0.25;
    const totalWithOverhead = grandTotal + cacheOverhead;
    
    console.log('SUMMARY:');
    console.log('========');
    console.log(`Raw data size: ${(grandTotal / 1024).toFixed(1)} KB (${(grandTotal / (1024 * 1024)).toFixed(2)} MB)`);
    console.log(`Cache overhead (~25%): ${(cacheOverhead / 1024).toFixed(1)} KB`);
    console.log(`Total cache memory: ${(totalWithOverhead / 1024).toFixed(1)} KB (${(totalWithOverhead / (1024 * 1024)).toFixed(2)} MB)`);
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('===================');
    
    if (totalWithOverhead < 1024 * 1024) { // < 1MB
        console.log('✅ EXCELLENT: Cache size is very manageable');
        console.log('   • Perfect for in-memory caching');
        console.log('   • No memory concerns even on minimal servers');
        console.log('   • Consider aggressive caching with short TTL');
    } else if (totalWithOverhead < 10 * 1024 * 1024) { // < 10MB
        console.log('✅ GOOD: Cache size is reasonable');
        console.log('   • Safe for in-memory caching');
        console.log('   • Minimal impact on server resources');
        console.log('   • Standard caching strategies apply');
    } else if (totalWithOverhead < 50 * 1024 * 1024) { // < 50MB
        console.log('⚠️  MODERATE: Monitor memory usage');
        console.log('   • Consider partial caching strategies');
        console.log('   • Monitor memory usage in production');
        console.log('   • May need cache eviction policies');
    } else {
        console.log('🚨 HIGH: Large cache size detected');
        console.log('   • Consider selective caching');
        console.log('   • Implement cache partitioning');
        console.log('   • Monitor memory usage closely');
    }
    
    return {
        totalBytes: totalWithOverhead,
        totalKB: totalWithOverhead / 1024,
        totalMB: totalWithOverhead / (1024 * 1024)
    };
}

// Run the analysis
calculateTotalCacheSize();
