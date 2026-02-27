/**
 * Drop Request Service
 * ======================
 *
 * Business logic for mid-trimester drop requests.
 * Handles validation, authorization, and state transitions.
 */

import { BaseService } from '../infrastructure/base/baseService.js';
import { DropRequestStatus } from '../utils/values/dropRequestStatus.js';
import { PeriodType } from '../utils/values/periodType.js';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../common/errors.js';
import type { ConfigurationService } from './configurationService.js';
import type { DropRequest, DropRequestRepository } from '../repositories/dropRequestRepository.js';
import type { RegistrationRepository } from '../repositories/registrationRepository.js';
import type { Registration } from '../models/shared/registration.js';
import type { UserRepository } from '../repositories/userRepository.js';
import type { Student } from '../models/shared/student.js';
import type { PeriodService } from './periodService.js';

interface EnrichedDropRequest {
  id: string;
  registrationId: string;
  parentId: string;
  trimester: string;
  reason: string;
  requestedAt: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
  registration: Registration | null;
  student?: Student | null;
}

/**
 * Drop Request Service
 */
export class DropRequestService extends BaseService {
  #dropRequestRepository: DropRequestRepository;
  #registrationRepository: RegistrationRepository;
  #studentRepository: UserRepository;
  #periodService: PeriodService;

  constructor(
    dropRequestRepository: DropRequestRepository,
    registrationRepository: RegistrationRepository,
    studentRepository: UserRepository,
    periodService: PeriodService,
    configService?: ConfigurationService
  ) {
    super(configService);
    this.#dropRequestRepository = dropRequestRepository;
    this.#registrationRepository = registrationRepository;
    this.#studentRepository = studentRepository;
    this.#periodService = periodService;
  }

