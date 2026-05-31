import { BaseRepository } from './baseRepository.js';
import { Keys } from '../utils/values/keys.js';
import { Trimester } from '../utils/values/trimester.js';
import { MAX_GRADE } from '../utils/values/grade.js';
import { Admin, Instructor, Student, Parent, Room } from '../models/shared/index.js';
import { UserType } from '../config/constants.js';
import { NotFoundError } from '../common/errors.js';
import type { GoogleSheetsDbClient } from '../database/googleSheetsDbClient.js';
import type { ConfigurationService } from '../services/configurationService.js';

/**
 * UserRepository - manages user-related entities (admins, instructors, students, parents, rooms)
 * Extends BaseRepository for consistent logging and base functionality
 */
export class UserRepository extends BaseRepository<Record<string, unknown>> {
  _enrichedStudentsCache: Student[] | null;
  _enrichedStudentsCacheTime: number | null;

  constructor(dbClient: GoogleSheetsDbClient, configService?: ConfigurationService) {
    // Call parent with a generic entity name since this repo manages multiple entity types
    // Identity mapper: this repo uses entity-specific mappers in each method, not the base class mapper
    super('users', record => record as Record<string, unknown>, dbClient, configService);

    // Cache for enriched students to avoid re-enriching on every getStudentById call
    this._enrichedStudentsCache = null;
    this._enrichedStudentsCacheTime = null;
  }

  /**
   * Get all admins
   * Caching is handled at the GoogleSheetsDbClient layer
   */
  async getAdmins(): Promise<Admin[]> {
    return this.fetchAll(Keys.ADMINS, record => Admin.fromDatabaseRow(record));
  }

  /** Find admin by email address */
  async getAdminByEmail(email: string): Promise<Admin | null> {
    const admins = await this.getAdmins();
    return admins.find(x => x.email === email) ?? null;
  }

  /**
   * Get admin by access code
   * @param accessCode - The access code to search for
   * @returns Admin with matching access code
   */
  async getAdminByAccessCode(accessCode: string): Promise<Admin | null> {
    const admins = await this.getAdmins();
    return admins.find(x => x.accessCode === accessCode) ?? null;
  }

  /**
   * Get all active instructors
   * Caching is handled at the GoogleSheetsDbClient layer
   */
  async getInstructors(): Promise<Instructor[]> {
    const allInstructors = await this.fetchAll(Keys.INSTRUCTORS, record =>
      Instructor.fromDatabaseRow(record)
    );
    return allInstructors.filter(x => x.isActive);
  }

  /**
   * Find instructor by ID. Throws NotFoundError if the ID does not match an
   * active instructor — "instructor missing" is a data-integrity bug for
   * entity-lookup calls, not a normal user-facing case.
   */
  async getInstructorById(id: string): Promise<Instructor> {
    const instructors = await this.getInstructors();
    const instructor = instructors.find(x => x.id === id);
    if (!instructor) {
      throw new NotFoundError(`Instructor not found: ${id}`);
    }
    return instructor;
  }

  /** Find instructor by email address */
  async getInstructorByEmail(email: string): Promise<Instructor | null> {
    const instructors = await this.getInstructors();
    return instructors.find(x => x.email === email) ?? null;
  }

  /**
   * Get instructor by access code
   * @param accessCode - The access code to search for
   * @returns Instructor with matching access code
   */
  async getInstructorByAccessCode(accessCode: string): Promise<Instructor | null> {
    const instructors = await this.getInstructors();
    return instructors.find(x => x.accessCode === accessCode) ?? null;
  }

