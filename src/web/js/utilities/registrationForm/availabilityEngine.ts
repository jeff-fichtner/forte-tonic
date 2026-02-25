/**
 * Availability Engine - Pure functions for instructor availability calculation
 *
 * Extracted from parentRegistrationForm.ts (Step 2b of 009-frontend-decomposition).
 * All functions are pure: they accept data as parameters and return results
 * without DOM access or side effects.
 */

import { parseTime, formatTimeFromMinutes, formatDisplayTime } from './timeHelpers.js';
import { getRegistrationConfig } from './registrationConfig.js';
import type {
  InstructorLike,
  DaySchedule,
  RegistrationLike,
  TimeSlot,
} from '../../types/registrationTypes.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const SLOT_STEP_MINUTES = 30;
const getStandardLengths = (): number[] => getRegistrationConfig().lessonLengths;

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/**
 * Check if an instructor is available on a specific day.
 *
 * Validates that the day schedule exists, is marked available, has a start
 * time, has a valid end time, and that start is before end.
 */
export function isInstructorAvailableOnDay(
  _instructor: InstructorLike,
  _day: string,
  daySchedule: DaySchedule | undefined,
): boolean {
  if (!daySchedule) return false;
  if (!daySchedule.isAvailable) return false;
  if (!daySchedule.startTime) return false;

  const endTime = daySchedule.endTime || '17:00';
  if (!endTime) return false;

  const startMinutes = parseTime(daySchedule.startTime);
  const endMinutes = parseTime(endTime);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return false;
  }

  return true;
}

/**
 * Check if an instructor can teach a student of the given grade.
 *
 * Returns true when no grade constraint exists on either side, or when the
 * student grade falls within the instructor's configured range.
 */
export function isInstructorGradeEligible(
  instructor: InstructorLike,
  studentGrade: number | null,
): boolean {
  if (studentGrade === null || studentGrade === undefined) return true;

  const minGrade = instructor.gradeRange?.minimum;
  const maxGrade = instructor.gradeRange?.maximum;

  if (
    minGrade === null ||
    minGrade === undefined ||
    maxGrade === null ||
    maxGrade === undefined
  ) {
    return true;
  }

  const gradeNum = Number(studentGrade);
  const minNum = Number(minGrade);
  const maxNum = Number(maxGrade);

  return gradeNum >= minNum && gradeNum <= maxNum;
}

/**
 * Get the proper day name format for registration comparison.
 * Capitalizes the first letter (e.g. "monday" -> "Monday").
 */
export function getRegistrationDayName(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/**
 * Filter registrations, excluding the one being modified (if any).
 */
export function getFilteredRegistrationsForConflictCheck(
  registrations: RegistrationLike[],
  selectedPreviousRegistrationId: string | null,
): RegistrationLike[] {
  if (!selectedPreviousRegistrationId) return registrations;
  return registrations.filter(reg => reg.id !== selectedPreviousRegistrationId);
}

/**
 * Check if a time slot conflicts with existing registrations.
 *
 * Filters out the registration being modified (via selectedPreviousRegistrationId)
 * before checking for overlap.
 */
export function checkTimeSlotConflict(
  slotStartMinutes: number,
  slotLengthMinutes: number,
  existingRegistrations: RegistrationLike[],
  selectedPreviousRegistrationId: string | null,
): boolean {
  const slotEndMinutes = slotStartMinutes + slotLengthMinutes;

  const filteredRegistrations = getFilteredRegistrationsForConflictCheck(
    existingRegistrations,
    selectedPreviousRegistrationId,
  );

  return filteredRegistrations.some((reg: RegistrationLike) => {
    const regStartMinutes = parseTime(reg.startTime || '');
    if (regStartMinutes === null) return false;

    const regEndMinutes = regStartMinutes + (reg.length || 30);

    // Overlap: slot starts before registration ends AND slot ends after registration starts
    return slotStartMinutes < regEndMinutes && slotEndMinutes > regStartMinutes;
  });
}

/**
 * Calculate available 30-minute slots for a day considering existing registrations.
 */
export function calculateAvailableSlotsForDay(
  startMinutes: number,
  endMinutes: number,
  existingRegistrations: RegistrationLike[],
  selectedPreviousRegistrationId: string | null,
): number {
  let availableSlots = 0;

  for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += SLOT_STEP_MINUTES) {
    const hasConflict = checkTimeSlotConflict(
      currentMinutes,
      SLOT_STEP_MINUTES,
      existingRegistrations,
      selectedPreviousRegistrationId,
    );
    if (!hasConflict) {
      availableSlots++;
    }
  }

  return availableSlots;
}

// ---------------------------------------------------------------------------
// Time slot generation
// ---------------------------------------------------------------------------

