/**
 * Repository Index - exports all repository classes and patterns
 */

// Base classes and patterns
export { IRepository, BaseRepository } from './base/baseRepository.js';
export { UnitOfWork } from './base/unitOfWork.js';

// Specific repositories
export { StudentRepository } from './studentRepository.js';
export { AdminRepository } from './adminRepository.js';
export { InstructorRepository } from './instructorRepository.js';
export { ParentRepository } from './parentRepository.js';
export { RegistrationRepository } from './registrationRepository.js';
export { AttendanceRepository } from './attendanceRepository.js';

// Legacy - for backwards compatibility (to be deprecated)
export { UserRepository } from './userRepository.js';
export { ProgramRepository } from './programRepository.js';
