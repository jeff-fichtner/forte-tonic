/**
 * Student Repository - handles student-specific data operations
 */

import { BaseRepository } from './baseRepository.js';
import { Student } from '../models/shared/student.js'; // Data layer model
import { Keys } from '../utils/values/keys.js';

export class StudentRepository extends BaseRepository {
  constructor(dbClient) {
    super(Keys.STUDENTS, Student, dbClient);
  }

  /**
   * Finds students by grade level
   */
  async findByGradeLevel(gradeLevel) {
    return await this.findBy('grade', gradeLevel);
  }

  /**
   * Finds students by parent ID
   */
  async findByParentId(parentId) {
    const all = await this.findAll();
    return all.filter(student => student.parent1Id === parentId || student.parent2Id === parentId);
  }

  /**
   * Finds active students
   */
  async findActive() {
    return await this.findAll({ isActive: true });
  }

  /**
   * Searches students by name or email
   */
  async search(searchTerm) {
    if (!searchTerm) return await this.findAll();

    const all = await this.findAll();
    const term = searchTerm.toLowerCase();

    return all.filter(
      student =>
        student.firstName?.toLowerCase().includes(term) ||
        student.lastName?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term) ||
        student.studentId?.toLowerCase().includes(term)
    );
  }

  /**
   * Finds students with missing emergency contacts
   */
  async findWithoutEmergencyContact() {
    const all = await this.findAll();
    return all.filter(student => !student.emergencyContactName || !student.emergencyContactPhone);
  }

  /**
   * Gets paginated students with search and filters
   */
  async findPaginated(options = {}) {
    const {
      searchTerm,
      gradeLevel,
      isActive,
      hasEmergencyContact,
      parentId,
      page = 1,
      pageSize = 1000,
      sortBy = 'lastName',
      sortOrder = 'asc',
    } = options;

    let students = await this.findAll();

    // Apply filters
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      students = students.filter(
        student =>
          student.firstName?.toLowerCase().includes(term) ||
          student.lastName?.toLowerCase().includes(term) ||
          student.email?.toLowerCase().includes(term) ||
          student.studentId?.toLowerCase().includes(term)
      );
    }

    if (gradeLevel) {
      students = students.filter(student => student.grade === gradeLevel);
    }

    if (isActive !== undefined) {
      students = students.filter(student => student.isActive === isActive);
    }

    if (hasEmergencyContact !== undefined) {
      students = students.filter(student => {
        const hasContact = !!(student.emergencyContactName && student.emergencyContactPhone);
        return hasContact === hasEmergencyContact;
      });
    }

    if (parentId) {
      students = students.filter(
        student => student.parent1Id === parentId || student.parent2Id === parentId
      );
    }

    // Sort
    students.sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      const comparison = aVal.toString().localeCompare(bVal.toString());
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Paginate
    const totalCount = students.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedStudents = students.slice(startIndex, endIndex);

    return {
      students: paginatedStudents,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      hasNext: page * pageSize < totalCount,
      hasPrevious: page > 1,
    };
  }
}
