/**
 * Repository Index - exports all repository classes and patterns
 */

// Base classes and patterns
export { IRepository, BaseRepository } from './baseRepository.js';

// Domain repositories (used via service container)
export { AttendanceRepository } from './attendanceRepository.js';
export { ProgramRepository } from './programRepository.js';
export { RegistrationRepository } from './registrationRepository.js';
export { UserRepository } from './userRepository.js';
