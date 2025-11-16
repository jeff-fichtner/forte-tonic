import { BaseTab } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatPhone } from '../utilities/phoneHelpers.js';
import { copyToClipboard } from '../utilities/clipboardHelpers.js';

/**
 * ParentContactTab - Contact directory for parents
 *
 * Shows a sortable table of relevant Forte employees for the parent:
 * - All admins (always visible)
 * - Instructors currently teaching the parent's children (based on active registrations)
 *
 * Data needed: admins (~5-10 records) + relevant instructors (~1-10 records)
 * Data waste eliminated: ~2050+ records (other students, unrelated instructors, registrations, classes, rooms)
 */
export class ParentContactTab extends BaseTab {
  constructor() {
    super('parent-contact-us');

    /** @private {Table|null} Table instance */
    this.directoryTable = null;
  }

  /**
   * Fetch contact directory data for parent
   * Returns admins + instructors teaching this parent's children
   * @param {object} sessionInfo - User session
   * @returns {Promise<object>} Directory data
   */
  async fetchData(sessionInfo) {
    const parentId = sessionInfo?.user?.parent?.id;
    if (!parentId) {
      throw new Error('No parent ID found in session');
    }

    const response = await fetch(`/api/parent/tabs/contact?parentId=${parentId}`, {
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
   * Render the contact directory table
   */
  async render() {
    const container = this.getContainer();

    // Map admins and instructors to employee format
    const adminEmployees = this.#mapAdminsToEmployees(this.data.admins);
    const instructorEmployees = this.data.instructors.map(instructor =>
      this.#mapInstructorToEmployee(instructor, true)
    );

    // Combine and sort (admins first, then instructors alphabetically)
    const allEmployees = [...adminEmployees, ...instructorEmployees];
    const sortedEmployees = this.#sortEmployeesForDirectory(allEmployees);

    // Find or create table element
    let tableElement = container.querySelector('#parent-directory-table');
    if (!tableElement) {
      tableElement = document.createElement('table');
      tableElement.id = 'parent-directory-table';
      container.appendChild(tableElement);
    }

    // Build table using existing Table component
    this.directoryTable = new Table(
      'parent-directory-table',
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
   * Copy text to clipboard with fallback for older browsers
   * @private
   */

  /**
   * Map admins to employee format
   * For parent contact, show public contact info (displayEmail, displayPhone)
   * Shows blank if not set (no fallback to personal contact info)
   * @private
   */
  #mapAdminsToEmployees(admins) {
    return admins.map(admin => ({
      id: admin.id,
      fullName: admin.fullName,
      email: admin.displayEmail,
      phone: formatPhone(admin.displayPhone),
      roles: admin.role ? [admin.role] : [],
    }));
  }

  /**
   * Map instructor to employee format
   * For parent contact, show public contact info (displayEmail, displayPhone)
   * @private
   * @param {object} instructor - Instructor object
   * @param {boolean} obscurePhone - Whether to hide phone number
   */
  #mapInstructorToEmployee(instructor, obscurePhone = false) {
    // Get instruments from specialties field
    const instruments = instructor.specialties || [];
    const instrumentsText = instruments.length > 0 ? instruments.join(', ') : 'Instructor';

    const displayEmail = instructor.displayEmail || '';
    const displayPhone = instructor.displayPhone || '';

    return {
      id: instructor.id,
      fullName:
        instructor.fullName || `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim(),
      email: displayEmail,
      phone: formatPhone(displayPhone),
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
