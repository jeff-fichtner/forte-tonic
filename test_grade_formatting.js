/**
 * Test script to verify grade formatting in class names
 */

import { formatClassNameWithGradeCorrection, formatClassNameForDropdown } from './src/web/js/utils/classNameFormatter.js';

// Test data that simulates classes with kindergarten grades
const testClasses = [
  {
    id: 'CLASS-001',
    title: 'Music Fundamentals',
    instrument: 'Piano',
    formattedName: 'Music Fundamentals (kindergarten-2): Monday at 3:00 PM',
    minimumGrade: 0,
    maximumGrade: 2,
    day: 'Monday',
    formattedStartTime: '3:00 PM'
  },
  {
    id: 'CLASS-002',
    title: 'Beginning Guitar',
    instrument: 'Guitar',
    formattedName: 'Beginning Guitar (0-1): Tuesday at 4:00 PM',
    minimumGrade: '0',
    maximumGrade: '1',
    day: 'Tuesday',
    formattedStartTime: '4:00 PM'
  },
  {
    id: 'CLASS-003',
    title: 'Piano Basics',
    instrument: 'Piano',
    formattedName: 'Piano Basics (K): Wednesday at 2:30 PM',
    minimumGrade: 'K',
    maximumGrade: 'K',
    day: 'Wednesday',
    formattedStartTime: '2:30 PM'
  },
  {
    id: 'CLASS-004',
    title: 'Violin Introduction',
    instrument: 'Violin',
    title: 'Violin Introduction',
    minimumGrade: 0,
    maximumGrade: 3,
    day: 'Thursday',
    formattedStartTime: '3:30 PM'
  }
];

console.log('🎵 Testing Grade Formatting in Class Names\n');

testClasses.forEach((cls, index) => {
  console.log(`Test ${index + 1}: ${cls.title}`);
  console.log(`  Original formattedName: "${cls.formattedName || 'N/A'}"`);
  console.log(`  formatClassNameWithGradeCorrection: "${formatClassNameWithGradeCorrection(cls)}"`);
  console.log(`  formatClassNameForDropdown: "${formatClassNameForDropdown(cls)}"`);
  console.log('');
});

console.log('✅ Grade formatting test completed!');
console.log('📝 Expected: All instances of "kindergarten" and "0" in grade ranges should show as "K"');
