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
   *
   */
  async getStudents(forceRefresh = false) {
    return await RepositoryHelper.getAndSetData(
      () => this.students,
      async () =>
        (this.students = await this.dbClient.getAllRecords(Keys.STUDENTS, x =>
          Student.fromDatabaseRow(x)
        )),
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
}
