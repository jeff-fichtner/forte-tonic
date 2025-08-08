import { HttpService } from './data/httpService.js';
import { ServerFunctions, DataStores, Sections, RegistrationType } from './constants.js';
import { OperatorUserResponse } from '/models/shared/responses/operatorUserResponse.js';
import { AuthenticatedUserResponse } from '/models/shared/responses/authenticatedUserResponse.js';
import { Admin, Instructor, Student, Registration, Class, Room } from '/models/shared/index.js';
import { DomHelpers } from './utilities/domHelpers.js';
import { NavTabs } from './components/navTabs.js';
import { Table } from './components/table.js';
import { AdminRegistrationForm } from './workflows/adminRegistrationForm.js';
import { ParentRegistrationForm } from './workflows/parentRegistrationForm.js';
import { formatPhone } from './utilities/phoneHelpers.js';
import { formatGrade, formatTime } from './extensions/numberExtensions.js';

/**
 *
 */
export class ViewModel {
  // Private fields

  constructor() {
    // Initialize content initialization flags
    this.adminContentInitialized = false;
    this.instructorContentInitialized = false;
    this.parentContentInitialized = false;
  }

  async initializeAsync() {

    // Get operator user when page first loads
    const operatorUser = await HttpService.fetch(
      ServerFunctions.getOperatorUser,
      x => OperatorUserResponse.fromApiData(x)
    );

    console.log('Operator user loaded:', operatorUser);

    // Save user in user session
    window.UserSession.saveOperatorUser(operatorUser);

    // Show nav links only if operator user returned successfully
    // const nav = document.getElementById('nav-mobile');

    // TEMPORARILY COMMENTED OUT - Always keep nav section links hidden
    /*
    if (nav && (operatorUser || window.location.hostname === 'localhost')) {
      nav.hidden = false;
      console.log('✅ Nav links shown - operator user authenticated or localhost debug mode');
      console.log('Operator user:', operatorUser);
      
      // Temporary debug alert
      if (!operatorUser && window.location.hostname === 'localhost') {
        nav.style.border = '2px solid red'; // Visual indicator
        console.log('🔧 DEBUG: Navigation forced visible for localhost testing');
      }
    }
    */

    // If operator has seeded users (admin/instructor/parent), load the default user (admin first)
    // if (operatorUser && (operatorUser.admin || operatorUser.instructor || operatorUser.parent)) {
    //   console.log('Operator user has seeded users - loading user data');

    //   // Determine default role to click (admin -> instructor -> parent)
    //   let roleToClick = null;
    //   if (operatorUser.admin) {
    //     roleToClick = 'admin';
    //   } else if (operatorUser.instructor) {
    //     roleToClick = 'instructor';
    //   } else if (operatorUser.parent) {
    //     roleToClick = 'parent';
    //   }

    //   // Load user data with the operator user
    //   await this.loadUserData(operatorUser, roleToClick);
    // } else if (!operatorUser && window.location.hostname === 'localhost') {
    //   // Debug mode for localhost - create a mock operator user for testing
    //   console.log('🔧 Debug mode: Creating mock operator user for localhost testing');
    //   const mockOperatorUser = {
    //     email: 'debug@localhost',
    //     admin: { id: 'debug-admin', email: 'debug@localhost', isAdmin: () => true },
    //     instructor: { id: 'debug-instructor', email: 'debug@localhost', isInstructor: () => true },
    //     parent: { id: 'debug-parent', email: 'debug@localhost', isParent: () => true },
    //     isOperator: () => true,
    //     isAdmin: () => true,
    //     isInstructor: () => true,
    //     isParent: () => true
    //   };

    //   window.UserSession.saveOperatorUser(mockOperatorUser);
    //   await this.loadUserData(mockOperatorUser, 'admin');
    // } else {
    //   console.log('Operator user has no seeded users - page will do nothing');
    // }

    // Initialize login modal regardless
    this.#initLoginModal();

    // Check for stored access code and update login button
    this.#updateLoginButtonState();
    this.#showLoginButton();

    const storedCode = window.AccessCodeManager.getStoredAccessCode();
    if (storedCode) {
      await this.#attemptLoginWithCode(storedCode);
      return;
    }

    // open modal
    this.loginModal.open();

    this.#setPageLoading(false);

  }

