import { GoogleSheetsDbClient } from '../core/clients/googleSheetsDbClient.js';
import { UserRepository } from '../core/repositories/userRepository.js';
import { ProgramRepository } from '../core/repositories/programRepository.js';
import { RegistrationRepository } from '../core/repositories/registrationRepository.js';
import { AttendanceRepository } from '../core/repositories/attendanceRepository.js';
import { AuthenticatedUserResponse } from '../core/models/responses/authenticatedUserResponse.js';
import { configService } from '../core/services/configurationService.js';

// Create singleton instances for dependency injection
const dbClient = new GoogleSheetsDbClient(configService);
const userRepository = new UserRepository(dbClient);
const programRepository = new ProgramRepository(dbClient);
const registrationRepository = new RegistrationRepository(dbClient);
const attendanceRepository = new AttendanceRepository(dbClient);

// Initialize repositories and user context for authenticated requests
export const initializeUserContext = async (req, res, next) => {
  try {
    // Attach repository instances to request for dependency injection
    req.dbClient = dbClient;
    req.userRepository = userRepository;
    req.programRepository = programRepository;
    req.registrationRepository = registrationRepository;
    req.attendanceRepository = attendanceRepository;

    // TODO: Implement proper authentication when auth system is ready
    // For now, use a test user for development/testing
    const signedInEmail = 'test@example.com';

    // Create a mock operator for testing
    const mockOperator = {
      isAdmin: () => true,
      isInstructor: () => false,
      isParent: () => false,
      admin: signedInEmail,
      instructor: null,
      parent: null,
    };

    // Create a mock admin user
    const mockAdmin = {
      id: 'test-admin-id',
      email: signedInEmail,
      firstName: 'Test',
      lastName: 'Admin',
    };

    const currentUser = new AuthenticatedUserResponse(
      signedInEmail,
      true, // isOperator
      mockAdmin, // admin
      null, // instructor
      null // parent
    );

    req.currentUser = currentUser;
    req.user = currentUser; // For requireAuth middleware compatibility
  } catch (error) {
    console.error('Error initializing user context:', error);
    return res.status(500).json({ error: 'Failed to initialize user context' });
  }
  next();
};

// Authentication middleware
export const requireAuth = (req, res, next) => {
  // Skip authentication in test environment
  if (configService.isTest()) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Authorization middleware for operator-level access
export const requireOperator = (req, res, next) => {
  // Skip authorization in test environment
  if (configService.isTest()) {
    return next();
  }

  if (!req.user || !req.user.isOperator) {
    return res.status(403).json({ error: 'Operator access required' });
  }
  next();
};
