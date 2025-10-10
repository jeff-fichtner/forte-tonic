import { jest } from '@jest/globals';
import { UserRepository } from '../../src/repositories/userRepository.js';
import { Admin, Parent } from '../../src/models/shared/index.js';

describe('UserRepository', () => {
  let repository;
  let mockGoogleSheetsDbClient;

  beforeEach(() => {
    // Create mock GoogleSheetsDbClient
    mockGoogleSheetsDbClient = {
      getAllRecords: jest.fn(),
      getAllFromSheet: jest.fn(),
      getFromSheetByColumnValue: jest.fn(),
      appendRecord: jest.fn(),
      updateRecord: jest.fn(),
      deleteRecord: jest.fn(),
    };

    // Create fresh repository instance with mock client
    repository = new UserRepository(mockGoogleSheetsDbClient);
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
        ['admin-1', 'admin1@test.com', 'Smith', 'John', '555-1234'],
        ['admin-2', 'admin2@test.com', 'Doe', 'Jane', '555-5678'],
      ];

      // Mock getAllRecords to return admin instances
      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue(
        mockSheetData.map(row => Admin.fromDatabaseRow(row))
      );

      const result = await repository.getAdmins();

      expect(mockGoogleSheetsDbClient.getAllRecords).toHaveBeenCalledWith(
        'admins',
        expect.any(Function)
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Admin);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'admin-1',
          email: 'admin1@test.com',
          lastName: 'Smith',
          firstName: 'John',
          phoneNumber: '555-1234',
          role: 'admin',
          fullName: 'John Smith',
          displayName: 'John Smith (Admin)',
          isActive: true,
          isSuperAdmin: false,
          permissions: [],
          lastLoginDate: null,
          daysSinceLastLogin: null,
        })
      );
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
          phone: '555-9999',
          instrument1: 'Piano',
        }),
        new Instructor({
          id: 'inst-2',
          email: 'instructor2@test.com',
          lastName: 'Wilson',
          firstName: 'Sarah',
          phone: '555-8888',
          instrument1: 'Violin',
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
          parent2Id: null,
        }),
        new Student({
          id: 'student-2',
          lastName: 'Davis',
          firstName: 'Liam',
          lastNickname: '',
          firstNickname: '',
          grade: '4',
          parent1Id: 'parent-2',
          parent2Id: null,
        }),
      ];

      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue(mockStudents);

      const result = await repository.getStudents();

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
          parent2Id: null,
        })
      );
    });

    test('should handle empty result', async () => {
      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue([]);

      const result = await repository.getStudents();

      expect(result).toEqual([]);
    });
  });

  describe('getParents', () => {
    test('should return array of parent models', async () => {
      const mockParents = [
        Parent.fromDatabaseRow(['parent-1', 'parent1@test.com', 'Johnson', 'Robert', '555-1111']),
        Parent.fromDatabaseRow(['parent-2', 'parent2@test.com', 'Davis', 'Linda', '555-2222']),
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
          phone: '555-1111',
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
      const mockStudents = [
        {
          id: 'student-1',
          studentId: 'student1@test.com',
          lastName: 'Johnson',
          firstName: 'Emma',
          grade: '5',
          parent1Id: 'parent-1',
        },
        {
          id: 'student-2',
          studentId: 'student2@test.com',
          lastName: 'Davis',
          firstName: 'Liam',
          grade: '4',
          parent1Id: 'parent-2',
        },
      ];

      // Mock the students property directly to avoid RepositoryHelper issues
      repository.students = mockStudents;
      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue(mockStudents);

      const result = await repository.getStudentById('student-1');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'student-1',
          studentId: 'student1@test.com',
          lastName: 'Johnson',
          firstName: 'Emma',
        })
      );
    });

    test('should return null when student not found', async () => {
      // Mock empty students array
      repository.students = [];
      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue([]);

      const result = await repository.getStudentById('non-existent');

      expect(result).toBeUndefined(); // find() returns undefined, not null
    });
  });

  describe('getAdminByEmail', () => {
    test('should return admin by email when found', async () => {
      const mockAdmin = Admin.fromDatabaseRow([
        'admin-1',
        'admin@test.com',
        'Smith',
        'John',
        '555-1234',
      ]);

      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue([mockAdmin]);

      const result = await repository.getAdminByEmail('admin@test.com');

      expect(result).toBeInstanceOf(Admin);
      expect(result).toEqual(
        expect.objectContaining({
          id: 'admin-1',
          email: 'admin@test.com',
          lastName: 'Smith',
          firstName: 'John',
          phoneNumber: '555-1234',
          role: 'admin',
          fullName: 'John Smith',
          displayName: 'John Smith (Admin)',
          isActive: true,
          isSuperAdmin: false,
          permissions: [],
          lastLoginDate: null,
          daysSinceLastLogin: null,
        })
      );
    });

    test('should return undefined when admin not found', async () => {
      mockGoogleSheetsDbClient.getAllRecords.mockResolvedValue([]);

      const result = await repository.getAdminByEmail('notfound@test.com');

      expect(result).toBeUndefined();
    });
  });
});
