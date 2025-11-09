import express from 'express';
import { version } from '../config/environment.js';

// Import application layer controllers
import { UserController } from '../controllers/userController.js';
import { RegistrationController } from '../controllers/registrationController.js';
import { SystemController } from '../controllers/systemController.js';
import { AttendanceController } from '../controllers/attendanceController.js';
import { FeedbackController } from '../controllers/feedbackController.js';
import { extractPaginatedRequestData } from '../middleware/requestDataNormalizer.js';
import { initializeRepositories } from '../middleware/auth.js';

const router = express.Router();

// Health check endpoint for monitoring
router.get('/health', SystemController.getHealth);

// Version endpoint for frontend
router.get('/version', (req, res) => {
  res.json(version);
});

// ===== REST API ENDPOINTS =====

// Configuration
router.get('/configuration', UserController.getAppConfiguration);

// User resources
router.get('/admins', UserController.getAdmins);
router.get('/instructors', UserController.getInstructors);
router.get('/students', extractPaginatedRequestData, UserController.getStudents);

// Lookup by access code
router.get('/admins/by-access-code/:accessCode', UserController.getAdminByAccessCode);
router.get('/instructors/by-access-code/:accessCode', UserController.getInstructorByAccessCode);
router.get('/parents/by-access-code/:accessCode', UserController.getParentByAccessCode);

// Program resources
router.get('/classes', extractPaginatedRequestData, RegistrationController.getClasses);
router.get('/rooms', extractPaginatedRequestData, RegistrationController.getRooms);
router.get('/registrations', extractPaginatedRequestData, RegistrationController.getRegistrations);

// ===== AUTHENTICATION & ADMIN TOOLS =====

// Authenticate user by access code
router.post('/authenticateByAccessCode', UserController.authenticateByAccessCode);

// Test endpoint to verify Google Sheets connectivity
router.post('/testConnection', SystemController.testConnection);

// Test endpoint to get data from a specific sheet
router.post('/testSheetData', SystemController.testSheetData);

// Admin-only cache clear endpoint
router.post('/admin/clearCache', SystemController.clearCache);

// ===== NEW REPOSITORY-BASED ENDPOINTS =====

/**
 * Registration CRUD operations
 */
router.post('/registrations', initializeRepositories, RegistrationController.createRegistration);
router.delete(
  '/registrations/:id',
  initializeRepositories,
  RegistrationController.deleteRegistration
);

/**
 * Mark Attendance - New Repository Pattern
 */
router.post('/attendance', initializeRepositories, AttendanceController.markAttendance);

/**
 * Get Attendance Summary
 */
router.get('/attendance/summary/:registrationId', AttendanceController.getAttendanceSummary);

/**
 * Update reenrollment intent for a registration
 */
router.patch(
  '/registrations/:id/intent',
  initializeRepositories,
  RegistrationController.updateIntent
);

/**
 * Admin endpoints
 */
router.get('/admin/registrations/:trimester', RegistrationController.getRegistrationsByTrimester);
router.get('/admin/trimester-data/:trimester', RegistrationController.getAdminTrimesterData);

/**
 * Next trimester registration endpoints (enrollment periods only)
 */
router.get(
  '/registrations/next-trimester',
  initializeRepositories,
  RegistrationController.getNextTrimesterRegistrations
);

router.post(
  '/registrations/next-trimester',
  initializeRepositories,
  RegistrationController.createNextTrimesterRegistration
);

router.delete(
  '/registrations/next-trimester/:id',
  initializeRepositories,
  RegistrationController.deleteNextTrimesterRegistration
);

/**
 * Attendance endpoints
 */
router.post('/recordAttendance', AttendanceController.recordAttendance);
router.post('/removeAttendance', AttendanceController.removeAttendance);

/**
 * Feedback endpoint
 */
router.post('/feedback', FeedbackController.submitFeedback);

/**
 * Tab-specific data endpoints (Phase 2: Frontend Data Independence)
 * These endpoints return only the data needed for specific tabs
 */
router.get('/instructor/tabs/directory', UserController.getInstructorDirectoryTabData);
router.get('/instructor/tabs/weekly-schedule', RegistrationController.getInstructorWeeklyScheduleTabData);
router.get('/parent/tabs/contact', UserController.getParentContactTabData);
router.get('/admin/tabs/wait-list/:trimester', RegistrationController.getAdminWaitListTabData);

export default router;
