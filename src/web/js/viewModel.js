import { HttpService } from './data/httpService.js';
import { ServerFunctions, DataStores, Sections, RegistrationType } from './constants.js';
import { AuthenticatedUserResponse } from '/models/shared/responses/authenticatedUserResponse.js';
import { Admin, Instructor, Student, Registration, Class, Room } from '/models/shared/index.js';
import { DomHelpers } from './utilities/domHelpers.js';
import { NavTabs } from './components/navTabs.js';
import { Table } from './components/table.js';
import { AdminRegistrationForm } from './workflows/adminRegistrationForm.js';
import { ParentRegistrationForm } from './workflows/parentRegistrationForm.js';
import { formatGrade, formatTime } from './extensions/numberExtensions.js';

/**
 *
 */
export class ViewModel {
  /**
   *
   */
  async initializeAsync() {
    const authenticatedUser = await HttpService.fetch(
      ServerFunctions.getAuthenticatedUser,
      x => new AuthenticatedUserResponse(x)
    );

    const validations = [
      [
        authenticatedUser,
        'No authenticated user received.',
        `Must authorize use of email address.`,
      ],
    ];
    for (const [condition, errorMessage, alertMessage] of validations) {
      if (!condition) {
        console.error(errorMessage);
        alert(alertMessage);
        await DomHelpers.waitForDocumentReadyAsync();
        await this.#setPageLoading(false, errorMessage);
        return;
      }
    }
  }

