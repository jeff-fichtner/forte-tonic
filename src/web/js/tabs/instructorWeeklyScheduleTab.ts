import { BaseTab, SessionInfo } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatGrade, formatTime } from '../extensions/numberExtensions.js';
import { RegistrationType } from '../constants.js';
import { copyToClipboard } from '../utilities/clipboardHelpers.js';
import { HttpService } from '../data/httpService.js';
import type { HttpResult } from '../data/httpService.js';

interface InstructorScheduleData {
  registrations: Record<string, unknown>[];
  students: Record<string, unknown>[];
  instructors: Record<string, unknown>[];
  classes: Record<string, unknown>[];
}

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
  private dayTables: Map<string, Table>;

  constructor() {
    super('instructor-weekly-schedule');

    this.dayTables = new Map<string, Table>();
  }

  /**
   * Fetch weekly schedule data for instructor
   * Returns registrations for this instructor + associated students + classes
   */
  async fetchData(sessionInfo: SessionInfo | null): Promise<HttpResult<Record<string, unknown>>> {
    const instructorId = (sessionInfo?.user as Record<string, unknown> | undefined)?.instructor as Record<string, unknown> | undefined;
    const id = instructorId?.id as string | undefined;
    if (!id) {
      return { ok: false, error: { message: 'No instructor ID found in session' } };
    }

    const trimesterButtons = document.getElementById('instructor-trimester-buttons');
    const activeButton = trimesterButtons?.querySelector<HTMLElement>('.trimester-btn.active');
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const trimester = activeButton?.dataset.trimester || currentPeriod?.trimester;

    const result = await HttpService.get<InstructorScheduleData>(`instructor/tabs/weekly-schedule/${trimester}?instructorId=${id}`, { signal: this.getAbortSignal() });

    if (!result.ok) return result;

    if (!result.data.registrations || !result.data.students || !result.data.instructors || !result.data.classes) {
      return { ok: false, error: { message: 'Invalid response: missing required data' } };
    }

    return { ok: true, data: result.data as unknown as Record<string, unknown> };
  }

  /**
   * Render the weekly schedule tables (one per day)
   */
  async render(): Promise<void> {
    const container = this.getContainer();
    const typedData = this.data as unknown as InstructorScheduleData;

    // Find or create the tables container
    let tablesContainer = container.querySelector<HTMLElement>('#instructor-weekly-schedule-tables');
    if (!tablesContainer) {
      tablesContainer = document.createElement('div');
      tablesContainer.id = 'instructor-weekly-schedule-tables';
      container.appendChild(tablesContainer);
    }

    // Clear existing content
    tablesContainer.innerHTML = '';
    this.dayTables.clear();

    // Show 'no matching registrations' message if instructor has no registrations
    if (typedData.registrations.length === 0) {
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
    const daysWithRegistrations = [...new Set(typedData.registrations.map((reg: Record<string, unknown>) => reg.day as string))].sort(
      (a: string, b: string) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
    );

    // Create a table for each day
    daysWithRegistrations.forEach((day: string) => {
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

      tablesContainer!.appendChild(dayContainer);

      // Sort registrations for this day by start time, length, instrument, and grade
      const dayRegistrations = typedData.registrations
        .filter((reg: Record<string, unknown>) => reg.day === day)
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
          // First, sort by start time
          const timeA = (a.startTime as string) || '';
          const timeB = (b.startTime as string) || '';
          if (timeA !== timeB) {
            return timeA.localeCompare(timeB);
          }

          // Then sort by length
          const lengthA = (a.length as number) || 0;
          const lengthB = (b.length as number) || 0;
          if (lengthA !== lengthB) {
            return lengthA - lengthB;
          }

          // Then sort by instrument/class
          const instrumentA = (a.instrument as string) || (a.classTitle as string) || '';
          const instrumentB = (b.instrument as string) || (b.classTitle as string) || '';
          if (instrumentA !== instrumentB) {
            return instrumentA.localeCompare(instrumentB);
          }

          // Finally sort by student grade
          const studentA = this.findStudent(a.studentId as string);
          const studentB = this.findStudent(b.studentId as string);
          const gradeA = (studentA?.grade as string) || '';
          const gradeB = (studentB?.grade as string) || '';
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
  #buildWeeklyScheduleTable(tableId: string, enrollments: Record<string, unknown>[]): Table {
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
  #buildTableRow(enrollment: Record<string, unknown>): string {
    const instructor = this.findInstructor(enrollment.instructorId as string);
    const student = this.findStudent(enrollment.studentId as string);

    if (!instructor || !student) {
      console.warn(`Instructor or student not found for enrollment: ${enrollment.id}`);
      return '';
    }

    // Determine instrument/class name
    const instrumentOrClass =
      enrollment.registrationType === RegistrationType.GROUP
        ? (enrollment.classTitle as string) || 'N/A'
        : (enrollment.instrument as string) || 'N/A';

    return `
      <td>${enrollment.day}</td>
      <td>${formatTime(enrollment.startTime as string) || 'N/A'}</td>
      <td>${enrollment.length || 'N/A'} min</td>
      <td>${student.firstName} ${student.lastName}</td>
      <td>${formatGrade(student.grade as number | string) || 'N/A'}</td>
      <td>${instructor.firstName} ${instructor.lastName}</td>
      <td>${instrumentOrClass}</td>
      <td>
        <button type="button" class="btn-flat" style="padding: 0; min-width: 0; background: none; border: none; cursor: pointer;" data-registration-id="${enrollment.id}">
          <i class="material-icons copy-emails-table-icon gray-text text-darken-4">email</i>
        </button>
      </td>
    `;
  }

  /**
   * Handle table clicks (email copy for instructor view)
   * @private
   */
  async #handleTableClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement;
    const isCopy = target.classList.contains('copy-emails-table-icon');
    if (!isCopy) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Get the registration ID from the data attribute
    const buttonElement = target.closest('button');
    const registrationId = buttonElement?.getAttribute('data-registration-id');
    if (!registrationId) return;

    const typedData = this.data as unknown as InstructorScheduleData;

    // Find the enrollment by ID
    const currentEnrollment = typedData.registrations.find((e: Record<string, unknown>) => e.id === registrationId);
    if (!currentEnrollment) return;

    // For instructor view: show parent emails
    const studentIdToFind = currentEnrollment.studentId as string;
    const student = this.findStudent(studentIdToFind);

    if (student && student.parentEmails && (student.parentEmails as string).trim()) {
      await copyToClipboard(student.parentEmails as string);
    } else {
      if (typeof M !== 'undefined') {
        M.toast({ html: 'No parent email available for this student.' });
      }
    }
  }

  /**
   * Attach event listeners for trimester selector
   */
  attachEventListeners(): void {
    const trimesterButtons = document.getElementById('instructor-trimester-buttons');
    if (trimesterButtons) {
      this.addEventListener(trimesterButtons, 'click', async (event: Event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('.trimester-btn');
        if (button) {
          // Update active button state
          trimesterButtons.querySelectorAll('.trimester-btn').forEach((btn: Element) => {
            btn.classList.remove('active');
          });
          button.classList.add('active');

          // Reload tab with new trimester
          await this.reload();
        }
      });
    }
  }

  /**
   * Cleanup when tab is unloaded
   */
  async cleanup(): Promise<void> {
    this.dayTables.clear();
  }
}
