/**
 * Student Application Service
 * 
 * Coordinates student-related operations including enrollment, profile management,
 * and communication with parents. Handles the application workflow for student
 * lifecycle management.
 */

import { Student } from '../../domain/entities/student.js';
import { StudentManagementService } from '../../domain/services/studentManagementService.js';

export class StudentApplicationService {
  constructor(dependencies) {
    this.studentRepository = dependencies.studentRepository;
    this.parentRepository = dependencies.parentRepository;
    this.registrationRepository = dependencies.registrationRepository;
    this.emailClient = dependencies.emailClient;
    this.auditService = dependencies.auditService;
  }

  /**
   * Enroll a new student with full workflow
   */
  async enrollStudent(studentData, userId) {
    try {
      console.log('👨‍🎓 Enrolling new student');

      // Step 1: Create domain entity and validate
      const student = Student.createNew(studentData.firstName, studentData.lastName, studentData);

      // Step 2: Check enrollment eligibility
      const eligibility = student.isEligibleForEnrollment();
      if (!eligibility.eligible) {
        throw new Error(`Student not eligible for enrollment: ${eligibility.missingRequirements.join(', ')}`);
      }

      // Step 3: Validate parent relationships if required
      if (student.requiresParentPermission()) {
        await this.#validateParentRelationships(student);
      }

      // Step 4: Check for duplicate students
      await this.#checkForDuplicateStudent(student);

      // Step 5: Persist the student
      const persistedStudent = await this.studentRepository.create(student.toDataObject());

      // Step 6: Audit logging
      if (this.auditService) {
        await this.auditService.logStudentEnrolled(persistedStudent, userId);
      }

      // Step 7: Send welcome communications
      await this.#sendWelcomeNotifications(student);

      console.log('✅ Student enrolled successfully:', persistedStudent.id);

      return {
        success: true,
        student: persistedStudent,
        eligibilityInfo: eligibility,
        ageCategory: student.getAgeCategory(),
        recommendedLessonDuration: student.getRecommendedLessonDuration()
      };

    } catch (error) {
      console.error('❌ Student enrollment failed:', error);
      
      if (this.auditService) {
        await this.auditService.logStudentEnrollmentFailed(studentData, error.message, userId);
      }

      throw error;
    }
  }

