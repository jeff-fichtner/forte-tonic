import { BaseTab } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatGrade, formatTime } from '../extensions/numberExtensions.js';
import { RegistrationType } from '../constants.js';
import { PeriodType } from '../constants/periodTypeConstants.js';
import { copyToClipboard } from '../utilities/clipboardHelpers.js';

// Intent labels (matching viewModel.js)
const INTENT_LABELS = {
  keep: '✅ Keep',
  drop: '❌ Drop',
  change: '🔄 Change',
};

/**
 * ParentWeeklyScheduleTab - Weekly schedule for parents
 *
 * Shows weekly schedule for parent's children organized by student with:
 * - Student names and grades
 * - Lesson times and durations
 * - Instruments/classes
 * - Instructor contact information (email copy)
 * - Intent column (during intent period)
 * - Wait list section (Rock Band registrations)
 *
 * Data needed: registrations for parent's children, students, instructors, classes
 * Data waste eliminated: ~1800+ records (other parents' data, unrelated students)
 */
export class ParentWeeklyScheduleTab extends BaseTab {
  constructor() {
    super('parent-weekly-schedule');

    /** @private {Map<string, Table>} Tables by student */
    this.studentTables = new Map();

    /** @private {Table|null} Wait list table */
    this.waitListTable = null;
  }

  /**
   * Fetch weekly schedule data for parent's children
   * Returns registrations for BOTH current and next trimester
   * @param {object} sessionInfo - User session
   * @returns {Promise<object>} Weekly schedule data for both trimesters
   */
  async fetchData(sessionInfo) {
    const parentId = sessionInfo?.user?.parent?.id;
    if (!parentId) {
      throw new Error('No parent ID found in session');
    }

    // Get current and next trimester info from UserSession
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const nextPeriod = window.UserSession?.getNextPeriod();

    if (!currentPeriod || !nextPeriod) {
      throw new Error('Period information not available');
    }

    // Fetch data for both trimesters in parallel
    const [currentData, nextData] = await Promise.all([
      this.#fetchTrimesterData(parentId, currentPeriod.trimester),
      this.#fetchTrimesterData(parentId, nextPeriod.trimester),
    ]);

    return {
      currentTrimester: {
        name: currentPeriod.trimester,
        data: currentData,
      },
      nextTrimester: {
        name: nextPeriod.trimester,
        data: nextData,
      },
      // Merge students, instructors, classes from both trimesters (deduplicated)
      students: this.#mergeUnique([...currentData.students, ...nextData.students], 'id'),
      instructors: this.#mergeUnique([...currentData.instructors, ...nextData.instructors], 'id'),
      classes: this.#mergeUnique([...currentData.classes, ...nextData.classes], 'id'),
    };
  }

