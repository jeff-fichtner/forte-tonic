import { AuthenticatedUserResponse } from '../models/shared/responses/authenticatedUserResponse.js';
import { Admin } from '../models/shared/admin.js';
import { configService } from '../services/configurationService.js';
import { serviceContainer } from '../infrastructure/container/serviceContainer.js';
import { currentConfig } from '../config/environment.js';

// Initialize repositories and user context for authenticated requests
export const initializeUserContext = async (req, res, next) => {
  try {
    // Service container handles all repository and service instances
    const userRepository = serviceContainer.get('userRepository');
    const programRepository = serviceContainer.get('programRepository');
    
    // Attach repositories to request for API endpoints
    req.userRepository = userRepository;
    req.programRepository = programRepository;
    
    // Get operator email from environment
    const operatorEmail = currentConfig.operatorEmail;
    if (!operatorEmail) {
      console.error('OPERATOR_EMAIL environment variable not set');
      return res.status(500).json({ error: 'Authentication configuration error' });
    }

    // Check if the operator email exists in the roles table
    const operatorRole = await userRepository.getOperatorByEmail(operatorEmail);
    if (!operatorRole) {
      console.error(`Operator email ${operatorEmail} not found in roles table`);
      return res.status(500).json({ error: 'Operator not found in system' });
    }

    // Determine user type based on role columns (admin > instructor > parent)
    let admin = null;
    let instructor = null;
    let parent = null;
    let isOperator = true;

    if (operatorRole.admin) {
      // Check admin table for matching email
      admin = await userRepository.getAdminByEmail(operatorRole.admin);
      if (!admin) {
        console.error(`Admin email ${operatorRole.admin} from role not found in admins table`);
        return res.status(500).json({ error: 'Admin record not found' });
      }
    } else if (operatorRole.instructor) {
      // Check instructor table for matching email
      instructor = await userRepository.getInstructorByEmail(operatorRole.instructor);
      if (!instructor) {
        console.error(`Instructor email ${operatorRole.instructor} from role not found in instructors table`);
        return res.status(500).json({ error: 'Instructor record not found' });
      }
    } else if (operatorRole.parent) {
      // Check parent table for matching email
      parent = await userRepository.getParentByEmail(operatorRole.parent);
      if (!parent) {
        console.error(`Parent email ${operatorRole.parent} from role not found in parents table`);
        return res.status(500).json({ error: 'Parent record not found' });
      }
    }

    const currentUser = new AuthenticatedUserResponse(
      operatorEmail,
      isOperator,
      admin,
      instructor,
      parent
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
