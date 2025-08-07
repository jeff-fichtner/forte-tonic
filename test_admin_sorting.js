// Test the admin sorting functionality
console.log('Testing admin directory sorting...\n');

// Mock employee data similar to what would be generated
const mockEmployees = [
  {
    id: 'INST-001',
    fullName: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '555-0101',
    roles: ['Piano', 'Voice']
  },
  {
    id: 'ADMIN-001',
    fullName: 'Bob Smith',
    email: 'bob@example.com',
    phone: '555-0102',
    roles: ['Forte Associate Manager']
  },
  {
    id: 'INST-002',
    fullName: 'Charlie Brown',
    email: 'charlie@example.com',
    phone: '555-0103',
    roles: ['Guitar', 'Bass']
  },
  {
    id: 'ADMIN-002',
    fullName: 'Diana Prince',
    email: 'diana@example.com',
    phone: '555-0104',
    roles: ['Forte Director']
  },
  {
    id: 'INST-003',
    fullName: 'Eve Davis',
    email: 'eve@example.com',
    phone: '555-0105',
    roles: ['Violin', 'Viola']
  }
];

// Implement the sorting logic from the ViewModel
function sortEmployeesForDirectory(employees) {
  return employees.sort((a, b) => {
    // Define admin role priorities (lower number = higher priority)
    const getAdminPriority = (employee) => {
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
    
    // If both are admins or both are non-admins, sort alphabetically by name
    if (priorityA === priorityB) {
      const nameA = a.fullName || '';
      const nameB = b.fullName || '';
      return nameA.localeCompare(nameB);
    }
    
    // Otherwise, sort by admin priority (lower number first)
    return priorityA - priorityB;
  });
}

// Test the sorting
console.log('Original order:');
mockEmployees.forEach((emp, index) => {
  console.log(`${index + 1}. ${emp.fullName} - ${emp.roles.join(', ')}`);
});

console.log('\nAfter sorting (admins should be at top):');
const sortedEmployees = sortEmployeesForDirectory([...mockEmployees]);
sortedEmployees.forEach((emp, index) => {
  const isAdmin = emp.roles.some(role => 
    role.toLowerCase().includes('forte') || 
    role.toLowerCase().includes('admin')
  );
  console.log(`${index + 1}. ${emp.fullName} - ${emp.roles.join(', ')} ${isAdmin ? '👑 ADMIN' : ''}`);
});

console.log('\n✅ Test completed! Admins should now appear at the top of the directory.');