  async loadUserData(user, roleToClick = null) {
    console.log('Loading user data for user:', user);

    // Only proceed if we have a valid user with backing data
    if (!user || (!user.admin && !user.instructor && !user.parent)) {
      console.log('No valid user with backing data - skipping data load');
      return;
    }

    // Show content area
    document.getElementById('page-content').hidden = false;

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

    // Store current user for access throughout the application
    this.currentUser = user;

    let defaultSection;
    if (user.admin && !this.adminContentInitialized) {
      console.log('🔧 Initializing admin content...');
      this.#initAdminContent();
      this.adminContentInitialized = true;
      defaultSection = Sections.ADMIN;
    }
    if (user.instructor && !this.instructorContentInitialized) {
      console.log('🔧 Initializing instructor content...');
      this.#initInstructorContent();
      this.instructorContentInitialized = true;
      defaultSection = Sections.INSTRUCTOR;
    }
    if (user.parent && !this.parentContentInitialized) {
      console.log('🔧 Initializing parent content...');
      console.log('  - Parent user:', user.parent);
      this.#initParentContent();
      this.parentContentInitialized = true;
      defaultSection = Sections.PARENT;
    }

    // For operator users, show all sections available; for authenticated users, use default section
    const isOperatorUser = user instanceof OperatorUserResponse || (user.isOperator && user.isOperator());
    const defaultSectionToUse = isOperatorUser ? null : defaultSection;
    this.navTabs = new NavTabs(defaultSectionToUse);
    this.#setPageLoading(false);

    // Auto-click the specified role tab if provided
    if (roleToClick) {
      const navLink = document.querySelector(`a[data-section="${roleToClick}"]`);
      if (navLink) {
        console.log(`🎯 Auto-clicking ${roleToClick} nav link for user`);
        navLink.click();
      } else {
        console.warn(`❌ Nav link not found for section: ${roleToClick}`);
      }
    }
  }
  /**
   *
   */
  #initAdminContent() {
    console.log('Initializing admin content...');

    // Show admin tabs
    const adminTabs = document.querySelectorAll('.tabs .tab.admin-tab');
    console.log(`Found ${adminTabs.length} admin tabs to show`);

    // First make sure the tabs container is visible
    const tabsContainer = document.querySelector('.tabs');
    if (tabsContainer) {
      tabsContainer.hidden = false;
    }

    // master schedule tab
    const sortedRegistrations = this.#sortRegistrations(this.registrations);
    console.log(`Building master schedule table with ${sortedRegistrations.length} registrations`);
    this.masterScheduleTable = this.#buildRegistrationTable(sortedRegistrations);
    console.log('Master schedule table built successfully');
    this.#populateFilterDropdowns();

