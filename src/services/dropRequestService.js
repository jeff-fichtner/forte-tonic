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

/**
 * Custom error classes for drop request operations
 */
export class DropRequestError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'DropRequestError';
    this.statusCode = statusCode;
  }
}

export class DropRequestNotFoundError extends DropRequestError {
  constructor(requestId) {
    super(`Drop request not found: ${requestId}`, 404);
    this.name = 'DropRequestNotFoundError';
  }
}

export class UnauthorizedDropRequestError extends DropRequestError {
  constructor(message = 'You are not authorized to access this drop request') {
    super(message, 403);
    this.name = 'UnauthorizedDropRequestError';
  }
}

export class InvalidPeriodError extends DropRequestError {
  constructor() {
    super('Drop requests can only be submitted during active registration periods', 400);
    this.name = 'InvalidPeriodError';
  }
}

export class DuplicateDropRequestError extends DropRequestError {
  constructor() {
    super('A pending drop request already exists for this registration', 409);
    this.name = 'DuplicateDropRequestError';
  }
}

export class RegistrationNotFoundError extends DropRequestError {
  constructor(registrationId) {
    super(`Registration not found: ${registrationId}`, 404);
    this.name = 'RegistrationNotFoundError';
  }
}

export class InvalidStatusTransitionError extends DropRequestError {
  constructor(currentStatus, newStatus) {
    super(
      `Invalid status transition from ${currentStatus} to ${newStatus}. Only pending requests can be approved or rejected.`,
      400
    );
    this.name = 'InvalidStatusTransitionError';
  }
}

/**
 * Drop Request Service
 */
export class DropRequestService extends BaseService {
  /**
   * @param {object} dropRequestRepository - Drop request repository
   * @param {object} registrationRepository - Registration repository
   * @param {object} studentRepository - Student repository
   * @param {object} periodService - Period service for period validation
   * @param {object} configService - Configuration service for logger
   */
  constructor(
    dropRequestRepository,
    registrationRepository,
    studentRepository,
    periodService,
    configService
  ) {
    super(configService);
    this.dropRequestRepository = dropRequestRepository;
    this.registrationRepository = registrationRepository;
    this.studentRepository = studentRepository;
    this.periodService = periodService;
  }

