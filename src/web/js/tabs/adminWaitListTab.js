import { BaseTab } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatGrade } from '../extensions/numberExtensions.js';
import { copyToClipboard } from '../utilities/clipboardHelpers.js';

/**
 * formatDateTime - Format a datetime value for display in tables
 * @param {string|Date|number} timestamp - The timestamp to format
 * @returns {string} Formatted datetime string
 */
function formatDateTime(timestamp) {
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
  constructor() {
    super('admin-wait-list');

    /** @private {Table|null} Table instance */
    this.waitListTable = null;
  }

  /**
   * Fetch wait list data for admin
   * Returns only Rock Band registrations + associated students
   * @param {Object} sessionInfo - User session
   * @returns {Promise<Object>} Wait list data
   */
  async fetchData(sessionInfo) {
    // Get selected trimester from admin selector
    const trimesterSelector = document.getElementById('admin-trimester-selector');
    const trimester = trimesterSelector?.value || 'fall';

    const response = await fetch(`/api/admin/tabs/wait-list/${trimester}`, {
      signal: this.getAbortSignal(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response
    if (!data.registrations || !data.students) {
      throw new Error('Invalid response: missing registrations or students');
    }

    return data;
  }

  /**
   * Render the wait list table
   */
  async render() {
    const container = this.getContainer();

    // Check if we're in development to show the Recurring column
    const showRecurringColumn = window.TONIC_ENV?.isDevelopment;

    const headers = [];

    // Add Recurring column first (only in dev)
    if (showRecurringColumn) {
      headers.push('Recurring');
    }

    headers.push('Student', 'Grade', 'Class Title', 'Timestamp', 'Contact', 'Remove');

    // Find or create table element
    let tableElement = container.querySelector('#admin-wait-list-table');
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
      this.data.registrations,
      this.#handleTableClick.bind(this),
      registration => true, // no filtering
      [], // no filter change handlers
      {
        pagination: true,
        itemsPerPage: 50,
        pageSizeOptions: [25, 50, 100],
        rowClassFunction: registration => {
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
  #buildTableRow(registration) {
    // Check if we're in development to show the Recurring column
    const showRecurringColumn = window.TONIC_ENV?.isDevelopment;

    // Extract primitive values for comparison
    const studentIdToFind = registration.studentId?.value || registration.studentId;

    // Find student
    const student = this.data.students.find(x => {
      const studentId = x.id?.value || x.id;
      return studentId === studentIdToFind;
    });

    if (!student) {
      console.warn(`Student not found for registration: ${registration.id}`);
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

    const registrationId = registration.id?.value || registration.id;

    return `
      ${recurringCell}
      <td>${student.firstName} ${student.lastName}</td>
      <td>${formatGrade(student.grade) || 'N/A'}</td>
      <td>${registration.classTitle || 'N/A'}</td>
      <td>${formatDateTime(registration.createdAt) || 'N/A'}</td>
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

    // Find the registration by ID in the registrations
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
        await copyToClipboard(fullStudent.parentEmails);
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
    this.waitListTable = null;
  }
}
