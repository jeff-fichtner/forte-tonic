import { serviceContainer } from '../infrastructure/container/serviceContainer.js';
import { currentConfig } from '../config/environment.js';
import { createLogger } from '../utils/logger.js';
import { configService } from '../services/configurationService.js';

const logger = createLogger(configService);

// Initialize repositories for all requests - NO AUTHENTICATION
export const initializeRepositories = async (req, res, next) => {
  try {
    // Service container handles all repository and service instances
    const userRepository = serviceContainer.get('userRepository');
    const programRepository = serviceContainer.get('programRepository');

    // Attach repositories to request for API endpoints
    req.userRepository = userRepository;
    req.programRepository = programRepository;

    // Try to extract authenticated user from request
    await extractAuthenticatedUser(req, userRepository);
  } catch (error) {
    logger.error('Error initializing repositories:', error);
    req.userRepository = null;
    req.programRepository = null;
    req.currentUser = null;
    req.user = null;
  }
  next();
};

/**
 * Get authenticated user email from access code
 * Throws error if no authenticated user is found
 */
export function getAuthenticatedUserEmail(req) {
  // Get access code owner email
  const userEmail = req.currentUser?.email || req.user?.email;
  if (userEmail) {
    return userEmail;
  }

  // No authenticated user found - provide detailed error message
  logger.error('Authentication failed for audit trail:', {
    hasCurrentUser: !!req.currentUser,
    currentUserEmail: req.currentUser?.email,
    hasUser: !!req.user,
    userEmail: req.user?.email,
  });

  throw new Error(
    'Authentication required: No authenticated user found for audit trail. Please provide a valid access code.'
  );
}

/**
 * Middleware to initialize repositories with authentication check
 */
async function extractAuthenticatedUser(req, userRepository) {
  try {
    // Initialize to null
    req.currentUser = null;
    req.user = null;

    // Check for access code to determine the acting user
    let accessCode = null;

    // Check for access code in different locations, including HttpService array format
    let bodyAccessCode = null;

    // Handle HttpService payload format: [{ data: { accessCode } }]
    if (Array.isArray(req.body) && req.body[0]?.data?.accessCode) {
      bodyAccessCode = req.body[0].data.accessCode;
    } else if (req.body?.accessCode) {
      // Handle direct body format: { accessCode, ... }
      bodyAccessCode = req.body.accessCode;
    }

    if (bodyAccessCode && bodyAccessCode !== null && bodyAccessCode !== '') {
      accessCode = bodyAccessCode;
    } else if (req.headers['x-access-code']) {
      accessCode = req.headers['x-access-code'];
    } else if (req.query?.accessCode) {
      accessCode = req.query.accessCode;
    }

    if (accessCode) {
      logger.debug(`Attempting authentication with access code: ${accessCode.substring(0, 2)}***`);

      // Check for login type in headers to determine authentication method
      const loginType = req.headers['x-login-type'];

      let userResult = null;

      // Auto-detect login type based on access code format if needed
      const isPhoneNumber = accessCode.length === 10 && /^\d{10}$/.test(accessCode);
      const isAccessCode = accessCode.length === 6 && /^\d{6}$/.test(accessCode);

      if (isPhoneNumber || loginType === 'parent') {
        // For parent login, accessCode is actually a phone number
        const parent = await userRepository.getParentByPhone(accessCode);
        if (parent) {
          userResult = { user: parent, userType: 'parent' };
        }
      }

      if (!userResult && (isAccessCode || loginType === 'employee')) {
        // For employee login (admin/instructor), use the standard access code method
        userResult = await userRepository.getUserByAccessCode(accessCode);
      }

      // Fallback: if no match yet, try the opposite method
      if (!userResult) {
        if (isPhoneNumber && loginType !== 'parent') {
          const parent = await userRepository.getParentByPhone(accessCode);
          if (parent) {
            userResult = { user: parent, userType: 'parent' };
          }
        } else if (isAccessCode && loginType !== 'employee') {
          userResult = await userRepository.getUserByAccessCode(accessCode);
        }
      }

      if (userResult) {
        const { user, userType } = userResult;
        req.currentUser = {
          email: user.email,
          accessCode: accessCode,
          userType: userType,
        };
        req.user = req.currentUser;
        logger.debug(`User authenticated: ${user.email} (${userType})`);
        return;
      } else {
        logger.debug(`Access code ${accessCode.substring(0, 2)}*** not found in any user records`);
      }
    }

    logger.debug('No authenticated user found - audit operations will require valid authentication');
  } catch (error) {
    logger.error('Error extracting authenticated user:', error);
    req.currentUser = null;
    req.user = null;
  }
}
