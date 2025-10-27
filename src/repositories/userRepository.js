import { BaseRepository } from './baseRepository.js';
import { Keys } from '../utils/values/keys.js';
import { Admin, Instructor, Student, Parent, Room } from '../models/shared/index.js';

/**
 * UserRepository - manages user-related entities (admins, instructors, students, parents, rooms)
 * Extends BaseRepository for consistent logging and base functionality
 */
export class UserRepository extends BaseRepository {
  /**
   * @param {Object} dbClient - Database client instance
   * @param {Object} configService - Configuration service for logger initialization
   */
  constructor(dbClient, configService) {
    // Call parent with a generic entity name since this repo manages multiple entity types
    super('users', null, dbClient, configService);
  }

  /**
   * Get all admins with caching
   */
  async getAdmins(forceRefresh = false) {
    const cacheKey = `${Keys.ADMINS}:all`;

    // Check cache first unless force refresh
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTtl) {
        this.logger.info(`📦 Returning cached ${Keys.ADMINS}`);
        return cached.data;
      }
    }

    this.logger.info(`📋 Loading ${Keys.ADMINS}`);
    const admins = await this.dbClient.getAllRecords(Keys.ADMINS, x => Admin.fromDatabaseRow(x));

    // Cache the results
    this.cache.set(cacheKey, {
      data: admins,
      timestamp: Date.now(),
    });

    this.logger.info(`✅ Found ${admins.length} ${Keys.ADMINS}`);
    return admins;
  }

  /**
   *
   */
  async getAdminByEmail(email) {
    const admins = await this.getAdmins();
    return admins.find(x => x.email === email);
  }

  /**
   * Get admin by access code
   * @param {string} accessCode - The access code to search for
   * @returns {Promise<Admin|undefined>} Admin with matching access code
   */
  async getAdminByAccessCode(accessCode) {
    const admins = await this.getAdmins();
    return admins.find(x => x.accessCode === accessCode);
  }

  /**
   * Get all active instructors with caching
   */
  async getInstructors(forceRefresh = false) {
    const cacheKey = `${Keys.INSTRUCTORS}:all`;

    // Check cache first unless force refresh
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTtl) {
        this.logger.info(`📦 Returning cached ${Keys.INSTRUCTORS}`);
        return cached.data;
      }
    }

    this.logger.info(`📋 Loading ${Keys.INSTRUCTORS}`);
    const allInstructors = await this.dbClient.getAllRecords(Keys.INSTRUCTORS, x =>
      Instructor.fromDatabaseRow(x)
    );
    const instructors = allInstructors.filter(x => x.isActive);

    // Cache the results
    this.cache.set(cacheKey, {
      data: instructors,
      timestamp: Date.now(),
    });

    this.logger.info(`✅ Found ${instructors.length} active ${Keys.INSTRUCTORS}`);
    return instructors;
  }

  /**
   *
   */
  async getInstructorById(id) {
    const instructors = await this.getInstructors();
    const searchId = typeof id === 'object' && id.value ? id.value : id;
    return instructors.find(x => {
      const instructorId = typeof x.id === 'object' && x.id.value ? x.id.value : x.id;
      return instructorId === searchId;
    });
  }

  /**
   *
   */
  async getInstructorByEmail(email) {
    const instructors = await this.getInstructors();
    return instructors.find(x => x.email === email);
  }

  /**
   * Get instructor by access code
   * @param {string} accessCode - The access code to search for
   * @returns {Promise<Instructor|undefined>} Instructor with matching access code
   */
  async getInstructorByAccessCode(accessCode) {
    const instructors = await this.getInstructors();
    return instructors.find(x => x.accessCode === accessCode);
  }

  /**
   * Get all students with parent emails enriched, with caching
   */
  async getStudents(forceRefresh = false) {
    const cacheKey = `${Keys.STUDENTS}:all`;

    // Check cache first unless force refresh
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTtl) {
        this.logger.info(`📦 Returning cached ${Keys.STUDENTS}`);
        return cached.data;
      }
    }

    this.logger.info(`📋 Loading ${Keys.STUDENTS}`);

    // First, get the basic student data
    const students = await this.dbClient.getAllRecords(Keys.STUDENTS, x =>
      Student.fromDatabaseRow(x)
    );

    // Then, enrich with parent emails
    const parents = await this.getParents();

    const enrichedStudents = students.map(student => {
      // Find parent emails for this student
      const parent1 = parents.find(p => p.id === student.parent1Id);
      const parent2 = parents.find(p => p.id === student.parent2Id);

      const parentEmails = [parent1?.email, parent2?.email].filter(Boolean).join(', ');

      // Get student data - handle both Student instances and plain objects
      const studentData =
        typeof student.toDataObject === 'function' ? student.toDataObject() : { ...student };

      // Create a new student with parent emails populated
      const enrichedStudent = new Student({
        ...studentData,
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

    // Cache the results
    this.cache.set(cacheKey, {
      data: enrichedStudents,
      timestamp: Date.now(),
    });

    this.logger.info(`✅ Found ${enrichedStudents.length} ${Keys.STUDENTS}`);
    return enrichedStudents;
  }

  /**
   *
   */
  async getStudentById(id) {
    const students = await this.getStudents();
    const searchId = typeof id === 'object' && id.value ? id.value : id;
    return students.find(x => {
      const studentId = typeof x.id === 'object' && x.id.value ? x.id.value : x.id;
      return studentId === searchId;
    });
  }

  /**
   * Get all parents with caching
   */
  async getParents(forceRefresh = false) {
    const cacheKey = `${Keys.PARENTS}:all`;

    // Check cache first unless force refresh
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTtl) {
        this.logger.info(`📦 Returning cached ${Keys.PARENTS}`);
        return cached.data;
      }
    }

    this.logger.info(`📋 Loading ${Keys.PARENTS}`);
    const parents = await this.dbClient.getAllRecords(Keys.PARENTS, x => Parent.fromDatabaseRow(x));

    // Cache the results
    this.cache.set(cacheKey, {
      data: parents,
      timestamp: Date.now(),
    });

    this.logger.info(`✅ Found ${parents.length} ${Keys.PARENTS}`);
    return parents;
  }

  /**
   *
   */
  async getParentByEmail(email) {
    const parents = await this.getParents();
    return parents.find(x => x.email === email);
  }

  /**
   * Get parent by access code
   * @param {string} accessCode - The access code to search for
   * @returns {Promise<Parent|undefined>} Parent with matching access code
   */
  async getParentByAccessCode(accessCode) {
    const parents = await this.getParents();
    return parents.find(x => x.accessCode === accessCode);
  }

  /**
   * Get parent by phone number
   * @param {string} phone - The phone number to search for (10-digit format)
   * @returns {Promise<Parent|undefined>} Parent with matching phone number
   */
  async getParentByPhone(phone) {
    const parents = await this.getParents();
    return parents.find(x => x.phone === phone);
  }

  /**
   * Get all rooms with caching
   */
  async getRooms(forceRefresh = false) {
    const cacheKey = `${Keys.ROOMS}:all`;

    // Check cache first unless force refresh
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTtl) {
        this.logger.info(`📦 Returning cached ${Keys.ROOMS}`);
        return cached.data;
      }
    }

    this.logger.info(`📋 Loading ${Keys.ROOMS}`);
    const rooms = await this.dbClient.getAllRecords(Keys.ROOMS, x => Room.fromDatabaseRow(x));

    // Cache the results
    this.cache.set(cacheKey, {
      data: rooms,
      timestamp: Date.now(),
    });

    this.logger.info(`✅ Found ${rooms.length} ${Keys.ROOMS}`);
    return rooms;
  }

  /**
   *
   */
  async getRoomById(id) {
    const rooms = await this.getRooms();
    return rooms.find(x => x.id === id);
  }

  /**
   * Get any user (admin, instructor, or parent) by access code
   * @param {string} accessCode - The access code to search for
   * @returns {Promise<{user: Admin|Instructor|Parent, userType: string}|null>} User object with type, or null if not found
   */
  async getUserByAccessCode(accessCode) {
    // Try to find admin first
    const admin = await this.getAdminByAccessCode(accessCode);
    if (admin) {
      return { user: admin, userType: 'admin' };
    }

    // Try to find instructor
    const instructor = await this.getInstructorByAccessCode(accessCode);
    if (instructor) {
      return { user: instructor, userType: 'instructor' };
    }

    // Try to find parent
    const parent = await this.getParentByAccessCode(accessCode);
    if (parent) {
      return { user: parent, userType: 'parent' };
    }

    // Not found in any user type
    return null;
  }

  /**
   * Clear all repository-level caches
   */
  clearCache() {
    // Clear all user-related caches
    const keysToDelete = [
      `${Keys.ADMINS}:all`,
      `${Keys.INSTRUCTORS}:all`,
      `${Keys.STUDENTS}:all`,
      `${Keys.PARENTS}:all`,
      `${Keys.ROOMS}:all`,
    ];

    keysToDelete.forEach(key => this.cache.delete(key));
    this.logger.info('🧹 UserRepository cache cleared');
  }
}
