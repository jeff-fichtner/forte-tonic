import { jest } from '@jest/globals';
import { UserRepository } from '../../src/repositories/userRepository.js';
import { Admin, Parent } from '../../src/models/shared/index.js';

describe('UserRepository', () => {
  let repository;
  let mockGoogleSheetsDbClient;
  let mockConfigService;

  beforeEach(() => {
    // Create mock GoogleSheetsDbClient
    mockGoogleSheetsDbClient = {
      getAllRecords: jest.fn(),
      appendRecord: jest.fn(),
      updateRecord: jest.fn(),
      deleteRecord: jest.fn(),
    };

    // Create mock config service
    mockConfigService = {
      getConfig: jest.fn(() => ({
        environment: 'test',
        logLevel: 'info',
      })),
    };

    // Create fresh repository instance with mock client and config service
    repository = new UserRepository(mockGoogleSheetsDbClient, mockConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with googleSheetsDbClient', () => {
      expect(repository.dbClient).toBe(mockGoogleSheetsDbClient);
    });
  });

  describe('getAdmins', () => {
    test('should return array of admin models', async () => {
      const mockSheetData = [
        {
          id: 'admin-1',
          email: 'admin1@test.com',
          lastName: 'Smith',
          firstName: 'John',
          phone: '5551234000',
          accessCode: '',
          role: '',
          displayEmail: '',
          displayPhone: '',
          isDirector: '',
        },
        {
          id: 'admin-2',
          email: 'admin2@test.com',
          lastName: 'Doe',
          firstName: 'Jane',
          phone: '5555678000',
          accessCode: '',
          role: '',
          displayEmail: '',
          displayPhone: '',
          isDirector: '',
        },
      ];

      // Mock getAllRecords to return admin instances
      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue(
        mockSheetData.map(record => Admin.fromDatabaseRow(record))
      );

      const result = await repository.getAdmins();

      expect(mockGoogleSheetsDbClient.getAllRecords).toHaveBeenCalledWith(
        'admins',
        expect.any(Function)
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Admin);
      expect(result[0].toJSON()).toMatchObject({
        id: 'admin-1',
        email: 'admin1@test.com',
        lastName: 'Smith',
        firstName: 'John',
        phone: '5551234000',
        role: null,
        displayEmail: null,
        displayPhone: null,
        isDirector: false,
        fullName: 'John Smith',
        displayName: 'John Smith (Admin)',
      });
    });

    test('should handle empty result', async () => {
      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue([]);

      const result = await repository.getAdmins();

      expect(result).toEqual([]);
    });

    test('should handle errors', async () => {
      const error = new Error('Database error');
      mockGoogleSheetsDbClient.getAllRecords.mockRejectedValue(error);

      await expect(repository.getAdmins()).rejects.toThrow('Database error');
    });
  });

  describe('getInstructors', () => {
    test('should return array of instructor models', async () => {
      // Import Instructor to create proper instances
      const { Instructor } = await import('../../src/models/shared/instructor.js');

      // Mock some simple instructors with minimal parameters
      const mockInstructors = [
        new Instructor({
          id: 'inst-1',
          email: 'instructor1@test.com',
          lastName: 'Brown',
          firstName: 'Mike',
          phone: '5559999000',
          instrument1: 'Piano',
          role: 'instructor',
          isActive: true,
        }),
        new Instructor({
          id: 'inst-2',
          email: 'instructor2@test.com',
          lastName: 'Wilson',
          firstName: 'Sarah',
          phone: '5558888000',
          instrument1: 'Violin',
          role: 'instructor',
          isActive: true,
        }),
      ];

      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue(mockInstructors);

      const result = await repository.getInstructors();

      expect(mockGoogleSheetsDbClient.getAllRecords).toHaveBeenCalledWith(
        'instructors',
        expect.any(Function)
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Instructor);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'inst-1',
          email: 'instructor1@test.com',
          lastName: 'Brown',
          firstName: 'Mike',
          fullName: 'Mike Brown',
          displayName: 'Mike Brown (Instructor)',
          role: 'instructor',
          isActive: true,
        })
      );
    });

    test('should handle empty result', async () => {
      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue([]);

      const result = await repository.getInstructors();

      expect(result).toEqual([]);
    });
  });

  describe('getStudents', () => {
    test('should return array of student models', async () => {
      // Import Student to create proper instances
      const { Student } = await import('../../src/models/shared/student.js');

      const mockStudents = [
        new Student({
          id: 'student-1',
          lastName: 'Johnson',
          firstName: 'Emma',
          lastNickname: '',
          firstNickname: '',
          grade: '5',
          parent1Id: 'parent-1',
          parent2Id: '',
        }),
        new Student({
          id: 'student-2',
          lastName: 'Davis',
          firstName: 'Liam',
          lastNickname: '',
          firstNickname: '',
          grade: '4',
          parent1Id: 'parent-2',
          parent2Id: '',
        }),
      ];

      // getStudents() calls getAllRecords twice: once for students, once for parents
      mockGoogleSheetsDbClient.getAllRecords
        .mockResolvedValueOnce(mockStudents)
        .mockResolvedValueOnce([]);

      const result = await repository.getStudents('fall');

      expect(mockGoogleSheetsDbClient.getAllRecords).toHaveBeenCalledWith(
        'students',
        expect.any(Function)
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Student);
      expect(result[0]).toEqual(
        expect.objectContaining({
          firstName: 'Emma',
          lastName: 'Johnson',
          grade: '5',
          parent1Id: 'parent-1',
          parent2Id: '',
        })
      );
    });

    test('should handle empty result', async () => {
      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue([]);

      const result = await repository.getStudents('fall');

      expect(result).toEqual([]);
    });

    // Required `period` parameter — every caller must specify the active trimester
    test('should throw when period is missing (undefined)', async () => {
      await expect(repository.getStudents(undefined)).rejects.toThrow(
        /getStudents requires a `period` parameter/
      );
    });

    test('should throw when period is empty string', async () => {
      await expect(repository.getStudents('')).rejects.toThrow(
        /getStudents requires a `period` parameter/
      );
    });

    test('should throw when period is null', async () => {
      await expect(repository.getStudents(null)).rejects.toThrow(
        /getStudents requires a `period` parameter/
      );
    });

    // Grade-bump transform applies only for `summer`
    test('should bump grade by 1 when period is summer', async () => {
      const { Student } = await import('../../src/models/shared/student.js');

      const mockStudents = [
        new Student({
          id: 'student-1',
          lastName: 'Johnson',
          firstName: 'Emma',
          lastNickname: '',
          firstNickname: '',
          grade: '5',
          parent1Id: 'parent-1',
          parent2Id: '',
        }),
      ];

      mockGoogleSheetsDbClient.getAllRecords
        .mockResolvedValueOnce(mockStudents)
        .mockResolvedValueOnce([]);

      const result = await repository.getStudents('summer');

      expect(result).toHaveLength(1);
      expect(result[0].grade).toBe('6');
    });

    test('should NOT bump grade for fall/winter/spring', async () => {
      const { Student } = await import('../../src/models/shared/student.js');

      const mockStudents = [
        new Student({
          id: 'student-1',
          lastName: 'Johnson',
          firstName: 'Emma',
          lastNickname: '',
          firstNickname: '',
          grade: '5',
          parent1Id: 'parent-1',
          parent2Id: '',
        }),
      ];

      // Three independent invocations; reset cache between calls
      for (const period of ['fall', 'winter', 'spring']) {
        repository._enrichedStudentsCache = null;
        repository._enrichedStudentsCacheTime = null;
        mockGoogleSheetsDbClient.getAllRecords
          .mockResolvedValueOnce(mockStudents)
          .mockResolvedValueOnce([]);

        const result = await repository.getStudents(period);
        expect(result[0].grade).toBe('5');
      }
    });

    test('should leave non-numeric grade unchanged when bumping for summer', async () => {
      const { Student } = await import('../../src/models/shared/student.js');

      const mockStudents = [
        new Student({
          id: 'student-1',
          lastName: 'Johnson',
          firstName: 'Emma',
          lastNickname: '',
          firstNickname: '',
          grade: '', // empty / non-numeric
          parent1Id: 'parent-1',
          parent2Id: '',
        }),
      ];

      mockGoogleSheetsDbClient.getAllRecords
        .mockResolvedValueOnce(mockStudents)
        .mockResolvedValueOnce([]);

      const result = await repository.getStudents('summer');

      // Non-numeric grade is left as-is (no NaN propagation)
      expect(result[0].grade).toBe('');
    });
  });

  describe('getParents', () => {
    test('should return array of parent models', async () => {
      const mockParents = [
        Parent.fromDatabaseRow({
          id: 'parent-1',
          email: 'parent1@test.com',
          lastName: 'Johnson',
          firstName: 'Robert',
          phone: '5551111000',
          accessCode: '',
        }),
        Parent.fromDatabaseRow({
          id: 'parent-2',
          email: 'parent2@test.com',
          lastName: 'Davis',
          firstName: 'Linda',
          phone: '5552222000',
          accessCode: '',
        }),
      ];

      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue(mockParents);

      const result = await repository.getParents();

      expect(mockGoogleSheetsDbClient.getAllRecords).toHaveBeenCalledWith(
        'parents',
        expect.any(Function)
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Parent);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'parent-1',
          email: 'parent1@test.com',
          lastName: 'Johnson',
          firstName: 'Robert',
          phone: '5551111000',
        })
      );
    });

    test('should handle empty result', async () => {
      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue([]);

      const result = await repository.getParents();

      expect(result).toEqual([]);
    });
  });

  describe('getStudentById', () => {
    test('should return student by id', async () => {
      // Student.fromDatabaseRow expects a Record with keys: id, lastName, firstName, lastNickname, firstNickname, grade, parent1Id, parent2Id
      const mockStudentRecords = [
        {
          id: 'student-1',
          lastName: 'Johnson',
          firstName: 'Emma',
          lastNickname: '',
          firstNickname: '',
          grade: '5',
          parent1Id: 'parent-1',
          parent2Id: '',
        },
        {
          id: 'student-2',
          lastName: 'Davis',
          firstName: 'Liam',
          lastNickname: '',
          firstNickname: '',
          grade: '4',
          parent1Id: 'parent-2',
          parent2Id: '',
        },
      ];

      // Mock the db client calls
      mockGoogleSheetsDbClient.getAllRecords.mockImplementation(async (key, transformer) => {
        if (key === 'students') {
          return mockStudentRecords.map(record => transformer(record));
        }
        if (key === 'parents') {
          return [];
        }
        return [];
      });

      const result = await repository.getStudentById('student-1', 'fall');

      // Check that result has the correct properties using getters
      expect(result.firstName).toBe('Emma');
      expect(result.lastName).toBe('Johnson');
      expect(result.grade).toBe('5');
      // ID will be wrapped in StudentId value object
      expect(result.id.value || result.id).toBe('student-1');
    });

    test('should throw NotFoundError when student not found', async () => {
      // Mock empty students array
      mockGoogleSheetsDbClient.getAllRecords.mockImplementation(async (_key, _transformer) => {
        return [];
      });

      await expect(repository.getStudentById('non-existent', 'fall')).rejects.toThrow(
        'Student not found: non-existent'
      );
    });
  });

  describe('getAdminByEmail', () => {
    test('should return admin by email when found', async () => {
      const mockAdmin = Admin.fromDatabaseRow({
        id: 'admin-1',
        email: 'admin@test.com',
        lastName: 'Smith',
        firstName: 'John',
        phone: '5551234000',
        accessCode: '',
        role: '',
        displayEmail: '',
        displayPhone: '',
        isDirector: '',
      });

      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue([mockAdmin]);

      const result = await repository.getAdminByEmail('admin@test.com');

      expect(result).toBeInstanceOf(Admin);
      expect(result.toJSON()).toMatchObject({
        id: 'admin-1',
        email: 'admin@test.com',
        lastName: 'Smith',
        firstName: 'John',
        phone: '5551234000',
        role: null,
        displayEmail: null,
        displayPhone: null,
        isDirector: false,
        fullName: 'John Smith',
        displayName: 'John Smith (Admin)',
      });
    });

    test('should return null when admin not found', async () => {
      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue([]);

      const result = await repository.getAdminByEmail('notfound@test.com');

      expect(result).toBeNull();
    });
  });
});
