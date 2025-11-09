/**
 * Application Constants
 */

// Date/Time utilities - Native JavaScript implementation
import { Duration, DateTime, DateHelpers } from '../../utils/nativeDateTimeHelpers.js';

export { Duration, DateTime, DateHelpers };

// Month abbreviations
export const MonthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// Application sections/roles
export const Sections = {
  ADMIN: 'admin',
  INSTRUCTOR: 'instructor',
  PARENT: 'parent',
};

// Server API endpoints - REST API
export const ServerFunctions = {
  getAppConfiguration: 'configuration',
  getAdmins: 'admins',
  getInstructors: 'instructors',
  getStudents: 'students',
  getClasses: 'classes',
  getRegistrations: 'registrations',
  getRooms: 'rooms',
  register: 'registrations',
  authenticateByAccessCode: 'authenticateByAccessCode',
  // Next trimester registration (enrollment periods only)
  getNextTrimesterRegistrations: 'registrations/next-trimester',
  createNextTrimesterRegistration: 'registrations/next-trimester',
  // Feedback
  submitFeedback: 'feedback',
};

// IndexedDB data stores
export const DataStores = {
  STUDENTS: 'students',
};

// Registration types
export const RegistrationType = {
  PRIVATE: 'private',
  GROUP: 'group',
  // REMOTE: 'remote',
};

// Session configuration
export const SessionConfig = {
  MAX_AGE_MS: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
};

// Filter constants
export const FilterValue = {
  ALL: 'all',
};

// Expose to window for console debugging and runtime access
// Expose to window for console debugging and runtime access
window.DateTime = DateTime;
window.Duration = Duration;
window.DateHelpers = DateHelpers;
window.MonthNames = MonthNames;
window.Sections = Sections;
window.ServerFunctions = ServerFunctions;
window.DataStores = DataStores;
window.RegistrationType = RegistrationType;
window.SessionConfig = SessionConfig;
window.FilterValue = FilterValue;
