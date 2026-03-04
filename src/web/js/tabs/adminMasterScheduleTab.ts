import { AdminBaseTab } from '../core/adminBaseTab.js';
import type { SessionInfo } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatGrade, formatTime } from '../extensions/numberExtensions.js';
import { RegistrationType } from '../constants.js';
import { copyToClipboard } from '../utilities/clipboardHelpers.js';

import { isCurrentPeriodIntent } from '../utilities/periodHelpers.js';
import { isDevelopment } from '../utilities/environmentHelpers.js';
import { HttpService } from '../data/httpService.js';
import type { HttpResult } from '../data/httpService.js';
import { validateResponseFields } from '../data/responseValidation.js';
import { RegistrationService } from '../data/registrationService.js';
import { INTENT_LABELS } from '../constants/intentConstants.js';

interface MasterScheduleRegistration {
  id: string;
  studentId: string;
  instructorId: string;
  day: string;
  startTime: string;
  length: number;
  instrument: string;
  classTitle: string;
  registrationType: string;
  isWaitlistClass: boolean;
  reenrollmentIntent: string;
  linkedPreviousRegistrationId: string | null;
  createdAt: string;
}

interface MasterScheduleStudent {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  grade: number | string;
  parentEmails: string;
}

interface MasterScheduleInstructor {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

interface MasterScheduleData {
  registrations: MasterScheduleRegistration[];
  students: MasterScheduleStudent[];
  instructors: MasterScheduleInstructor[];
  classes: Record<string, unknown>[];
}

interface IntentStyle {
  bgClass: string;
  textClass: string;
  label: string;
  icon?: string;
}

interface FilterConfig {
  filterId: string;
  type: string;
}

/**
 * AdminMasterScheduleTab - Master schedule for admins
 *
 * Shows all registrations for selected trimester with:
 * - Filtering by instructor, day, grade, intent
 * - Student names and grades
 * - Lesson times and durations
 * - Instruments/classes
 * - Contact information (email copy)
 * - Delete functionality
 * - Intent badges (during intent period)
 * - Recurring indicator (dev/staging only)
 *
 * Data needed: registrations (for trimester), students, instructors, classes
 * Data waste eliminated: ~1500+ records (other trimesters, rooms not needed)
 */
export class AdminMasterScheduleTab extends AdminBaseTab<MasterScheduleData> {
  private masterScheduleTable: Table<MasterScheduleRegistration> | null;

  constructor() {
    super('admin-master-schedule');

    /** @private {Table|null} Master schedule table */
    this.masterScheduleTable = null;
  }

  /**
   * Fetch master schedule data for admin
   * Returns registrations for trimester + students + instructors + classes
   * @param {object} sessionInfo - User session
   * @returns {Promise<object>} Master schedule data
   */
  async fetchData(_sessionInfo: SessionInfo | null): Promise<HttpResult<MasterScheduleData>> {
    const trimester = this.getTrimester();
    if (!trimester) {
      return {
        ok: false,
        error: {
          message: 'Could not determine trimester: no button selected and no current period',
        },
      };
    }

    const result = await HttpService.get<MasterScheduleData>(
      `admin/tabs/master-schedule/${trimester}`,
      { signal: this.getAbortSignal() }
    );
    return validateResponseFields(result, ['registrations', 'students', 'instructors', 'classes']);
  }

