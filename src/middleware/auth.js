import { AuthenticatedUserResponse } from '../models/shared/responses/authenticatedUserResponse.js';
import { Admin } from '../models/shared/admin.js';
import { configService } from '../services/configurationService.js';
import { serviceContainer } from '../infrastructure/container/serviceContainer.js';

// Initialize repositories and user context for authenticated requests
export const initializeUserContext = async (req, res, next) => {
  try {
    // Service container handles all repository and service instances
    // No need to inject repositories into request anymore

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
    const mockAdmin = new Admin({
      id: 'test-admin-id',
      email: signedInEmail,
      firstName: 'Test',
      lastName: 'Admin',
    });

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
