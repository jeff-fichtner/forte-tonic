/**
 * Unit tests for AvailabilityService
 *
 * Tests server-side computation of available time slots for parent registration.
 * Covers: grade eligibility, conflict detection, slot generation, multi-grade
 * keying, excludeRegistrationId exclusion, edge cases.
 */

import { AvailabilityService } from '../../../src/services/availabilityService.js';
import type { AvailableTimeSlot } from '../../../src/models/shared/availableTimeSlot.js';

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
      expect(AvailabilityService.isGradeEligible({ minimum: '3', maximum: '8' }, null)).toBe(true);
    });

    it('should return true when gradeRange is null', () => {
      expect(AvailabilityService.isGradeEligible(null, 5)).toBe(true);
    });

    it('should return true when grade is within range', () => {
      expect(AvailabilityService.isGradeEligible({ minimum: '3', maximum: '8' }, 5)).toBe(true);
    });

    it('should return true at range boundaries', () => {
      expect(AvailabilityService.isGradeEligible({ minimum: '3', maximum: '8' }, 3)).toBe(true);
      expect(AvailabilityService.isGradeEligible({ minimum: '3', maximum: '8' }, 8)).toBe(true);
    });

    it('should return false when grade is below range', () => {
      expect(AvailabilityService.isGradeEligible({ minimum: '3', maximum: '8' }, 2)).toBe(false);
    });

    it('should return false when grade is above range', () => {
      expect(AvailabilityService.isGradeEligible({ minimum: '3', maximum: '8' }, 9)).toBe(false);
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
        [5],
        [30, 45, 60],
        null
      );

      expect(result['5']).toBeDefined();
      expect(result['5'].length).toBeGreaterThan(0);

      // All slots should reference inst-1
      expect(result['5'].every(s => s.instructorId === 'inst-1')).toBe(true);
      // All should be Monday
      expect(result['5'].every(s => s.day === 'monday')).toBe(true);
      expect(result['5'].every(s => s.dayName === 'Monday')).toBe(true);
      // All should be Piano (instructor's only specialty)
      expect(result['5'].every(s => s.instrument === 'Piano')).toBe(true);
    });

    it('should generate correct time format fields', () => {
      const instructor = makeInstructor();
      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [5],
        [30],
        null
      );

      const slot = result['5'][0];
      expect(slot.time).toBe('14:00');
      expect(slot.timeFormatted).toBe('2:00 PM');
      expect(slot.length).toBe(30);
    });

    it('should generate slots for each instrument x length combination', () => {
      const instructor = makeInstructor({
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
        [instructor],
        [],
        [5],
        [30],
        null
      );

      // One 30-min slot × 2 instruments = 2 slots
      expect(result['5']).toHaveLength(2);
      const instruments = result['5'].map(s => s.instrument).sort();
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
        [5],
        [30, 45, 60],
        null
      );

      // Only 30 fits in a 30-min window. 45 and 60 exceed the end time.
      expect(result['5']).toHaveLength(1);
      expect(result['5'][0].length).toBe(30);
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
        [5],
        [30],
        null
      );

      expect(result['5']).toHaveLength(0);
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
        [5],
        [30],
        null
      );

      // 14:00 slot is taken, only 14:30 and 15:00 and 15:30 should be available
      const times = result['5'].map(s => s.time);
      expect(times).not.toContain('14:00');
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
        [5],
        [60],
        null
      );

      // 60-min slots: 14:00-15:00 is ok, 14:30-15:30 conflicts with 15:00 reg,
      // 15:00 base slot conflicts, 15:30 doesn't fit (15:30+60=16:30 > 16:00)
      const times = result['5'].map(s => s.time);
      expect(times).toContain('14:00');
      expect(times).not.toContain('14:30'); // 14:30+60=15:30 overlaps 15:00-15:30
      expect(times).not.toContain('15:00'); // base slot conflict
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
        [5],
        [30],
        null
      );
      expect(withoutExclusion['5'].map(s => s.time)).not.toContain('14:00');

      // With exclusion: 14:00 is available
      const withExclusion = service.computeAvailableTimeSlots(
        [instructor],
        [registration],
        [5],
        [30],
        'reg-to-exclude'
      );
      expect(withExclusion['5'].map(s => s.time)).toContain('14:00');
    });

    // =========================================================================
    // Multi-grade keying
    // =========================================================================
    it('should return separate slot arrays for different grades', () => {
      const instructor = makeInstructor({
        gradeRange: { minimum: '3', maximum: '6' },
      });

      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [3, 5, 9],
        [30],
        null
      );

      // Grade 3 and 5 are in range — should have slots
      expect(result['3'].length).toBeGreaterThan(0);
      expect(result['5'].length).toBeGreaterThan(0);
      // Grade 9 is out of range — no slots
      expect(result['9']).toHaveLength(0);
    });

    it('should use "null" key for null grades', () => {
      const instructor = makeInstructor({
        gradeRange: { minimum: '3', maximum: '6' },
      });

      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [null],
        [30],
        null
      );

      // Null grade = all instructors eligible
      expect(result['null']).toBeDefined();
      expect(result['null'].length).toBeGreaterThan(0);
    });

    it('should filter instructors by grade for each grade key', () => {
      const instructorLower = makeInstructor({
        id: 'inst-lower',
        gradeRange: { minimum: '1', maximum: '4' },
      });
      const instructorUpper = makeInstructor({
        id: 'inst-upper',
        gradeRange: { minimum: '5', maximum: '8' },
      });

      const result = service.computeAvailableTimeSlots(
        [instructorLower, instructorUpper],
        [],
        [3, 6],
        [30],
        null
      );

      // Grade 3: only inst-lower eligible
      expect(result['3'].every(s => s.instructorId === 'inst-lower')).toBe(true);
      // Grade 6: only inst-upper eligible
      expect(result['6'].every(s => s.instructorId === 'inst-upper')).toBe(true);
    });

    // =========================================================================
    // Edge cases
    // =========================================================================
    it('should return empty arrays when no instructors provided', () => {
      const result = service.computeAvailableTimeSlots([], [], [5], [30], null);
      expect(result['5']).toEqual([]);
    });

    it('should return empty arrays when no lesson lengths provided', () => {
      const instructor = makeInstructor();
      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [5],
        [],
        null
      );
      expect(result['5']).toEqual([]);
    });

    it('should handle instructor with no specialties (defaults to Piano)', () => {
      const instructor = makeInstructor({ specialties: null });
      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [5],
        [30],
        null
      );

      expect(result['5'].every(s => s.instrument === 'Piano')).toBe(true);
    });

    it('should handle instructor with empty specialties array (defaults to Piano)', () => {
      const instructor = makeInstructor({ specialties: [] });
      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [5],
        [30],
        null
      );

      expect(result['5'].every(s => s.instrument === 'Piano')).toBe(true);
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
        [5],
        [30],
        null
      );

      const days = [...new Set(result['5'].map(s => s.day))].sort();
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
        [5],
        [30],
        null
      );

      const inst1Slots = result['5'].filter(s => s.instructorId === 'inst-1');
      const inst2Slots = result['5'].filter(s => s.instructorId === 'inst-2');

      // inst-1 should not have 14:00
      expect(inst1Slots.map(s => s.time)).not.toContain('14:00');
      // inst-2 should have 14:00
      expect(inst2Slots.map(s => s.time)).toContain('14:00');
    });

    it('should deduplicate grades', () => {
      const instructor = makeInstructor();
      const result = service.computeAvailableTimeSlots(
        [instructor],
        [],
        [5, 5, 5],
        [30],
        null
      );

      // Should only have one key for grade 5
      expect(Object.keys(result)).toEqual(['5']);
    });
  });
});
