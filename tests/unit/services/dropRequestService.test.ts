/**
 * Unit tests for DropRequestService
 *
 * Covers: T005 (createDropRequest), T006 (approve/reject), T007 (query methods)
 */

import { jest } from '@jest/globals';

// Mock BaseService dependencies (logger + configService) at module level
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.unstable_mockModule('../../../src/services/configurationService.js', () => ({
  configService: {
    getServerConfig: jest.fn().mockReturnValue({ nodeEnv: 'test' }),
    getLoggingConfig: jest.fn().mockReturnValue({ enableLogging: false }),
  },
}));

// Import AFTER mocking base dependencies
const { DropRequestService } = await import('../../../src/services/dropRequestService.js');
const { NotFoundError, ValidationError, ForbiddenError, ConflictError } = await import('../../../src/common/errors.js');
const { DropRequestStatus } = await import('../../../src/utils/values/dropRequestStatus.js');
const { PeriodType } = await import('../../../src/utils/values/periodType.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMocks() {
  return {
    dropRequestRepository: {
      create: jest.fn(),
      findById: jest.fn(),
      findByStatus: jest.fn(),
      findByParentId: jest.fn(),
      findByRegistrationId: jest.fn(),
      update: jest.fn(),
    },
    registrationRepository: {
      findById: jest.fn(),
      delete: jest.fn(),
    },
    studentRepository: {
      getStudentById: jest.fn(),
      getStudents: jest.fn(),
    },
    periodService: {
      getCurrentPeriod: jest.fn(),
    },
  };
}

type Mocks = ReturnType<typeof createMocks>;

