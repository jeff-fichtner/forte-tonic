import { DateHelpers } from '../../core/helpers/nativeDateTimeHelpers.js';

/**
 * Class model - unified for both backend and frontend use
 */
export class Class {
    /**
     * Creates a Class instance
     * @param {Object|string} data - Object with properties OR id as first positional parameter
     * @param {string} [instructorId] - Instructor ID (if using positional parameters)
     * @param {string} [day] - Day of week (if using positional parameters)
     * @param {Date|string} [startTime] - Start time (if using positional parameters)
     * @param {number} [length] - Length in minutes (if using positional parameters)
     * @param {Date|string} [endTime] - End time (if using positional parameters)
     * @param {string} [instrument] - Instrument (if using positional parameters)
     * @param {string} [title] - Class title (if using positional parameters)
     * @param {number} [size] - Maximum class size (if using positional parameters)
     * @param {string|number} [minimumGrade] - Minimum grade (if using positional parameters)
     * @param {string|number} [maximumGrade] - Maximum grade (if using positional parameters)
     */
    constructor(data, instructorId, day, startTime, length, endTime, instrument, title, size, minimumGrade, maximumGrade) {
        if (typeof data === 'object' && data !== null) {
            // Object destructuring constructor (web pattern)
            const {
                id,
                instructorId: instrId,
                day: dayOfWeek,
                startTime: sTime,
                length: duration,
                endTime: eTime,
                instrument: instr,
                title: classTitle,
                size: maxSize,
                minimumGrade: minGrade,
                maximumGrade: maxGrade,
                roomId,
                description,
                isActive = true,
                capacity
            } = data;

            this.id = id;
            this.instructorId = instrId;
            this.day = dayOfWeek;
            this.startTime = sTime;
            this.length = duration;
            this.endTime = eTime;
            this.instrument = instr;
            this.title = classTitle;
            this.size = maxSize || capacity;
            this.minimumGrade = minGrade;
            this.maximumGrade = maxGrade;
            this.roomId = roomId;
            this.description = description;
            this.isActive = isActive;
        } else {
            // Positional constructor (core pattern) - with DateHelpers processing
            this.id = data;
            this.instructorId = instructorId;
            this.day = day;
            this.startTime = DateHelpers?.parseTimeString ? DateHelpers.parseTimeString(startTime).to24Hour() : startTime;
            this.length = length;
            this.endTime = DateHelpers?.parseTimeString ? DateHelpers.parseTimeString(endTime).to24Hour() : endTime;
            this.instrument = instrument;
            this.title = title;
            this.size = size;
            this.minimumGrade = minimumGrade;
            this.maximumGrade = maximumGrade;
            this.roomId = null;
            this.description = null;
            this.isActive = true;
        }
    }

    /**
     * Gets formatted start time
     * @returns {string} Formatted start time
     */
    get formattedStartTime() {
        if (!this.startTime) return '';
        
        // Check if browser environment and DurationHelpers is available
        if (typeof window !== 'undefined' && window.DurationHelpers) {
            return DateHelpers.parseTimeString(this.startTime).to12Hour();
        }
        
        // Fallback for environments without DurationHelpers
        return DateHelpers.convertTimeFormat(this.startTime, '12hour');
        
        // Fallback formatting
        if (this.startTime instanceof Date) {
            return this.startTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }
        
        return this.startTime.toString();
    }

    /**
     * Gets formatted end time
     * @returns {string} Formatted end time
     */
    get formattedEndTime() {
        if (!this.endTime) return '';
        
        if (this.endTime instanceof Date) {
            return this.endTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }
        
        return this.endTime.toString();
    }

    /**
     * Gets formatted minimum grade
     * @returns {string} Formatted minimum grade
     */
    get formattedMinimumGrade() {
        return this.formatGrade(this.minimumGrade);
    }

    /**
     * Gets formatted maximum grade
     * @returns {string} Formatted maximum grade
     */
    get formattedMaximumGrade() {
        return this.formatGrade(this.maximumGrade);
    }

