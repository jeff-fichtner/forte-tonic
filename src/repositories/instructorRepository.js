/**
 * Instructor Repository - handles instructor-specific data operations
 */

import { BaseRepository } from './baseRepository.js';
import { Instructor } from '../../shared/models/instructor.js'; // Data layer model
import { Keys } from '../utils/values/keys.js';

export class InstructorRepository extends BaseRepository {
  constructor(dbClient) {
    super(Keys.INSTRUCTORS, Instructor, dbClient);
  }

  /**
   * Finds active instructors
   */
  async findActive() {
    const all = await this.findAll();
    return all.filter(instructor => !instructor.isDeactivated);
  }

  /**
   * Finds instructors by instrument
   */
  async findByInstrument(instrument) {
    const all = await this.findAll();
    return all.filter(instructor =>
      instructor.instruments.some(inst => inst.toLowerCase() === instrument.toLowerCase())
    );
  }

  /**
   * Finds instructors available on a specific day
   */
  async findAvailableOnDay(day) {
    const all = await this.findAll();
    const dayField = `isAvailable${day.charAt(0).toUpperCase() + day.slice(1)}`;
    return all.filter(instructor => instructor[dayField]);
  }

  /**
   * Finds instructors who can teach a specific grade range
   */
  async findByGradeRange(gradeLevel) {
    const all = await this.findAll();
    const grade = parseInt(gradeLevel);

    return all.filter(instructor => {
      const minGrade = parseInt(instructor.minimumGrade || 0);
      const maxGrade = parseInt(instructor.maximumGrade || 12);
      return grade >= minGrade && grade <= maxGrade;
    });
  }

  /**
   * Finds instructors by email
   */
  async findByEmail(email) {
    if (!email) return null;
    return await this.findOneBy('email', email);
  }

  /**
   * Gets instructor availability for a specific day
   */
  async getAvailability(instructorId, day) {
    const instructor = await this.findById(instructorId);
    if (!instructor) return null;

    const dayCapitalized = day.charAt(0).toUpperCase() + day.slice(1);
    const isAvailable = instructor[`isAvailable${dayCapitalized}`];

    if (!isAvailable) return null;

    return {
      day,
      isAvailable: true,
      startTime: instructor[`${day}StartTime`],
      endTime: instructor[`${day}EndTime`],
      roomId: instructor[`${day}RoomId`],
    };
  }

  /**
   * Finds instructors matching multiple criteria
   */
  async findMatching(criteria = {}) {
    const { instrument, gradeLevel, day, activeOnly = true } = criteria;

    let instructors = await this.findAll();

    if (activeOnly) {
      instructors = instructors.filter(instructor => !instructor.isDeactivated);
    }

    if (instrument) {
      instructors = instructors.filter(instructor =>
        instructor.instruments.some(inst => inst.toLowerCase() === instrument.toLowerCase())
      );
    }

    if (gradeLevel) {
      const grade = parseInt(gradeLevel);
      instructors = instructors.filter(instructor => {
        const minGrade = parseInt(instructor.minimumGrade || 0);
        const maxGrade = parseInt(instructor.maximumGrade || 12);
        return grade >= minGrade && grade <= maxGrade;
      });
    }

    if (day) {
      const dayField = `isAvailable${day.charAt(0).toUpperCase() + day.slice(1)}`;
      instructors = instructors.filter(instructor => instructor[dayField]);
    }

    return instructors;
  }

  /**
   * Gets instructor schedule for all days
   */
  async getFullSchedule(instructorId) {
    const instructor = await this.findById(instructorId);
    if (!instructor) return null;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const schedule = {};

    days.forEach(day => {
      const dayCapitalized = day.charAt(0).toUpperCase() + day.slice(1);
      const isAvailable = instructor[`isAvailable${dayCapitalized}`];

      schedule[day] = {
        isAvailable,
        startTime: isAvailable ? instructor[`${day}StartTime`] : null,
        endTime: isAvailable ? instructor[`${day}EndTime`] : null,
        roomId: isAvailable ? instructor[`${day}RoomId`] : null,
      };
    });

    return {
      instructorId,
      instructor,
      schedule,
    };
  }
}
