import { BaseTab } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatGrade, formatTime } from '../extensions/numberExtensions.js';
import { RegistrationType } from '../constants.js';
import { PeriodType } from '../constants/periodTypeConstants.js';

// Intent labels (matching viewModel.js)
const INTENT_LABELS = {
  keep: '✅ Keep',
  drop: '❌ Drop',
  change: '🔄 Change',
};

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
export class AdminMasterScheduleTab extends BaseTab {
  constructor() {
    super('admin-master-schedule');

    /** @private {Table|null} Master schedule table */
    this.masterScheduleTable = null;
  }

  /**
   * Fetch master schedule data for admin
   * Returns registrations for trimester + students + instructors + classes
   * @param {Object} sessionInfo - User session
   * @returns {Promise<Object>} Master schedule data
   */
  async fetchData(sessionInfo) {
    // Get selected trimester from admin selector
    const trimesterSelector = document.getElementById('admin-trimester-selector');
    const trimester = trimesterSelector?.value || 'fall';

    const response = await fetch(`/api/admin/tabs/master-schedule/${trimester}`, {
      signal: this.getAbortSignal(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response
    if (!data.registrations || !data.students || !data.instructors || !data.classes) {
      throw new Error('Invalid response: missing required data');
    }

    return data;
  }

  /**
   * Render the master schedule table
   */
  async render() {
    const container = this.getContainer();

    // Check if we're in development to show the Recurring column
    const showRecurringColumn = window.TONIC_ENV?.isDevelopment;

    // Check if we're in the intent period to show the Intent column
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const isIntentPeriod = currentPeriod?.periodType === PeriodType.INTENT;

    const headers = [];

    // Add Recurring column first (only in dev)
    if (showRecurringColumn) {
      headers.push('Recurring');
    }

    headers.push('Weekday', 'Start Time', 'Length', 'Student', 'Grade', 'Instructor', 'Instrument/Class');

    // Add Intent column before Contact (only during intent period)
    if (isIntentPeriod) {
      headers.push('Intent');
    }

    headers.push('Contact', 'Remove');

    // Find or create table element
    let tableElement = container.querySelector('#master-schedule-table');
    if (!tableElement) {
      tableElement = document.createElement('table');
      tableElement.id = 'master-schedule-table';
      container.appendChild(tableElement);
    }

    // Exclude Rock Band classes from master schedule (they go in wait list)
    const nonWaitlistRegistrations = this.#excludeRockBandClasses(this.data.registrations);
    const sortedRegistrations = this.#sortRegistrations(nonWaitlistRegistrations);

    // Build onFilterChanges array conditionally
    const onFilterChanges = [
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
        rowClassFunction: registration => {
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
  #buildTableRow(registration) {
    // Check if we're in development to show the Recurring column
    const showRecurringColumn = window.TONIC_ENV?.isDevelopment;

    // Check if we're in the intent period to show the Intent column
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const isIntentPeriod = currentPeriod?.periodType === PeriodType.INTENT;

    // Extract primitive values for comparison
    const instructorIdToFind = registration.instructorId?.value || registration.instructorId;
    const studentIdToFind = registration.studentId?.value || registration.studentId;

    // Find instructor and student
    const instructor = this.data.instructors.find(x => {
      const id = x.id?.value || x.id;
      return id === instructorIdToFind;
    });
    const student = this.data.students.find(x => {
      const studentId = x.id?.value || x.id;
      return studentId === studentIdToFind;
    });

    if (!instructor || !student) {
      console.warn(`Instructor or student not found for registration: ${registration.id}`);
      return '';
    }

    // Build recurring cell (only in dev/staging)
    let recurringCell = '';
    if (showRecurringColumn) {
      const hasLinkedPrevious = !!(
        registration.linkedPreviousRegistrationId?.value ||
        registration.linkedPreviousRegistrationId
      );

      if (hasLinkedPrevious) {
        recurringCell = `<td style="text-align: center;">
          <i class="material-icons green-text text-darken-2" style="font-size: 20px;">check_circle</i>
        </td>`;
      } else {
        recurringCell = `<td style="text-align: center;">—</td>`;
      }
    }

    // Build intent cell (non-editable, nullable) - only during intent period
    let intentCell = '';
    if (isIntentPeriod) {
      const intentValue = registration.reenrollmentIntent;

      if (intentValue) {
        // Map intent values to badge styles and icons
        const intentStyles = {
          keep: {
            bgClass: 'teal lighten-5',
            textClass: 'teal-text text-darken-2',
            icon: 'check_circle',
            label: INTENT_LABELS[intentValue],
          },
          drop: {
            bgClass: 'red lighten-5',
            textClass: 'red-text text-darken-2',
            icon: 'cancel',
            label: INTENT_LABELS[intentValue],
          },
          change: {
            bgClass: 'amber lighten-5',
            textClass: 'amber-text text-darken-3',
            icon: 'swap_horiz',
            label: INTENT_LABELS[intentValue],
          },
        };

        const style = intentStyles[intentValue] || {
          bgClass: 'grey lighten-4',
          textClass: 'grey-text text-darken-1',
          icon: 'help_outline',
          label: intentValue,
        };

        intentCell = `<td>
          <span class="chip ${style.bgClass} ${style.textClass}" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.9em; padding: 6px 12px; border-radius: 16px;">
            <i class="material-icons" style="font-size: 16px;">${style.icon}</i>
            ${style.label}
          </span>
        </td>`;
      } else {
        // No intent set
        intentCell = `<td class="grey-text text-lighten-1" style="text-align: center;">—</td>`;
      }
    }

    const registrationId = registration.id?.value || registration.id;
    const instrumentOrClass =
      registration.registrationType === RegistrationType.GROUP
        ? registration.classTitle || 'N/A'
        : registration.instrument || 'N/A';

    return `
      ${recurringCell}
      <td>${registration.day}</td>
      <td>${formatTime(registration.startTime) || 'N/A'}</td>
      <td>${registration.length || 'N/A'} min</td>
      <td>${student.firstName} ${student.lastName}</td>
      <td>${formatGrade(student.grade) || 'N/A'}</td>
      <td>${instructor.firstName} ${instructor.lastName}</td>
      <td>${instrumentOrClass}</td>
      ${intentCell}
      <td>
        <a href="#" data-registration-id="${registrationId}">
          <i class="material-icons copy-parent-emails-table-icon gray-text text-darken-4">email</i>
        </a>
      </td>
      <td>
        <a href="#" data-registration-id="${registrationId}">
          <i class="material-icons remove-registration-table-icon red-text text-darken-4">delete</i>
        </a>
      </td>
    `;
  }

  /**
   * Handle table clicks (email copy, delete)
   * @private
   */
  async #handleTableClick(event) {
    const isCopy = event.target.classList.contains('copy-parent-emails-table-icon');
    const isDelete = event.target.classList.contains('remove-registration-table-icon');

    if (!isCopy && !isDelete) {
      return;
    }

    event.preventDefault();

    // Get the registration ID from the data attribute
    const linkElement = event.target.closest('a');
    const registrationId = linkElement?.getAttribute('data-registration-id');
    if (!registrationId) return;

    // Find the registration by ID
    const currentRegistration = this.data.registrations.find(
      r => (r.id?.value || r.id) === registrationId
    );
    if (!currentRegistration) return;

    if (isCopy) {
      // Get the student ID from the current registration
      const studentIdToFind = currentRegistration.studentId?.value || currentRegistration.studentId;

      // Find the full student object with parent emails
      const fullStudent = this.data.students.find(x => {
        const studentId = x.id?.value || x.id;
        return studentId === studentIdToFind;
      });

      if (fullStudent && fullStudent.parentEmails && fullStudent.parentEmails.trim()) {
        await this.#copyToClipboard(fullStudent.parentEmails);
      } else {
        if (typeof M !== 'undefined') {
          M.toast({ html: 'No parent email available for this student.' });
        }
      }
      return;
    }

    if (isDelete) {
      const idToDelete = currentRegistration.id?.value || currentRegistration.id;
      await this.#deleteRegistration(idToDelete);
      return;
    }
  }

  /**
   * Filter registration based on filter selects
   * @private
   */
  #filterRegistration(registration) {
    // Get filter values
    const instructorSelect = document.getElementById('master-schedule-instructor-filter-select');
    const daySelect = document.getElementById('master-schedule-day-filter-select');
    const gradeSelect = document.getElementById('master-schedule-grade-filter-select');
    const intentSelect = document.getElementById('master-schedule-intent-filter-select');

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
      selectedInstructors.includes(
        String(registration.instructorId?.value || registration.instructorId)
      );

    const dayMatch = selectedDays.length === 0 || selectedDays.includes(registration.day || '');

    // Get student grade for filtering
    const studentIdToFind = registration.studentId?.value || registration.studentId;
    const student = this.data.students.find(x => {
      const studentId = x.id?.value || x.id;
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
  #populateFilterDropdowns(registrations) {
    // Populate instructor dropdown
    const instructorSelect = document.getElementById('master-schedule-instructor-filter-select');
    if (instructorSelect) {
      // Clear existing options except the first (placeholder)
      while (instructorSelect.children.length > 1) {
        instructorSelect.removeChild(instructorSelect.lastChild);
      }

      // Ensure first option is disabled and not selected
      if (instructorSelect.firstElementChild) {
        instructorSelect.firstElementChild.disabled = true;
        instructorSelect.firstElementChild.selected = false;
      }

      // Get unique instructor IDs from registrations
      const instructorIds = [...new Set(registrations.map(reg => reg.instructorId?.value || reg.instructorId))];

      // Create options for each instructor
      instructorIds
        .map(id => this.data.instructors.find(i => (i.id?.value || i.id) === id))
        .filter(Boolean)
        .sort((a, b) => {
          const lastNameA = a.lastName || '';
          const lastNameB = b.lastName || '';
          return lastNameA.localeCompare(lastNameB);
        })
        .forEach(instructor => {
          const option = document.createElement('option');
          option.value = instructor.id?.value || instructor.id;
          option.textContent = `${instructor.firstName} ${instructor.lastName}`;
          instructorSelect.appendChild(option);
        });
    }

    // Populate day dropdown
    const daySelect = document.getElementById('master-schedule-day-filter-select');
    if (daySelect) {
      // Clear existing options except the first (placeholder)
      while (daySelect.children.length > 1) {
        daySelect.removeChild(daySelect.lastChild);
      }

      // Ensure first option is disabled and not selected
      if (daySelect.firstElementChild) {
        daySelect.firstElementChild.disabled = true;
        daySelect.firstElementChild.selected = false;
      }

      // Get unique days from registrations, filtering out null/undefined/empty values
      const uniqueDays = [
        ...new Set(registrations.map(reg => reg.day).filter(day => day && day.trim() !== '')),
      ];

      // Sort days in logical weekday order
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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
    const gradeSelect = document.getElementById('master-schedule-grade-filter-select');
    if (gradeSelect) {
      // Clear existing options except the first (placeholder)
      while (gradeSelect.children.length > 1) {
        gradeSelect.removeChild(gradeSelect.lastChild);
      }

      // Ensure first option is disabled and not selected
      if (gradeSelect.firstElementChild) {
        gradeSelect.firstElementChild.disabled = true;
        gradeSelect.firstElementChild.selected = false;
      }

      // Get unique grades from students who have registrations
      const registeredStudentIds = registrations.map(reg => reg.studentId?.value || reg.studentId);
      const registeredStudents = this.data.students.filter(student =>
        registeredStudentIds.includes(student.id?.value || student.id)
      );
      const uniqueGrades = [...new Set(registeredStudents.map(student => student.grade))];
      // Sort grades numerically and filter out null/undefined values
      uniqueGrades
        .filter(grade => grade != null && grade !== '')
        .sort((a, b) => {
          // Convert to numbers for proper numeric sorting
          const gradeA = typeof a === 'number' ? a : parseInt(a) || 0;
          const gradeB = typeof b === 'number' ? b : parseInt(b) || 0;
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
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const isIntentPeriod = currentPeriod?.periodType === PeriodType.INTENT;

    const intentFilterContainer = document.getElementById('master-schedule-intent-filter-container');
    const intentSelect = document.getElementById('master-schedule-intent-filter-select');

    // Adjust column widths based on whether intent filter is shown
    const instructorFilter = document.getElementById('master-schedule-instructor-filter-select')
      ?.parentElement?.parentElement;
    const dayFilter = document.getElementById('master-schedule-day-filter-select')?.parentElement
      ?.parentElement;
    const gradeFilter = document.getElementById('master-schedule-grade-filter-select')?.parentElement
      ?.parentElement;

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
        intentSelect.removeChild(intentSelect.lastChild);
      }

      // Ensure first option is disabled and not selected
      if (intentSelect.firstElementChild) {
        intentSelect.firstElementChild.disabled = true;
        intentSelect.firstElementChild.selected = false;
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
   * Exclude Rock Band classes from registrations
   * @private
   */
  #excludeRockBandClasses(registrations) {
    const rockBandClassIds = this.data.classes
      .filter(c => c.title && c.title.toLowerCase().includes('rock band'))
      .map(c => c.id?.value || c.id);

    return registrations.filter(
      reg => !rockBandClassIds.includes(reg.classId?.value || reg.classId)
    );
  }

  /**
   * Sort registrations by day, start time, length, instrument, grade
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
      if (timeA !== timeB) {
        return timeA.localeCompare(timeB);
      }

      // Then sort by length (duration)
      const lengthA = a.length || a.duration || 0;
      const lengthB = b.length || b.duration || 0;
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
      const studentA = this.#findStudent(a.studentId);
      const studentB = this.#findStudent(b.studentId);
      const gradeA = studentA?.grade || '';
      const gradeB = studentB?.grade || '';
      return String(gradeA).localeCompare(String(gradeB));
    });
  }

  /**
   * Find student by ID
   * @private
   */
  #findStudent(studentId) {
    const idToFind = studentId?.value || studentId;
    return this.data.students.find(x => {
      const id = x.id?.value || x.id;
      return id === idToFind;
    });
  }

  /**
   * Copy text to clipboard with fallback for older browsers
   * @private
   */
  async #copyToClipboard(text) {
    try {
      // Attempt to use the Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        if (typeof M !== 'undefined') {
          M.toast({ html: `Copied '${text}' to clipboard.` });
        }
        return;
      }
    } catch (error) {
      console.error('Failed to copy text to clipboard with modern API:', error);
    }

    try {
      // Fallback to execCommand for older browsers
      const tempInput = document.createElement('textarea');
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      if (typeof M !== 'undefined') {
        M.toast({ html: `Copied '${text}' to clipboard.` });
      }
    } catch (error) {
      console.error('Failed to copy text to clipboard with fallback:', error);
      if (typeof M !== 'undefined') {
        M.toast({ html: 'Failed to copy text to clipboard.' });
      }
    }
  }

  /**
   * Delete a registration
   * @private
   */
  async #deleteRegistration(registrationId) {
    // Delegate to viewModel for registration deletion
    if (window.viewModel && typeof window.viewModel.requestDeleteRegistrationAsync === 'function') {
      await window.viewModel.requestDeleteRegistrationAsync(registrationId);

      // Reload the tab to show updated data
      await this.onLoad(this.sessionInfo);
    } else {
      console.error('Delete registration method not available');
      if (typeof M !== 'undefined') {
        M.toast({ html: 'Unable to delete registration. Please refresh and try again.' });
      }
    }
  }

  /**
   * Cleanup when tab is unloaded
   */
  async cleanup() {
    this.masterScheduleTable = null;
  }
}
