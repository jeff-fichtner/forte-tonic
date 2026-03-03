import { describe, expect, beforeEach, it, jest } from '@jest/globals';
import { EntityQueryService } from '../../src/services/entityQueryService.js';

describe('EntityQueryService', () => {
  let service: EntityQueryService;
  let mockUserRepository: Record<string, jest.Mock>;
  let mockProgramRepository: Record<string, jest.Mock>;
  let mockRegistrationRepository: Record<string, jest.Mock>;
  let mockConfigService: Record<string, unknown>;

  const mockStudents = [
    { id: 's1', parent1Id: 'p1', parent2Id: 'p2', firstName: 'Alice', lastName: 'A' },
    { id: 's2', parent1Id: 'p1', parent2Id: null, firstName: 'Bob', lastName: 'B' },
    { id: 's3', parent1Id: 'p3', parent2Id: null, firstName: 'Charlie', lastName: 'C' },
  ];

  const mockInstructors = [
    { id: 'i1', firstName: 'Instructor', lastName: 'One' },
    { id: 'i2', firstName: 'Instructor', lastName: 'Two' },
    { id: 'i3', firstName: 'Instructor', lastName: 'Three' },
  ];

  const mockRegistrations = [
    { id: 'r1', studentId: 's1', instructorId: 'i1', isWaitlistClass: false },
    { id: 'r2', studentId: 's2', instructorId: 'i2', isWaitlistClass: true },
    { id: 'r3', studentId: 's3', instructorId: 'i1', isWaitlistClass: false },
    { id: 'r4', studentId: 's1', instructorId: 'i3', isWaitlistClass: false },
  ];

  const mockClasses = [
    { id: 'c1', title: 'Rock Band' },
    { id: 'c2', title: 'Piano' },
  ];

  const mockAdmins = [{ id: 'a1', firstName: 'Admin', lastName: 'One' }];

  const mockRooms = [
    { id: 'rm1', name: 'Room A' },
    { id: 'rm2', name: 'Room B' },
  ];

  beforeEach(() => {
    mockUserRepository = {
      getStudents: jest.fn<() => Promise<typeof mockStudents>>().mockResolvedValue(mockStudents),
      getInstructors: jest
        .fn<() => Promise<typeof mockInstructors>>()
        .mockResolvedValue(mockInstructors),
      getAdmins: jest.fn<() => Promise<typeof mockAdmins>>().mockResolvedValue(mockAdmins),
      getRooms: jest.fn<() => Promise<typeof mockRooms>>().mockResolvedValue(mockRooms),
    };

    mockProgramRepository = {
      getClasses: jest.fn<() => Promise<typeof mockClasses>>().mockResolvedValue(mockClasses),
    };

    mockRegistrationRepository = {
      getRegistrationsForTrimester: jest
        .fn<() => Promise<typeof mockRegistrations>>()
        .mockResolvedValue(mockRegistrations),
    };

    mockConfigService = {
      getRockBandClassIds: jest.fn().mockReturnValue(['c1']),
    };

    service = new EntityQueryService(
      mockUserRepository as unknown as ConstructorParameters<typeof EntityQueryService>[0],
      mockProgramRepository as unknown as ConstructorParameters<typeof EntityQueryService>[1],
      mockRegistrationRepository as unknown as ConstructorParameters<typeof EntityQueryService>[2],
      mockConfigService as unknown as ConstructorParameters<typeof EntityQueryService>[3]
    );
  });

  describe('getStudents', () => {
    it('returns all students when no filters provided', async () => {
      const result = await service.getStudents();
      expect(result).toEqual(mockStudents);
      expect(mockUserRepository.getStudents).toHaveBeenCalledTimes(1);
    });

    it('returns all students when empty filters provided', async () => {
      const result = await service.getStudents({});
      expect(result).toEqual(mockStudents);
    });

    it('filters students by parentId matching parent1Id', async () => {
      const result = await service.getStudents({ parentId: 'p1' });
      expect(result).toHaveLength(2);
      expect(result.map(s => s.id)).toEqual(['s1', 's2']);
    });

    it('filters students by parentId matching parent2Id', async () => {
      const result = await service.getStudents({ parentId: 'p2' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('s1');
    });

    it('returns empty array when parentId matches no students', async () => {
      const result = await service.getStudents({ parentId: 'nonexistent' });
      expect(result).toHaveLength(0);
    });
  });

  describe('getInstructors', () => {
    it('returns all instructors when no filters provided', async () => {
      const result = await service.getInstructors();
      expect(result).toEqual(mockInstructors);
      expect(mockUserRepository.getInstructors).toHaveBeenCalledTimes(1);
    });

    it('returns all instructors when empty filters provided', async () => {
      const result = await service.getInstructors({});
      expect(result).toEqual(mockInstructors);
    });

    it('filters instructors by instructorIds', async () => {
      const result = await service.getInstructors({ instructorIds: ['i1', 'i3'] });
      expect(result).toHaveLength(2);
      expect(result.map(i => i.id)).toEqual(['i1', 'i3']);
    });

    it('returns empty array when instructorIds match none', async () => {
      const result = await service.getInstructors({ instructorIds: ['nonexistent'] });
      expect(result).toHaveLength(0);
    });

    it('handles empty instructorIds array', async () => {
      const result = await service.getInstructors({ instructorIds: [] });
      expect(result).toHaveLength(0);
    });
  });

  describe('getRegistrations', () => {
    it('fetches registrations by trimester', async () => {
      const result = await service.getRegistrations({ trimester: 'fall' });
      expect(mockRegistrationRepository.getRegistrationsForTrimester).toHaveBeenCalledWith('fall');
      expect(result).toEqual(mockRegistrations);
    });

    it('filters registrations by studentIds', async () => {
      const result = await service.getRegistrations({ trimester: 'fall', studentIds: ['s1'] });
      expect(result).toHaveLength(2);
      expect(result.every(r => r.studentId === 's1')).toBe(true);
    });

    it('filters registrations by instructorId', async () => {
      const result = await service.getRegistrations({ trimester: 'fall', instructorId: 'i1' });
      expect(result).toHaveLength(2);
      expect(result.every(r => r.instructorId === 'i1')).toBe(true);
    });

    it('excludes waitlist registrations when excludeWaitlist is true', async () => {
      const result = await service.getRegistrations({ trimester: 'fall', excludeWaitlist: true });
      expect(result).toHaveLength(3);
      expect(result.every(r => !r.isWaitlistClass)).toBe(true);
    });

    it('includes waitlist registrations when excludeWaitlist is false', async () => {
      const result = await service.getRegistrations({ trimester: 'fall', excludeWaitlist: false });
      expect(result).toEqual(mockRegistrations);
    });

    it('combines multiple filters', async () => {
      const result = await service.getRegistrations({
        trimester: 'fall',
        studentIds: ['s1', 's3'],
        instructorId: 'i1',
        excludeWaitlist: true,
      });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['r1', 'r3']);
    });

    it('returns empty when no registrations match combined filters', async () => {
      const result = await service.getRegistrations({
        trimester: 'fall',
        studentIds: ['s2'],
        instructorId: 'i1',
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('getClasses', () => {
    it('returns all classes from program repository', async () => {
      const result = await service.getClasses();
      expect(result).toEqual(mockClasses);
      expect(mockProgramRepository.getClasses).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAdmins', () => {
    it('returns all admins from user repository', async () => {
      const result = await service.getAdmins();
      expect(result).toEqual(mockAdmins);
      expect(mockUserRepository.getAdmins).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRooms', () => {
    it('returns all rooms from user repository', async () => {
      const result = await service.getRooms();
      expect(result).toEqual(mockRooms);
      expect(mockUserRepository.getRooms).toHaveBeenCalledTimes(1);
    });
  });
});
