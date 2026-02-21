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
  BUS_ERROR_TEMPLATE: (deadlineDisplay, day, endTimeDisplay) =>
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

// Default Instruments - used when instructor has no specialties
export const DefaultInstruments = [
  { value: 'Piano', label: 'Piano' },
  { value: 'Guitar', label: 'Guitar' },
  { value: 'Violin', label: 'Violin' },
  { value: 'Voice', label: 'Voice' },
  { value: 'Drums', label: 'Drums' },
  { value: 'Bass', label: 'Bass' },
  { value: 'Other', label: 'Other' },
];

// Lesson Lengths - available duration options
export const LessonLengths = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
];

// Bus Deadlines - latest end time for Late Bus by day
// Format: 24-hour time string (HH:MM)
export const BusDeadlines = {
  Monday: '16:45',
  Tuesday: '16:45',
  Wednesday: '16:15',
  Thursday: '16:45',
  Friday: '16:45',
};

// Time Slot Configuration - for generating available time slots
export const TimeSlotConfig = {
  START_HOUR: 14, // 2:00 PM
  END_HOUR: 18, // 6:00 PM
  INTERVAL_MINUTES: 15, // 15-minute intervals
};

// Transportation Types
export const TransportationType = {
  BUS: 'bus',
  PICKUP: 'pickup',
};
