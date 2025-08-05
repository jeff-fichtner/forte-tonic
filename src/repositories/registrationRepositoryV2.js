/**
 * Registration Repository with UUID Support (V2)
 * ===============================================
 * 
 * Enhanced repository that supports both legacy composite keys and new UUID primary keys
 */

import { Registration } from '../models/shared/registration.js';
import { RegistrationV2 } from '../models/shared/registrationV2.js';
import { RegistrationId } from '../utils/values/registrationId.js';

export class RegistrationRepositoryV2 {
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

      const registration = RegistrationV2.fromDatabaseRow(matchingRow);
      this.cache.set(registrationId.getValue(), registration);
      
      return registration;
    } catch (error) {
      console.error('Error getting registration by ID:', error);
      throw error;
    }
  }

  /**
   * Get registration by composite key (legacy compatibility)
   */
  async getByCompositeKey(compositeKey) {
    try {
      // Check if we have UUID index available
      const indexResponse = await this.dbClient.sheets.spreadsheets.values.get({
        spreadsheetId: this.dbClient.spreadsheetId,
        range: 'registrations_composite_index!A:C'
      }).catch(() => null);

      if (indexResponse) {
        // Use index for fast lookup
        const indexValues = indexResponse.data.values || [];
        const indexRows = indexValues.slice(1);
        
        const indexMatch = indexRows.find(row => row[0] === compositeKey);
        if (indexMatch) {
          const uuid = indexMatch[1];
          return await this.getById(uuid);
        }
      }

      // Fallback: Search main table by composite key column
      const response = await this.dbClient.sheets.spreadsheets.values.get({
        spreadsheetId: this.dbClient.spreadsheetId,
        range: 'registrations!A:Z'
      });

      const values = response.data.values || [];
      const rows = values.slice(1);

      // Find row where second column (CompositeKey) matches
      const matchingRow = rows.find(row => row[1] === compositeKey);
      
      if (!matchingRow) {
        return null;
      }

      return RegistrationV2.fromDatabaseRow(matchingRow);
    } catch (error) {
      console.error('Error getting registration by composite key:', error);
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

      // Find all rows where StudentId column matches
      const matchingRows = rows.filter(row => row[2] === studentId);
      
      return matchingRows.map(row => RegistrationV2.fromDatabaseRow(row));
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

      // Find all rows where InstructorId column matches
      const matchingRows = rows.filter(row => row[3] === instructorId);
      
      return matchingRows.map(row => RegistrationV2.fromDatabaseRow(row));
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
      
      return activeRows.map(row => RegistrationV2.fromDatabaseRow(row));
    } catch (error) {
      console.error('Error getting active registrations:', error);
      throw error;
    }
  }

  /**
   * Legacy method: Get all registrations using old format
   */
  async getAllLegacyFormat() {
    try {
      const registrations = await this.getActiveRegistrations();
      
      // Convert to legacy format for backward compatibility
      return registrations.map(reg => ({
        id: reg.getCompositeKey(), // Use composite key as ID
        studentId: reg.studentId.getValue(),
        instructorId: reg.instructorId.getValue(),
        day: reg.day,
        startTime: reg.startTime,
        length: reg.length,
        registrationType: reg.registrationType,
        roomId: reg.roomId,
        instrument: reg.instrument,
        transportationType: reg.transportationType,
        notes: reg.notes,
        classId: reg.classId,
        classTitle: reg.classTitle,
        expectedStartDate: reg.expectedStartDate,
        createdAt: reg.createdAt,
        createdBy: reg.createdBy
      }));
    } catch (error) {
      console.error('Error getting legacy format registrations:', error);
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
