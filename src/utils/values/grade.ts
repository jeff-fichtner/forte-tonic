/**
 * Grade boundaries for the program.
 *
 * The school serves Kindergarten (grade 0) through 8th grade. Students who
 * would be in 9th grade or higher next year have aged out and should be
 * excluded from summer-period enrollment views and from the spring → summer
 * turnover migration.
 *
 * These are NUMERIC bounds (inclusive). The stored `grade` field on Student
 * is a string ("0".."8"); callers compare via parseInt.
 */
export const MIN_GRADE = 0;
export const MAX_GRADE = 8;

/**
 * True when the given grade (numeric or numeric string) is within the
 * program's range. Non-numeric values return false — they aren't eligible.
 */
export function isInProgramGrade(grade: number | string): boolean {
  const n = typeof grade === 'number' ? grade : parseInt(grade, 10);
  if (Number.isNaN(n)) return false;
  return n >= MIN_GRADE && n <= MAX_GRADE;
}
