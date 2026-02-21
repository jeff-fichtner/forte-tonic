/**
 * AttendanceRecord model - unified for both backend and frontend use
 */
export class AttendanceRecord {
  /**
   * Creates an AttendanceRecord instance
   * @param {object} data - AttendanceRecord data object
   */
  constructor(data) {
    this.registrationId = data.registrationId;
    this.createdAt = data.createdAt;
    this.createdBy = data.createdBy;
  }
}
