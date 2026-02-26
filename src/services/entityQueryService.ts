import { BaseService } from '../infrastructure/base/baseService.js';
import type { UserRepository } from '../repositories/userRepository.js';
import type { ProgramRepository } from '../repositories/programRepository.js';
import type { RegistrationRepository } from '../repositories/registrationRepository.js';
import type { ConfigurationService } from './configurationService.js';
import type { Student } from '../models/shared/student.js';
import type { Instructor } from '../models/shared/instructor.js';
import type { Registration } from '../models/shared/registration.js';
import type { Class } from '../models/shared/class.js';
import type { Admin } from '../models/shared/admin.js';
import type { Room } from '../models/shared/room.js';

interface StudentFilters {
  parentId?: string;
}

interface InstructorFilters {
  instructorIds?: string[];
}

interface RegistrationFilters {
  trimester: string;
  studentIds?: string[];
  instructorId?: string;
  excludeWaitlist?: boolean;
}

export class EntityQueryService extends BaseService {
  #userRepository: UserRepository;
  #programRepository: ProgramRepository;
  #registrationRepository: RegistrationRepository;

  constructor(
    userRepository: UserRepository,
    programRepository: ProgramRepository,
    registrationRepository: RegistrationRepository,
    configService: ConfigurationService
  ) {
    super(configService);
    this.#userRepository = userRepository;
    this.#programRepository = programRepository;
    this.#registrationRepository = registrationRepository;
  }

  async getStudents(filters?: StudentFilters): Promise<Student[]> {
    const students = await this.#userRepository.getStudents();
    if (filters?.parentId) {
      return students.filter(
        s => s.parent1Id === filters.parentId || s.parent2Id === filters.parentId
      );
    }
    return students;
  }

  async getInstructors(filters?: InstructorFilters): Promise<Instructor[]> {
    const instructors = await this.#userRepository.getInstructors();
    if (filters?.instructorIds) {
      const idSet = new Set(filters.instructorIds);
      return instructors.filter(i => idSet.has(i.id));
    }
    return instructors;
  }

  async getRegistrations(filters: RegistrationFilters): Promise<Registration[]> {
    let registrations = await this.#registrationRepository.getRegistrationsForTrimester(filters.trimester);
    if (filters.studentIds) {
      const idSet = new Set(filters.studentIds);
      registrations = registrations.filter(r => idSet.has(r.studentId));
    }
    if (filters.instructorId) {
      registrations = registrations.filter(r => r.instructorId === filters.instructorId);
    }
    if (filters.excludeWaitlist) {
      registrations = registrations.filter(r => !r.isWaitlistClass);
    }
    return registrations;
  }

  async getClasses(): Promise<Class[]> {
    return this.#programRepository.getClasses();
  }

  async getAdmins(): Promise<Admin[]> {
    return this.#userRepository.getAdmins();
  }

  async getRooms(): Promise<Room[]> {
    return this.#userRepository.getRooms();
  }
}
