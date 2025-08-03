/**
 * Registration Application Service
 * 
 * Coordinates registration operations between domain services, repositories,
 * and external services. Handles the application workflow for registration
 * processes including validation, conflict checking, and persistence.
 */

import { RegistrationValidationService } from '../../domain/services/registrationValidationService.js';
import { RegistrationConflictService } from '../../domain/services/registrationConflictService.js';
import { StudentManagementService } from '../../domain/services/studentManagementService.js';
import { ProgramManagementService } from '../../domain/services/programManagementService.js';
import { Registration } from '../../domain/entities/registration.js';

export class RegistrationApplicationService {
  constructor(dependencies) {
    this.registrationRepository = dependencies.registrationRepository;
    this.userRepository = dependencies.userRepository;
    this.programRepository = dependencies.programRepository;
    this.emailClient = dependencies.emailClient;
    this.auditService = dependencies.auditService;
  }

  /**
   * Process a new registration with full workflow
   */
  async processRegistration(registrationData, userId) {
    try {
      console.log('🎵 Processing new registration');

      // Step 1: Validate basic registration data
      const basicValidation = RegistrationValidationService.validateRegistrationData(registrationData);
      if (!basicValidation.isValid) {
        throw new Error(`Registration validation failed: ${basicValidation.errors.join(', ')}`);
      }

      // Step 2: Get related entities
      const [student, instructor, groupClass] = await Promise.all([
        this.userRepository.getStudentById(registrationData.studentId),
        this.userRepository.getInstructorById(registrationData.instructorId),
        registrationData.classId ? this.programRepository.getClassById(registrationData.classId) : null
      ]);

      if (!student) {
        throw new Error(`Student not found: ${registrationData.studentId}`);
      }

      if (!instructor) {
        throw new Error(`Instructor not found: ${registrationData.instructorId}`);
      }

      // Step 3: Student enrollment eligibility check
      const eligibility = StudentManagementService.validateEnrollmentEligibility(student, registrationData);
      if (!eligibility.isEligible) {
        throw new Error(`Student not eligible for enrollment: ${eligibility.errors.join(', ')}`);
      }

      // Step 4: Program-specific validation
      const programValidation = ProgramManagementService.validateRegistration(
        registrationData, 
        groupClass, 
        instructor
      );
      if (!programValidation.isValid) {
        throw new Error(`Program validation failed: ${programValidation.errors.join(', ')}`);
      }

      // Step 5: Check for conflicts with existing registrations
      const existingRegistrations = await this.registrationRepository.findAll();
      const conflictCheck = await RegistrationConflictService.checkConflicts(
        registrationData,
        existingRegistrations
      );

      if (conflictCheck.hasConflicts) {
        throw new Error(`Registration conflicts detected: ${conflictCheck.conflicts.map(c => c.message).join('; ')}`);
      }

      // Step 6: Create domain entity
      const registrationEntity = Registration.createNew(
        registrationData.studentId,
        registrationData.instructorId,
        registrationData.registrationType,
        registrationData.day,
        registrationData.startTime,
        registrationData.length,
        {
          id: RegistrationConflictService.generateRegistrationId(registrationData),
          instrument: registrationData.instrument,
          roomId: registrationData.roomId,
          classId: registrationData.classId,
          className: registrationData.className,
          transportationType: registrationData.transportationType,
          notes: registrationData.notes,
          expectedStartDate: registrationData.expectedStartDate,
          registeredBy: userId
        }
      );

      // Step 7: Persist the registration
      const persistedRegistration = await this.registrationRepository.create(registrationEntity.toDataObject());

      // Step 8: Audit logging
      if (this.auditService) {
        await this.auditService.logRegistrationCreated(persistedRegistration, userId);
      }

      // Step 9: Send confirmation emails
      await this.#sendRegistrationConfirmation(registrationEntity, student, instructor);

      console.log('✅ Registration processed successfully:', persistedRegistration.id);

      return {
        success: true,
        registration: persistedRegistration,
        enrollmentInfo: eligibility,
        lessonSchedule: registrationEntity.generateLessonSchedule()
      };

    } catch (error) {
      console.error('❌ Registration processing failed:', error);
      
      // Audit failure
      if (this.auditService) {
        await this.auditService.logRegistrationFailed(registrationData, error.message, userId);
      }

      throw error;
    }
  }

