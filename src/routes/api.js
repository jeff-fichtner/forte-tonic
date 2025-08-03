import express from 'express';
import { RegistrationType } from '../core/values/registrationType.js';
import { _fetchData } from '../utils/helpers.js';
import { configService } from '../core/services/configurationService.js';
import { UserTransformService } from '../core/services/userTransformService.js';

const router = express.Router();

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
router.post('/testSheetData', async (req, res) => {
  try {
    const { sheetName } = req.body;
    const range = `${sheetName}!A1:Z100`; // Use a more reasonable range

    console.log(`Testing data retrieval from sheet: ${sheetName}, range: ${range}`);

    const spreadsheetId = req.dbClient.spreadsheetId;
    const response = await req.dbClient.sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range,
    });

    const values = response.data.values || [];

    const result = {
      success: true,
      sheetName,
      range,
      rowCount: values.length,
      columnCount: values.length > 0 ? values[0].length : 0,
      headers: values.length > 0 ? values[0] : [],
      sampleData: values.slice(0, 5), // First 5 rows
    };

    console.log('Sheet data test result:', result);
    res.json(result);
  } catch (error) {
    console.error('Sheet data test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

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

    const result = _fetchData(() => filteredRegistrations, request.page || 0, request.pageSize || 10);
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
router.post('/registrations', async (req, res) => {
  try {
    const requestData = req.body;
    
    // Basic validation
    if (!requestData.studentId || !requestData.registrationType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, registrationType'
      });
    }

    // Validate registration type requirements
    if (requestData.registrationType === RegistrationType.GROUP && !requestData.classId) {
      return res.status(400).json({
        success: false,
        message: 'classId is required for GROUP registrations'
      });
    }

    // Add current user and timestamp
    requestData.registeredBy = req.currentUser?.email || 'system';
    requestData.registeredAt = new Date().toISOString();
    requestData.schoolYear = requestData.schoolYear || '2025-2026';
    requestData.trimester = requestData.trimester || 'Fall';

    // Create via repository
    const savedRegistration = await req.registrationRepository.create(requestData);
    
    // Return enriched response
    res.json({
      success: true,
      message: 'Registration created successfully',
      data: {
        id: savedRegistration.id,
        studentId: savedRegistration.studentId,
        classId: savedRegistration.classId,
        instructorId: savedRegistration.instructorId,
        registrationType: savedRegistration.registrationType,
        schoolYear: savedRegistration.schoolYear,
        trimester: savedRegistration.trimester,
        className: savedRegistration.className,
        registeredAt: savedRegistration.registeredAt,
        canMarkAttendance: true
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error creating registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create registration',
      error: error.message
    });
  }
});

/**
 * Mark Attendance - New Repository Pattern
 */
router.post('/attendance', async (req, res) => {
  try {
    const { registrationId, week, schoolYear, trimester } = req.body;
    
    // Validation
    if (!registrationId || !week) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: registrationId, week'
      });
    }

    // Check if attendance already exists
    const existingAttendance = await req.attendanceRepository.hasAttendance(
      registrationId, 
      week, 
      schoolYear || '2025-2026', 
      trimester || 'Fall'
    );

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already recorded for this registration and week'
      });
    }

    // Create attendance record
    const attendanceData = {
      registrationId,
      week: parseInt(week),
      schoolYear: schoolYear || '2025-2026',
      trimester: trimester || 'Fall',
      recordedBy: req.currentUser?.email || 'system',
      recordedAt: new Date().toISOString()
    };

    const savedAttendance = await req.attendanceRepository.create(attendanceData);
    
    // Return confirmation
    res.json({
      success: true,
      message: 'Attendance recorded successfully',
      data: {
        id: savedAttendance.id,
        registrationId: savedAttendance.registrationId,
        week: savedAttendance.week,
        schoolYear: savedAttendance.schoolYear,
        trimester: savedAttendance.trimester,
        recordedAt: savedAttendance.recordedAt
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record attendance',
      error: error.message
    });
  }
});

/**
 * Get Attendance Summary
 */
router.get('/attendance/summary/:registrationId', async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { schoolYear = '2025-2026', trimester = 'Fall' } = req.query;
    
    const summary = await req.attendanceRepository.getAttendanceSummary(
      registrationId, 
      schoolYear, 
      trimester
    );
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('Error getting attendance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance summary',
      error: error.message
    });
  }
});

// ===== EXISTING LEGACY ENDPOINT =====

router.post('/register', async (req, res) => {
  try {
    const data = req.body;

    let matchingClass = null;
    if (data.registrationType === RegistrationType.GROUP) {
      matchingClass = await req.programRepository.getClassById(data.classId);
    }

    const effectiveInstructorId = data.instructorId || matchingClass?.instructorId;
    if (!effectiveInstructorId) {
      throw new Error('No instructor specified or found for the registration');
    }

    const instructor = await req.userRepository.getInstructorById(effectiveInstructorId);
    const newRegistration = await req.programRepository.register(
      data,
      matchingClass,
      instructor,
      req.currentUser.email
    );

    res.json({ newRegistration });
  } catch (error) {
    console.error('Error registering:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/unregister', async (req, res) => {
  try {
    const data = req.body;

    const success = await req.programRepository.unregister(data.id, req.currentUser.email);

    res.json({ success });
  } catch (error) {
    console.error('Error unregistering:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/recordAttendance', async (req, res) => {
  try {
    const data = req.body;

    const attendanceRecord = await req.programRepository.recordAttendance(
      data.registrationId,
      req.currentUser.email
    );

    res.json({ attendanceRecord });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/removeAttendance', async (req, res) => {
  try {
    const data = req.body;

    const success = await req.programRepository.removeAttendance(
      data.registrationId,
      req.currentUser.email
    );

    res.json({ success });
  } catch (error) {
    console.error('Error removing attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
