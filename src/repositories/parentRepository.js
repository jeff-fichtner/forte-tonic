/**
 * Parent Repository - handles parent-specific data operations
 */

import { BaseRepository } from './baseRepository.js';
import { Parent } from '../models/shared/parent.js'; // Data layer model
import { Keys } from '../utils/values/keys.js';

export class ParentRepository extends BaseRepository {
  constructor(dbClient) {
    super(Keys.PARENTS, Parent, dbClient);
  }

  /**
   * Finds parent by email address
   */
  async findByEmail(email) {
    if (!email) return null;
    return await this.findOneBy('email', email);
  }

  /**
   * Finds parents by phone number
   */
  async findByPhone(phone) {
    if (!phone) return [];
    return await this.findBy('phone', phone);
  }

  /**
   * Finds parents of a specific student
   */
  async findByStudentId(studentId) {
    // This would require a relationship query - depends on how parent-student relationships are stored
    // For now, return empty array as this might need to be handled by a service layer
    return [];
  }

  /**
   * Checks if email is already in use
   */
  async isEmailTaken(email, excludeId = null) {
    const parent = await this.findByEmail(email);
    return parent && parent.id !== excludeId;
  }

  /**
   * Finds parents who can be emergency contacts
   */
  async findEmergencyContacts() {
    const all = await this.findAll();
    return all.filter(parent => parent.phone && parent.email);
  }

  /**
   * Searches parents by name, email, or phone
   */
  async search(searchTerm) {
    if (!searchTerm) return await this.findAll();

    const all = await this.findAll();
    const term = searchTerm.toLowerCase();

    return all.filter(
      parent =>
        parent.firstName?.toLowerCase().includes(term) ||
        parent.lastName?.toLowerCase().includes(term) ||
        parent.email?.toLowerCase().includes(term) ||
        parent.phone?.includes(term)
    );
  }
}
