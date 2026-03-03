/**
 * Controllers
 * ===========
 *
 * HTTP request handlers — thin layer between Express routes and services.
 * Controllers validate input, delegate to services/repositories, and format responses.
 *
 * - RegistrationController — registration CRUD, enrollment access control, tab data endpoints
 * - UserController         — authentication, user lookups, app configuration, contact/directory tabs
 * - AttendanceController   — attendance recording and summary reporting
 * - SystemController       — health checks, Google Sheets diagnostics, cache management
 * - FeedbackController     — user feedback submission (logged to Cloud Logging)
 */

export { AttendanceController } from './attendanceController.js';
export { FeedbackController } from './feedbackController.js';
export { RegistrationController } from './registrationController.js';
export { SystemController } from './systemController.js';
export { UserController } from './userController.js';
