/**
 * Service Container
 *
 * Simplified dependency injection container for MVC architecture
 * Directly manages service instances without complex factory patterns
 */

// Direct imports for simplified MVC structure
import { GoogleSheetsDbClient } from '../../database/googleSheetsDbClient.js';
import { EmailClient } from '../../email/emailClient.js';
import { CacheService } from '../../cache/cacheService.js';
import { configService } from '../../services/configurationService.js';

// Import repositories
import { RegistrationRepository } from '../../repositories/registrationRepository.js';
import { UserRepository } from '../../repositories/userRepository.js';
import { ProgramRepository } from '../../repositories/programRepository.js';
import { StudentRepository } from '../../repositories/studentRepository.js';
import { ParentRepository } from '../../repositories/parentRepository.js';

// Import services
import { RegistrationApplicationService } from '../../services/registrationService.js';

export class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.initialized = false;

    // Initialize infrastructure services directly
    this.dbClient = null;
    this.emailClient = null;
    this.cacheService = null;
  }

  /**
   * Initialize the service container - simplified for MVC
   */
  async initialize() {
    if (this.initialized) return;

    console.log('🏗️  Initializing Service Container (MVC)');

    // Initialize infrastructure services directly
    await this.#initializeInfrastructure();

    // Register repositories with direct dependencies
    this.#registerRepositories();

    // Register services with dependencies
    this.#registerServices();

    this.initialized = true;
    console.log('✅ Service Container initialized');
  }

  /**
   * Initialize infrastructure services directly
   */
  async #initializeInfrastructure() {
    try {
      // Initialize database client
      this.dbClient = new GoogleSheetsDbClient(configService);

      // Initialize email client
      this.emailClient = new EmailClient(configService);

      // Initialize cache service
      this.cacheService = new CacheService();

      console.log('✅ Infrastructure services initialized');
    } catch (error) {
      console.error('❌ Failed to initialize infrastructure:', error);
      throw error;
    }
  }

  /**
   * Get a service by name
   */
  get(serviceName) {
    if (!this.initialized) {
      throw new Error('Service container not initialized. Call initialize() first.');
    }

    // Direct access to infrastructure services
    switch (serviceName) {
      case 'databaseClient':
        return this.dbClient;
      case 'emailClient':
        return this.emailClient;
      case 'cacheService':
        return this.cacheService;
      case 'configurationService':
        return configService;
      default:
        // Fall back to registered services
        break;
    }

    // Return singleton if exists
    if (this.singletons.has(serviceName)) {
      return this.singletons.get(serviceName);
    }

    // Get service factory
    const serviceFactory = this.services.get(serviceName);
    if (!serviceFactory) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    // Create service instance
    const service = serviceFactory();

    // Store as singleton
    this.singletons.set(serviceName, service);

    return service;
  }

  /**
   * Register a service factory
   */
  register(serviceName, factory, options = {}) {
    this.services.set(serviceName, factory);

    if (options.singleton === false) {
      // Remove from singletons if not a singleton
      this.singletons.delete(serviceName);
    }
  }

  /**
   * Check if a service is registered
   */
  has(serviceName) {
    return this.services.has(serviceName);
  }

  /**
   * Get all registered service names
   */
  getServiceNames() {
    return Array.from(this.services.keys());
  }

  /**
   * Create a scope with specific service overrides
   */
  createScope(overrides = {}) {
    const scope = new ServiceContainer();

    // Copy all service registrations
    for (const [name, factory] of this.services.entries()) {
      scope.register(name, factory);
    }

    // Apply overrides
    for (const [name, factory] of Object.entries(overrides)) {
      scope.register(name, factory);
    }

    scope.initialized = true;
    return scope;
  }

  /**
   * Health check for all services - simplified for MVC
   */
  async healthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      container: 'healthy',
      services: {},
    };

    try {
      // Check infrastructure services directly
      results.services.databaseClient = {
        status: this.dbClient ? 'healthy' : 'unhealthy',
        type: 'GoogleSheetsDbClient',
      };

      results.services.emailClient = {
        status: this.emailClient ? 'healthy' : 'unhealthy',
        type: 'EmailClient',
      };

      results.services.cacheService = {
        status: this.cacheService ? 'healthy' : 'unhealthy',
        type: 'CacheService',
      };

      // Check if critical repositories can be instantiated
      const criticalServices = ['registrationRepository', 'userRepository'];

      for (const serviceName of criticalServices) {
        try {
          const service = this.get(serviceName);
          results.services[serviceName] = {
            status: 'healthy',
            type: service.constructor.name,
          };
        } catch (error) {
          results.services[serviceName] = {
            status: 'unhealthy',
            error: error.message,
          };
          results.container = 'degraded';
        }
      }
    } catch (error) {
      results.container = 'unhealthy';
      results.error = error.message;
    }

    return results;
  }

  /**
   * Graceful shutdown - simplified for MVC
   */
  async shutdown() {
    console.log('🛑 Shutting down Service Container');

    // Shutdown infrastructure services directly
    if (this.emailClient && typeof this.emailClient.shutdown === 'function') {
      await this.emailClient.shutdown();
    }

    if (this.cacheService && typeof this.cacheService.shutdown === 'function') {
      await this.cacheService.shutdown();
    }

    // Clear all service instances
    this.services.clear();
    this.singletons.clear();
    this.dbClient = null;
    this.emailClient = null;
    this.cacheService = null;
    this.initialized = false;

    console.log('✅ Service Container shutdown complete');
  }

  /**
   * Register repositories with direct dependencies - simplified for MVC
   */
  #registerRepositories() {
    this.register('registrationRepository', () => {
      return new RegistrationRepository(this.dbClient);
    });

    this.register('userRepository', () => {
      return new UserRepository(this.dbClient);
    });

    this.register('programRepository', () => {
      return new ProgramRepository(this.dbClient);
    });

    this.register('studentRepository', () => {
      return new StudentRepository(this.dbClient);
    });

    this.register('parentRepository', () => {
      return new ParentRepository(this.dbClient);
    });
  }

  /**
   * Register application services with dependencies - simplified for MVC
   */
  #registerServices() {
    this.register('registrationApplicationService', () => {
      return new RegistrationApplicationService({
        registrationRepository: this.get('registrationRepository'),
        userRepository: this.get('userRepository'),
        programRepository: this.get('programRepository'),
        emailClient: this.emailClient,
      });
    });
  }

  /**
   * Get service dependency graph for debugging
   */
  getDependencyGraph() {
    const graph = {};

    for (const serviceName of this.services.keys()) {
      try {
        const service = this.get(serviceName);
        graph[serviceName] = {
          type: service.constructor.name,
          initialized: this.singletons.has(serviceName),
        };
      } catch (error) {
        graph[serviceName] = {
          type: 'unknown',
          error: error.message,
          initialized: false,
        };
      }
    }

    return graph;
  }
}

// Export singleton instance
export const serviceContainer = new ServiceContainer();
