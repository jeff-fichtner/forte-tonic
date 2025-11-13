import { BaseTab } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatPhone } from '../utilities/phoneHelpers.js';
import { copyToClipboard } from '../utilities/clipboardHelpers.js';

/**
 * InstructorDirectoryTab - Employee directory for instructors and admins
 *
 * Shows a sortable table of all Forte employees (admins + instructors)
 * with contact information. Allows copying emails to clipboard.
 *
 * Data needed: admins (~5-10 records) + instructors (~20-30 records)
 * Data waste eliminated: ~2150+ records (students, registrations, classes, rooms)
 */
export class InstructorDirectoryTab extends BaseTab {
  constructor() {
    super('instructor-forte-directory');

    /** @private {Table|null} Table instance */
    this.directoryTable = null;
  }

  /**
   * Fetch directory data (admins + instructors only)
   * @param {object} sessionInfo - User session
   * @returns {Promise<object>} Directory data
   */
  async fetchData(sessionInfo) {
    const response = await fetch('/api/instructor/tabs/directory', {
      signal: this.getAbortSignal(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Unwrap the data from { success: true, data: {...} } envelope
    const data = result.data || result;

    // Validate response
    if (!data.admins || !data.instructors) {
      throw new Error('Invalid response: missing admins or instructors');
    }

    return data;
  }

  /**
   * Render the employee directory table
   */
  async render() {
    const container = this.getContainer();

    // Map admins and instructors to employee format
    const adminEmployees = this.#mapAdminsToEmployees(this.data.admins);
    const instructorEmployees = this.data.instructors.map(instructor =>
      this.#mapInstructorToEmployee(instructor)
    );

    // Combine and sort (admins first, then instructors alphabetically)
    const allEmployees = [...adminEmployees, ...instructorEmployees];
    const sortedEmployees = this.#sortEmployeesForDirectory(allEmployees);

    // Find or create table element
    let tableElement = container.querySelector('#employee-directory-table');
    if (!tableElement) {
      tableElement = document.createElement('table');
      tableElement.id = 'employee-directory-table';
      container.appendChild(tableElement);
    }

    // Build table using existing Table component
    this.directoryTable = new Table(
      'employee-directory-table',
      ['Name', 'Role', 'Email', 'Phone', 'Contact'],
      this.#buildTableRow.bind(this),
      sortedEmployees,
      this.#handleTableClick.bind(this)
    );
  }

  /**
   * Build a table row for an employee
   * @private
   */
  #buildTableRow(employee) {
    const fullName =
      employee.fullName ||
      `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
      'Unknown';
    const roles = Array.isArray(employee.roles)
      ? employee.roles.join(', ')
      : employee.roles || 'Unknown';
    const email = employee.email || 'No email';

    return `
      <td>${fullName}</td>
      <td>${roles}</td>
      <td>${email}</td>
      <td style="white-space: nowrap;">${employee.phone || ''}</td>
      <td>
        <button type="button" class="btn-flat" style="padding: 0; min-width: 0; background: none; border: none; cursor: pointer;" data-employee-email="${email}">
          <i class="copy-parent-emails-table-icon material-icons gray-text text-darken-4">email</i>
        </button>
      </td>
    `;
  }

  /**
   * Handle table clicks (email copy)
   * @private
   */
  async #handleTableClick(event) {
    const isCopy = event.target.classList.contains('copy-parent-emails-table-icon');
    if (!isCopy) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Get the email from the data attribute
    const buttonElement = event.target.closest('button');
    const email = buttonElement?.getAttribute('data-employee-email');

    if (email && email !== 'No email') {
      await copyToClipboard(email);
    } else {
      if (typeof M !== 'undefined') {
        M.toast({ html: 'No email available for this contact.' });
      }
    }
  }

  /**
   * Map admins to employee format
   * @private
   */
  #mapAdminsToEmployees(admins) {
    // TODO: This hard-coding should eventually come from the database
    const noah = admins.find(admin => admin.email === 'ndemosslevy@mcds.org');

    return admins.map(admin => {
      if (admin === noah) {
        return {
          id: admin.id,
          fullName: admin.fullName,
          email: admin.email,
          phone: '(415) 945-5121', // TODO: migrate to data column
          roles: ['Forte Director'], // TODO: migrate to data column
        };
      }
      return {
        id: admin.id,
        fullName: admin.fullName,
        email: 'forte@mcds.org', // TODO: migrate to data column
        phone: '(415) 945-5122', // TODO: migrate to data column
        roles: ['Forte Associate Manager'], // TODO: migrate to data column
      };
    });
  }

  /**
   * Map instructor to employee format
   * @private
   */
  #mapInstructorToEmployee(instructor, obscurePhone = false) {
    // Get instruments from specialties field
    const instruments = instructor.specialties || [];
    const instrumentsText = instruments.length > 0 ? instruments.join(', ') : 'Instructor';

    // Format phone number
    const rawPhone = instructor.phone || '';
    const formattedPhone = rawPhone && !obscurePhone ? formatPhone(rawPhone) : '';

    return {
      id: instructor.id,
      fullName:
        instructor.fullName || `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim(),
      email: instructor.email,
      phone: formattedPhone,
      role: instrumentsText,
      roles: [instrumentsText], // Array for sorting compatibility
      lastName: instructor.lastName || '',
      firstName: instructor.firstName || '',
    };
  }

  /**
   * Sort employees for directory display
   * Admins first (by priority), then instructors (alphabetically by last name)
   * @private
   */
  #sortEmployeesForDirectory(employees) {
    return employees.sort((a, b) => {
      // Define admin role priorities (lower number = higher priority)
      const getAdminPriority = employee => {
        if (!employee.roles || !Array.isArray(employee.roles)) return 999;

        for (const role of employee.roles) {
          const roleStr = role.toLowerCase();
          if (roleStr.includes('forte director')) return 1;
          if (roleStr.includes('forte associate manager')) return 2;
          if (roleStr.includes('admin')) return 3;
        }
        return 999; // Not an admin role
      };

      const priorityA = getAdminPriority(a);
      const priorityB = getAdminPriority(b);

      // Check if they are instructors (priority = 999 means not an admin)
      const aIsInstructor = priorityA === 999;
      const bIsInstructor = priorityB === 999;

      // Both are instructors - sort by last name, then first name
      if (aIsInstructor && bIsInstructor) {
        const lastNameComparison = (a.lastName || '').localeCompare(b.lastName || '');
        if (lastNameComparison !== 0) return lastNameComparison;
        return (a.firstName || '').localeCompare(b.firstName || '');
      }

      // Both are admins - use priority system
      if (!aIsInstructor && !bIsInstructor) {
        if (priorityA === priorityB) {
          const nameA = a.fullName || '';
          const nameB = b.fullName || '';
          return nameA.localeCompare(nameB);
        }
        return priorityA - priorityB;
      }

      // Mixed types: admins come before instructors
      return aIsInstructor ? 1 : -1;
    });
  }

  /**
   * Cleanup when tab is unloaded
   */
  async cleanup() {
    this.directoryTable = null;
  }
}
