import { BaseRepository } from './baseRepository.js';
import { Keys } from '../utils/values/keys.js';
import { Admin, Instructor, Student, Parent, Room } from '../models/shared/index.js';
import { UserType } from '../config/constants.js';
import type { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';
import type { ConfigurationService } from '../services/configurationService.js';

/**
 * UserRepository - manages user-related entities (admins, instructors, students, parents, rooms)
 * Extends BaseRepository for consistent logging and base functionality
 */
export class UserRepository extends BaseRepository<Record<string, unknown>> {
  _enrichedStudentsCache: Student[] | null;
  _enrichedStudentsCacheTime: number | null;

  constructor(dbClient?: GoogleSheetsDbClient, configService?: ConfigurationService) {
    // Call parent with a generic entity name since this repo manages multiple entity types
    super('users', null, dbClient, configService);

    // Cache for enriched students to avoid re-enriching on every getStudentById call
    this._enrichedStudentsCache = null;
    this._enrichedStudentsCacheTime = null;
  }

  /**
   * Get all admins
   * Caching is handled at the GoogleSheetsDbClient layer
   */
  async getAdmins(): Promise<Admin[]> {
    this.logger.info(`📋 Loading ${Keys.ADMINS}`);
    const admins = await this.dbClient.getAllRecords(Keys.ADMINS, (record: Record<string, string>) => Admin.fromDatabaseRow(record));

    this.logger.info(`✅ Found ${admins.length} ${Keys.ADMINS}`);
    return admins;
  }

  /** Find admin by email address */
  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const admins = await this.getAdmins();
    return admins.find(x => x.email === email);
  }

  /**
   * Get admin by access code
   * @param accessCode - The access code to search for
   * @returns Admin with matching access code
   */
  async getAdminByAccessCode(accessCode: string): Promise<Admin | undefined> {
    const admins = await this.getAdmins();
    return admins.find(x => x.accessCode === accessCode);
  }

  /**
   * Get all active instructors
   * Caching is handled at the GoogleSheetsDbClient layer
   */
  async getInstructors(): Promise<Instructor[]> {
    this.logger.info(`📋 Loading ${Keys.INSTRUCTORS}`);
    const allInstructors = await this.dbClient.getAllRecords(Keys.INSTRUCTORS, (record: Record<string, string>) =>
      Instructor.fromDatabaseRow(record)
    );
    const instructors = allInstructors.filter((x: Instructor) => x.isActive);

    this.logger.info(`✅ Found ${instructors.length} active ${Keys.INSTRUCTORS}`);
    return instructors;
  }

  /** Find instructor by ID */
  async getInstructorById(id: string): Promise<Instructor | undefined> {
    const instructors = await this.getInstructors();
    return instructors.find(x => x.id === id);
  }

  /** Find instructor by email address */
  async getInstructorByEmail(email: string): Promise<Instructor | undefined> {
    const instructors = await this.getInstructors();
    return instructors.find(x => x.email === email);
  }

  /**
   * Get instructor by access code
   * @param accessCode - The access code to search for
   * @returns Instructor with matching access code
   */
  async getInstructorByAccessCode(accessCode: string): Promise<Instructor | undefined> {
    const instructors = await this.getInstructors();
    return instructors.find(x => x.accessCode === accessCode);
  }

  /**
   * Get all students with parent emails enriched
   * Caching is handled at the GoogleSheetsDbClient layer for raw data,
   * and in-memory for enriched data to avoid repeated enrichment operations
   */
  async getStudents(): Promise<Student[]> {
    // Check if we have a valid cache (enriched students)
    if (this._enrichedStudentsCache) {
      this.logger.info(`📦 Cache hit for enriched students`);
      return this._enrichedStudentsCache;
    }

    this.logger.info(`📋 Loading ${Keys.STUDENTS}`);

    // First, get the basic student data
    const students: Student[] = await this.dbClient.getAllRecords(Keys.STUDENTS, (record: Record<string, string>) =>
      Student.fromDatabaseRow(record)
    );

    // Then, enrich with parent emails
    const parents = await this.getParents();

    const enrichedStudents = students.map(student => {
      // Find parent emails for this student
      const parent1 = parents.find(p => p.id === student.parent1Id);
      const parent2 = parents.find(p => p.id === student.parent2Id);

      const parentEmails = [parent1?.email, parent2?.email].filter(Boolean).join(', ');

      // Create a new student with parent emails populated
      const enrichedStudent = new Student({
        ...student,
        firstName: student._firstName,
        lastName: student._lastName,
        parentEmails,
      });

      // Debug log for first few students to verify parent emails are populated
      if (students.indexOf(student) < 3) {
        this.logger?.info(
          `Student ${student.firstName} ${student.lastName}: parentEmails = "${parentEmails}"`
        );
      }

      return enrichedStudent;
    });

    this.logger.info(`✅ Found ${enrichedStudents.length} ${Keys.STUDENTS}`);

    // Cache the enriched students
    this._enrichedStudentsCache = enrichedStudents;
    this._enrichedStudentsCacheTime = Date.now();

    return enrichedStudents;
  }

  /** Find student by ID */
  async getStudentById(id: string): Promise<Student | undefined> {
    const students = await this.getStudents();
    return students.find(x => x.id === id);
  }

  /**
   * Get all parents
   * Caching is handled at the GoogleSheetsDbClient layer
   */
  async getParents(): Promise<Parent[]> {
    this.logger.info(`📋 Loading ${Keys.PARENTS}`);
    const parents = await this.dbClient.getAllRecords(Keys.PARENTS, (record: Record<string, string>) => Parent.fromDatabaseRow(record));

    this.logger.info(`✅ Found ${parents.length} ${Keys.PARENTS}`);
    return parents;
  }

  /** Find parent by email address */
  async getParentByEmail(email: string): Promise<Parent | undefined> {
    const parents = await this.getParents();
    return parents.find(x => x.email === email);
  }

  /**
   * Get parent by access code
   * @param accessCode - The access code to search for
   * @returns Parent with matching access code
   */
  async getParentByAccessCode(accessCode: string): Promise<Parent | undefined> {
    const parents = await this.getParents();
    return parents.find(x => x.accessCode === accessCode);
  }

  /**
   * Get parent by phone number
   * @param phone - The phone number to search for (10-digit format)
   * @returns Parent with matching phone number
   */
  async getParentByPhone(phone: string): Promise<Parent | undefined> {
    const parents = await this.getParents();
    return parents.find(x => x.phone === phone);
  }

  /**
   * Get all rooms
   * Caching is handled at the GoogleSheetsDbClient layer
   */
  async getRooms(): Promise<Room[]> {
    this.logger.info(`📋 Loading ${Keys.ROOMS}`);
    const rooms = await this.dbClient.getAllRecords(Keys.ROOMS, (record: Record<string, string>) => Room.fromDatabaseRow(record));

    this.logger.info(`✅ Found ${rooms.length} ${Keys.ROOMS}`);
    return rooms;
  }

  /** Find room by ID */
  async getRoomById(id: string): Promise<Room | undefined> {
    const rooms = await this.getRooms();
    return rooms.find(x => x.id === id);
  }

  /**
   * Get any user (admin, instructor, or parent) by access code
   * @param accessCode - The access code to search for
   * @returns User object with type, or null if not found
   */
  async getUserByAccessCode(accessCode: string): Promise<{ user: Admin | Instructor | Parent; userType: string } | null> {
    // Try to find admin first
    const admin = await this.getAdminByAccessCode(accessCode);
    if (admin) {
      return { user: admin, userType: UserType.ADMIN };
    }

    // Try to find instructor
    const instructor = await this.getInstructorByAccessCode(accessCode);
    if (instructor) {
      return { user: instructor, userType: UserType.INSTRUCTOR };
    }

    // Try to find parent
    const parent = await this.getParentByAccessCode(accessCode);
    if (parent) {
      return { user: parent, userType: UserType.PARENT };
    }

    // Not found in any user type
    return null;
  }
}