  /**
   * Render the master schedule table
   */
  async render(): Promise<void> {
    const container = this.getContainer();

    // Check if we're in development to show the Recurring column
    const showRecurringColumn = isDevelopment();

    // Check if we're in the intent period to show the Intent column
    const isIntentPeriod = isCurrentPeriodIntent();

    const headers: string[] = [];

    // Add Recurring column first (only in dev)
    if (showRecurringColumn) {
      headers.push('Recurring');
    }

    headers.push(
      'Weekday',
      'Start Time',
      'Length',
      'Student',
      'Grade',
      'Instructor',
      'Instrument/Class'
    );

    // Add Intent column before Contact (only during intent period)
    if (isIntentPeriod) {
      headers.push('Intent');
    }

    headers.push('Contact', 'Remove');

    // Find or create table element
    let tableElement = container.querySelector<HTMLTableElement>('#master-schedule-table');
    if (!tableElement) {
      tableElement = document.createElement('table');
      tableElement.id = 'master-schedule-table';
      container.appendChild(tableElement);
    }

    // Exclude Rock Band classes from master schedule (they go in wait list)
    const nonWaitlistRegistrations = this.#excludeRockBandClasses(this.data!.registrations);
    const sortedRegistrations = this.#sortRegistrations(nonWaitlistRegistrations);

    // Build onFilterChanges array conditionally
    const onFilterChanges: FilterConfig[] = [
      {
        filterId: 'master-schedule-instructor-filter-select',
        type: 'select-multiple',
      },
      {
        filterId: 'master-schedule-day-filter-select',
        type: 'select-multiple',
      },
      {
        filterId: 'master-schedule-grade-filter-select',
        type: 'select-multiple',
      },
    ];

    // Add intent filter only during intent period
    if (isIntentPeriod) {
      onFilterChanges.push({
        filterId: 'master-schedule-intent-filter-select',
        type: 'select-multiple',
      });
    }

    // Build table using existing Table component
    this.masterScheduleTable = new Table(
      'master-schedule-table',
      headers,
      this.#buildTableRow.bind(this),
      sortedRegistrations,
      this.#handleTableClick.bind(this),
      this.#filterRegistration.bind(this),
      onFilterChanges,
      {
        pagination: true,
        itemsPerPage: 50,
        pageSizeOptions: [25, 50, 100, 200],
        rowClassFunction: (registration: MasterScheduleRegistration): string | null => {
          // Return CSS class based on enrollment registration type
          return registration.registrationType === RegistrationType.GROUP
            ? 'registration-row-group'
            : 'registration-row-private';
        },
      }
    );

    // Populate filter dropdowns
    this.#populateFilterDropdowns(nonWaitlistRegistrations);
  }

  /**
   * Build a table row for a registration
   * @private
   */
  #buildTableRow(registration: MasterScheduleRegistration): string {
    // Check if we're in development to show the Recurring column
    const showRecurringColumn = isDevelopment();

    // Check if we're in the intent period to show the Intent column
    const isIntentPeriod = isCurrentPeriodIntent();

    // Extract primitive values for comparison
    const instructorIdToFind = registration.instructorId;
    const studentIdToFind = registration.studentId;

    // Find instructor and student
    const instructor = this.data!.instructors.find(x => {
      const id = x.id;
      return id === instructorIdToFind;
    });
    const student = this.data!.students.find(x => {
      const studentId = x.id;
      return studentId === studentIdToFind;
    });

    // Handle orphaned registrations (student or instructor deleted but registration remains)
    const isOrphaned = !instructor || !student;
    if (isOrphaned) {
      console.warn(`Orphaned registration: ${registration.id}`, {
        studentIdToFind,
        instructorIdToFind,
        studentFound: !!student,
        instructorFound: !!instructor,
      });
    }

    // Build recurring cell (only in dev/staging)
    let recurringCell = '';
    if (showRecurringColumn) {
      const hasLinkedPrevious = !!registration.linkedPreviousRegistrationId;

      if (hasLinkedPrevious) {
        recurringCell = `<td style="text-align: center;">
          <i class="material-icons green-text text-darken-2" style="font-size: 20px;">check_circle</i>
        </td>`;
      } else {
        recurringCell = `<td style="text-align: center;">\u2014</td>`;
      }
    }

    // Build intent cell (non-editable, nullable) - only during intent period
    let intentCell = '';
    if (isIntentPeriod) {
      const intentValue = registration.reenrollmentIntent;

      if (intentValue) {
        // Map intent values to badge styles and icons
        const intentStyles: Record<string, IntentStyle> = {
          keep: {
            bgClass: 'teal lighten-5',
            textClass: 'teal-text text-darken-2',
            label: INTENT_LABELS[intentValue],
          },
          drop: {
            bgClass: 'red lighten-5',
            textClass: 'red-text text-darken-2',
            label: INTENT_LABELS[intentValue],
          },
          change: {
            bgClass: 'amber lighten-5',
            textClass: 'amber-text text-darken-3',
            label: INTENT_LABELS[intentValue],
          },
        };

        const style: IntentStyle = intentStyles[intentValue] || {
          bgClass: 'grey lighten-4',
          textClass: 'grey-text text-darken-1',
          icon: 'help_outline',
          label: intentValue,
        };

        intentCell = `<td style="white-space: nowrap; text-align: center;">
          <span class="chip ${style.bgClass} ${style.textClass}" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.9em; padding: 6px 12px; border-radius: 16px; white-space: nowrap; flex-wrap: nowrap;">
            <span style="white-space: nowrap;">${style.label}</span>
          </span>
        </td>`;
      } else {
        // No intent set
        intentCell = `<td class="grey-text text-lighten-1" style="text-align: center; white-space: nowrap;">\u2014</td>`;
      }
    }

