/**
 * Parent model - unified for both backend and frontend use
 */
export class Parent {
    /**
     * Creates a Parent instance
     * @param {Object|string} data - Object with properties OR id as first positional parameter
     * @param {string} [email] - Email (if using positional parameters)
     * @param {string} [lastName] - Last name (if using positional parameters)
     * @param {string} [firstName] - First name (if using positional parameters)
     * @param {string} [phone] - Phone number (if using positional parameters)
     * @param {string} [address] - Address (if using positional parameters)
     * @param {boolean} [isEmergencyContact] - Emergency contact status (if using positional parameters)
     */
    constructor(data, email, lastName, firstName, phone, address, isEmergencyContact) {
        if (typeof data === 'object' && data !== null) {
            // Object destructuring constructor (web pattern)
            const {
                id,
                email: emailAddr,
                lastName: lName,
                firstName: fName,
                phone: phoneNumber,
                address: addr,
                isEmergencyContact: emergencyContact = false,
                alternatePhone,
                relationship = 'parent',
                isActive = true
            } = data;

            this.id = id;
            this.email = emailAddr;
            this.lastName = lName;
            this.firstName = fName;
            this.phone = phoneNumber;
            this.address = addr;
            this.isEmergencyContact = emergencyContact;
            this.alternatePhone = alternatePhone;
            this.relationship = relationship;
            this.isActive = isActive;
        } else {
            // Positional constructor (core pattern)
            this.id = data;
            this.email = email;
            this.lastName = lastName;
            this.firstName = firstName;
            this.phone = phone;
            this.address = address;
            this.isEmergencyContact = isEmergencyContact || false;
            this.alternatePhone = null;
            this.relationship = 'parent';
            this.isActive = true;
        }
    }

    /**
     * Gets the parent's full name
     * @returns {string} Full name in "firstName lastName" format
     */
    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }

    /**
     * Gets formatted display name with relationship
     * @returns {string} Display name with relationship indicator
     */
    get displayName() {
        const relationshipText = this.relationship === 'parent' ? 'Parent' : this.relationship;
        return `${this.fullName} (${relationshipText})`;
    }

    /**
     * Gets primary contact phone number
     * @returns {string} Primary phone number
     */
    get primaryPhone() {
        return this.phone || this.alternatePhone;
    }

    /**
     * Gets all available phone numbers
     * @returns {Array<string>} Array of phone numbers
     */
    get allPhones() {
        const phones = [];
        if (this.phone) phones.push(this.phone);
        if (this.alternatePhone && this.alternatePhone !== this.phone) {
            phones.push(this.alternatePhone);
        }
        return phones;
    }

    /**
     * Checks if parent has complete contact information
     * @returns {boolean} True if has email and phone
     */
    hasCompleteContact() {
        return !!(this.email && this.primaryPhone);
    }

    /**
     * Formats phone number for display
     * @param {string} phoneNumber - Phone number to format
     * @returns {string} Formatted phone number
     */
    formatPhone(phoneNumber) {
        if (!phoneNumber) return '';
        
        // Remove all non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Format as (XXX) XXX-XXXX for 10-digit numbers
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        
        // Return original if not standard format
        return phoneNumber;
    }

    /**
     * Gets formatted primary phone
     * @returns {string} Formatted primary phone number
     */
    get formattedPrimaryPhone() {
        return this.formatPhone(this.primaryPhone);
    }

    /**
     * Checks if this parent can be used as emergency contact
     * @returns {boolean} True if suitable for emergency contact
     */
    canBeEmergencyContact() {
        return this.hasCompleteContact() && this.isActive;
    }

    /**
     * Gets contact summary for quick reference
     * @returns {string} Contact summary
     */
    get contactSummary() {
        const phone = this.formattedPrimaryPhone;
        return `${this.fullName} - ${this.email} - ${phone}`;
    }

    /**
     * Validates if the parent object has required fields
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validate() {
        const errors = [];
        
        if (!this.firstName) errors.push('First name is required');
        if (!this.lastName) errors.push('Last name is required');
        if (!this.email) errors.push('Email is required');
        if (!this.phone) errors.push('Phone number is required');
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (this.email && !emailRegex.test(this.email)) {
            errors.push('Invalid email format');
        }
        
        // Validate phone format (basic check)
        if (this.phone) {
            const phoneDigits = this.phone.replace(/\D/g, '');
            if (phoneDigits.length < 10) {
                errors.push('Phone number must be at least 10 digits');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Converts the parent to a plain object for API responses
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            lastName: this.lastName,
            firstName: this.firstName,
            fullName: this.fullName,
            displayName: this.displayName,
            phone: this.phone,
            alternatePhone: this.alternatePhone,
            primaryPhone: this.primaryPhone,
            formattedPrimaryPhone: this.formattedPrimaryPhone,
            allPhones: this.allPhones,
            address: this.address,
            isEmergencyContact: this.isEmergencyContact,
            relationship: this.relationship,
            isActive: this.isActive,
            hasCompleteContact: this.hasCompleteContact(),
            canBeEmergencyContact: this.canBeEmergencyContact(),
            contactSummary: this.contactSummary
        };
    }
}
