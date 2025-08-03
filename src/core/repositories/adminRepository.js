/**
 * Admin Repository - handles admin-specific data operations
 */

import { BaseRepository } from './base/baseRepository.js';
import { Admin } from '../../shared/models/admin.js'; // Data layer model
import { Keys } from '../values/keys.js';

export class AdminRepository extends BaseRepository {
  constructor(dbClient) {
    super(dbClient, Keys.ADMINS, Admin);
  }

  /**
   * Finds admin by email address
   */
  async findByEmail(email) {
    if (!email) return null;
    return await this.findOneBy('email', email);
  }

  /**
   * Finds active admins
   */
  async findActive() {
    const all = await this.findAll();
    return all.filter(admin => !admin.isDeactivated);
  }

  /**
   * Finds admins by permission (if permissions are stored)
   */
  async findByPermission(permission) {
    const all = await this.findAll();
    return all.filter(admin => admin.permissions?.includes(permission));
  }

  /**
   * Checks if email is already in use
   */
  async isEmailTaken(email, excludeId = null) {
    const admin = await this.findByEmail(email);
    return admin && admin.id !== excludeId;
  }

  /**
   * Authenticates admin credentials
   */
  async authenticate(email) {
    const admin = await this.findByEmail(email);
    if (!admin || admin.isDeactivated) {
      return null;
    }
    return admin;
  }

  /**
   * Updates last login time
   */
  async updateLastLogin(adminId) {
    const admin = await this.findById(adminId);
    if (admin) {
      admin.lastLoginDate = new Date();
      await this.update(adminId, admin);
    }
    return admin;
  }
}