  async initializeAsync() {
    // BYPASS INDEXEDDB: Load fresh data directly
    console.log('Initializing ViewModel (IndexedDB bypassed)...');
    
    const authenticatedUser = await HttpService.fetch(
      ServerFunctions.getAuthenticatedUser,
      x => new AuthenticatedUserResponse(x)
    );

    const validations = [
      [
        authenticatedUser,
        'Failed to get authenticated user. Please check your authentication status.',
      ],
    ];

    for (const [value, errorMessage] of validations) {
      if (!value) {
        console.error(errorMessage);
        await DomHelpers.waitForDocumentReadyAsync();
        await this.#setPageLoading(false, errorMessage);
        return;
      }
    }

    const [_, admins, instructors, students, registrations, classes, rooms] = await Promise.all([
      DomHelpers.waitForDocumentReadyAsync(),
      HttpService.fetch(ServerFunctions.getAdmins, x => x.map(y => Admin.fromApiData(y))),
      HttpService.fetch(ServerFunctions.getInstructors, x => x.map(y => Instructor.fromApiData(y))),
      this.#getStudents(),
      HttpService.fetchAllPages(ServerFunctions.getRegistrations, x => Registration.fromApiData(x)),
      HttpService.fetch(ServerFunctions.getClasses, x => x.map(y => Class.fromApiData(y))),
      HttpService.fetch(ServerFunctions.getRooms, x => x.map(y => Room.fromApiData(y))),
    ]);
    M.AutoInit();
    this.currentUser = authenticatedUser;
    this.admins = admins;
    this.instructors = instructors;
    this.students = students;
    this.registrations = registrations.map(registration => {
      // ensure student is populated
      if (!registration.student) {
        registration.student = this.students.find(x => {
          const studentId = x.id?.value || x.id;
          const registrationStudentId = registration.studentId?.value || registration.studentId;
          return studentId === registrationStudentId;
        });
        
        // Debug: Log if student not found
        if (!registration.student) {
          console.warn(`Student not found for registration ${registration.id} with studentId ${registration.studentId?.value || registration.studentId}`);
        }
      }
      // ensure instructor is populated
      if (!registration.instructor) {
        registration.instructor = this.instructors.find(x => x.id === registration.instructorId.value);
      }
      return registration;
    });
    this.classes = classes;
    this.rooms = rooms;
    
    let defaultSection;
    if (authenticatedUser.shouldShowAsOperator || authenticatedUser.admin) {
      this.#initAdminContent();
      defaultSection = Sections.ADMIN;
    }
    if (authenticatedUser.shouldShowAsOperator || authenticatedUser.instructor) {
      this.#initInstructorContent();
      defaultSection = Sections.INSTRUCTOR;
    }
    if (authenticatedUser.shouldShowAsOperator || authenticatedUser.parent) {
      this.#initParentContent();
      defaultSection = Sections.PARENT;
    }
    const defaultSectionToUse = !authenticatedUser.shouldShowAsOperator ? defaultSection : null;
    this.navTabs = new NavTabs(defaultSectionToUse);
    this.#setPageLoading(false);
  }
  /**
   *
   */
  #initAdminContent() {
    // master schedule tab
    const sortedRegistrations = this.#sortRegistrations(this.registrations);
    this.masterScheduleTable = this.#buildRegistrationTable(sortedRegistrations);
    this.#populateFilterDropdowns();
    // registration form
    this.adminRegistrationForm = new AdminRegistrationForm(
      this.instructors,
      this.students,
      this.classes,
      async data => {
        const newRegistration = await HttpService.post(ServerFunctions.register, data, x =>
          Registration.fromApiData(x.newRegistration)
        );

        // handle response
        M.toast({ html: 'Registration created successfully.' });
        this.registrations.push(newRegistration);
        this.masterScheduleTable.replaceRange(this.registrations);
      }
    );
    // weekly schedule
    // directory
    const mappedEmployees = this.adminEmployees().concat(
      this.instructors.map(this.instructorToEmployee)
    );
    // Sort employees to ensure admins appear at the top
    const sortedEmployees = this.#sortEmployeesForDirectory(mappedEmployees);
    this.employeeDirectoryTable = this.#buildDirectory('employee-directory-table', sortedEmployees);
  }
  /**
   *
   */
  #initInstructorContent() {
    // weekly schedule
    // unique days registrations
    const daysWithRegistrations = this.registrations
      .map(registration => registration.day)
      .filter((day, index, self) => self.indexOf(day) === index);

    const instructorWeeklyScheduleTables = document.getElementById(
      'instructor-weekly-schedule-tables'
    );

    // TODO future will allow redraw
    daysWithRegistrations.forEach(day => {
      const tableId = `instructor-weekly-schedule-table-${day}`;
      const newTable = document.createElement('table');
      newTable.id = tableId;
      instructorWeeklyScheduleTables.appendChild(newTable);
      this.#buildWeeklySchedule(
        tableId,
        this.registrations.filter(x => x.day === day)
      );
    });
    // attendance
    // directory
    const mappedEmployees = this.adminEmployees().concat(
      this.instructors.map(this.instructorToEmployee)
    );
    // Sort employees to ensure admins appear at the top
    const sortedEmployees = this.#sortEmployeesForDirectory(mappedEmployees);
    // this may be set in admin section if user is operator
    this.employeeDirectoryTable ??= this.#buildDirectory(
      'employee-directory-table',
      sortedEmployees
    );
  }
  /**
   *
   */
  #initParentContent() {
    // weekly schedule
    // Get the current parent's ID
    const currentParentId = this.currentUser.parent?.id;
    
    if (!currentParentId) {
      console.warn('No parent ID found for current user');
      return;
    }

    // Filter registrations to only show those where the student is the parent's child
    const parentChildRegistrations = this.registrations.filter(registration => {
      const student = registration.student;
      if (!student) return false;
      
      // Check if the current parent is either parent1 or parent2 of the student
      return student.parent1Id === currentParentId || student.parent2Id === currentParentId;
    });

    // Get unique students with registrations (their own children only)
    const studentsWithRegistrations = parentChildRegistrations
      .map(registration => registration.student)
      .filter(student => student && student.id) // Filter out undefined students and students without IDs
      .filter((student, index, self) => self.findIndex(s => s.id === student.id) === index);
    
    const parentWeeklyScheduleTables = document.getElementById('parent-weekly-schedule-tables');

    // Clear existing content
    parentWeeklyScheduleTables.innerHTML = '';

    // Show 'no matching registrations' message if no children have registrations
    if (studentsWithRegistrations.length === 0) {
      const noRegistrationsMessage = document.createElement('div');
      noRegistrationsMessage.className = 'card-panel orange lighten-4';
      noRegistrationsMessage.style.cssText = 'text-align: center; padding: 30px; margin: 20px 0;';
      noRegistrationsMessage.innerHTML = `
        <h5 style="color: #e65100; margin-bottom: 10px;">No Matching Registrations</h5>
        <p style="color: #bf360c; font-size: 16px; margin: 0;">
          Your children currently have no active lesson registrations.
        </p>
      `;
      parentWeeklyScheduleTables.appendChild(noRegistrationsMessage);
      return;
    }

    // Create a separate table for each child
    studentsWithRegistrations.forEach(student => {
      // Create a container for each child's schedule
      const studentContainer = document.createElement('div');
      studentContainer.className = 'student-schedule-container';
      studentContainer.style.cssText = 'margin-bottom: 30px;';
      
      // Add student name header
      const studentHeader = document.createElement('h5');
      studentHeader.style.cssText = 'color: #2b68a4; margin-bottom: 15px; border-bottom: 2px solid #2b68a4; padding-bottom: 10px;';
      studentHeader.textContent = `${student.firstName} ${student.lastName}'s Schedule`;
      studentContainer.appendChild(studentHeader);
      
      // Create table for this student
      const tableId = `parent-weekly-schedule-table-${student.id}`;
      const newTable = document.createElement('table');
      newTable.id = tableId;
      studentContainer.appendChild(newTable);
      
      parentWeeklyScheduleTables.appendChild(studentContainer);
      
      this.#buildWeeklySchedule(
        tableId,
        parentChildRegistrations.filter(x => x.studentId.value === student.id)
      );
    });
    
    // registration
    // Initialize parent registration form with hybrid interface
    this.parentRegistrationForm = new ParentRegistrationForm(
      this.instructors,
      this.students,
      this.classes,
      async data => {
        const newRegistration = await HttpService.post(ServerFunctions.register, data, x =>
          Registration.fromApiData(x.newRegistration)
        );

        // handle response
        M.toast({ html: 'Registration created successfully.' });
        this.registrations.push(newRegistration);
        // Refresh parent schedule after registration
        this.#initParentContent();
      }
    );
    
    // directory - only show instructors who teach the parent's children
    const mappedEmployees = this.adminEmployees().concat(
      this.instructors
        .filter(instructor =>
          parentChildRegistrations.some(registration => registration.instructorId.value === instructor.id)
        )
        .map(this.instructorToEmployee)
    );
    // Sort employees to ensure admins appear at the top
    const sortedEmployees = this.#sortEmployeesForDirectory(mappedEmployees);
    this.parentDirectoryTable = this.#buildDirectory('parent-directory-table', sortedEmployees);
  }
  /**
   *
   */
  #setPageLoading(isLoading, errorMessage = '') {
    const loadingContainer = document.getElementById('page-loading-container');
    const pageContent = document.getElementById('page-content');
    const pageErrorContent = document.getElementById('page-error-content');
    const pageErrorContentMessage = document.getElementById('page-error-content-message');
    const nav = document.getElementById('nav-mobile');
    loadingContainer.style.display = isLoading ? 'flex' : 'none';
    loadingContainer.hidden = !isLoading;
    pageContent.hidden = isLoading || errorMessage;
    nav.hidden = !this.currentUser.shouldShowAsOperator || isLoading || errorMessage;
    pageErrorContent.hidden = !errorMessage && !isLoading;
    pageErrorContentMessage.textContent = errorMessage;
  }
  // TODO duplicated (will be consolidated elsewhere)
  /**
   *
   */
  #setAdminRegistrationLoading(isLoading) {
    const adminRegistrationLoadingContainer = document.getElementById(
      'admin-registration-loading-container'
    );
    const adminRegistrationContainer = document.getElementById('admin-registration-container');
    adminRegistrationLoadingContainer.hidden = !isLoading;
    adminRegistrationContainer.hidden = isLoading;
  }
  /**
   * Populate the filter dropdowns with actual data
   */
  #populateFilterDropdowns() {
    // Populate instructor dropdown
    const instructorSelect = document.getElementById('master-schedule-instructor-filter-select');
    if (instructorSelect) {
      // Clear existing options except the first (placeholder)
      while (instructorSelect.children.length > 1) {
        instructorSelect.removeChild(instructorSelect.lastChild);
      }
      
      // Ensure first option is disabled and not selected
      if (instructorSelect.firstElementChild) {
        instructorSelect.firstElementChild.disabled = true;
        instructorSelect.firstElementChild.selected = false;
      }
      
      // Add instructor options
      this.instructors.forEach(instructor => {
        const option = document.createElement('option');
        option.value = instructor.id;
        option.textContent = `${instructor.firstName} ${instructor.lastName}`;
        instructorSelect.appendChild(option);
      });
    }

    // Populate day dropdown
    const daySelect = document.getElementById('master-schedule-day-filter-select');
    if (daySelect) {
      // Clear existing options except the first (placeholder)
      while (daySelect.children.length > 1) {
        daySelect.removeChild(daySelect.lastChild);
      }
      
      // Ensure first option is disabled and not selected
      if (daySelect.firstElementChild) {
        daySelect.firstElementChild.disabled = true;
        daySelect.firstElementChild.selected = false;
      }
      
      // Get unique days from registrations
      const uniqueDays = [...new Set(this.registrations.map(reg => reg.day))];
      // Sort days in logical weekday order
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      uniqueDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)).forEach(day => {
        const option = document.createElement('option');
        option.value = day;
        option.textContent = day;
        daySelect.appendChild(option);
      });
    }

    // Populate grade dropdown
    const gradeSelect = document.getElementById('master-schedule-grade-filter-select');
    if (gradeSelect) {
      // Clear existing options except the first (placeholder)
      while (gradeSelect.children.length > 1) {
        gradeSelect.removeChild(gradeSelect.lastChild);
      }
      
      // Ensure first option is disabled and not selected
      if (gradeSelect.firstElementChild) {
        gradeSelect.firstElementChild.disabled = true;
        gradeSelect.firstElementChild.selected = false;
      }
      
      // Get unique grades from students who have registrations
      const registeredStudentIds = this.registrations.map(reg => 
        reg.studentId?.value || reg.studentId
      );
      const registeredStudents = this.students.filter(student => 
        registeredStudentIds.includes(student.id?.value || student.id)
      );
      const uniqueGrades = [...new Set(registeredStudents.map(student => student.grade))];
      // Sort grades numerically and filter out null/undefined values
      uniqueGrades
        .filter(grade => grade != null && grade !== '')
        .sort((a, b) => {
          // Convert to numbers for proper numeric sorting
          const gradeA = typeof a === 'number' ? a : parseInt(a) || 0;
          const gradeB = typeof b === 'number' ? b : parseInt(b) || 0;
          return gradeA - gradeB;
        })
        .forEach(grade => {
          const option = document.createElement('option');
          option.value = grade.toString();
          option.textContent = `Grade ${formatGrade(grade)}`;
          gradeSelect.appendChild(option);
        });
    }

    // Reinitialize Materialize select elements
    const selects = document.querySelectorAll('select');
    M.FormSelect.init(selects);
  }

  /**
   * Sort registrations by day, then start time, then length, then registration type (private first, then group)
   */
  #sortRegistrations(registrations) {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    return [...registrations].sort((a, b) => {
      // 1. Sort by day
      const dayA = dayOrder.indexOf(a.day);
      const dayB = dayOrder.indexOf(b.day);
      if (dayA !== dayB) {
        return dayA - dayB;
      }
      
      // 2. Sort by start time
      const timeA = a.startTime || '';
      const timeB = b.startTime || '';
      if (timeA !== timeB) {
        return timeA.localeCompare(timeB);
      }
      
      // 3. Sort by length (numeric)
      const lengthA = parseInt(a.length) || 0;
      const lengthB = parseInt(b.length) || 0;
      if (lengthA !== lengthB) {
        return lengthA - lengthB;
      }
      
      // 4. Sort by registration type (private first, then group)
      const typeA = a.registrationType || '';
      const typeB = b.registrationType || '';
      if (typeA !== typeB) {
        // 'private' comes before 'group' alphabetically, which is what we want
        return typeA.localeCompare(typeB);
      }
      
      return 0;
    });
  }

  /**
   *
   */
  #buildRegistrationTable(defaultRegistrations) {
    return new Table(
      'master-schedule-table',
      [
        'Weekday',
        'Start Time',
        'Length',
        'Student',
        'Grade',
        'Instructor',
        'Instrument/Class',
        'Contact',
        'Remove',
      ],
      // row
      registration => {
        // Extract primitive values for comparison
        const instructorIdToFind = registration.instructorId?.value || registration.instructorId;
        const studentIdToFind = registration.studentId?.value || registration.studentId;
        
        // Find instructor and student
        const instructor = this.instructors.find(x => x.id === instructorIdToFind);
        const student = this.students.find(x => x.id?.value === studentIdToFind);
        
        if (!instructor || !student) {
          console.warn(`Instructor or student not found for registration: ${registration.id}`);
          return '';
        }
        return `
                        <td>${registration.day}</td>
                        <td>${formatTime(registration.startTime) || 'N/A'}</td>
                        <td>${registration.length || 'N/A'} min</td>
                        <td>${student.firstName} ${student.lastName}</td>
                        <td>${formatGrade(student.grade) || 'N/A'}</td>
                        <td>${instructor.firstName} ${instructor.lastName}</td>
                        <td>${registration.registrationType === RegistrationType.GROUP ? (registration.classTitle || 'N/A') : (registration.instrument || 'N/A')}</td>
                        <td>
                            <a href="#!" data-registration-id="${registration.id?.value || registration.id}">
                                <i class="material-icons copy-parent-emails-table-icon gray-text text-darken-4">email</i>
                            </a>
                        </td>
                        <td>
                            <a href="#!" data-registration-id="${registration.id?.value || registration.id}">
                                <i class="material-icons remove-registration-table-icon red-text text-darken-4">delete</i>
                            </a>
                        </td>
                    `;
      },
      defaultRegistrations,
      // on click
      async event => {
        const isCopy = event.target.classList.contains('copy-parent-emails-table-icon');
        const isDelete = event.target.classList.contains('remove-registration-table-icon');
        if (!isCopy && !isDelete) {
          return;
        }
        event.preventDefault();
        
        // Get the registration ID from the data attribute
        const linkElement = event.target.closest('a');
        const registrationId = linkElement?.getAttribute('data-registration-id');
        if (!registrationId) return;

        // Find the registration by ID in the original registrations array
        const currentRegistration = this.registrations.find(r => 
          (r.id?.value || r.id) === registrationId
        );
        if (!currentRegistration) return;        if (isCopy) {
          // Get the student ID from the current registration
          const studentIdToFind = currentRegistration.studentId?.value || currentRegistration.studentId;
          
          // Find the full student object with parent emails from this.students
          const fullStudent = this.students.find(x => {
            const studentId = x.id?.value || x.id;
            return studentId === studentIdToFind;
          });
          
          if (fullStudent && fullStudent.parentEmails && fullStudent.parentEmails.trim()) {
            await this.#copyToClipboard(fullStudent.parentEmails);
          } else {
            M.toast({ html: 'No parent email available for this student.' });
          }
          return;
        }
        if (isDelete) {
          const idToDelete = currentRegistration.id?.value || currentRegistration.id;
          await this.#requestDeleteRegistrationAsync(idToDelete);
          return;
        }
      },
      // filter
      registration => {
        // Get selected values from multi-select dropdowns
        const instructorSelect = document.getElementById('master-schedule-instructor-filter-select');
        const daySelect = document.getElementById('master-schedule-day-filter-select');
        const gradeSelect = document.getElementById('master-schedule-grade-filter-select');
        
        // If any dropdown doesn't exist yet, show all registrations (during initial load)
        if (!instructorSelect || !daySelect || !gradeSelect) {
          return true;
        }
        
        const selectedInstructors = Array.from(instructorSelect.selectedOptions)
          .map(option => option.value)
          .filter(value => value !== ''); // Exclude empty placeholder values
        const selectedDays = Array.from(daySelect.selectedOptions)
          .map(option => option.value)
          .filter(value => value !== ''); // Exclude empty placeholder values
        const selectedGrades = Array.from(gradeSelect.selectedOptions)
          .map(option => option.value)
          .filter(value => value !== ''); // Exclude empty placeholder values
        
        // Extract primitive values for comparison
        const instructorIdToFind = registration.instructorId?.value || registration.instructorId;
        const studentIdToFind = registration.studentId?.value || registration.studentId;
        
        // Find instructor and student
        const instructor = this.instructors.find(x => x.id === instructorIdToFind);
        const student = this.students.find(x => x.id?.value === studentIdToFind);
        
        if (!instructor || !student) {
          return false; // Skip rows where instructor or student not found
        }
        
        // Filter by selected instructors (if any selected, otherwise show all)
        if (selectedInstructors.length > 0 && !selectedInstructors.includes(instructorIdToFind)) {
          return false;
        }
        
        // Filter by selected days (if any selected, otherwise show all)
        if (selectedDays.length > 0 && !selectedDays.includes(registration.day)) {
          return false;
        }
        
        // Filter by selected grades (if any selected, otherwise show all)
        if (selectedGrades.length > 0 && !selectedGrades.includes(student.grade?.toString())) {
          return false;
        }
        
        return true;
      },
      [
        {
          filterId: 'master-schedule-instructor-filter-select',
          type: 'select-multiple'
        },
        {
          filterId: 'master-schedule-day-filter-select',
          type: 'select-multiple'
        },
        {
          filterId: 'master-schedule-grade-filter-select',
          type: 'select-multiple'
        }
      ],
      {
        pagination: true,
        itemsPerPage: 100,
        pageSizeOptions: [25, 50, 75, 100],
        rowClassFunction: registration => {
          // Return CSS class based on registration type
          return registration.registrationType === RegistrationType.GROUP 
            ? 'registration-row-group' 
            : 'registration-row-private';
        }
      }
    );
  }
  /**
   *
   */
  #buildWeeklySchedule(tableId, enrollments) {
    return new Table(
      tableId,
      ['Weekday', 'Start Time', 'Length', 'Student', 'Grade', 'Instructor', 'Instrument'],
      // row
      enrollment => {
        // More flexible instructor matching
        const instructor = this.instructors.find(x => {
          const instructorId = x.id?.value || x.id;
          const enrollmentInstructorId = enrollment.instructorId?.value || enrollment.instructorId;
          return instructorId === enrollmentInstructorId;
        });
        
        // More flexible student matching  
        const student = this.students.find(x => {
          const studentId = x.id?.value || x.id;
          const enrollmentStudentId = enrollment.studentId?.value || enrollment.studentId;
          return studentId === enrollmentStudentId;
        });
        
        if (!instructor || !student) {
          console.warn(`Instructor or student not found for enrollment: ${enrollment.id}`);
          console.warn(`Looking for instructorId: ${enrollment.instructorId?.value || enrollment.instructorId}, studentId: ${enrollment.studentId?.value || enrollment.studentId}`);
          console.warn('Available instructor IDs:', this.instructors.map(i => i.id?.value || i.id).slice(0, 5));
          console.warn('Available student IDs:', this.students.map(s => s.id?.value || s.id).slice(0, 5));
          
          // Return empty string to skip this enrollment rather than crashing
          return '';
        }
        return `
                        <td>${enrollment.day}</td>
                        <td>${formatTime(enrollment.startTime) || 'N/A'}</td>
                        <td>${enrollment.length || 'N/A'} min</td>
                        <td>${student.firstName} ${student.lastName}</td>
                        <td>${formatGrade(student.grade) || 'N/A'}</td>
                        <td>${instructor.firstName} ${instructor.lastName}</td>
                        <td>${enrollment.registrationType === RegistrationType.GROUP ? (enrollment.classTitle || enrollment.className || 'N/A') : (enrollment.instrument || 'N/A')}</td>
                    `;
      },
      enrollments,
      null, // onClickFunction
      null, // filterFunction
      null, // onFilterChanges
      {
        rowClassFunction: enrollment => {
          // Return CSS class based on enrollment registration type
          return enrollment.registrationType === RegistrationType.GROUP 
            ? 'registration-row-group' 
            : 'registration-row-private';
        }
      }
    );
  }
  /**
   * Build directory table for employees (admins + instructors)
   * @param {string} tableId - HTML table element ID
   * @param {Array} employees - Array of employee objects
   * @returns {Table} Table instance
   */
  #buildDirectory(tableId, employees) {
    return new Table(
      tableId,
      ['Name', 'Role', 'Email', 'Phone', 'Contact'],
      // row function with defensive programming
      employee => {
        const fullName =
          employee.fullName ||
          `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
          'Unknown';
        const roles = Array.isArray(employee.roles)
          ? employee.roles.join(', ')
          : employee.roles || 'Unknown';
        const email = employee.email || 'No email';
        const phone = employee.phone || employee.phoneNumber || 'No phone';

        return `
                        <td>${fullName}</td>
                        <td>${roles}</td>
                        <td>${email}</td>
                        <td>${phone}</td>
                        <td>
                            <a href="#!" data-employee-email="${email}">
                                <i class="copy-parent-emails-table-icon material-icons gray-text text-darken-4">email</i>
                            </a>
                        </td>
                    `;
      },
      employees || [],
      // onClick handler for copying email to clipboard
      async event => {
        const isCopy = event.target.classList.contains('copy-parent-emails-table-icon');
        if (!isCopy) {
          return;
        }
        event.preventDefault();
        
        // Get the email from the data attribute
        const linkElement = event.target.closest('a');
        const email = linkElement?.getAttribute('data-employee-email');
        
        if (email && email !== 'No email') {
          await this.#copyToClipboard(email);
        } else {
          M.toast({ html: 'No email available for this contact.' });
        }
      }
    );
  }
  /**
   * Sort employees for directory display, prioritizing admin roles at the top
   * @param {Array} employees - Array of employee objects
   * @returns {Array} Sorted employee array with admins first
   */
  #sortEmployeesForDirectory(employees) {
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
  // TODO duplicated (will be consolidated elsewhere)
  /**
   *
   */
  #updateSelectOptions(selectId, options, defaultOptionText, forceRefresh = false) {
    const select = document.getElementById(selectId);
    if (!select) {
      console.error(`Select element with ID "${selectId}" not found.`);
      return;
    }
    // get current selected option
    const currentSelectedValue = select.value;
    // Clear existing options
    select.innerHTML = '';
    // Create a default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = defaultOptionText;
    select.appendChild(defaultOption);
    // Populate new options
    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      if (!forceRefresh && currentSelectedValue && option.value == currentSelectedValue) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
    M.FormSelect.init(select, {
      classes: selectId,
      dropdownOptions: {
        alignment: 'left',
        coverTrigger: false,
        constrainWidth: false,
      },
    });
  }
  /**
   *
   */
  async #requestDeleteRegistrationAsync(registrationToDeleteId) {
    // confirm delete
    if (!confirm(`Are you sure you want to delete?`)) {
      return;
    }
    
    console.log('Delete registration called with ID:', registrationToDeleteId);
    console.log('ID type:', typeof registrationToDeleteId);
    
    if (!registrationToDeleteId) {
      console.error('No registration ID provided for deletion');
      M.toast({ html: 'Error: No registration ID provided for deletion.' });
      return;
    }
    
    try {
      this.#setAdminRegistrationLoading(true);
      const requestPayload = { registrationId: registrationToDeleteId };
      console.log('Sending delete request with payload:', requestPayload);
      
      const response = await HttpService.post(ServerFunctions.unregister, requestPayload);
      const registrationIndex = this.registrations.findIndex(x => 
        (x.id?.value || x.id) === registrationToDeleteId
      );
      M.toast({ html: 'Registration deleted successfully.' });
      this.registrations.splice(registrationIndex, 1);
      
      // Sort the registrations before updating the table to maintain sort order
      const sortedRegistrations = this.#sortRegistrations(this.registrations);
      this.masterScheduleTable.replaceRange(sortedRegistrations);
    } catch (error) {
      console.error('Error deleting registration:', error);
      M.toast({ html: 'Error deleting registration.' });
    } finally {
      this.#setAdminRegistrationLoading(false);
    }
  }
  /**
   *
   */
  async #copyToClipboard(text) {
    try {
      // Attempt to use the Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        M.toast({ html: `Copied '${text}' to clipboard.` });
        return;
      }
    } catch (error) {
      console.error('Failed to copy text to clipboard WITH MODERN API:', error);
    }
    try {
      // Fallback to execCommand for older browsers
      const tempInput = document.createElement('textarea');
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      M.toast({ html: `Copied '${text}' to clipboard.` });
    } catch (error) {
      console.error('Failed to copy text to clipboard WITH FALLBACK:', error);
      M.toast({ html: 'Failed to copy text to clipboard.' });
    }
  }
  /**
   *
   */
  adminEmployees() {
    const noah = this.admins.find(admin => admin.email === 'ndemosslevy@mcds.org'); // TODO migrate to data column
    return this.admins.map(x => {
      if (x === noah) {
        return {
          id: x.id,
          fullName: x.fullName,
          email: x.email,
          phone: '(415) 945-5121', // TODO migrate to data column
          roles: ['Forte Director'], // TODO migrate to data column
        };
      }
      return {
        id: x.id,
        fullName: x.fullName,
        email: 'forte@mcds.org', // TODO migrate to data column
        phone: '(415) 945-5122', // TODO migrate to data column
        roles: ['Forte Associate Manager'], // TODO migrate to data column
      };
    });
  }
  /**
   * Convert instructor to employee format for directory display
   * @param {object} instructor - Instructor object
   * @returns {object} Employee object for table display
   */
  instructorToEmployee(instructor) {
    return {
      id: instructor.id,
      fullName:
        instructor.fullName || `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim(),
      email: instructor.email,
      phone: instructor.phone || instructor.phoneNumber,
      roles: instructor.instruments || instructor.specialties || [],
    };
  }
  /**
   *
   */
  async #getStudents(forceRefresh = false) {
    // BYPASS INDEXEDDB: Always load students fresh from server
    console.log('Loading students fresh from server (IndexedDB bypassed)...');
    
    const students = await HttpService.fetchAllPages(ServerFunctions.getStudents, x =>
      Student.fromApiData(x)
    );
    console.log(`Fetched ${students.length} students from server.`);
    
    // Note: IndexedDB saving is bypassed to ensure fresh data on every load
    if (students.length === 0) {
      console.warn('No students found from server.');
    }
    return students;
  }
}

// For backwards compatibility with existing code
window.ViewModel = ViewModel;
