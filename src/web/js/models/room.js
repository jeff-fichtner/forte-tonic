/**
 *
 */
export class Room {
  /**
   *
   */
  constructor({ id, name, altName, includeRoomId }) {
    this.id = id;
    this.name = name;
    this.altName = altName;
    this.includeRoomId = includeRoomId;
  }
  /**
   *
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
}

// For backwards compatibility with existing code
window.Room = Room;
