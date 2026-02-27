export interface EmployeeDisplay {
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
 * Sort employees for directory display.
 * Admins first (by priority: Director → Associate Manager → Admin),
 * then instructors alphabetically by last name, then first name.
 */
export function sortEmployeesForDirectory(employees: EmployeeDisplay[]): EmployeeDisplay[] {
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
 * Build a table row for an employee.
 */
export function buildDirectoryTableRow(employee: EmployeeDisplay): string {
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
