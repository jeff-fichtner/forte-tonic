import { HttpService } from './data/httpService.js';
import { ServerFunctions, DataStores, Sections, RegistrationType } from './constants.js';
import { AuthenticatedUserResponse } from '/models/shared/responses/authenticatedUserResponse.js';
import { Admin, Instructor, Student, Registration, Class, Room } from '/models/shared/index.js';
import { IndexedDbClient } from './data/indexedDbClient.js';
import { DomHelpers } from './utilities/domHelpers.js';
import { NavTabs } from './components/navTabs.js';
import { Table } from './components/table.js';
import { AdminRegistrationForm } from './workflows/adminRegistrationForm.js';

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
    console.log(`Authenticated user: ${JSON.stringify(authenticatedUser)}`);
    this.dbClient = new IndexedDbClient('forte', [DataStores.STUDENTS]);
    await this.dbClient.init();
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
        registration.student = this.students.find(x => x.id?.value === registration.studentId.value);
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
      console.log('Initializing admin content...');
      this.#initAdminContent();
      defaultSection = Sections.ADMIN;
    }
    if (authenticatedUser.shouldShowAsOperator || authenticatedUser.instructor) {
      console.log('Initializing instructor content...');
      this.#initInstructorContent();
      defaultSection = Sections.INSTRUCTOR;
    }
    if (authenticatedUser.shouldShowAsOperator || authenticatedUser.parent) {
      console.log('Initializing parent content...');
      this.#initParentContent();
      defaultSection = Sections.PARENT;
    }
    const defaultSectionToUse = !authenticatedUser.shouldShowAsOperator ? defaultSection : null;
    console.log(`Default section to use: ${defaultSectionToUse}`);
    this.navTabs = new NavTabs(defaultSectionToUse);
    this.#setPageLoading(false);
  }
  /**
   *
   */
  #initAdminContent() {
    // master schedule tab
    this.masterScheduleTable = this.#buildRegistrationTable(this.registrations);
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
        console.log('Registration created:', newRegistration);
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
    this.employeeDirectoryTable = this.#buildDirectory('employee-directory-table', mappedEmployees);
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
    // this may be set in admin section if user is operator
    this.employeeDirectoryTable ??= this.#buildDirectory(
      'employee-directory-table',
      mappedEmployees
    );
  }
  /**
   *
   */
  #initParentContent() {
    // weekly schedule
    // students with registrations
    const studentsWithRegistrations = this.registrations
      .map(registration => registration.student)
      .filter((student, index, self) => self.findIndex(s => s.id === student.id) === index);
    const parentWeeklyScheduleTables = document.getElementById('parent-weekly-schedule-tables');

    // TODO future will allow redraw
    studentsWithRegistrations.forEach(student => {
      const tableId = `instructor-weekly-schedule-table-${student.id}`;
      const newTable = document.createElement('table');
      newTable.id = tableId;
      parentWeeklyScheduleTables.appendChild(newTable);
      this.#buildWeeklySchedule(
        tableId,
        this.registrations.filter(x => x.studentId.value === student.id)
      );
    });
    // registration
    // directory
    const mappedEmployees = this.adminEmployees().concat(
      this.instructors
        .filter(instructor =>
          this.registrations.some(registration => registration.instructorId.value === instructor.id)
        )
        .map(this.instructorToEmployee)
    );
    this.parentDirectoryTable = this.#buildDirectory('parent-directory-table', mappedEmployees);
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
        // Debug the registration and ID extraction
        console.log('=== REGISTRATION DEBUG ===');
        console.log('Registration ID:', registration.id);
        console.log('Raw instructorId:', registration.instructorId);
        console.log('Raw studentId:', registration.studentId);
        
        // Extract primitive values for comparison
        const instructorIdToFind = registration.instructorId?.value || registration.instructorId;
        const studentIdToFind = registration.studentId?.value || registration.studentId;
        
        console.log('Extracted instructorIdToFind:', instructorIdToFind, typeof instructorIdToFind);
        console.log('Extracted studentIdToFind:', studentIdToFind, typeof studentIdToFind);
        console.log('Available instructor IDs:', this.instructors.map(i => i.id));
        console.log('Available student IDs (values):', this.students.map(s => s.id?.value || s.id));
        
        // Compare instructor ID (string) with instructor.id (string)
        const instructor = this.instructors.find(x => x.id === instructorIdToFind);
        
        // Compare student ID (string) with student.id.value (StudentId object's value)
        const student = this.students.find(x => x.id?.value === studentIdToFind);
        
        console.log('Found instructor:', instructor ? `${instructor.firstName} ${instructor.lastName}` : 'NOT FOUND');
        console.log('Found student:', student ? `${student.firstName} ${student.lastName}` : 'NOT FOUND');
        console.log('=== END DEBUG ===');
        
        if (!instructor || !student) {
          console.warn(`Instructor or student not found for registration: ${registration.id}`);
          return '';
        }
        return `
                        <td>${registration.day}</td>
                        <td>${registration.lessonTime?.startTime || 'N/A'}</td>
                        <td>${registration.lessonTime?.durationMinutes || 'N/A'} min</td>
                        <td>${student.firstName} ${student.lastName}</td>
                        <td>${student.grade || 'N/A'}</td>
                        <td>${instructor.firstName} ${instructor.lastName}</td>
                        <td>${registration.registrationType === RegistrationType.GROUP ? (registration.className || 'N/A') : (registration.instrument || 'N/A')}</td>
                        <td>
                            <a href="#!">
                                <i class="material-icons copy-parent-emails-table-icon gray-text text-darken-4">email</i>
                            </a>
                        </td>
                        <td>
                            <a href="#!">
                                <i class="material-icons remove-registration-table-icon red-text text-darken-4">delete</i>
                            </a>
                        </td>
                    `;
      },
      defaultRegistrations,
      // on click
      async event => {
        const isCopy = event.target.classList.contains('copy-parent-emails-table-icon');
        const isDelete = event.target.classList.contains('delete-registration-table-icon');
        if (!isCopy && !isDelete) {
          return;
        }
        event.preventDefault();
        const row = event.target.closest('tr');
        const registrationIndex = Array.from(row.parentNode.children).indexOf(row);
        const currentRegistration = this.registrations[registrationIndex];
        if (!currentRegistration) return;
        if (isCopy) {
          const parentEmails = currentRegistration.student.parentEmails;
          await this.#copyToClipboard(parentEmails);
          return;
        }
        if (isDelete) {
          await this.#requestDeleteRegistrationAsync(currentRegistration.id);
          return;
        }
      },
      // filter
      registration => {
        // // get selected checkboxes within days-of-week-filter-container
        // const daysOfWeekCheckboxes = document.querySelectorAll('#days-of-week-filter-container input[type="checkbox"]');
        // const selectedDays = Array.from(daysOfWeekCheckboxes)
        //     .filter(checkbox => checkbox.checked)
        //     .map(checkbox => checkbox.id);
        // // get selected checkboxes within grade-filter-container
        // const gradeCheckboxes = document.querySelectorAll('#grade-filter-container input[type="checkbox"]');
        // const selectedGrades = Array.from(gradeCheckboxes)
        //     .filter(checkbox => checkbox.checked)
        //     .map(checkbox => checkbox.id * 1);
        // // filter by selected days otherwise all
        // if (selectedDays.length > 0 && !selectedDays.includes(registration.day)) {
        //     return false;
        // }
        // // filter by selected grades otherwise all
        // if (selectedGrades.length > 0 && !selectedGrades.includes(registration.student.grade)) {
        //     return false;
        // }
        return true;
      },
      [
        // {
        //     filterId: 'days-of-week-filter-container',
        //     type: 'checkbox'
        // },
        // {
        //     filterId: 'grade-filter-container',
        //     type: 'checkbox'
        // }
      ]
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
        const instructor = this.instructors.find(x => x.id === enrollment.instructorId.value);
        const student = this.students.find(x => x.id?.value === enrollment.studentId.value);
        if (!instructor || !student) {
          console.warn(`Instructor or student not found for enrollment: ${enrollment.id}`);
          return '';
        }
        return `
                        <td>${enrollment.day}</td>
                        <td>${enrollment.lessonTime?.startTime || 'N/A'}</td>
                        <td>${enrollment.lessonTime?.durationMinutes || 'N/A'} minutes</td>
                        <td>${student.firstName} ${student.lastName}</td>
                        <td>${student.grade || 'N/A'}</td>
                        <td>${instructor.firstName} ${instructor.lastName}</td>
                        <td>${enrollment.instrument || 'N/A'}</td>
                    `;
      },
      enrollments
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
                            <a href="#!">
                                <i class="copy-parent-emails-table-icon material-icons gray-text text-darken-4">email</i>
                            </a>
                        </td>
                    `;
      },
      employees || []
    );
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
    try {
      this.#setAdminRegistrationLoading(true);
      const response = await HttpService.post(ServerFunctions.unregister, {
        id: registrationToDeleteId,
      });
      const registrationIndex = this.registrations.findIndex(x => x.id === registrationToDeleteId);
      M.toast({ html: 'Registration deleted successfully.' });
      this.registrations.splice(registrationIndex, 1);
      this.masterScheduleTable.replaceRange(this.registrations);
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
    // load students from indexeddb
    if (!forceRefresh && (await this.dbClient.hasItems(DataStores.STUDENTS))) {
      console.log('Loading students from IndexedDB...');
      const items = await this.dbClient.getAll(DataStores.STUDENTS, x => Student.fromApiData(x));
      if (!items || items.length === 0) {
        console.warn('No students found in IndexedDB.');
      } else {
        console.log(`Loaded ${items.length} students from IndexedDB.`);
      }
      return items;
    }
    const students = await HttpService.fetchAllPages(ServerFunctions.getStudents, x =>
      Student.fromApiData(x)
    );
    console.log(`Fetched ${students.length} students from server.`);
    if (students.length > 0) {
      // save students to indexeddb
      console.log('Saving students to IndexedDB...');
      await this.dbClient.insertRange(DataStores.STUDENTS, students);
    } else {
      console.warn('No students found from server.');
    }
    return students;
  }
}

// For backwards compatibility with existing code
window.ViewModel = ViewModel;
