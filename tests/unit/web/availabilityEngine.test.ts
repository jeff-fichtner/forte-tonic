/**
 * Availability Engine Unit Tests
 * ===============================
 *
 * Tests for the retained client-side utility functions.
 * Most availability computation has moved to the server-side AvailabilityService
 * (tested in tests/unit/services/availabilityService.test.ts).
 */

import type { InstructorLike } from '../../../src/web/js/types/registrationTypes.js';

const { isInstructorGradeEligible } = await import(
  '../../../src/web/js/utilities/registrationForm/availabilityEngine.js'
);

// ---------------------------------------------------------------------------
// Mock data factory
// ---------------------------------------------------------------------------

function makeInstructor(overrides: Partial<InstructorLike> = {}): InstructorLike {
  return {
    id: 'inst-1',
    firstName: 'Jane',
    lastName: 'Doe',
    specialties: ['Piano'],
    ...overrides,
  };
}

// ===========================================================================
// Tests
// ===========================================================================

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
