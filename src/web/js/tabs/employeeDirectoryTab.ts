import { BaseTab, SessionInfo } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatPhone } from '../utilities/phoneHelpers.js';
import { copyToClipboard } from '../utilities/clipboardHelpers.js';
import { HttpService } from '../data/httpService.js';

interface DirectoryAdmin {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

interface DirectoryInstructor {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  specialties: string[];
}

interface DirectoryData extends Record<string, unknown> {
  admins: DirectoryAdmin[];
  instructors: DirectoryInstructor[];
}

interface EmployeeDisplay {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role?: string;
  roles: string[];
  lastName?: string;
  firstName?: string;
}

/**
 * EmployeeDirectoryTab - Employee directory for instructors and admins
 *
 * Shows a sortable table of all Forte employees (admins + instructors)
 * with contact information. Allows copying emails to clipboard.
 *
 * Data needed: admins (~5-10 records) + instructors (~20-30 records)
 * Data waste eliminated: ~2150+ records (students, registrations, classes, rooms)
 */
export class EmployeeDirectoryTab extends BaseTab {
  declare protected data: DirectoryData | null;
  private directoryTable: Table | null;

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
  async fetchData(sessionInfo: SessionInfo | null): Promise<DirectoryData> {
    const data = await HttpService.get('instructor/tabs/directory', { signal: this.getAbortSignal() }) as DirectoryData;

    // Validate response
    if (!data.admins || !data.instructors) {
      throw new Error('Invalid response: missing admins or instructors');
    }

    return data;
  }

  /**
   * Render the employee directory table
   */
  async render(): Promise<void> {
    const container = this.getContainer();

    // Map admins and instructors to employee format
    const adminEmployees = this.#mapAdminsToEmployees(this.data!.admins);
    const instructorEmployees = this.data!.instructors.map(instructor =>
      this.#mapInstructorToEmployee(instructor)
    );

    // Combine and sort (admins first, then instructors alphabetically)
    const allEmployees: EmployeeDisplay[] = [...adminEmployees, ...instructorEmployees];
    const sortedEmployees = this.#sortEmployeesForDirectory(allEmployees);

    // Find or create table element
    let tableElement = container.querySelector<HTMLTableElement>('#employee-directory-table');
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
  #buildTableRow(employee: EmployeeDisplay): string {
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
  async #handleTableClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement;
    const isCopy = target.classList.contains('copy-parent-emails-table-icon');
    if (!isCopy) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Get the email from the data attribute
    const buttonElement = target.closest('button');
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
   * For employee directory, show internal contact info (email, phoneNumber)
   * @private
   */
  #mapAdminsToEmployees(admins: DirectoryAdmin[]): EmployeeDisplay[] {
    return admins.map(admin => ({
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
      phone: formatPhone(admin.phone),
      roles: admin.role ? [admin.role] : [],
    }));
  }

  /**
   * Map instructor to employee format
   * For employee directory, show internal contact info (email, phoneNumber)
   * @private
   */
  #mapInstructorToEmployee(instructor: DirectoryInstructor, obscurePhone: boolean = false): EmployeeDisplay {
    // Get instruments from specialties field
    const instruments = instructor.specialties || [];
    const instrumentsText = instruments.length > 0 ? instruments.join(', ') : 'Instructor';

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
  #sortEmployeesForDirectory(employees: EmployeeDisplay[]): EmployeeDisplay[] {
    return employees.sort((a, b) => {
      // Define admin role priorities (lower number = higher priority)
      const getAdminPriority = (employee: EmployeeDisplay): number => {
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
  async cleanup(): Promise<void> {
    this.directoryTable = null;
  }
}