  /**
   * Create a new drop request
   * @param {string} registrationId - Registration UUID to drop
   * @param {string} parentId - Parent UUID submitting the request
   * @param {string} reason - Reason for dropping
   * @returns {Promise<object>} Created drop request
   * @throws {InvalidPeriodError} If not during registration period
   * @throws {RegistrationNotFoundError} If registration doesn't exist
   * @throws {UnauthorizedDropRequestError} If parent doesn't own the student
   * @throws {DuplicateDropRequestError} If pending request already exists
   */
  async createDropRequest(registrationId, parentId, reason) {
    try {
      this.logger.info(
        `📝 Creating drop request for registration ${registrationId} by parent ${parentId}`
      );

      // 1. Validate current period (must be registration period)
      const currentPeriod = await this.periodService.getCurrentPeriod();
      if (!currentPeriod || currentPeriod.periodType !== PeriodType.REGISTRATION) {
        this.logger.warn(
          `Drop request rejected: Not in registration period (current: ${currentPeriod?.periodType})`
        );
        throw new InvalidPeriodError();
      }

      // 2. Verify registration exists and determine which trimester it belongs to
      let registration = null;
      let trimester = null;

      // Check each trimester to find the registration
      const trimesters = ['fall', 'winter', 'spring'];
      for (const tri of trimesters) {
        try {
          const tableRegistrations =
            await this.registrationRepository.getRegistrationsByTrimester(tri);
          const found = tableRegistrations.find(reg => reg.id.getValue() === registrationId);

          if (found) {
            registration = found;
            trimester = tri;
            this.logger.info(`Found registration in ${trimester} trimester`);
            break;
          }
        } catch (error) {
          // Continue checking other trimesters
          this.logger.debug(`Registration not found in ${tri}:`, error.message);
        }
      }

      if (!registration) {
        this.logger.warn(`Drop request rejected: Registration not found ${registrationId}`);
        throw new RegistrationNotFoundError(registrationId);
      }

      // 3. Verify parent owns the student
      const studentId = registration.studentId.value || registration.studentId;
      const student = await this.studentRepository.getStudentById(studentId);

      if (!student) {
        this.logger.error(`Student not found for registration: ${studentId}`);
        throw new DropRequestError(`Student not found: ${studentId}`, 500);
      }

      // Check parent ownership - handle both parent1Id and parent2Id
      const parent1Id = student.parent1Id?.getValue?.() || student.parent1Id;
      const parent2Id = student.parent2Id?.getValue?.() || student.parent2Id;

      // Extract email from composite parent ID (format: email_lastname_firstname)
      const parentEmail = parentId.split('_')[0];

      // Check if parent ID or parent email matches either parent
      const isParent1 = parent1Id === parentId || parent1Id === parentEmail;
      const isParent2 = parent2Id === parentId || parent2Id === parentEmail;

      if (!isParent1 && !isParent2) {
        this.logger.warn(
          `Drop request rejected: Parent ${parentId} (email: ${parentEmail}) does not own student ${studentId} (parent1: ${parent1Id}, parent2: ${parent2Id})`
        );
        throw new UnauthorizedDropRequestError();
      }

      // 4. Check for existing pending drop request
      const existingRequest = await this.dropRequestRepository.findByRegistrationId(registrationId);
      if (existingRequest && existingRequest.status === DropRequestStatus.PENDING) {
        this.logger.warn(
          `Drop request rejected: Pending request already exists ${existingRequest.id}`
        );
        throw new DuplicateDropRequestError();
      }

      // 5. Create the drop request
      const dropRequest = await this.dropRequestRepository.create(
        {
          registrationId,
          parentId,
          trimester,
          reason,
          status: DropRequestStatus.PENDING,
        },
        parentId // createdBy
      );

      this.logger.info(`✅ Created drop request ${dropRequest.id}`);
      return dropRequest;
    } catch (error) {
      if (error instanceof DropRequestError) {
        throw error; // Re-throw known errors
      }
      this.logger.error('❌ Error creating drop request:', error);
      throw new DropRequestError(`Failed to create drop request: ${error.message}`, 500);
    }
  }

