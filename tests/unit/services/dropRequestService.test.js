/**
 * Drop Request Service Tests
 * ============================
 *
 * Tests for drop request service business logic:
 * - Create drop request with validation
 * - Approve drop request
 * - Reject drop request
 * - Get pending requests
 * - Get requests by parent
 */

import { jest } from '@jest/globals';
import {
  DropRequestService,
  DropRequestError,
  DropRequestNotFoundError,
  UnauthorizedDropRequestError,
  InvalidPeriodError,
  DuplicateDropRequestError,
  RegistrationNotFoundError,
  InvalidStatusTransitionError,
} from '../../../src/services/dropRequestService.js';
import { DropRequestStatus } from '../../../src/utils/values/dropRequestStatus.js';
import { PeriodType } from '../../../src/utils/values/periodType.js';

describe('DropRequestService', () => {
  let service;
  let mockDropRequestRepository;
  let mockRegistrationRepository;
  let mockStudentRepository;
  let mockPeriodService;
  let mockConfigService;

  beforeEach(() => {
    mockDropRequestRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByParentId: jest.fn(),
      findByStatus: jest.fn(),
      findByRegistrationId: jest.fn(),
      update: jest.fn(),
    };

    mockRegistrationRepository = {
      getById: jest.fn(),
      getRegistrationsByTrimester: jest.fn(),
      delete: jest.fn(),
    };

    mockStudentRepository = {
      getStudentById: jest.fn(),
      getStudents: jest.fn(),
    };

    mockPeriodService = {
      getCurrentPeriod: jest.fn(),
    };

    mockConfigService = {
      getLoggingConfig: () => ({ enableLogging: false, logLevel: 'error' }),
    };

    service = new DropRequestService(
      mockDropRequestRepository,
      mockRegistrationRepository,
      mockStudentRepository,
      mockPeriodService,
      mockConfigService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDropRequest', () => {
    const registrationId = 'da8ca6c8-7626-40c3-9173-319f15effaea';
    const parentId = 'fb9fa6c8-8627-51d4-a274-429f26fggfeb';
    const studentId = 'ab7da6c8-9738-62e5-b385-539f37ghhefc';
    const reason = 'Moving to a new school';

    const mockRegistration = {
      id: { getValue: () => registrationId },
      studentId: { getValue: () => studentId },
    };

    const mockStudent = {
      id: studentId,
      parent1Id: { getValue: () => parentId },
      parent2Id: { getValue: () => null },
    };

    const mockPeriod = {
      trimester: 'fall',
      periodType: PeriodType.REGISTRATION,
    };

    test('should create drop request successfully', async () => {
      mockPeriodService.getCurrentPeriod.mockResolvedValue(mockPeriod);
      mockRegistrationRepository.getRegistrationsByTrimester.mockResolvedValue([mockRegistration]);
      mockStudentRepository.getStudentById.mockResolvedValue(mockStudent);
      mockDropRequestRepository.findByRegistrationId.mockResolvedValue(null);
      mockDropRequestRepository.create.mockResolvedValue({
        id: 'drop-001',
        registrationId,
        parentId,
        reason,
        status: DropRequestStatus.PENDING,
      });

      const result = await service.createDropRequest(registrationId, parentId, reason);

      expect(result.status).toBe(DropRequestStatus.PENDING);
      expect(mockDropRequestRepository.create).toHaveBeenCalledWith(
        {
          registrationId,
          parentId,
          trimester: 'fall',
          reason,
          status: DropRequestStatus.PENDING,
        },
        parentId
      );
    });

    test('should reject drop request if not in registration period', async () => {
      mockPeriodService.getCurrentPeriod.mockResolvedValue({
        trimester: 'fall',
        periodType: PeriodType.INTENT,
      });

      await expect(service.createDropRequest(registrationId, parentId, reason)).rejects.toThrow(
        InvalidPeriodError
      );

      expect(mockDropRequestRepository.create).not.toHaveBeenCalled();
    });

    test('should reject drop request if no current period', async () => {
      mockPeriodService.getCurrentPeriod.mockResolvedValue(null);

      await expect(service.createDropRequest(registrationId, parentId, reason)).rejects.toThrow(
        InvalidPeriodError
      );
    });

    test('should reject drop request if registration not found', async () => {
      mockPeriodService.getCurrentPeriod.mockResolvedValue(mockPeriod);
      mockRegistrationRepository.getRegistrationsByTrimester.mockResolvedValue([]);

      await expect(service.createDropRequest(registrationId, parentId, reason)).rejects.toThrow(
        RegistrationNotFoundError
      );

      expect(mockDropRequestRepository.create).not.toHaveBeenCalled();
    });

    test('should reject drop request if student not found', async () => {
      mockPeriodService.getCurrentPeriod.mockResolvedValue(mockPeriod);
      mockRegistrationRepository.getRegistrationsByTrimester.mockResolvedValue([mockRegistration]);
      mockStudentRepository.getStudentById.mockResolvedValue(null);

      await expect(service.createDropRequest(registrationId, parentId, reason)).rejects.toThrow(
        'Student not found'
      );
    });

    test('should reject drop request if parent does not own student', async () => {
      mockPeriodService.getCurrentPeriod.mockResolvedValue(mockPeriod);
      mockRegistrationRepository.getRegistrationsByTrimester.mockResolvedValue([mockRegistration]);
      mockStudentRepository.getStudentById.mockResolvedValue({
        id: studentId,
        parent1Id: { getValue: () => 'different-parent' },
        parent2Id: { getValue: () => null },
      });

      await expect(service.createDropRequest(registrationId, parentId, reason)).rejects.toThrow(
        UnauthorizedDropRequestError
      );
    });

    test('should allow drop request if parent is parent2', async () => {
      mockPeriodService.getCurrentPeriod.mockResolvedValue(mockPeriod);
      mockRegistrationRepository.getRegistrationsByTrimester.mockResolvedValue([mockRegistration]);
      mockStudentRepository.getStudentById.mockResolvedValue({
        id: studentId,
        parent1Id: { getValue: () => 'other-parent' },
        parent2Id: { getValue: () => parentId },
      });
      mockDropRequestRepository.findByRegistrationId.mockResolvedValue(null);
      mockDropRequestRepository.create.mockResolvedValue({
        id: 'drop-001',
        registrationId,
        parentId,
        reason,
        status: DropRequestStatus.PENDING,
      });

      const result = await service.createDropRequest(registrationId, parentId, reason);

      expect(result.status).toBe(DropRequestStatus.PENDING);
    });

    test('should handle student with plain parent IDs (not value objects)', async () => {
      mockPeriodService.getCurrentPeriod.mockResolvedValue(mockPeriod);
      mockRegistrationRepository.getRegistrationsByTrimester.mockResolvedValue([mockRegistration]);
      mockStudentRepository.getStudentById.mockResolvedValue({
        id: studentId,
        parent1Id: parentId, // Plain string, not value object
        parent2Id: null,
      });
      mockDropRequestRepository.findByRegistrationId.mockResolvedValue(null);
      mockDropRequestRepository.create.mockResolvedValue({
        id: 'drop-001',
        registrationId,
        parentId,
        reason,
        status: DropRequestStatus.PENDING,
      });

      const result = await service.createDropRequest(registrationId, parentId, reason);

      expect(result.status).toBe(DropRequestStatus.PENDING);
    });

    test('should reject drop request if pending request already exists', async () => {
      mockPeriodService.getCurrentPeriod.mockResolvedValue(mockPeriod);
      mockRegistrationRepository.getRegistrationsByTrimester.mockResolvedValue([mockRegistration]);
      mockStudentRepository.getStudentById.mockResolvedValue(mockStudent);
      mockDropRequestRepository.findByRegistrationId.mockResolvedValue({
        id: 'existing-drop',
        status: DropRequestStatus.PENDING,
      });

      await expect(service.createDropRequest(registrationId, parentId, reason)).rejects.toThrow(
        DuplicateDropRequestError
      );

      expect(mockDropRequestRepository.create).not.toHaveBeenCalled();
    });

    test('should allow new drop request if previous request was approved', async () => {
      mockPeriodService.getCurrentPeriod.mockResolvedValue(mockPeriod);
      mockRegistrationRepository.getRegistrationsByTrimester.mockResolvedValue([mockRegistration]);
      mockStudentRepository.getStudentById.mockResolvedValue(mockStudent);
      mockDropRequestRepository.findByRegistrationId.mockResolvedValue({
        id: 'existing-drop',
        status: DropRequestStatus.APPROVED,
      });
      mockDropRequestRepository.create.mockResolvedValue({
        id: 'drop-002',
        registrationId,
        parentId,
        reason,
        status: DropRequestStatus.PENDING,
      });

      const result = await service.createDropRequest(registrationId, parentId, reason);

      expect(result.status).toBe(DropRequestStatus.PENDING);
      expect(mockDropRequestRepository.create).toHaveBeenCalled();
    });
  });

  describe('approveDropRequest', () => {
    const requestId = 'drop-123';
    const adminEmail = 'admin@example.com';
    const adminNotes = 'Approved per parent request';

    test('should approve drop request and delete registration', async () => {
      const mockRequest = {
        id: requestId,
        registrationId: 'reg-456',
        parentId: 'parent-789',
        status: DropRequestStatus.PENDING,
      };

      const mockUpdatedRequest = {
        ...mockRequest,
        status: DropRequestStatus.APPROVED,
        reviewedBy: adminEmail,
        reviewedAt: expect.any(String),
        adminNotes,
      };

      mockDropRequestRepository.findById.mockResolvedValue(mockRequest);
      mockRegistrationRepository.delete.mockResolvedValue(true);
      mockDropRequestRepository.update.mockResolvedValue(mockUpdatedRequest);

      const result = await service.approveDropRequest(requestId, adminEmail, adminNotes);

      expect(result.status).toBe(DropRequestStatus.APPROVED);
      expect(mockRegistrationRepository.delete).toHaveBeenCalledWith('reg-456', adminEmail);
      expect(mockDropRequestRepository.update).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({
          status: DropRequestStatus.APPROVED,
          reviewedBy: adminEmail,
          adminNotes,
        }),
        adminEmail
      );
    });

    test('should throw error if drop request not found', async () => {
      mockDropRequestRepository.findById.mockResolvedValue(null);

      await expect(service.approveDropRequest(requestId, adminEmail, adminNotes)).rejects.toThrow(
        DropRequestNotFoundError
      );

      expect(mockRegistrationRepository.delete).not.toHaveBeenCalled();
    });

    test('should throw error if drop request is already approved', async () => {
      const mockRequest = {
        id: requestId,
        status: DropRequestStatus.APPROVED,
      };

      mockDropRequestRepository.findById.mockResolvedValue(mockRequest);

      await expect(service.approveDropRequest(requestId, adminEmail, adminNotes)).rejects.toThrow(
        InvalidStatusTransitionError
      );

      expect(mockRegistrationRepository.delete).not.toHaveBeenCalled();
    });

    test('should throw error if drop request is already rejected', async () => {
      const mockRequest = {
        id: requestId,
        status: DropRequestStatus.REJECTED,
      };

      mockDropRequestRepository.findById.mockResolvedValue(mockRequest);

      await expect(service.approveDropRequest(requestId, adminEmail, adminNotes)).rejects.toThrow(
        InvalidStatusTransitionError
      );
    });

    test('should handle approval without admin notes', async () => {
      const mockRequest = {
        id: requestId,
        registrationId: 'reg-456',
        status: DropRequestStatus.PENDING,
      };

      mockDropRequestRepository.findById.mockResolvedValue(mockRequest);
      mockRegistrationRepository.delete.mockResolvedValue(true);
      mockDropRequestRepository.update.mockResolvedValue({
        ...mockRequest,
        status: DropRequestStatus.APPROVED,
      });

      await service.approveDropRequest(requestId, adminEmail);

      expect(mockDropRequestRepository.update).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({
          adminNotes: '',
        }),
        adminEmail
      );
    });
  });

  describe('rejectDropRequest', () => {
    const requestId = 'drop-123';
    const adminEmail = 'admin@example.com';
    const adminNotes = 'Cannot accommodate drop at this time';

    test('should reject drop request without deleting registration', async () => {
      const mockRequest = {
        id: requestId,
        registrationId: 'reg-456',
        status: DropRequestStatus.PENDING,
      };

      const mockUpdatedRequest = {
        ...mockRequest,
        status: DropRequestStatus.REJECTED,
        reviewedBy: adminEmail,
        reviewedAt: expect.any(String),
        adminNotes,
      };

      mockDropRequestRepository.findById.mockResolvedValue(mockRequest);
      mockDropRequestRepository.update.mockResolvedValue(mockUpdatedRequest);

      const result = await service.rejectDropRequest(requestId, adminEmail, adminNotes);

      expect(result.status).toBe(DropRequestStatus.REJECTED);
      expect(mockRegistrationRepository.delete).not.toHaveBeenCalled();
      expect(mockDropRequestRepository.update).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({
          status: DropRequestStatus.REJECTED,
          reviewedBy: adminEmail,
          adminNotes,
        }),
        adminEmail
      );
    });

    test('should throw error if drop request not found', async () => {
      mockDropRequestRepository.findById.mockResolvedValue(null);

      await expect(service.rejectDropRequest(requestId, adminEmail, adminNotes)).rejects.toThrow(
        DropRequestNotFoundError
      );
    });

    test('should throw error if drop request is not pending', async () => {
      const mockRequest = {
        id: requestId,
        status: DropRequestStatus.APPROVED,
      };

      mockDropRequestRepository.findById.mockResolvedValue(mockRequest);

      await expect(service.rejectDropRequest(requestId, adminEmail, adminNotes)).rejects.toThrow(
        InvalidStatusTransitionError
      );
    });
  });

  describe('getPendingDropRequests', () => {
    test('should return enriched pending drop requests', async () => {
      const mockRequests = [
        {
          id: 'drop-123',
          registrationId: 'reg-456',
          parentId: 'parent-789',
          status: DropRequestStatus.PENDING,
        },
      ];

      const mockRegistration = {
        id: { getValue: () => 'reg-456' },
        studentId: { getValue: () => 'student-001' },
      };

      const mockStudent = {
        id: 'student-001',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockDropRequestRepository.findByStatus.mockResolvedValue(mockRequests);
      mockRegistrationRepository.getById.mockResolvedValue(mockRegistration);
      mockStudentRepository.getStudents.mockResolvedValue([mockStudent]);

      const results = await service.getPendingDropRequests();

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('drop-123');
      expect(results[0].registration).toBeDefined();
      expect(results[0].student).toBeDefined();
      expect(mockDropRequestRepository.findByStatus).toHaveBeenCalledWith(
        DropRequestStatus.PENDING
      );
    });

    test('should handle missing registration gracefully', async () => {
      const mockRequests = [
        {
          id: 'drop-123',
          registrationId: 'reg-456',
          status: DropRequestStatus.PENDING,
        },
      ];

      mockDropRequestRepository.findByStatus.mockResolvedValue(mockRequests);
      mockRegistrationRepository.getById.mockResolvedValue(null);
      mockStudentRepository.getStudents.mockResolvedValue([]);

      const results = await service.getPendingDropRequests();

      expect(results).toHaveLength(1);
      expect(results[0].registration).toBeNull();
      expect(results[0].student).toBeNull();
    });

    test('should return empty array if no pending requests', async () => {
      mockDropRequestRepository.findByStatus.mockResolvedValue([]);
      mockStudentRepository.getStudents.mockResolvedValue([]);

      const results = await service.getPendingDropRequests();

      expect(results).toEqual([]);
    });
  });

  describe('getDropRequestsByParent', () => {
    const parentId = 'parent-123';

    test('should return enriched drop requests for parent', async () => {
      const mockRequests = [
        {
          id: 'drop-123',
          registrationId: 'reg-456',
          parentId,
          status: DropRequestStatus.PENDING,
        },
        {
          id: 'drop-124',
          registrationId: 'reg-457',
          parentId,
          status: DropRequestStatus.APPROVED,
        },
      ];

      const mockRegistration1 = {
        id: { getValue: () => 'reg-456' },
      };

      const mockRegistration2 = {
        id: { getValue: () => 'reg-457' },
      };

      mockDropRequestRepository.findByParentId.mockResolvedValue(mockRequests);
      mockRegistrationRepository.getById
        .mockResolvedValueOnce(mockRegistration1)
        .mockResolvedValueOnce(mockRegistration2);

      const results = await service.getDropRequestsByParent(parentId);

      expect(results).toHaveLength(2);
      expect(results[0].registration).toBeDefined();
      expect(results[1].registration).toBeDefined();
    });

    test('should handle missing registration gracefully', async () => {
      const mockRequests = [
        {
          id: 'drop-123',
          registrationId: 'reg-456',
          parentId,
        },
      ];

      mockDropRequestRepository.findByParentId.mockResolvedValue(mockRequests);
      mockRegistrationRepository.getById.mockResolvedValue(null);

      const results = await service.getDropRequestsByParent(parentId);

      expect(results).toHaveLength(1);
      expect(results[0].registration).toBeNull();
    });
  });

  describe('getDropRequestById', () => {
    test('should return drop request by ID', async () => {
      const mockRequest = {
        id: 'drop-123',
        registrationId: 'reg-456',
        status: DropRequestStatus.PENDING,
      };

      mockDropRequestRepository.findById.mockResolvedValue(mockRequest);

      const result = await service.getDropRequestById('drop-123');

      expect(result).toEqual(mockRequest);
    });

    test('should throw error if not found', async () => {
      mockDropRequestRepository.findById.mockResolvedValue(null);

      await expect(service.getDropRequestById('non-existent')).rejects.toThrow(
        DropRequestNotFoundError
      );
    });
  });
});
