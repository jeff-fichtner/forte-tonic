import { BaseTab, SessionInfo } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatGrade, formatTime } from '../extensions/numberExtensions.js';
import { RegistrationType } from '../constants.js';
import { PeriodType } from '/utils/values/periodType.js';
import { copyToClipboard } from '../utilities/clipboardHelpers.js';
import { formatDateTime } from '../utilities/formatHelpers.js';
import { isEnrollmentPeriod } from '../utilities/periodHelpers.js';
import { ClassManager } from '../utilities/classManager.js';
import { HttpService } from '../data/httpService.js';
import type { HttpResult } from '../data/httpService.js';

// Intent labels (matching viewModel.js)
const INTENT_LABELS: Record<string, string> = {
  keep: '✅ Keep',
  drop: '❌ Drop',
  change: '🔄 Change',
};

interface TrimesterData {
  registrations: Record<string, unknown>[];
  students: Record<string, unknown>[];
  instructors: Record<string, unknown>[];
  classes: Record<string, unknown>[];
}

interface TrimesterInfo {
  name: string;
  data: TrimesterData;
}

interface WeeklyScheduleData {
  currentTrimester: TrimesterInfo;
  nextTrimester?: TrimesterInfo;
  showTwoTrimesters: boolean;
  students: Record<string, unknown>[];
  instructors: Record<string, unknown>[];
  classes: Record<string, unknown>[];
}

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
  private studentTables: Map<string, Table>;
  private waitListTable: Table | null;

  constructor() {
    super('parent-weekly-schedule');

    this.studentTables = new Map<string, Table>();
    this.waitListTable = null;
  }

  /**
   * Fetch weekly schedule data for parent's children
   * Returns registrations for BOTH current and next trimester
   */
  async fetchData(sessionInfo: SessionInfo | null): Promise<HttpResult<Record<string, unknown>>> {
    const parentObj = (sessionInfo?.user as Record<string, unknown> | undefined)?.parent as Record<string, unknown> | undefined;
    const parentId = parentObj?.id as string | undefined;
    if (!parentId) {
      return { ok: false, error: { message: 'No parent ID found in session' } };
    }

    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const appConfig = window.UserSession?.getAppConfig();

    if (!currentPeriod) {
      return { ok: false, error: { message: 'Period information not available' } };
    }

    let firstTrimester: string;
    let secondTrimester: string | undefined;
    let showTwoTrimesters = false;

    if (isEnrollmentPeriod(currentPeriod)) {
      firstTrimester = appConfig?.currentTrimester || currentPeriod.trimester || '';
      secondTrimester = appConfig?.nextTrimester || currentPeriod.trimester || '';
      showTwoTrimesters = true;
    } else {
      firstTrimester = currentPeriod.trimester || '';
    }

    const firstResult = await this.#fetchTrimesterData(parentId, firstTrimester);
    if (!firstResult.ok) return firstResult;
    const firstData = firstResult.data;

    let secondData: TrimesterData | null = null;
    if (showTwoTrimesters && secondTrimester) {
      const secondResult = await this.#fetchTrimesterData(parentId, secondTrimester);
      if (!secondResult.ok) return secondResult;
      secondData = secondResult.data;
    }

    const responseData: Record<string, unknown> = {
      currentTrimester: { name: firstTrimester, data: firstData },
      showTwoTrimesters,
      students: this.#mergeUnique([...firstData.students, ...(secondData?.students || [])], 'id'),
      instructors: this.#mergeUnique([...firstData.instructors, ...(secondData?.instructors || [])], 'id'),
      classes: this.#mergeUnique([...firstData.classes, ...(secondData?.classes || [])], 'id'),
    };

    if (showTwoTrimesters) {
      responseData.nextTrimester = { name: secondTrimester, data: secondData };
    }

    return { ok: true, data: responseData };
  }

  /**
   * Fetch data for a specific trimester
   * @private
   */
  async #fetchTrimesterData(parentId: string, trimester: string): Promise<HttpResult<TrimesterData>> {
    const result = await HttpService.get<TrimesterData>(`parent/tabs/weekly-schedule/${trimester}?parentId=${parentId}`, { signal: this.getAbortSignal() });

    if (!result.ok) return result;

    if (!result.data.registrations || !result.data.students || !result.data.instructors || !result.data.classes) {
      return { ok: false, error: { message: 'Invalid response: missing required data' } };
    }

    return result;
  }

  /**
   * Merge arrays and remove duplicates by ID
   * @private
   */
  #mergeUnique(array: Record<string, unknown>[], idField: string): Record<string, unknown>[] {
    const seen = new Set<unknown>();
    return array.filter((item: Record<string, unknown>) => {
      const id = item[idField];
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }

  /**
   * Render the weekly schedule tables
   * Shows one or two trimesters depending on period type
   */
  async render(): Promise<void> {
    const container = this.getContainer();
    const typedData = this.data as unknown as WeeklyScheduleData;

    // Find or create the schedule container
    let scheduleContainer = container.querySelector<HTMLElement>('#parent-weekly-schedule-section');
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
    this.#renderTrimesterSection(scheduleContainer, typedData.currentTrimester, 'current');

    // Render Next Trimester Section (only during enrollment periods)
    if (typedData.showTwoTrimesters && typedData.nextTrimester) {
      this.#renderTrimesterSection(scheduleContainer, typedData.nextTrimester, 'next');
    }

    // Attach event listeners for intent dropdowns
    this.#attachIntentDropdownListeners();
  }

  /**
   * Render a section for a specific trimester
   * @private
   */
  #renderTrimesterSection(container: HTMLElement, trimesterInfo: TrimesterInfo, sectionType: string): void {
    const { name: trimesterName, data: trimesterData } = trimesterInfo;
    const registrations = trimesterData.registrations;

    // Create trimester header
    const trimesterHeader = document.createElement('h4');
    const capitalizedName = trimesterName.charAt(0).toUpperCase() + trimesterName.slice(1);
    trimesterHeader.textContent = `${capitalizedName} Trimester Schedule`;
    trimesterHeader.style.cssText =
      'color: #1565c0; margin-top: 30px; margin-bottom: 20px; font-weight: bold; border-bottom: 2px solid #1565c0; padding-bottom: 10px;';
    container.appendChild(trimesterHeader);

    // Get Rock Band class IDs from configuration (authoritative source)
    const rockBandClassIds = ClassManager.getRockBandClassIds();

    // Separate regular registrations from wait list (Rock Band)
    const regularRegistrations = registrations.filter(
      (reg: Record<string, unknown>) => !rockBandClassIds.includes(reg.classId as string)
    );
    const waitListRegistrations = registrations.filter((reg: Record<string, unknown>) =>
      rockBandClassIds.includes(reg.classId as string)
    );

    // Render regular schedule section using trimesterData directly
    this.#renderScheduleSection(
      container,
      regularRegistrations,
      trimesterName,
      sectionType,
      trimesterData
    );

    // Render wait list section if there are wait list registrations
    if (waitListRegistrations.length > 0) {
      this.#renderWaitListSection(
        container,
        waitListRegistrations,
        trimesterName,
        sectionType,
        trimesterData
      );
    }
  }

  /**
   * Render the main schedule section (one table per student)
   * @private
   */
  #renderScheduleSection(container: HTMLElement, registrations: Record<string, unknown>[], trimesterName: string, sectionType: string, trimesterData: TrimesterData): void {
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
    const studentsWithRegistrations = trimesterData.students.filter((student: Record<string, unknown>) => {
      const studentId = student.id as string;
      return registrations.some((reg: Record<string, unknown>) => {
        const regStudentId = reg.studentId as string;
        return regStudentId === studentId;
      });
    });

    // Sort students by grade
    studentsWithRegistrations.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const gradeA = (a.grade as number) || 0;
      const gradeB = (b.grade as number) || 0;
      return gradeA - gradeB;
    });

    // Create a table for each student
    studentsWithRegistrations.forEach((student: Record<string, unknown>) => {
      const studentId = student.id as string;

      // Create a container for each student's table with padding
      const studentContainer = document.createElement('div');
      studentContainer.style.cssText = 'margin-bottom: 30px;';

      // Add a student header for better organization
      const studentHeader = document.createElement('h5');
      studentHeader.textContent = `${student.firstName} ${student.lastName} - Grade ${formatGrade(student.grade as number | string)}`;
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
      const studentRegistrations = registrations.filter((reg: Record<string, unknown>) => {
        const regStudentId = reg.studentId as string;
        return regStudentId === studentId;
      });
      const sortedRegistrations = this.#sortRegistrations(studentRegistrations);

      // Build the table for this student
      const table = this.#buildWeeklyScheduleTable(tableId, sortedRegistrations, trimesterData);
      this.studentTables.set(`${sectionType}-${studentId}`, table);
    });
  }

  /**
   * Render the wait list section (Rock Band registrations)
   * @private
   */
  #renderWaitListSection(
    container: HTMLElement,
    waitListRegistrations: Record<string, unknown>[],
    trimesterName: string,
    sectionType: string,
    trimesterData: TrimesterData
  ): void {
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
    this.waitListTable = this.#buildWaitListTable(tableId, waitListRegistrations, trimesterData);
  }

  /**
   * Build a weekly schedule table for a specific student
   * @private
   */
  #buildWeeklyScheduleTable(tableId: string, enrollments: Record<string, unknown>[], trimesterData: TrimesterData): Table {
    // Check if we're in the intent period to show the Intent column
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const isIntentPeriod = currentPeriod?.periodType === PeriodType.INTENT;

    const headers: string[] = [
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

    // Create a wrapper function that has access to trimesterData
    const rowBuilder = (enrollment: Record<string, unknown>): string => this.#buildScheduleTableRow(enrollment, trimesterData);

    return new Table(
      tableId,
      headers,
      rowBuilder,
      enrollments,
      this.#handleScheduleTableClick.bind(this),
      null, // filterFunction
      null, // onFilterChanges
      {
        rowClassFunction: (enrollment: Record<string, unknown>): string => {
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
  #buildWaitListTable(tableId: string, enrollments: Record<string, unknown>[], trimesterData: TrimesterData): Table {
    const headers = ['Student', 'Grade', 'Class Title', 'Timestamp'];

    // Create a wrapper function that has access to trimesterData
    const rowBuilder = (enrollment: Record<string, unknown>): string => this.#buildWaitListTableRow(enrollment, trimesterData);

    return new Table(
      tableId,
      headers,
      rowBuilder,
      enrollments,
      null, // no click handler for wait list
      null, // filterFunction
      null, // onFilterChanges
      {
        rowClassFunction: (): string => 'registration-row-waitlist',
      }
    );
  }

  /**
   * Build a table row for a schedule enrollment
   * @private
   */
  #buildScheduleTableRow(enrollment: Record<string, unknown>, trimesterData: TrimesterData): string {
    // Find instructor and student from trimesterData
    const instructorId = enrollment.instructorId as string;
    const studentId = enrollment.studentId as string;

    const instructor = trimesterData.instructors.find((i: Record<string, unknown>) => i.id === instructorId);
    const student = trimesterData.students.find((s: Record<string, unknown>) => s.id === studentId);

    // Handle orphaned enrollments (student or instructor deleted but enrollment remains)
    const isOrphaned = !instructor || !student;
    if (isOrphaned) {
      console.warn(`Orphaned enrollment: ${enrollment.id}`, {
        studentId,
        instructorId,
        studentFound: !!student,
        instructorFound: !!instructor,
      });
    }

    // Determine instrument/class name
    const instrumentOrClass =
      enrollment.registrationType === RegistrationType.GROUP
        ? (enrollment.classTitle as string) || 'N/A'
        : (enrollment.instrument as string) || 'N/A';

    // Build intent cell for parent view during intent period only
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const isIntentPeriod = currentPeriod?.periodType === PeriodType.INTENT;

    let intentCell = '';
    if (isIntentPeriod) {
      const enrollmentId = enrollment.id as string;
      const intentValue = enrollment.reenrollmentIntent as string | undefined;

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

    // Display names - use placeholders for orphaned records
    const studentName = student
      ? `${student.firstName} ${student.lastName}`
      : `<span class="red-text text-darken-2">⚠ Unknown Student</span>`;
    const studentGrade = student ? formatGrade(student.grade as number | string) || 'N/A' : '—';
    const instructorName = instructor
      ? `${instructor.firstName} ${instructor.lastName}`
      : `<span class="red-text text-darken-2">⚠ Unknown Instructor</span>`;

    // Add visual indicator for orphaned rows
    const rowStyle = isOrphaned ? 'background-color: #ffebee;' : '';

    return `
      <td style="${rowStyle}">${enrollment.day}</td>
      <td style="${rowStyle}">${formatTime(enrollment.startTime as string) || 'N/A'}</td>
      <td style="${rowStyle}">${enrollment.length || 'N/A'} min</td>
      <td style="${rowStyle}">${studentName}</td>
      <td style="${rowStyle}">${studentGrade}</td>
      <td style="${rowStyle}">${instructorName}</td>
      <td style="${rowStyle}">${instrumentOrClass}</td>
      ${intentCell}
      <td style="${rowStyle}">
        <button type="button" class="btn-flat" style="padding: 0; min-width: 0; background: none; border: none; cursor: pointer;" data-registration-id="${enrollment.id}" ${isOrphaned ? 'disabled' : ''}>
          <i class="material-icons copy-emails-table-icon ${isOrphaned ? 'grey-text' : 'gray-text text-darken-4'}">email</i>
        </button>
      </td>
    `;
  }

  /**
   * Build a table row for a wait list enrollment
   * @private
   */
  #buildWaitListTableRow(enrollment: Record<string, unknown>, trimesterData: TrimesterData): string {
    // Find student from trimesterData
    const studentId = enrollment.studentId as string;
    const student = trimesterData.students.find((s: Record<string, unknown>) => s.id === studentId);

    if (!student) {
      console.warn(`Student not found for wait list enrollment: ${enrollment.id}`, { studentId });
    }

    const studentName = student
      ? `${student.firstName} ${student.lastName}`
      : `<span class="red-text text-darken-2">⚠ Unknown Student</span>`;
    const studentGrade = student ? formatGrade(student.grade as number | string) || 'N/A' : '—';
    const rowStyle = !student ? 'background-color: #ffebee;' : '';

    return `
      <td style="${rowStyle}">${studentName}</td>
      <td style="${rowStyle}">${studentGrade}</td>
      <td style="${rowStyle}">${(enrollment.classTitle as string) || 'N/A'}</td>
      <td style="${rowStyle}">${formatDateTime(enrollment.createdAt as string | Date | number) || 'N/A'}</td>
    `;
  }

  /**
   * Handle table clicks (email copy for parent view)
   * @private
   */
  async #handleScheduleTableClick(event: Event): Promise<void> {
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

    const typedData = this.data as unknown as WeeklyScheduleData;

    // Find the enrollment by ID - search in both current and next trimester data
    let currentEnrollment = typedData.currentTrimester.data.registrations.find(
      (e: Record<string, unknown>) => e.id === registrationId
    );

    // If not found in current trimester, check next trimester (if it exists)
    if (!currentEnrollment && typedData.nextTrimester) {
      currentEnrollment = typedData.nextTrimester.data.registrations.find(
        (e: Record<string, unknown>) => e.id === registrationId
      );
    }

    if (!currentEnrollment) return;

    // For parent view: show instructor emails
    const instructorIdToFind = currentEnrollment.instructorId as string;
    const instructor = this.findInstructor(instructorIdToFind);

    if (instructor && instructor.email && (instructor.email as string).trim()) {
      await copyToClipboard(instructor.email as string);
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
  #sortRegistrations(registrations: Record<string, unknown>[]): Record<string, unknown>[] {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return registrations.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      // First, sort by day of week
      const dayA = (a.day as string) || '';
      const dayB = (b.day as string) || '';
      const dayIndexA = dayOrder.indexOf(dayA);
      const dayIndexB = dayOrder.indexOf(dayB);

      if (dayIndexA !== dayIndexB) {
        return dayIndexA - dayIndexB;
      }

      // Then sort by start time
      const timeA = (a.startTime as string) || '';
      const timeB = (b.startTime as string) || '';
      return timeA.localeCompare(timeB);
    });
  }

  /**
   * Attach event listeners for intent dropdowns
   * @private
   */
  #attachIntentDropdownListeners(): void {
    // Find all intent dropdowns in the container
    const container = this.getContainer();
    const intentDropdowns = container.querySelectorAll<HTMLSelectElement>('.intent-dropdown');

    intentDropdowns.forEach((dropdown: HTMLSelectElement) => {
      // Remove existing listeners to avoid duplicates
      dropdown.removeEventListener('change', this.#handleIntentChange);

      // Add the change listener
      dropdown.addEventListener('change', this.#handleIntentChange.bind(this));
    });
  }

  /**
   * Handle intent dropdown change events
   * @private
   */
  async #handleIntentChange(event: Event): Promise<void> {
    const dropdown = event.target as HTMLSelectElement;
    const registrationId = dropdown.getAttribute('data-registration-id');
    const intent = dropdown.value;

    if (!registrationId || !intent) {
      // Don't send request for empty intent (placeholder option)
      return;
    }

    // Find the status indicator for this dropdown
    const statusIndicator = dropdown.parentElement?.querySelector<HTMLElement>(
      `.intent-status-indicator[data-registration-id="${registrationId}"]`
    );
    if (statusIndicator) {
      statusIndicator.textContent = '⏳ Saving...';
      statusIndicator.style.display = 'inline';
    }

    const result = await HttpService.patch(`registrations/${registrationId}/intent`, { intent });

    if (result.ok) {
      if (statusIndicator) {
        statusIndicator.textContent = '✅ Saved';
        statusIndicator.style.color = 'green';
        setTimeout(() => { statusIndicator.style.display = 'none'; }, 2000);
      }
      M.toast({ html: 'Intent updated successfully!' });
    } else {
      if (statusIndicator) {
        statusIndicator.textContent = '❌ Error';
        statusIndicator.style.color = 'red';
        setTimeout(() => { statusIndicator.style.display = 'none'; }, 3000);
      }
      M.toast({ html: result.error.message || 'Failed to update intent. Please try again.' });
    }
  }

  /**
   * Cleanup when tab is unloaded
   */
  async cleanup(): Promise<void> {
    // Remove intent dropdown listeners
    const container = this.getContainer();
    const intentDropdowns = container.querySelectorAll<HTMLSelectElement>('.intent-dropdown');
    intentDropdowns.forEach((dropdown: HTMLSelectElement) => {
      dropdown.removeEventListener('change', this.#handleIntentChange);
    });

    this.studentTables.clear();
    this.waitListTable = null;
  }
}