    /**
     * Formats a grade for display
     * @param {string|number} grade - Grade to format
     * @returns {string} Formatted grade
     */
    formatGrade(grade) {
        if (!grade) return '';
        
        const gradeStr = grade.toString().toLowerCase();
        
        if (gradeStr === 'k' || gradeStr === 'kindergarten') return 'K';
        if (gradeStr.includes('pre')) return 'Pre-K';
        if (!isNaN(gradeStr)) return gradeStr;
        
        return grade.toString();
    }

    /**
     * Gets formatted class name with grade range and schedule
     * @returns {string} Formatted class name
     */
    get formattedName() {
        const gradeRange = `${this.formattedMinimumGrade}-${this.formattedMaximumGrade}`;
        return `${this.title} (${gradeRange}): ${this.day} at ${this.formattedStartTime}`;
    }

    /**
     * Gets class duration in minutes
     * @returns {number} Duration in minutes
     */
    get durationMinutes() {
        if (this.length) return this.length;
        
        if (this.startTime && this.endTime) {
            const start = new Date(this.startTime);
            const end = new Date(this.endTime);
            return Math.round((end - start) / (1000 * 60));
        }
        
        return 0;
    }

    /**
     * Gets formatted duration
     * @returns {string} Formatted duration
     */
    get formattedDuration() {
        const minutes = this.durationMinutes;
        if (minutes < 60) return `${minutes} min`;
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (remainingMinutes === 0) return `${hours}h`;
        return `${hours}h ${remainingMinutes}m`;
    }

    /**
     * Checks if the class is suitable for a specific grade
     * @param {string|number} grade - Grade to check
     * @returns {boolean} True if grade is within range
     */
    isGradeEligible(grade) {
        const gradeNum = this.gradeToNumber(grade);
        const minNum = this.gradeToNumber(this.minimumGrade);
        const maxNum = this.gradeToNumber(this.maximumGrade);
        
        return gradeNum >= minNum && gradeNum <= maxNum;
    }

    /**
     * Converts grade to number for comparison
     * @param {string|number} grade - Grade to convert
     * @returns {number} Numeric grade value
     */
    gradeToNumber(grade) {
        if (typeof grade === 'number') return grade;
        
        const gradeStr = grade.toString().toLowerCase();
        if (gradeStr === 'k' || gradeStr === 'kindergarten') return 0;
        if (gradeStr.includes('pre')) return -1;
        
        const num = parseInt(gradeStr);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Gets the time slot as a string
     * @returns {string} Time slot description
     */
    get timeSlot() {
        return `${this.day} ${this.formattedStartTime} - ${this.formattedEndTime}`;
    }

    /**
     * Validates if the class object has required fields
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validate() {
        const errors = [];
        
        if (!this.title) errors.push('Class title is required');
        if (!this.instructorId) errors.push('Instructor is required');
        if (!this.day) errors.push('Day is required');
        if (!this.startTime) errors.push('Start time is required');
        if (!this.instrument) errors.push('Instrument is required');
        if (!this.minimumGrade) errors.push('Minimum grade is required');
        if (!this.maximumGrade) errors.push('Maximum grade is required');
        
        // Validate grade range
        if (this.minimumGrade && this.maximumGrade) {
            const minNum = this.gradeToNumber(this.minimumGrade);
            const maxNum = this.gradeToNumber(this.maximumGrade);
            if (minNum > maxNum) {
                errors.push('Minimum grade cannot be higher than maximum grade');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Converts the class to a plain object for API responses
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            instructorId: this.instructorId,
            day: this.day,
            startTime: this.startTime,
            length: this.length,
            endTime: this.endTime,
            instrument: this.instrument,
            title: this.title,
            size: this.size,
            minimumGrade: this.minimumGrade,
            maximumGrade: this.maximumGrade,
            roomId: this.roomId,
            description: this.description,
            isActive: this.isActive,
            formattedStartTime: this.formattedStartTime,
            formattedEndTime: this.formattedEndTime,
            formattedMinimumGrade: this.formattedMinimumGrade,
            formattedMaximumGrade: this.formattedMaximumGrade,
            formattedName: this.formattedName,
            durationMinutes: this.durationMinutes,
            formattedDuration: this.formattedDuration,
            timeSlot: this.timeSlot
        };
    }
}
