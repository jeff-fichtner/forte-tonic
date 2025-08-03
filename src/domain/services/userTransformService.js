/**
 * User Transform Service - Converts core models to API-compatible data
 * Ensures frontend gets consistent, rich data structures
 */
export class UserTransformService {
  /**
   * Transform core Admin model to API data
   * @param {Admin} admin - Core admin model
   * @returns {object} API-compatible admin data
   */
  static transformAdmin(admin) {
    if (!admin) return null;

    return {
      id: admin.id,
      email: admin.email,
      lastName: admin.lastName,
      firstName: admin.firstName,
      phoneNumber: admin.phone, // Map phone to phoneNumber for consistency
      phone: admin.phone, // Keep both for compatibility
      fullName: `${admin.firstName} ${admin.lastName}`,
      isActive: true,
      role: 'admin',
      // Add any additional computed properties that frontend expects
    };
  }

  /**
   * Transform core Instructor model to API data
   * @param {Instructor} instructor - Core instructor model
   * @returns {object} API-compatible instructor data
   */
  static transformInstructor(instructor) {
    if (!instructor) return null;

    // Manually compute instruments array from individual instrument properties
    const instruments = [
      instructor.instrument1,
      instructor.instrument2,
      instructor.instrument3,
      instructor.instrument4,
    ].filter(Boolean); // Remove empty/null values

    return {
      id: instructor.id,
      email: instructor.email,
      lastName: instructor.lastName,
      firstName: instructor.firstName,
      phoneNumber: instructor.phone, // Map phone to phoneNumber for consistency
      phone: instructor.phone, // Keep both for compatibility
      fullName: `${instructor.firstName} ${instructor.lastName}`,
      specialties: instruments, // Use computed instruments
      instruments: instruments, // Provide both for compatibility
      isActive: !instructor.isDeactivated,
      role: 'instructor',
      gradeRange: {
        min: instructor.minimumGrade,
        max: instructor.maximumGrade,
      },
      availability: this._transformAvailability(instructor),
      // Add any additional computed properties that frontend expects
    };
  }

  /**
   * Transform core Student model to API data
   * @param {Student} student - Core student model
   * @returns {object} API-compatible student data
   */
  static transformStudent(student) {
    if (!student) return null;

    return {
      id: student.id,
      lastName: student.lastName,
      firstName: student.firstName,
      lastNickname: student.lastNickname,
      firstNickname: student.firstNickname,
      grade: student.grade,
      parent1Id: student.parent1Id,
      parent2Id: student.parent2Id,
      fullName: `${student.firstName} ${student.lastName}`,
      displayName:
        student.firstNickname && student.lastNickname
          ? `${student.firstNickname} ${student.lastNickname}`
          : `${student.firstName} ${student.lastName}`,
      // Add any additional computed properties that frontend expects
    };
  }

  /**
   * Transform core Parent model to API data
   * @param {Parent} parent - Core parent model
   * @returns {object} API-compatible parent data
   */
  static transformParent(parent) {
    if (!parent) return null;

    return {
      id: parent.id,
      email: parent.email,
      lastName: parent.lastName,
      firstName: parent.firstName,
      phone: parent.phone,
      cellPhone: parent.cellPhone,
      fullName: `${parent.firstName} ${parent.lastName}`,
      role: 'parent',
      // Add any additional computed properties that frontend expects
    };
  }

  /**
   * Transform instructor availability data
   * @private
   * @param {Instructor} instructor - Core instructor model
   * @returns {object} Availability object
   */
  static _transformAvailability(instructor) {
    const availability = {};

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    days.forEach(day => {
      const isAvailable = instructor[`isAvailable${day.charAt(0).toUpperCase() + day.slice(1)}`];
      const startTime = instructor[`${day}StartTime`];
      const endTime = instructor[`${day}EndTime`];
      const roomId = instructor[`${day}RoomId`];

      availability[day] = {
        isAvailable,
        startTime,
        endTime,
        roomId,
      };
    });

    return availability;
  }

  /**
   * Transform arrays of core models to API data
   * @param {Array} items - Array of core models
   * @param {string} type - Type of model ('admin', 'instructor', 'student', 'parent')
   * @returns {Array} Array of API-compatible data
   */
  static transformArray(items, type) {
    if (!Array.isArray(items)) return [];

    const transformMethod = this[`transform${type.charAt(0).toUpperCase() + type.slice(1)}`];
    if (!transformMethod) {
      throw new Error(`Unknown transform type: ${type}`);
    }

    return items.map(item => transformMethod.call(this, item)).filter(Boolean);
  }
}
