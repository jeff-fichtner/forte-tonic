/**
 * Shared registration entity type definitions
 *
 * These interfaces are the single source of truth for registration-related
 * entity shapes used by both the parent and admin registration forms,
 * their sub-components, and supporting utilities.
 */

/** Day schedule entry for instructor availability */
export interface DaySchedule {
  isAvailable?: boolean;
  startTime?: string;
  endTime?: string;
  [key: string]: unknown;
}

/** Instructor shape used by registration forms */
export interface InstructorLike {
  id: string;
  firstName: string | null;
  lastName: string | null;
  specialties?: string[];
  primaryInstrument?: string;
  gradeRange?: { minimum?: number; maximum?: number };
  availability?: Record<string, DaySchedule>;
  [key: string]: unknown;
}

/** Student shape used by registration forms */
export interface StudentLike {
  id: string;
  firstName?: string;
  lastName?: string;
  grade?: number | string | null;
  getFullName?: () => string;
  [key: string]: unknown;
}

/** Class shape used by registration forms */
export interface ClassLike {
  id: string;
  day?: string;
  startTime?: string;
  length?: number;
  title?: string;
  instrument?: string;
  instructorId?: string;
  formattedName?: string;
  minimumGrade?: number;
  maximumGrade?: number;
  size?: number;
  isRestricted?: boolean;
  [key: string]: unknown;
}

/** Registration record shape */
export interface RegistrationLike {
  id: string;
  studentId?: string;
  instructorId?: string;
  classId?: string;
  classTitle?: string;
  day?: string;
  startTime?: string;
  length?: number;
  instrument?: string;
  registrationType?: string;
  transportationType?: string;
  linkedPreviousRegistrationId?: string;
  [key: string]: unknown;
}

/** Registration data built for submission */
export interface RegistrationSubmitData {
  studentId: string;
  registrationType: string;
  transportationType?: string;
  instructorId?: string;
  instrument?: string;
  day?: string;
  startTime?: string;
  length?: number;
  trimester?: string;
  replaceRegistrationId?: string;
  classId?: string;
  classTitle?: string;
  [key: string]: unknown;
}

/** Time slot for instructor availability grid */
export interface TimeSlot {
  instructor?: InstructorLike;
  instructorId: string;
  day: string;
  dayName?: string;
  time: string;
  timeFormatted?: string;
  length: number;
  instrument: string;
}
