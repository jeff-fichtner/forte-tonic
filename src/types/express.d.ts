import type { UserRepository } from '../repositories/userRepository.js';
import type { ProgramRepository } from '../repositories/programRepository.js';
import type { AttendanceRepository } from '../repositories/attendanceRepository.js';
import type { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';

declare module 'express-serve-static-core' {
  interface Request {
    currentUser?: {
      id: string;
      email: string;
      accessCode: string;
      userType: string;
    } | null;
    user?: {
      id: string;
      email: string;
      accessCode: string;
      userType: string;
    } | null;
    userRepository?: UserRepository;
    programRepository?: ProgramRepository;
    attendanceRepository?: AttendanceRepository;
    dbClient?: GoogleSheetsDbClient;
    requestData?: Record<string, unknown>;
    paginationArgs?: unknown[];
  }
}
