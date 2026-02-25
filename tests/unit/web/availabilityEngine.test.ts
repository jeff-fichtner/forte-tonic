/**
 * Availability Engine Unit Tests
 * ===============================
 *
 * Tests for the pure availability calculation functions extracted from
 * parentRegistrationForm.ts (009-frontend-decomposition, Step 2b).
 *
 * All functions under test are pure: they accept data and return results
 * with no DOM access or side effects.
 *
 * Dependencies (timeHelpers, registrationFormConstants) are mocked so
 * the engine logic is tested in isolation.
 */

import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

jest.unstable_mockModule(
  '../../../src/web/js/utilities/registrationForm/timeHelpers.js',
  () => ({
    parseTime: jest.fn((timeStr: string): number | null => {
      if (!timeStr) return null;
      // Minimal re-implementation for deterministic test control
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        const [time, period] = timeStr.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        let h = hours;
        if (period === 'PM' && hours !== 12) h += 12;
        else if (period === 'AM' && hours === 12) h = 0;
        return h * 60 + (minutes || 0);
      }
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (isNaN(hours)) return null;
      return hours * 60 + (minutes || 0);
    }),
    formatTimeFromMinutes: jest.fn((minutes: number): string => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }),
    formatDisplayTime: jest.fn((time24: string): string => {
      const [hours, minutes] = time24.split(':');
      const hour12 = parseInt(hours) % 12 || 12;
      const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${ampm}`;
    }),
  }),
);

jest.unstable_mockModule(
  '../../../src/web/js/constants/registrationFormConstants.js',
  () => ({
    LessonLengths: [
      { value: 30, label: '30 minutes' },
      { value: 45, label: '45 minutes' },
      { value: 60, label: '60 minutes' },
    ],
  }),
);

// ---------------------------------------------------------------------------
// Dynamic import — required after jest.unstable_mockModule with ESM
// ---------------------------------------------------------------------------

const {
  isInstructorAvailableOnDay,
  isInstructorGradeEligible,
  getRegistrationDayName,
  getFilteredRegistrationsForConflictCheck,
  checkTimeSlotConflict,
  calculateAvailableSlotsForDay,
  generateInstructorTimeSlots,
  calculateCascadingAvailability,
} = await import(
  '../../../src/web/js/utilities/registrationForm/availabilityEngine.js'
);

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

import type {
  InstructorLike,
  RegistrationLike,
  DaySchedule,
} from '../../../src/web/js/types/registrationTypes.js';

function makeDaySchedule(overrides: Partial<DaySchedule> = {}): DaySchedule {
  return {
    isAvailable: true,
    startTime: '09:00',
    endTime: '12:00',
    ...overrides,
  };
}

function makeInstructor(overrides: Partial<InstructorLike> = {}): InstructorLike {
  return {
    id: 'inst-1',
    firstName: 'Jane',
    lastName: 'Doe',
    specialties: ['Piano'],
    availability: {
      monday: makeDaySchedule(),
    },
    ...overrides,
  };
}

function makeRegistration(overrides: Partial<RegistrationLike> = {}): RegistrationLike {
  return {
    id: 'reg-1',
    instructorId: 'inst-1',
    day: 'Monday',
    startTime: '09:00',
    length: 30,
    ...overrides,
  };
}

// ===========================================================================
// Tests
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. isInstructorAvailableOnDay
// ---------------------------------------------------------------------------
describe('isInstructorAvailableOnDay', () => {
  const instructor = makeInstructor();

  test('returns false when daySchedule is undefined', () => {
    expect(isInstructorAvailableOnDay(instructor, 'monday', undefined)).toBe(false);
  });

  test('returns false when isAvailable is false', () => {
    const schedule = makeDaySchedule({ isAvailable: false });
    expect(isInstructorAvailableOnDay(instructor, 'monday', schedule)).toBe(false);
  });

  test('returns false when startTime is missing', () => {
    const schedule = makeDaySchedule({ startTime: undefined });
    expect(isInstructorAvailableOnDay(instructor, 'monday', schedule)).toBe(false);
  });

  test('returns true for a valid schedule with start before end', () => {
    const schedule = makeDaySchedule({ startTime: '09:00', endTime: '12:00' });
    expect(isInstructorAvailableOnDay(instructor, 'monday', schedule)).toBe(true);
  });

  test('returns false when end time equals start time', () => {
    const schedule = makeDaySchedule({ startTime: '09:00', endTime: '09:00' });
    expect(isInstructorAvailableOnDay(instructor, 'monday', schedule)).toBe(false);
  });

  test('returns false when end time is before start time', () => {
    const schedule = makeDaySchedule({ startTime: '14:00', endTime: '09:00' });
    expect(isInstructorAvailableOnDay(instructor, 'monday', schedule)).toBe(false);
  });

  test('defaults to 17:00 when endTime is not provided', () => {
    // startTime 09:00 (540) < default 17:00 (1020) => true
    const schedule = makeDaySchedule({ startTime: '09:00', endTime: undefined });
    expect(isInstructorAvailableOnDay(instructor, 'monday', schedule)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. isInstructorGradeEligible
// ---------------------------------------------------------------------------
describe('isInstructorGradeEligible', () => {
  test('returns true when studentGrade is null', () => {
    const instructor = makeInstructor({ gradeRange: { minimum: 3, maximum: 8 } });
    expect(isInstructorGradeEligible(instructor, null)).toBe(true);
  });

  test('returns true when instructor has no gradeRange', () => {
    const instructor = makeInstructor({ gradeRange: undefined });
    expect(isInstructorGradeEligible(instructor, 5)).toBe(true);
  });

  test('returns true when gradeRange minimum/maximum are undefined', () => {
    const instructor = makeInstructor({ gradeRange: {} });
    expect(isInstructorGradeEligible(instructor, 5)).toBe(true);
  });

  test('returns true when student grade is within range', () => {
    const instructor = makeInstructor({ gradeRange: { minimum: 3, maximum: 8 } });
    expect(isInstructorGradeEligible(instructor, 5)).toBe(true);
  });

  test('returns true when student grade equals the minimum', () => {
    const instructor = makeInstructor({ gradeRange: { minimum: 3, maximum: 8 } });
    expect(isInstructorGradeEligible(instructor, 3)).toBe(true);
  });

  test('returns true when student grade equals the maximum', () => {
    const instructor = makeInstructor({ gradeRange: { minimum: 3, maximum: 8 } });
    expect(isInstructorGradeEligible(instructor, 8)).toBe(true);
  });

  test('returns false when student grade is below range', () => {
    const instructor = makeInstructor({ gradeRange: { minimum: 3, maximum: 8 } });
    expect(isInstructorGradeEligible(instructor, 1)).toBe(false);
  });

  test('returns false when student grade is above range', () => {
    const instructor = makeInstructor({ gradeRange: { minimum: 3, maximum: 8 } });
    expect(isInstructorGradeEligible(instructor, 10)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. getRegistrationDayName
// ---------------------------------------------------------------------------
describe('getRegistrationDayName', () => {
  test('capitalizes the first letter of a lowercase day', () => {
    expect(getRegistrationDayName('monday')).toBe('Monday');
  });

  test('keeps an already-capitalized day unchanged', () => {
    expect(getRegistrationDayName('Friday')).toBe('Friday');
  });

  test('handles single-character strings', () => {
    expect(getRegistrationDayName('t')).toBe('T');
  });
});

// ---------------------------------------------------------------------------
// 4. getFilteredRegistrationsForConflictCheck
// ---------------------------------------------------------------------------
describe('getFilteredRegistrationsForConflictCheck', () => {
  const regs: RegistrationLike[] = [
    makeRegistration({ id: 'reg-1' }),
    makeRegistration({ id: 'reg-2' }),
    makeRegistration({ id: 'reg-3' }),
  ];

  test('returns all registrations when selectedPreviousRegistrationId is null', () => {
    const result = getFilteredRegistrationsForConflictCheck(regs, null);
    expect(result).toHaveLength(3);
    expect(result).toEqual(regs);
  });

  test('returns all registrations when selectedPreviousRegistrationId is empty string', () => {
    const result = getFilteredRegistrationsForConflictCheck(regs, '');
    expect(result).toHaveLength(3);
  });

  test('filters out the registration matching the given ID', () => {
    const result = getFilteredRegistrationsForConflictCheck(regs, 'reg-2');
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual(['reg-1', 'reg-3']);
  });

  test('returns all registrations when the ID does not match any', () => {
    const result = getFilteredRegistrationsForConflictCheck(regs, 'non-existent');
    expect(result).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 5. checkTimeSlotConflict
// ---------------------------------------------------------------------------
describe('checkTimeSlotConflict', () => {
  test('returns false when there are no existing registrations', () => {
    expect(checkTimeSlotConflict(540, 30, [], null)).toBe(false);
  });

  test('returns true when a slot overlaps an existing registration', () => {
    // Slot: 09:00-09:30 (540-570), Reg: 09:00-09:30 (540-570)
    const regs = [makeRegistration({ startTime: '09:00', length: 30 })];
    expect(checkTimeSlotConflict(540, 30, regs, null)).toBe(true);
  });

  test('returns true for partial overlap', () => {
    // Slot: 09:00-09:45 (540-585), Reg: 09:30-10:00 (570-600)
    const regs = [makeRegistration({ startTime: '09:30', length: 30 })];
    expect(checkTimeSlotConflict(540, 45, regs, null)).toBe(true);
  });

  test('returns false when slots are adjacent with no overlap', () => {
    // Slot: 09:00-09:30 (540-570), Reg: 09:30-10:00 (570-600)
    const regs = [makeRegistration({ startTime: '09:30', length: 30 })];
    expect(checkTimeSlotConflict(540, 30, regs, null)).toBe(false);
  });

  test('returns false when slot is completely before the registration', () => {
    // Slot: 08:00-08:30 (480-510), Reg: 09:00-09:30 (540-570)
    const regs = [makeRegistration({ startTime: '09:00', length: 30 })];
    expect(checkTimeSlotConflict(480, 30, regs, null)).toBe(false);
  });

  test('returns false when slot is completely after the registration', () => {
    // Slot: 10:00-10:30 (600-630), Reg: 09:00-09:30 (540-570)
    const regs = [makeRegistration({ startTime: '09:00', length: 30 })];
    expect(checkTimeSlotConflict(600, 30, regs, null)).toBe(false);
  });

  test('excludes the previous registration from conflict checks', () => {
    // Slot overlaps reg-1, but reg-1 is the previous registration being modified
    const regs = [makeRegistration({ id: 'reg-1', startTime: '09:00', length: 30 })];
    expect(checkTimeSlotConflict(540, 30, regs, 'reg-1')).toBe(false);
  });

  test('still detects conflict with other registrations when one is excluded', () => {
    const regs = [
      makeRegistration({ id: 'reg-1', startTime: '09:00', length: 30 }),
      makeRegistration({ id: 'reg-2', startTime: '09:00', length: 30 }),
    ];
    // Exclude reg-1, but reg-2 still conflicts
    expect(checkTimeSlotConflict(540, 30, regs, 'reg-1')).toBe(true);
  });

  test('handles registration with no startTime gracefully', () => {
    const regs = [makeRegistration({ startTime: undefined })];
    expect(checkTimeSlotConflict(540, 30, regs, null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. calculateAvailableSlotsForDay
// ---------------------------------------------------------------------------
describe('calculateAvailableSlotsForDay', () => {
  test('returns all slots when there are no existing registrations', () => {
    // 09:00 (540) to 12:00 (720) = 6 x 30-min slots
    const result = calculateAvailableSlotsForDay(540, 720, [], null);
    expect(result).toBe(6);
  });

  test('subtracts slots blocked by an existing registration', () => {
    // 09:00-12:00, registration at 09:00-09:30 blocks 1 slot
    const regs = [makeRegistration({ startTime: '09:00', length: 30 })];
    const result = calculateAvailableSlotsForDay(540, 720, regs, null);
    expect(result).toBe(5);
  });

  test('handles multiple blocking registrations', () => {
    // 09:00-12:00 = 6 slots, 2 registrations block 2 slots
    const regs = [
      makeRegistration({ startTime: '09:00', length: 30 }),
      makeRegistration({ startTime: '10:00', length: 30 }),
    ];
    const result = calculateAvailableSlotsForDay(540, 720, regs, null);
    expect(result).toBe(4);
  });

  test('excludes the previous registration from blocking', () => {
    const regs = [makeRegistration({ id: 'reg-1', startTime: '09:00', length: 30 })];
    const result = calculateAvailableSlotsForDay(540, 720, regs, 'reg-1');
    // reg-1 is excluded, so all 6 slots are available
    expect(result).toBe(6);
  });

  test('returns 0 when start equals end', () => {
    const result = calculateAvailableSlotsForDay(540, 540, [], null);
    expect(result).toBe(0);
  });

  test('handles a single 30-min window', () => {
    // 09:00-09:30 = 1 slot
    const result = calculateAvailableSlotsForDay(540, 570, [], null);
    expect(result).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 7. generateInstructorTimeSlots
// ---------------------------------------------------------------------------
describe('generateInstructorTimeSlots', () => {
  test('generates slots for an available instructor with no conflicts', () => {
    const instructor = makeInstructor({
      id: 'inst-1',
      specialties: ['Piano'],
      availability: {
        monday: makeDaySchedule({ startTime: '09:00', endTime: '12:00' }),
      },
    });

    const slots = generateInstructorTimeSlots(instructor, [], [], null, false);

    expect(slots.length).toBeGreaterThan(0);
    // All slots should be for monday/Monday
    slots.forEach(slot => {
      expect(slot.day).toBe('monday');
      expect(slot.dayName).toBe('Monday');
      expect(slot.instructorId).toBe('inst-1');
      expect(slot.instrument).toBe('Piano');
    });
  });

  test('returns empty array when instructor is unavailable', () => {
    const instructor = makeInstructor({
      availability: {
        monday: makeDaySchedule({ isAvailable: false }),
      },
    });

    const slots = generateInstructorTimeSlots(instructor, [], [], null, false);
    expect(slots).toHaveLength(0);
  });

  test('returns empty array when schedule has no startTime', () => {
    const instructor = makeInstructor({
      availability: {
        monday: makeDaySchedule({ startTime: undefined }),
      },
    });

    const slots = generateInstructorTimeSlots(instructor, [], [], null, false);
    expect(slots).toHaveLength(0);
  });

  test('returns empty array when schedule has no endTime', () => {
    const instructor = makeInstructor({
      availability: {
        monday: makeDaySchedule({ endTime: undefined }),
      },
    });

    const slots = generateInstructorTimeSlots(instructor, [], [], null, false);
    expect(slots).toHaveLength(0);
  });

  test('skips conflicting time slots', () => {
    const instructor = makeInstructor({
      id: 'inst-1',
      specialties: ['Piano'],
      availability: {
        monday: makeDaySchedule({ startTime: '09:00', endTime: '10:00' }),
      },
    });

    // Registration at 09:00 blocks the first 30-min slot
    const regs: RegistrationLike[] = [
      makeRegistration({ instructorId: 'inst-1', day: 'Monday', startTime: '09:00', length: 30 }),
    ];

    const slots = generateInstructorTimeSlots(instructor, regs, [], null, false);

    // The 09:00 slot is blocked; only 09:30 slot remains (if length fits)
    const slotTimes = slots.map(s => s.time);
    expect(slotTimes).not.toContain('09:00');
  });

  test('caps results at 15 entries', () => {
    // Instructor available all 5 days with wide time windows = many possible slots
    const availability: Record<string, DaySchedule> = {};
    for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
      availability[day] = makeDaySchedule({ startTime: '09:00', endTime: '17:00' });
    }

    const instructor = makeInstructor({
      specialties: ['Piano', 'Guitar'],
      availability,
    });

    const slots = generateInstructorTimeSlots(instructor, [], [], null, false);
    expect(slots.length).toBeLessThanOrEqual(15);
  });

  test('generates slots for multiple instruments', () => {
    const instructor = makeInstructor({
      specialties: ['Piano', 'Guitar'],
      availability: {
        monday: makeDaySchedule({ startTime: '09:00', endTime: '10:00' }),
      },
    });

    const slots = generateInstructorTimeSlots(instructor, [], [], null, false);

    const instruments = new Set(slots.map(s => s.instrument));
    expect(instruments.has('Piano')).toBe(true);
    expect(instruments.has('Guitar')).toBe(true);
  });

  test('generates slots for multiple lesson lengths', () => {
    const instructor = makeInstructor({
      specialties: ['Piano'],
      availability: {
        monday: makeDaySchedule({ startTime: '09:00', endTime: '11:00' }),
      },
    });

    const slots = generateInstructorTimeSlots(instructor, [], [], null, false);

    const lengths = new Set(slots.map(s => s.length));
    expect(lengths.has(30)).toBe(true);
    expect(lengths.has(45)).toBe(true);
    expect(lengths.has(60)).toBe(true);
  });

  test('uses nextTrimesterRegistrations during enrollment period', () => {
    const instructor = makeInstructor({
      id: 'inst-1',
      specialties: ['Piano'],
      availability: {
        monday: makeDaySchedule({ startTime: '09:00', endTime: '10:00' }),
      },
    });

    // Current registrations have a conflict, but next trimester does not
    const currentRegs: RegistrationLike[] = [
      makeRegistration({ instructorId: 'inst-1', day: 'Monday', startTime: '09:00', length: 60 }),
    ];
    const nextRegs: RegistrationLike[] = [];

    // isEnrollmentPeriod = true => should use nextRegs (empty), so slots are available
    const slots = generateInstructorTimeSlots(instructor, currentRegs, nextRegs, null, true);
    expect(slots.length).toBeGreaterThan(0);
  });

  test('defaults to Piano when instructor has no specialties or primaryInstrument', () => {
    const instructor = makeInstructor({
      specialties: undefined,
      primaryInstrument: undefined,
      availability: {
        monday: makeDaySchedule({ startTime: '09:00', endTime: '10:00' }),
      },
    });

    const slots = generateInstructorTimeSlots(instructor, [], [], null, false);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].instrument).toBe('Piano');
  });

  test('does not generate slots that extend past the end time', () => {
    const instructor = makeInstructor({
      specialties: ['Piano'],
      availability: {
        // Only 30 minutes of availability: 09:00-09:30
        monday: makeDaySchedule({ startTime: '09:00', endTime: '09:30' }),
      },
    });

    const slots = generateInstructorTimeSlots(instructor, [], [], null, false);

    // Only 30-min length should fit; 45 and 60 should not
    const lengths = slots.map(s => s.length);
    expect(lengths).toContain(30);
    expect(lengths).not.toContain(45);
    expect(lengths).not.toContain(60);
  });
});

// ---------------------------------------------------------------------------
// 8. calculateCascadingAvailability
// ---------------------------------------------------------------------------
describe('calculateCascadingAvailability', () => {
  const baseInstructor = makeInstructor({
    id: 'inst-1',
    specialties: ['Piano', 'Guitar'],
    availability: {
      monday: makeDaySchedule({ startTime: '09:00', endTime: '12:00' }),
      wednesday: makeDaySchedule({ startTime: '10:00', endTime: '11:00' }),
    },
  });

  // -------------------------------------------------------------------------
  // dimension = 'instrument'
  // -------------------------------------------------------------------------
  describe('dimension=instrument', () => {
    test('returns a map keyed by instrument names', () => {
      const result = calculateCascadingAvailability(
        'instrument',
        [baseInstructor],
        [], [], null, null, false,
        {},
      );

      expect(result.has('Piano')).toBe(true);
      expect(result.has('Guitar')).toBe(true);

      const piano = result.get('Piano')!;
      expect(piano.available).toBeGreaterThan(0);
      expect(piano.total).toBeGreaterThan(0);
    });

    test('does not apply instrument filter when dimension is instrument', () => {
      // Even if filters.instrument is set, it should be ignored for the instrument dimension
      const result = calculateCascadingAvailability(
        'instrument',
        [baseInstructor],
        [], [], null, null, false,
        { instrument: 'Piano' },
      );

      // Both instruments should still appear because instrument filter is upstream
      expect(result.has('Piano')).toBe(true);
      expect(result.has('Guitar')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // dimension = 'day'
  // -------------------------------------------------------------------------
  describe('dimension=day', () => {
    test('returns a map pre-initialized for all 5 weekdays', () => {
      const result = calculateCascadingAvailability(
        'day',
        [baseInstructor],
        [], [], null, null, false,
        {},
      );

      expect(result.size).toBe(5);
      expect(result.has('monday')).toBe(true);
      expect(result.has('tuesday')).toBe(true);
      expect(result.has('wednesday')).toBe(true);
      expect(result.has('thursday')).toBe(true);
      expect(result.has('friday')).toBe(true);
    });

    test('has positive availability on scheduled days and zero on unscheduled days', () => {
      const result = calculateCascadingAvailability(
        'day',
        [baseInstructor],
        [], [], null, null, false,
        {},
      );

      expect(result.get('monday')!.available).toBeGreaterThan(0);
      expect(result.get('wednesday')!.available).toBeGreaterThan(0);
      // Instructor has no tuesday/thursday/friday availability
      expect(result.get('tuesday')!.available).toBe(0);
      expect(result.get('thursday')!.available).toBe(0);
      expect(result.get('friday')!.available).toBe(0);
    });

    test('applies instrument filter for the day dimension', () => {
      // Two instructors: one teaches Piano (monday), one teaches Drums (tuesday)
      const pianoInstructor = makeInstructor({
        id: 'inst-piano',
        specialties: ['Piano'],
        availability: { monday: makeDaySchedule({ startTime: '09:00', endTime: '10:00' }) },
      });
      const drumsInstructor = makeInstructor({
        id: 'inst-drums',
        specialties: ['Drums'],
        availability: { tuesday: makeDaySchedule({ startTime: '09:00', endTime: '10:00' }) },
      });

      const result = calculateCascadingAvailability(
        'day',
        [pianoInstructor, drumsInstructor],
        [], [], null, null, false,
        { instrument: 'Piano' },
      );

      expect(result.get('monday')!.available).toBeGreaterThan(0);
      // Drums instructor is filtered out
      expect(result.get('tuesday')!.available).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // dimension = 'length'
  // -------------------------------------------------------------------------
  describe('dimension=length', () => {
    test('returns a map keyed by "30", "45", "60"', () => {
      const result = calculateCascadingAvailability(
        'length',
        [baseInstructor],
        [], [], null, null, false,
        {},
      );

      expect(result.has('30')).toBe(true);
      expect(result.has('45')).toBe(true);
      expect(result.has('60')).toBe(true);
    });

    test('all standard lengths have positive availability for a wide schedule', () => {
      const result = calculateCascadingAvailability(
        'length',
        [baseInstructor],
        [], [], null, null, false,
        {},
      );

      expect(result.get('30')!.available).toBeGreaterThan(0);
      expect(result.get('45')!.available).toBeGreaterThan(0);
      expect(result.get('60')!.available).toBeGreaterThan(0);
    });

    test('applies instrument and day filters upstream', () => {
      const result = calculateCascadingAvailability(
        'length',
        [baseInstructor],
        [], [], null, null, false,
        { instrument: 'Piano', day: 'monday' },
      );

      // Only monday Piano slots counted
      expect(result.get('30')!.available).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // dimension = 'instructor'
  // -------------------------------------------------------------------------
  describe('dimension=instructor', () => {
    test('returns a map keyed by instructor IDs', () => {
      const inst2 = makeInstructor({
        id: 'inst-2',
        specialties: ['Violin'],
        availability: {
          tuesday: makeDaySchedule({ startTime: '14:00', endTime: '16:00' }),
        },
      });

      const result = calculateCascadingAvailability(
        'instructor',
        [baseInstructor, inst2],
        [], [], null, null, false,
        {},
      );

      expect(result.has('inst-1')).toBe(true);
      expect(result.has('inst-2')).toBe(true);
      expect(result.get('inst-1')!.available).toBeGreaterThan(0);
      expect(result.get('inst-2')!.available).toBeGreaterThan(0);
    });

    test('applies all upstream filters (instrument, day, length)', () => {
      const result = calculateCascadingAvailability(
        'instructor',
        [baseInstructor],
        [], [], null, null, false,
        { instrument: 'Piano', day: 'monday', length: 30 },
      );

      expect(result.has('inst-1')).toBe(true);
      expect(result.get('inst-1')!.available).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  describe('edge cases', () => {
    test('empty instructor array returns zero availability across all dimensions', () => {
      const instrumentResult = calculateCascadingAvailability(
        'instrument', [], [], [], null, null, false, {},
      );
      expect(instrumentResult.size).toBe(0);

      const dayResult = calculateCascadingAvailability(
        'day', [], [], [], null, null, false, {},
      );
      expect(dayResult.size).toBe(5); // Pre-initialized for all 5 days
      dayResult.forEach(val => {
        expect(val.available).toBe(0);
        expect(val.total).toBe(0);
      });

      const lengthResult = calculateCascadingAvailability(
        'length', [], [], [], null, null, false, {},
      );
      expect(lengthResult.size).toBe(3); // "30", "45", "60"
      lengthResult.forEach(val => {
        expect(val.available).toBe(0);
        expect(val.total).toBe(0);
      });

      const instructorResult = calculateCascadingAvailability(
        'instructor', [], [], [], null, null, false, {},
      );
      expect(instructorResult.size).toBe(0);
    });

    test('filters out instructors that fail grade eligibility', () => {
      const instructor = makeInstructor({
        id: 'inst-1',
        gradeRange: { minimum: 5, maximum: 8 },
        specialties: ['Piano'],
        availability: {
          monday: makeDaySchedule({ startTime: '09:00', endTime: '12:00' }),
        },
      });

      // Student grade 2 is below instructor range 5-8
      const result = calculateCascadingAvailability(
        'instrument',
        [instructor],
        [], [], 2, null, false,
        {},
      );

      expect(result.size).toBe(0);
    });

    test('existing registrations reduce available counts', () => {
      const instructor = makeInstructor({
        id: 'inst-1',
        specialties: ['Piano'],
        availability: {
          monday: makeDaySchedule({ startTime: '09:00', endTime: '10:00' }),
        },
      });

      const regs: RegistrationLike[] = [
        makeRegistration({
          instructorId: 'inst-1',
          day: 'Monday',
          startTime: '09:00',
          length: 30,
        }),
      ];

      const withoutRegs = calculateCascadingAvailability(
        'day', [instructor], [], [], null, null, false, {},
      );
      const withRegs = calculateCascadingAvailability(
        'day', [instructor], regs, [], null, null, false, {},
      );

      expect(withRegs.get('monday')!.available).toBeLessThan(
        withoutRegs.get('monday')!.available,
      );
    });

    test('uses nextTrimesterRegistrations when isEnrollmentPeriod is true', () => {
      const instructor = makeInstructor({
        id: 'inst-1',
        specialties: ['Piano'],
        availability: {
          monday: makeDaySchedule({ startTime: '09:00', endTime: '10:00' }),
        },
      });

      const currentRegs: RegistrationLike[] = [
        makeRegistration({
          instructorId: 'inst-1',
          day: 'Monday',
          startTime: '09:00',
          length: 60,
        }),
      ];

      // During enrollment, current regs are ignored and next trimester (empty) is used
      const result = calculateCascadingAvailability(
        'day', [instructor], currentRegs, [], null, null, true, {},
      );

      expect(result.get('monday')!.available).toBeGreaterThan(0);
    });
  });
});
