/**
 * System Controller - Application layer API endpoints for system operations
 * Handles health checks, diagnostics, and testing endpoints
 */

import { currentConfig, isProduction, isStaging, version } from '../config/environment.js';
import type { Request, Response } from 'express';
import { getLogger } from '../utils/logger.js';
import { successResponse, errorResponse } from '../common/responseHelpers.js';
import { HTTP_STATUS } from '../common/errorConstants.js';
import { ValidationError, ForbiddenError } from '../common/errors.js';
import { serviceContainer, ServiceKeys } from '../infrastructure/container/serviceContainer.js';

const logger = getLogger();

export class SystemController {
  /**
   * Health check endpoint for GCP Cloud Run monitoring
   * Always returns 200 with status details (GCP best practice)
   * @param req - Express request object
   * @param res - Express response object
   */
  static async getHealth(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const healthData = {
        status: 'healthy',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        version: version.number,
        versionInfo: {
          buildDate: version.buildDate,
          gitCommit: version.gitCommit?.substring(0, 7),
          environment: version.environment,
        },
        baseUrl: currentConfig.baseUrl,
        features: {
          isProduction,
          isStaging,
          // Boolean flag indicating whether the data-store connection is configured.
          // Named generically (not `spreadsheetConfigured`) so the health endpoint
          // remains storage-implementation-agnostic.
          dataStoreConfigured: !!currentConfig.spreadsheetId,
        },
      };

      successResponse(res, healthData, {
        req,
        startTime,
        context: { controller: 'SystemController', method: 'getHealth' },
      });
    } catch (error) {
      const typedError = error as Error;
      logger.error('Error getting health status:', error);

      // Always return 200 for health checks (GCP best practice)
      // Service can respond = healthy, even if some features fail
      successResponse(
        res,
        {
          status: 'degraded',
          error: typedError.message,
          timestamp: new Date().toISOString(),
        },
        {
          statusCode: HTTP_STATUS.OK,
          req,
          startTime,
          context: {
            controller: 'SystemController',
            method: 'getHealth',
            error: typedError.message,
          },
        }
      );
    }
  }

  /**
   * Admin-only cache clearing endpoint
   */
  static async clearCache(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const adminCode = req.currentUser?.accessCode;

      if (!adminCode) {
        throw new ValidationError('Admin code is required');
      }

      // Use dependency injection to get the same repository instances used throughout the app
      const userRepository = serviceContainer.get(ServiceKeys.userRepository);

      // Validate the authenticated user is actually an admin.
      // 403 (not 401): by this point the user IS authenticated — they have
      // a session and an access code that the auth middleware resolved.
      // What they lack is the admin role. 401 would (incorrectly) trip the
      // frontend's session-expired interceptor and force a logout.
      const validAdmin = await userRepository.getAdminByAccessCode(adminCode);
      if (!validAdmin) {
        throw new ForbiddenError('Admin role required to clear cache');
      }

      // Clear the application-level cache. The cache service is the
      // canonical entry point — the controller does not reach into the
      // database client directly, so this code is unchanged if the
      // underlying storage layer is later swapped (e.g., Sheets → SQL).
      const cacheService = serviceContainer.get(ServiceKeys.cacheService);
      if (cacheService && typeof cacheService.clear === 'function') {
        cacheService.clear();
        logger.info('✅ All application caches cleared');
      } else {
        logger.warn('⚠️ Cache service not available or does not support clearing');
      }

      const adminName = validAdmin.email || validAdmin.firstName + ' ' + validAdmin.lastName;
      logger.info(`🧹 All caches cleared by admin: ${adminName}`);

      successResponse(
        res,
        {
          message: 'All caches cleared successfully',
          clearedBy: adminName,
        },
        {
          req,
          startTime,
          context: { controller: 'SystemController', method: 'clearCache' },
        }
      );
    } catch (error) {
      logger.error('Error clearing cache:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'SystemController', method: 'clearCache' },
      });
    }
  }
}
