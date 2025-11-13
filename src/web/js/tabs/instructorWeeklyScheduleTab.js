import { BaseTab } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatGrade, formatTime } from '../extensions/numberExtensions.js';
import { RegistrationType } from '../constants.js';
import { copyToClipboard } from '../utilities/clipboardHelpers.js';

/**
 * InstructorWeeklyScheduleTab - Weekly schedule for instructors
 *
 * Shows instructor's weekly schedule organized by day of week with:
 * - Student names and grades
 * - Lesson times and durations
 * - Instruments/classes
 * - Contact information (email copy)
 *
 * Data needed: registrations for instructor, students, instructors (for table building), classes
 * Data waste eliminated: ~2000+ records (other instructors' registrations, unrelated students)
 */
export class InstructorWeeklyScheduleTab extends BaseTab {
  constructor() {
    super('instructor-weekly-schedule');

    /** @private {Map<string, Table>} Tables by day */
    this.dayTables = new Map();
  }

  /**
   * Fetch weekly schedule data for instructor
   * Returns registrations for this instructor + associated students + classes
   * @param {object} sessionInfo - User session
   * @returns {Promise<object>} Weekly schedule data
   */
  async fetchData(sessionInfo) {
    const instructorId = sessionInfo?.user?.instructor?.id;
    if (!instructorId) {
      throw new Error('No instructor ID found in session');
    }

    const response = await fetch(
      `/api/instructor/tabs/weekly-schedule?instructorId=${instructorId}`,
      {
        signal: this.getAbortSignal(),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Unwrap the data from { success: true, data: {...} } envelope
    const data = result.data || result;

    // Validate response
    if (!data.registrations || !data.students || !data.instructors || !data.classes) {
      throw new Error('Invalid response: missing required data');
    }

    return data;
  }

  /**
   * Render the weekly schedule tables (one per day)
   */
  async render() {
    const container = this.getContainer();

    // Find or create the tables container
    let tablesContainer = container.querySelector('#instructor-weekly-schedule-tables');
    if (!tablesContainer) {
      tablesContainer = document.createElement('div');
      tablesContainer.id = 'instructor-weekly-schedule-tables';
      container.appendChild(tablesContainer);
    }

    // Clear existing content
    tablesContainer.innerHTML = '';
    this.dayTables.clear();

    // Show 'no matching registrations' message if instructor has no registrations
    if (this.data.registrations.length === 0) {
      const noRegistrationsMessage = document.createElement('div');
      noRegistrationsMessage.className = 'card-panel orange lighten-4';
      noRegistrationsMessage.style.cssText = 'text-align: center; padding: 30px; margin: 20px 0;';
      noRegistrationsMessage.innerHTML = `
        <h5 style="color: #e65100; margin-bottom: 10px;">No Scheduled Lessons</h5>
        <p style="color: #bf360c; font-size: 16px; margin: 0;">
          You currently have no scheduled lessons.
        </p>
      `;
      tablesContainer.appendChild(noRegistrationsMessage);
      return;
    }

    // Get unique days with registrations, sorted by day of week
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const daysWithRegistrations = [...new Set(this.data.registrations.map(reg => reg.day))].sort(
      (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
    );

    // Create a table for each day
    daysWithRegistrations.forEach(day => {
      // Create a container for each day's table with padding
      const dayContainer = document.createElement('div');
      dayContainer.style.cssText = 'margin-bottom: 30px;';

      // Add a day header for better organization
      const dayHeader = document.createElement('h5');
      dayHeader.textContent = day;
      dayHeader.style.cssText =
        'color: #2b68a4; margin-bottom: 15px; margin-top: 20px; font-weight: bold;';
      dayContainer.appendChild(dayHeader);

      // Create table element
      const tableId = `instructor-weekly-schedule-table-${day}`;
      const tableElement = document.createElement('table');
      tableElement.id = tableId;
      dayContainer.appendChild(tableElement);

      tablesContainer.appendChild(dayContainer);

      // Sort registrations for this day by start time, length, instrument, and grade
      const dayRegistrations = this.data.registrations
        .filter(reg => reg.day === day)
        .sort((a, b) => {
          // First, sort by start time
          const timeA = a.startTime || '';
          const timeB = b.startTime || '';
          if (timeA !== timeB) {
            return timeA.localeCompare(timeB);
          }

          // Then sort by length
          const lengthA = a.length || 0;
          const lengthB = b.length || 0;
          if (lengthA !== lengthB) {
            return lengthA - lengthB;
          }

          // Then sort by instrument/class
          const instrumentA = a.instrument || a.classTitle || '';
          const instrumentB = b.instrument || b.classTitle || '';
          if (instrumentA !== instrumentB) {
            return instrumentA.localeCompare(instrumentB);
          }

          // Finally sort by student grade
          const studentA = this.findStudent(a.studentId);
          const studentB = this.findStudent(b.studentId);
          const gradeA = studentA?.grade || '';
          const gradeB = studentB?.grade || '';
          return String(gradeA).localeCompare(String(gradeB));
        });

      // Build the table for this day
      const table = this.#buildWeeklyScheduleTable(tableId, dayRegistrations);
      this.dayTables.set(day, table);
    });
  }

  /**
   * Build a weekly schedule table for a specific day
   * @private
   */
  #buildWeeklyScheduleTable(tableId, enrollments) {
    const headers = [
      'Weekday',
      'Start Time',
      'Length',
      'Student',
      'Grade',
      'Instructor',
      'Instrument/Class',
      'Contact',
    ];

    return new Table(
      tableId,
      headers,
      this.#buildTableRow.bind(this),
      enrollments,
      this.#handleTableClick.bind(this)
    );
  }

  /**
   * Build a table row for an enrollment
   * @private
   */
  #buildTableRow(enrollment) {
    const instructor = this.findInstructor(enrollment.instructorId);
    const student = this.findStudent(enrollment.studentId);

    if (!instructor || !student) {
      console.warn(
        `Instructor or student not found for enrollment: ${enrollment.id?.value || enrollment.id}`
      );
      return '';
    }

    // Determine instrument/class name
    const instrumentOrClass =
      enrollment.registrationType === RegistrationType.GROUP
        ? enrollment.classTitle || 'N/A'
        : enrollment.instrument || 'N/A';

    return `
      <td>${enrollment.day}</td>
      <td>${formatTime(enrollment.startTime) || 'N/A'}</td>
      <td>${enrollment.length || 'N/A'} min</td>
      <td>${student.firstName} ${student.lastName}</td>
      <td>${formatGrade(student.grade) || 'N/A'}</td>
      <td>${instructor.firstName} ${instructor.lastName}</td>
      <td>${instrumentOrClass}</td>
      <td>
        <button type="button" class="btn-flat" style="padding: 0; min-width: 0; background: none; border: none; cursor: pointer;" data-registration-id="${enrollment.id?.value || enrollment.id}">
          <i class="material-icons copy-emails-table-icon gray-text text-darken-4">email</i>
        </button>
      </td>
    `;
  }

  /**
   * Handle table clicks (email copy for instructor view)
   * @private
   */
  async #handleTableClick(event) {
    const isCopy = event.target.classList.contains('copy-emails-table-icon');
    if (!isCopy) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Get the registration ID from the data attribute
    const buttonElement = event.target.closest('button');
    const registrationId = buttonElement?.getAttribute('data-registration-id');
    if (!registrationId) return;

    // Find the enrollment by ID
    const currentEnrollment = this.data.registrations.find(
      e => (e.id?.value || e.id) === registrationId
    );
    if (!currentEnrollment) return;

    // For instructor view: show parent emails
    const studentIdToFind = currentEnrollment.studentId?.value || currentEnrollment.studentId;
    const student = this.findStudent(studentIdToFind);

    if (student && student.parentEmails && student.parentEmails.trim()) {
      await copyToClipboard(student.parentEmails);
    } else {
      if (typeof M !== 'undefined') {
        M.toast({ html: 'No parent email available for this student.' });
      }
    }
  }

  /**
   * Cleanup when tab is unloaded
   */
  async cleanup() {
    this.dayTables.clear();
  }
}
