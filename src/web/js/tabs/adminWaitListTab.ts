import { BaseTab, SessionInfo } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatGrade } from '../extensions/numberExtensions.js';
import { copyToClipboard } from '../utilities/clipboardHelpers.js';
import { formatDateTime } from '../utilities/formatHelpers.js';
import { HttpService } from '../data/httpService.js';

interface WaitListRegistration {
  id: string;
  studentId: string;
  classTitle: string;
  registrationType: string;
  isWaitlistClass: boolean;
  linkedPreviousRegistrationId: string | null;
  createdAt: string;
}

interface WaitListStudent {
  id: string;
  firstName: string;
  lastName: string;
  grade: number | string;
  parentEmails: string;
}

interface WaitListData extends Record<string, unknown> {
  registrations: WaitListRegistration[];
  students: WaitListStudent[];
}

/**
 * AdminWaitListTab - Rock Band wait list for admins
 *
 * Shows registrations for Rock Band classes (wait list) with ability to:
 * - View student info (name, grade)
 * - Copy parent emails
 * - Remove registrations
 *
 * Data needed: wait list registrations (~50 records) + students for those registrations
 * Data waste eliminated: ~2020+ records (non-wait-list registrations, instructors, classes, rooms)
 */
export class AdminWaitListTab extends BaseTab {
  declare protected data: WaitListData | null;
  private waitListTable: Table | null;

  constructor() {
    super('admin-wait-list');

    /** @private {Table|null} Table instance */
    this.waitListTable = null;
  }

  /**
   * Fetch wait list data for admin
   * Returns only Rock Band registrations + associated students
   * @param {object} sessionInfo - User session
   * @returns {Promise<object>} Wait list data
   */
  async fetchData(sessionInfo: SessionInfo | null): Promise<WaitListData> {
    // Get selected trimester from admin selector buttons
    const trimesterButtons = document.getElementById('admin-trimester-buttons');
    const activeButton = trimesterButtons?.querySelector<HTMLElement>('.trimester-btn.active');

    // During non-enrollment periods, trimester buttons are hidden, so use current period
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const trimester = activeButton?.dataset.trimester || currentPeriod?.trimester;

    if (!trimester) {
      throw new Error('Could not determine trimester: no button selected and no current period');
    }

    const data = await HttpService.get(`admin/tabs/wait-list/${trimester}`, { signal: this.getAbortSignal() }) as WaitListData;

    // Validate response
    if (!data.registrations || !data.students) {
      throw new Error('Invalid response: missing registrations or students');
    }

    return data;
  }

  /**
   * Render the wait list table
   */
  async render(): Promise<void> {
    const container = this.getContainer();

    // Check if we're in development to show the Recurring column
    const showRecurringColumn = window.TONIC_ENV?.isDevelopment;

    const headers: string[] = [];

    // Add Recurring column first (only in dev)
    if (showRecurringColumn) {
      headers.push('Recurring');
    }

    headers.push('Student', 'Grade', 'Class Title', 'Timestamp', 'Contact', 'Remove');

    // Find or create table element
    let tableElement = container.querySelector<HTMLTableElement>('#admin-wait-list-table');
    if (!tableElement) {
      tableElement = document.createElement('table');
      tableElement.id = 'admin-wait-list-table';
      container.appendChild(tableElement);
    }

    // Build table using existing Table component
    this.waitListTable = new Table(
      'admin-wait-list-table',
      headers,
      this.#buildTableRow.bind(this),
      this.data!.registrations,
      this.#handleTableClick.bind(this),
      (_registration: WaitListRegistration): boolean => true, // no filtering
      [], // no filter change handlers
      {
        pagination: true,
        itemsPerPage: 50,
        pageSizeOptions: [25, 50, 100],
        rowClassFunction: (_registration: WaitListRegistration): string | null => {
          // All wait list items are group registrations with special styling
          return 'registration-row-waitlist';
        },
      }
    );
  }

  /**
   * Build a table row for a wait list registration
   * @private
   */
  #buildTableRow(registration: WaitListRegistration): string {
    // Check if we're in development to show the Recurring column
    const showRecurringColumn = window.TONIC_ENV?.isDevelopment;

    // Extract primitive values for comparison
    const studentIdToFind = registration.studentId;

    // Find student
    const student = this.data!.students.find(x => {
      const studentId = x.id;
      return studentId === studentIdToFind;
    });

    if (!student) {
      console.warn(`Student not found for registration: ${registration.id}`);
      return '';
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

    const registrationId = registration.id;

    return `
      ${recurringCell}
      <td>${student.firstName} ${student.lastName}</td>
      <td>${formatGrade(student.grade) || 'N/A'}</td>
      <td>${registration.classTitle || 'N/A'}</td>
      <td>${formatDateTime(registration.createdAt) || 'N/A'}</td>
      <td>
        <button type="button" class="btn-flat" style="padding: 0; min-width: 0; background: none; border: none; cursor: pointer;" data-registration-id="${registrationId}">
          <i class="material-icons copy-parent-emails-table-icon gray-text text-darken-4">email</i>
        </button>
      </td>
      <td>
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

    // Find the registration by ID in the registrations
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
   * Delete a registration
   * @private
   */
  async #deleteRegistration(registrationId: string): Promise<void> {
    // Delegate to viewModel for registration deletion
    if (window.viewModel && typeof window.viewModel.requestDeleteRegistrationAsync === 'function') {
      await (window.viewModel.requestDeleteRegistrationAsync as (id: string) => Promise<void>)(registrationId);

      // Reload the tab to show updated data
      await this.reload();
    } else {
      console.error('Delete registration method not available');
      if (typeof M !== 'undefined') {
        M.toast({ html: 'Unable to delete registration. Please refresh and try again.' });
      }
    }
  }

  /**
   * Attach event listeners for trimester selector
   */
  attachEventListeners(): void {
    const trimesterButtons = document.getElementById('admin-trimester-buttons');
    if (trimesterButtons) {
      this.addEventListener(trimesterButtons, 'click', async (event: Event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('.trimester-btn');
        if (button) {
          // Update active button state
          trimesterButtons.querySelectorAll('.trimester-btn').forEach(btn => {
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
    this.waitListTable = null;
  }
}
