/**
 * Room model - unified for both backend and frontend use
 *
 * Database fields (persisted in Rooms sheet):
 * - id, name, altName, includeRoomId
 */
export class Room {
  /**
   * Creates a Room instance
   * @param {object} data - Room data object
   */
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.altName = data.altName || null;
    this.includeRoomId = data.includeRoomId || false;
  }

  /**
   * Factory method for creating from database row data (positional parameters)
   * @param {Array} row - Database row array with positional data
   * @returns {Room} Room instance
   */
  static fromDatabaseRow(row) {
    const [id, name, altName, includeRoomId] = row;

    return new Room({ id, name, altName, includeRoomId });
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
   * Converts the room to a plain object for API responses
   * @returns {object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      altName: this.altName,
      includeRoomId: this.includeRoomId,
      formattedName: this.formattedName,
      displayName: this.displayName,
      identifier: this.identifier,
    };
  }
}
