// Debug script to test phone formatting
import { formatPhone } from './src/web/js/utilities/phoneHelpers.js';

console.log('Testing phone formatting:');

// Test cases
const testCases = [
  '4159455121',           // 10 digits unformatted
  '(415) 945-5121',       // Already formatted
  '415-945-5121',         // Dashed format
  '415.945.5121',         // Dotted format
  '415 945 5121',         // Spaced format
  '14159455121',          // 11 digits with country code
  '555-1234',             // Invalid short
  '',                     // Empty
  null,                   // Null
  undefined,              // Undefined
];

testCases.forEach(testCase => {
  const result = formatPhone(testCase);
  console.log(`Input: "${testCase}" => Output: "${result}"`);
});
