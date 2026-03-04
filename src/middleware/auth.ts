import type { Request, Response, NextFunction } from 'express';
import { serviceContainer, ServiceKeys } from '../infrastructure/container/serviceContainer.js';
import { createLogger } from '../utils/logger.js';
import { configService } from '../services/configurationService.js';
import { UserType } from '../config/constants.js';
import type { UserRepository } from '../repositories/userRepository.js';
import { UnauthorizedError } from '../common/errors.js';
import { ERROR_CODE, ERROR_TYPE } from '../common/errorConstants.js';
const logger = createLogger(configService);

// Extract authenticated user from request for all API routes
export const initializeRepositories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userRepository = serviceContainer.get(ServiceKeys.userRepository);
    await extractAuthenticatedUser(req, userRepository);
  } catch (error) {
    logger.error('Error initializing repositories:', error);
    req.currentUser = null;
  }
  next();
};

/**
 * Middleware that requires a valid authenticated user.
 * Must be used after initializeRepositories.
 * Returns 401 if req.currentUser is not set.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.currentUser) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required. Please provide a valid access code.',
        code: ERROR_CODE.UNAUTHORIZED,
        type: ERROR_TYPE.AUTHENTICATION,
      },
    });
    return;
  }
  next();
};

/**
 * Get authenticated user email from access code
 * Throws UnauthorizedError if no authenticated user is found
 */
export function getAuthenticatedUserEmail(req: Request): string {
  const userEmail = req.currentUser?.email;
  if (userEmail) {
    return userEmail;
  }

  logger.error('Authentication failed for audit trail:', {
    hasCurrentUser: !!req.currentUser,
    currentUserEmail: req.currentUser?.email,
  });

  throw new UnauthorizedError(
    'Authentication required: No authenticated user found. Please provide a valid access code.'
  );
}

/**
 * Middleware to initialize repositories with authentication check
 */
async function extractAuthenticatedUser(
  req: Request,
  userRepository: UserRepository
): Promise<void> {
  try {
    req.currentUser = null;

    // Check for access code in priority order: body, header, query
    let accessCode: string | null = null;

    if (req.body?.accessCode) {
      accessCode = req.body.accessCode;
    } else if (req.headers['x-access-code']) {
      accessCode = req.headers['x-access-code'] as string;
    } else if (req.query?.accessCode) {
      accessCode = req.query.accessCode as string;
    }

    if (accessCode) {
      logger.debug(`Attempting authentication with access code: ${accessCode.substring(0, 2)}***`);

      // Check for login type in headers to determine authentication method
      const loginType = req.headers['x-login-type'] as string | undefined;

      let userResult: { user: { id: string; email: string | null }; userType: string } | null =
        null;

      // Auto-detect login type based on access code format if needed
      const isPhoneNumber = accessCode.length === 10 && /^\d{10}$/.test(accessCode);
      const isAccessCode = accessCode.length === 6 && /^\d{6}$/.test(accessCode);

      if (isPhoneNumber || loginType === 'parent') {
        // For parent login, accessCode is actually a phone number
        const parent = await userRepository.getParentByPhone(accessCode);
        if (parent) {
          userResult = { user: parent, userType: UserType.PARENT };
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
            userResult = { user: parent, userType: UserType.PARENT };
          }
        } else if (isAccessCode && loginType !== 'employee') {
          userResult = await userRepository.getUserByAccessCode(accessCode);
        }
      }

      if (userResult) {
        const { user, userType } = userResult;
        req.currentUser = {
          id: user.id,
          email: user.email || '',
          accessCode: accessCode,
          userType: userType,
        };
        logger.debug(`User authenticated: ${user.email} (${userType})`);
        return;
      } else {
        logger.debug(`Access code ${accessCode.substring(0, 2)}*** not found in any user records`);
      }
    }

    logger.debug(
      'No authenticated user found - audit operations will require valid authentication'
    );
  } catch (error) {
    logger.error('Error extracting authenticated user:', error);
    req.currentUser = null;
  }
}
