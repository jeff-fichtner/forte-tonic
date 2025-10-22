/**
 * Application Constants
 */

// Date/Time utilities - Native JavaScript implementation
import { Duration, DateTime, DateHelpers } from '../../utils/nativeDateTimeHelpers.js';

export { Duration, DateTime, DateHelpers };

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
  unregister: 'unregister',
  authenticateByAccessCode: 'authenticateByAccessCode',
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

// Make constants available globally for backward compatibility
// Make available globally for backward compatibility
window.DateTime = DateTime;
window.Duration = Duration;
window.DateHelpers = DateHelpers;
window.Sections = Sections;
window.ServerFunctions = ServerFunctions;
window.DataStores = DataStores;
window.RegistrationType = RegistrationType;
