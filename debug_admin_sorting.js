// Debug script to test admin sorting functionality
// This will help identify why admins aren't appearing at the top

// Mock data that mimics what adminEmployees() returns
const mockAdmins = [
  {
    id: 'admin1',
    fullName: 'Noah DeMoss-Levy',
    email: 'ndemosslevy@mcds.org',
    phone: '(415) 945-5121',
    roles: ['Forte Director']
  },
  {
    id: 'admin2',
    fullName: 'Other Admin',
    email: 'forte@mcds.org',
    phone: '(415) 945-5122',
    roles: ['Forte Associate Manager']
  }
];

// Mock instructor data that mimics what instructorToEmployee returns
const mockInstructors = [
  {
    id: 'inst1',
    fullName: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '555-0101',
    roles: ['Piano', 'Guitar']
  },
  {
    id: 'inst2',
    fullName: 'Bob Smith',
    email: 'bob@example.com',
    phone: '555-0102',
    roles: ['Violin']
  }
];

// Combined employee list (exactly how it's created in viewModel)
const allEmployees = mockAdmins.concat(mockInstructors);

// Exact sorting function from viewModel.js
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

console.log('🔍 Testing Admin Sorting in Forte Directory');
console.log('================================================');

console.log('\n📋 Original employee list:');
allEmployees.forEach((emp, index) => {
  console.log(`${index + 1}. ${emp.fullName} - ${emp.roles.join(', ')}`);
});

console.log('\n🔧 Checking admin priorities:');
allEmployees.forEach(emp => {
  const getAdminPriority = (employee) => {
    if (!employee.roles || !Array.isArray(employee.roles)) return 999;
    
    for (const role of employee.roles) {
      const roleStr = role.toLowerCase();
      if (roleStr.includes('forte director')) return 1;
      if (roleStr.includes('forte associate manager')) return 2;
      if (roleStr.includes('admin')) return 3;
    }
    return 999;
  };
  
  const priority = getAdminPriority(emp);
  console.log(`   ${emp.fullName}: priority ${priority} (roles: ${emp.roles.join(', ')})`);
});

console.log('\n⚡ After sorting:');
const sortedEmployees = sortEmployeesForDirectory([...allEmployees]);
sortedEmployees.forEach((emp, index) => {
  const isAdmin = emp.roles.some(role => 
    role.toLowerCase().includes('forte') || 
    role.toLowerCase().includes('admin')
  );
  console.log(`${index + 1}. ${emp.fullName} - ${emp.roles.join(', ')} ${isAdmin ? '👑 ADMIN' : '👨‍🏫 INSTRUCTOR'}`);
});

console.log('\n✅ Test Results:');
const firstTwo = sortedEmployees.slice(0, 2);
const adminsFirst = firstTwo.every(emp => 
  emp.roles.some(role => 
    role.toLowerCase().includes('forte') || 
    role.toLowerCase().includes('admin')
  )
);

if (adminsFirst) {
  console.log('✅ SUCCESS: Admins are correctly appearing at the top!');
  console.log('   The sorting algorithm is working properly.');
  console.log('   If admins aren\'t showing in the UI, the issue is elsewhere.');
} else {
  console.log('❌ FAILURE: Admins are NOT at the top.');
  console.log('   There\'s an issue with the sorting algorithm.');
}
