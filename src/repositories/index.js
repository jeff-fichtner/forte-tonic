/**
 * Repository Index - exports all repository classes and patterns
 */

// Base classes and patterns
export { IRepository, BaseRepository } from './baseRepository.js';

// Specific repositories
export { StudentRepository } from './studentRepository.js';
export { AdminRepository } from './adminRepository.js';
export { InstructorRepository } from './instructorRepository.js';
export { ParentRepository } from './parentRepository.js';
export { AttendanceRepository } from './attendanceRepository.js';

// Legacy - for backwards compatibility (to be deprecated)
export { UserRepository } from './userRepository.js';
export { ProgramRepository } from './programRepository.js';
