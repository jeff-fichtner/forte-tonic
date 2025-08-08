import { RepositoryHelper } from './helpers/repositoryHelper.js';
import { Keys } from '../utils/values/keys.js';
import { RoleType } from '../utils/values/roleType.js';
import { Admin, Instructor, Student, Parent, Room } from '../models/shared/index.js';
import { Role } from '../models/shared/role.js';

/**
 *
 */
export class UserRepository {
  /**
   *
   */
  constructor(dbClient) {
    this.dbClient = dbClient;
  }

  /**
   *
   */
  async getAdmins(forceRefresh = false) {
    return await RepositoryHelper.getAndSetData(
      () => this.admins,
      async () =>
        (this.admins = await this.dbClient.getAllRecords(Keys.ADMINS, x =>
          Admin.fromDatabaseRow(x)
        )),
      Keys.ADMINS,
      forceRefresh
    );
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
   *
   */
  async #getRoles(forceRefresh = false) {
    return await RepositoryHelper.getAndSetData(
      () => this.roles,
      async () => (this.roles = await this.dbClient.getAllRecords(Keys.ROLES, x => new Role(...x))),
      Keys.ROLES,
      forceRefresh
    );
  }

  /**
   *
   */
  async getOperatorByEmail(email) {
    const roles = await this.#getRoles();
    return roles.find(x => x.email === email && x.role === RoleType.OPERATOR);
  }

  /**
   *
   */
  async getInstructors(forceRefresh = false) {
    return await RepositoryHelper.getAndSetData(
      () => this.instructors,
      async () =>
        (this.instructors = (
          await this.dbClient.getAllRecords(Keys.INSTRUCTORS, x => Instructor.fromDatabaseRow(x))
        ).filter(x => !x.isDeactivated)),
      Keys.INSTRUCTORS,
      forceRefresh
    );
  }

  /**
   *
   */
  async getInstructorById(id) {
    const instructors = await this.getInstructors();
    const searchId = (typeof id === 'object' && id.value) ? id.value : id;
    return instructors.find(x => {
      const instructorId = (typeof x.id === 'object' && x.id.value) ? x.id.value : x.id;
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
   *
   */
  async getStudents(forceRefresh = false) {
    return await RepositoryHelper.getAndSetData(
      () => this.students,
      async () => {
        // First, get the basic student data
        const students = await this.dbClient.getAllRecords(Keys.STUDENTS, x =>
          Student.fromDatabaseRow(x)
        );
        
        // Then, enrich with parent emails
        const parents = await this.getParents();
        
        return (this.students = students.map(student => {
          // Find parent emails for this student
          const parent1 = parents.find(p => p.id === student.parent1Id);
          const parent2 = parents.find(p => p.id === student.parent2Id);
          
          const parentEmails = [parent1?.email, parent2?.email]
            .filter(Boolean)
            .join(', ');
          
          // Create a new student with parent emails populated
          const enrichedStudent = new Student({
            ...student.toDataObject(),
            parentEmails
          });
          
          // Debug log for first few students to verify parent emails are populated
          if (students.indexOf(student) < 3) {
            console.log(`Student ${student.firstName} ${student.lastName}: parentEmails = "${parentEmails}"`);
          }
          
          return enrichedStudent;
        }));
      },
      Keys.STUDENTS,
      forceRefresh
    );
  }

  /**
   *
   */
  async getStudentById(id) {
    const students = await this.getStudents();
    const searchId = (typeof id === 'object' && id.value) ? id.value : id;
    return students.find(x => {
      const studentId = (typeof x.id === 'object' && x.id.value) ? x.id.value : x.id;
      return studentId === searchId;
    });
  }

  /**
   *
   */
  async getParents(forceRefresh = false) {
    return await RepositoryHelper.getAndSetData(
      () => this.parents,
      async () =>
        (this.parents = await this.dbClient.getAllRecords(Keys.PARENTS, x =>
          Parent.fromDatabaseRow(x)
        )),
      Keys.PARENTS,
      forceRefresh
    );
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
   *
   */
  async getRooms(forceRefresh = false) {
    return await RepositoryHelper.getAndSetData(
      () => this.rooms,
      async () =>
        (this.rooms = await this.dbClient.getAllRecords(Keys.ROOMS, x => Room.fromDatabaseRow(x))),
      Keys.ROOMS,
      forceRefresh
    );
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
}
