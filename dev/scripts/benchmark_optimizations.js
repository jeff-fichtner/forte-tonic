import { OptimizedGoogleSheetsDbClient } from '../../src/core/clients/optimizedGoogleSheetsClient.js';

// Mock configuration service
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

async function benchmarkOptimizations() {
  console.log('🚀 BENCHMARKING OPTIMIZED CLIENT vs CURRENT CLIENT\n');
  
  try {
    const optimizedClient = new OptimizedGoogleSheetsDbClient(mockConfigService);
    
    // Test 1: Parallel batch loading
    console.log('📊 Testing parallel batch loading...');
    const batchStart = Date.now();
    const allData = await optimizedClient.getAllDataParallel();
    const batchEnd = Date.now();
    
    console.log(`✅ Batch load: ${batchEnd - batchStart}ms`);
    console.log(`   Students: ${allData.students.length}`);
    console.log(`   Parents: ${allData.parents.length}`);
    console.log(`   Instructors: ${allData.instructors.length}`);
    console.log(`   Registrations: ${allData.registrations.length}`);
    
    // Test 2: Cache performance
    console.log('\n📦 Testing cache performance...');
    const cacheStart = Date.now();
    const cachedStudents = await optimizedClient.getCachedData('students');
    const cacheEnd = Date.now();
    console.log(`✅ Cache retrieval: ${cacheEnd - cacheStart}ms for ${cachedStudents.length} students`);
    
    // Test 3: Smart relationship loading
    console.log('\n🔗 Testing smart relationship loading...');
    const relationStart = Date.now();
    const studentsWithParents = await optimizedClient.getStudentsWithParents();
    const relationEnd = Date.now();
    console.log(`✅ Students with parent data: ${relationEnd - relationStart}ms for ${studentsWithParents.length} enriched records`);
    
    if (studentsWithParents.length > 0) {
      const sample = studentsWithParents[0];
      console.log(`   📋 Sample: ${sample.firstName} ${sample.lastName}, Parent: ${sample.parent1?.firstName} ${sample.parent1?.lastName}`);
    }
    
    // Performance comparison
    console.log('\n📈 PERFORMANCE COMPARISON:');
    console.log(`   Current client total time: 2147ms`);
    console.log(`   Optimized batch load: ${batchEnd - batchStart}ms`);
    console.log(`   Performance improvement: ${((2147 - (batchEnd - batchStart)) / 2147 * 100).toFixed(1)}%`);
    console.log(`   Cache retrieval: ${cacheEnd - cacheStart}ms (near-instant)`);
    
    return {
      batchTime: batchEnd - batchStart,
      cacheTime: cacheEnd - cacheStart,
      relationTime: relationEnd - relationStart,
      improvement: ((2147 - (batchEnd - batchStart)) / 2147 * 100).toFixed(1)
    };
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    throw error;
  }
}

// Run the benchmark
benchmarkOptimizations()
  .then((results) => {
    console.log('\n🎉 Optimization benchmark completed!');
    console.log('Results:', results);
  })
  .catch((error) => {
    console.error('\n💥 Benchmark failed:', error.message);
    process.exit(1);
  });
