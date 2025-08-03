/**
 * Infrastructure Service Factory
 * 
 * Provides a unified way to create and configure infrastructure services
 * with proper dependency injection and lifecycle management.
 */

import { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';
import { EmailClient } from '../email/emailClient.js';
import { CacheService } from '../cache/cacheService.js';
import { ConfigurationService } from '../../core/services/configurationService.js';

export class InfrastructureServiceFactory {
  constructor() {
    this.instances = new Map();
    this.configService = null;
  }

  /**
   * Initialize the factory with configuration service
   */
  async initialize() {
    if (!this.configService) {
      this.configService = new ConfigurationService();
    }
    
    console.log('🏗️  Infrastructure Service Factory initialized');
  }

  /**
   * Get database client (singleton)
   */
  getDatabaseClient() {
    const key = 'databaseClient';
    
    if (!this.instances.has(key)) {
      console.log('📊 Creating database client');
      const client = new GoogleSheetsDbClient(this.configService);
      this.instances.set(key, client);
    }
    
    return this.instances.get(key);
  }

  /**
   * Get email client (singleton)
   */
  getEmailClient() {
    const key = 'emailClient';
    
    if (!this.instances.has(key)) {
      console.log('📧 Creating email client');
      const client = new EmailClient(this.configService);
      this.instances.set(key, client);
    }
    
    return this.instances.get(key);
  }

  /**
   * Get cache service (singleton)
   */
  getCacheService() {
    const key = 'cacheService';
    
    if (!this.instances.has(key)) {
      console.log('💾 Creating cache service');
      const service = new CacheService();
      this.instances.set(key, service);
    }
    
    return this.instances.get(key);
  }

  /**
   * Get configuration service
   */
  getConfigurationService() {
    if (!this.configService) {
      this.configService = new ConfigurationService();
    }
    return this.configService;
  }

  /**
   * Create infrastructure bundle for dependency injection
   */
  createInfrastructureBundle() {
    return {
      databaseClient: this.getDatabaseClient(),
      emailClient: this.getEmailClient(),
      cacheService: this.getCacheService(),
      configurationService: this.getConfigurationService()
    };
  }

  /**
   * Health check for all infrastructure services
   */
  async healthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      services: {}
    };

    // Database health check
    try {
      const dbClient = this.getDatabaseClient();
      const dbHealth = await this.#checkDatabaseHealth(dbClient);
      results.services.database = { status: 'healthy', ...dbHealth };
    } catch (error) {
      results.services.database = { 
        status: 'unhealthy', 
        error: error.message 
      };
    }

    // Email health check
    try {
      const emailClient = this.getEmailClient();
      const emailHealth = await emailClient.verifyConnection();
      results.services.email = { 
        status: emailHealth.success ? 'healthy' : 'unhealthy',
        ...emailHealth
      };
    } catch (error) {
      results.services.email = { 
        status: 'unhealthy', 
        error: error.message 
      };
    }

    // Cache health check
    try {
      const cacheService = this.getCacheService();
      const cacheHealth = await this.#checkCacheHealth(cacheService);
      results.services.cache = { status: 'healthy', ...cacheHealth };
    } catch (error) {
      results.services.cache = { 
        status: 'unhealthy', 
        error: error.message 
      };
    }

    // Overall health
    const allHealthy = Object.values(results.services)
      .every(service => service.status === 'healthy');
    
    results.overall = allHealthy ? 'healthy' : 'degraded';

    return results;
  }

  /**
   * Graceful shutdown of all services
   */
  async shutdown() {
    console.log('🛑 Shutting down infrastructure services');

    const shutdownPromises = [];

    // Shutdown email client
    if (this.instances.has('emailClient')) {
      const emailClient = this.instances.get('emailClient');
      if (emailClient.shutdown) {
        shutdownPromises.push(emailClient.shutdown());
      }
    }

    // Shutdown cache service
    if (this.instances.has('cacheService')) {
      const cacheService = this.instances.get('cacheService');
      if (cacheService.shutdown) {
        shutdownPromises.push(cacheService.shutdown());
      }
    }

    // Shutdown database client
    if (this.instances.has('databaseClient')) {
      const dbClient = this.instances.get('databaseClient');
      if (dbClient.shutdown) {
        shutdownPromises.push(dbClient.shutdown());
      }
    }

    await Promise.all(shutdownPromises);
    this.instances.clear();
    
    console.log('✅ Infrastructure services shutdown complete');
  }

  /**
   * Reset factory for testing
   */
  reset() {
    this.instances.clear();
    this.configService = null;
  }

  /**
   * Private method: Check database health
   */
  async #checkDatabaseHealth(dbClient) {
    // Try a simple operation to verify database connectivity
    try {
      // This is a lightweight check - just verify we can connect
      const testResult = await dbClient.readRange('A1:A1', 'Students');
      return {
        connected: true,
        responseTime: 'fast', // Could measure actual response time
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  /**
   * Private method: Check cache health
   */
  async #checkCacheHealth(cacheService) {
    try {
      // Test cache operations
      const testKey = 'health_check_test';
      const testValue = { timestamp: Date.now() };
      
      cacheService.set(testKey, testValue, 1000); // 1 second TTL
      const retrieved = cacheService.get(testKey);
      
      if (!retrieved || retrieved.timestamp !== testValue.timestamp) {
        throw new Error('Cache read/write test failed');
      }

      cacheService.delete(testKey);

      return {
        operations: 'working',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Cache health check failed: ${error.message}`);
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      activeServices: this.instances.size,
      serviceTypes: Array.from(this.instances.keys()),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}

// Export singleton instance
export const infrastructureFactory = new InfrastructureServiceFactory();
