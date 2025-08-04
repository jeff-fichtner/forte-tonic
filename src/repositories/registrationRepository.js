import { BaseRepository } from './baseRepository.js';
import { Keys } from '../utils/values/keys.js';
import { Registration } from '../models/shared/registration.js';

/**
 * Repository for registration data operations
 */
export class RegistrationRepository extends BaseRepository {
  constructor(dbClient) {
    super();
    this.dbClient = dbClient;
  }

  /**
   * Create a new registration
   */
  async create(registration) {
    // Prepare data for Google Sheets
    const registrationData = [
      registration.id,
      registration.studentId,
      registration.instructorId,
      registration.classId,
      registration.type,
      registration.status || 'pending',
      registration.registrationDate.toISOString(),
      registration.notes || '',
      registration.paymentStatus || 'pending',
      registration.metadata ? JSON.stringify(registration.metadata) : '',
    ];

    await this.dbClient.appendRow('registrations', registrationData);

    return registration;
  }

  /**
   * Find registration by ID
   */
  async findById(registrationId) {
    const data = await this.dbClient.getRows('registrations');
    const row = data.find(row => row[0] === registrationId);

    if (!row) {
      return null;
    }

    return this._mapRowToRegistration(row);
  }

  /**
   * Find registrations by student ID
   */
  async findByStudentId(studentId) {
    const data = await this.dbClient.getRows('registrations');
    const rows = data.filter(row => row[1] === studentId);

    return rows.map(row => this._mapRowToRegistration(row));
  }

  /**
   * Get registrations with filtering, sorting, and pagination
   */
  async getRegistrations(options = {}) {
    try {
      const {
        studentId,
        instructorId,
        classId,
        status,
        registrationType,
        startDate,
        endDate,
        sortBy = 'registrationDate',
        sortOrder = 'desc',
      } = options;

      // Get all registration data using the standard dbClient pattern
      const allRegistrations = await this.dbClient.getAllRecords(Keys.REGISTRATIONS, x => {
        return Registration.fromDatabaseRow(x);
      });

      // Filter registrations based on criteria
      const filteredRegistrations = allRegistrations.filter(registration => {
        // Apply filters
        if (studentId && registration.studentId !== studentId) return false;
        if (instructorId && registration.instructorId !== instructorId) return false;
        if (classId && registration.classId !== classId) return false;
        if (status && registration.status !== status) return false;
        if (registrationType && registration.type !== registrationType) return false;

        // Date range filtering
        if (startDate || endDate) {
          const registrationDate = new Date(registration.registrationDate);
          if (startDate && registrationDate < new Date(startDate)) return false;
          if (endDate && registrationDate > new Date(endDate)) return false;
        }

        return true;
      });

      // Sort registrations
      filteredRegistrations.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];

        // Handle date sorting
        if (sortBy === 'registrationDate') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      return filteredRegistrations;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update registration status
   */
  async updateStatus(registrationId, newStatus) {
    try {
      const data = await this.dbClient.getRows('registrations');
      const rowIndex = data.findIndex(row => row[0] === registrationId);

      if (rowIndex === -1) {
        throw new Error(`Registration not found: ${registrationId}`);
      }

      // Update status in the row
      data[rowIndex][5] = newStatus;

      // Update in Google Sheets (row index + 2 for header and 0-based index)
      await this.dbClient.updateRow('registrations', rowIndex + 2, data[rowIndex]);

      return this._mapRowToRegistration(data[rowIndex]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete registration
   */
  async delete(registrationId) {
    try {
      const data = await this.dbClient.getRows('registrations');
      const rowIndex = data.findIndex(row => row[0] === registrationId);

      if (rowIndex === -1) {
        throw new Error(`Registration not found: ${registrationId}`);
      }

      await this.dbClient.deleteRow('registrations', rowIndex + 2);

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find registrations by instructor ID
   */
  async findByInstructorId(instructorId) {
    try {
      const data = await this.dbClient.getRows('registrations');
      const rows = data.filter(row => row[2] === instructorId);

      return rows.map(row => this._mapRowToRegistration(row));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find registrations by class ID
   */
  async findByClassId(classId) {
    try {
      const data = await this.dbClient.getRows('registrations');
      const rows = data.filter(row => row[3] === classId);

      return rows.map(row => this._mapRowToRegistration(row));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Map Google Sheets row to registration object
   */
  _mapRowToRegistration(row) {
    if (!row || row.length < 7) {
      throw new Error('Invalid registration row data');
    }

    return {
      id: row[0],
      studentId: row[1],
      instructorId: row[2],
      classId: row[3],
      type: row[4],
      status: row[5],
      registrationDate: new Date(row[6]),
      notes: row[7] || '',
      paymentStatus: row[8] || 'pending',
      metadata: row[9] ? JSON.parse(row[9]) : {},
    };
  }
}
