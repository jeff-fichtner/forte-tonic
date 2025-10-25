/**
 * System Controller - Application layer API endpoints for system operations
 * Handles health checks, diagnostics, and testing endpoints
 */

import { currentConfig, isProduction, isStaging, version } from '../config/environment.js';
import { getLogger } from '../utils/logger.js';
import { configService } from '../services/configurationService.js';
import { successResponse, errorResponse } from '../common/responseHelpers.js';
import { HTTP_STATUS } from '../common/errorConstants.js';
import { ValidationError, UnauthorizedError } from '../common/errors.js';

const logger = getLogger();

export class SystemController {
  /**
   * Health check endpoint for GCP Cloud Run monitoring
   * Always returns 200 with status details (GCP best practice)
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async getHealth(req, res) {
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
      logger.error('Error getting health status:', error);

      // Always return 200 for health checks (GCP best practice)
      // Service can respond = healthy, even if some features fail
      successResponse(
        res,
        {
          status: 'degraded',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        {
          statusCode: HTTP_STATUS.OK,
          req,
          startTime,
          context: { controller: 'SystemController', method: 'getHealth', error: error.message },
        }
      );
    }
  }

  /**
   * Test endpoint to verify Google Sheets connectivity
   */
  static async testConnection(req, res) {
    const startTime = Date.now();

    try {
      logger.info('Testing Google Sheets connection...');

      const authConfig = configService.getGoogleSheetsAuth();
      const sheetsConfig = configService.getGoogleSheetsConfig();

      logger.info('Service Account Email:', authConfig.clientEmail);
      logger.info('Spreadsheet ID:', sheetsConfig.spreadsheetId);

      // First, let's test basic authentication
      const auth = req.dbClient.auth;
      logger.info('Auth type:', auth.constructor.name);

      // Try to get spreadsheet metadata (requires less permissions)
      const spreadsheetId = req.dbClient.spreadsheetId;
      const sheets = req.dbClient.sheets;

      const response = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
        auth: auth,
      });

      const availableSheets = response.data.sheets.map(sheet => sheet.properties.title);
      logger.info('Available sheets:', availableSheets);

      const testResult = {
        success: true,
        message: 'Google Sheets connection successful!',
        spreadsheetId: response.data.spreadsheetId,
        spreadsheetTitle: response.data.properties.title,
        availableSheets: availableSheets,
        sheetCount: response.data.sheets.length,
        serviceAccountEmail: authConfig.clientEmail,
      };

      logger.info('Connection test result:', testResult);

      // Return raw data for backward compatibility
      res.json(testResult);
    } catch (error) {
      logger.error('Error testing Google Sheets connection:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'SystemController', method: 'testConnection' },
      });
    }
  }

  /**
   * Test sheet data retrieval endpoint
   */
  static async testSheetData(req, res) {
    const startTime = Date.now();

    try {
      const { sheetName = 'Students', range = 'A1:Z1000' } = req.body;

      logger.info(`Testing data retrieval from sheet: ${sheetName}, range: ${sheetName}!${range}`);

      const spreadsheetId = req.dbClient.spreadsheetId;
      const sheets = req.dbClient.sheets;
      const auth = req.dbClient.auth;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!${range}`,
        auth: auth,
      });

      const values = response.data.values || [];
      const testResult = {
        success: true,
        sheetName: sheetName,
        range: `${sheetName}!${range}`,
        rowCount: values.length,
        columnCount: values.length > 0 ? values[0].length : 0,
        headers: values.length > 0 ? values[0] : [],
        sampleData: values.slice(0, 2), // First 2 rows as sample
      };

      logger.info('Sheet data test result:', testResult);

      // Return raw data for backward compatibility
      res.json(testResult);
    } catch (error) {
      logger.error('Error testing sheet data retrieval:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'SystemController', method: 'testSheetData' },
      });
    }
  }

  /**
   * Admin-only cache clearing endpoint
   */
  static async clearCache(req, res) {
    const startTime = Date.now();

    try {
      const { adminCode } = req.body;

      if (!adminCode) {
        throw new ValidationError('Admin code is required');
      }

      // Use dependency injection to get the same repository instances used throughout the app
      const { serviceContainer } = await import('../infrastructure/container/serviceContainer.js');
      const userRepository = serviceContainer.get('userRepository');

      // Validate admin access code using the repository
      const validAdmin = await userRepository.getAdminByAccessCode(adminCode);
      if (!validAdmin) {
        throw new UnauthorizedError('Invalid admin code');
      }

      // Clear ALL caches in the system

      // 1. Clear database client cache (the main Google Sheets cache)
      const dbClient = userRepository.dbClient;
      dbClient.clearCache();
      logger.info('✅ Database client cache cleared');

      // 2. Clear ALL repository-level caches systematically
      const repositoryTypes = [
        'userRepository',
        'registrationRepository',
        'attendanceRepository',
        'programRepository',
      ];

      const clearedRepositories = [];
      for (const repoType of repositoryTypes) {
        try {
          const repository = serviceContainer.get(repoType);
          if (repository && typeof repository.clearCache === 'function') {
            repository.clearCache();
            clearedRepositories.push(repoType);
          }
        } catch (e) {
          // Repository might not be registered or initialized yet
          logger.info(`⚠️ Could not clear cache for ${repoType}: ${e.message}`);
        }
      }

      logger.info(`✅ Repository caches cleared: ${clearedRepositories.join(', ')}`);

      const adminName = validAdmin.email || validAdmin.firstName + ' ' + validAdmin.lastName;
      logger.info(`🧹 All caches cleared by admin: ${adminName}`);

      const cacheData = {
        success: true,
        message: 'All caches cleared successfully',
        clearedBy: adminName,
      };

      // Return raw data for backward compatibility
      res.json(cacheData);
    } catch (error) {
      logger.error('Error clearing cache:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'SystemController', method: 'clearCache' },
      });
    }
  }

  /**
   * Get application configuration for frontend
   */
  static async getApplicationConfig(req, res) {
    const startTime = Date.now();

    try {
      const appConfig = configService.getApplicationConfig();

      const configData = {
        success: true,
        config: appConfig,
      };

      // Return raw data for backward compatibility
      res.json(configData);
    } catch (error) {
      logger.error('Error getting application config:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'SystemController', method: 'getApplicationConfig' },
      });
    }
  }
}
