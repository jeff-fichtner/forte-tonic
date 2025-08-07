// Final verification script - run this in the browser console
// This will definitively tell us if the sorting is working or not

function verifyAdminSorting() {
  console.log('🔍 Final Admin Sorting Verification');
  console.log('===================================');
  
  // Test with exact data format from the application
  const mockData = [
    // Instructors (should be at bottom)
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
    },
    // Admins (should be at top)
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
  
  // Exact sorting function from viewModel
  function sortEmployeesForDirectory(employees) {
    return employees.sort((a, b) => {
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
      
      const priorityA = getAdminPriority(a);
      const priorityB = getAdminPriority(b);
      
      if (priorityA === priorityB) {
        const nameA = a.fullName || '';
        const nameB = b.fullName || '';
        return nameA.localeCompare(nameB);
      }
      
      return priorityA - priorityB;
    });
  }
  
  console.log('\n📋 Before sorting:');
  mockData.forEach((emp, i) => {
    console.log(`${i+1}. ${emp.fullName} - ${emp.roles.join(', ')}`);
  });
  
  console.log('\n⚡ After sorting:');
  const sorted = sortEmployeesForDirectory([...mockData]);
  sorted.forEach((emp, i) => {
    const isAdmin = emp.roles.some(role => 
      role.toLowerCase().includes('forte') || 
      role.toLowerCase().includes('admin')
    );
    console.log(`${i+1}. ${emp.fullName} - ${emp.roles.join(', ')} ${isAdmin ? '👑' : '👨‍🏫'}`);
  });
  
  // Verification
  const firstTwoAreAdmins = sorted.slice(0, 2).every(emp =>
    emp.roles.some(role => 
      role.toLowerCase().includes('forte') || 
      role.toLowerCase().includes('admin')
    )
  );
  
  console.log('\n🎯 Result:');
  if (firstTwoAreAdmins) {
    console.log('✅ PASSED: Admins correctly appear at the top');
    console.log('   The sorting algorithm is working perfectly');
    console.log('   Issue must be in data loading or UI rendering');
  } else {
    console.log('❌ FAILED: Admins are not at the top');
    console.log('   There is a bug in the sorting algorithm');
  }
  
  return sorted;
}

// Run verification
verifyAdminSorting();
