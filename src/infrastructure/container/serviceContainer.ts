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
import type { ConfigurationService } from '../../services/configurationService.js';
import { createLogger } from '../../utils/logger.js';
import type { Logger } from '../../utils/logger.js';

// Import repositories
import { RegistrationRepository } from '../../repositories/registrationRepository.js';
import { UserRepository } from '../../repositories/userRepository.js';
import { ProgramRepository } from '../../repositories/programRepository.js';
import { AttendanceRepository } from '../../repositories/attendanceRepository.js';
import { DropRequestRepository } from '../../repositories/dropRequestRepository.js';

// Import services
import { RegistrationApplicationService } from '../../services/registrationApplicationService.js';
import { PeriodService } from '../../services/periodService.js';
import { DropRequestService } from '../../services/dropRequestService.js';
import { EntityQueryService } from '../../services/entityQueryService.js';

type ServiceFactory = () => unknown;

interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  type?: string;
  error?: string;
}

interface HealthCheckResult {
  timestamp: string;
  container: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, ServiceHealth>;
  error?: string;
}

interface ServiceMap {
  databaseClient: GoogleSheetsDbClient | null;
  emailClient: EmailClient | null;
  cacheService: CacheService | null;
  configurationService: ConfigurationService;
  registrationRepository: RegistrationRepository;
  userRepository: UserRepository;
  programRepository: ProgramRepository;
  attendanceRepository: AttendanceRepository;
  dropRequestRepository: DropRequestRepository;
  registrationApplicationService: RegistrationApplicationService;
  periodService: PeriodService;
  dropRequestService: DropRequestService;
  entityQueryService: EntityQueryService;
}

export class ServiceContainer {
  services: Map<string, ServiceFactory>;
  singletons: Map<string, unknown>;
  initialized: boolean;
  logger: Logger;

  // Initialize infrastructure services directly
  dbClient: GoogleSheetsDbClient | null;
  emailClient: EmailClient | null;
  cacheService: CacheService | null;

  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.initialized = false;
    this.logger = createLogger(configService);

    // Initialize infrastructure services directly
    this.dbClient = null;
    this.emailClient = null;
    this.cacheService = null;
  }

  /**
   * Initialize the service container - simplified for MVC
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('🏗️  Initializing Service Container (MVC)');

    // Initialize infrastructure services directly
    await this.#initializeInfrastructure();

    // Register repositories with direct dependencies
    this.#registerRepositories();

    // Register services with dependencies
    this.#registerServices();

    this.initialized = true;
    this.logger.info('✅ Service Container initialized');
  }

  /**
   * Initialize infrastructure services directly
   */
  async #initializeInfrastructure(): Promise<void> {
    let hasErrors = false;

    // Initialize cache service first (needed by dbClient)
    try {
      this.logger.info('🔧 Initializing cache service...');
      this.cacheService = new CacheService();
      this.logger.info('✅ Cache service initialized');
    } catch (error) {
      this.logger.error('❌ Failed to initialize cache service:', (error as Error).message);
      hasErrors = true;
      this.cacheService = null;
    }

    // Initialize database client (Google Sheets) with cache service
    try {
      this.logger.info('🔧 Initializing Google Sheets database client...');
      this.dbClient = new GoogleSheetsDbClient(configService, this.cacheService);
      this.logger.info('✅ Google Sheets database client initialized with caching');
    } catch (error) {
      this.logger.error(
        '❌ Failed to initialize Google Sheets database client:',
        (error as Error).message
      );
      this.logger.error('📋 Stack trace:', (error as Error).stack);
      hasErrors = true;
      // Continue with null dbClient - app should still start but will fail on Google Sheets operations
      this.dbClient = null;
    }

    // Initialize email client (logs its own status)
    try {
      this.emailClient = new EmailClient(configService);
    } catch (error) {
      this.logger.error('❌ Failed to initialize email client:', (error as Error).message);
      hasErrors = true;
      this.emailClient = null;
    }

    if (hasErrors) {
      this.logger.info(
        '⚠️ Infrastructure services initialized with some failures - app will continue but some features may not work'
      );
    } else {
      this.logger.info('✅ All infrastructure services initialized successfully');
    }
  }

  /**
   * Get a service by name
   */
  get<K extends keyof ServiceMap>(serviceName: K): ServiceMap[K];
  get(serviceName: string): unknown;
  get(serviceName: string): unknown {
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
        return configService as ConfigurationService;
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
  register(serviceName: string, factory: ServiceFactory): void {
    this.services.set(serviceName, factory);
  }

  /**
   * Health check for all services - simplified for MVC
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const results: HealthCheckResult = {
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
            type: (service as { constructor: { name: string } }).constructor.name,
          };
        } catch (error) {
          results.services[serviceName] = {
            status: 'unhealthy',
            error: (error as Error).message,
          };
          results.container = 'degraded';
        }
      }
    } catch (error) {
      results.container = 'unhealthy';
      results.error = (error as Error).message;
    }

    return results;
  }

  /**
   * Graceful shutdown - simplified for MVC
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down Service Container');

    // Shutdown infrastructure services directly
    const emailClientWithShutdown = this.emailClient as (EmailClient & {
      shutdown?: () => Promise<void>;
    }) | null;
    if (emailClientWithShutdown && typeof emailClientWithShutdown.shutdown === 'function') {
      await emailClientWithShutdown.shutdown();
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

    this.logger.info('✅ Service Container shutdown complete');
  }

  /**
   * Register repositories with direct dependencies - simplified for MVC
   */
  #registerRepositories(): void {
    this.register('registrationRepository', () => {
      return new RegistrationRepository(
        this.dbClient as GoogleSheetsDbClient,
        configService,
        this.get('periodService') as PeriodService
      );
    });

    this.register('userRepository', () => {
      return new UserRepository(this.dbClient as GoogleSheetsDbClient, configService);
    });

    this.register('programRepository', () => {
      return new ProgramRepository(this.dbClient as GoogleSheetsDbClient, configService);
    });

    this.register('attendanceRepository', () => {
      return new AttendanceRepository(this.dbClient as GoogleSheetsDbClient, configService);
    });

    this.register('dropRequestRepository', () => {
      return new DropRequestRepository(this.dbClient as GoogleSheetsDbClient, configService);
    });
  }

  /**
   * Register application services with dependencies - simplified for MVC
   */
  #registerServices(): void {
    this.register('registrationApplicationService', () => {
      return new RegistrationApplicationService({
        registrationRepository: this.get('registrationRepository') as RegistrationRepository,
        userRepository: this.get('userRepository') as UserRepository,
        programRepository: this.get('programRepository') as ProgramRepository,
      });
    });

    this.register('periodService', () => {
      return new PeriodService(this.dbClient as GoogleSheetsDbClient, configService);
    });

    this.register('dropRequestService', () => {
      return new DropRequestService(
        this.get('dropRequestRepository') as DropRequestRepository,
        this.get('registrationRepository') as RegistrationRepository,
        this.get('userRepository') as UserRepository,
        this.get('periodService') as PeriodService,
        configService
      );
    });

    this.register('entityQueryService', () => {
      return new EntityQueryService(
        this.get('userRepository') as UserRepository,
        this.get('programRepository') as ProgramRepository,
        this.get('registrationRepository') as RegistrationRepository,
        configService
      );
    });
  }

}

// Export singleton instance
export const serviceContainer = new ServiceContainer();
