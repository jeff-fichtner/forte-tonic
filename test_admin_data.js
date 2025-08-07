// Simple test to verify admin data and sorting
// Run this in the browser console on the forte page

function testAdminSorting() {
  console.log('🔍 Testing Admin Sorting in Live Application');
  console.log('===============================================');
  
  // Check if the global viewModel is available
  if (typeof window.viewModel === 'undefined') {
    console.log('❌ viewModel not available on window object');
    return;
  }
  
  const vm = window.viewModel;
  
  // Check admins data
  console.log('\n📊 Admin Data:');
  console.log('vm.admins:', vm.admins);
  console.log('vm.admins.length:', vm.admins ? vm.admins.length : 'undefined');
  
  // Check adminEmployees method
  console.log('\n📋 Admin Employees:');
  try {
    const adminEmps = vm.adminEmployees();
    console.log('adminEmployees():', adminEmps);
    console.log('adminEmployees().length:', adminEmps.length);
    
    adminEmps.forEach((admin, index) => {
      console.log(`  ${index + 1}. ${admin.fullName} - roles: ${admin.roles.join(', ')}`);
    });
  } catch (error) {
    console.log('❌ Error calling adminEmployees():', error);
  }
  
  // Check instructor data
  console.log('\n👨‍🏫 Instructor Data:');
  console.log('vm.instructors.length:', vm.instructors ? vm.instructors.length : 'undefined');
  
  // Test the full mapping
  console.log('\n🔄 Testing Full Mapping:');
  try {
    const mappedEmployees = vm.adminEmployees().concat(
      vm.instructors.map(vm.instructorToEmployee)
    );
    console.log('mappedEmployees.length:', mappedEmployees.length);
    console.log('First 5 employees before sorting:');
    mappedEmployees.slice(0, 5).forEach((emp, index) => {
      console.log(`  ${index + 1}. ${emp.fullName} - roles: ${emp.roles.join(', ')}`);
    });
    
    // Test sorting
    const sortedEmployees = vm._sortEmployeesForDirectory ? 
      vm._sortEmployeesForDirectory(mappedEmployees) : 
      'Sorting method not accessible';
    
    if (Array.isArray(sortedEmployees)) {
      console.log('\nAfter sorting (first 5):');
      sortedEmployees.slice(0, 5).forEach((emp, index) => {
        const isAdmin = emp.roles.some(role => 
          role.toLowerCase().includes('forte') || 
          role.toLowerCase().includes('admin')
        );
        console.log(`  ${index + 1}. ${emp.fullName} - roles: ${emp.roles.join(', ')} ${isAdmin ? '👑' : '👨‍🏫'}`);
      });
    } else {
      console.log('Could not access sorting method:', sortedEmployees);
    }
    
  } catch (error) {
    console.log('❌ Error in full mapping test:', error);
  }
}

// Run the test
testAdminSorting();
