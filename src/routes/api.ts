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
import { DebugController } from '../controllers/debugController.js';

const router = express.Router();

// ===== PUBLIC ROUTES (no auth required) =====

router.get('/health', SystemController.getHealth);
router.get('/version', (_req: Request, res: Response) => {
  successResponse(res, version);
});
router.get('/configuration', UserController.getAppConfiguration);
router.post('/auth/access-code', UserController.authenticateByAccessCode);

// Frontend error sink — public so login-screen crashes (user not yet
// authenticated) are still reportable. Active in every environment.
router.post('/client-error', DebugController.reportClientError);

// ===== AUTHENTICATED ROUTES =====

router.post('/admin/clear-cache', requireAuth, SystemController.clearCache);

// Error visibility verification — authenticated so casual visitors can't
// hit it, but available in every environment so we can verify the live
// error pipeline post-deploy. Sync mode exercises errorResponse → gcpLogger;
// ?async=1 exercises the process-level uncaughtException handler.
router.post('/debug/throw', requireAuth, DebugController.throwError);

router.post('/registrations', requireAuth, RegistrationController.createRegistration);
router.delete(
  '/registrations/:trimester/:id',
  requireAuth,
  RegistrationController.deleteRegistration
);
router.patch(
  '/registrations/:trimester/:id/intent',
  requireAuth,
  RegistrationController.updateIntent
);

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
