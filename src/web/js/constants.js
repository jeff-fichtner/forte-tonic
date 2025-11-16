/**
 * Application Constants
 */

// Date/Time utilities - Native JavaScript implementation
import { Duration, DateTime, DateHelpers } from '../../utils/nativeDateTimeHelpers.js';

export { Duration, DateTime, DateHelpers };

/**
 * Organization Configuration Constants
 *
 * These values are hardcoded for now but should eventually be moved to the database
 * as organization settings to enable multi-tenant deployment.
 *
 * TODO: Move these to a database configuration table
 * See: dev/plans/hardcoded-configuration-migration.md - Future Enhancements
 */

/**
 * General program contact email
 * Used in registration forms, waitlist messages, and general communication
 * @type {string}
 * @constant
 */
export const FORTE_PROGRAM_EMAIL = 'forte@mcds.org';

/**
 * General program contact phone
 * Used in registration forms and general communication
 * @type {string}
 * @constant
 */
export const FORTE_PROGRAM_PHONE = '(415) 945-5122';

/**
 * Note: Admin-specific emails and phones come from the Admins database table
 * via the displayEmail and displayPhone fields. These constants are only for
 * organization-level contact information not tied to specific individuals.
 */

/**
 * User Types
 * Used for authentication and authorization throughout the application
 * @enum {string}
 * @constant
 */
export const UserType = Object.freeze({
  ADMIN: 'admin',
  INSTRUCTOR: 'instructor',
  PARENT: 'parent',
});

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
window.FORTE_PROGRAM_EMAIL = FORTE_PROGRAM_EMAIL;
window.FORTE_PROGRAM_PHONE = FORTE_PROGRAM_PHONE;
window.UserType = UserType;
