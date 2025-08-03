/**
 * User Controller - Application layer API endpoints for user management
 * Handles users, students, instructors, admins, and parents
 * 
 * Updated to use Domain-Driven Design architecture with service container
 * and application services for business logic coordination.
 */

import { UserTransformService } from '../../core/services/userTransformService.js';
import { serviceContainer } from '../../infrastructure/container/serviceContainer.js';
import { _fetchData } from '../../utils/helpers.js';

export class UserController {
  /**
   * Get current authenticated user
   */
  static async getAuthenticatedUser(req, res) {
    try {
      res.json(req.currentUser);
    } catch (error) {
      console.error('Error getting authenticated user:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get all admins
   */
  static async getAdmins(req, res) {
    try {
      const userRepository = serviceContainer.get('userRepository');
      const data = await userRepository.getAdmins();
      const transformedData = UserTransformService.transformArray(data, 'admin');
      res.json(transformedData);
    } catch (error) {
      console.error('Error getting admins:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get all instructors
   */
  static async getInstructors(req, res) {
    try {
      const userRepository = serviceContainer.get('userRepository');
      const data = await userRepository.getInstructors();
      const transformedData = UserTransformService.transformArray(data, 'instructor');
      res.json(transformedData);
    } catch (error) {
      console.error('Error getting instructors:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get students with pagination using application service
   * Now leverages domain-driven design with enriched business data
   */
  static async getStudents(req, res) {
    try {
      const request = req.body || {};
      
      // Use the student application service for business logic
      const studentApplicationService = serviceContainer.get('studentApplicationService');
      
      const options = {
        searchTerm: request.searchTerm,
        gradeLevel: request.gradeLevel,
        isActive: request.isActive,
        hasEmergencyContact: request.hasEmergencyContact,
        parentId: request.parentId,
        page: request.page || 1,
        pageSize: request.pageSize || 10,
        sortBy: request.sortBy || 'lastName',
        sortOrder: request.sortOrder || 'asc'
      };

      // Get enriched student data through application service
      const result = await studentApplicationService.getStudents(options);

      // Transform for UI compatibility with optional parent email enrichment
      const enrichedStudents = await Promise.all(result.students.map(async student => ({
        id: student.id,
        firstName: student.firstNickname || student.firstName,
        lastName: student.lastNickname || student.lastName,
        grade: student.grade,
        ageCategory: student.ageCategory,
        hasEmergencyContact: student.hasEmergencyContact,
        eligibilityStatus: student.eligibilityInfo.eligible ? 'eligible' : 'needs-attention',
        recommendedLessonDuration: student.recommendedLessonDuration,
        parentEmails: request.includeParentInfo ? await this.#getParentEmails(student.id) : undefined
      })));

      // For backward compatibility with existing pagination format
      const legacyResult = _fetchData(() => enrichedStudents, request.page || 0, request.pageSize || 10);

      // Enhance with domain insights
      legacyResult.domainInsights = {
        totalEligible: result.students.filter(s => s.eligibilityInfo.eligible).length,
        totalWithEmergencyContact: result.students.filter(s => s.hasEmergencyContact).length,
        averageRecommendedDuration: this.#calculateAverageRecommendedDuration(result.students)
      };

      res.json(legacyResult);

    } catch (error) {
      console.error('Error getting students:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get detailed student information using application service
   */
  static async getStudentDetails(req, res) {
    try {
      const { studentId } = req.params;
      const studentApplicationService = serviceContainer.get('studentApplicationService');
      
      const details = await studentApplicationService.getStudentDetails(studentId);
      
      res.json({
        success: true,
        data: details
      });

    } catch (error) {
      console.error('Error getting student details:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update student profile using application service
   */
  static async updateStudent(req, res) {
    try {
      const { studentId } = req.params;
      const updates = req.body;
      const userId = req.currentUser?.email || 'system';

      const studentApplicationService = serviceContainer.get('studentApplicationService');
      
      const result = await studentApplicationService.updateStudentProfile(studentId, updates, userId);
      
      res.json({
        success: true,
        data: result,
        message: 'Student profile updated successfully'
      });

    } catch (error) {
      console.error('Error updating student:', error);
      res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  /**
   * Enroll a new student using application service
   */
  static async enrollStudent(req, res) {
    try {
      const studentData = req.body;
      const userId = req.currentUser?.email || 'system';

      const studentApplicationService = serviceContainer.get('studentApplicationService');
      
      const result = await studentApplicationService.enrollStudent(studentData, userId);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Student enrolled successfully'
      });

    } catch (error) {
      console.error('Error enrolling student:', error);
      res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  /**
   * Validate student eligibility for a specific program
   */
  static async validateStudentEligibility(req, res) {
    try {
      const { studentId } = req.params;
      const { programType } = req.body;

      const studentApplicationService = serviceContainer.get('studentApplicationService');
      
      const eligibility = await studentApplicationService.validateProgramEligibility(studentId, programType);
      
      res.json({
        success: true,
        data: eligibility
      });

    } catch (error) {
      console.error('Error validating student eligibility:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Generate student progress report
   */
  static async getStudentProgressReport(req, res) {
    try {
      const { studentId } = req.params;

      const studentApplicationService = serviceContainer.get('studentApplicationService');
      
      const report = await studentApplicationService.generateProgressReport(studentId);
      
      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Error generating progress report:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Private method: Get parent emails for a student
   */
  static async #getParentEmails(studentId) {
    try {
      const userRepository = serviceContainer.get('userRepository');
      const student = await userRepository.getStudentById(studentId);
      
      if (!student) return '';

      const allParents = await userRepository.getParents();
      const parent1 = allParents.find(p => p.id === student.parent1Id);
      const parent2 = allParents.find(p => p.id === student.parent2Id);

      return [parent1?.email, parent2?.email].filter(email => email).join(', ');
    } catch (error) {
      console.error('Error getting parent emails:', error);
      return '';
    }
  }

  /**
   * Private method: Calculate average recommended lesson duration
   */
  static #calculateAverageRecommendedDuration(students) {
    if (students.length === 0) return 0;
    
    const total = students.reduce((sum, student) => sum + (student.recommendedLessonDuration || 0), 0);
    return Math.round(total / students.length);
  }
}
