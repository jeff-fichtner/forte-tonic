/**
 * Student API Response DTOs
 * Structured responses for different API endpoints
 */

import { Student } from '../student.js';

/**
 * Standard API response wrapper
 */
export class ApiResponse {
  constructor(data, message = '', success = true, errors = []) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
  }

  static success(data, message = 'Success') {
    return new ApiResponse(data, message, true);
  }

  static error(message, errors = []) {
    return new ApiResponse(null, message, false, errors);
  }
}

/**
 * Student list response
 */
export class StudentListResponse extends ApiResponse {
  constructor(students, totalCount, page = 1, pageSize = 50) {
    const studentData = students.map(student =>
      student instanceof Student ? student.toJSON() : student
    );

    super({
      students: studentData,
      pagination: {
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNext: page * pageSize < totalCount,
        hasPrevious: page > 1,
      },
    });
  }
}

/**
 * Single student response
 */
export class StudentResponse extends ApiResponse {
  constructor(student) {
    const studentData = student instanceof Student ? student.toJSON() : student;
    super(studentData);
  }
}

/**
 * Student creation response
 */
export class StudentCreatedResponse extends ApiResponse {
  constructor(student) {
    const studentData = student instanceof Student ? student.toJSON() : student;
    super(studentData, 'Student created successfully', true);
  }
}

/**
 * Student update response
 */
export class StudentUpdatedResponse extends ApiResponse {
  constructor(student) {
    const studentData = student instanceof Student ? student.toJSON() : student;
    super(studentData, 'Student updated successfully', true);
  }
}

/**
 * Student deletion response
 */
export class StudentDeletedResponse extends ApiResponse {
  constructor(studentId) {
    super({ id: studentId }, 'Student deleted successfully', true);
  }
}

/**
 * Student validation error response
 */
export class StudentValidationErrorResponse extends ApiResponse {
  constructor(errors) {
    super(null, 'Validation failed', false, errors);
  }
}
