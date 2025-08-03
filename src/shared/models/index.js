/**
 * Shared Models Index
 * Exports all API transfer models for client-server communication
 *
 * Architecture:
 * - Core data models (src/core/models/) - Simple data containers for database operations
 * - API transfer models (src/shared/models/) - Rich models with validation and business logic
 * - Request DTOs (src/shared/models/requests/) - Structured request validation
 * - Response DTOs (src/shared/models/responses/) - Structured response formatting
 */

// Core entity models
export { Student } from './student.js';
export { Admin } from './admin.js';
export { Instructor } from './instructor.js';
export { Parent } from './parent.js';

// Request/Response DTOs
export * from './requests/studentRequests.js';
export * from './responses/studentResponses.js';

// Future exports (to be implemented)
// export { Class } from './class.js';
// export { Registration } from './registration.js';
// export { Room } from './room.js';
export { Class } from './class.js';
export { Registration } from './registration.js';
export { Room } from './room.js';
