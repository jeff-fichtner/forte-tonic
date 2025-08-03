/**
 * Student Service - business logic for student operations
 * Coordinates between repositories and handles complex business rules
 */

import { UnitOfWork } from '../../repositories/base/unitOfWork.js';
import { Student as ApiStudent } from '../../../shared/models/student.js';
import { 
    CreateStudentRequest, 
    UpdateStudentRequest,
    StudentSearchRequest 
} from '../../../shared/models/requests/studentRequests.js';
import {
    StudentResponse,
    StudentListResponse,
    StudentCreatedResponse,
    StudentUpdatedResponse,
    StudentValidationErrorResponse
} from '../../../shared/models/responses/studentResponses.js';

export class StudentService {
    constructor(dbClient) {
        this.unitOfWork = new UnitOfWork(dbClient);
    }

    /**
     * Gets all students with optional filtering and pagination
     */
    async getStudents(searchRequest) {
        try {
            const request = new StudentSearchRequest(searchRequest);
            const validation = request.validate();
            
            if (!validation.isValid) {
                return new StudentValidationErrorResponse(validation.errors);
            }

            const queryOptions = request.toQueryOptions();
            const result = await this.unitOfWork.students.findPaginated(queryOptions);

            // Convert data layer models to API models
            const apiStudents = result.students.map(dbStudent => 
                ApiStudent.fromDatabase(dbStudent)
            );

            return new StudentListResponse(
                apiStudents,
                result.totalCount,
                result.page,
                result.pageSize
            );
        } catch (error) {
            console.error('Error in StudentService.getStudents:', error);
            return StudentValidationErrorResponse(['Failed to retrieve students']);
        }
    }

    /**
     * Gets a single student by ID
     */
    async getStudentById(id) {
        try {
            const dbStudent = await this.unitOfWork.students.findById(id);
            if (!dbStudent) {
                return StudentValidationErrorResponse(['Student not found']);
            }

            const apiStudent = ApiStudent.fromDatabase(dbStudent);
            return new StudentResponse(apiStudent);
        } catch (error) {
            console.error('Error in StudentService.getStudentById:', error);
            return StudentValidationErrorResponse(['Failed to retrieve student']);
        }
    }

    /**
     * Creates a new student
     */
    async createStudent(studentData) {
        try {
            const request = new CreateStudentRequest(studentData);
            const validation = request.validate();
            
            if (!validation.isValid) {
                return new StudentValidationErrorResponse(validation.errors);
            }

            // Check for duplicate email
            const existingStudent = await this.unitOfWork.students.findBy('email', request.email);
            if (existingStudent.length > 0) {
                return new StudentValidationErrorResponse(['Email address is already in use']);
            }

            // Generate ID (in real implementation, this might come from the database)
            const newId = `student_${Date.now()}`;
            
            // Create API model and convert to database format
            const apiStudent = request.toStudent(newId);
            const dbData = apiStudent.toDatabaseModel();

            // Save to database
            await this.unitOfWork.students.create(dbData);

            return new StudentCreatedResponse(apiStudent);
        } catch (error) {
            console.error('Error in StudentService.createStudent:', error);
            return StudentValidationErrorResponse(['Failed to create student']);
        }
    }

    /**
     * Updates an existing student
     */
    async updateStudent(id, updateData) {
        try {
            const request = new UpdateStudentRequest(id, updateData);
            const validation = request.validate();
            
            if (!validation.isValid) {
                return new StudentValidationErrorResponse(validation.errors);
            }

            // Get existing student
            const existingDbStudent = await this.unitOfWork.students.findById(id);
            if (!existingDbStudent) {
                return StudentValidationErrorResponse(['Student not found']);
            }

            // Convert to API model and apply updates
            const existingApiStudent = ApiStudent.fromDatabase(existingDbStudent);
            const updatedApiStudent = request.applyToStudent(existingApiStudent);

            // Check for email conflicts (if email is being changed)
            if (request.email && request.email !== existingApiStudent.email) {
                const emailConflict = await this.unitOfWork.students.findBy('email', request.email);
                if (emailConflict.length > 0 && emailConflict[0].id !== id) {
                    return new StudentValidationErrorResponse(['Email address is already in use']);
                }
            }

            // Convert back to database format and save
            const dbData = updatedApiStudent.toDatabaseModel();
            await this.unitOfWork.students.update(id, dbData);

            return new StudentUpdatedResponse(updatedApiStudent);
        } catch (error) {
            console.error('Error in StudentService.updateStudent:', error);
            return StudentValidationErrorResponse(['Failed to update student']);
        }
    }

    /**
     * Gets students by parent ID
     */
    async getStudentsByParent(parentId) {
        try {
            const dbStudents = await this.unitOfWork.students.findByParentId(parentId);
            const apiStudents = dbStudents.map(dbStudent => 
                ApiStudent.fromDatabase(dbStudent)
            );

            return new StudentListResponse(apiStudents, apiStudents.length);
        } catch (error) {
            console.error('Error in StudentService.getStudentsByParent:', error);
            return StudentValidationErrorResponse(['Failed to retrieve students']);
        }
    }

    /**
     * Gets comprehensive family information
     */
    async getFamilyInfo(studentId) {
        try {
            const familyData = await this.unitOfWork.getFamilyInfo(studentId);
            if (!familyData) {
                return StudentValidationErrorResponse(['Student not found']);
            }

            const apiStudent = ApiStudent.fromDatabase(familyData.student);
            // You would similarly convert parents to API models here

            return new StudentResponse({
                ...apiStudent.toJSON(),
                parents: familyData.parents
            });
        } catch (error) {
            console.error('Error in StudentService.getFamilyInfo:', error);
            return StudentValidationErrorResponse(['Failed to retrieve family information']);
        }
    }

    /**
     * Finds available instructors for a student
     */
    async getAvailableInstructors(studentId, instrument = null, day = null) {
        try {
            const instructors = await this.unitOfWork.findAvailableInstructors(studentId, instrument, day);
            // Convert to API models and return
            return {
                success: true,
                data: instructors,
                count: instructors.length
            };
        } catch (error) {
            console.error('Error in StudentService.getAvailableInstructors:', error);
            return StudentValidationErrorResponse(['Failed to find available instructors']);
        }
    }

    /**
     * Cleanup method
     */
    dispose() {
        this.unitOfWork.dispose();
    }
}
