/**
 * User Controller - Application layer API endpoints for user management
 * Handles users, students, instructors, admins, and parents
 *
 * Updated to use Domain-Driven Design architecture with service container
 * and application services for business logic coordination.
 */

import { UserTransformService } from '../services/userTransformService.js';
import { serviceContainer } from '../infrastructure/container/serviceContainer.js';
import { _fetchData } from '../utils/helpers.js';
import { AuthenticatedUserResponse } from '../models/shared/responses/authenticatedUserResponse.js';
import { OperatorUserResponse } from '../models/shared/responses/operatorUserResponse.js';
import { currentConfig } from '../config/environment.js';

export class UserController {
  /**
   * Get current operator user
   */
  static async getOperatorUser(req, res) {
    try {
      console.log('Temporarily bypassing operator user retrieval');
      return res.json(null);

      // Get operator email from environment
      const operatorEmail = currentConfig.operatorEmail;
      if (!operatorEmail) {
        console.log('No OPERATOR_EMAIL set - returning null');
        return res.json(null);
      }

      const userRepository = req.userRepository || serviceContainer.get('userRepository');

      // Check if the operator email exists in the roles table
      const operatorRole = await userRepository.getOperatorByEmail(operatorEmail);
      if (!operatorRole) {
        console.log(`Operator email ${operatorEmail} not found in roles table - returning null`);
        return res.json(null);
      }

      // Get user data based on roles
      let admin = null;
      let instructor = null;
      let parent = null;

      if (operatorRole.admin) {
        admin = await userRepository.getAdminByAccessCode(operatorRole.admin);
        if (!admin) {
          console.warn(`Admin with access code ${operatorRole.admin} not found`);
        }
      }

      if (operatorRole.instructor) {
        instructor = await userRepository.getInstructorByAccessCode(operatorRole.instructor);
        if (!instructor) {
          console.warn(`Instructor with access code ${operatorRole.instructor} not found`);
        }
      }

      if (operatorRole.parent) {
        parent = await userRepository.getParentByAccessCode(operatorRole.parent);
        if (!parent) {
          console.warn(`Parent with access code ${operatorRole.parent} not found`);
        }
      }

      const operatorUser = new OperatorUserResponse(
        operatorEmail,
        admin,
        instructor,
        parent
      );

      res.json(operatorUser);
    } catch (error) {
      console.error('Error getting operator user:', error);
      // Return null instead of error to allow app to continue
      res.json(null);
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

      // Force refresh to get latest data from spreadsheet
      const data = await userRepository.getInstructors(true);

      // The data is already transformed by Instructor.fromDatabaseRow
      // No need to transform again with UserTransformService
      res.json(data);
    } catch (error) {
      console.error('Error in getInstructors:', error);
      res.status(500).json({ error: 'Failed to retrieve instructors' });
    }
  }

  /**
   * Get students - simplified to match instructor pattern
   */
  static async getStudents(req, res) {
    try {
      // Use the normalized request data from middleware
      const request = req.requestData || {};

      const userRepository = serviceContainer.get('userRepository');
      const data = await userRepository.getStudents();
      const transformedData = UserTransformService.transformArray(data, 'student');

      // Apply pagination directly for compatibility with frontend expectations
      const page = request.page || 0;
      const pageSize = request.pageSize || 1000;
      const startIndex = page * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = transformedData.slice(startIndex, endIndex);

      const result = {
        data: paginatedData,
        total: transformedData.length,
        page,
        pageSize,
      };

      res.json(result);
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
        data: details,
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

      const result = await studentApplicationService.updateStudentProfile(
        studentId,
        updates,
        userId
      );

      res.json({
        success: true,
        data: result,
        message: 'Student profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating student:', error);
      res.status(400).json({
        success: false,
        error: error.message,
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
        message: 'Student enrolled successfully',
      });
    } catch (error) {
      console.error('Error enrolling student:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
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
        data: report,
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

    const total = students.reduce(
      (sum, student) => sum + (student.recommendedLessonDuration || 0),
      0
    );
    return Math.round(total / students.length);
  }

  /**
   * Authenticate user by access code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async authenticateByAccessCode(req, res) {
    try {
      const { accessCode } = req.body;

      if (!accessCode) {
        return res.status(400).json({
          error: 'Access code is required',
          success: false
        });
      }

      const userRepository = serviceContainer.get('userRepository');

      let admin = null;
      let instructor = null;
      let parent = null;

      // First check 6-digit codes against admins and instructors
      if (accessCode.length === 6) {
        // Check admin first
        admin = await userRepository.getAdminByAccessCode(accessCode);

        // If not found in admin, check instructor
        if (!admin) {
          instructor = await userRepository.getInstructorByAccessCode(accessCode);
        }
      }

      // Then check 4-digit codes against parents
      if (accessCode.length === 4 && !admin && !instructor) {
        parent = await userRepository.getParentByAccessCode(accessCode);
      }

      // If no match found, return null
      if (!admin && !instructor && !parent) {
        return res.json(null);
      }

      // Create AuthenticatedUserResponse with the matched user
      const authenticatedUser = new AuthenticatedUserResponse(
        admin?.email || instructor?.email || parent?.email,
        false, // isOperator is false for access code login
        admin,
        instructor,
        parent
      );

      res.json(authenticatedUser);
    } catch (error) {
      console.error('Error authenticating by access code:', error);
      res.json(null);
    }
  }

  /**
   * Get admin by access code
   */
  static async getAdminByAccessCode(req, res) {
    try {
      const { accessCode } = req.body;

      if (!accessCode) {
        return res.status(400).json({ error: 'Access code is required' });
      }

      const userRepository = serviceContainer.get('userRepository');
      const admin = await userRepository.getAdminByAccessCode(accessCode);

      if (!admin) {
        return res.status(404).json({ error: 'Admin not found with provided access code' });
      }

      const transformedData = UserTransformService.transform(admin, 'admin');
      res.json(transformedData);
    } catch (error) {
      console.error('Error getting admin by access code:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get instructor by access code
   */
  static async getInstructorByAccessCode(req, res) {
    try {
      const { accessCode } = req.body;

      if (!accessCode) {
        return res.status(400).json({ error: 'Access code is required' });
      }

      const userRepository = serviceContainer.get('userRepository');
      const instructor = await userRepository.getInstructorByAccessCode(accessCode);

      if (!instructor) {
        return res.status(404).json({ error: 'Instructor not found with provided access code' });
      }

      const transformedData = UserTransformService.transform(instructor, 'instructor');
      res.json(transformedData);
    } catch (error) {
      console.error('❌ ERROR in getInstructorByAccessCode:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get parent by access code
   */
  static async getParentByAccessCode(req, res) {
    try {
      const { accessCode } = req.body;

      if (!accessCode) {
        return res.status(400).json({ error: 'Access code is required' });
      }

      const userRepository = serviceContainer.get('userRepository');
      const parent = await userRepository.getParentByAccessCode(accessCode);

      if (!parent) {
        return res.status(404).json({ error: 'Parent not found with provided access code' });
      }

      const transformedData = UserTransformService.transform(parent, 'parent');
      res.json(transformedData);
    } catch (error) {
      console.error('Error getting parent by access code:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