  /**
   * Cancel a registration with workflow
   */
  async cancelRegistration(registrationId, reason, userId) {
    try {
      console.log('🚫 Cancelling registration:', registrationId);

      // Get existing registration
      const existingData = await this.registrationRepository.findById(registrationId);
      if (!existingData) {
        throw new Error(`Registration not found: ${registrationId}`);
      }

      // Create domain entity to access business rules
      const registration = Registration.fromDataObject(existingData);

      // Check if cancellation is allowed
      const cancellationCheck = registration.canBeCancelled();
      if (!cancellationCheck.canCancel) {
        if (cancellationCheck.requiresManagerialApproval) {
          // Special handling for cases requiring approval
          return await this.#requestCancellationApproval(registration, reason, userId);
        }
        throw new Error(cancellationCheck.reason);
      }

      // Perform cancellation
      await this.registrationRepository.delete(registrationId, userId);

      // Get student and instructor for notifications
      const [student, instructor] = await Promise.all([
        this.userRepository.getStudentById(registration.studentId.value),
        this.userRepository.getInstructorById(registration.instructorId.value)
      ]);

      // Audit logging
      if (this.auditService) {
        await this.auditService.logRegistrationCancelled(registration, reason, userId);
      }

      // Send cancellation notifications
      await this.#sendCancellationNotification(registration, student, instructor, reason);

      console.log('✅ Registration cancelled successfully');

      return {
        success: true,
        cancellationInfo: cancellationCheck,
        refundEligible: cancellationCheck.refundEligible,
        cancellationFee: cancellationCheck.cancellationFee
      };

    } catch (error) {
      console.error('❌ Registration cancellation failed:', error);
      throw error;
    }
  }

  /**
   * Get registration details with enriched information
   */
  async getRegistrationDetails(registrationId) {
    try {
      const registrationData = await this.registrationRepository.findById(registrationId);
      if (!registrationData) {
        throw new Error(`Registration not found: ${registrationId}`);
      }

      const registration = Registration.fromDataObject(registrationData);

      // Get related entities
      const [student, instructor, groupClass] = await Promise.all([
        this.userRepository.getStudentById(registration.studentId.value),
        this.userRepository.getInstructorById(registration.instructorId.value),
        registration.classId ? this.programRepository.getClassById(registration.classId) : null
      ]);

      return {
        registration: registration.toDataObject(),
        student,
        instructor,
        groupClass,
        lessonSchedule: registration.generateLessonSchedule(),
        nextLessonDate: registration.getNextLessonDate(),
        canModify: registration.canBeModified(),
        cancellationInfo: registration.canBeCancelled(),
        totalCost: registration.calculateLessonCost(),
        requiresTransportation: registration.requiresTransportation()
      };

    } catch (error) {
      console.error('❌ Failed to get registration details:', error);
      throw error;
    }
  }

  /**
   * Get registrations by student with enriched data
   */
  async getStudentRegistrations(studentId) {
    try {
      const registrations = await this.registrationRepository.findByStudentId(studentId);
      
      const enrichedRegistrations = await Promise.all(
        registrations.map(async (regData) => {
          const registration = Registration.fromDataObject(regData);
          const instructor = await this.userRepository.getInstructorById(registration.instructorId.value);
          
          return {
            ...registration.toDataObject(),
            instructor,
            nextLessonDate: registration.getNextLessonDate(),
            canModify: registration.canBeModified(),
            totalCost: registration.calculateLessonCost()
          };
        })
      );

      return enrichedRegistrations;

    } catch (error) {
      console.error('❌ Failed to get student registrations:', error);
      throw error;
    }
  }