  /**
   * Create a new drop request
   */
  async createDropRequest(registrationId: string, parentId: string, reason: string): Promise<DropRequest> {
    try {
      this.logger.info(
        `📝 Creating drop request for registration ${registrationId} by parent ${parentId}`
      );

      // 1. Validate current period (must be registration period)
      const currentPeriod = await this.#periodService.getCurrentPeriod();
      if (!currentPeriod || currentPeriod.periodType !== PeriodType.REGISTRATION) {
        this.logger.warn(
          `Drop request rejected: Not in registration period (current: ${currentPeriod?.periodType})`
        );
        throw new ValidationError('Drop requests can only be submitted during active registration periods');
      }

      // 2. Verify registration exists in the current trimester
      const trimester = currentPeriod.trimester;
      if (!trimester) {
        throw new ValidationError('Current period has no trimester configured');
      }
      const registration = await this.#registrationRepository.findByIdInTrimester(registrationId, trimester);
      if (!registration) {
        this.logger.warn(`Drop request rejected: Registration not found ${registrationId}`);
        throw new NotFoundError(`Registration not found: ${registrationId}`);
      }

      // 3. Verify parent owns the student
      const studentId = registration.studentId;
      const student = await this.#studentRepository.getStudentById(studentId);

      if (!student) {
        this.logger.error(`Student not found for registration: ${studentId}`);
        throw new NotFoundError(`Student not found: ${studentId}`);
      }

      // Check parent ownership - handle both parent1Id and parent2Id
      const parent1Id = student.parent1Id;
      const parent2Id = student.parent2Id;

      if (parent1Id !== parentId && parent2Id !== parentId) {
        this.logger.warn(
          `Drop request rejected: Parent ${parentId} does not own student ${studentId}`
        );
        throw new ForbiddenError('You are not authorized to access this drop request');
      }

      // 4. Check for existing pending drop request
      const existingRequest = await this.#dropRequestRepository.findByRegistrationId(registrationId);
      if (existingRequest && existingRequest.status === DropRequestStatus.PENDING) {
        this.logger.warn(
          `Drop request rejected: Pending request already exists ${existingRequest.id}`
        );
        throw new ConflictError('A pending drop request already exists for this registration');
      }

      // 5. Create the drop request
      const dropRequest = await this.#dropRequestRepository.create(
        {
          registrationId,
          parentId,
          trimester,
          reason,
          status: DropRequestStatus.PENDING,
        },
        parentId
      );

      this.logger.info(`✅ Created drop request ${dropRequest.id}`);
      return dropRequest;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ForbiddenError || error instanceof ConflictError) {
        throw error;
      }
      this.logger.error('❌ Error creating drop request:', error);
      throw new Error(`Failed to create drop request: ${(error as Error).message}`);
    }
  }

  /**
   * Approve a drop request and delete the associated registration
   */
  async approveDropRequest(
    requestId: string,
    adminEmail: string,
    adminNotes: string = ''
  ): Promise<DropRequest> {
    try {
      this.logger.info(`✅ Approving drop request ${requestId} by admin ${adminEmail}`);

      // 1. Find the drop request
      const dropRequest = await this.#dropRequestRepository.findById(requestId);
      if (!dropRequest) {
        throw new NotFoundError(`Drop request not found: ${requestId}`);
      }

      // 2. Validate status transition
      if (dropRequest.status !== DropRequestStatus.PENDING) {
        throw new ValidationError(`Invalid status transition from ${dropRequest.status} to ${DropRequestStatus.APPROVED}. Only pending requests can be approved or rejected.`);
      }

      // 3. Delete the registration
      this.logger.info(`🗑️ Deleting registration ${dropRequest.registrationId}`);
      await this.#registrationRepository.delete(dropRequest.registrationId, adminEmail, dropRequest.trimester);

      // 4. Update drop request status
      const updated = await this.#dropRequestRepository.update(
        requestId,
        {
          status: DropRequestStatus.APPROVED,
          reviewedBy: adminEmail,
          reviewedAt: new Date().toISOString(),
          adminNotes,
        },
        adminEmail
      );

      this.logger.info(`✅ Approved drop request ${requestId} and deleted registration`);
      return updated;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ForbiddenError || error instanceof ConflictError) {
        throw error;
      }
      this.logger.error('❌ Error approving drop request:', error);
      throw new Error(`Failed to approve drop request: ${(error as Error).message}`);
    }
  }

  /**
   * Reject a drop request (registration remains active)
   */
  async rejectDropRequest(
    requestId: string,
    adminEmail: string,
    adminNotes: string = ''
  ): Promise<DropRequest> {
    try {
      this.logger.info(`❌ Rejecting drop request ${requestId} by admin ${adminEmail}`);

      // 1. Find the drop request
      const dropRequest = await this.#dropRequestRepository.findById(requestId);
      if (!dropRequest) {
        throw new NotFoundError(`Drop request not found: ${requestId}`);
      }

      // 2. Validate status transition
      if (dropRequest.status !== DropRequestStatus.PENDING) {
        throw new ValidationError(`Invalid status transition from ${dropRequest.status} to ${DropRequestStatus.REJECTED}. Only pending requests can be approved or rejected.`);
      }

      // 3. Update drop request status (registration stays active)
      const updated = await this.#dropRequestRepository.update(
        requestId,
        {
          status: DropRequestStatus.REJECTED,
          reviewedBy: adminEmail,
          reviewedAt: new Date().toISOString(),
          adminNotes,
        },
        adminEmail
      );

      this.logger.info(`✅ Rejected drop request ${requestId}, registration remains active`);
      return updated;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ForbiddenError || error instanceof ConflictError) {
        throw error;
      }
      this.logger.error('❌ Error rejecting drop request:', error);
      throw new Error(`Failed to reject drop request: ${(error as Error).message}`);
    }
  }

  /**
   * Get all pending drop requests (for admin view)
   * Enriches with related student and registration data
   */
  async getPendingDropRequests(): Promise<EnrichedDropRequest[]> {
    try {
      this.logger.info('📋 Getting all pending drop requests');

      const pendingRequests = await this.#dropRequestRepository.findByStatus(
        DropRequestStatus.PENDING
      );

      if (pendingRequests.length === 0) {
        return [];
      }

      // Batch-fetch all students and build a lookup map
      const allStudents = await this.#studentRepository.getStudents();
      const studentMap = new Map(allStudents.map(s => [s.id, s]));

      // Batch-fetch registrations using each request's trimester
      const registrationMap = new Map<string, Registration>();
      for (const request of pendingRequests) {
        try {
          const reg = await this.#registrationRepository.findByIdInTrimester(
            request.registrationId, request.trimester
          );
          if (reg) registrationMap.set(request.registrationId, reg);
        } catch (error) {
          this.logger.warn(`Could not fetch registration ${request.registrationId}:`, (error as Error).message);
        }
      }

      // Join in memory
      const enriched = pendingRequests.map(request => {
        const registration = registrationMap.get(request.registrationId) || null;
        const studentId = registration ? registration.studentId : null;
        const student = studentId ? studentMap.get(studentId) || null : null;

        if (!registration) {
          this.logger.warn(`Registration not found for drop request ${request.id}`);
        }

        return {
          ...request,
          registration,
          student,
        };
      });

      this.logger.info(`✅ Found ${enriched.length} pending drop requests`);
      return enriched;
    } catch (error) {
      this.logger.error('❌ Error getting pending drop requests:', error);
      throw new Error(`Failed to get pending drop requests: ${(error as Error).message}`);
    }
  }

  /**
   * Get all drop requests for a specific parent
   */
  async getDropRequestsByParent(parentId: string): Promise<EnrichedDropRequest[]> {
    try {
      this.logger.info(`📋 Getting drop requests for parent ${parentId}`);

      const requests = await this.#dropRequestRepository.findByParentId(parentId);

      if (requests.length === 0) {
        return [];
      }

      // Batch-fetch registrations using each request's trimester
      const registrationMap = new Map<string, Registration>();
      for (const request of requests) {
        try {
          const reg = await this.#registrationRepository.findByIdInTrimester(
            request.registrationId, request.trimester
          );
          if (reg) registrationMap.set(request.registrationId, reg);
        } catch (error) {
          this.logger.warn(`Could not fetch registration ${request.registrationId}:`, (error as Error).message);
        }
      }

      // Join in memory
      const enriched = requests.map(request => ({
        ...request,
        registration: registrationMap.get(request.registrationId) || null,
      }));

      this.logger.info(`✅ Found ${enriched.length} drop requests for parent ${parentId}`);
      return enriched;
    } catch (error) {
      this.logger.error('❌ Error getting drop requests by parent:', error);
      throw new Error(`Failed to get drop requests by parent: ${(error as Error).message}`);
    }
  }

  /**
   * Get a specific drop request by ID
   */
  async getDropRequestById(requestId: string): Promise<DropRequest> {
    try {
      this.logger.info(`🔍 Getting drop request ${requestId}`);

      const dropRequest = await this.#dropRequestRepository.findById(requestId);
      if (!dropRequest) {
        throw new NotFoundError(`Drop request not found: ${requestId}`);
      }

      return dropRequest;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ForbiddenError || error instanceof ConflictError) {
        throw error;
      }
      this.logger.error('❌ Error getting drop request by ID:', error);
      throw new Error(`Failed to get drop request: ${(error as Error).message}`);
    }
  }
}