function createService(mocks: Mocks) {
  return new DropRequestService(
    mocks.dropRequestRepository as any,
    mocks.registrationRepository as any,
    mocks.studentRepository as any,
    mocks.periodService as any,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DropRequestService', () => {
  let mocks: Mocks;
  let service: InstanceType<typeof DropRequestService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMocks();
    service = createService(mocks);
  });

  // =========================================================================
  // T005: createDropRequest
  // =========================================================================
  describe('createDropRequest', () => {
    const registrationId = 'reg-001';
    const parentId = 'parent-001';
    const reason = 'Schedule conflict';

    test('should create a drop request during REGISTRATION period', async () => {
      mocks.periodService.getCurrentPeriod.mockResolvedValue({
        periodType: PeriodType.REGISTRATION,
      });
      mocks.registrationRepository.findById.mockResolvedValue({
        id: registrationId,
        studentId: 'student-001',
      });
      mocks.studentRepository.getStudentById.mockResolvedValue({
        id: 'student-001',
        parent1Id: parentId,
        parent2Id: null,
      });
      mocks.dropRequestRepository.findByRegistrationId.mockResolvedValue(null);

      const createdRequest = {
        id: 'dr-001',
        registrationId,
        parentId,
        reason,
        status: DropRequestStatus.PENDING,
      };
      mocks.dropRequestRepository.create.mockResolvedValue(createdRequest);

      const result = await service.createDropRequest(registrationId, parentId, reason);

      expect(result).toEqual(createdRequest);
      expect(mocks.dropRequestRepository.create).toHaveBeenCalledWith(
        {
          registrationId,
          parentId,
          reason,
          status: DropRequestStatus.PENDING,
        },
        parentId,
      );
    });

    test('should throw ForbiddenError when parent does not own student', async () => {
      mocks.periodService.getCurrentPeriod.mockResolvedValue({
        periodType: PeriodType.REGISTRATION,
      });
      mocks.registrationRepository.findById.mockResolvedValue({
        id: registrationId,
        studentId: 'student-001',
      });
      mocks.studentRepository.getStudentById.mockResolvedValue({
        id: 'student-001',
        parent1Id: 'other-parent-1',
        parent2Id: 'other-parent-2',
      });

      await expect(
        service.createDropRequest(registrationId, parentId, reason),
      ).rejects.toThrow(ForbiddenError);
    });

    test('should throw ValidationError when not in REGISTRATION period', async () => {
      mocks.periodService.getCurrentPeriod.mockResolvedValue({
        periodType: PeriodType.INTENT,
      });

      await expect(
        service.createDropRequest(registrationId, parentId, reason),
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ConflictError when pending request already exists', async () => {
      mocks.periodService.getCurrentPeriod.mockResolvedValue({
        periodType: PeriodType.REGISTRATION,
      });
      mocks.registrationRepository.findById.mockResolvedValue({
        id: registrationId,
        studentId: 'student-001',
      });
      mocks.studentRepository.getStudentById.mockResolvedValue({
        id: 'student-001',
        parent1Id: parentId,
        parent2Id: null,
      });
      mocks.dropRequestRepository.findByRegistrationId.mockResolvedValue({
        id: 'dr-existing',
        status: DropRequestStatus.PENDING,
      });

      await expect(
        service.createDropRequest(registrationId, parentId, reason),
      ).rejects.toThrow(ConflictError);
    });

    test('should throw NotFoundError when registration does not exist', async () => {
      mocks.periodService.getCurrentPeriod.mockResolvedValue({
        periodType: PeriodType.REGISTRATION,
      });
      mocks.registrationRepository.findById.mockResolvedValue(null);

      await expect(
        service.createDropRequest(registrationId, parentId, reason),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // =========================================================================
  // T006: approveDropRequest / rejectDropRequest
  // =========================================================================
  describe('approveDropRequest', () => {
    const requestId = 'dr-001';
    const adminEmail = 'admin@example.com';
    const adminNotes = 'Approved per policy';

    test('should approve a pending request and delete the registration', async () => {
      const pendingRequest = {
        id: requestId,
        status: DropRequestStatus.PENDING,
        registrationId: 'reg-001',
        trimester: 'fall',
      };
      mocks.dropRequestRepository.findById.mockResolvedValue(pendingRequest);
      mocks.registrationRepository.delete.mockResolvedValue(undefined);

      const approvedRequest = {
        ...pendingRequest,
        status: DropRequestStatus.APPROVED,
        reviewedBy: adminEmail,
        adminNotes,
      };
      mocks.dropRequestRepository.update.mockResolvedValue(approvedRequest);

      const result = await service.approveDropRequest(requestId, adminEmail, adminNotes);

      expect(result.status).toBe(DropRequestStatus.APPROVED);
      expect(mocks.registrationRepository.delete).toHaveBeenCalledWith(
        'reg-001',
        adminEmail,
        'fall',
      );
      expect(mocks.dropRequestRepository.update).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({
          status: DropRequestStatus.APPROVED,
          reviewedBy: adminEmail,
          adminNotes,
        }),
        adminEmail,
      );
    });

    test('should throw NotFoundError when request does not exist', async () => {
      mocks.dropRequestRepository.findById.mockResolvedValue(null);

      await expect(
        service.approveDropRequest(requestId, adminEmail, adminNotes),
      ).rejects.toThrow(NotFoundError);
    });

    test('should throw ValidationError when request is already approved', async () => {
      mocks.dropRequestRepository.findById.mockResolvedValue({
        id: requestId,
        status: DropRequestStatus.APPROVED,
      });

      await expect(
        service.approveDropRequest(requestId, adminEmail, adminNotes),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('rejectDropRequest', () => {
    const requestId = 'dr-002';
    const adminEmail = 'admin@example.com';
    const adminNotes = 'Insufficient justification';

    test('should reject a pending request without deleting the registration', async () => {
      const pendingRequest = {
        id: requestId,
        status: DropRequestStatus.PENDING,
        registrationId: 'reg-002',
      };
      mocks.dropRequestRepository.findById.mockResolvedValue(pendingRequest);

      const rejectedRequest = {
        ...pendingRequest,
        status: DropRequestStatus.REJECTED,
        reviewedBy: adminEmail,
        adminNotes,
      };
      mocks.dropRequestRepository.update.mockResolvedValue(rejectedRequest);

      const result = await service.rejectDropRequest(requestId, adminEmail, adminNotes);

      expect(result.status).toBe(DropRequestStatus.REJECTED);
      expect(mocks.registrationRepository.delete).not.toHaveBeenCalled();
      expect(mocks.dropRequestRepository.update).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({
          status: DropRequestStatus.REJECTED,
          reviewedBy: adminEmail,
          adminNotes,
        }),
        adminEmail,
      );
    });

    test('should throw ValidationError when request is already rejected', async () => {
      mocks.dropRequestRepository.findById.mockResolvedValue({
        id: requestId,
        status: DropRequestStatus.REJECTED,
      });

      await expect(
        service.rejectDropRequest(requestId, adminEmail, adminNotes),
      ).rejects.toThrow(ValidationError);
    });
  });

  // =========================================================================
  // T007: getPendingDropRequests, getDropRequestsByParent, getDropRequestById
  // =========================================================================
  describe('getPendingDropRequests', () => {
    test('should return enriched pending requests with student and registration data', async () => {
      const pendingRequests = [
        { id: 'dr-001', registrationId: 'reg-001', status: DropRequestStatus.PENDING },
        { id: 'dr-002', registrationId: 'reg-002', status: DropRequestStatus.PENDING },
      ];
      mocks.dropRequestRepository.findByStatus.mockResolvedValue(pendingRequests);

      const students = [
        { id: 'student-001', name: 'Alice' },
        { id: 'student-002', name: 'Bob' },
      ];
      mocks.studentRepository.getStudents.mockResolvedValue(students);

      mocks.registrationRepository.findById
        .mockResolvedValueOnce({ id: 'reg-001', studentId: 'student-001' })
        .mockResolvedValueOnce({ id: 'reg-002', studentId: 'student-002' });

      const result = await service.getPendingDropRequests();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'dr-001',
        registration: { id: 'reg-001', studentId: 'student-001' },
        student: { id: 'student-001', name: 'Alice' },
      });
      expect(result[1]).toMatchObject({
        id: 'dr-002',
        registration: { id: 'reg-002', studentId: 'student-002' },
        student: { id: 'student-002', name: 'Bob' },
      });
    });

    test('should return empty array when no pending requests exist', async () => {
      mocks.dropRequestRepository.findByStatus.mockResolvedValue([]);

      const result = await service.getPendingDropRequests();

      expect(result).toEqual([]);
      expect(mocks.studentRepository.getStudents).not.toHaveBeenCalled();
    });
  });

  describe('getDropRequestsByParent', () => {
    const parentId = 'parent-001';

    test('should return enriched requests for a parent', async () => {
      const requests = [
        { id: 'dr-001', registrationId: 'reg-001', parentId },
        { id: 'dr-002', registrationId: 'reg-002', parentId },
      ];
      mocks.dropRequestRepository.findByParentId.mockResolvedValue(requests);

      mocks.registrationRepository.findById
        .mockResolvedValueOnce({ id: 'reg-001', studentId: 'student-001' })
        .mockResolvedValueOnce({ id: 'reg-002', studentId: 'student-002' });

      const result = await service.getDropRequestsByParent(parentId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'dr-001',
        registration: { id: 'reg-001', studentId: 'student-001' },
      });
      expect(result[1]).toMatchObject({
        id: 'dr-002',
        registration: { id: 'reg-002', studentId: 'student-002' },
      });
    });

    test('should return empty array when parent has no requests', async () => {
      mocks.dropRequestRepository.findByParentId.mockResolvedValue([]);

      const result = await service.getDropRequestsByParent(parentId);

      expect(result).toEqual([]);
      expect(mocks.registrationRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('getDropRequestById', () => {
    test('should return the drop request when found', async () => {
      const dropRequest = {
        id: 'dr-001',
        registrationId: 'reg-001',
        status: DropRequestStatus.PENDING,
      };
      mocks.dropRequestRepository.findById.mockResolvedValue(dropRequest);

      const result = await service.getDropRequestById('dr-001');

      expect(result).toEqual(dropRequest);
    });

    test('should throw NotFoundError when request does not exist', async () => {
      mocks.dropRequestRepository.findById.mockResolvedValue(null);

      await expect(
        service.getDropRequestById('dr-nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
