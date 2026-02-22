import express, { Request, Response } from 'express';
import { version } from '../config/environment.js';
import { successResponse } from '../common/responseHelpers.js';

// Import application layer controllers
import { UserController } from '../controllers/userController.js';
import { RegistrationController } from '../controllers/registrationController.js';
import { SystemController } from '../controllers/systemController.js';
import { AttendanceController } from '../controllers/attendanceController.js';
import { FeedbackController } from '../controllers/feedbackController.js';
import { extractPaginatedRequestData } from '../middleware/requestDataNormalizer.js';

const router = express.Router();

// Health check endpoint for monitoring
router.get('/health', SystemController.getHealth);

// Version endpoint for frontend
router.get('/version', (req: Request, res: Response) => {
  successResponse(res, version);
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
router.post('/auth/access-code', UserController.authenticateByAccessCode);

// Admin diagnostic endpoints
router.post('/admin/test-connection', SystemController.testConnection);
router.post('/admin/test-sheet-data', SystemController.testSheetData);
router.post('/admin/clear-cache', SystemController.clearCache);

// ===== REPOSITORY-BASED ENDPOINTS =====

/**
 * Registration CRUD operations
 */
router.post('/registrations', RegistrationController.createRegistration);
router.delete('/registrations/:id', RegistrationController.deleteRegistration);

/**
 * Attendance
 */
router.post('/attendance', AttendanceController.markAttendance);
router.get('/attendance/summary/:registrationId', AttendanceController.getAttendanceSummary);

/**
 * Update reenrollment intent for a registration
 */
router.patch('/registrations/:id/intent', RegistrationController.updateIntent);

/**
 * Admin endpoints
 */
router.get('/admin/registrations/:trimester', RegistrationController.getRegistrationsByTrimester);
router.get('/admin/trimester-data/:trimester', RegistrationController.getAdminTrimesterData);

/**
 * Next trimester registration endpoints (enrollment periods only)
 */
router.get('/registrations/next-trimester', RegistrationController.getNextTrimesterRegistrations);
router.post('/registrations/next-trimester', RegistrationController.createNextTrimesterRegistration);
router.delete('/registrations/next-trimester/:id', RegistrationController.deleteNextTrimesterRegistration);

/**
 * Feedback endpoint
 */
router.post('/feedback', FeedbackController.submitFeedback);

/**
 * Tab-specific data endpoints (Phase 2: Frontend Data Independence)
 * These endpoints return only the data needed for specific tabs
 */
router.get('/instructor/tabs/directory', UserController.getInstructorDirectoryTabData);
router.get(
  '/instructor/tabs/weekly-schedule/:trimester',
  RegistrationController.getInstructorWeeklyScheduleTabData
);
router.get('/parent/tabs/contact/:trimester', UserController.getParentContactTabData);
router.get(
  '/parent/tabs/weekly-schedule/:trimester',
  RegistrationController.getParentWeeklyScheduleTabData
);
router.get('/parent/tabs/registration/:trimester', RegistrationController.getParentRegistrationTabData);
router.get('/admin/tabs/wait-list/:trimester', RegistrationController.getAdminWaitListTabData);
router.get(
  '/admin/tabs/master-schedule/:trimester',
  RegistrationController.getAdminMasterScheduleTabData
);
router.get('/admin/tabs/registration/:trimester', RegistrationController.getAdminRegistrationTabData);

export default router;