  /**
   * Approve a drop request and delete the associated registration
   * @param {string} requestId - Drop request UUID
   * @param {string} adminEmail - Admin email performing the approval
   * @param {string} adminNotes - Optional admin notes
   * @returns {Promise<object>} Updated drop request
   * @throws {DropRequestNotFoundError} If request doesn't exist
   * @throws {InvalidStatusTransitionError} If request is not pending
   */
  async approveDropRequest(requestId, adminEmail, adminNotes = '') {
    try {
      this.logger.info(`✅ Approving drop request ${requestId} by admin ${adminEmail}`);

      // 1. Find the drop request
      const dropRequest = await this.dropRequestRepository.findById(requestId);
      if (!dropRequest) {
        throw new DropRequestNotFoundError(requestId);
      }

      // 2. Validate status transition
      if (dropRequest.status !== DropRequestStatus.PENDING) {
        throw new InvalidStatusTransitionError(dropRequest.status, DropRequestStatus.APPROVED);
      }

      // 3. Delete the registration
      this.logger.info(`🗑️ Deleting registration ${dropRequest.registrationId}`);
      await this.registrationRepository.delete(dropRequest.registrationId, adminEmail);

      // 4. Update drop request status
      const updated = await this.dropRequestRepository.update(
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
      if (error instanceof DropRequestError) {
        throw error;
      }
      this.logger.error('❌ Error approving drop request:', error);
      throw new DropRequestError(`Failed to approve drop request: ${error.message}`, 500);
    }
  }

  /**
   * Reject a drop request (registration remains active)
   * @param {string} requestId - Drop request UUID
   * @param {string} adminEmail - Admin email performing the rejection
   * @param {string} adminNotes - Optional admin notes
   * @returns {Promise<object>} Updated drop request
   * @throws {DropRequestNotFoundError} If request doesn't exist
   * @throws {InvalidStatusTransitionError} If request is not pending
   */
  async rejectDropRequest(requestId, adminEmail, adminNotes = '') {
    try {
      this.logger.info(`❌ Rejecting drop request ${requestId} by admin ${adminEmail}`);

      // 1. Find the drop request
      const dropRequest = await this.dropRequestRepository.findById(requestId);
      if (!dropRequest) {
        throw new DropRequestNotFoundError(requestId);
      }

      // 2. Validate status transition
      if (dropRequest.status !== DropRequestStatus.PENDING) {
        throw new InvalidStatusTransitionError(dropRequest.status, DropRequestStatus.REJECTED);
      }

      // 3. Update drop request status (registration stays active)
      const updated = await this.dropRequestRepository.update(
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
      if (error instanceof DropRequestError) {
        throw error;
      }
      this.logger.error('❌ Error rejecting drop request:', error);
      throw new DropRequestError(`Failed to reject drop request: ${error.message}`, 500);
    }
  }

  /**
   * Get all pending drop requests (for admin view)
   * Enriches with related student and registration data
   * @returns {Promise<Array>} Array of enriched drop requests
   */
  async getPendingDropRequests() {
    try {
      this.logger.info('📋 Getting all pending drop requests');

      const pendingRequests = await this.dropRequestRepository.findByStatus(
        DropRequestStatus.PENDING
      );

      // Load students ONCE (cached at DB layer, but avoids repeated method calls)
      const allStudents = await this.studentRepository.getStudents();

      // Create lookup map for O(1) access
      const studentMap = new Map();
      allStudents.forEach(student => {
        const id = student.id?.getValue?.() || student.id;
        studentMap.set(id, student);
      });

      // Enrich with related data - no async calls in loop
      const enriched = await Promise.all(
        pendingRequests.map(async request => {
          try {
            const registration = await this.registrationRepository.getById(request.registrationId);
            if (!registration) {
              this.logger.warn(`Registration not found for drop request ${request.id}`);
              return {
                ...request,
                registration: null,
                student: null,
              };
            }

            const studentId = registration.studentId.getValue();
            const student = studentMap.get(studentId) || null;

            return {
              ...request,
              registration: registration,
              student: student,
            };
          } catch (error) {
            this.logger.error(`Error enriching drop request ${request.id}:`, error);
            return {
              ...request,
              registration: null,
              student: null,
            };
          }
        })
      );

      this.logger.info(`✅ Found ${enriched.length} pending drop requests`);
      return enriched;
    } catch (error) {
      this.logger.error('❌ Error getting pending drop requests:', error);
      throw new DropRequestError(`Failed to get pending drop requests: ${error.message}`, 500);
    }
  }

  /**
   * Get all drop requests for a specific parent
   * @param {string} parentId - Parent UUID
   * @returns {Promise<Array>} Array of drop requests
   */
  async getDropRequestsByParent(parentId) {
    try {
      this.logger.info(`📋 Getting drop requests for parent ${parentId}`);

      const requests = await this.dropRequestRepository.findByParentId(parentId);

      // Enrich with registration data
      const enriched = await Promise.all(
        requests.map(async request => {
          try {
            const registration = await this.registrationRepository.getById(request.registrationId);
            return {
              ...request,
              registration: registration || null,
            };
          } catch (error) {
            this.logger.error(`Error enriching drop request ${request.id}:`, error);
            return {
              ...request,
              registration: null,
            };
          }
        })
      );

      this.logger.info(`✅ Found ${enriched.length} drop requests for parent ${parentId}`);
      return enriched;
    } catch (error) {
      this.logger.error('❌ Error getting drop requests by parent:', error);
      throw new DropRequestError(`Failed to get drop requests by parent: ${error.message}`, 500);
    }
  }

  /**
   * Get a specific drop request by ID
   * @param {string} requestId - Drop request UUID
   * @returns {Promise<object>} Drop request
   * @throws {DropRequestNotFoundError} If request doesn't exist
   */
  async getDropRequestById(requestId) {
    try {
      this.logger.info(`🔍 Getting drop request ${requestId}`);

      const dropRequest = await this.dropRequestRepository.findById(requestId);
      if (!dropRequest) {
        throw new DropRequestNotFoundError(requestId);
      }

      return dropRequest;
    } catch (error) {
      if (error instanceof DropRequestError) {
        throw error;
      }
      this.logger.error('❌ Error getting drop request by ID:', error);
      throw new DropRequestError(`Failed to get drop request: ${error.message}`, 500);
    }
  }
}
