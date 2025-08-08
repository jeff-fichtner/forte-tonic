import express from 'express';
import { RegistrationType } from '../utils/values/registrationType.js';
import { _fetchData } from '../utils/helpers.js';
import { configService } from '../services/configurationService.js';
import { UserTransformService } from '../services/userTransformService.js';
import { currentConfig, isProduction, isStaging, version } from '../config/environment.js';

// Import application layer controllers
import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { RegistrationController } from '../controllers/registrationController.js';
import { SystemController } from '../controllers/systemController.js';
import { AttendanceController } from '../controllers/attendanceController.js';
import { extractSingleRequestData, extractPaginatedRequestData } from '../middleware/requestDataNormalizer.js';

const router = express.Router();

// Health check endpoint for monitoring
router.get('/health', SystemController.getHealth);

// Version endpoint for frontend
router.get('/version', (req, res) => {
  res.json(version);
});

// Get current operator user
router.post('/getOperatorUser', UserController.getOperatorUser);

// Authenticate user by access code
router.post('/authenticateByAccessCode', extractSingleRequestData, UserController.authenticateByAccessCode);

// Test endpoint to verify Google Sheets connectivity
router.post('/testConnection', SystemController.testConnection);

// Test endpoint to get data from a specific sheet
router.post('/testSheetData', SystemController.testSheetData);

router.post('/getAdmins', UserController.getAdmins);

router.post('/getInstructors', UserController.getInstructors);

router.post('/getStudents', extractPaginatedRequestData, UserController.getStudents);

// Access code lookup endpoints
router.post('/getAdminByAccessCode', extractSingleRequestData, UserController.getAdminByAccessCode);

router.post('/getInstructorByAccessCode', extractSingleRequestData, UserController.getInstructorByAccessCode);

router.post('/getParentByAccessCode', extractSingleRequestData, UserController.getParentByAccessCode);

router.post('/getClasses', extractPaginatedRequestData, RegistrationController.getClasses);

router.post('/getRegistrations', extractPaginatedRequestData, RegistrationController.getRegistrations);

router.post('/getRooms', extractPaginatedRequestData, RegistrationController.getRooms);

// ===== NEW REPOSITORY-BASED ENDPOINTS =====

/**
 * Create Registration - New Repository Pattern
 */
router.post('/registrations', RegistrationController.createRegistration);

/**
 * Mark Attendance - New Repository Pattern
 */
router.post('/attendance', AttendanceController.markAttendance);

/**
 * Get Attendance Summary
 */
router.get('/attendance/summary/:registrationId', AttendanceController.getAttendanceSummary);

router.post('/register', RegistrationController.register);

router.post('/unregister', RegistrationController.unregister);

router.post('/recordAttendance', AttendanceController.recordAttendance);

router.post('/removeAttendance', AttendanceController.removeAttendance);

export default router;
