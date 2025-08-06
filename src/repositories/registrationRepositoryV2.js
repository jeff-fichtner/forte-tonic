/**
 * Registration Repository 
 * =======================
 * 
 * Repository for simplified registration model with UUID primary keys
 */

import { Registration } from '../models/shared/registration.js';
import { RegistrationId } from '../utils/values/registrationId.js';

export class RegistrationRepository {
  constructor(dbClient) {
    this.dbClient = dbClient;
    this.cache = new Map();
  }

  /**
   * Get registration by UUID (new format)
   */
  async getById(id) {
    try {
      const registrationId = typeof id === 'string' ? new RegistrationId(id) : id;
      
      // Check cache first
      if (this.cache.has(registrationId.getValue())) {
        return this.cache.get(registrationId.getValue());
      }

      // Query by UUID in new schema
      const response = await this.dbClient.sheets.spreadsheets.values.get({
        spreadsheetId: this.dbClient.spreadsheetId,
        range: 'registrations!A:Z'
      });

      const values = response.data.values || [];
      const headers = values[0] || [];
      const rows = values.slice(1);

      // Find row where first column (Id) matches UUID
      const matchingRow = rows.find(row => row[0] === registrationId.getValue());
      
      if (!matchingRow) {
        return null;
      }

      const registration = Registration.fromDatabaseRow(matchingRow);
      this.cache.set(registrationId.getValue(), registration);
      
      return registration;
    } catch (error) {
      console.error('Error getting registration by ID:', error);
      throw error;
    }
  }

  /**
   * Get all registrations for a student
   */
  async getByStudentId(studentId) {
    try {
      const response = await this.dbClient.sheets.spreadsheets.values.get({
        spreadsheetId: this.dbClient.spreadsheetId,
        range: 'registrations!A:Z'
      });

      const values = response.data.values || [];
      const rows = values.slice(1);

      // Find all rows where StudentId column matches (now column 1, not 2)
      const matchingRows = rows.filter(row => row[1] === studentId);
      
      return matchingRows.map(row => Registration.fromDatabaseRow(row));
    } catch (error) {
      console.error('Error getting registrations by student ID:', error);
      throw error;
    }
  }

  /**
   * Get all registrations for an instructor
   */
  async getByInstructorId(instructorId) {
    try {
      const response = await this.dbClient.sheets.spreadsheets.values.get({
        spreadsheetId: this.dbClient.spreadsheetId,
        range: 'registrations!A:Z'
      });

      const values = response.data.values || [];
      const rows = values.slice(1);

      // Find all rows where InstructorId column matches (now column 2, not 3)  
      const matchingRows = rows.filter(row => row[2] === instructorId);
      
      return matchingRows.map(row => Registration.fromDatabaseRow(row));
    } catch (error) {
      console.error('Error getting registrations by instructor ID:', error);
      throw error;
    }
  }

  /**
   * Get all active registrations
   */
  async getActiveRegistrations() {
    try {
      const response = await this.dbClient.sheets.spreadsheets.values.get({
        spreadsheetId: this.dbClient.spreadsheetId,
        range: 'registrations!A:Z'
      });

      const values = response.data.values || [];
      const rows = values.slice(1);

      // Find all rows where Status column is 'active' (or empty for legacy data)
      const activeRows = rows.filter(row => {
        const status = row[17]; // Status column
        return !status || status === 'active';
      });
      
      return matchingRows.map(row => Registration.fromDatabaseRow(row));
    } catch (error) {
      console.error('Error getting active registrations:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}
