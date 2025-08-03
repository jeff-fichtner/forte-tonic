/**
 * Legacy UserRepository - DEPRECATED
 * This file is kept for backwards compatibility but should be migrated to use the new repository pattern
 * 
 * TODO: Migrate usages to:
 * - StudentRepository for student operations
 * - AdminRepository for admin operations  
 * - InstructorRepository for instructor operations
 * - ParentRepository for parent operations
 * - UnitOfWork for coordinated operations
 */

import { UnitOfWork } from './base/unitOfWork.js';
import { Keys } from '../values/keys.js';

/**
 * @deprecated Use specific repositories instead (StudentRepository, AdminRepository, etc.)
 */
export class UserRepository {
  constructor(dbClient) {
    this.dbClient = dbClient;
    this._unitOfWork = new UnitOfWork(dbClient);
    
    console.warn('⚠️  UserRepository is deprecated. Consider migrating to specific repositories or UnitOfWork.');
  }

  /**
   * @deprecated Use AdminRepository.findAll() instead
   */
  async getAdmins(forceRefresh = false) {
    return await this._unitOfWork.admins.findAll({}, forceRefresh);
  }

  /**
   * @deprecated Use AdminRepository.findByEmail() instead
   */
  async getAdminByEmail(email) {
    return await this._unitOfWork.admins.findByEmail(email);
  }

  /**
   * @deprecated Use InstructorRepository.findAll() instead
   */
  async getInstructors(forceRefresh = false) {
    return await this._unitOfWork.instructors.findAll({}, forceRefresh);
  }

  /**
   * @deprecated Use StudentRepository.findAll() instead
   */
  async getStudents(forceRefresh = false) {
    return await this._unitOfWork.students.findAll({}, forceRefresh);
  }

  /**
   * @deprecated Use ParentRepository.findAll() instead
   */
  async getParents(forceRefresh = false) {
    return await this._unitOfWork.parents.findAll({}, forceRefresh);
  }

  /**
   * @deprecated Use StudentRepository.findById() instead
   */
  async getStudentById(id) {
    return await this._unitOfWork.students.findById(id);
  }

  /**
   * @deprecated Use UnitOfWork.findUserByEmail() instead
   */
  async findUserByEmail(email) {
    return await this._unitOfWork.findUserByEmail(email);
  }

  /**
   * Legacy method - use specific repositories
   * @deprecated
   */
  async _getRoles(forceRefresh = false) {
    console.warn('⚠️  _getRoles is deprecated and no longer supported');
    return [];
  }

  /**
   * Cleanup method
   */
  dispose() {
    this._unitOfWork.dispose();
  }
}