  /**
   * Update student profile with validation
   */
  async updateStudentProfile(studentId, updates, userId) {
    try {
      console.log('📝 Updating student profile:', studentId);

      // Get existing student
      const existingData = await this.studentRepository.findById(studentId);
      if (!existingData) {
        throw new Error(`Student not found: ${studentId}`);
      }

      // Create domain entity and apply updates
      const student = Student.fromDataObject(existingData);
      
      // Update contact information if provided
      if (updates.email || updates.emergencyContactName || updates.emergencyContactPhone) {
        student.updateContactInfo(
          updates.email,
          updates.emergencyContactName,
          updates.emergencyContactPhone
        );
      }

      // Update medical notes if provided
      if (updates.medicalNotes !== undefined) {
        student.addMedicalNotes(updates.medicalNotes);
      }

      // Update active status if provided
      if (updates.isActive !== undefined) {
        student.setActiveStatus(updates.isActive);
      }

      // Apply other field updates
      Object.keys(updates).forEach(key => {
        if (!['email', 'emergencyContactName', 'emergencyContactPhone', 'medicalNotes', 'isActive'].includes(key)) {
          if (student.hasOwnProperty(key)) {
            student[key] = updates[key];
          }
        }
      });

      // Re-validate eligibility after updates
      const eligibility = student.isEligibleForEnrollment();

      // Persist updates
      const updatedStudent = await this.studentRepository.update(studentId, student.toDataObject());

      // Audit logging
      if (this.auditService) {
        await this.auditService.logStudentUpdated(updatedStudent, updates, userId);
      }

      console.log('✅ Student profile updated successfully');

      return {
        success: true,
        student: updatedStudent,
        eligibilityInfo: eligibility
      };

    } catch (error) {
      console.error('❌ Student profile update failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive student information
   */
  async getStudentDetails(studentId) {
    try {
      const studentData = await this.studentRepository.findById(studentId);
      if (!studentData) {
        throw new Error(`Student not found: ${studentId}`);
      }

      const student = Student.fromDataObject(studentData);

      // Get related data
      const [registrations, parents] = await Promise.all([
        this.registrationRepository.findByStudentId(studentId),
        this.#getStudentParents(student)
      ]);

      return {
        student: student.toDataObject(),
        eligibilityInfo: student.isEligibleForEnrollment(),
        ageCategory: student.getAgeCategory(),
        recommendedLessonDuration: student.getRecommendedLessonDuration(),
        canTakeAdvancedLessons: student.canTakeAdvancedLessons(),
        needsSpecialAccommodations: student.needsSpecialAccommodations(),
        requiresParentPermission: student.requiresParentPermission(),
        registrations,
        parents,
        hasEmergencyContact: student.hasEmergencyContact()
      };

    } catch (error) {
      console.error('❌ Failed to get student details:', error);
      throw error;
    }
  }

  /**
   * Get students by various criteria with pagination
   */
  async getStudents(options = {}) {
    try {
      const students = await this.studentRepository.findPaginated(options);
      
      // Enrich student data with domain insights
      const enrichedStudents = students.students.map(studentData => {
        const student = Student.fromDataObject(studentData);
        return {
          ...student.toDataObject(),
          ageCategory: student.getAgeCategory(),
          eligibilityInfo: student.isEligibleForEnrollment(),
          hasEmergencyContact: student.hasEmergencyContact(),
          recommendedLessonDuration: student.getRecommendedLessonDuration()
        };
      });

      return {
        ...students,
        students: enrichedStudents
      };

    } catch (error) {
      console.error('❌ Failed to get students:', error);
      throw error;
    }
  }

  /**
   * Validate student eligibility for specific program
   */
  async validateProgramEligibility(studentId, programType) {
    try {
      const studentData = await this.studentRepository.findById(studentId);
      if (!studentData) {
        throw new Error(`Student not found: ${studentId}`);
      }

      const student = Student.fromDataObject(studentData);

      // Use domain service for program-specific validation
      const eligibility = StudentManagementService.validateEnrollmentEligibility(student, { programType });

      return {
        eligible: eligibility.isEligible,
        requirements: eligibility.requirements,
        missing: eligibility.missingRequirements,
        ageCategory: student.getAgeCategory(),
        canTakeAdvanced: student.canTakeAdvancedLessons()
      };

    } catch (error) {
      console.error('❌ Program eligibility validation failed:', error);
      throw error;
    }
  }

  /**
   * Generate student progress report
   */
  async generateProgressReport(studentId) {
    try {
      const [studentData, registrations] = await Promise.all([
        this.studentRepository.findById(studentId),
        this.registrationRepository.findByStudentId(studentId)
      ]);

      if (!studentData) {
        throw new Error(`Student not found: ${studentId}`);
      }

      const student = Student.fromDataObject(studentData);

      // Calculate progress metrics
      const activeRegistrations = registrations.filter(reg => reg.isActive);
      const totalLessons = registrations.length;
      const instruments = [...new Set(registrations.map(reg => reg.instrument))];

      return {
        student: {
          name: student.getFullName(),
          ageCategory: student.getAgeCategory(),
          enrollmentDate: student.createdAt
        },
        summary: {
          totalRegistrations: totalLessons,
          activeRegistrations: activeRegistrations.length,
          instrumentsStudied: instruments,
          averageLessonDuration: this.#calculateAverageLessonDuration(registrations)
        },
        eligibility: student.isEligibleForEnrollment(),
        recommendations: {
          canTakeAdvanced: student.canTakeAdvancedLessons(),
          recommendedDuration: student.getRecommendedLessonDuration(),
          needsAccommodations: student.needsSpecialAccommodations()
        }
      };

    } catch (error) {
      console.error('❌ Failed to generate progress report:', error);
      throw error;
    }
  }

  /**
   * Private method: Validate parent relationships
   */
  async #validateParentRelationships(student) {
    if (!student.hasAssignedParents()) {
      throw new Error('Student requires parent assignment but none provided');
    }

    const parentPromises = [];
    if (student.parent1Id) {
      parentPromises.push(this.parentRepository.findById(student.parent1Id));
    }
    if (student.parent2Id) {
      parentPromises.push(this.parentRepository.findById(student.parent2Id));
    }

    const parents = await Promise.all(parentPromises);
    const missingParents = parents.filter(parent => !parent);

    if (missingParents.length > 0) {
      throw new Error('One or more assigned parents not found');
    }
  }

  /**
   * Private method: Check for duplicate students
   */
  async #checkForDuplicateStudent(student) {
    const existingStudents = await this.studentRepository.search(`${student.firstName} ${student.lastName}`);
    
    const potentialDuplicates = existingStudents.filter(existing => {
      const existingStudent = Student.fromDataObject(existing);
      return existingStudent.firstName.toLowerCase() === student.firstName.toLowerCase() &&
             existingStudent.lastName.toLowerCase() === student.lastName.toLowerCase() &&
             existingStudent.isActive;
    });

    if (potentialDuplicates.length > 0) {
      console.warn('⚠️ Potential duplicate student detected:', potentialDuplicates);
      // Could implement more sophisticated duplicate detection here
    }
  }

  /**
   * Private method: Get student's parents
   */
  async #getStudentParents(student) {
    const parentPromises = [];
    
    if (student.parent1Id) {
      parentPromises.push(this.parentRepository.findById(student.parent1Id));
    }
    if (student.parent2Id) {
      parentPromises.push(this.parentRepository.findById(student.parent2Id));
    }

    if (parentPromises.length === 0) {
      return [];
    }

    const parents = await Promise.all(parentPromises);
    return parents.filter(parent => parent !== null);
  }