/**
 * Generate available time slots for a specific instructor.
 *
 * Produces a TimeSlot array covering every valid instrument x day x time x
 * length combination for the instructor, after filtering out conflicts with
 * existing registrations. Results are capped at 15 entries (matching the
 * pre-extraction behaviour).
 */
export function generateInstructorTimeSlots(
  instructor: InstructorLike,
  registrations: RegistrationLike[],
  nextTrimesterRegistrations: RegistrationLike[],
  selectedPreviousRegistrationId: string | null,
  isEnrollmentPeriod: boolean,
): TimeSlot[] {
  const timeSlots: TimeSlot[] = [];

  ALL_DAYS.forEach((day, index) => {
    const daySchedule = (instructor.availability?.[day] || instructor[day]) as DaySchedule | undefined;

    // Instructor must be available with valid start/end times
    if (!daySchedule || !daySchedule.isAvailable) return;
    if (!daySchedule.startTime || !daySchedule.endTime) return;

    const startMinutes = parseTime(daySchedule.startTime);
    const endMinutes = parseTime(daySchedule.endTime);

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return;

    // Determine instruments this instructor teaches
    const instructorInstruments =
      instructor.specialties ||
      (instructor.primaryInstrument ? [instructor.primaryInstrument] : ['Piano']);

    const normalizedInstruments = Array.isArray(instructorInstruments)
      ? instructorInstruments
      : [instructorInstruments].filter(Boolean);

    const instruments = normalizedInstruments.length > 0 ? normalizedInstruments : ['Piano'];

    // Select registration set based on enrollment period
    const registrationsToCheck = isEnrollmentPeriod
      ? nextTrimesterRegistrations || []
      : registrations;

    const existingRegistrations = registrationsToCheck.filter((reg: RegistrationLike) => {
      return reg.instructorId === instructor.id && reg.day === getRegistrationDayName(day);
    });

    // Generate potential time slots (every 30 minutes from start to end)
    for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += SLOT_STEP_MINUTES) {
      const currentTimeStr = formatTimeFromMinutes(currentMinutes);

      // Skip if base 30-min slot has a conflict
      const hasConflict = checkTimeSlotConflict(
        currentMinutes,
        SLOT_STEP_MINUTES,
        existingRegistrations,
        selectedPreviousRegistrationId,
      );
      if (hasConflict) continue;

      // Generate slots for each instrument x length combination
      instruments.forEach(instrument => {
        getStandardLengths().forEach(length => {
          if (currentMinutes + length > endMinutes) return;

          const lengthConflict = checkTimeSlotConflict(
            currentMinutes,
            length,
            existingRegistrations,
            selectedPreviousRegistrationId,
          );
          if (lengthConflict) return;

          timeSlots.push({
            day,
            dayName: DAY_NAMES[index],
            time: currentTimeStr,
            timeFormatted: formatDisplayTime(currentTimeStr),
            length,
            instrument: instrument.trim(),
            instructor,
            instructorId: instructor.id,
          });
        });
      });
    }
  });

  return timeSlots.slice(0, 15);
}

// ---------------------------------------------------------------------------
// Consolidated cascading availability
// ---------------------------------------------------------------------------

/** Return type for cascading availability counts */
export interface AvailabilityCounts {
  [key: string]: number;
}

/**
 * Get the normalized list of instruments an instructor teaches.
 */
function getInstructorInstruments(instructor: InstructorLike): string[] {
  const raw =
    instructor.specialties ||
    (instructor.primaryInstrument ? [instructor.primaryInstrument] : []);

  const normalized = Array.isArray(raw) ? raw : [raw].filter(Boolean);
  return normalized.filter((s: string) => s && s.trim()) as string[];
}

/**
 * Filter an instructor list by instrument match.
 */
function filterByInstrument(
  instructors: InstructorLike[],
  instrument: string | undefined,
): InstructorLike[] {
  if (!instrument || instrument === 'all') return instructors;

  return instructors.filter((inst: InstructorLike) => {
    const instruments = getInstructorInstruments(inst);
    return instruments.some(
      (i: string) => i && i.toLowerCase().includes(instrument.toLowerCase()),
    );
  });
}

/**
 * Calculate cascading availability counts grouped by a single dimension.
 *
 * This consolidates the four near-identical methods that previously existed
 * as `#calculateCascadingDayAvailability`, `#calculateCascadingLengthAvailability`,
 * `#calculateCascadingInstructorAvailability`, and
 * `#calculateFilteredInstrumentAvailability`.
 *
 * The `dimension` parameter controls what the returned map is keyed by:
 * - `'instrument'` - keys are instrument names, values are total available slot counts
 * - `'day'`        - keys are lowercase day names, values are total available slot counts
 * - `'length'`     - keys are lesson lengths as strings (e.g. "30"), values are counts
 * - `'instructor'` - keys are instructor IDs, values are total available slot counts
 *
 * The `filters` object provides upstream cascading selections. Only filters
 * that are upstream of the requested dimension are applied:
 * - instrument: no upstream filters
 * - day: instrument filter applied
 * - length: instrument + day filters applied
 * - instructor: instrument + day + length filters applied
 */
