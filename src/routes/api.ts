import express, { Request, Response } from 'express';
import { version } from '../config/environment.js';
import { successResponse } from '../common/responseHelpers.js';
import { requireAuth } from '../middleware/auth.js';

// Import application layer controllers
import { UserController } from '../controllers/userController.js';
import { RegistrationController } from '../controllers/registrationController.js';
import { SystemController } from '../controllers/systemController.js';
import { AttendanceController } from '../controllers/attendanceController.js';
import { FeedbackController } from '../controllers/feedbackController.js';

const router = express.Router();

// ===== PUBLIC ROUTES (no auth required) =====

router.get('/health', SystemController.getHealth);
router.get('/version', (_req: Request, res: Response) => {
  successResponse(res, version);
});
router.get('/configuration', UserController.getAppConfiguration);
router.post('/auth/access-code', UserController.authenticateByAccessCode);

// ===== AUTHENTICATED ROUTES =====

router.post('/admin/clear-cache', requireAuth, SystemController.clearCache);

router.post('/registrations', requireAuth, RegistrationController.createRegistration);
router.delete(
  '/registrations/:trimester/:id',
  requireAuth,
  RegistrationController.deleteRegistration
);
router.patch('/registrations/:id/intent', requireAuth, RegistrationController.updateIntent);

router.post('/attendance', requireAuth, AttendanceController.markAttendance);
router.get(
  '/attendance/summary/:registrationId',
  requireAuth,
  AttendanceController.getAttendanceSummary
);

router.post('/feedback', requireAuth, FeedbackController.submitFeedback);

router.get('/instructor/tabs/directory', requireAuth, UserController.getInstructorDirectoryTabData);
router.get(
  '/instructor/tabs/weekly-schedule/:trimester',
  requireAuth,
  RegistrationController.getInstructorWeeklyScheduleTabData
);
router.get('/parent/tabs/contact/:trimester', requireAuth, UserController.getParentContactTabData);
router.get(
  '/parent/tabs/weekly-schedule/:trimester',
  requireAuth,
  RegistrationController.getParentWeeklyScheduleTabData
);
router.get(
  '/parent/tabs/registration/:trimester',
  requireAuth,
  RegistrationController.getParentRegistrationTabData
);
router.get(
  '/admin/tabs/wait-list/:trimester',
  requireAuth,
  RegistrationController.getAdminWaitListTabData
);
router.get(
  '/admin/tabs/master-schedule/:trimester',
  requireAuth,
  RegistrationController.getAdminMasterScheduleTabData
);
router.get(
  '/admin/tabs/registration/:trimester',
  requireAuth,
  RegistrationController.getAdminRegistrationTabData
);

export default router;