  /**
   * Fetch data for a specific trimester
   * @private
   */
  async #fetchTrimesterData(parentId, trimester) {
    const response = await fetch(
      `/api/parent/tabs/weekly-schedule/${trimester}?parentId=${parentId}`,
      {
        signal: this.getAbortSignal(),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const data = result.data || result;

    // Validate response
    if (!data.registrations || !data.students || !data.instructors || !data.classes) {
      throw new Error('Invalid response: missing required data');
    }

    return data;
  }

  /**
   * Merge arrays and remove duplicates by ID
   * @private
   */
  #mergeUnique(array, idField) {
    const seen = new Set();
    return array.filter(item => {
      const id = item[idField]?.value || item[idField];
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }

  /**
   * Render the weekly schedule tables (one per student + wait list) for BOTH trimesters
   */
  async render() {
    const container = this.getContainer();

    // Find or create the schedule container
    let scheduleContainer = container.querySelector('#parent-weekly-schedule-section');
    if (!scheduleContainer) {
      scheduleContainer = document.createElement('div');
      scheduleContainer.id = 'parent-weekly-schedule-section';
      container.appendChild(scheduleContainer);
    }

    // Clear existing content
    scheduleContainer.innerHTML = '';
    this.studentTables.clear();
    this.waitListTable = null;

    // Render Current Trimester Section
    this.#renderTrimesterSection(scheduleContainer, this.data.currentTrimester, 'current');

    // Render Next Trimester Section
    this.#renderTrimesterSection(scheduleContainer, this.data.nextTrimester, 'next');
  }

  /**
   * Render a section for a specific trimester
   * @private
   */
  #renderTrimesterSection(container, trimesterInfo, sectionType) {
    const { name: trimesterName, data: trimesterData } = trimesterInfo;
    const registrations = trimesterData.registrations;

    // Create trimester header
    const trimesterHeader = document.createElement('h4');
    const capitalizedName = trimesterName.charAt(0).toUpperCase() + trimesterName.slice(1);
    trimesterHeader.textContent = `${capitalizedName} Trimester Schedule`;
    trimesterHeader.style.cssText =
      'color: #1565c0; margin-top: 30px; margin-bottom: 20px; font-weight: bold; border-bottom: 2px solid #1565c0; padding-bottom: 10px;';
    container.appendChild(trimesterHeader);

    // Get Rock Band class IDs from this trimester's data
    const rockBandClassIds = trimesterData.classes
      .filter(c => c.title && c.title.toLowerCase().includes('rock band'))
      .map(c => c.id?.value || c.id);

    // Separate regular registrations from wait list (Rock Band)
    const regularRegistrations = registrations.filter(
      reg => !rockBandClassIds.includes(reg.classId?.value || reg.classId)
    );
    const waitListRegistrations = registrations.filter(reg =>
      rockBandClassIds.includes(reg.classId?.value || reg.classId)
    );

    // Temporarily override this.data.registrations, students, instructors for rendering
    // This allows the existing helper methods (findStudent, findInstructor) to work correctly
    const savedData = {
      registrations: this.data.registrations,
      students: this.data.students,
      instructors: this.data.instructors,
      classes: this.data.classes,
    };

    this.data.registrations = trimesterData.registrations;
    this.data.students = trimesterData.students;
    this.data.instructors = trimesterData.instructors;
    this.data.classes = trimesterData.classes;

    try {
      // Render regular schedule section
      this.#renderScheduleSection(container, regularRegistrations, trimesterName, sectionType);

      // Render wait list section if there are wait list registrations
      if (waitListRegistrations.length > 0) {
        this.#renderWaitListSection(container, waitListRegistrations, trimesterName, sectionType);
      }
    } finally {
      // Restore original data
      this.data.registrations = savedData.registrations;
      this.data.students = savedData.students;
      this.data.instructors = savedData.instructors;
      this.data.classes = savedData.classes;
    }
  }

  /**
   * Render the main schedule section (one table per student)
   * @private
   */
  #renderScheduleSection(container, registrations, trimesterName, sectionType) {
    // Show 'no matching registrations' message if no registrations
    if (registrations.length === 0) {
      const noRegistrationsMessage = document.createElement('div');
      noRegistrationsMessage.className = 'card-panel grey lighten-3';
      noRegistrationsMessage.style.cssText = 'text-align: center; padding: 20px; margin: 20px 0;';
      const capitalizedName = trimesterName.charAt(0).toUpperCase() + trimesterName.slice(1);
      noRegistrationsMessage.innerHTML = `
        <p style="color: #616161; font-size: 14px; margin: 0;">
          No scheduled lessons for ${capitalizedName} trimester
        </p>
      `;
      container.appendChild(noRegistrationsMessage);
      return;
    }

    // Get parent's students from this trimester's data who have registrations
    // Using this.data.students because we've temporarily swapped it to trimester-specific data
    const studentsWithRegistrations = this.data.students.filter(student => {
      const studentId = student.id?.value || student.id;
      return registrations.some(reg => {
        const regStudentId = reg.studentId?.value || reg.studentId;
        return regStudentId === studentId;
      });
    });

    // Sort students by grade
    studentsWithRegistrations.sort((a, b) => {
      const gradeA = a.grade || 0;
      const gradeB = b.grade || 0;
      return gradeA - gradeB;
    });

    // Create a table for each student
    studentsWithRegistrations.forEach(student => {
      const studentId = student.id?.value || student.id;

      // Create a container for each student's table with padding
      const studentContainer = document.createElement('div');
      studentContainer.style.cssText = 'margin-bottom: 30px;';

      // Add a student header for better organization
      const studentHeader = document.createElement('h5');
      studentHeader.textContent = `${student.firstName} ${student.lastName} - Grade ${formatGrade(student.grade)}`;
      studentHeader.style.cssText =
        'color: #2b68a4; margin-bottom: 15px; margin-top: 20px; font-weight: bold;';
      studentContainer.appendChild(studentHeader);

      // Create table element with trimester-specific ID
      const tableId = `parent-weekly-schedule-table-${sectionType}-${studentId}`;
      const tableElement = document.createElement('table');
      tableElement.id = tableId;
      studentContainer.appendChild(tableElement);

      container.appendChild(studentContainer);

      // Filter and sort registrations for this student
      const studentRegistrations = registrations.filter(reg => {
        const regStudentId = reg.studentId?.value || reg.studentId;
        return regStudentId === studentId;
      });
      const sortedRegistrations = this.#sortRegistrations(studentRegistrations);

      // Build the table for this student
      const table = this.#buildWeeklyScheduleTable(tableId, sortedRegistrations);
      this.studentTables.set(`${sectionType}-${studentId}`, table);
    });
  }

