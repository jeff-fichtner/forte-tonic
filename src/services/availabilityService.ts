/**
 * Availability Service
 *
 * Computes available time slots for private lesson registration.
 * Stateless — operates on in-memory arrays passed by the controller.
 * Ports the algorithm from client-side availabilityEngine.ts to the server.
 */

import type { AvailableTimeSlot } from '../models/shared/availableTimeSlot.js';
import type {
  DayAvailability,
  InstructorAvailability,
  GradeRange,
} from '../models/shared/instructor.js';
import { RegistrationService } from './registrationService.js';
import { ALL_DAYS, DAY_NAMES } from '../utils/values/days.js';
const SLOT_STEP_MINUTES = 30;

// ---------------------------------------------------------------------------
// Input types — accept the shapes the controller already has
// ---------------------------------------------------------------------------

/** Minimal instructor shape needed for availability computation */
export interface InstructorInput {
  id: string;
  specialties?: string[] | null;
  availability?: InstructorAvailability | null;
  gradeRange?: GradeRange | null;
}

/** Minimal registration shape needed for conflict detection */
export interface RegistrationInput {
  id?: string;
  instructorId?: string;
  day?: string;
  startTime?: string;
  length?: number | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AvailabilityService {
  /**
   * Compute all valid time slots, keyed by student grade.
   *
   * @param instructors - All active instructors
   * @param registrations - Registrations for the target trimester
   * @param studentGrades - Unique grades of the parent's children
   * @param lessonLengths - Valid lesson lengths (e.g. [30, 45, 60])
   * @param excludeRegistrationId - Registration to exclude from conflicts (modify flow)
   * @returns Record keyed by String(grade), each value an array of conflict-free slots
   */
  computeAvailableTimeSlots(
    instructors: InstructorInput[],
    registrations: RegistrationInput[],
    studentGrades: (number | string | null)[],
    lessonLengths: number[],
    excludeRegistrationId: string | null
  ): Record<string, AvailableTimeSlot[]> {
    const result: Record<string, AvailableTimeSlot[]> = {};

    // Filter out the excluded registration once, up front
    const effectiveRegistrations = excludeRegistrationId
      ? registrations.filter(r => r.id !== excludeRegistrationId)
      : registrations;

    // Compute slots for each unique grade
    const uniqueGrades = [...new Set(studentGrades.map(g => String(g)))];

    for (const gradeKey of uniqueGrades) {
      const gradeNum = gradeKey === 'null' || gradeKey === 'undefined' ? null : Number(gradeKey);

      // Filter instructors by grade eligibility
      const eligible = instructors.filter(inst =>
        AvailabilityService.isGradeEligible(inst.gradeRange, gradeNum)
      );

      result[gradeKey] = this.#generateSlotsForInstructors(
        eligible,
        effectiveRegistrations,
        lessonLengths
      );
    }

    return result;
  }

  /**
   * Check if a student grade falls within an instructor's grade range.
   */
  static isGradeEligible(
    gradeRange: GradeRange | null | undefined,
    studentGrade: number | null
  ): boolean {
    if (studentGrade === null || studentGrade === undefined) return true;
    if (!gradeRange) return true;

    return studentGrade >= gradeRange.minimum && studentGrade <= gradeRange.maximum;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  #generateSlotsForInstructors(
    instructors: InstructorInput[],
    registrations: RegistrationInput[],
    lessonLengths: number[]
  ): AvailableTimeSlot[] {
    const slots: AvailableTimeSlot[] = [];

    for (const instructor of instructors) {
      const instruments = AvailabilityService.#getInstruments(instructor);

      ALL_DAYS.forEach((day, dayIndex) => {
        const schedule = (instructor.availability as Record<string, DayAvailability> | null)?.[day];
        if (!schedule?.isAvailable || !schedule.startTime || !schedule.endTime) return;

        const startMinutes = RegistrationService.timeToMinutes(schedule.startTime);
        const endMinutes = RegistrationService.timeToMinutes(schedule.endTime);
        if (endMinutes <= startMinutes) return;

        // Get existing registrations for this instructor on this day
        const dayName = DAY_NAMES[dayIndex];
        const dayRegistrations = registrations.filter(
          r => r.instructorId === instructor.id && r.day === dayName
        );

        // Walk 30-min slots from start to end
        for (let m = startMinutes; m < endMinutes; m += SLOT_STEP_MINUTES) {
          // Skip if base 30-min slot has a conflict
          if (AvailabilityService.#hasConflict(m, SLOT_STEP_MINUTES, dayRegistrations)) continue;

          for (const instrument of instruments) {
            for (const length of lessonLengths) {
              // Skip if slot + length exceeds schedule end
              if (m + length > endMinutes) continue;

              // Skip if full-length slot has a conflict
              if (
                length !== SLOT_STEP_MINUTES &&
                AvailabilityService.#hasConflict(m, length, dayRegistrations)
              ) {
                continue;
              }

              slots.push({
                instructorId: instructor.id,
                day: day as string,
                dayName,
                time: AvailabilityService.#formatTime(m),
                timeFormatted: AvailabilityService.#formatDisplayTime(m),
                length,
                instrument: instrument.trim(),
              });
            }
          }
        }
      });
    }

    return slots;
  }

  static #getInstruments(instructor: InstructorInput): string[] {
    const raw = instructor.specialties;
    if (!raw || !Array.isArray(raw) || raw.length === 0) return ['Piano'];
    const filtered = raw.filter(s => s && s.trim());
    return filtered.length > 0 ? filtered : ['Piano'];
  }

  static #hasConflict(
    slotStart: number,
    slotLength: number,
    registrations: RegistrationInput[]
  ): boolean {
    const slotEnd = slotStart + slotLength;
    return registrations.some(reg => {
      if (!reg.startTime) return false;
      const regStart = RegistrationService.timeToMinutes(reg.startTime);
      const regEnd = regStart + (reg.length || 30);
      return slotStart < regEnd && slotEnd > regStart;
    });
  }

  /** Format minutes to "HH:MM" */
  static #formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /** Format minutes to "H:MM AM/PM" */
  static #formatDisplayTime(minutes: number): string {
    const time24 = AvailabilityService.#formatTime(minutes);
    const [hours, mins] = time24.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${mins} ${ampm}`;
  }
}
