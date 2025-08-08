/**
 * Test script to debug time formatting issue
 */

// Simulate the formatTime method from the ParentRegistrationForm
function formatTime(timeStr) {
  if (!timeStr) return '';
  console.log('🕐 formatTime input:', timeStr);
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  console.log('🕐 formatTime parsed hour:', hour, 'minutes:', minutes);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const result = `${displayHour}:${minutes || '00'} ${ampm}`;
  console.log('🕐 formatTime result:', result);
  return result;
}

// Simulate the formatTimeFromMinutes method
function formatTimeFromMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Test cases
console.log('🧪 Testing time formatting logic...\n');

const testMinutes = [
  480,  // 8:00 AM
  540,  // 9:00 AM  
  720,  // 12:00 PM (noon)
  780,  // 1:00 PM
  840,  // 2:00 PM
  900,  // 3:00 PM
  960,  // 4:00 PM
  1020, // 5:00 PM
  1080  // 6:00 PM
];

testMinutes.forEach(minutes => {
  console.log(`\n🔍 Testing ${minutes} minutes since midnight:`);
  const timeStr = formatTimeFromMinutes(minutes);
  console.log(`   formatTimeFromMinutes(${minutes}) = "${timeStr}"`);
  const formatted = formatTime(timeStr);
  console.log(`   Final formatted time: "${formatted}"`);
});

// Test edge cases
console.log('\n🔍 Testing edge cases:');
console.log('\nTesting noon (12:00):');
formatTime('12:00');

console.log('\nTesting midnight (00:00):');
formatTime('00:00');

console.log('\nTesting 1 PM (13:00):');
formatTime('13:00');

console.log('\nTesting 11 PM (23:00):');
formatTime('23:00');
