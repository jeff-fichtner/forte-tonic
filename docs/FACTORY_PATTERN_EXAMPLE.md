# Factory Pattern for Model Creation

## Current Dual Constructor Problem
```javascript
// Confusing - which signature should I use?
new Room(roomData)  // object
new Room(id, name, altName, includeId)  // positional
```

## Industry Standard: Factory Pattern
```javascript
export class Room {
  constructor(id, name, altName = null, options = {}) {
    this.id = id;
    this.name = name;
    this.altName = altName;
    this.capacity = options.capacity || null;
    this.location = options.location || null;
    this.equipment = Array.isArray(options.equipment) ? options.equipment : [];
    this.isActive = options.isActive !== false; // default true
    this.description = options.description || null;
    this.includeRoomId = options.includeRoomId || false;
  }

  // Factory methods for different creation contexts
  static fromDatabaseRow(row) {
    return new Room(row.id, row.name, row.altName, {
      capacity: row.capacity,
      location: row.location,
      equipment: JSON.parse(row.equipment || '[]'),
      isActive: row.isActive,
      description: row.description
    });
  }

  static fromApiData(data) {
    return new Room(data.id, data.name, data.altName, {
      capacity: data.capacity,
      location: data.location,
      equipment: data.equipment,
      isActive: data.isActive,
      description: data.description,
      includeRoomId: data.includeRoomId
    });
  }

  static create(name, options = {}) {
    const id = options.id || generateId();
    return new Room(id, name, null, options);
  }
}

// Usage:
const room1 = Room.fromDatabaseRow(dbRow);
const room2 = Room.fromApiData(apiResponse);
const room3 = Room.create('New Room', { capacity: 25 });
```

## Alternative: Builder Pattern
```javascript
export class RoomBuilder {
  constructor() {
    this.data = {};
  }

  id(id) { this.data.id = id; return this; }
  name(name) { this.data.name = name; return this; }
  capacity(cap) { this.data.capacity = cap; return this; }
  location(loc) { this.data.location = loc; return this; }
  
  build() {
    if (!this.data.id || !this.data.name) {
      throw new Error('Room requires id and name');
    }
    return new Room(this.data.id, this.data.name, null, this.data);
  }
}

// Usage:
const room = new RoomBuilder()
  .id('room-1')
  .name('Piano Room')
  .capacity(4)
  .location('First Floor')
  .build();
```

## Separation of Concerns Benefits

### Data Transfer Objects (DTOs)
```javascript
// src/shared/dto/roomDto.js
export class RoomCreateDto {
  constructor(data) {
    this.name = data.name;
    this.capacity = data.capacity;
    this.location = data.location;
    this.equipment = data.equipment || [];
  }

  validate() {
    const errors = [];
    if (!this.name) errors.push('Name is required');
    if (this.capacity && this.capacity < 1) errors.push('Capacity must be positive');
    return { isValid: errors.length === 0, errors };
  }
}

// src/domain/entities/room.js
export class Room {
  constructor(id, name, options = {}) {
    this.id = id;
    this.name = name;
    this.capacity = options.capacity;
    // ... other properties
  }

  // Domain logic only
  canAccommodate(peopleCount) {
    return this.capacity >= peopleCount;
  }
}

// src/domain/factories/roomFactory.js
export class RoomFactory {
  static fromCreateDto(dto, id) {
    return new Room(id, dto.name, {
      capacity: dto.capacity,
      location: dto.location,
      equipment: dto.equipment
    });
  }

  static fromDatabaseRow(row) {
    return new Room(row.id, row.name, {
      capacity: row.capacity,
      location: row.location,
      equipment: JSON.parse(row.equipment || '[]'),
      isActive: row.is_active
    });
  }
}
```

## Migration Strategy

1. **Create factory methods** for each current constructor path
2. **Update all instantiation points** to use factories
3. **Remove dual constructor logic**
4. **Add proper validation** in factory methods
5. **Separate DTOs** for API boundaries

This approach provides:
- ✅ Clear, single-purpose constructors
- ✅ Explicit creation contexts
- ✅ Easy testing and mocking
- ✅ Better error handling
- ✅ Separation of concerns
- ✅ Industry standard patterns
