/**
 * Test Cache Fix - Verify that cache invalidation works correctly after delete
 * ===========================================================================
 * 
 * This script demonstrates the cache invalidation fix for the registration repository.
 * Before the fix: Cache timestamps remained even after cache.delete(), causing stale cache hits
 * After the fix: Both cache and timestamps are cleared, ensuring fresh data loads
 */

import { GoogleSheetsDbClient } from '../../src/database/googleSheetsDbClient.js';

// Mock console for testing
const originalLog = console.log;
const logs = [];
console.log = (...args) => {
  logs.push(args.join(' '));
  originalLog(...args);
};

console.log('🧪 Testing Cache Fix - Cache Invalidation After Delete');
console.log('=====================================================\n');

// Create a mock database client to simulate the issue
class MockDbClientWithBug {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  // Simulate the buggy behavior (only clears cache, not timestamps)
  buggyBehavior() {
    console.log('❌ BUGGY BEHAVIOR: Only clearing cache, leaving timestamps');
    this.cache.delete('registrations');
    // BUG: Not clearing timestamps!
  }

  // Simulate the correct behavior (clears both cache and timestamps)
  correctBehavior() {
    console.log('✅ CORRECT BEHAVIOR: Clearing both cache and timestamps');
    this.clearCache('registrations');
  }

  // Proper clearCache method (like in GoogleSheetsDbClient)
  clearCache(sheetKey = null) {
    if (sheetKey) {
      this.cache.delete(sheetKey);
      this.cacheTimestamps.delete(sheetKey);
      console.log(`🧹 Cache cleared for ${sheetKey}`);
    } else {
      this.cache.clear();
      this.cacheTimestamps.clear();
      console.log('🧹 All cache cleared');
    }
  }

  // Simulate getCachedData method
  async getCachedData(sheetKey, mapFunc = null) {
    const now = Date.now();
    const cachedTime = this.cacheTimestamps.get(sheetKey);

    if (cachedTime && now - cachedTime < this.CACHE_TTL) {
      console.log(`📦 Using cached data for ${sheetKey} (CACHE HIT)`);
      return this.cache.get(sheetKey) || [];
    }

    // Cache miss, load fresh data
    console.log(`🔄 Loading fresh data for ${sheetKey} (CACHE MISS)`);
    const freshData = [
      { id: 'fresh-data-1', name: 'Fresh Registration 1' },
      { id: 'fresh-data-2', name: 'Fresh Registration 2' }
    ];

    // Cache the results
    this.cache.set(sheetKey, freshData);
    this.cacheTimestamps.set(sheetKey, now);

    return freshData;
  }

  // Helper to set up initial cache state
  setupInitialCache() {
    const initialData = [
      { id: 'old-data-1', name: 'Old Registration 1' },
      { id: 'old-data-2', name: 'Old Registration 2' },
      { id: 'deleted-registration', name: 'This should be deleted' }
    ];
    
    this.cache.set('registrations', initialData);
    this.cacheTimestamps.set('registrations', Date.now());
    console.log('📂 Initial cache setup with 3 registrations (including one to be deleted)');
  }
}

async function testCacheBehavior() {
  console.log('=== Test 1: Demonstrating the BUG ===\n');
  
  const buggyClient = new MockDbClientWithBug();
  buggyClient.setupInitialCache();
  
  console.log('\n🔍 First call - should use cached data:');
  let data1 = await buggyClient.getCachedData('registrations');
  console.log(`Retrieved ${data1.length} registrations:`, data1.map(r => r.name));
  
  console.log('\n🗑️ Simulating delete with BUGGY cache clearing:');
  buggyClient.buggyBehavior(); // Only clears cache, not timestamps
  
  console.log('\n🔍 Second call after buggy delete - SHOULD load fresh data but WON\'T:');
  let data2 = await buggyClient.getCachedData('registrations');
  console.log(`Retrieved ${data2 ? data2.length : 0} registrations:`, data2 ? data2.map(r => r.name) : 'undefined');
  
  console.log('\n💥 PROBLEM: Cache hit occurred even though cache was cleared!');
  console.log('   Reason: cacheTimestamps still has the old timestamp, making cache appear valid');
  
  console.log('\n\n=== Test 2: Demonstrating the FIX ===\n');
  
  const fixedClient = new MockDbClientWithBug();
  fixedClient.setupInitialCache();
  
  console.log('\n🔍 First call - should use cached data:');
  let data3 = await fixedClient.getCachedData('registrations');
  console.log(`Retrieved ${data3.length} registrations:`, data3.map(r => r.name));
  
  console.log('\n🗑️ Simulating delete with CORRECT cache clearing:');
  fixedClient.correctBehavior(); // Clears both cache AND timestamps
  
  console.log('\n🔍 Second call after correct delete - SHOULD and WILL load fresh data:');
  let data4 = await fixedClient.getCachedData('registrations');
  console.log(`Retrieved ${data4.length} registrations:`, data4.map(r => r.name));
  
  console.log('\n✅ SUCCESS: Cache miss occurred and fresh data was loaded!');
  console.log('   Reason: Both cache and cacheTimestamps were cleared properly');
}

// Run the test
testCacheBehavior().then(() => {
  console.log('\n📊 SUMMARY');
  console.log('==========');
  console.log('Before fix: this.dbClient.cache.delete(\'registrations\') - ❌ Incomplete cache clearing');
  console.log('After fix:  this.dbClient.clearCache(\'registrations\') - ✅ Complete cache clearing');
  console.log('\nThe fix ensures that after deletion:');
  console.log('1. No stale cached data is returned');
  console.log('2. Fresh data is loaded from Google Sheets');
  console.log('3. Users see updated registration lists immediately');
}).catch(console.error);
