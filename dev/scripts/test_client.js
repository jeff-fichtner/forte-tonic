import { GoogleSheetsDbClient } from '../../src/core/clients/googleSheetsDbClient.js';
import { Student } from '../../src/core/models/student.js';
import { Parent } from '../../src/core/models/parent.js';
import { Instructor } from '../../src/core/models/instructor.js';
import { Registration } from '../../src/core/models/registration.js';

// Create a mock configuration service for testing
const mockConfigService = {
  getGoogleSheetsAuth: () => ({
    clientEmail: 'noah-tonic@tonic-467721.iam.gserviceaccount.com',
    privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9nuIlTpjYQO/N
In5nHnNXw2FZLtEfnYzMSesWLYjuZPehOVUngt/Lmi2fKqcOHZ8l6mn6onygrm/j
kJhgr5OohCPX6jwP96Pdk+PNIr+dOAtgECgbjnp6bsSbUGcIw+z58zVLYk7cE6aW
uyO+O7FpipQdOjwDb20juTrQyQW7N2qn1915IVmJJ20OLft5LJH0l6mJbLri5sio
jzqecX+m+a3geYejgp16oMYQ/WQTMslYfJzlw3hZ1UNondGW+1nlrW+UQqhuxFAW
D+9iw7ij5dX7KdmhEU52NFraQYI+pQmhnd2fXXVYvhHOtQvymP1qENXUdnIZ48Oi
lyJTtlTBAgMBAAECggEASGDWsmXTWqxCvFrfw82wOj42MNv5b+dr4GiQptj/rPt2
OCCRu/CtKuKxalFWDcHJxye4hzYxewXKaKL/PtyV8JtrsRVUEsY0UrYKHHmYiVLk
qKjSHl6eqpAQVLZ2dbaPhILMg3dFYaTQkDVjedAAMqh2S8e4M5l7H8kqxZoNqX1e
Ezpe7RirJARSslL2BEf4Ix7FYuNNlbrzIg+yKk+yyPYTTbxLN3POhZb1mK8XqttH
cC6RYyWhoQWItJ9DWGpcrqOqH13k8hXENsfonzlnWlDHs37bcZz/qXDv8s0uMyXU
aE92c/5JiAVW8wRqF58llOvmaclDcYp6r98A427+/wKBgQD/vGnWlVpSUXTAKRdB
oyzxZcn0FgEdinJHy/w/tzDBYhj0fOwNCoDWxyIxFAw127IieEborKaulknyjrmJ
nTMwDDsiyjZcH33BG6zPzD9ocl7RLPxo46qfYhBMWQwgMelRIIZXwBncSqRqwnbz
P0F40kh3ksT6lLDrTyjjVLFSFwKBgQC90P8vQwlVsUTfBd7kidrszYGPYplzkkeu
bUZP9dUHJXovc41OL6vzrypy/tlIBs+1fWitWAiDL5WX3GJJ2gzhp/P2enC1H3t2
pFdkOUXLiZd+qjiQo3GsCjaTWbh8gWgpkHLlhC1MaX5BOXN9TVh/j/bgcTDg7x9z
LZBtz4gO5wKBgQDNmdv5Yc/g2I4lo6OH6LlMRkqMC1jQOCtSn6PoUc5H2yc3AGwC
vAwDIMvTa0u5zSw03EAd9hh3ymofMTHnelPZ8Ctm9+2mOMcwhqBz28CqpzCluSYg
6dCWHQ//YaQHCjmLOLvpNo9T9Uqkbj2VqKhpi54pS/1DfGGUfOrhgYih9wKBgFvZ
JaHY7kto28qPLKupiSXMy0R2kYo63jSo670FV2990wHjCB0tNCdWO1QpvTn9EcTg
SiaW0oeoHtq86VKTEGigvIwn8yGxeiyOmTsF+5/hlEzWUUirzfVRe9cRMxQMCjsS
ioZEzyaKZW1qP1gCdTBEmVFBdEVjb/Rrt9dq9ItBAoGAFNE7mx6GdLvpIriKUEm3
iQSME/HkWeywDZUsJB/txjBBv9bMnh+ANtn0Go/VAlYAEls2x17uKXy0oCSKmFUa
d6DGhwW3UBN5XHib5d7RErUcF7UfXJXvEdHcPE7wDa5A5Uz1brjtjm2E7sKayBBK
uNdIEP32Yw1EttLrv5mABlo=
-----END PRIVATE KEY-----`
  }),
  getGoogleSheetsConfig: () => ({
    spreadsheetId: '17zTUME5PD3FHQmxyUIUn1S_u8QCVeMNf0VRPZXR0FlE'
  })
};

async function testCurrentClient() {
  console.log('🧪 Testing Current GoogleSheetsDbClient Implementation...\n');
  
  try {
    // Initialize your existing client
    const client = new GoogleSheetsDbClient(mockConfigService);
    
    console.log('✅ Client initialized successfully\n');
    
    // Test performance of key operations
    console.log('📊 PERFORMANCE TESTING:\n');
    
    // Test 1: Get all students (using correct lowercase key and mapping function)
    console.log('🎓 Testing getAllRecords for students...');
    const startStudents = Date.now();
    const students = await client.getAllRecords('students', x => new Student(...x));
    const endStudents = Date.now();
    console.log(`   ✅ Retrieved ${students.length} students in ${endStudents - startStudents}ms`);
    
    if (students.length > 0) {
      console.log(`   📋 Sample student: ${students[0].firstName} ${students[0].lastName} (ID: ${students[0].id})`);
    }
    
    // Test 2: Get all parents
    console.log('\n👨‍👩‍👧‍👦 Testing getAllRecords for parents...');
    const startParents = Date.now();
    const parents = await client.getAllRecords('parents', x => new Parent(...x));
    const endParents = Date.now();
    console.log(`   ✅ Retrieved ${parents.length} parents in ${endParents - startParents}ms`);
    
    if (parents.length > 0) {
      console.log(`   📋 Sample parent: ${parents[0].firstName} ${parents[0].lastName} (${parents[0].email})`);
    }
    
    // Test 3: Get all instructors
    console.log('\n👨‍🏫 Testing getAllRecords for instructors...');
    const startInstructors = Date.now();
    const instructors = await client.getAllRecords('instructors', x => new Instructor(...x));
    const endInstructors = Date.now();
    console.log(`   ✅ Retrieved ${instructors.length} instructors in ${endInstructors - startInstructors}ms`);
    
    if (instructors.length > 0) {
      console.log(`   📋 Sample instructor: ${instructors[0].firstName} ${instructors[0].lastName} (${instructors[0].email})`);
    }
    
    // Test 4: Get registrations
    console.log('\n📝 Testing getAllRecords for registrations...');
    const startRegs = Date.now();
    const registrations = await client.getAllRecords('registrations', x => new Registration(...x));
    const endRegs = Date.now();
    console.log(`   ✅ Retrieved ${registrations.length} registrations in ${endRegs - startRegs}ms`);
    
    if (registrations.length > 0) {
      console.log(`   📋 Sample registration: Student ${registrations[0].studentId} -> Instructor ${registrations[0].instructorId}`);
    }
    
    // Test 5: Test specific query
    if (students.length > 0 && students[0].id) {
      console.log('\n🔍 Testing getFromSheetByColumnValue...');
      const startQuery = Date.now();
      const specificStudent = await client.getFromSheetByColumnValue('students', 'id', students[0].id);
      const endQuery = Date.now();
      console.log(`   ✅ Found specific student in ${endQuery - startQuery}ms`);
      console.log(`   📋 Result: ${specificStudent.length} records found`);
    }
    
    console.log('\n📈 PERFORMANCE SUMMARY:');
    console.log(`   Students: ${endStudents - startStudents}ms for ${students.length} records`);
    console.log(`   Parents: ${endParents - startParents}ms for ${parents.length} records`);
    console.log(`   Instructors: ${endInstructors - startInstructors}ms for ${instructors.length} records`);
    console.log(`   Registrations: ${endRegs - startRegs}ms for ${registrations.length} records`);
    
    const totalTime = (endStudents - startStudents) + (endParents - startParents) + (endInstructors - startInstructors) + (endRegs - startRegs);
    console.log(`   Total time for all data: ${totalTime}ms`);
    
    return {
      students: students.length,
      parents: parents.length,
      instructors: instructors.length,
      registrations: registrations.length,
      totalTime
    };
    
  } catch (error) {
    console.error('❌ Error testing client:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Run the test
testCurrentClient()
  .then((results) => {
    console.log('\n🎉 Client testing completed successfully!');
    console.log('Results:', results);
  })
  .catch((error) => {
    console.error('\n💥 Client testing failed:', error.message);
    process.exit(1);
  });
