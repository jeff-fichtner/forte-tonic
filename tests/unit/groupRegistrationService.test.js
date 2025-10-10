/**
 * Test for group registration service functionality
 */

import { describe, expect, beforeEach, jest } from '@jest/globals';
import { RegistrationApplicationService } from '../../src/services/registrationApplicationService.js';
import { serviceContainer } from '../../src/infrastructure/container/serviceContainer.js';

describe('Group Registration Service', () => {
  let registrationService;
  let mockUserRepository;
  let mockProgramRepository;
  let mockRegistrationRepository;

  beforeEach(() => {
    // Mock dependencies
    mockUserRepository = {
      getStudentById: jest.fn(),
      getInstructorById: jest.fn(),
    };

    mockProgramRepository = {
      getClassById: jest.fn(),
    };

    mockRegistrationRepository = {
      findAll: jest.fn(),
      create: jest.fn(),
    };

    // Register mocked services
    serviceContainer.register('userRepository', mockUserRepository);
    serviceContainer.register('programRepository', mockProgramRepository);
    serviceContainer.register('registrationRepository', mockRegistrationRepository);

    registrationService = new RegistrationApplicationService({
      userRepository: mockUserRepository,
      programRepository: mockProgramRepository,
      registrationRepository: mockRegistrationRepository,
      auditService: null,
      emailService: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Group Registration Data Population', () => {
    test('should populate missing fields from class data for group registrations', async () => {
      // Arrange
      const classData = {
        id: 'CLASS-001',
        instructorId: 'INST-001',
        day: 'Monday',
        startTime: '10:00',
        length: 60,
        instrument: 'Piano',
        title: 'Beginning Piano',
      };

      const studentData = {
        id: 'STU-001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        parent1Email: 'parent1@email.com',
        parent2Email: 'parent2@email.com',
        grade: '5',
        birthDate: '2015-01-01', // Makes student around 9 years old
      };

      const instructorData = {
        id: 'INST-001',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@email.com',
        availability: {
          monday: {
            roomId: 'ROOM-001',
          },
        },
      };

      const registrationData = {
        studentId: 'STU-001',
        registrationType: 'group',
        classId: 'CLASS-001',
      };

      // Mock repository responses
      mockProgramRepository.getClassById.mockResolvedValue(classData);
      mockUserRepository.getStudentById.mockResolvedValue(studentData);
      mockUserRepository.getInstructorById.mockResolvedValue(instructorData);
      mockRegistrationRepository.findAll.mockResolvedValue([]);
      mockRegistrationRepository.create.mockResolvedValue({
        id: 'REG-001',
        studentId: 'STU-001',
        instructorId: 'INST-001',
        classId: 'CLASS-001',
      });

      // Act
      const result = await registrationService.processRegistration(registrationData, 'test-user');

      // Assert
      expect(mockProgramRepository.getClassById).toHaveBeenCalledWith('CLASS-001');
      expect(mockUserRepository.getInstructorById).toHaveBeenCalledWith('INST-001');
      expect(mockRegistrationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'STU-001',
          instructorId: 'INST-001',
          day: 'Monday',
          startTime: '10:00',
          length: 60,
          instrument: 'Piano',
          classTitle: 'Beginning Piano',
          transportationType: 'pickup', // Should set default
          roomId: 'ROOM-001', // Should populate from instructor's availability
          registrationType: 'group',
          classId: 'CLASS-001',
        })
      );
    });

    test('should throw error if class not found for group registration', async () => {
      // Arrange
      const registrationData = {
        studentId: 'STU-001',
        registrationType: 'group',
        classId: 'NON-EXISTENT-CLASS',
      };

      mockProgramRepository.getClassById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        registrationService.processRegistration(registrationData, 'test-user')
      ).rejects.toThrow('Class not found: NON-EXISTENT-CLASS');
    });

    test('should set default transportation for group registrations', async () => {
      // Arrange
      const classData = {
        id: 'CLASS-001',
        instructorId: 'INST-001',
        day: 'Tuesday',
        startTime: '14:00',
        length: 45,
        instrument: 'Guitar',
        title: 'Guitar Class',
      };

      const studentData = {
        id: 'STU-002',
        firstName: 'Alice',
        lastName: 'Johnson',
        parent1Email: 'alice.parent@email.com',
        grade: '7',
        birthDate: '2013-01-01',
      };

      const instructorData = {
        id: 'INST-001',
        firstName: 'Bob',
        lastName: 'Teacher',
        availability: {
          tuesday: {
            roomId: 'ROOM-002',
          },
        },
      };

      const registrationData = {
        studentId: 'STU-002',
        registrationType: 'group',
        classId: 'CLASS-001',
        // No transportationType specified
      };

      mockProgramRepository.getClassById.mockResolvedValue(classData);
      mockUserRepository.getStudentById.mockResolvedValue(studentData);
      mockUserRepository.getInstructorById.mockResolvedValue(instructorData);
      mockRegistrationRepository.findAll.mockResolvedValue([]);
      mockRegistrationRepository.create.mockResolvedValue({
        id: 'REG-002',
        studentId: 'STU-002',
        instructorId: 'INST-001',
        classId: 'CLASS-001',
      });

      // Act
      await registrationService.processRegistration(registrationData, 'test-user');

      // Assert
      expect(mockRegistrationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transportationType: 'pickup', // Should set default
        })
      );
    });

    test('should not override existing transportation type for group registrations', async () => {
      // Arrange
      const classData = {
        id: 'CLASS-001',
        instructorId: 'INST-001',
        day: 'Wednesday',
        startTime: '15:00',
        length: 30,
        instrument: 'Violin',
        title: 'Violin Class',
      };

      const studentData = {
        id: 'STU-003',
        firstName: 'Charlie',
        lastName: 'Brown',
        parent1Email: 'charlie.parent@email.com',
        parent2Email: 'charlie.parent2@email.com',
        grade: '3',
        birthDate: '2017-01-01',
      };

      const instructorData = {
        id: 'INST-001',
        firstName: 'Diana',
        lastName: 'Teacher',
        availability: {
          wednesday: {
            roomId: 'ROOM-003',
          },
        },
      };

      const registrationData = {
        studentId: 'STU-003',
        registrationType: 'group',
        classId: 'CLASS-001',
        transportationType: 'both', // Already specified - should not be overridden
      };

      mockProgramRepository.getClassById.mockResolvedValue(classData);
      mockUserRepository.getStudentById.mockResolvedValue(studentData);
      mockUserRepository.getInstructorById.mockResolvedValue(instructorData);
      mockRegistrationRepository.findAll.mockResolvedValue([]);
      mockRegistrationRepository.create.mockResolvedValue({
        id: 'REG-003',
        studentId: 'STU-003',
        instructorId: 'INST-001',
        classId: 'CLASS-001',
      });

      // Act
      await registrationService.processRegistration(registrationData, 'test-user');

      // Assert
      expect(mockRegistrationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transportationType: 'both', // Should preserve existing value
        })
      );
    });
  });
});
