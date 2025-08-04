/**
 * Student Management Service - Domain layer business logic for student operations
 * Handles student validation, enrollment rules, and business constraints
 */

export class StudentManagementService {
  /**
   * Validates student enrollment eligibility
   * @param {object} student - Student data
   * @param {object} registrationData - Registration data
   * @returns {object} Eligibility result
   */
  static validateEnrollmentEligibility(student, registrationData) {
    const errors = [];

    // Age requirements
    const ageValidation = this.validateAgeRequirements(student, registrationData);
    if (!ageValidation.isValid) errors.push(...ageValidation.errors);

    // Grade level requirements
    const gradeValidation = this.validateGradeRequirements(student, registrationData);
    if (!gradeValidation.isValid) errors.push(...gradeValidation.errors);

    // Parent/guardian requirements
    const parentValidation = this.validateParentRequirements(student);
    if (!parentValidation.isValid) errors.push(...parentValidation.errors);

    return {
      isEligible: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates age requirements for enrollment
   * @param {object} student - Student data
   * @param {object} registrationData - Registration data
   * @returns {object} Age validation result
   */
  static validateAgeRequirements(student, registrationData) {
    const errors = [];

    // Calculate age if birthdate provided
    if (student.birthDate) {
      const age = this.calculateAge(student.birthDate);
      
      // Minimum age requirement (4 years old)
      if (age < 4) {
        errors.push('Student must be at least 4 years old to enroll');
      }

      // Maximum age for certain programs (18 years old)
      if (age > 18) {
        errors.push('Student must be 18 years old or younger for youth programs');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates grade level requirements
   * @param {object} student - Student data
   * @param {object} registrationData - Registration data
   * @returns {object} Grade validation result
   */
  static validateGradeRequirements(student, registrationData) {
    const errors = [];

    if (student.grade) {
      const validGrades = ['PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      
      if (!validGrades.includes(student.grade)) {
        errors.push('Invalid grade level');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates parent/guardian requirements
   * @param {object} student - Student data
   * @returns {object} Parent validation result
   */
  static validateParentRequirements(student) {
    const errors = [];

    // At least one parent contact required for minors
    if (!student.parent1Email && !student.parent2Email) {
      errors.push('At least one parent/guardian contact is required');
    }

    // Validate parent email formats
    if (student.parent1Email && !this.isValidEmail(student.parent1Email)) {
      errors.push('Invalid parent 1 email format');
    }

    if (student.parent2Email && !this.isValidEmail(student.parent2Email)) {
      errors.push('Invalid parent 2 email format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculates age from birth date
   * @param {Date|string} birthDate - Birth date
   * @returns {number} Age in years
   */
  static calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Validates email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Determines if student needs additional permissions
   * @param {object} student - Student data
   * @param {object} registrationData - Registration data
   * @returns {object} Permission requirements
   */
  static getPermissionRequirements(student, registrationData) {
    const requirements = [];

    // Medical clearance for physical activities
    if (this.requiresMedicalClearance(registrationData)) {
      requirements.push({
        type: 'medical_clearance',
        description: 'Medical clearance required for physical activities',
      });
    }

    // Photo/video release
    requirements.push({
      type: 'media_release',
      description: 'Photo and video release permission required',
    });

    // Transportation permission for field trips
    if (this.involvesTransportation(registrationData)) {
      requirements.push({
        type: 'transportation_permission',
        description: 'Transportation permission required for off-site activities',
      });
    }

    return {
      hasRequirements: requirements.length > 0,
      requirements,
    };
  }

  /**
   * Checks if registration requires medical clearance
   * @param {object} registrationData - Registration data
   * @returns {boolean} True if medical clearance required
   */
  static requiresMedicalClearance(registrationData) {
    const physicalActivities = ['dance', 'movement', 'percussion'];
    return registrationData.instrument && 
           physicalActivities.includes(registrationData.instrument.toLowerCase());
  }

  /**
   * Checks if registration involves transportation
   * @param {object} registrationData - Registration data
   * @returns {boolean} True if transportation involved
   */
  static involvesTransportation(registrationData) {
    // For now, assume no transportation unless specified
    return registrationData.transportationType === 'bus' || 
           registrationData.transportationType === 'field_trip';
  }

  /**
   * Validates student data for completeness
   * @param {object} student - Student data
   * @returns {object} Validation result
   */
  static validateStudentData(student) {
    const errors = [];

    // Required fields
    if (!student.firstName) errors.push('First name is required');
    if (!student.lastName) errors.push('Last name is required');
    if (!student.grade) errors.push('Grade level is required');

    // Email validation (student email is optional but if provided must be valid)
    if (student.email && !this.isValidEmail(student.email)) {
      errors.push('Invalid student email format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
