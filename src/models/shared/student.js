/**
 * Student Domain Entity - rich domain model with business behavior
 *
 * Represents a student in the domain with business rules and validation
 */

import { StudentId } from '../../utils/values/studentId.js';
import { Email } from '../../utils/values/email.js';
import { Age } from '../../utils/values/age.js';

// Helper function to extract string values from various data types
function extractStringValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    // If it's an object, it might have an id, value, or _value property
    if (value.value) return String(value.value);
    if (value.id) return String(value.id);
    if (value._value) return String(value._value);
    if (value.uuid) return String(value.uuid);

    // If it's an array, take the first element
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }

    return String(value); // This will produce "[object Object]"
  }

  return String(value);
}

export class Student {
  constructor(data) {
    this.#validateConstructorData(data);

    this._firstName = data.firstName;
    this._lastName = data.lastName;
    this.firstNickname = data.firstNickname || null;
    this.lastNickname = data.lastNickname || null;
    this.id = new StudentId(data.id || data.studentId);
    this.email = data.email ? new Email(data.email) : null;
    this.grade = data.grade;
    this.age = data.age ? new Age(data.age) : null;
    this.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    this.parent1Id = data.parent1Id;
    this.parent2Id = data.parent2Id;
    this.parentEmails = data.parentEmails || '';
    this.emergencyContactName = data.emergencyContactName;
    this.emergencyContactPhone = data.emergencyContactPhone;
    this.medicalNotes = data.medicalNotes;
    this.isActive = data.isActive !== false;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  get firstName() {
    return this.firstNickname || this._firstName;
  }

  get lastName() {
    return this.lastNickname || this._lastName;
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
      case 'early-childhood':
        return 30;
      case 'elementary':
        return 45;
      case 'teenage':
        return 60;
      case 'adult':
        return 60;
      default:
        return 45; // Conservative default
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
      enrolledAt: new Date(),
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
      firstNickname: this.firstNickname,
      lastNickname: this.lastNickname,
      email: this.email?.value,
      grade: this.grade,
      age: this.age?.value,
      dateOfBirth: this.dateOfBirth?.toISOString(),
      parent1Id: this.parent1Id,
      parent2Id: this.parent2Id,
      parentEmails: this.parentEmails, // Include enriched parent emails
      emergencyContactName: this.emergencyContactName,
      emergencyContactPhone: this.emergencyContactPhone,
      medicalNotes: this.medicalNotes,
      isActive: this.isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Factory method: Create from data object
   */
  static fromDataObject(data) {
    return new Student(data);
  }

  /**
   * Factory method: Create from API data (frontend compatibility)
   */
  static fromApiData(data) {
    // Handle ID fields that might be objects or other types
    const processedData = {
      ...data,
      id: extractStringValue(data.id),
      studentId: extractStringValue(data.studentId),
      firstNickname: data.firstNickname || null,
      lastNickname: data.lastNickname || null,
    };
    return new Student(processedData);
  }

  /**
   * Factory method: Create from database row
   */
  static fromDatabaseRow(row) {
    const [id, lastName, firstName, lastNickname, firstNickname, grade, parent1Id, parent2Id] = row;

    return new Student({
      id,
      lastName,
      firstName,
      lastNickname,
      firstNickname,
      grade,
      parent1Id,
      parent2Id,
      email: null, // Not stored in basic row structure
      age: null, // Not stored in basic row structure
      birthday: null, // Not stored in basic row structure
      school: null, // Not stored in basic row structure
      instrument: null, // Not stored in basic row structure
      isActive: true, // Default to active
    });
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
      medicalNotes: options.medicalNotes,
    });
  }
}
