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
 */
export const FORTE_PROGRAM_EMAIL: string = 'forte@mcds.org';

/**
 * General program contact phone
 * Used in registration forms and general communication
 */
export const FORTE_PROGRAM_PHONE: string = '(415) 945-5122';

/**
 * Note: Admin-specific emails and phones come from the Admins database table
 * via the displayEmail and displayPhone fields. These constants are only for
 * organization-level contact information not tied to specific individuals.
 */

// Re-export UserType from its canonical location in utils/values
export { UserType } from '../utils/values/userType.js';
