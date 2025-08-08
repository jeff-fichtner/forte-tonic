/**
 * Student API Request DTOs
 * Structured requests for different API endpoints
 */

import { Student } from '../student.js';

/**
 * Base request class with validation
 */
export class BaseRequest {
  constructor(data) {
    this.data = data;
  }

  /**
   * Validate method must be implemented by subclasses
   */
  validate() {
    throw new Error('validate() method must be implemented by subclasses');
  }
}

/**
 * Create student request with validation
 */
export class CreateStudentRequest extends BaseRequest {
  constructor(data) {
    super(data);

    const {
      lastName,
      firstName,
      lastNickname,
      firstNickname,
      email,
      dateOfBirth,
      gradeLevel,
      parent1Id,
      parent2Id,
      parentEmails,
      emergencyContactName,
      emergencyContactPhone,
      medicalNotes,
    } = data || {};

    this.lastName = lastName;
    this.firstName = firstName;
    this.lastNickname = lastNickname;
    this.firstNickname = firstNickname;
    this.email = email;
    this.dateOfBirth = dateOfBirth;
    this.gradeLevel = gradeLevel;
    this.parent1Id = parent1Id;
    this.parent2Id = parent2Id;
    this.parentEmails = parentEmails || [];
    this.emergencyContactName = emergencyContactName;
    this.emergencyContactPhone = emergencyContactPhone;
    this.medicalNotes = medicalNotes;
  }

  /**
   * Enhanced validation with business rules
   */
  validate() {
    const errors = [];

    if (!this.firstName) errors.push('First name is required');
    if (!this.lastName) errors.push('Last name is required');
    if (!this.email) errors.push('Email is required');
    if (!this.gradeLevel) errors.push('Grade level is required');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.email && !emailRegex.test(this.email)) {
      errors.push('Invalid email format');
    }

    // Validate parent emails array if provided
    if (this.parentEmails && this.parentEmails.length > 0) {
      for (const parentEmail of this.parentEmails) {
        if (parentEmail && !emailRegex.test(parentEmail)) {
          errors.push(`Invalid parent email format: ${parentEmail}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert to Student model instance with validation
   */
  toStudent(id) {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid student data: ${validation.errors.join(', ')}`);
    }

    return new Student({
      id,
      lastName: this.lastName,
      firstName: this.firstName,
      lastNickname: this.lastNickname,
      firstNickname: this.firstNickname,
      email: this.email,
      dateOfBirth: this.dateOfBirth,
      gradeLevel: this.gradeLevel,
      parent1Id: this.parent1Id,
      parent2Id: this.parent2Id,
      parentEmails: this.parentEmails,
      emergencyContactName: this.emergencyContactName,
      emergencyContactPhone: this.emergencyContactPhone,
      medicalNotes: this.medicalNotes,
      isActive: true,
    });
  }
}

/**
 * Update student request
 */
export class UpdateStudentRequest extends BaseRequest {
  constructor(id, data) {
    super(data);
    this.id = id;

    const {
      lastName,
      firstName,
      lastNickname,
      firstNickname,
      email,
      dateOfBirth,
      gradeLevel,
      parent1Id,
      parent2Id,
      parentEmails,
      emergencyContactName,
      emergencyContactPhone,
      medicalNotes,
      isActive,
    } = data || {};

    // Only include provided fields (partial updates)
    if (lastName !== undefined) this.lastName = lastName;
    if (firstName !== undefined) this.firstName = firstName;
    if (lastNickname !== undefined) this.lastNickname = lastNickname;
    if (firstNickname !== undefined) this.firstNickname = firstNickname;
    if (email !== undefined) this.email = email;
    if (dateOfBirth !== undefined) this.dateOfBirth = dateOfBirth;
    if (gradeLevel !== undefined) this.gradeLevel = gradeLevel;
    if (parent1Id !== undefined) this.parent1Id = parent1Id;
    if (parent2Id !== undefined) this.parent2Id = parent2Id;
    if (parentEmails !== undefined) this.parentEmails = parentEmails;
    if (emergencyContactName !== undefined) this.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone !== undefined) this.emergencyContactPhone = emergencyContactPhone;
    if (medicalNotes !== undefined) this.medicalNotes = medicalNotes;
    if (isActive !== undefined) this.isActive = isActive;
  }

  validate() {
    const errors = [];

    if (!this.id) errors.push('Student ID is required for updates');

    // Validate email format if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.email && !emailRegex.test(this.email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  applyToStudent(student) {
    // Apply partial updates to existing student
    const updates = {};

    if (this.lastName !== undefined) updates.lastName = this.lastName;
    if (this.firstName !== undefined) updates.firstName = this.firstName;
    if (this.lastNickname !== undefined) updates.lastNickname = this.lastNickname;
    if (this.firstNickname !== undefined) updates.firstNickname = this.firstNickname;
    if (this.email !== undefined) updates.email = this.email;
    if (this.dateOfBirth !== undefined) updates.dateOfBirth = this.dateOfBirth;
    if (this.gradeLevel !== undefined) updates.gradeLevel = this.gradeLevel;
    if (this.parent1Id !== undefined) updates.parent1Id = this.parent1Id;
    if (this.parent2Id !== undefined) updates.parent2Id = this.parent2Id;
    if (this.parentEmails !== undefined) updates.parentEmails = this.parentEmails;
    if (this.emergencyContactName !== undefined)
      updates.emergencyContactName = this.emergencyContactName;
    if (this.emergencyContactPhone !== undefined)
      updates.emergencyContactPhone = this.emergencyContactPhone;
    if (this.medicalNotes !== undefined) updates.medicalNotes = this.medicalNotes;
    if (this.isActive !== undefined) updates.isActive = this.isActive;

    return new Student({
      ...student.toJSON(),
      ...updates,
    });
  }
}

/**
 * Student search/filter request
 */
export class StudentSearchRequest extends BaseRequest {
  constructor(data) {
    super(data);

    const {
      searchTerm,
      gradeLevel,
      isActive,
      hasEmergencyContact,
      parentId,
      page = 1,
      pageSize = 1000,
      sortBy = 'lastName',
      sortOrder = 'asc',
    } = data || {};

    this.searchTerm = searchTerm;
    this.gradeLevel = gradeLevel;
    this.isActive = isActive;
    this.hasEmergencyContact = hasEmergencyContact;
    this.parentId = parentId;
    this.page = Math.max(1, parseInt(page));
    this.pageSize = Math.min(10000, Math.max(1, parseInt(pageSize)));
    this.sortBy = sortBy;
    this.sortOrder = sortOrder === 'desc' ? 'desc' : 'asc';
  }

  validate() {
    const errors = [];

    const validSortFields = ['lastName', 'firstName', 'gradeLevel', 'email', 'id'];
    if (!validSortFields.includes(this.sortBy)) {
      errors.push(`Invalid sort field. Must be one of: ${validSortFields.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  toQueryOptions() {
    return {
      searchTerm: this.searchTerm,
      gradeLevel: this.gradeLevel,
      isActive: this.isActive,
      hasEmergencyContact: this.hasEmergencyContact,
      parentId: this.parentId,
      page: this.page,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };
  }
}