  /**
   * Render the wait list section (Rock Band registrations)
   * @private
   */
  #renderWaitListSection(container, waitListRegistrations, trimesterName, sectionType) {
    // Create wait list header
    const waitListHeader = document.createElement('h5');
    waitListHeader.textContent = 'Rock Band Wait List';
    waitListHeader.style.cssText =
      'color: #2b68a4; margin-bottom: 15px; margin-top: 30px; font-weight: bold;';
    container.appendChild(waitListHeader);

    // Create table element with trimester-specific ID
    const tableId = `parent-wait-list-table-${sectionType}`;
    const tableElement = document.createElement('table');
    tableElement.id = tableId;
    container.appendChild(tableElement);

    // Build the wait list table
    this.waitListTable = this.#buildWaitListTable(tableId, waitListRegistrations);
  }

  /**
   * Build a weekly schedule table for a specific student
   * @private
   */
  #buildWeeklyScheduleTable(tableId, enrollments) {
    // Check if we're in the intent period to show the Intent column
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const isIntentPeriod = currentPeriod?.periodType === PeriodType.INTENT;

    const headers = [
      'Weekday',
      'Start Time',
      'Length',
      'Student',
      'Grade',
      'Instructor',
      'Instrument/Class',
    ];

    if (isIntentPeriod) {
      headers.push('Intent');
    }

    headers.push('Contact');

    return new Table(
      tableId,
      headers,
      this.#buildScheduleTableRow.bind(this),
      enrollments,
      this.#handleScheduleTableClick.bind(this),
      null, // filterFunction
      null, // onFilterChanges
      {
        rowClassFunction: enrollment => {
          // Return CSS class based on enrollment registration type
          return enrollment.registrationType === RegistrationType.GROUP
            ? 'registration-row-group'
            : 'registration-row-private';
        },
      }
    );
  }

  /**
   * Build a wait list table
   * @private
   */
  #buildWaitListTable(tableId, enrollments) {
    const headers = ['Student', 'Grade', 'Class Title', 'Timestamp'];

    return new Table(
      tableId,
      headers,
      this.#buildWaitListTableRow.bind(this),
      enrollments,
      null, // no click handler for wait list
      null, // filterFunction
      null, // onFilterChanges
      {
        rowClassFunction: () => 'registration-row-waitlist',
      }
    );
  }

  /**
   * Build a table row for a schedule enrollment
   * @private
   */
  #buildScheduleTableRow(enrollment) {
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
        ? enrollment.classTitle || enrollment.className || 'N/A'
        : enrollment.instrument || 'N/A';

    // Build intent cell for parent view during intent period only
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const isIntentPeriod = currentPeriod?.periodType === PeriodType.INTENT;

    let intentCell = '';
    if (isIntentPeriod) {
      const enrollmentId = enrollment.id?.value || enrollment.id;
      const intentValue = enrollment.reenrollmentIntent;

      // Show dropdown for selecting intent
      const selectedKeep = intentValue === 'keep' ? 'selected' : '';
      const selectedDrop = intentValue === 'drop' ? 'selected' : '';
      const selectedChange = intentValue === 'change' ? 'selected' : '';
      const selectedNone = !intentValue ? 'selected' : '';

      intentCell = `<td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <select class="intent-dropdown" data-registration-id="${enrollmentId}">
            <option value="" ${selectedNone}>Select intent...</option>
            <option value="keep" ${selectedKeep}>${INTENT_LABELS.keep}</option>
            <option value="drop" ${selectedDrop}>${INTENT_LABELS.drop}</option>
            <option value="change" ${selectedChange}>${INTENT_LABELS.change}</option>
          </select>
          <span class="intent-status-indicator" data-registration-id="${enrollmentId}" style="display: none;"></span>
        </div>
      </td>`;
    }

    return `
      <td>${enrollment.day}</td>
      <td>${formatTime(enrollment.startTime) || 'N/A'}</td>
      <td>${enrollment.length || 'N/A'} min</td>
      <td>${student.firstName} ${student.lastName}</td>
      <td>${formatGrade(student.grade) || 'N/A'}</td>
      <td>${instructor.firstName} ${instructor.lastName}</td>
      <td>${instrumentOrClass}</td>
      ${intentCell}
      <td>
        <a href="#" data-registration-id="${enrollment.id?.value || enrollment.id}">
          <i class="material-icons copy-emails-table-icon gray-text text-darken-4">email</i>
        </a>
      </td>
    `;
  }

  /**
   * Build a table row for a wait list enrollment
   * @private
   */
  #buildWaitListTableRow(enrollment) {
    const student = this.findStudent(enrollment.studentId);

    if (!student) {
      console.warn(
        `Student not found for wait list enrollment: ${enrollment.id?.value || enrollment.id}`
      );
      return '';
    }

    return `
      <td>${student.firstName} ${student.lastName}</td>
      <td>${formatGrade(student.grade) || 'N/A'}</td>
      <td>${enrollment.classTitle || 'N/A'}</td>
      <td>${this.#formatDateTime(enrollment.createdAt) || 'N/A'}</td>
    `;
  }

  /**
   * Handle table clicks (email copy for parent view)
   * @private
   */
  async #handleScheduleTableClick(event) {
    const isCopy = event.target.classList.contains('copy-emails-table-icon');
    if (!isCopy) {
      return;
    }

    event.preventDefault();

    // Get the registration ID from the data attribute
    const linkElement = event.target.closest('a');
    const registrationId = linkElement?.getAttribute('data-registration-id');
    if (!registrationId) return;

    // Find the enrollment by ID
    const currentEnrollment = this.data.registrations.find(
      e => (e.id?.value || e.id) === registrationId
    );
    if (!currentEnrollment) return;

    // For parent view: show instructor emails
    const instructorIdToFind =
      currentEnrollment.instructorId?.value || currentEnrollment.instructorId;
    const instructor = this.findInstructor(instructorIdToFind);

    if (instructor && instructor.email && instructor.email.trim()) {
      await copyToClipboard(instructor.email);
    } else {
      if (typeof M !== 'undefined') {
        M.toast({ html: 'No instructor email available.' });
      }
    }
  }

  /**
   * Sort registrations by day and start time
   * @private
   */
  #sortRegistrations(registrations) {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return registrations.sort((a, b) => {
      // First, sort by day of week
      const dayA = a.day || '';
      const dayB = b.day || '';
      const dayIndexA = dayOrder.indexOf(dayA);
      const dayIndexB = dayOrder.indexOf(dayB);

      if (dayIndexA !== dayIndexB) {
        return dayIndexA - dayIndexB;
      }

      // Then sort by start time
      const timeA = a.startTime || '';
      const timeB = b.startTime || '';
      return timeA.localeCompare(timeB);
    });
  }

  /**
   * Format a datetime value for display in tables
   * @private
   */
  #formatDateTime(timestamp) {
    if (!timestamp) return 'N/A';

    try {
      let date;

      // Handle different input types
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string') {
        // Handle ISO strings or other date strings
        date = new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        // Handle Google Sheets serial dates or Unix timestamps
        if (timestamp > 1 && timestamp < 100000) {
          // Likely a Google Sheets serial date (days since 1899-12-30)
          const googleEpoch = new Date(1899, 11, 30); // Month is 0-indexed
          const msPerDay = 24 * 60 * 60 * 1000;
          date = new Date(googleEpoch.getTime() + timestamp * msPerDay);
        } else {
          // Assume Unix timestamp (milliseconds or seconds)
          date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
        }
      } else {
        // Try to convert to string and parse
        date = new Date(String(timestamp));
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return 'Invalid Date';
      }

      // Format: "M/D/YYYY, H:MM AM/PM"
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();

      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';

      hours = hours % 12;
      hours = hours ? hours : 12; // 0 becomes 12
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;

      return `${month}/${day}/${year}, ${hours}:${minutesStr} ${ampm}`;
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Error formatting date';
    }
  }

  /**
   * Cleanup when tab is unloaded
   */
  async cleanup() {
    this.studentTables.clear();
    this.waitListTable = null;
  }
}