  /**
   * Private method: Send welcome notifications
   */
  async #sendWelcomeNotifications(student) {
    try {
      if (!this.emailClient) return;

      if (student.email) {
        await this.emailClient.sendEmail({
          to: student.email.value,
          subject: 'Welcome to Tonic Music Program!',
          html: this.#generateWelcomeEmail(student)
        });
      }

      // Send to parents if student is a minor
      if (student.requiresParentPermission()) {
        const parents = await this.#getStudentParents(student);
        const parentEmails = parents.filter(parent => parent.email).map(parent => parent.email);

        if (parentEmails.length > 0) {
          await this.emailClient.sendEmail({
            to: parentEmails,
            subject: 'Your Child Has Been Enrolled - Tonic Music Program',
            html: this.#generateParentWelcomeEmail(student)
          });
        }
      }

      console.log('📧 Welcome notifications sent');

    } catch (error) {
      console.error('❌ Failed to send welcome notifications:', error);
      // Don't throw - email failure shouldn't fail enrollment
    }
  }

  /**
   * Private method: Generate welcome email HTML
   */
  #generateWelcomeEmail(student) {
    return `
      <h2>Welcome to Tonic Music Program!</h2>
      <p>Dear ${student.firstName},</p>
      <p>We're excited to welcome you to the Tonic Music Program!</p>
      <p>Your enrollment has been processed and you're ready to begin your musical journey.</p>
      <p><strong>Your Profile:</strong></p>
      <ul>
        <li>Age Category: ${student.getAgeCategory()}</li>
        <li>Recommended Lesson Duration: ${student.getRecommendedLessonDuration()} minutes</li>
        ${student.canTakeAdvancedLessons() ? '<li>Eligible for advanced lessons</li>' : ''}
      </ul>
      <p>We look forward to seeing you soon!</p>
      <p>Best regards,<br>Tonic Music Program</p>
    `;
  }

  /**
   * Private method: Generate parent welcome email HTML
   */
  #generateParentWelcomeEmail(student) {
    return `
      <h2>Your Child Has Been Enrolled!</h2>
      <p>Dear Parent/Guardian,</p>
      <p>We're pleased to confirm that ${student.firstName} has been enrolled in the Tonic Music Program.</p>
      <p><strong>Student Information:</strong></p>
      <ul>
        <li>Name: ${student.getFullName()}</li>
        <li>Age Category: ${student.getAgeCategory()}</li>
        <li>Recommended Lesson Duration: ${student.getRecommendedLessonDuration()} minutes</li>
      </ul>
      <p>We'll be in touch soon to schedule the first lesson.</p>
      <p>Best regards,<br>Tonic Music Program</p>
    `;
  }

  /**
   * Private method: Calculate average lesson duration
   */
  #calculateAverageLessonDuration(registrations) {
    if (registrations.length === 0) return 0;
    
    const totalDuration = registrations.reduce((sum, reg) => sum + (reg.length || 0), 0);
    return Math.round(totalDuration / registrations.length);
  }
}
