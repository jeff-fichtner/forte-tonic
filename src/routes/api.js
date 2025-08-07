import express from 'express';
import { RegistrationType } from '../utils/values/registrationType.js';
import { _fetchData } from '../utils/helpers.js';
import { configService } from '../services/configurationService.js';
import { UserTransformService } from '../services/userTransformService.js';
import { currentConfig, isProduction, isStaging, version } from '../config/environment.js';

// Import application layer controllers
import { UserController } from '../controllers/userController.js';
import { SystemController } from '../controllers/systemController.js';
import { RegistrationController } from '../controllers/registrationController.js';
import { AttendanceController } from '../controllers/attendanceController.js';

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
router.post('/authenticateByAccessCode', UserController.authenticateByAccessCode);

// Test endpoint to verify Google Sheets connectivity
router.post('/testConnection', SystemController.testConnection);

// Test endpoint to get data from a specific sheet
router.post('/testSheetData', SystemController.testSheetData);

router.post('/getAdmins', UserController.getAdmins);

router.post('/getInstructors', UserController.getInstructors);

router.post('/getStudents', UserController.getStudents);

// Access code lookup endpoints
router.post('/getAdminByAccessCode', UserController.getAdminByAccessCode);

router.post('/getInstructorByAccessCode', UserController.getInstructorByAccessCode);

router.post('/getParentByAccessCode', UserController.getParentByAccessCode);

router.post('/getClasses', RegistrationController.getClasses);

router.post('/getRegistrations', RegistrationController.getRegistrations);

router.post('/getRooms', RegistrationController.getRooms);

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
