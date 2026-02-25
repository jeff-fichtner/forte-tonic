/**
 * Registration Form Constants
 * Centralized display text and configuration for both admin and parent registration forms
 */

// UI Display Text
export const RegistrationFormText = {
  // Student selector
  STUDENT_PLACEHOLDER: 'Select a student',
  STUDENT_EMPTY: 'No students available',

  // Registration type
  REG_TYPE_PLACEHOLDER: 'Select registration type',
  REG_TYPE_EMPTY: 'No registration types available',

  // Instructor selector
  INSTRUCTOR_PLACEHOLDER: 'Select an instructor',
  INSTRUCTOR_EMPTY: 'No instructors available',

  // Class selector
  CLASS_PLACEHOLDER: 'Select a class',
  CLASS_EMPTY: 'No classes available',

  // Lesson details
  DAY_PLACEHOLDER: 'Choose day',
  DAY_EMPTY: 'No days available',
  TIME_PLACEHOLDER: 'Choose start time',
  TIME_EMPTY: 'No times available',
  INSTRUMENT_PLACEHOLDER: 'Choose instrument',
  INSTRUMENT_EMPTY: 'No instruments available',

  // Success/Error messages
  SUCCESS_CREATED: 'Registration created successfully!',
  ERROR_CREATE: 'Error creating registration',
  ERROR_VALIDATION: 'Please fill out the following fields',
  ERROR_INVALID_CLASS: 'Please select a valid class',

  // Loading states
  LOADING_CREATE: 'Creating...',
  BUTTON_CREATE: 'Create',
  BUTTON_REGISTER: 'Register',

  // Bus validation messages
  BUS_ERROR_TEMPLATE: (deadlineDisplay: string, day: string, endTimeDisplay: string): string =>
    `Late Bus is not available for lessons ending after ${deadlineDisplay} on ${day}. This lesson ends at ${endTimeDisplay}. Please select "Late Pick Up" instead or choose a different time slot.`,
};

// Week Days - for dropdowns and day selection
export const WeekDays = [
  { value: '0', label: 'Monday' },
  { value: '1', label: 'Tuesday' },
  { value: '2', label: 'Wednesday' },
  { value: '3', label: 'Thursday' },
  { value: '4', label: 'Friday' },
];

// Day Names - indexed array for conversion from numeric values
export const DayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Transportation Types
export const TransportationType = {
  BUS: 'bus',
  PICKUP: 'pickup',
};