    const registrationId = registration.id;
    const instrumentOrClass =
      registration.registrationType === RegistrationType.GROUP
        ? registration.classTitle || 'N/A'
        : registration.instrument || 'N/A';

    // Display names - use placeholders for orphaned records
    const studentName =
      student?.fullName ||
      `<span class="red-text text-darken-2" title="Student ID: ${studentIdToFind}">\u26A0 Unknown Student</span>`;
    const studentGrade = student ? formatGrade(student.grade) || 'N/A' : '\u2014';
    const instructorName =
      instructor?.fullName ||
      `<span class="red-text text-darken-2" title="Instructor ID: ${instructorIdToFind}">\u26A0 Unknown Instructor</span>`;

    // Add visual indicator for orphaned rows
    const rowStyle = isOrphaned ? 'background-color: #ffebee;' : '';

    return `
      ${recurringCell}
      <td style="${rowStyle}">${registration.day}</td>
      <td style="${rowStyle}">${formatTime(registration.startTime) || 'N/A'}</td>
      <td style="${rowStyle}">${registration.length || 'N/A'} min</td>
      <td style="${rowStyle}">${studentName}</td>
      <td style="${rowStyle}">${studentGrade}</td>
      <td style="${rowStyle}">${instructorName}</td>
      <td style="${rowStyle}">${instrumentOrClass}</td>
      ${intentCell}
      <td style="${rowStyle}">
        <button type="button" class="btn-flat" style="padding: 0; min-width: 0; background: none; border: none; cursor: pointer;" data-registration-id="${registrationId}" ${isOrphaned ? 'disabled title="Cannot email - student/instructor not found"' : ''}>
          <i class="material-icons copy-parent-emails-table-icon ${isOrphaned ? 'grey-text' : 'gray-text text-darken-4'}">email</i>
        </button>
      </td>
      <td style="${rowStyle}">
        <button type="button" class="btn-flat" style="padding: 0; min-width: 0; background: none; border: none; cursor: pointer;" data-registration-id="${registrationId}">
          <i class="material-icons remove-registration-table-icon red-text text-darken-4">delete</i>
        </button>
      </td>
    `;
  }

  /**
   * Handle table clicks (email copy, delete)
   * @private
   */
  async #handleTableClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement;
    const isCopy = target.classList.contains('copy-parent-emails-table-icon');
    const isDelete = target.classList.contains('remove-registration-table-icon');

    if (!isCopy && !isDelete) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Get the registration ID from the data attribute
    const buttonElement = target.closest('button');
    const registrationId = buttonElement?.getAttribute('data-registration-id');
    if (!registrationId) return;

    // Find the registration by ID
    const currentRegistration = this.data!.registrations.find(r => r.id === registrationId);
    if (!currentRegistration) return;

    if (isCopy) {
      // Get the student ID from the current registration
      const studentIdToFind = currentRegistration.studentId;

      // Find the full student object with parent emails
      const fullStudent = this.data!.students.find(x => {
        const studentId = x.id;
        return studentId === studentIdToFind;
      });

      if (fullStudent && fullStudent.parentEmails && fullStudent.parentEmails.trim()) {
        await copyToClipboard(fullStudent.parentEmails);
      } else {
        if (typeof M !== 'undefined') {
          M.toast({ html: 'No parent email available for this student.' });
        }
      }
      return;
    }

