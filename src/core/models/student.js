/**
 * Student data model - for database operations only
 * Simple data container with minimal logic
 */
export class Student {
  /**
   * Creates a Student data model instance
   * @param {string} id - Unique identifier
   * @param {string} lastName - Last name
   * @param {string} firstName - First name
   * @param {string} lastNickname - Last nickname
   * @param {string} firstNickname - First nickname
   * @param {string} grade - Grade level
   * @param {string} parent1Id - Primary parent ID
   * @param {string} parent2Id - Secondary parent ID
   */
  constructor(
    id,
    lastName,
    firstName,
    lastNickname,
    firstNickname,
    grade,
    parent1Id,
    parent2Id
  ) {
    this.id = id;
    this.lastName = lastName;
    this.firstName = firstName;
    this.lastNickname = lastNickname;
    this.firstNickname = firstNickname;
    this.grade = grade;
    this.parent1Id = parent1Id;
    this.parent2Id = parent2Id;
  }

  /**
   * Gets parent IDs array for database queries
   * @returns {Array<string>} Array of parent IDs
   */
  get parents() {
    return [this.parent1Id, this.parent2Id].filter(Boolean);
  }
}
