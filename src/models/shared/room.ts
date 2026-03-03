/**
 * Room model - unified for both backend and frontend use
 *
 * Database fields (persisted in Rooms sheet):
 * - id, name, altName, includeRoomId
 */

export interface RoomData {
  id: string;
  name: string;
  altName?: string | null;
  includeRoomId?: boolean;
}

export interface RoomJSON {
  id: string;
  name: string;
  altName: string | null;
  includeRoomId: boolean;
  formattedName: string;
  displayName: string;
  identifier: string;
}

export class Room {
  /** Column schema: positional order of fields in the rooms spreadsheet */
  static readonly columns = ['id', 'name', 'altName', 'includeRoomId'] as const;

  id: string;
  name: string;
  altName: string | null;
  includeRoomId: boolean;

  /**
   * Creates a Room instance
   */
  constructor(data: RoomData) {
    this.id = data.id;
    this.name = data.name;
    this.altName = data.altName || null;
    this.includeRoomId = data.includeRoomId || false;
  }

  /**
   * Factory method for creating from database record (named fields, pre-mapped by DB client).
   * DB client mappings produce: includeRoomId (boolean).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDatabaseRow(record: Record<string, any>): Room {
    // SC-005: mappings produce boolean
    return new Room({
      id: record.id,
      name: record.name,
      altName: record.altName,
      includeRoomId: record.includeRoomId,
    });
  }

  /**
   * Gets formatted room name with optional alternative name and ID
   */
  get formattedName(): string {
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
   */
  get displayName(): string {
    return this.formattedName;
  }

  /**
   * Gets room identifier - uses altName if available, otherwise name
   */
  get identifier(): string {
    return this.altName || this.name || this.id;
  }

  /**
   * Converts the room to a plain object for API responses
   */
  toJSON(): RoomJSON {
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