    if (isDelete) {
      const idToDelete = currentRegistration.id;
      await this.#deleteRegistration(idToDelete);
      return;
    }
  }

  /**
   * Filter registration based on filter selects
   * @private
   */
  #filterRegistration(registration: MasterScheduleRegistration): boolean {
    // Get filter values
    const instructorSelect = document.getElementById(
      'master-schedule-instructor-filter-select'
    ) as HTMLSelectElement | null;
    const daySelect = document.getElementById(
      'master-schedule-day-filter-select'
    ) as HTMLSelectElement | null;
    const gradeSelect = document.getElementById(
      'master-schedule-grade-filter-select'
    ) as HTMLSelectElement | null;
    const intentSelect = document.getElementById(
      'master-schedule-intent-filter-select'
    ) as HTMLSelectElement | null;

    // Get selected values from each filter
    const selectedInstructors = instructorSelect
      ? Array.from(instructorSelect.selectedOptions).map(opt => opt.value)
      : [];
    const selectedDays = daySelect
      ? Array.from(daySelect.selectedOptions).map(opt => opt.value)
      : [];
    const selectedGrades = gradeSelect
      ? Array.from(gradeSelect.selectedOptions).map(opt => opt.value)
      : [];
    const selectedIntents = intentSelect
      ? Array.from(intentSelect.selectedOptions).map(opt => opt.value)
      : [];

    // If no filters selected for a category, show all
    const instructorMatch =
      selectedInstructors.length === 0 ||
      selectedInstructors.includes(String(registration.instructorId));

    const dayMatch = selectedDays.length === 0 || selectedDays.includes(registration.day || '');

    // Get student grade for filtering
    const studentIdToFind = registration.studentId;
    const student = this.data!.students.find(x => {
      const studentId = x.id;
      return studentId === studentIdToFind;
    });
    const studentGrade = student?.grade || '';
    const gradeMatch = selectedGrades.length === 0 || selectedGrades.includes(String(studentGrade));

    // Intent filter (only during intent period)
    const intentValue = registration.reenrollmentIntent || 'none';
    const intentMatch = selectedIntents.length === 0 || selectedIntents.includes(intentValue);

    // Registration must match ALL filters
    return instructorMatch && dayMatch && gradeMatch && intentMatch;
  }

  /**
   * Populate filter dropdowns with unique values from registrations
   * @private
   */
  #populateFilterDropdowns(registrations: MasterScheduleRegistration[]): void {
    // Populate instructor dropdown
    const instructorSelect = document.getElementById(
      'master-schedule-instructor-filter-select'
    ) as HTMLSelectElement | null;
    if (instructorSelect) {
      // Clear existing options except the first (placeholder)
      while (instructorSelect.children.length > 1) {
        instructorSelect.removeChild(instructorSelect.lastChild!);
      }

      // Ensure first option is disabled and not selected
      if (instructorSelect.firstElementChild) {
        (instructorSelect.firstElementChild as HTMLOptionElement).disabled = true;
        (instructorSelect.firstElementChild as HTMLOptionElement).selected = false;
      }

      // Get unique instructor IDs from registrations
      const instructorIds = [...new Set(registrations.map(reg => reg.instructorId))];

      // Create options for each instructor
      instructorIds
        .map(id => this.data!.instructors.find(i => i.id === id))
        .filter((i): i is MasterScheduleInstructor => Boolean(i))
        .sort((a, b) => {
          const lastNameA = a.lastName || '';
          const lastNameB = b.lastName || '';
          return lastNameA.localeCompare(lastNameB);
        })
        .forEach(instructor => {
          const option = document.createElement('option');
          option.value = instructor.id;
          option.textContent = instructor.fullName;
          instructorSelect.appendChild(option);
        });
    }

    // Populate day dropdown
    const daySelect = document.getElementById(
      'master-schedule-day-filter-select'
    ) as HTMLSelectElement | null;
    if (daySelect) {
      // Clear existing options except the first (placeholder)
      while (daySelect.children.length > 1) {
        daySelect.removeChild(daySelect.lastChild!);
      }

      // Ensure first option is disabled and not selected
      if (daySelect.firstElementChild) {
        (daySelect.firstElementChild as HTMLOptionElement).disabled = true;
        (daySelect.firstElementChild as HTMLOptionElement).selected = false;
      }

      // Get unique days from registrations, filtering out null/undefined/empty values
      const uniqueDays = [
        ...new Set(registrations.map(reg => reg.day).filter(day => day && day.trim() !== '')),
      ];

      // Sort days in logical weekday order
      const dayOrder = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];
      uniqueDays
        .sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))
        .forEach(day => {
          const option = document.createElement('option');
          option.value = day;
          option.textContent = day;
          daySelect.appendChild(option);
        });
    }

    // Populate grade dropdown
    const gradeSelect = document.getElementById(
      'master-schedule-grade-filter-select'
    ) as HTMLSelectElement | null;
    if (gradeSelect) {
      // Clear existing options except the first (placeholder)
      while (gradeSelect.children.length > 1) {
        gradeSelect.removeChild(gradeSelect.lastChild!);
      }

      // Ensure first option is disabled and not selected
      if (gradeSelect.firstElementChild) {
        (gradeSelect.firstElementChild as HTMLOptionElement).disabled = true;
        (gradeSelect.firstElementChild as HTMLOptionElement).selected = false;
      }

      // Get unique grades from students who have registrations
      const registeredStudentIds = registrations.map(reg => reg.studentId);
      const registeredStudents = this.data!.students.filter(student =>
        registeredStudentIds.includes(student.id)
      );
      const uniqueGrades = [...new Set(registeredStudents.map(student => student.grade))];
      // Sort grades numerically and filter out null/undefined values
      uniqueGrades
        .filter((grade): grade is number | string => grade != null && grade !== '')
        .sort((a, b) => {
          // Convert to numbers for proper numeric sorting
          const gradeA = typeof a === 'number' ? a : parseInt(String(a)) || 0;
          const gradeB = typeof b === 'number' ? b : parseInt(String(b)) || 0;
          return gradeA - gradeB;
        })
        .forEach(grade => {
          const option = document.createElement('option');
          option.value = grade.toString();
          option.textContent = `Grade ${formatGrade(grade)}`;
          gradeSelect.appendChild(option);
        });
    }

    // Populate intent dropdown (only during intent period)
    const isIntentPeriod = isCurrentPeriodIntent();

    const intentFilterContainer = document.getElementById(
      'master-schedule-intent-filter-container'
    );
    const intentSelect = document.getElementById(
      'master-schedule-intent-filter-select'
    ) as HTMLSelectElement | null;

    // Adjust column widths based on whether intent filter is shown
    const instructorFilter = document.getElementById('master-schedule-instructor-filter-select')
      ?.parentElement?.parentElement;
    const dayFilter = document.getElementById('master-schedule-day-filter-select')?.parentElement
      ?.parentElement;
    const gradeFilter = document.getElementById('master-schedule-grade-filter-select')
      ?.parentElement?.parentElement;

    if (isIntentPeriod && intentSelect) {
      // Show the intent filter and use 4-column layout
      if (intentFilterContainer) {
        intentFilterContainer.hidden = false;
      }

      // Set all filters to s3 (25% width for 4 columns)
      [instructorFilter, dayFilter, gradeFilter].forEach(filter => {
        if (filter) {
          filter.classList.remove('s4');
          filter.classList.add('s3');
        }
      });

      // Clear existing options except the first (placeholder)
      while (intentSelect.children.length > 1) {
        intentSelect.removeChild(intentSelect.lastChild!);
      }

      // Ensure first option is disabled and not selected
      if (intentSelect.firstElementChild) {
        (intentSelect.firstElementChild as HTMLOptionElement).disabled = true;
        (intentSelect.firstElementChild as HTMLOptionElement).selected = false;
      }

      // Get unique intent values from registrations (including null/undefined as 'none')
      const intentValues = registrations.map(reg => reg.reenrollmentIntent || 'none');
      const uniqueIntents = [...new Set(intentValues)];

      // Define all possible intent options with their display properties
      const allIntentOptions = [
        { value: 'none', label: 'None' },
        { value: 'keep', label: INTENT_LABELS.keep },
        { value: 'drop', label: INTENT_LABELS.drop },
        { value: 'change', label: INTENT_LABELS.change },
      ];

      // Only add options that exist in the current registrations data
      allIntentOptions
        .filter(option => uniqueIntents.includes(option.value))
        .forEach(({ value, label }) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = label;
          intentSelect.appendChild(option);
        });
    } else if (intentFilterContainer) {
      // Hide the intent filter and use 3-column layout
      intentFilterContainer.hidden = true;

      // Set remaining filters to s4 (33% width for 3 columns)
      [instructorFilter, dayFilter, gradeFilter].forEach(filter => {
        if (filter) {
          filter.classList.remove('s3');
          filter.classList.add('s4');
        }
      });
    }

    // Reinitialize Materialize select elements after all DOM changes
    if (typeof M !== 'undefined') {
      const selects = document.querySelectorAll('select');
      M.FormSelect.init(selects);
    }
  }

  /**
   * Exclude waitlist registrations from master schedule
   * Waitlist registrations are identified by the isWaitlistClass property
   * @private
   */
  #excludeRockBandClasses(
    registrations: MasterScheduleRegistration[]
  ): MasterScheduleRegistration[] {
    return registrations.filter(reg => !reg.isWaitlistClass);
  }

  /**
   * Sort registrations by day, start time, length, instrument, grade
   * @private
   */
  #sortRegistrations(registrations: MasterScheduleRegistration[]): MasterScheduleRegistration[] {
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
      const studentA = this.data!.students.find(s => s.id === a.studentId);
      const studentB = this.data!.students.find(s => s.id === b.studentId);
      const gradeA = studentA?.grade || '';
      const gradeB = studentB?.grade || '';
      return String(gradeA).localeCompare(String(gradeB));
    });
  }

  /**
   * Delete a registration via RegistrationService
   * @private
   */
  async #deleteRegistration(registrationId: string): Promise<void> {
    const result = await RegistrationService.delete(registrationId, this.getTrimester() ?? '');
    if (result.ok) {
      await this.reload();
    }
  }

  /**
   * Cleanup when tab is unloaded
   */
  async cleanup(): Promise<void> {
    this.masterScheduleTable = null;
  }
}
