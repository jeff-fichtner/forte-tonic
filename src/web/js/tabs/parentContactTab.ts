import { BaseTab, SessionInfo } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatPhone } from '../utilities/phoneHelpers.js';
import { copyToClipboard } from '../utilities/clipboardHelpers.js';
import { isEnrollmentPeriod } from '../utilities/periodHelpers.js';
import { HttpService } from '../data/httpService.js';

interface ContactData {
  admins: Record<string, unknown>[];
  instructors: Record<string, unknown>[];
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
  private directoryTable: Table | null;

  constructor() {
    super('parent-contact-us');

    this.directoryTable = null;
  }

  /**
   * Fetch contact directory data for parent
   * Returns admins + instructors teaching this parent's children
   * Makes 2 calls during enrollment (current + next trimester), 1 during registration period
   */
  async fetchData(sessionInfo: SessionInfo | null): Promise<Record<string, unknown>> {
    const parentId = (sessionInfo?.user as Record<string, unknown> | undefined)?.parent as Record<string, unknown> | undefined;
    const id = parentId?.id as string | undefined;
    if (!id) {
      throw new Error('No parent ID found in session');
    }

    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const appConfig = window.UserSession?.getAppConfig();

    if (!currentPeriod) {
      throw new Error('Period information not available');
    }

    const currentTrimester = appConfig?.currentTrimester || currentPeriod.trimester;
    const signal = this.getAbortSignal();

    // Fetch current trimester data
    const currentData = await HttpService.get(`parent/tabs/contact/${currentTrimester}?parentId=${id}`, { signal }) as ContactData;

    if (!currentData.admins || !currentData.instructors) {
      throw new Error('Invalid response: missing admins or instructors');
    }

    // During enrollment periods, also fetch next trimester and merge instructor lists
    if (isEnrollmentPeriod(currentPeriod)) {
      const nextTrimester = appConfig?.nextTrimester || currentPeriod.trimester;
      const nextData = await HttpService.get(`parent/tabs/contact/${nextTrimester}?parentId=${id}`, { signal }) as ContactData;

      // Merge instructor arrays, deduplicating by ID
      const seenIds = new Set<string>(currentData.instructors.map((i: Record<string, unknown>) => i.id as string));
      const uniqueNextInstructors = (nextData.instructors || []).filter((i: Record<string, unknown>) => !seenIds.has(i.id as string));

      return {
        admins: currentData.admins,
        instructors: [...currentData.instructors, ...uniqueNextInstructors],
      } as unknown as Record<string, unknown>;
    }

    return currentData as unknown as Record<string, unknown>;
  }

  /**
   * Render the contact directory table
   */
  async render(): Promise<void> {
    const container = this.getContainer();
    const typedData = this.data as unknown as ContactData;

    // Map admins and instructors to employee format
    const adminEmployees = this.#mapAdminsToEmployees(typedData.admins);
    const instructorEmployees = typedData.instructors.map((instructor: Record<string, unknown>) =>
      this.#mapInstructorToEmployee(instructor, true)
    );

    // Combine and sort (admins first, then instructors alphabetically)
    const allEmployees: EmployeeDisplay[] = [...adminEmployees, ...instructorEmployees];
    const sortedEmployees = this.#sortEmployeesForDirectory(allEmployees);

    // Find or create table element
    let tableElement = container.querySelector<HTMLElement>('#parent-directory-table');
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
   * Copy text to clipboard with fallback for older browsers
   * @private
   */

  /**
   * Map admins to employee format
   * For parent contact, show public contact info (displayEmail, displayPhone)
   * Shows blank if not set (no fallback to personal contact info)
   * @private
   */
  #mapAdminsToEmployees(admins: Record<string, unknown>[]): EmployeeDisplay[] {
    return admins.map((admin: Record<string, unknown>) => ({
      id: admin.id as string,
      fullName: admin.fullName as string,
      email: admin.displayEmail as string,
      phone: formatPhone(admin.displayPhone as string),
      roles: admin.role ? [admin.role as string] : [],
    }));
  }

  /**
   * Map instructor to employee format
   * For parent contact, show public contact info (displayEmail, displayPhone)
   * @private
   */
  #mapInstructorToEmployee(instructor: Record<string, unknown>, obscurePhone: boolean = false): EmployeeDisplay {
    // Get instruments from specialties field
    const instruments = (instructor.specialties as string[]) || [];
    const instrumentsText = instruments.length > 0 ? instruments.join(', ') : 'Instructor';

    const displayEmail = (instructor.displayEmail as string) || '';
    const displayPhone = (instructor.displayPhone as string) || '';

    return {
      id: instructor.id as string,
      fullName:
        (instructor.fullName as string) || `${(instructor.firstName as string) || ''} ${(instructor.lastName as string) || ''}`.trim(),
      email: displayEmail,
      phone: formatPhone(displayPhone),
      role: instrumentsText,
      roles: [instrumentsText], // Array for sorting compatibility
      lastName: (instructor.lastName as string) || '',
      firstName: (instructor.firstName as string) || '',
    };
  }

  /**
   * Sort employees for directory display
   * Admins first (by priority), then instructors (alphabetically by last name)
   * @private
   */
  #sortEmployeesForDirectory(employees: EmployeeDisplay[]): EmployeeDisplay[] {
    return employees.sort((a: EmployeeDisplay, b: EmployeeDisplay) => {
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
