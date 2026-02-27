/**
 * System Controller - Application layer API endpoints for system operations
 * Handles health checks, diagnostics, and testing endpoints
 */

import { currentConfig, isProduction, isStaging, version } from '../config/environment.js';
import type { Request, Response } from 'express';
import { getLogger } from '../utils/logger.js';
import { configService } from '../services/configurationService.js';
import { successResponse, errorResponse } from '../common/responseHelpers.js';
import { HTTP_STATUS } from '../common/errorConstants.js';
import { ValidationError, UnauthorizedError } from '../common/errors.js';
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
          spreadsheetConfigured: !!currentConfig.spreadsheetId,
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

      // Validate the authenticated user is actually an admin
      const validAdmin = await userRepository.getAdminByAccessCode(adminCode);
      if (!validAdmin) {
        throw new UnauthorizedError('Invalid admin code');
      }

      // Clear cache at the database client level (single source of truth)
      const dbClient = serviceContainer.get(ServiceKeys.databaseClient);
      if (dbClient && typeof dbClient.clearAllCache === 'function') {
        dbClient.clearAllCache();
        logger.info('✅ All Google Sheets cache cleared');
      } else {
        logger.warn('⚠️ Database client not available or does not support cache clearing');
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
