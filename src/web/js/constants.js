/**
 * Application Constants
 */

// Date/Time utilities from Luxon
export const DateTime = window.luxon.DateTime;
export const Duration = window.luxon.Duration;

// Application sections/roles
export const Sections = {
  ADMIN: 'admin',
  INSTRUCTOR: 'instructor',
  PARENT: 'parent'
};

// Server API function names
export const ServerFunctions = {
  getAuthenticatedUser: 'getAuthenticatedUser',
  getAdmins: 'getAdmins',
  getInstructors: 'getInstructors',
  getStudents: 'getStudents',
  getClasses: 'getClasses',
  getRegistrations: 'getRegistrations',
  getRooms: 'getRooms',
  register: 'register',
  unregister: 'unregister',
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
window.DateTime = DateTime;
window.Duration = Duration;
window.Sections = Sections;
window.ServerFunctions = ServerFunctions;
window.DataStores = DataStores;
window.RegistrationType = RegistrationType;
