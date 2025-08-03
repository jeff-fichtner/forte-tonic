/**
 * Room model - unified for both backend and frontend use
 */
export class Room {
    /**
     * Creates a Room instance
     * @param {Object|string} data - Object with properties OR id as first positional parameter
     * @param {string} [name] - Room name (if using positional parameters)
     * @param {string} [altName] - Alternative name (if using positional parameters)
     * @param {boolean} [includeRoomId] - Whether to include room ID in formatted name (if using positional parameters)
     */
    constructor(data, name, altName, includeRoomId) {
        if (typeof data === 'object' && data !== null) {
            // Object destructuring constructor (web pattern)
            const {
                id,
                name: roomName,
                altName: alternativeName,
                includeRoomId: includeId,
                capacity,
                location,
                equipment = [],
                isActive = true,
                description
            } = data;

            this.id = id;
            this.name = roomName;
            this.altName = alternativeName;
            this.includeRoomId = includeId;
            this.capacity = capacity;
            this.location = location;
            this.equipment = Array.isArray(equipment) ? equipment : [];
            this.isActive = isActive;
            this.description = description;
        } else {
            // Positional constructor (core pattern)
            this.id = data;
            this.name = name;
            this.altName = altName;
            this.includeRoomId = includeRoomId;
            this.capacity = null;
            this.location = null;
            this.equipment = [];
            this.isActive = true;
            this.description = null;
        }
    }

    /**
     * Gets formatted room name with optional alternative name and ID
     * @returns {string} Formatted room name
     */
    get formattedName() {
        let formattedName = this.name;

        if (this.altName) {
            formattedName += ` (${this.altName})`;
        }

        if (this.includeRoomId) {
            formattedName += ` (${this.id})`;
        }

        return formattedName;
    }

    /**
     * Gets display name for UI
     * @returns {string} Display name
     */
    get displayName() {
        return this.formattedName;
    }

    /**
     * Gets room identifier - uses altName if available, otherwise name
     * @returns {string} Room identifier
     */
    get identifier() {
        return this.altName || this.name || this.id;
    }

    /**
     * Checks if room has specific equipment
     * @param {string} equipmentName - Equipment to check for
     * @returns {boolean} True if room has the equipment
     */
    hasEquipment(equipmentName) {
        return this.equipment.some(eq => 
            eq.toLowerCase().includes(equipmentName.toLowerCase())
        );
    }

    /**
     * Adds equipment to the room
     * @param {string} equipmentName - Equipment to add
     */
    addEquipment(equipmentName) {
        if (!this.hasEquipment(equipmentName)) {
            this.equipment.push(equipmentName);
        }
    }

    /**
     * Removes equipment from the room
     * @param {string} equipmentName - Equipment to remove
     */
    removeEquipment(equipmentName) {
        this.equipment = this.equipment.filter(eq => 
            !eq.toLowerCase().includes(equipmentName.toLowerCase())
        );
    }

    /**
     * Gets formatted equipment list
     * @returns {string} Comma-separated equipment list
     */
    get formattedEquipment() {
        return this.equipment.join(', ');
    }

    /**
     * Checks if room is suitable for a specific instrument
     * @param {string} instrument - Instrument to check
     * @returns {boolean} True if room is suitable
     */
    isSuitableForInstrument(instrument) {
        if (!instrument) return true;
        
        const instrumentLower = instrument.toLowerCase();
        
        // Piano rooms need pianos
        if (instrumentLower.includes('piano')) {
            return this.hasEquipment('piano');
        }
        
        // Drums need drum sets
        if (instrumentLower.includes('drum')) {
            return this.hasEquipment('drum');
        }
        
        // Most other instruments are flexible
        return true;
    }

    /**
     * Gets room size category based on capacity
     * @returns {string} Size category
     */
    get sizeCategory() {
        if (!this.capacity) return 'Unknown';
        
        if (this.capacity <= 5) return 'Small';
        if (this.capacity <= 15) return 'Medium';
        if (this.capacity <= 30) return 'Large';
        return 'Extra Large';
    }

    /**
     * Checks if room can accommodate a specific number of people
     * @param {number} requiredCapacity - Required capacity
     * @returns {boolean} True if room can accommodate
     */
    canAccommodate(requiredCapacity) {
        if (!this.capacity) return true; // Unknown capacity assumed adequate
        return this.capacity >= requiredCapacity;
    }

    /**
     * Gets full location description
     * @returns {string} Full location description
     */
    get fullLocation() {
        const parts = [];
        
        if (this.location) parts.push(this.location);
        if (this.name) parts.push(this.name);
        if (this.altName && this.altName !== this.name) parts.push(`(${this.altName})`);
        
        return parts.join(' - ');
    }

    /**
     * Validates if the room object has required fields
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validate() {
        const errors = [];
        
        if (!this.id) errors.push('Room ID is required');
        if (!this.name) errors.push('Room name is required');
        
        if (this.capacity && this.capacity < 1) {
            errors.push('Capacity must be greater than 0');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Converts the room to a plain object for API responses
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            altName: this.altName,
            includeRoomId: this.includeRoomId,
            capacity: this.capacity,
            location: this.location,
            equipment: this.equipment,
            isActive: this.isActive,
            description: this.description,
            formattedName: this.formattedName,
            displayName: this.displayName,
            identifier: this.identifier,
            formattedEquipment: this.formattedEquipment,
            sizeCategory: this.sizeCategory,
            fullLocation: this.fullLocation
        };
    }
}