  /**
   * Private method: Send registration confirmation emails
   */
  async #sendRegistrationConfirmation(registration, student, instructor) {
    try {
      if (!this.emailClient) return;

      const emailPromises = [];

      // Email to student/parent
      if (student.email) {
        emailPromises.push(
          this.emailClient.sendEmail({
            to: student.email,
            subject: 'Registration Confirmation - Tonic Music Program',
            html: this.#generateConfirmationEmail(registration, student, instructor)
          })
        );
      }

      // Email to instructor
      if (instructor.email) {
        emailPromises.push(
          this.emailClient.sendEmail({
            to: instructor.email,
            subject: 'New Student Registration - Tonic Music Program',
            html: this.#generateInstructorNotificationEmail(registration, student, instructor)
          })
        );
      }

      await Promise.all(emailPromises);
      console.log('📧 Registration confirmation emails sent');

    } catch (error) {
      console.error('❌ Failed to send confirmation emails:', error);
      // Don't throw - email failure shouldn't fail the registration
    }
  }

  /**
   * Private method: Send cancellation notification
   */
  async #sendCancellationNotification(registration, student, instructor, reason) {
    try {
      if (!this.emailClient) return;

      const emailPromises = [];

      // Email to student/parent
      if (student.email) {
        emailPromises.push(
          this.emailClient.sendEmail({
            to: student.email,
            subject: 'Registration Cancelled - Tonic Music Program',
            html: this.#generateCancellationEmail(registration, student, reason)
          })
        );
      }

      // Email to instructor
      if (instructor.email) {
        emailPromises.push(
          this.emailClient.sendEmail({
            to: instructor.email,
            subject: 'Student Registration Cancelled - Tonic Music Program',
            html: this.#generateInstructorCancellationEmail(registration, student, reason)
          })
        );
      }

      await Promise.all(emailPromises);
      console.log('📧 Cancellation notification emails sent');

    } catch (error) {
      console.error('❌ Failed to send cancellation emails:', error);
    }
  }

  /**
   * Private method: Generate confirmation email HTML
   */
  #generateConfirmationEmail(registration, student, instructor) {
    return `
      <h2>Registration Confirmation</h2>
      <p>Dear ${student.firstName},</p>
      <p>Your registration has been confirmed for:</p>
      <ul>
        <li><strong>Instructor:</strong> ${instructor.firstName} ${instructor.lastName}</li>
        <li><strong>Day:</strong> ${registration.day}</li>
        <li><strong>Time:</strong> ${registration.lessonTime.toString()}</li>
        <li><strong>Instrument:</strong> ${registration.instrument}</li>
        <li><strong>Start Date:</strong> ${registration.expectedStartDate.toDateString()}</li>
      </ul>
      <p>We look forward to seeing you at your first lesson!</p>
      <p>Best regards,<br>Tonic Music Program</p>
    `;
  }

  /**
   * Private method: Generate instructor notification email
   */
  #generateInstructorNotificationEmail(registration, student, instructor) {
    return `
      <h2>New Student Registration</h2>
      <p>Dear ${instructor.firstName},</p>
      <p>You have a new student registration:</p>
      <ul>
        <li><strong>Student:</strong> ${student.firstName} ${student.lastName}</li>
        <li><strong>Day:</strong> ${registration.day}</li>
        <li><strong>Time:</strong> ${registration.lessonTime.toString()}</li>
        <li><strong>Instrument:</strong> ${registration.instrument}</li>
        <li><strong>Start Date:</strong> ${registration.expectedStartDate.toDateString()}</li>
      </ul>
      <p>Please prepare for the first lesson accordingly.</p>
      <p>Best regards,<br>Tonic Music Program</p>
    `;
  }

  /**
   * Private method: Generate cancellation email HTML
   */
  #generateCancellationEmail(registration, student, reason) {
    return `
      <h2>Registration Cancelled</h2>
      <p>Dear ${student.firstName},</p>
      <p>Your registration has been cancelled:</p>
      <ul>
        <li><strong>Day:</strong> ${registration.day}</li>
        <li><strong>Time:</strong> ${registration.lessonTime.toString()}</li>
        <li><strong>Reason:</strong> ${reason}</li>
      </ul>
      <p>If you have any questions, please contact us.</p>
      <p>Best regards,<br>Tonic Music Program</p>
    `;
  }

  /**
   * Private method: Generate instructor cancellation email
   */
  #generateInstructorCancellationEmail(registration, student, reason) {
    return `
      <h2>Student Registration Cancelled</h2>
      <p>A student registration has been cancelled:</p>
      <ul>
        <li><strong>Student:</strong> ${student.firstName} ${student.lastName}</li>
        <li><strong>Day:</strong> ${registration.day}</li>
        <li><strong>Time:</strong> ${registration.lessonTime.toString()}</li>
        <li><strong>Reason:</strong> ${reason}</li>
      </ul>
      <p>Please update your schedule accordingly.</p>
      <p>Best regards,<br>Tonic Music Program</p>
    `;
  }

  /**
   * Private method: Request cancellation approval for special cases
   */
  async #requestCancellationApproval(registration, reason, userId) {
    // This would typically create a workflow/approval request
    // For now, return a pending status
    return {
      success: false,
      status: 'pending_approval',
      message: 'Cancellation requires managerial approval due to timing constraints',
      approvalRequired: true
    };
  }

  /**
   * Get registrations with filtering and pagination
   */
  async getRegistrations(options = {}) {
    try {
      console.log('📋 Getting registrations with options:', options);

      // Get registrations from repository
      const registrations = await this.registrationRepository.getRegistrations(options);

      // Enrich registrations with student and instructor details
      const enrichedRegistrations = await Promise.all(
        registrations.map(async (registration) => {
          const [student, instructor, groupClass] = await Promise.all([
            this.userRepository.getStudentById(registration.studentId),
            this.userRepository.getInstructorById(registration.instructorId),
            registration.classId ? this.programRepository.getClassById(registration.classId) : null
          ]);

          return {
            ...registration,
            student: student ? {
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email,
              grade: student.grade
            } : null,
            instructor: instructor ? {
              id: instructor.id,
              firstName: instructor.firstName,
              lastName: instructor.lastName,
              email: instructor.email
            } : null,
            class: groupClass ? {
              id: groupClass.id,
              name: groupClass.name,
              instrument: groupClass.instrument,
              capacity: groupClass.capacity
            } : null,
            // Add business logic flags
            hasConflicts: false, // TODO: Implement conflict detection
            isActive: registration.status === 'active'
          };
        })
      );

      console.log(`📊 Found ${enrichedRegistrations.length} registrations`);

      return {
        registrations: enrichedRegistrations,
        totalCount: enrichedRegistrations.length,
        page: options.page || 1,
        pageSize: options.pageSize || 10
      };

    } catch (error) {
      console.error('❌ Error getting registrations:', error);
      throw error;
    }
  }
}
