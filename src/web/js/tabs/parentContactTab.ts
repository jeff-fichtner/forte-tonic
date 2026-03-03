import { BaseTab, SessionInfo, getParentId } from '../core/baseTab.js';
import { Table } from '../components/table.js';
import { formatPhone } from '../utilities/phoneHelpers.js';
import { copyToClipboard } from '../utilities/clipboardHelpers.js';
import { resolveParentTrimesters } from '../utilities/trimesterHelpers.js';
import { HttpService } from '../data/httpService.js';
import type { HttpResult } from '../data/httpService.js';
import { validateResponseFields } from '../data/responseValidation.js';
import {
  EmployeeDisplay,
  sortEmployeesForDirectory,
  buildDirectoryTableRow,
} from '../utilities/directoryHelpers.js';

interface ContactData {
  admins: Record<string, unknown>[];
  instructors: Record<string, unknown>[];
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
export class ParentContactTab extends BaseTab<ContactData> {
  private directoryTable: Table<EmployeeDisplay> | null;

  constructor() {
    super('parent-contact-us');

    this.directoryTable = null;
  }

  /**
   * Fetch contact directory data for parent
   * Returns admins + instructors teaching this parent's children
   * Makes 2 calls during enrollment (current + next trimester), 1 during registration period
   */
  async fetchData(sessionInfo: SessionInfo | null): Promise<HttpResult<ContactData>> {
    const id = getParentId(sessionInfo);
    if (!id) {
      return { ok: false, error: { message: 'No parent ID found in session' } };
    }

    const ctx = resolveParentTrimesters();
    if (!ctx) {
      return { ok: false, error: { message: 'Period information not available' } };
    }

    const signal = this.getAbortSignal();

    const currentResult = await HttpService.get<ContactData>(
      `parent/tabs/contact/${ctx.currentTrimester}?parentId=${id}`,
      { signal }
    );
    const validatedResult = validateResponseFields(currentResult, ['admins', 'instructors']);
    if (!validatedResult.ok) return validatedResult;

    const currentData = validatedResult.data;

    if (ctx.showBothTrimesters && ctx.nextTrimester) {
      const nextResult = await HttpService.get<ContactData>(
        `parent/tabs/contact/${ctx.nextTrimester}?parentId=${id}`,
        { signal }
      );

      if (nextResult.ok) {
        const seenIds = new Set<string>(
          currentData.instructors.map((i: Record<string, unknown>) => i.id as string)
        );
        const uniqueNextInstructors = (nextResult.data.instructors || []).filter(
          (i: Record<string, unknown>) => !seenIds.has(i.id as string)
        );
        return {
          ok: true,
          data: {
            admins: currentData.admins,
            instructors: [...currentData.instructors, ...uniqueNextInstructors],
          },
        };
      }
    }

    return { ok: true, data: currentData };
  }

  /**
   * Render the contact directory table
   */
  async render(): Promise<void> {
    const container = this.getContainer();

    // Map admins and instructors to employee format
    const adminEmployees = this.#mapAdminsToEmployees(this.data!.admins);
    const instructorEmployees = this.data!.instructors.map((instructor: Record<string, unknown>) =>
      this.#mapInstructorToEmployee(instructor, true)
    );

    // Combine and sort (admins first, then instructors alphabetically)
    const allEmployees: EmployeeDisplay[] = [...adminEmployees, ...instructorEmployees];
    const sortedEmployees = sortEmployeesForDirectory(allEmployees);

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
  #mapInstructorToEmployee(
    instructor: Record<string, unknown>,
    obscurePhone: boolean = false
  ): EmployeeDisplay {
    // Get instruments from specialties field
    const instruments = (instructor.specialties as string[]) || [];
    const instrumentsText = instruments.length > 0 ? instruments.join(', ') : 'Instructor';

    const displayEmail = (instructor.displayEmail as string) || '';
    const displayPhone = (instructor.displayPhone as string) || '';

    return {
      id: instructor.id as string,
      fullName:
        (instructor.fullName as string) ||
        `${(instructor.firstName as string) || ''} ${(instructor.lastName as string) || ''}`.trim(),
      email: displayEmail,
      phone: formatPhone(displayPhone),
      role: instrumentsText,
      roles: [instrumentsText], // Array for sorting compatibility
      lastName: (instructor.lastName as string) || '',
      firstName: (instructor.firstName as string) || '',
    };
  }

  /**
   * Cleanup when tab is unloaded
   */
  async cleanup(): Promise<void> {
    this.directoryTable = null;
  }
}
