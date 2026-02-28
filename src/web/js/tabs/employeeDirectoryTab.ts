import { BaseTab, SessionInfo } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatPhone } from '../utilities/phoneHelpers.js';
import { copyToClipboard } from '../utilities/clipboardHelpers.js';
import { HttpService } from '../data/httpService.js';
import type { HttpResult } from '../data/httpService.js';
import { validateResponseFields } from '../data/responseValidation.js';
import { EmployeeDisplay, sortEmployeesForDirectory, buildDirectoryTableRow } from '../utilities/directoryHelpers.js';

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

interface DirectoryData {
  admins: DirectoryAdmin[];
  instructors: DirectoryInstructor[];
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
export class EmployeeDirectoryTab extends BaseTab<DirectoryData> {
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
  async fetchData(_sessionInfo: SessionInfo | null): Promise<HttpResult<DirectoryData>> {
    const result = await HttpService.get<DirectoryData>('instructor/tabs/directory', { signal: this.getAbortSignal() });
    return validateResponseFields(result, ['admins', 'instructors']);
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
    const sortedEmployees = sortEmployeesForDirectory(allEmployees);

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
      buildDirectoryTableRow,
      sortedEmployees,
      this.#handleTableClick.bind(this)
    );
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
   * Cleanup when tab is unloaded
   */
  async cleanup(): Promise<void> {
    this.directoryTable = null;
  }
}
