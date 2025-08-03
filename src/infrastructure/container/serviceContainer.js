/**
 * Service Container
 * 
 * Dependency injection container for managing application dependencies
 * and providing a clean way to wire up services across layers.
 */

import { infrastructureFactory } from '../factory/infrastructureServiceFactory.js';

// Import repositories
import { RegistrationRepository } from '../../core/repositories/registrationRepository.js';
import { UserRepository } from '../../core/repositories/userRepository.js';
import { ProgramRepository } from '../../core/repositories/programRepository.js';
import { StudentRepository } from '../../core/repositories/studentRepository.js';
import { ParentRepository } from '../../core/repositories/parentRepository.js';

// Import application services
import { RegistrationApplicationService } from '../../application/services/registrationApplicationService.js';
import { StudentApplicationService } from '../../application/services/studentApplicationService.js';

export class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the service container
   */
  async initialize() {
    if (this.initialized) return;

    console.log('🏗️  Initializing Service Container');

    // Initialize infrastructure factory
    await infrastructureFactory.initialize();

    // Register infrastructure services
    this.#registerInfrastructureServices();

    // Register repositories
    this.#registerRepositories();

    // Register application services
    this.#registerApplicationServices();

    this.initialized = true;
    console.log('✅ Service Container initialized');
  }

  /**
   * Get a service by name
   */
  get(serviceName) {
    if (!this.initialized) {
      throw new Error('Service container not initialized. Call initialize() first.');
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
   * Health check for all services
   */
  async healthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      container: 'healthy',
      services: {}
    };

    try {
      // Infrastructure health check
      const infraHealth = await infrastructureFactory.healthCheck();
      results.services.infrastructure = infraHealth;

      // Check if critical services can be instantiated
      const criticalServices = [
        'registrationApplicationService',
        'studentApplicationService',
        'registrationRepository',
        'userRepository'
      ];

      for (const serviceName of criticalServices) {
        try {
          const service = this.get(serviceName);
          results.services[serviceName] = { 
            status: 'healthy',
            type: service.constructor.name 
          };
        } catch (error) {
          results.services[serviceName] = { 
            status: 'unhealthy',
            error: error.message 
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
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down Service Container');

    // Shutdown infrastructure services
    await infrastructureFactory.shutdown();

    // Clear all service instances
    this.services.clear();
    this.singletons.clear();
    this.initialized = false;

    console.log('✅ Service Container shutdown complete');
  }

  /**
   * Private method: Register infrastructure services
   */
  #registerInfrastructureServices() {
    this.register('databaseClient', () => infrastructureFactory.getDatabaseClient());
    this.register('emailClient', () => infrastructureFactory.getEmailClient());
    this.register('cacheService', () => infrastructureFactory.getCacheService());
    this.register('configurationService', () => infrastructureFactory.getConfigurationService());
  }

  /**
   * Private method: Register repositories
   */
  #registerRepositories() {
    this.register('registrationRepository', () => {
      const dbClient = this.get('databaseClient');
      return new RegistrationRepository(dbClient);
    });

    this.register('userRepository', () => {
      const dbClient = this.get('databaseClient');
      return new UserRepository(dbClient);
    });

    this.register('programRepository', () => {
      const dbClient = this.get('databaseClient');
      return new ProgramRepository(dbClient);
    });

    this.register('studentRepository', () => {
      const dbClient = this.get('databaseClient');
      return new StudentRepository(dbClient);
    });

    this.register('parentRepository', () => {
      const dbClient = this.get('databaseClient');
      return new ParentRepository(dbClient);
    });
  }

  /**
   * Private method: Register application services
   */
  #registerApplicationServices() {
    this.register('registrationApplicationService', () => {
      return new RegistrationApplicationService({
        registrationRepository: this.get('registrationRepository'),
        userRepository: this.get('userRepository'),
        programRepository: this.get('programRepository'),
        emailClient: this.get('emailClient'),
        auditService: null
      });
    });

    this.register('studentApplicationService', () => {
      return new StudentApplicationService({
        studentRepository: this.get('studentRepository'),
        parentRepository: this.get('parentRepository'),
        registrationRepository: this.get('registrationRepository'),
        emailClient: this.get('emailClient'),
        auditService: null
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
          initialized: this.singletons.has(serviceName)
        };
      } catch (error) {
        graph[serviceName] = {
          type: 'unknown',
          error: error.message,
          initialized: false
        };
      }
    }
    
    return graph;
  }
}

// Export singleton instance
export const serviceContainer = new ServiceContainer();
