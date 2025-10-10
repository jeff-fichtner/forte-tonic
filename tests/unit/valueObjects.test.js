import { StudentId } from '../../src/utils/values/studentId.js';
import { InstructorId } from '../../src/utils/values/instructorId.js';

describe('Value Object ID Tests', () => {
  describe('StudentId', () => {
    test('should create valid StudentId with string value', () => {
      const studentId = new StudentId('12345');

      expect(studentId.value).toBe('12345');
      expect(studentId.toString()).toBe('12345');
    });

    test('should create valid StudentId with number value', () => {
      const studentId = new StudentId(67890);

      expect(studentId.value).toBe('67890');
      expect(studentId.toString()).toBe('67890');
    });

    test('should throw error for invalid values', () => {
      expect(() => new StudentId(null)).toThrow('Invalid student ID');
      expect(() => new StudentId(undefined)).toThrow('Invalid student ID');
      expect(() => new StudentId('')).toThrow('Invalid student ID');
      expect(() => new StudentId('   ')).toThrow('Invalid student ID');
    });

    test('should correctly compare with equals method', () => {
      const studentId1 = new StudentId('12345');
      const studentId2 = new StudentId('12345');
      const studentId3 = new StudentId('67890');

      expect(studentId1.equals(studentId2)).toBe(true);
      expect(studentId1.equals(studentId3)).toBe(false);
    });

    test('should convert to number when possible', () => {
      const studentId = new StudentId('12345');

      expect(studentId.toNumber()).toBe(12345);
    });

    test('should throw error when converting non-numeric string to number', () => {
      const studentId = new StudentId('abc123');

      expect(() => studentId.toNumber()).toThrow('cannot be converted to number');
    });

    test('should be immutable', () => {
      const studentId = new StudentId('12345');

      expect(() => {
        studentId.value = 'changed';
      }).toThrow();
    });
  });

  describe('InstructorId', () => {
    test('should create valid InstructorId with email format', () => {
      const instructorId = new InstructorId('TEACHER1@EMAIL.COM');

      expect(instructorId.value).toBe('TEACHER1@EMAIL.COM');
      expect(instructorId.toString()).toBe('TEACHER1@EMAIL.COM');
    });

    test('should create valid InstructorId with string value', () => {
      const instructorId = new InstructorId('instructor123');

      expect(instructorId.value).toBe('instructor123');
      expect(instructorId.toString()).toBe('instructor123');
    });

    test('should throw error for invalid values', () => {
      expect(() => new InstructorId(null)).toThrow('Invalid instructor ID');
      expect(() => new InstructorId(undefined)).toThrow('Invalid instructor ID');
      expect(() => new InstructorId('')).toThrow('Invalid instructor ID');
      expect(() => new InstructorId('   ')).toThrow('Invalid instructor ID');
    });

    test('should correctly compare with equals method', () => {
      const instructorId1 = new InstructorId('TEACHER1@EMAIL.COM');
      const instructorId2 = new InstructorId('TEACHER1@EMAIL.COM');
      const instructorId3 = new InstructorId('TEACHER2@EMAIL.COM');

      expect(instructorId1.equals(instructorId2)).toBe(true);
      expect(instructorId1.equals(instructorId3)).toBe(false);
    });

    test('should be immutable', () => {
      const instructorId = new InstructorId('TEACHER1@EMAIL.COM');

      expect(() => {
        instructorId.value = 'changed';
      }).toThrow();
    });
  });

  describe('Cross-type comparisons', () => {
    test('should not be equal when comparing different value object types', () => {
      const studentId = new StudentId('12345');
      const instructorId = new InstructorId('12345');

      expect(studentId.equals(instructorId)).toBe(false);
    });

    test('should demonstrate why direct comparison fails', () => {
      const studentId = new StudentId('12345');
      const instructorId = new InstructorId('TEACHER1@EMAIL.COM');

      // This is why the bug occurred - comparing objects to primitives
      expect(studentId === '12345').toBe(false);
      expect(instructorId === 'TEACHER1@EMAIL.COM').toBe(false);

      // This is the correct way
      expect(studentId.value === '12345').toBe(true);
      expect(instructorId.value === 'TEACHER1@EMAIL.COM').toBe(true);
    });
  });

  describe('Practical usage scenarios', () => {
    test('should work correctly in array find operations', () => {
      const students = [
        { id: '12345', name: 'John' },
        { id: '67890', name: 'Jane' },
      ];

      const registration = {
        studentId: new StudentId('12345'),
      };

      // Incorrect way (the bug)
      const foundStudentIncorrect = students.find(x => x.id === registration.studentId);
      expect(foundStudentIncorrect).toBeUndefined();

      // Correct way (the fix)
      const foundStudentCorrect = students.find(x => x.id === registration.studentId.value);
      expect(foundStudentCorrect).toBeDefined();
      expect(foundStudentCorrect.name).toBe('John');
    });

    test('should work correctly in array filter operations', () => {
      const registrations = [
        { id: 'reg1', studentId: new StudentId('12345') },
        { id: 'reg2', studentId: new StudentId('67890') },
        { id: 'reg3', studentId: new StudentId('12345') },
      ];

      const targetStudentId = '12345';

      // Incorrect way (the bug)
      const filteredIncorrect = registrations.filter(x => x.studentId === targetStudentId);
      expect(filteredIncorrect).toHaveLength(0);

      // Correct way (the fix)
      const filteredCorrect = registrations.filter(x => x.studentId.value === targetStudentId);
      expect(filteredCorrect).toHaveLength(2);
      expect(filteredCorrect[0].id).toBe('reg1');
      expect(filteredCorrect[1].id).toBe('reg3');
    });

    test('should work correctly in array some operations', () => {
      const registrations = [
        { instructorId: new InstructorId('TEACHER1@EMAIL.COM') },
        { instructorId: new InstructorId('TEACHER2@EMAIL.COM') },
      ];

      const targetInstructorId = 'TEACHER1@EMAIL.COM';

      // Incorrect way (the bug)
      const hasRegistrationsIncorrect = registrations.some(
        x => x.instructorId === targetInstructorId
      );
      expect(hasRegistrationsIncorrect).toBe(false);

      // Correct way (the fix)
      const hasRegistrationsCorrect = registrations.some(
        x => x.instructorId.value === targetInstructorId
      );
      expect(hasRegistrationsCorrect).toBe(true);
    });
  });
});