    // registration form
    this.adminRegistrationForm = new AdminRegistrationForm(
      this.instructors,
      this.students,
      this.classes,
      async data => {
        const response = await HttpService.post(ServerFunctions.register, data);
        const newRegistration = Registration.fromApiData(response.data);

        // handle response
        M.toast({ html: 'Registration created successfully.' });
        this.registrations.push(newRegistration);
        this.masterScheduleTable.replaceRange(this.registrations);
      }
    );
    // weekly schedule
    // directory
    const mappedEmployees = this.adminEmployees().concat(
      this.instructors.map(instructor => this.instructorToEmployee(instructor))
    );
    // Sort employees to ensure admins appear at the top
    const sortedEmployees = this.#sortEmployeesForDirectory(mappedEmployees);
    this.employeeDirectoryTable = this.#buildDirectory('employee-directory-table', sortedEmployees);
  }
  /**
   *
   */
  #initInstructorContent() {
    // Get the current instructor's ID
    const currentInstructorId = this.currentUser.instructor?.id;

    if (!currentInstructorId) {
      console.warn('No instructor ID found for current user');
      return;
    }

    // Filter registrations to only show those for the current instructor
    const instructorRegistrations = this.registrations.filter(registration => {
      const registrationInstructorId = registration.instructorId?.value || registration.instructorId;
      return registrationInstructorId === currentInstructorId;
    });

    console.log(`Instructor ${currentInstructorId} has ${instructorRegistrations.length} registrations out of ${this.registrations.length} total`);

    // weekly schedule
    // unique days with registrations for this instructor, sorted by day of week
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const daysWithRegistrations = instructorRegistrations
      .map(registration => registration.day)
      .filter((day, index, self) => self.indexOf(day) === index)
      .sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

    const instructorWeeklyScheduleTables = document.getElementById(
      'instructor-weekly-schedule-tables'
    );

    // Clear existing content
    instructorWeeklyScheduleTables.innerHTML = '';

    // Show 'no matching registrations' message if instructor has no registrations
    if (instructorRegistrations.length === 0) {
      const noRegistrationsMessage = document.createElement('div');
      noRegistrationsMessage.className = 'card-panel orange lighten-4';
      noRegistrationsMessage.style.cssText = 'text-align: center; padding: 30px; margin: 20px 0;';
      noRegistrationsMessage.innerHTML = `
        <h5 style="color: #e65100; margin-bottom: 10px;">No Scheduled Lessons</h5>
        <p style="color: #bf360c; font-size: 16px; margin: 0;">
          You currently have no scheduled lessons.
        </p>
      `;
      instructorWeeklyScheduleTables.appendChild(noRegistrationsMessage);
    }

    // TODO future will allow redraw
    daysWithRegistrations.forEach((day, index) => {
      // Create a container for each day's table with padding
      const dayContainer = document.createElement('div');
      dayContainer.style.cssText = 'margin-bottom: 30px;'; // Add padding between tables

      // Add a day header for better organization
      const dayHeader = document.createElement('h5');
      dayHeader.textContent = day;
      dayHeader.style.cssText = 'color: #2b68a4; margin-bottom: 15px; margin-top: 20px; font-weight: bold;';
      dayContainer.appendChild(dayHeader);

      const tableId = `instructor-weekly-schedule-table-${day}`;
      const newTable = document.createElement('table');
      newTable.id = tableId;
      dayContainer.appendChild(newTable);

      instructorWeeklyScheduleTables.appendChild(dayContainer);

      // Sort registrations for this day by start time, length, instrument, and grade
      const dayRegistrations = instructorRegistrations
        .filter(x => x.day === day)
        .sort((a, b) => {
          // First, sort by start time
          const timeA = a.startTime || '';
          const timeB = b.startTime || '';
          if (timeA !== timeB) {
            return timeA.localeCompare(timeB);
          }

          // Then sort by length (duration)
          const lengthA = a.length || a.duration || 0;
          const lengthB = b.length || b.duration || 0;
          if (lengthA !== lengthB) {
            return lengthA - lengthB;
          }

          // Then sort by instrument/class
          const instrumentA = a.instrument || a.class?.name || '';
          const instrumentB = b.instrument || b.class?.name || '';
          if (instrumentA !== instrumentB) {
            return instrumentA.localeCompare(instrumentB);
          }

          // Finally sort by grade
          const gradeA = a.student?.grade || a.grade || '';
          const gradeB = b.student?.grade || b.grade || '';
          return gradeA.localeCompare(gradeB);
        });

      this.#buildWeeklySchedule(tableId, dayRegistrations);
    });
    
    const mappedEmployees = this.adminEmployees().concat(
      this.instructors.map(instructor => this.instructorToEmployee(instructor))
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
    console.log('🔧 Initializing parent content...');
    // weekly schedule
    // Get the current parent's ID
    const currentParentId = this.currentUser.parent?.id;

    if (!currentParentId) {
      console.warn('No parent ID found for current user');
      return;
    }

    // Filter registrations to only show those where the student is the parent's child
    console.log('🔍 Debug parent filtering:');
    console.log('  - currentParentId:', currentParentId);
    console.log('  - Total registrations:', this.registrations.length);
    
    const parentChildRegistrations = this.registrations.filter(registration => {
      const student = registration.student;
      if (!student) {
        console.log('  - Registration missing student:', registration.id);
        return false;
      }

      console.log('  - Checking student:', student.firstName, student.lastName);
      console.log('    - student.parent1Id:', student.parent1Id);
      console.log('    - student.parent2Id:', student.parent2Id);
      console.log('    - currentParentId:', currentParentId);

      // Check if the current parent is either parent1 or parent2 of the student
      const isMatch = student.parent1Id === currentParentId || student.parent2Id === currentParentId;
      console.log('    - Match result:', isMatch);
      return isMatch;
    });

    console.log('🔍 Filtered registrations count:', parentChildRegistrations.length);

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
    } else {

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
    }

    // registration
    // Initialize parent registration form with hybrid interface
    this.parentRegistrationForm = new ParentRegistrationForm(
      this.instructors,
      this.students,
      this.classes,
      async data => {
        const response = await HttpService.post(ServerFunctions.register, data);
        const newRegistration = Registration.fromApiData(response.data);

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
        .map(instructor => this.instructorToEmployee(instructor))
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

    loadingContainer.style.display = isLoading ? 'flex' : 'none';
    loadingContainer.hidden = !isLoading;

    // Only show page content if not loading, no error
    pageContent.hidden = isLoading || errorMessage;

    pageErrorContent.hidden = !errorMessage && !isLoading;
    if (pageErrorContentMessage) {
      pageErrorContentMessage.textContent = errorMessage;
    }
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
   * Create an instructor chip element
   * @param {string} name - The instructor name to display
   * @param {string|null} instructorId - The instructor ID (null for "All Instructors")
   * @param {number} slotCount - Number of available slots
   * @param {string} availability - 'available', 'limited', or 'unavailable'
   * @param {boolean} isActive - Whether this chip should be active by default
   * @returns {HTMLElement} The chip element
   */
  #createInstructorChip(name, instructorId, slotCount, availability, isActive) {
    const chip = document.createElement('div');
    chip.className = `chip instructor-chip ${availability}${isActive ? ' active' : ''}`;
    chip.dataset.instructorId = instructorId || 'all';

    // Set styles based on availability and active state
    let styles = 'padding: 8px 12px; border-radius: 16px; cursor: pointer; display: flex; align-items: center; transition: all 0.3s; border: 2px solid;';

    if (isActive) {
      styles += ' background: #2b68a4; color: white; border-color: #2b68a4;';
    } else {
      switch (availability) {
        case 'available':
          styles += ' background: #e8f5e8; border-color: #4caf50; color: #2e7d32;';
          break;
        case 'limited':
          styles += ' background: #fff3e0; border-color: #ff9800; color: #ef6c00;';
          break;
        case 'unavailable':
          styles += ' background: #ffebee; border-color: #f44336; color: #c62828; cursor: not-allowed; opacity: 0.6;';
          break;
      }
    }

    chip.style.cssText = styles;

    // Create slot count span with appropriate color
    let slotColor = '#ccc';
    if (!isActive) {
      switch (availability) {
        case 'available':
          slotColor = '#4caf50';
          break;
        case 'limited':
          slotColor = '#ff9800';
          break;
        case 'unavailable':
          slotColor = '#f44336';
          break;
      }
    }

    const slotText = instructorId ? ` (${slotCount} slots)` : ` (${slotCount} slots)`;
    chip.innerHTML = `${name} <span style="color: ${slotColor}; font-weight: bold; margin-left: 5px;">${slotText}</span>`;

    // Add click handler for chip selection (except for unavailable chips)
    if (availability !== 'unavailable') {
      chip.addEventListener('click', () => {
        this.#handleInstructorChipClick(chip, instructorId);
      });
    }

    return chip;
  }

  /**
   * Handle instructor chip click events
   * @param {HTMLElement} clickedChip - The chip that was clicked
   * @param {string|null} instructorId - The instructor ID (null for "All Instructors")
   */
  #handleInstructorChipClick(clickedChip, instructorId) {
    // Remove active class from all instructor chips
    const allChips = document.querySelectorAll('.instructor-chip');
    allChips.forEach(chip => {
      chip.classList.remove('active');
      // Reset background color based on availability
      if (chip.classList.contains('available')) {
        chip.style.background = '#e8f5e8';
        chip.style.borderColor = '#4caf50';
        chip.style.color = '#2e7d32';
      } else if (chip.classList.contains('limited')) {
        chip.style.background = '#fff3e0';
        chip.style.borderColor = '#ff9800';
        chip.style.color = '#ef6c00';
      }
    });

    // Add active class to clicked chip
    clickedChip.classList.add('active');
    clickedChip.style.background = '#2b68a4';
    clickedChip.style.borderColor = '#2b68a4';
    clickedChip.style.color = 'white';

    // Filter time slots based on selected instructor
    console.log(`Instructor filter selected: ${instructorId || 'all'}`);

    // TODO: Implement time slot filtering logic here
    // This would update the time slot grid to show only slots for the selected instructor
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
        const student = this.students.find(x => {
          const studentId = x.id?.value || x.id;
          return studentId === studentIdToFind;
        });

        if (!instructor || !student) {
          console.warn(`Instructor or student not found for registration: ${registration.id}`);
          console.warn(`Looking for instructorId: ${instructorIdToFind}, studentId: ${studentIdToFind}`);
          console.warn('Available instructor IDs:', this.instructors.map(i => i.id).slice(0, 5));
          console.warn('Available student IDs:', this.students.map(s => s.id?.value || s.id).slice(0, 5));
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
        if (!currentRegistration) return; if (isCopy) {
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
        
        return `
                        <td>${fullName}</td>
                        <td>${roles}</td>
                        <td>${email}</td>
                        <td>${employee.phone}</td>
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

      // Check if they are instructors (admin priority = 999 means not an admin)
      const aIsInstructor = priorityA === 999;
      const bIsInstructor = priorityB === 999;

      // Both are instructors - sort by last name, then first name
      if (aIsInstructor && bIsInstructor) {
        const lastNameComparison = (a.lastName || '').localeCompare(b.lastName || '');
        if (lastNameComparison !== 0) return lastNameComparison;
        return (a.firstName || '').localeCompare(b.firstName || '');
      }

      // Neither are instructors (both are admins) - use existing priority system
      if (!aIsInstructor && !bIsInstructor) {
        // If both are admins or both are non-admins, sort alphabetically by name
        if (priorityA === priorityB) {
          const nameA = a.fullName || '';
          const nameB = b.fullName || '';
          return nameA.localeCompare(nameB);
        }

        // Otherwise, sort by admin priority (lower number first)
        return priorityA - priorityB;
      }

      // Mixed types: admins come before instructors
      return aIsInstructor ? 1 : -1;
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
    // Get instruments from either specialties or instruments field
    const instruments = instructor.specialties || instructor.instruments || [];
    const instrumentsText = instruments.length > 0 ? instruments.join(', ') : 'Instructor';
    
    // Format phone number using the formatPhone function
    const rawPhone = instructor.phone || instructor.phoneNumber || '';
    const formattedPhone = rawPhone ? formatPhone(rawPhone) : '';

    return {
      id: instructor.id,
      fullName:
        instructor.fullName || `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim(),
      email: instructor.email,
      phone: formattedPhone,
      role: instrumentsText, // Keep for comparison in sorting
      roles: [instrumentsText], // This is what the directory table displays - make it an array for sorting compatibility
      lastName: instructor.lastName || '', // Add lastName for sorting
      firstName: instructor.firstName || '', // Add firstName for sorting
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

  /**
   * Initialize the login modal functionality
   */
  #initLoginModal() {
    // Initialize MaterializeCSS modal
    const modalElement = document.getElementById('login-modal');
    if (!modalElement) {
      console.warn('Login modal not found');
      return;
    }

    // Initialize modal
    this.loginModal = M.Modal.init(modalElement, {
      dismissible: true,
      opacity: 0.5,
      inDuration: 300,
      outDuration: 200
    });

    // Get modal elements
    const accessCodeInput = document.getElementById('modal-access-code');
    const loginButton = document.getElementById('login-submit-btn');

    if (!accessCodeInput || !loginButton) {
      console.warn('Login modal elements not found');
      return;
    }

    // Only allow numeric input
    accessCodeInput.addEventListener('input', (e) => {
      // Remove any non-numeric characters
      const numericValue = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = numericValue;

      // Update MaterializeCSS validation classes
      if (numericValue.length >= 4 && numericValue.length <= 6) {
        e.target.classList.add('valid');
        e.target.classList.remove('invalid');
      } else {
        e.target.classList.add('invalid');
        e.target.classList.remove('valid');
      }
    });

    // Handle enter key press in input
    accessCodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter'
        // and modal is open
        && this.loginModal.isOpen
      ) {
        e.preventDefault();
        this.#handleLogin();
      }
    });

    // Handle login button click
    loginButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.#handleLogin();
    });

    // Clear input when modal opens
    modalElement.addEventListener('modal-open', () => {
      accessCodeInput.value = '';
      accessCodeInput.classList.remove('valid', 'invalid');
      accessCodeInput.focus();
    });

    console.log('Login modal initialized successfully');
  }

  /**
   * Update login button state based on stored access code
   */
  #updateLoginButtonState() {
    const loginButton = document.querySelector('a[href="#login-modal"]');
    if (!loginButton) {
      console.warn('Login button not found');
      return;
    }

    // Check if there's a stored access code or if we have an operator user
    const storedCode = window.AccessCodeManager.getStoredAccessCode();
    const operatorUser = window.UserSession?.getOperatorUser();

    if (storedCode || operatorUser && (operatorUser.admin || operatorUser.instructor || operatorUser.parent)) {
      // Change button text to "Change User" if access code exists or operator is available
      const buttonTextNode = loginButton.childNodes[loginButton.childNodes.length - 1];
      if (buttonTextNode && buttonTextNode.nodeType === Node.TEXT_NODE) {
        buttonTextNode.textContent = 'Change User';
      }
      console.log('Login button updated to "Change User" - stored access code or operator user found');
    } else {
      // Ensure button text is "Login" if no stored code and no operator
      const buttonTextNode = loginButton.childNodes[loginButton.childNodes.length - 1];
      if (buttonTextNode && buttonTextNode.nodeType === Node.TEXT_NODE) {
        buttonTextNode.textContent = 'Login';
      }
      console.log('Login button set to "Login" - no stored access code or operator user');
    }
  }

  /**
   * Handle login form submission
   */
  async #handleLogin() {
    const accessCodeInput = document.getElementById('modal-access-code');
    const accessCode = accessCodeInput.value.trim();

    // Validate access code
    if (accessCode.length < 4 || accessCode.length > 6) {
      M.toast({
        html: 'Access code must be 4-6 digits',
        classes: 'red darken-1',
        displayLength: 3000
      });
      accessCodeInput.focus();
      return;
    }

    await this.#attemptLoginWithCode(
      accessCode,
      () => {
        // Handle successful login
        this.loginModal.close();
        accessCodeInput.value = ''; // Clear the input

      },
      () => {
        accessCodeInput.focus();
      }
    );
  }

  async #attemptLoginWithCode(accessCode, onSuccessfulLogin = null, onFailedLogin = null) {

    console.log('Login attempt with access code:', accessCode);

    try {
      this.#setPageLoading(true);

      // Send access code to backend
      const authenticatedUser = await HttpService.post(ServerFunctions.authenticateByAccessCode, { accessCode });

      // Check if authentication was successful (non-null response)
      const loginSuccess = authenticatedUser !== null;

      if (loginSuccess) {
        // Save the access code securely in the browser
        window.AccessCodeManager.saveAccessCodeSecurely(accessCode);

        // Update login button state to show "Change User"
        this.#updateLoginButtonState();

        console.log('Login successful, access code saved securely');

        onSuccessfulLogin?.();

        // Load user data with the authenticated user
        console.log('Loading user data for authenticated user:', authenticatedUser);

        // Determine default role to click (admin -> instructor -> parent)
        let roleToClick = null;
        if (authenticatedUser.admin) {
          roleToClick = 'admin';

          // For admin users, we'll explicitly show admin tabs and click the first one
          console.log('Authenticated user is an admin - will show admin tabs');
        } else if (authenticatedUser.instructor) {
          roleToClick = 'instructor';
        } else if (authenticatedUser.parent) {
          roleToClick = 'parent';
        }

        // Load user data and navigate to the appropriate section
        await this.loadUserData(authenticatedUser, roleToClick);
      } else {
        M.toast({ html: 'Invalid access code', classes: 'red darken-1', displayLength: 3000 });
        onFailedLogin?.();
      }
    } catch (error) {
      console.error('Login error:', error);
      M.toast({ html: 'Login failed. Please try again.', classes: 'red darken-1', displayLength: 4000 });
      onFailedLogin?.();
    } finally {
      this.#setPageLoading(false);
    }
  }

  /**
   * Save access code securely in the browser
   * @param {string} accessCode - The access code to save
   */
  // Method moved to AccessCodeManager

  /**
   * Generate a unique session ID
   * @returns {string} A unique session identifier
   */
  // Method moved to AccessCodeManager

  /**
   * Retrieve the securely stored access code
   * @returns {string|null} The stored access code or null if not found/expired
   */
  // Method moved to AccessCodeManager

  /**
   * Clear the stored access code (for logout)
   */
  // Method moved to AccessCodeManager

  /**
   * Public method to clear stored access code (for logout functionality)
   */
  clearUserSession() {
    window.AccessCodeManager.clearStoredAccessCode();
    this.#resetInitializationFlags();
    this.#updateLoginButtonState();
    M.toast({ html: 'User session cleared', classes: 'blue darken-1', displayLength: 2000 });
  }

  /**
   * Reset all initialization flags (useful for testing or when switching users)
   */
  #resetInitializationFlags() {
    this.adminContentInitialized = false;
    this.instructorContentInitialized = false;
    this.parentContentInitialized = false;
  }

  /**
   * Show the login button after operator request completes
   */
  #showLoginButton() {
    console.log('🔍 Showing login button');

    try {
      const loginButtonContainer = document.getElementById('login-button-container');
      if (loginButtonContainer) {
        loginButtonContainer.hidden = false;
        console.log('✅ Login button shown successfully');
      } else {
        console.log('⚠️ Login button container element not found');
      }
    } catch (error) {
      console.error('❌ Error showing login button:', error);
    }
  }

  /**
   * Show admin tabs and click the first one
   */
  #showAdminTabsAndSelectFirst() {
    console.log('🔍 Showing admin tabs and selecting the first one');

    try {
      // Show tabs container first
      const tabsContainer = document.querySelector('.tabs');
      if (tabsContainer) {
        tabsContainer.hidden = false;
        console.log('✅ Tabs container shown');
      }

      // Show all admin tabs
      const adminTabs = document.querySelectorAll('.tabs .tab.admin-tab');
      console.log(`Found ${adminTabs.length} admin tabs to show`);

      if (adminTabs.length > 0) {
        adminTabs.forEach(tab => {
          tab.hidden = false;
          console.log(`Showing admin tab:`, tab);
        });

        // Get the first admin tab and click it
        const firstAdminTab = adminTabs[0];
        const firstAdminTabLink = firstAdminTab.querySelector('a');

        if (firstAdminTabLink) {
          console.log(`Clicking first admin tab: ${firstAdminTabLink.getAttribute('href')}`);

          // Hide all tab content first
          const allTabContent = document.querySelectorAll('.tab-content');
          allTabContent.forEach(content => {
            content.hidden = true;
          });

          // Show the target tab content
          const targetContent = document.querySelector(firstAdminTabLink.getAttribute('href'));
          if (targetContent) {
            targetContent.hidden = false;
            console.log(`Showing tab content: ${targetContent.id}`);
          }

          // Add active class to the first tab
          const allTabLinks = document.querySelectorAll('.tabs .tab a');
          allTabLinks.forEach(link => {
            link.classList.remove('active');
          });
          firstAdminTabLink.classList.add('active');

          // Ensure master schedule table is visible if it exists
          const masterScheduleTable = document.getElementById('master-schedule-table');
          if (masterScheduleTable) {
            masterScheduleTable.hidden = false;
          }
        }

        console.log('✅ Admin tabs shown and first tab selected');
      } else {
        console.warn('❌ No admin tabs found');
      }
    } catch (error) {
      console.error('Error showing admin tabs:', error);
    }
  }
}

// For backwards compatibility with existing code
window.ViewModel = ViewModel;
