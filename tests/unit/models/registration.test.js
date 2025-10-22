import { jest } from '@jest/globals';
import { Registration } from '../../../src/models/shared/registration.js';

describe('Registration', () => {
  describe('updateIntent', () => {
    test('should update intent fields correctly', () => {
      // Arrange
      const registration = new Registration({
        id: '123e4567-e89b-42d3-8456-426614174000',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
        registrationType: 'private',
        roomId: 'room-1',
        instrument: 'Piano',
        transportationType: 'parent',
        notes: '',
        classId: null,
        classTitle: null,
        expectedStartDate: null,
        createdAt: new Date('2025-01-01'),
        createdBy: 'admin@test.com',
        reenrollmentIntent: null,
        intentSubmittedAt: null,
        intentSubmittedBy: null,
      });

      const beforeUpdate = new Date();

      // Act
      const result = registration.updateIntent('keep', 'parent@test.com');

      const afterUpdate = new Date();

      // Assert
      expect(result).toBe(registration); // Should return itself for chaining
      expect(registration.reenrollmentIntent).toBe('keep');
      expect(registration.intentSubmittedAt).toBeInstanceOf(Date);
      expect(registration.intentSubmittedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime()
      );
      expect(registration.intentSubmittedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
      expect(registration.intentSubmittedBy).toBe('parent@test.com');
    });

    test('should overwrite existing intent values', () => {
      // Arrange
      const registration = new Registration({
        id: '223e4567-e89b-42d3-8456-426614174000',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
        registrationType: 'private',
        roomId: 'room-1',
        instrument: 'Piano',
        transportationType: 'parent',
        notes: '',
        classId: null,
        classTitle: null,
        expectedStartDate: null,
        createdAt: new Date('2025-01-01'),
        createdBy: 'admin@test.com',
        reenrollmentIntent: 'keep',
        intentSubmittedAt: new Date('2025-01-15'),
        intentSubmittedBy: 'parent@test.com',
      });

      // Act
      registration.updateIntent('drop', 'parent2@test.com');

      // Assert
      expect(registration.reenrollmentIntent).toBe('drop');
      expect(registration.intentSubmittedBy).toBe('parent2@test.com');
      // intentSubmittedAt should be updated to a new timestamp
      expect(registration.intentSubmittedAt.getTime()).toBeGreaterThan(
        new Date('2025-01-15').getTime()
      );
    });

    test('should handle all valid intent types', () => {
      // Arrange
      const registration = new Registration({
        id: '323e4567-e89b-42d3-8456-426614174000',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        day: 'Monday',
        startTime: '14:00',
        length: 30,
        registrationType: 'private',
        roomId: 'room-1',
        instrument: 'Piano',
        transportationType: 'parent',
        notes: '',
        classId: null,
        classTitle: null,
        expectedStartDate: null,
        createdAt: new Date('2025-01-01'),
        createdBy: 'admin@test.com',
        reenrollmentIntent: null,
        intentSubmittedAt: null,
        intentSubmittedBy: null,
      });

      // Act & Assert - keep
      registration.updateIntent('keep', 'user@test.com');
      expect(registration.reenrollmentIntent).toBe('keep');

      // Act & Assert - drop
      registration.updateIntent('drop', 'user@test.com');
      expect(registration.reenrollmentIntent).toBe('drop');

      // Act & Assert - change
      registration.updateIntent('change', 'user@test.com');
      expect(registration.reenrollmentIntent).toBe('change');
    });
  });
});