export function calculateCascadingAvailability(
  dimension: 'instrument' | 'day' | 'length' | 'instructor',
  instructors: InstructorLike[],
  registrations: RegistrationLike[],
  nextTrimesterRegistrations: RegistrationLike[],
  studentGrade: number | null,
  selectedPreviousRegistrationId: string | null,
  isEnrollmentPeriod: boolean,
  filters: { instrument?: string; day?: string; length?: number },
): Map<string, { available: number; total: number }> {
  const result = new Map<string, { available: number; total: number }>();

  // --- Step 1: Grade-filter all instructors ---
  let filtered = instructors.filter(inst => isInstructorGradeEligible(inst, studentGrade));

  // --- Step 2: Apply upstream cascading filters based on dimension ---
  // Cascade order: instrument -> day -> length -> instructor
  // Each dimension only applies filters upstream of itself.
  if (dimension !== 'instrument') {
    filtered = filterByInstrument(filtered, filters.instrument);
  }

  // For the 'instrument' dimension, an explicit instructor filter can be applied
  // (used by `#calculateFilteredInstrumentAvailability` which accepted selectedInstructor)
  // In the consolidated API, pass a specific instructor ID via filters if needed.

  const daysToCheck: string[] =
    dimension !== 'instrument' && dimension !== 'day' && filters.day && filters.day !== 'all'
      ? [filters.day]
      : [...ALL_DAYS];

  const lengthsToCheck: number[] =
    dimension !== 'instrument' && dimension !== 'day' && dimension !== 'length' &&
    filters.length && filters.length !== 0
      ? [filters.length]
      : getStandardLengths();

  // Select the appropriate registration set
  const registrationsToCheck = isEnrollmentPeriod
    ? nextTrimesterRegistrations || []
    : registrations;

  // --- Step 3: Initialize result keys based on dimension ---
  if (dimension === 'day') {
    ALL_DAYS.forEach(d => result.set(d, { available: 0, total: 0 }));
  } else if (dimension === 'length') {
    getStandardLengths().forEach(l => result.set(String(l), { available: 0, total: 0 }));
  } else if (dimension === 'instructor') {
    filtered.forEach(inst => result.set(inst.id, { available: 0, total: 0 }));
  }
  // For 'instrument', keys are discovered dynamically below.

  // --- Step 4: Iterate instructors x days, count slots ---
  filtered.forEach((instructor: InstructorLike) => {
    const instructorInstruments = getInstructorInstruments(instructor);

    daysToCheck.forEach(day => {
      const daySchedule = (instructor.availability?.[day] || instructor[day]) as DaySchedule | undefined;
      if (!daySchedule || !isInstructorAvailableOnDay(instructor, day, daySchedule)) return;

      const startTime = daySchedule.startTime || '';
      const endTime = daySchedule.endTime || '17:00';

      const startMinutes = parseTime(startTime);
      const endMinutes = parseTime(endTime);
      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return;

      // Get existing registrations for this instructor on this day
      const existingRegistrations = registrationsToCheck.filter((reg: RegistrationLike) => {
        return reg.instructorId === instructor.id && reg.day === getRegistrationDayName(day);
      });

      // Count slots per 30-min increment x lesson length
      lengthsToCheck.forEach(length => {
        for (
          let currentMinutes = startMinutes;
          currentMinutes < endMinutes;
          currentMinutes += SLOT_STEP_MINUTES
        ) {
          if (currentMinutes + length > endMinutes) continue;

          const total = 1;
          const hasConflict = checkTimeSlotConflict(
            currentMinutes,
            length,
            existingRegistrations,
            selectedPreviousRegistrationId,
          );
          const available = hasConflict ? 0 : 1;

          // Determine the aggregation key(s) for this slot
          const keys = getDimensionKeys(dimension, day, length, instructor, instructorInstruments);

          keys.forEach(key => {
            const existing = result.get(key);
            if (existing) {
              existing.available += available;
              existing.total += total;
            } else {
              result.set(key, { available, total });
            }
          });
        }
      });
    });
  });

  return result;
}

/**
 * Determine the aggregation key(s) for a slot based on the requested dimension.
 */
function getDimensionKeys(
  dimension: 'instrument' | 'day' | 'length' | 'instructor',
  day: string,
  length: number,
  instructor: InstructorLike,
  instructorInstruments: string[],
): string[] {
  switch (dimension) {
    case 'instrument':
      // Each instrument the instructor teaches gets a count for this slot
      return instructorInstruments.length > 0
        ? instructorInstruments.map(i => i.trim())
        : [];
    case 'day':
      return [day];
    case 'length':
      return [String(length)];
    case 'instructor':
      return [instructor.id];
  }
}
