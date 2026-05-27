/**
 * Unit tests for AvailabilityService
 *
 * Tests server-side computation of available time slots for parent registration.
 * Covers: grade eligibility, conflict detection, slot generation, student-keyed
 * results, excludeRegistrationId exclusion, student conflict filtering, edge cases.
 */

import { AvailabilityService } from '../../../src/services/availabilityService.js';

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeInstructor(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inst-1',
    specialties: ['Piano'],
    availability: {
      monday: { isAvailable: true, startTime: '14:00', endTime: '16:00', roomId: 'R1' },
      tuesday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
      wednesday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
      thursday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
      friday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
    },
    gradeRange: null,
    ...overrides,
  };
}

function makeRegistration(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reg-1',
    instructorId: 'inst-1',
    day: 'Monday',
    startTime: '14:00',
    length: 30,
    ...overrides,
  };
}

function makeStudent(id: string, grade: number | string | null) {
  return { id, grade };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  beforeEach(() => {
    service = new AvailabilityService();
  });

  // =========================================================================
  // Grade eligibility
  // =========================================================================
  describe('isGradeEligible', () => {
    it('should return true when student grade is null', () => {
      expect(AvailabilityService.isGradeEligible({ minimum: 3, maximum: 8 }, null)).toBe(true);
    });

    it('should return true when gradeRange is null', () => {
      expect(AvailabilityService.isGradeEligible(null, 5)).toBe(true);
    });

    it('should return true when grade is within range', () => {
      expect(AvailabilityService.isGradeEligible({ minimum: 3, maximum: 8 }, 5)).toBe(true);
    });

    it('should return true at range boundaries', () => {
      expect(AvailabilityService.isGradeEligible({ minimum: 3, maximum: 8 }, 3)).toBe(true);
      expect(AvailabilityService.isGradeEligible({ minimum: 3, maximum: 8 }, 8)).toBe(true);
    });

    it('should return false when grade is below range', () => {
      expect(AvailabilityService.isGradeEligible({ minimum: 3, maximum: 8 }, 2)).toBe(false);
    });

    it('should return false when grade is above range', () => {
      expect(AvailabilityService.isGradeEligible({ minimum: 3, maximum: 8 }, 9)).toBe(false);
    });
  });

  // =========================================================================
  // computeAvailableTimeSlots — basic slot generation
  // =========================================================================
  describe('computeAvailableTimeSlots', () => {
    it('should generate slots for a simple instructor schedule', () => {
      const instructor = makeInstructor();
      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [makeStudent('s1', 5)],
        [30, 45, 60],
        null
      );

      expect(result['s1']).toBeDefined();
      expect(result['s1'].length).toBeGreaterThan(0);

      // All slots should reference inst-1
      expect(result['s1'].every(s => s.instructorId === 'inst-1')).toBe(true);
      // All should be Monday
      expect(result['s1'].every(s => s.day === 'monday')).toBe(true);
      expect(result['s1'].every(s => s.dayName === 'Monday')).toBe(true);
      // All should be Piano (instructor's only specialty)
      expect(result['s1'].every(s => s.instrument === 'Piano')).toBe(true);
    });

    it('should generate correct time format fields', () => {
      const instructor = makeInstructor();
      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [makeStudent('s1', 5)],
        [30],
        null
      );

      const slot = result['s1'][0];
      expect(slot.time).toBe('14:00');
      expect(slot.timeFormatted).toBe('2:00 PM');
      expect(slot.length).toBe(30);
    });

    it('should generate slots for each instrument x length combination', () => {
      const instructor = makeInstructor({
        specialties: ['Piano', 'Guitar'],
        availability: {
          monday: { isAvailable: true, startTime: '14:00', endTime: '14:15', roomId: 'R1' },
          tuesday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          wednesday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          thursday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          friday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
        },
      });

      // Use a 15-min window so only one time candidate exists (14:00)
      // But no lesson length fits in 15 minutes, so use a 30-min window instead
      const instructor2 = makeInstructor({
        specialties: ['Piano', 'Guitar'],
        availability: {
          monday: { isAvailable: true, startTime: '14:00', endTime: '14:30', roomId: 'R1' },
          tuesday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          wednesday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          thursday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          friday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
        },
      });

      const result = service.computeAvailableTimeSlots(
        [instructor2],
        [],
        [makeStudent('s1', 5)],
        [30],
        null
      );

      // 14:00 is the only time where 30-min fits (14:00+30=14:30). 14:15+30=14:45 > 14:30.
      // 1 time slot × 2 instruments = 2 slots
      expect(result['s1']).toHaveLength(2);
      const instruments = result['s1'].map(s => s.instrument).sort();
      expect(instruments).toEqual(['Guitar', 'Piano']);
    });

    it('should not generate slots that exceed schedule end time', () => {
      const instructor = makeInstructor({
        availability: {
          monday: { isAvailable: true, startTime: '17:00', endTime: '17:30', roomId: 'R1' },
          tuesday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          wednesday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          thursday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          friday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
        },
      });

      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [makeStudent('s1', 5)],
        [30, 45, 60],
        null
      );

      // 17:00-17:30 window: 30-min fits at 17:00. 17:15+30=17:45 > 17:30.
      // 45 and 60 don't fit at any time.
      expect(result['s1']).toHaveLength(1);
      expect(result['s1'][0].length).toBe(30);
    });

    it('should skip days where instructor is not available', () => {
      const instructor = makeInstructor({
        availability: {
          monday: { isAvailable: false, startTime: '14:00', endTime: '18:00', roomId: 'R1' },
          tuesday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          wednesday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          thursday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          friday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
        },
      });

      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [makeStudent('s1', 5)],
        [30],
        null
      );

      expect(result['s1']).toHaveLength(0);
    });

    // =========================================================================
    // Conflict detection
    // =========================================================================
    it('should skip slots that conflict with existing registrations', () => {
      const instructor = makeInstructor();
      const registration = makeRegistration(); // 14:00-14:30 Monday, inst-1

      const result = service.computeAvailableTimeSlots(
        [instructor],
        [registration],
        [makeStudent('s1', 5)],
        [30],
        null
      );

      // 14:00 and 14:15 are blocked (base 15-min window overlaps 14:00-14:30 reg)
      // 14:30 onwards should be available
      const times = result['s1'].map(s => s.time);
      expect(times).not.toContain('14:00');
      expect(times).not.toContain('14:15');
      expect(times).toContain('14:30');
      expect(times).toContain('15:00');
      expect(times).toContain('15:30');
    });

    it('should skip longer slots that overlap with registrations', () => {
      const instructor = makeInstructor({
        availability: {
          monday: { isAvailable: true, startTime: '14:00', endTime: '16:00', roomId: 'R1' },
          tuesday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          wednesday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          thursday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          friday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
        },
      });
      // Registration at 15:00-15:30
      const registration = makeRegistration({ startTime: '15:00', length: 30 });

      const result = service.computeAvailableTimeSlots(
        [instructor],
        [registration],
        [makeStudent('s1', 5)],
        [60],
        null
      );

      // 60-min slots with 15-min stepping:
      // 14:00-15:00: no conflict → available
      // 14:15-15:15: overlaps 15:00-15:30 → blocked
      // 14:30-15:30: overlaps 15:00-15:30 → blocked
      // 14:45-15:45: overlaps 15:00-15:30 → blocked
      // 15:00: base 15-min conflicts → blocked
      // 15:15: base 15-min conflicts → blocked
      // 15:30-16:30: exceeds 16:00 end → doesn't fit
      const times = result['s1'].map(s => s.time);
      expect(times).toContain('14:00');
      expect(times).not.toContain('14:15');
      expect(times).not.toContain('14:30');
      expect(times).not.toContain('15:00');
    });

    it('should find slots at 15-minute boundaries after non-30-minute lessons', () => {
      const instructor = makeInstructor();
      // 45-min lesson at 14:00, ends at 14:45
      const registration = makeRegistration({ startTime: '14:00', length: 45 });

      const result = service.computeAvailableTimeSlots(
        [instructor],
        [registration],
        [makeStudent('s1', 5)],
        [30],
        null
      );

      const times = result['s1'].map(s => s.time);
      // 14:45 should be available (previously missed with 30-min stepping)
      expect(times).toContain('14:45');
      // These are all blocked by the 14:00-14:45 registration
      expect(times).not.toContain('14:00');
      expect(times).not.toContain('14:15');
      expect(times).not.toContain('14:30');
    });

    // =========================================================================
    // excludeRegistrationId
    // =========================================================================
    it('should exclude specified registration from conflict detection', () => {
      const instructor = makeInstructor();
      const registration = makeRegistration({ id: 'reg-to-exclude' }); // 14:00-14:30

      // Without exclusion: 14:00 is blocked
      const withoutExclusion = service.computeAvailableTimeSlots(
        [instructor],
        [registration],
        [makeStudent('s1', 5)],
        [30],
        null
      );
      expect(withoutExclusion['s1'].map(s => s.time)).not.toContain('14:00');

      // With exclusion: 14:00 is available
      const withExclusion = service.computeAvailableTimeSlots(
        [instructor],
        [registration],
        [makeStudent('s1', 5)],
        [30],
        'reg-to-exclude'
      );
      expect(withExclusion['s1'].map(s => s.time)).toContain('14:00');
    });

    // =========================================================================
    // Student-keyed results (formerly multi-grade keying)
    // =========================================================================
    it('should return separate slot arrays for different students by grade', () => {
      const instructor = makeInstructor({
        gradeRange: { minimum: 3, maximum: 6 },
      });

      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [makeStudent('s-grade3', 3), makeStudent('s-grade5', 5), makeStudent('s-grade9', 9)],
        [30],
        null
      );

      // Grade 3 and 5 are in range — should have slots
      expect(result['s-grade3'].length).toBeGreaterThan(0);
      expect(result['s-grade5'].length).toBeGreaterThan(0);
      // Grade 9 is out of range — no slots
      expect(result['s-grade9']).toHaveLength(0);
    });

    it('should handle null grade students (all instructors eligible)', () => {
      const instructor = makeInstructor({
        gradeRange: { minimum: 3, maximum: 6 },
      });

      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [makeStudent('s-null', null)],
        [30],
        null
      );

      expect(result['s-null']).toBeDefined();
      expect(result['s-null'].length).toBeGreaterThan(0);
    });

    it('should filter instructors by grade for each student', () => {
      const instructorLower = makeInstructor({
        id: 'inst-lower',
        gradeRange: { minimum: 1, maximum: 4 },
      });
      const instructorUpper = makeInstructor({
        id: 'inst-upper',
        gradeRange: { minimum: 5, maximum: 8 },
      });

      const result = service.computeAvailableTimeSlots(
        [instructorLower, instructorUpper],
        [],
        [makeStudent('s-grade3', 3), makeStudent('s-grade6', 6)],
        [30],
        null
      );

      // Grade 3 student: only inst-lower eligible
      expect(result['s-grade3'].every(s => s.instructorId === 'inst-lower')).toBe(true);
      // Grade 6 student: only inst-upper eligible
      expect(result['s-grade6'].every(s => s.instructorId === 'inst-upper')).toBe(true);
    });

    // =========================================================================
    // Student conflict filtering
    // =========================================================================
    it('should filter out slots where the student has an existing registration', () => {
      const instructor = makeInstructor(); // Monday 14:00-16:00
      // Student s1 already has a registration Monday 14:00-14:30 with a different instructor
      const existingReg = makeRegistration({
        id: 'existing-1',
        studentId: 's1',
        instructorId: 'inst-other',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
      });

      const result = service.computeAvailableTimeSlots(
        [instructor],
        [existingReg],
        [makeStudent('s1', 5), makeStudent('s2', 5)],
        [30],
        null
      );

      // s1 should NOT have 14:00 or 14:15 (student conflict)
      expect(result['s1'].map(s => s.time)).not.toContain('14:00');
      expect(result['s1'].map(s => s.time)).not.toContain('14:15');
      // s2 should still have 14:00 (no student conflict — different instructor, no instructor conflict)
      expect(result['s2'].map(s => s.time)).toContain('14:00');
    });

    it('should share grade computation across same-grade students', () => {
      const instructor = makeInstructor();
      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [makeStudent('s1', 5), makeStudent('s2', 5)],
        [30],
        null
      );

      // Both students get their own key
      expect(Object.keys(result).sort()).toEqual(['s1', 's2']);
      // With no student-specific conflicts, slots should be identical
      expect(result['s1']).toEqual(result['s2']);
    });

    // =========================================================================
    // Edge cases
    // =========================================================================
    it('should return empty arrays when no instructors provided', () => {
      const result = service.computeAvailableTimeSlots([], [], [makeStudent('s1', 5)], [30], null);
      expect(result['s1']).toEqual([]);
    });

    it('should return empty arrays when no lesson lengths provided', () => {
      const instructor = makeInstructor();
      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [makeStudent('s1', 5)],
        [],
        null
      );
      expect(result['s1']).toEqual([]);
    });

    it('should throw when instructor has no specialties', () => {
      const instructor = makeInstructor({ specialties: null });
      expect(() =>
        service.computeAvailableTimeSlots([instructor], [], [makeStudent('s1', 5)], [30], null)
      ).toThrow(/no specialties/);
    });

    it('should throw when instructor has empty specialties array', () => {
      const instructor = makeInstructor({ specialties: [] });
      expect(() =>
        service.computeAvailableTimeSlots([instructor], [], [makeStudent('s1', 5)], [30], null)
      ).toThrow(/no specialties/);
    });

    it('should handle multiple days of availability', () => {
      const instructor = makeInstructor({
        availability: {
          monday: { isAvailable: true, startTime: '14:00', endTime: '14:30', roomId: 'R1' },
          tuesday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          wednesday: { isAvailable: true, startTime: '15:00', endTime: '15:30', roomId: 'R2' },
          thursday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
          friday: { isAvailable: false, startTime: '', endTime: '', roomId: '' },
        },
      });

      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [makeStudent('s1', 5)],
        [30],
        null
      );

      const days = [...new Set(result['s1'].map(s => s.day))].sort();
      expect(days).toEqual(['monday', 'wednesday']);
    });

    it('should handle registrations for different instructors without cross-contamination', () => {
      const inst1 = makeInstructor({ id: 'inst-1' });
      const inst2 = makeInstructor({ id: 'inst-2' });

      // Registration blocks inst-1 at 14:00, but not inst-2
      const reg = makeRegistration({ instructorId: 'inst-1', day: 'Monday', startTime: '14:00' });

      const result = service.computeAvailableTimeSlots(
        [inst1, inst2],
        [reg],
        [makeStudent('s1', 5)],
        [30],
        null
      );

      const inst1Slots = result['s1'].filter(s => s.instructorId === 'inst-1');
      const inst2Slots = result['s1'].filter(s => s.instructorId === 'inst-2');

      // inst-1 should not have 14:00
      expect(inst1Slots.map(s => s.time)).not.toContain('14:00');
      // inst-2 should have 14:00
      expect(inst2Slots.map(s => s.time)).toContain('14:00');
    });
  });
});
