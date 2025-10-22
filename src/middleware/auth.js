import { serviceContainer } from '../infrastructure/container/serviceContainer.js';
import { currentConfig } from '../config/environment.js';

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
    console.error('Error initializing repositories:', error);
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
    console.log('👤 Using access code owner email for audit:', userEmail);
    return userEmail;
  }

  // No authenticated user found - provide detailed error message
  console.error('❌ Authentication failed for audit trail:', {
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

    // Debug logging
    let bodyAccessCodeDisplay = 'none';
    if (Array.isArray(req.body) && req.body[0]?.data?.accessCode) {
      bodyAccessCodeDisplay = req.body[0].data.accessCode.substring(0, 3) + '***';
    } else if (req.body?.accessCode) {
      bodyAccessCodeDisplay = req.body.accessCode.substring(0, 3) + '***';
    }

    console.log('🔍 Auth middleware - extracting user from request:', {
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      bodyAccessCode: bodyAccessCodeDisplay,
      bodyHasAccessCode: req.body && 'accessCode' in req.body,
      hasHeaders: !!req.headers,
      headerAccessCode: req.headers['x-access-code']
        ? req.headers['x-access-code'].substring(0, 3) + '***'
        : 'none',
      headerLoginType: req.headers['x-login-type'] || 'none',
      queryAccessCode: req.query?.accessCode
        ? req.query.accessCode.substring(0, 3) + '***'
        : 'none',
      userAgent: req.headers?.['user-agent']?.substring(0, 50) || 'unknown',
    });

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

    // Debug: log the actual access code values
    console.log('🔍 Access code values:', {
      bodyAccessCode: bodyAccessCode,
      bodyAccessCodeType: typeof bodyAccessCode,
      bodyAccessCodeValue: bodyAccessCode
        ? bodyAccessCode.substring(0, 2) + '***'
        : 'null/undefined',
      headerAccessCode: req.headers['x-access-code'],
      queryAccessCode: req.query?.accessCode,
    });

    if (bodyAccessCode && bodyAccessCode !== null && bodyAccessCode !== '') {
      accessCode = bodyAccessCode;
      console.log('📝 Found accessCode in body:', accessCode.substring(0, 2) + '***');
    } else if (req.headers['x-access-code']) {
      accessCode = req.headers['x-access-code'];
      console.log('📝 Found accessCode in headers:', accessCode.substring(0, 2) + '***');
    } else if (req.query?.accessCode) {
      accessCode = req.query.accessCode;
      console.log('📝 Found accessCode in query:', accessCode.substring(0, 2) + '***');
    } else {
      console.log('📝 No valid accessCode found in request body, headers, or query');
    }

    if (accessCode) {
      console.log(
        '🔍 Attempting to authenticate with access code:',
        accessCode.substring(0, 2) + '***'
      );

      // Check for login type in headers to determine authentication method
      const loginType = req.headers['x-login-type'];
      console.log('🔍 Login type from headers:', loginType);

      let userResult = null;

      // Auto-detect login type based on access code format if needed
      const isPhoneNumber = accessCode.length === 10 && /^\d{10}$/.test(accessCode);
      const isAccessCode = accessCode.length === 6 && /^\d{6}$/.test(accessCode);

      console.log('🔍 Access code format detection:', {
        accessCodeLength: accessCode.length,
        isPhoneNumber,
        isAccessCode,
        storedLoginType: loginType,
      });

      if (isPhoneNumber || loginType === 'parent') {
        // For parent login, accessCode is actually a phone number
        console.log('🔍 Attempting parent authentication with phone number');
        const parent = await userRepository.getParentByPhone(accessCode);
        if (parent) {
          userResult = { user: parent, userType: 'parent' };
        }
      }

      if (!userResult && (isAccessCode || loginType === 'employee')) {
        // For employee login (admin/instructor), use the standard access code method
        console.log('🔍 Attempting employee authentication with access code');
        userResult = await userRepository.getUserByAccessCode(accessCode);
      }

      // Fallback: if no match yet, try the opposite method
      if (!userResult) {
        if (isPhoneNumber && loginType !== 'parent') {
          console.log('🔍 Fallback: Trying parent authentication for phone-like access code');
          const parent = await userRepository.getParentByPhone(accessCode);
          if (parent) {
            userResult = { user: parent, userType: 'parent' };
          }
        } else if (isAccessCode && loginType !== 'employee') {
          console.log('🔍 Fallback: Trying employee authentication for access code');
          userResult = await userRepository.getUserByAccessCode(accessCode);
        }
      }

      console.log(
        '🔍 Database lookup result:',
        userResult ? `Found ${userResult.userType}: ${userResult.user.email}` : 'Not found'
      );

      if (userResult) {
        const { user, userType } = userResult;
        req.currentUser = {
          email: user.email,
          accessCode: accessCode,
          userType: userType,
        };
        req.user = req.currentUser;
        console.log(`✅ User authenticated: ${user.email} (${userType})`);
        return;
      } else {
        console.warn(
          `⚠️ Access code ${accessCode.substring(0, 2)}*** not found in any user records`
        );
      }
    }

    console.log(
      '⚠️ No authenticated user found - audit operations will require valid authentication'
    );
  } catch (error) {
    console.error('❌ Error extracting authenticated user:', error);
    req.currentUser = null;
    req.user = null;
  }
}
