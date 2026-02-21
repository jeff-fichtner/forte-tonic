export const Keys = {
  ADMINS: 'admins',
  INSTRUCTORS: 'instructors',
  PARENTS: 'parents',
  STUDENTS: 'students',
  CLASSES: 'classes',
  ROOMS: 'rooms',
  REGISTRATIONS: 'registrations',
  REGISTRATIONSAUDIT: 'registrations_audit',
  ATTENDANCE: 'attendance',
  ATTENDANCEAUDIT: 'attendance_audit',
  PERIODS: 'periods',
} as const;

export type Key = (typeof Keys)[keyof typeof Keys];
