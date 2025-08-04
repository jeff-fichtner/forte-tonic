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

// Get current authenticated user
router.post('/getAuthenticatedUser', UserController.getAuthenticatedUser);

// Test endpoint to verify Google Sheets connectivity
router.post('/testConnection', SystemController.testConnection);

// Get current authenticated user
router.post('/getAuthenticatedUser', (req, res) => {
  res.json(req.currentUser);
});

// Test endpoint to verify Google Sheets connectivity
router.post('/testConnection', async (req, res) => {
  try {
    debugger; // Debugging breakpoint
    console.log('Testing Google Sheets connection...');

    const authConfig = configService.getGoogleSheetsAuth();
    const sheetsConfig = configService.getGoogleSheetsConfig();

    console.log('Service Account Email:', authConfig.clientEmail);
    console.log('Spreadsheet ID:', sheetsConfig.spreadsheetId);

    // First, let's test basic authentication
    const auth = req.dbClient.auth;
    console.log('Auth type:', auth.constructor.name);

    debugger; // Another breakpoint before API call

    // Try to get spreadsheet metadata (requires less permissions)
    const spreadsheetId = req.dbClient.spreadsheetId;
    const sheetsResponse = await req.dbClient.sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    const sheetNames = sheetsResponse.data.sheets.map(sheet => sheet.properties.title);
    console.log('Available sheets:', sheetNames);

    const response = {
      success: true,
      message: 'Google Sheets connection successful!',
      spreadsheetId: spreadsheetId,
      spreadsheetTitle: sheetsResponse.data.properties.title,
      availableSheets: sheetNames,
      sheetCount: sheetNames.length,
      serviceAccountEmail: configService.getGoogleSheetsAuth().clientEmail,
    };

    console.log('Connection test result:', response);
    res.json(response);
  } catch (error) {
    console.error('Connection test failed:', error);

    // Provide more specific error messages
    let errorMessage = error.message;
    let suggestions = [];

    if (error.message.includes('permission') || error.message.includes('forbidden')) {
      errorMessage = 'Permission denied - Sheet not shared with service account';
      suggestions = [
        `Share your Google Sheet with: ${configService.getGoogleSheetsAuth().clientEmail}`,
        'Give the service account "Editor" permissions',
        'Or make the sheet public with "Anyone with link can view/edit"',
      ];
    } else if (error.message.includes('not found')) {
      errorMessage = 'Spreadsheet not found - Check the folder ID and spreadsheet name';
      suggestions = [
        'Verify the WORKING_FOLDER_ID and WORKING_SPREADSHEET_NAME in your .env file',
        'Make sure the spreadsheet exists in the specified folder and is accessible',
      ];
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      suggestions: suggestions,
      originalError: error.message,
      stack: error.stack,
    });
  }
});

// Test endpoint to get data from a specific sheet
router.post('/testSheetData', SystemController.testSheetData);

router.post('/getAdmins', UserController.getAdmins);

router.post('/getInstructors', UserController.getInstructors);

router.post('/getStudents', UserController.getStudents);

router.post('/getClasses', RegistrationController.getClasses);

router.post('/getRegistrations', RegistrationController.getRegistrations);

router.post('/getRooms', RegistrationController.getRooms);

router.post('/getAdmins', async (req, res) => {
  try {
    const data = await req.userRepository.getAdmins();
    const transformedData = UserTransformService.transformArray(data, 'admin');
    res.json(transformedData);
  } catch (error) {
    console.error('Error getting admins:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/getInstructors', async (req, res) => {
  try {
    const data = await req.userRepository.getInstructors();
    const transformedData = UserTransformService.transformArray(data, 'instructor');
    res.json(transformedData);
  } catch (error) {
    console.error('Error getting instructors:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/getStudents', async (req, res) => {
  try {
    const request = req.body || {}; // Standard Express.js request body

    const allStudents = await req.userRepository.getStudents();
    const allParents = await req.userRepository.getParents();

    let filteredStudents = [];
    let filterMessage = '';

    // Use hardcoded email for testing
    const testEmail = 'test@example.com';

    // For testing, just return all students without filtering
    filterMessage = 'Testing mode: returning all students without filtering';
    filteredStudents = allStudents;

    console.log(`${filterMessage}: ${filteredStudents.length}`);

    const enrichedStudents = filteredStudents.map(student => {
      const parent1 = allParents.find(parent => parent.id === student.parent1Id);
      const parent2 = allParents.find(parent => parent.id === student.parent2Id);

      return {
        id: student.id,
        firstName: student.firstNickname ? student.firstNickname : student.firstName,
        lastName: student.lastNickname ? student.lastNickname : student.lastName,
        grade: student.grade,
        parentEmails: [parent1?.email, parent2?.email].filter(email => email).join(', '),
      };
    });

    const result = _fetchData(() => enrichedStudents, request.page || 0, request.pageSize || 10);
    res.json(result);
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json(JSON.stringify({ error: error.message }));
  }
});

router.post('/getClasses', async (req, res) => {
  try {
    const data = await req.programRepository.getClasses();
    res.json(data);
  } catch (error) {
    console.error('Error getting classes:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/getRegistrations', async (req, res) => {
  try {
    const request = req.body || {}; // Standard Express.js request body

    const allRegistrations = await req.programRepository.getRegistrations();

    let filteredRegistrations = [];
    let filterMessage = '';

    // For testing, just return all registrations without filtering
    filterMessage = 'Testing mode: returning all registrations without filtering';
    filteredRegistrations = allRegistrations;

    console.log(`${filterMessage}: ${filteredRegistrations.length}`);

    const result = _fetchData(
      () => filteredRegistrations,
      request.page || 0,
      request.pageSize || 10
    );
    res.json(result);
  } catch (error) {
    console.error('Error getting registrations:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/getRooms', async (req, res) => {
  try {
    const data = await req.userRepository.getRooms();
    res.json(data);
  } catch (error) {
    console.error('Error getting rooms:', error);
    res.status(500).json({ error: error.message });
  }
});

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