  /**
   * Get all students with parent emails enriched.
   *
   * The `period` parameter is REQUIRED (per FR-003): every caller must pass
   * the active trimester.
   *
   * **Summer grade-bump.** When `period === 'summer'`, each student's `grade`
   * is bumped by +1 in the returned data, and any student whose bumped grade
   * exceeds `MAX_GRADE` is dropped from the result (graduating students do
   * not appear in summer views). This is a runtime display/filter transform —
   * the bump is NEVER persisted to the underlying sheet. It exists because
   * summer registration is logically "next fall," so students see the lessons
   * available to them at their post-summer grade. See Constitution Principle IX
   * (Trimester-Aware by Default).
   *
   * **Cache.** Raw rows are cached at the GoogleSheetsDbClient layer; this
   * method adds a second enriched-students cache (5-min TTL, matches dbClient).
   * The grade-bump is applied AFTER the cache read so the cache stays
   * period-agnostic — a single enriched cache serves all periods.
   */
  async getStudents(period: string): Promise<Student[]> {
    if (!period) {
      throw new Error(
        'getStudents requires a `period` parameter (FR-003). ' +
          `Received: ${JSON.stringify(period)}. ` +
          'Every caller must pass an active trimester value.'
      );
    }

    // Check if we have a valid cache (enriched students) — 5 min expiration matches dbClient
    const ENRICHED_CACHE_EXPIRATION = 5 * 60 * 1000;
    let enrichedStudents: Student[];

    if (
      this._enrichedStudentsCache &&
      this._enrichedStudentsCacheTime &&
      Date.now() - this._enrichedStudentsCacheTime < ENRICHED_CACHE_EXPIRATION
    ) {
      this.logger.info(`📦 Cache hit for enriched students`);
      enrichedStudents = this._enrichedStudentsCache;
    } else {
      // First, get the basic student data
      const students = await this.fetchAll(Keys.STUDENTS, record =>
        Student.fromDatabaseRow(record)
      );

      // Then, enrich with parent emails
      const parents = await this.getParents();

      enrichedStudents = students.map(student => {
        // Find parent emails for this student
        const parent1 = parents.find(p => p.id === student.parent1Id);
        const parent2 = parents.find(p => p.id === student.parent2Id);

        const parentEmails = [parent1?.email, parent2?.email].filter(Boolean).join(', ');

        // Create a new student with parent emails populated
        return new Student({
          ...student,
          firstName: student.givenFirstName,
          lastName: student.givenLastName,
          parentEmails,
        });
      });

      this.logger.info(`✅ Found ${enrichedStudents.length} ${Keys.STUDENTS}`);

      // Cache the enriched students
      this._enrichedStudentsCache = enrichedStudents;
      this._enrichedStudentsCacheTime = Date.now();
    }

    // Apply the summer grade-bump as a runtime transform (FR-003).
    // The stored grade is unchanged; we return a new Student with grade + 1.
    // Students whose bumped grade exceeds the program's max (graduating
    // 8th-graders → "grade 9") are filtered out — they've aged out for
    // next year and shouldn't appear in any summer enrollment view.
    if (period === Trimester.SUMMER) {
      return enrichedStudents.flatMap(student => {
        const storedGrade = parseInt(student.grade, 10);
        if (Number.isNaN(storedGrade)) {
          // Non-numeric grade (e.g., blank) — leave as-is; no bump applies.
          return [student];
        }
        const bumpedGrade = storedGrade + 1;
        if (bumpedGrade > MAX_GRADE) {
          // Aged out — drop from the summer view entirely.
          return [];
        }
        return [
          new Student({
            ...student,
            firstName: student.givenFirstName,
            lastName: student.givenLastName,
            grade: String(bumpedGrade),
          }),
        ];
      });
    }

    return enrichedStudents;
  }

  /**
   * Find student by ID, returning the period-appropriate view. Forwards
   * `period` to `getStudents()` so the summer grade-bump (when
   * `period === 'summer'`: +1 to grade, drop anyone over `MAX_GRADE`) is
   * applied to the returned student — see `getStudents` for full details.
   * Throws NotFoundError if the ID does not match a student in the
   * period-filtered result set ("student missing" is a data-integrity bug
   * or, for summer, the student has graduated past `MAX_GRADE`).
   */
  async getStudentById(id: string, period: string): Promise<Student> {
    const students = await this.getStudents(period);
    const student = students.find(x => x.id === id);
    if (!student) {
      throw new NotFoundError(`Student not found: ${id}`);
    }
    return student;
  }

  /**
   * Get all parents
   * Caching is handled at the GoogleSheetsDbClient layer
   */
  async getParents(): Promise<Parent[]> {
    return this.fetchAll(Keys.PARENTS, record => Parent.fromDatabaseRow(record));
  }

  /** Find parent by email address */
  async getParentByEmail(email: string): Promise<Parent | null> {
    const parents = await this.getParents();
    return parents.find(x => x.email === email) ?? null;
  }

  /**
   * Get parent by access code
   * @param accessCode - The access code to search for
   * @returns Parent with matching access code
   */
  async getParentByAccessCode(accessCode: string): Promise<Parent | null> {
    const parents = await this.getParents();
    return parents.find(x => x.accessCode === accessCode) ?? null;
  }

  /**
   * Get parent by phone number
   * @param phone - The phone number to search for (10-digit format)
   * @returns Parent with matching phone number
   */
  async getParentByPhone(phone: string): Promise<Parent | null> {
    const parents = await this.getParents();
    return parents.find(x => x.phone === phone) ?? null;
  }

  /**
   * Get all rooms
   * Caching is handled at the GoogleSheetsDbClient layer
   */
  async getRooms(): Promise<Room[]> {
    return this.fetchAll(Keys.ROOMS, record => Room.fromDatabaseRow(record));
  }

  /**
   * Find room by ID. Throws NotFoundError if the ID does not match a known
   * room — caller is asking for a specific room and an absent record is a
   * data-integrity bug, not a "room is optional" case.
   */
  async getRoomById(id: string): Promise<Room> {
    const rooms = await this.getRooms();
    const room = rooms.find(x => x.id === id);
    if (!room) {
      throw new NotFoundError(`Room not found: ${id}`);
    }
    return room;
  }

  /**
   * Get any user (admin, instructor, or parent) by access code
   * @param accessCode - The access code to search for
   * @returns User object with type, or null if not found
   */
  async getUserByAccessCode(
    accessCode: string
  ): Promise<{ user: Admin | Instructor | Parent; userType: string } | null> {
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
