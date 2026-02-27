/**
 * Application Services
 * ====================
 *
 * Business logic layer between controllers and repositories.
 * Services orchestrate validation, conflict detection, and persistence
 * workflows — controllers delegate here instead of calling repositories directly.
 *
 * - ConfigurationService — centralised env-var access (singleton, no BaseService)
 * - RegistrationService — registration lifecycle: validate → check conflicts → persist
 * - PeriodService        — trimester/enrollment-period queries and sequencing
 * - DropRequestService   — mid-trimester drop request workflow (create / approve / reject)
 * - EntityQueryService   — read-only cross-entity queries with optional filtering
 */

export { ConfigurationService, configService } from './configurationService.js';
export { DropRequestService } from './dropRequestService.js';
export { EntityQueryService } from './entityQueryService.js';
export { PeriodService } from './periodService.js';
export { RegistrationService } from './registrationService.js';
