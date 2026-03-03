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

// Application sections/roles
export const Sections = {
  ADMIN: 'admin',
  INSTRUCTOR: 'instructor',
  PARENT: 'parent',
};

// Server API endpoints - REST API
export const ServerFunctions = {
  getAppConfiguration: 'configuration',
  register: 'registrations',
  authenticateByAccessCode: 'auth/access-code',
  submitFeedback: 'feedback',
};

// Registration types — re-exported from shared values
export { RegistrationType } from '/utils/values/registrationType.js';
