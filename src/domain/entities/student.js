/**
 * Student Domain Entity - rich domain model with business behavior
 * 
 * Represents a student in the domain with business rules and validation
 */

import { StudentId } from '../values/studentId.js';
import { Email } from '../values/email.js';
import { Age } from '../values/age.js';

export class Student {
  constructor(data) {
    this.#validateConstructorData(data);
    
    this.id = new StudentId(data.id || data.studentId);
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.email = data.email ? new Email(data.email) : null;
    this.grade = data.grade;
    this.age = data.age ? new Age(data.age) : null;
    this.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    this.parent1Id = data.parent1Id;
    this.parent2Id = data.parent2Id;
    this.emergencyContactName = data.emergencyContactName;
    this.emergencyContactPhone = data.emergencyContactPhone;
    this.medicalNotes = data.medicalNotes;
    this.isActive = data.isActive !== false; // Default to true
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  #validateConstructorData(data) {
    if (!data) {
      throw new Error('Student data is required');
    }

    const required = ['firstName', 'lastName'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Get full name
   */
  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Business rule: Check if student has emergency contact
   */
  hasEmergencyContact() {
    return !!(this.emergencyContactName && this.emergencyContactPhone);
  }

  /**
   * Business rule: Check if student requires parent permission
   */
  requiresParentPermission() {
    if (this.age) {
      return this.age.value < 18;
    }
    
    // If no age specified, check grade level
    if (this.grade) {
      return this.grade <= 12; // K-12 grades require permission
    }
    
    return true; // Default to requiring permission if uncertain
  }

  /**
   * Business rule: Check if student has assigned parents
   */
  hasAssignedParents() {
    return !!(this.parent1Id || this.parent2Id);
  }

  /**
   * Business rule: Check enrollment eligibility
   */
  isEligibleForEnrollment() {
    const checks = {
      hasName: !!(this.firstName && this.lastName),
      hasEmergencyContact: this.hasEmergencyContact(),
      hasParentIfRequired: this.requiresParentPermission() ? this.hasAssignedParents() : true,
      isActive: this.isActive
    };

    const isEligible = Object.values(checks).every(check => check === true);
    
    return {
      eligible: isEligible,
      checks,
      missingRequirements: Object.entries(checks)
        .filter(([_, passed]) => !passed)
        .map(([requirement]) => requirement)
    };
  }

  /**
   * Business rule: Get age category for program placement
   */
  getAgeCategory() {
    if (this.age) {
      const ageValue = this.age.value;
      if (ageValue < 6) return 'early-childhood';
      if (ageValue < 12) return 'elementary';
      if (ageValue < 18) return 'teenage';
      return 'adult';
    }

    // Fallback to grade-based categorization
    if (this.grade) {
      if (this.grade <= 0) return 'early-childhood';
      if (this.grade <= 5) return 'elementary';
      if (this.grade <= 12) return 'teenage';
      return 'adult';
    }

    return 'unknown';
  }

  /**
   * Business rule: Check if student can take advanced lessons
   */
  canTakeAdvancedLessons() {
    const ageCategory = this.getAgeCategory();
    return ['teenage', 'adult'].includes(ageCategory);
  }

  /**
   * Business rule: Check if student needs special accommodations
   */
  needsSpecialAccommodations() {
    return !!(this.medicalNotes && this.medicalNotes.trim().length > 0);
  }

  /**
   * Business rule: Get recommended lesson duration
   */
  getRecommendedLessonDuration() {
    const ageCategory = this.getAgeCategory();
    
    switch (ageCategory) {
      case 'early-childhood': return 30;
      case 'elementary': return 45;
      case 'teenage': return 60;
      case 'adult': return 60;
      default: return 45; // Conservative default
    }
  }

  /**
   * Update contact information
   */
  updateContactInfo(email, emergencyContactName, emergencyContactPhone) {
    if (email) {
      this.email = new Email(email);
    }
    
    this.emergencyContactName = emergencyContactName;
    this.emergencyContactPhone = emergencyContactPhone;
    this.updatedAt = new Date();
  }

  /**
   * Add medical notes
   */
  addMedicalNotes(notes) {
    this.medicalNotes = notes;
    this.updatedAt = new Date();
  }

  /**
   * Activate/deactivate student
   */
  setActiveStatus(isActive) {
    this.isActive = isActive;
    this.updatedAt = new Date();
  }

  /**
   * Domain event: Student was enrolled
   */
  toEnrolledEvent() {
    return {
      type: 'StudentEnrolled',
      studentId: this.id.value,
      studentName: this.getFullName(),
      ageCategory: this.getAgeCategory(),
      enrolledAt: new Date()
    };
  }

  /**
   * Convert to data transfer object
   */
  toDataObject() {
    return {
      id: this.id.value,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email?.value,
      grade: this.grade,
      age: this.age?.value,
      dateOfBirth: this.dateOfBirth?.toISOString(),
      parent1Id: this.parent1Id,
      parent2Id: this.parent2Id,
      emergencyContactName: this.emergencyContactName,
      emergencyContactPhone: this.emergencyContactPhone,
      medicalNotes: this.medicalNotes,
      isActive: this.isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }

  /**
   * Factory method: Create from data object
   */
  static fromDataObject(data) {
    return new Student(data);
  }

  /**
   * Factory method: Create new student
   */
  static createNew(firstName, lastName, options = {}) {
    return new Student({
      firstName,
      lastName,
      email: options.email,
      grade: options.grade,
      age: options.age,
      dateOfBirth: options.dateOfBirth,
      parent1Id: options.parent1Id,
      parent2Id: options.parent2Id,
      emergencyContactName: options.emergencyContactName,
      emergencyContactPhone: options.emergencyContactPhone,
      medicalNotes: options.medicalNotes
    });
  }
}
