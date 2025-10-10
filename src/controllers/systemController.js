/**
 * System Controller - Application layer API endpoints for system operations
 * Handles health checks, diagnostics, and testing endpoints
 */

import { currentConfig, isProduction, isStaging } from '../config/environment.js';
import { configService } from '../services/configurationService.js';

export class SystemController {
  /**
   * Health check endpoint for monitoring
   */
  static async getHealth(req, res) {
    try {
      res.json({
        status: 'healthy',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        baseUrl: currentConfig.baseUrl,
        features: {
          isProduction,
          isStaging,
          spreadsheetConfigured: !!currentConfig.spreadsheetId,
        },
      });
    } catch (error) {
      console.error('Error getting health status:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Test endpoint to verify Google Sheets connectivity
   */
  static async testConnection(req, res) {
    try {
      console.log('Testing Google Sheets connection...');

      const authConfig = configService.getGoogleSheetsAuth();
      const sheetsConfig = configService.getGoogleSheetsConfig();

      console.log('Service Account Email:', authConfig.clientEmail);
      console.log('Spreadsheet ID:', sheetsConfig.spreadsheetId);

      // First, let's test basic authentication
      const auth = req.dbClient.auth;
      console.log('Auth type:', auth.constructor.name);

      // Try to get spreadsheet metadata (requires less permissions)
      const spreadsheetId = req.dbClient.spreadsheetId;
      const sheets = req.dbClient.sheets;

      const response = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
        auth: auth,
      });

      const availableSheets = response.data.sheets.map(sheet => sheet.properties.title);
      console.log('Available sheets:', availableSheets);

      const testResult = {
        success: true,
        message: 'Google Sheets connection successful!',
        spreadsheetId: response.data.spreadsheetId,
        spreadsheetTitle: response.data.properties.title,
        availableSheets: availableSheets,
        sheetCount: response.data.sheets.length,
        serviceAccountEmail: authConfig.clientEmail,
      };

      console.log('Connection test result:', testResult);
      res.json(testResult);
    } catch (error) {
      console.error('Error testing Google Sheets connection:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Test sheet data retrieval endpoint
   */
  static async testSheetData(req, res) {
    try {
      const { sheetName = 'Students', range = 'A1:Z1000' } = req.body;

      console.log(`Testing data retrieval from sheet: ${sheetName}, range: ${sheetName}!${range}`);

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

      console.log('Sheet data test result:', testResult);
      res.json(testResult);
    } catch (error) {
      console.error('Error testing sheet data retrieval:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Admin-only cache clearing endpoint
   */
  static async clearCache(req, res) {
    try {
      const { adminCode } = req.body;

      if (!adminCode) {
        return res.status(400).json({ error: 'Admin code is required' });
      }

      // Use dependency injection to get the same repository instances used throughout the app
      const { serviceContainer } = await import('../infrastructure/container/serviceContainer.js');
      const userRepository = serviceContainer.get('userRepository');

      // Validate admin access code using the repository
      const validAdmin = await userRepository.getAdminByAccessCode(adminCode);
      if (!validAdmin) {
        return res.status(401).json({ error: 'Invalid admin code' });
      }

      // Clear ALL caches in the system

      // 1. Clear database client cache (the main Google Sheets cache)
      const dbClient = userRepository.dbClient;
      dbClient.clearCache();
      console.log('✅ Database client cache cleared');

      // 2. Clear ALL repository-level caches systematically
      const repositoryTypes = [
        'userRepository',
        'registrationRepository',
        'instructorRepository',
        'studentRepository',
        'adminRepository',
        'parentRepository',
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
          console.log(`⚠️ Could not clear cache for ${repoType}: ${e.message}`);
        }
      }

      console.log(`✅ Repository caches cleared: ${clearedRepositories.join(', ')}`);

      console.log(
        `🧹 All caches cleared by admin: ${validAdmin.email || validAdmin.firstName + ' ' + validAdmin.lastName}`
      );
      res.json({
        success: true,
        message: 'All caches cleared successfully',
        clearedBy: validAdmin.email || validAdmin.firstName + ' ' + validAdmin.lastName,
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get application configuration for frontend
   */
  static async getApplicationConfig(req, res) {
    try {
      const appConfig = configService.getApplicationConfig();
      res.json({
        success: true,
        config: appConfig,
      });
    } catch (error) {
      console.error('Error getting application config:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
