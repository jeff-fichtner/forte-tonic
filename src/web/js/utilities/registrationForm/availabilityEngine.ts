/**
 * Availability Engine - Retained client-side utility functions
 *
 * Most availability computation has moved to the server-side AvailabilityService.
 * This file retains only the functions still needed by client-side components.
 */

import type { InstructorLike } from '../../types/registrationTypes.js';

/**
 * Check if an instructor can teach a student of the given grade.
 *
 * Returns true when no grade constraint exists on either side, or when the
 * student grade falls within the instructor's configured range.
 */
export function isInstructorGradeEligible(
  instructor: InstructorLike,
  studentGrade: number | null
): boolean {
  if (studentGrade === null || studentGrade === undefined) return true;
  if (!instructor.gradeRange) return true;

  return studentGrade >= instructor.gradeRange.minimum && studentGrade <= instructor.gradeRange.maximum;
}
