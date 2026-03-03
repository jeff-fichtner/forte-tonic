// Export all model classes for easy importing
export { Admin } from './admin.js';
export { AttendanceRecord } from './attendanceRecord.js';
export { AuthenticatedUserResponse } from './responses/authenticatedUserResponse.js';
export { AppConfigurationResponse } from './responses/appConfigurationResponse.js';
export { Class } from './class.js';
export { DropRequest } from './dropRequest.js';
export { Instructor } from './instructor.js';
export { Parent } from './parent.js';
export { Registration } from './registration.js';
export { Room } from './room.js';
export { Student } from './student.js';

// Export all enums for easy importing
export { Instruments } from './instruments.js';
export { LengthOptions } from './lengthOptions.js';

// Re-export interfaces for consumers
export type { AdminData, AdminJSON } from './admin.js';
export type { AttendanceRecordData, AttendanceRecordJSON } from './attendanceRecord.js';
export type { ClassData, ClassJSON } from './class.js';
export type { DropRequestData, DropRequestJSON } from './dropRequest.js';
export type {
  InstructorData,
  InstructorJSON,
  DayAvailability,
  InstructorAvailability,
  GradeRange,
} from './instructor.js';
export type { ParentData, ParentJSON } from './parent.js';
export type {
  RegistrationData,
  RegistrationJSON,
  RegistrationTypeValue,
  ReenrollmentIntent,
} from './registration.js';
export type { RoomData, RoomJSON } from './room.js';
export type { StudentData, StudentJSON } from './student.js';
export type {
  AppConfigurationResponseData,
  Period,
  DirectorInfo,
} from './responses/appConfigurationResponse.js';
export type {
  AuthenticatedUserResponseData,
  AuthenticatedUserResponseJSON,
} from './responses/authenticatedUserResponse.js';
export type { AvailableTimeSlot } from './availableTimeSlot.js';
