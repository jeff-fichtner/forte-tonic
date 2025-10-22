import express from 'express';
import { version } from '../config/environment.js';

// Import application layer controllers
import { UserController } from '../controllers/userController.js';
import { RegistrationController } from '../controllers/registrationController.js';
import { SystemController } from '../controllers/systemController.js';
import { AttendanceController } from '../controllers/attendanceController.js';
import {
  extractSingleRequestData,
  extractPaginatedRequestData,
} from '../middleware/requestDataNormalizer.js';
import { initializeRepositories } from '../middleware/auth.js';

const router = express.Router();

// Health check endpoint for monitoring
router.get('/health', SystemController.getHealth);

// Version endpoint for frontend
router.get('/version', (req, res) => {
  res.json(version);
});

// ===== MODERN REST API ENDPOINTS =====

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

// ===== LEGACY ENDPOINTS (For backward compatibility - will be deprecated) =====

router.post('/getAppConfiguration', UserController.getAppConfiguration);
router.post('/getAdmins', UserController.getAdmins);
router.post('/getInstructors', UserController.getInstructors);
router.post('/getStudents', extractPaginatedRequestData, UserController.getStudents);
router.post('/getAdminByAccessCode', extractSingleRequestData, UserController.getAdminByAccessCode);
router.post('/getInstructorByAccessCode', extractSingleRequestData, UserController.getInstructorByAccessCode);
router.post('/getParentByAccessCode', extractSingleRequestData, UserController.getParentByAccessCode);
router.post('/getClasses', extractPaginatedRequestData, RegistrationController.getClasses);
router.post('/getRooms', extractPaginatedRequestData, RegistrationController.getRooms);
router.post('/getRegistrations', extractPaginatedRequestData, RegistrationController.getRegistrations);

// ===== AUTHENTICATION & ADMIN TOOLS =====

// Authenticate user by access code
router.post(
  '/authenticateByAccessCode',
  extractSingleRequestData,
  UserController.authenticateByAccessCode
);

// Test endpoint to verify Google Sheets connectivity
router.post('/testConnection', SystemController.testConnection);

// Test endpoint to get data from a specific sheet
router.post('/testSheetData', SystemController.testSheetData);

// Admin-only cache clear endpoint
router.post('/admin/clearCache', SystemController.clearCache);

// ===== NEW REPOSITORY-BASED ENDPOINTS =====

/**
 * Create Registration - New Repository Pattern
 */
router.post('/registrations', initializeRepositories, RegistrationController.createRegistration);

/**
 * Mark Attendance - New Repository Pattern
 */
router.post('/attendance', initializeRepositories, AttendanceController.markAttendance);

/**
 * Get Attendance Summary
 */
router.get('/attendance/summary/:registrationId', AttendanceController.getAttendanceSummary);

/**
 * Registration endpoints - Unified patterns
 */
router.post('/unregister', initializeRepositories, RegistrationController.unregister);

/**
 * Update reenrollment intent for a registration
 */
router.patch(
  '/registrations/:id/intent',
  initializeRepositories,
  RegistrationController.updateIntent
);

/**
 * Attendance endpoints
 */
router.post('/recordAttendance', AttendanceController.recordAttendance);
router.post('/removeAttendance', AttendanceController.removeAttendance);

export default router;
