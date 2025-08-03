/**
 * Student API model - for client-server communication
 * Rich model with validation, formatting, and business logic
 */
export class Student {
    /**
     * Creates a Student API model instance
     * @param {Object} data - Student data object
     * @param {string} data.id - Unique identifier
     * @param {string} data.lastName - Last name
     * @param {string} data.firstName - First name
     * @param {string} [data.lastNickname] - Last nickname
     * @param {string} [data.firstNickname] - First nickname
     * @param {string} data.email - Email address
     * @param {Date|string} [data.dateOfBirth] - Date of birth
     * @param {string} data.gradeLevel - Grade level
     * @param {string} [data.parent1Id] - Primary parent ID
     * @param {string} [data.parent2Id] - Secondary parent ID
     * @param {Array<string>} [data.parentEmails] - Parent email addresses
     * @param {string} [data.emergencyContactName] - Emergency contact name
     * @param {string} [data.emergencyContactPhone] - Emergency contact phone
     * @param {string} [data.medicalNotes] - Medical notes
     * @param {boolean} [data.isActive=true] - Active status
     */
    constructor(data) {
        // Validate input
        if (!data || typeof data !== 'object') {
            throw new Error('Student data object is required');
        }

        const {
            id,
            lastName,
            firstName,
            lastNickname,
            firstNickname,
            email,
            dateOfBirth,
            gradeLevel,
            parent1Id,
            parent2Id,
            parentEmails = [],
            emergencyContactName,
            emergencyContactPhone,
            medicalNotes,
            isActive = true
        } = data;

        // Required fields
        this.id = id;
        this.lastName = lastName;
        this.firstName = firstName;
        this.email = email;
        this.gradeLevel = gradeLevel;

        // Optional fields
        this.lastNickname = lastNickname;
        this.firstNickname = firstNickname;
        this.dateOfBirth = dateOfBirth instanceof Date ? dateOfBirth : (dateOfBirth ? new Date(dateOfBirth) : null);
        this.parent1Id = parent1Id;
        this.parent2Id = parent2Id;
        this.parentEmails = Array.isArray(parentEmails) ? parentEmails : [];
        this.emergencyContactName = emergencyContactName;
        this.emergencyContactPhone = emergencyContactPhone;
        this.medicalNotes = medicalNotes;
        this.isActive = isActive;
    }

    /**
     * Creates Student from database model
     * @param {Object} dbStudent - Database student model
     * @param {Object} [additionalData] - Additional data to merge
     * @returns {Student} API Student model
     */
    static fromDatabase(dbStudent, additionalData = {}) {
        return new Student({
            id: dbStudent.id,
            lastName: dbStudent.lastName,
            firstName: dbStudent.firstName,
            lastNickname: dbStudent.lastNickname,
            firstNickname: dbStudent.firstNickname,
            gradeLevel: dbStudent.grade, // Note: mapping from 'grade' to 'gradeLevel'
            parent1Id: dbStudent.parent1Id,
            parent2Id: dbStudent.parent2Id,
            ...additionalData
        });
    }

    /**
     * Converts to database model format
     * @returns {Object} Database-compatible object
     */
    toDatabaseModel() {
        return {
            id: this.id,
            lastName: this.lastName,
            firstName: this.firstName,
            lastNickname: this.lastNickname,
            firstNickname: this.firstNickname,
            grade: this.gradeLevel, // Note: mapping from 'gradeLevel' to 'grade'
            parent1Id: this.parent1Id,
            parent2Id: this.parent2Id
        };
    }

    /**
     * Gets the student's full name
     * @returns {string} Full name in "firstName lastName" format
     */
    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }

    /**
     * Gets the student's display name (with nickname if available)
     * @returns {string} Display name
     */
    get displayName() {
        const firstName = this.firstNickname || this.firstName;
        const lastName = this.lastNickname || this.lastName;
        return `${firstName} ${lastName}`;
    }

    /**
     * Gets formatted grade level for display
     * @returns {string} Formatted grade level
     */
    get formattedGrade() {
        if (!this.gradeLevel) return '';
        
        const grade = this.gradeLevel.toString().toLowerCase();
        
        if (grade === 'k' || grade === 'kindergarten') return 'K';
        if (grade.includes('pre')) return 'Pre-K';
        if (!isNaN(grade)) return `${grade}`;
        
        return this.gradeLevel;
    }

    /**
     * Gets the student's age based on date of birth
     * @returns {number|null} Age in years
     */
    get age() {
        if (!this.dateOfBirth) return null;
        
        const today = new Date();
        const birthDate = new Date(this.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }

    /**
     * Gets all parent contact information
     * @returns {Array<Object>} Array of parent contact info
     */
    getParentContacts() {
        const contacts = [];
        if (this.parent1Id) contacts.push({ id: this.parent1Id, type: 'parent1' });
        if (this.parent2Id) contacts.push({ id: this.parent2Id, type: 'parent2' });
        return contacts;
    }

    /**
     * Checks if the student has emergency contact information
     * @returns {boolean} True if emergency contact info is available
     */
    hasEmergencyContact() {
        return !!(this.emergencyContactName && this.emergencyContactPhone);
    }

    /**
     * Validates if the student object has required fields
     * @returns {Object} Validation result with isValid boolean and errors array
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
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Converts the student to a plain object for API responses
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            lastName: this.lastName,
            firstName: this.firstName,
            lastNickname: this.lastNickname,
            firstNickname: this.firstNickname,
            fullName: this.fullName,
            displayName: this.displayName,
            email: this.email,
            dateOfBirth: this.dateOfBirth,
            gradeLevel: this.gradeLevel,
            formattedGrade: this.formattedGrade,
            parent1Id: this.parent1Id,
            parent2Id: this.parent2Id,
            parentEmails: this.parentEmails,
            emergencyContactName: this.emergencyContactName,
            emergencyContactPhone: this.emergencyContactPhone,
            medicalNotes: this.medicalNotes,
            isActive: this.isActive,
            age: this.age
        };
    }
}
