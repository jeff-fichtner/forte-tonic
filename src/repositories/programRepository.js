import { RepositoryHelper } from './helpers/repositoryHelper.js';
import { Keys } from '../utils/values/keys.js';
import { Class, Registration } from '../models/shared/index.js';
import { AttendanceRecord } from '../models/shared/attendanceRecord.js';
import { ProgramManagementService } from '../services/programManagementService.js';

/**
 * Program Repository - handles program data operations
 * Business logic has been moved to ProgramManagementService
 */
export class ProgramRepository {
  /**
   *
   */
  constructor(dbClient) {
    this.dbClient = dbClient;
  }

  /**
   *
   */
  async getClasses(forceRefresh = false) {
    return await RepositoryHelper.getAndSetData(
      () => this.classes,
      async () =>
        (this.classes = await this.dbClient.getAllRecords(Keys.CLASSES, x =>
          Class.fromDatabaseRow(x)
        )),
      Keys.CLASSES,
      forceRefresh
    );
  }

  /**
   *
   */
  async getClassById(id) {
    const classes = await this.getClasses();
    return classes.find(x => x.id === id);
  }

  /**
   *
   */
  async getRegistrations(forceRefresh = false) {
    return await RepositoryHelper.getAndSetData(
      () => this.registrations,
      async () =>
        (this.registrations = await this.dbClient.getAllRecords(Keys.REGISTRATIONS, x => {
          const newRegistration = Registration.fromDatabaseRow(x);
          // Note: DateHelpers processing is now handled in the factory method
          return newRegistration;
        })),
      Keys.REGISTRATIONS,
      forceRefresh
    );
  }

  /**
   *
   */
  async getRegistrationById(id) {
    const registrations = await this.getRegistrations();
    return registrations.find(x => x.id === id);
  }

  /**
   *
   */
  async getAttendanceForRegistrations(registrationIds) {
    const records = await RepositoryHelper.getAndSetData(
      () => this.attendanceRecords,
      async () =>
        (this.attendanceRecords = await this.dbClient.getAllRecords(
          Keys.ATTENDANCE,
          x => new AttendanceRecord(...x)
        )),
      Keys.ATTENDANCE
    );

    return records.filter(x => registrationIds.includes(x.registrationId));
  }

  /**
   * Record attendance with business validation
   */
  async recordAttendance(registrationId, createdBy) {
    const existingAttendance = await this.getAttendanceForRegistrations([registrationId]);

    // Validate with domain service
    const validation = ProgramManagementService.validateAttendanceRecording(
      registrationId,
      existingAttendance
    );
    if (!validation.canRecord) {
      console.warn(`Cannot record attendance: ${validation.errors.join(', ')}`);
      return validation.existingRecord;
    }

    const result = await this.dbClient.appendRecord(
      Keys.ATTENDANCE,
      new AttendanceRecord(registrationId),
      createdBy
    );
    
    // Clear cache after mutation
    this.cache.clear(); // Clear all caches since we recorded attendance
    
    return result;
  }

  /**
   * Remove attendance with business validation
   */
  async removeAttendance(registrationId, deletedBy) {
    const existingAttendance = await this.getAttendanceForRegistrations([registrationId]);

    // Validate with domain service
    const validation = ProgramManagementService.validateAttendanceRemoval(
      registrationId,
      existingAttendance
    );
    if (!validation.canRemove) {
      console.warn(`Cannot remove attendance: ${validation.errors.join(', ')}`);
      return true; // Return true for consistency but log warning
    }

    await this.dbClient.deleteRecord(Keys.ATTENDANCE, registrationId, deletedBy);
    
    // Clear cache after mutation
    this.cache.clear(); // Clear all caches since we removed attendance
    
    return true;
  }
}
