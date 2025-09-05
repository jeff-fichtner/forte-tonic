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
import { ClassManager } from './utilities/classManager.js';

/**
 * Format a datetime value for display in tables
 * @param {string|Date|number} timestamp - The timestamp to format
 * @returns {string} Formatted datetime string
 */
function formatDateTime(timestamp) {
  if (!timestamp) return 'N/A';
  
  try {
    let date;
    
    // Handle different input types
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      // Handle ISO strings or other date strings
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      // Handle Google Sheets serial dates or Unix timestamps
      if (timestamp > 1 && timestamp < 100000) {
        // Likely a Google Sheets serial date (days since 1899-12-30)
        const googleEpoch = new Date(1899, 11, 30); // Month is 0-indexed
        const msPerDay = 24 * 60 * 60 * 1000;
        date = new Date(googleEpoch.getTime() + timestamp * msPerDay);
      } else {
        // Assume Unix timestamp (milliseconds or seconds)
        date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
      }
    } else {
      // Try to convert to string and parse
      date = new Date(String(timestamp));
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'Invalid Date';
    }
    
    // Format as "Aug 10 - 8:11 PM"
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const time = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    
    return `${month} ${day} - ${time}`;
  } catch (error) {
    console.warn('Error formatting timestamp:', timestamp, error);
    return 'Invalid Date';
  }
}

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

    // Update ClassManager with Rock Band class IDs from server configuration
    if (operatorUser && operatorUser.configuration && operatorUser.configuration.rockBandClassIds) {
      ClassManager.updateRockBandClassIds(operatorUser.configuration.rockBandClassIds);
      console.log('Updated ClassManager with Rock Band class IDs:', operatorUser.configuration.rockBandClassIds);
    }

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

    // Initialize all modals
    this.#initializeAllModals();

    // Check for stored access code and update login button
    this.#updateLoginButtonState();
    this.#showLoginButton();

    const storedAuthData = window.AccessCodeManager.getStoredAuthData();
    if (storedAuthData) {
      await this.#attemptLoginWithCode(storedAuthData.accessCode, storedAuthData.loginType);
      return;
    }

    this.#setPageLoading(false);

    // check if the user has ever arrived at the site before
    const hasAcceptedTermsOfService = window.UserSession.hasAcceptedTermsOfService();
    if (!hasAcceptedTermsOfService) {
      // show terms of service
      this.#showTermsOfService(() => {
        // After terms are accepted, open the login modal
        this.loginModal.open();
      });
      return;
    }

    // open modal
    this.loginModal.open();
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

    console.log('📊 Starting data loading process...');
    const loadingStartTime = performance.now();

    const [_, admins, instructors, students, registrations, classes, rooms] = await Promise.all([
      DomHelpers.waitForDocumentReadyAsync(),
      HttpService.fetch(ServerFunctions.getAdmins, x => x.map(y => Admin.fromApiData(y))),
      HttpService.fetch(ServerFunctions.getInstructors, x => x.map(y => Instructor.fromApiData(y))),
      this.#getStudents(),
      HttpService.fetchAllPages(ServerFunctions.getRegistrations, x => Registration.fromApiData(x)),
      HttpService.fetch(ServerFunctions.getClasses, x => x.map(y => Class.fromApiData(y))),
      HttpService.fetch(ServerFunctions.getRooms, x => x.map(y => Room.fromApiData(y))),
    ]);

    const loadingEndTime = performance.now();
    console.log(`📊 Data loading completed in ${(loadingEndTime - loadingStartTime).toFixed(2)}ms`);

    // Log data counts
    console.log('📊 Data summary:');
    console.log(`  - Admins: ${admins.length}`);
    console.log(`  - Instructors: ${instructors.length}`);
    console.log(`  - Students: ${students.length}`);
    console.log(`  - Registrations: ${registrations.length}`);
    console.log(`  - Classes: ${classes.length}`);
    console.log(`  - Rooms: ${rooms.length}`);

    // Log instructor details
    console.log('👩‍🏫 Instructor IDs and details:');
    instructors.forEach((instructor, index) => {
      const id = instructor.id?.value || instructor.id;
      console.log(`  ${index + 1}. ID: "${id}" (${typeof id}) - ${instructor.firstName} ${instructor.lastName} (${instructor.email})`);
    });

    // Log student details (first 10 for brevity)
    console.log(`👩‍🎓 Student IDs and details (showing first 10 of ${students.length}):`);
    students.slice(0, 10).forEach((student, index) => {
      const id = student.id?.value || student.id;
      console.log(`  ${index + 1}. ID: "${id}" (${typeof id}) - ${student.firstName} ${student.lastName}`);
    });

    M.AutoInit();

    this.admins = admins;
    this.instructors = instructors;
    this.students = students;

    console.log('🔗 Starting registration matching process...');
    const matchingStartTime = performance.now();

    // Track matching statistics
    let studentsMatched = 0;
    let studentsNotMatched = 0;
    let instructorsMatched = 0;
    let instructorsNotMatched = 0;
    const unmatchedStudentIds = [];
    const unmatchedInstructorIds = [];

    this.registrations = registrations.map((registration, index) => {
      if (index < 5) {
        console.log(`🔍 Processing registration ${index + 1}/${registrations.length}:`, {
          id: registration.id?.value || registration.id,
          studentId: registration.studentId?.value || registration.studentId,
          instructorId: registration.instructorId?.value || registration.instructorId,
          day: registration.day,
          startTime: registration.startTime
        });
      }

      // ensure student is populated
      if (!registration.student) {
        registration.student = this.students.find(x => {
          const studentId = x.id?.value || x.id;
          const registrationStudentId = registration.studentId?.value || registration.studentId;
          return studentId === registrationStudentId;
        });

        // Log detailed matching info for students
        if (!registration.student) {
          studentsNotMatched++;
          const regStudentId = registration.studentId?.value || registration.studentId;
          unmatchedStudentIds.push(regStudentId);

          if (index < 5) {
            console.warn(`❌ Student not found for registration ${registration.id} with studentId "${regStudentId}" (${typeof regStudentId})`);
            console.warn(`   Available student IDs:`, students.map(s => `"${s.id?.value || s.id}" (${typeof (s.id?.value || s.id)})`).slice(0, 5));
          }
        } else {
          studentsMatched++;
          if (index < 5) {
            console.log(`✅ Student matched: ${registration.student.firstName} ${registration.student.lastName}`);
          }
        }
      }

      // ensure instructor is populated
      if (!registration.instructor) {
        registration.instructor = this.instructors.find(x => {
          const instructorId = x.id?.value || x.id;
          const registrationInstructorId = registration.instructorId?.value || registration.instructorId;
          return instructorId === registrationInstructorId;
        });

        // Log detailed matching info for instructors
        if (!registration.instructor) {
          instructorsNotMatched++;
          const regInstructorId = registration.instructorId?.value || registration.instructorId;
          unmatchedInstructorIds.push(regInstructorId);

          if (index < 5) {
            console.warn(`❌ Instructor not found for registration ${registration.id} with instructorId "${regInstructorId}" (${typeof regInstructorId})`);
            console.warn(`   Available instructor IDs:`, instructors.map(i => `"${i.id?.value || i.id}" (${typeof (i.id?.value || i.id)})`));
          }
        } else {
          instructorsMatched++;
          if (index < 5) {
            console.log(`✅ Instructor matched: ${registration.instructor.firstName} ${registration.instructor.lastName}`);
          }
        }
      }
      return registration;
    });

    const matchingEndTime = performance.now();
    console.log(`🔗 Registration matching completed in ${(matchingEndTime - matchingStartTime).toFixed(2)}ms`);

    // Log matching statistics
    console.log('📈 Matching statistics:');
    console.log(`  Students: ${studentsMatched} matched, ${studentsNotMatched} not matched`);
    console.log(`  Instructors: ${instructorsMatched} matched, ${instructorsNotMatched} not matched`);

    if (unmatchedStudentIds.length > 0) {
      console.log(`⚠️ Unmatched student IDs (first 10):`, unmatchedStudentIds.slice(0, 10));
    }

    if (unmatchedInstructorIds.length > 0) {
      console.log(`⚠️ Unmatched instructor IDs (first 10):`, unmatchedInstructorIds.slice(0, 10));
    }

    // Log registration counts per student
    const studentRegistrationCounts = {};
    this.registrations.forEach(reg => {
      if (reg.student) {
        const studentId = reg.student.id?.value || reg.student.id;
        studentRegistrationCounts[studentId] = (studentRegistrationCounts[studentId] || 0) + 1;
      }
    });

    console.log('📊 Registration counts per student (top 10):');
    const sortedStudentCounts = Object.entries(studentRegistrationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    sortedStudentCounts.forEach(([studentId, count]) => {
      const student = this.students.find(s => (s.id?.value || s.id) === studentId);
      const studentName = student ? `${student.firstName} ${student.lastName}` : 'Unknown';
      console.log(`  ${studentName}: ${count} registrations`);
    });

    // Log registration counts per instructor
    const instructorRegistrationCounts = {};
    this.registrations.forEach(reg => {
      if (reg.instructor) {
        const instructorId = reg.instructor.id?.value || reg.instructor.id;
        instructorRegistrationCounts[instructorId] = (instructorRegistrationCounts[instructorId] || 0) + 1;
      }
    });

    console.log('📊 Registration counts per instructor:');
    Object.entries(instructorRegistrationCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([instructorId, count]) => {
        const instructor = this.instructors.find(i => (i.id?.value || i.id) === instructorId);
        const instructorName = instructor ? `${instructor.firstName} ${instructor.lastName}` : 'Unknown';
        console.log(`  ${instructorName}: ${count} registrations`);
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

    // Reset UI state after data load to prevent scroll lock issues
    setTimeout(() => {
      this.#resetUIState();
    }, 300); // Allow time for content to render and nav click to complete
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

    // master schedule tab - exclude wait list classes from master schedule
    const nonWaitlistRegistrations = this.registrations.filter(registration => {
      return !ClassManager.isRockBandClass(registration.classId);
    });
    const sortedRegistrations = this.#sortRegistrations(nonWaitlistRegistrations);
    console.log(`Building master schedule table with ${sortedRegistrations.length} registrations (excluding wait list classes)`);
    this.masterScheduleTable = this.#buildRegistrationTable(sortedRegistrations);
    console.log('Master schedule table built successfully');
    this.#populateFilterDropdowns();

    // wait list tab - filter registrations with Rock Band class IDs (configured via environment)
    const waitListRegistrations = this.registrations.filter(registration => {
      return ClassManager.isRockBandClass(registration.classId);
    });
    console.log(`Building wait list table with ${waitListRegistrations.length} registrations (Rock Band classes)`);
    this.adminWaitListTable = this.#buildWaitListTable(waitListRegistrations);
    console.log('Wait list table built successfully');

    // registration form
    this.adminRegistrationForm = new AdminRegistrationForm(
      this.instructors,
      this.students,
      this.classes,
      async data => {
        // Use shared method for registration creation with enrichment
        await this.#createRegistrationWithEnrichment(data);
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
    console.log('👩‍🏫 Initializing instructor content...');

    // Get the current instructor's ID
    const currentInstructorId = this.currentUser.instructor?.id;

    if (!currentInstructorId) {
      console.warn('❌ No instructor ID found for current user');
      console.warn('Current user structure:', this.currentUser);
      return;
    }

    console.log(`🔍 Current instructor ID: "${currentInstructorId}" (${typeof currentInstructorId})`);

    // Filter registrations to only show those for the current instructor
    console.log('🔍 Filtering registrations for instructor...');
    const filteringStartTime = performance.now();

    const instructorRegistrations = this.registrations.filter(registration => {
      const registrationInstructorId = registration.instructorId?.value || registration.instructorId;
      const isMatch = registrationInstructorId === currentInstructorId;

      return isMatch;
    });

    const filteringEndTime = performance.now();
    console.log(`🔍 Instructor filtering completed in ${(filteringEndTime - filteringStartTime).toFixed(2)}ms`);

    console.log(`📊 Instructor ${currentInstructorId} has ${instructorRegistrations.length} registrations out of ${this.registrations.length} total`);

    // Log some sample instructor registrations
    if (instructorRegistrations.length > 0) {
      console.log('📝 Sample instructor registrations:');
      instructorRegistrations.slice(0, 5).forEach((registration, index) => {
        console.log(`  ${index + 1}. ${registration.student?.firstName || 'Unknown'} ${registration.student?.lastName || 'Student'} - ${registration.day} ${registration.startTime} (${registration.instrument || registration.classTitle || 'Unknown'})`);
      });
      if (instructorRegistrations.length > 5) {
        console.log(`  ... and ${instructorRegistrations.length - 5} more registrations`);
      }
    }

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
    console.log('🔍 Current user structure:', this.currentUser);

    // weekly schedule
    // Get the current parent's ID
    const currentParentId = this.currentUser.parent?.id;

    if (!currentParentId) {
      console.warn('No parent ID found for current user');
      console.log('Available parent data:', this.currentUser.parent);
      return;
    }

    console.log('🔍 Debug parent filtering:');
    console.log('  - currentParentId:', currentParentId);
    console.log('  - currentParentId type:', typeof currentParentId);
    console.log('  - Total registrations:', this.registrations.length);

    // Log the first few registrations and their student data
    console.log('📋 Sample registrations and student data:');
    this.registrations.slice(0, 5).forEach((registration, index) => {
      console.log(`  Registration ${index + 1}/${this.registrations.length}:`, {
        id: registration.id,
        studentId: registration.studentId,
        hasStudent: !!registration.student,
        studentData: registration.student ? {
          id: registration.student.id,
          name: `${registration.student.firstName} ${registration.student.lastName}`,
          parent1Id: registration.student.parent1Id,
          parent2Id: registration.student.parent2Id,
          parent1IdType: typeof registration.student.parent1Id,
          parent2IdType: typeof registration.student.parent2Id
        } : 'No student attached'
      });
    });

    // Track parent matching statistics
    let parentMatchingStartTime = performance.now();
    let exactMatches = 0;
    let stringMatches = 0;
    let noMatches = 0;
    let missingStudents = 0;

    const parentChildRegistrations = this.registrations.filter(registration => {
      const student = registration.student;
      if (!student) {
        missingStudents++;
        console.log('  ❌ Registration missing student:', registration.id);
        return false;
      }

      if (noMatches + exactMatches + stringMatches < 10) { // Log first 10 for brevity
        console.log(`  🔍 Checking student: ${student.firstName} ${student.lastName}`);
        console.log(`    - student.parent1Id: "${student.parent1Id}" (${typeof student.parent1Id})`);
        console.log(`    - student.parent2Id: "${student.parent2Id}" (${typeof student.parent2Id})`);
        console.log(`    - currentParentId: "${currentParentId}" (${typeof currentParentId})`);
      }

      // Check if the current parent is either parent1 or parent2 of the student
      const exactMatch = student.parent1Id === currentParentId || student.parent2Id === currentParentId;

      // Also try string comparison in case of type mismatches
      const stringMatch = !exactMatch && (
        String(student.parent1Id) === String(currentParentId) ||
        String(student.parent2Id) === String(currentParentId)
      );

      const isMatch = exactMatch || stringMatch;

      // Exclude Rock Band classes (wait list classes) from parent weekly schedule
      const isWaitlistClass = ClassManager.isRockBandClass(registration.classId);

      if (noMatches + exactMatches + stringMatches < 10) { // Log first 10 for brevity
        console.log(`    - Exact match result: ${exactMatch}`);
        console.log(`    - String match result: ${stringMatch}`);
        console.log(`    - Is waitlist class: ${isWaitlistClass}`);
        console.log(`    - Final match: ${isMatch && !isWaitlistClass}`);
      }

      if (exactMatch) {
        exactMatches++;
      } else if (stringMatch) {
        stringMatches++;
      } else {
        noMatches++;
      }

      return isMatch && !isWaitlistClass;
    });

    let parentMatchingEndTime = performance.now();

    console.log(`🔍 Parent filtering completed in ${(parentMatchingEndTime - parentMatchingStartTime).toFixed(2)}ms`);
    console.log('📊 Parent matching statistics:');
    console.log(`  - Exact matches: ${exactMatches}`);
    console.log(`  - String matches: ${stringMatches}`);
    console.log(`  - No matches: ${noMatches}`);
    console.log(`  - Missing students: ${missingStudents}`);
    console.log(`  - Total parent-child registrations found (excluding wait list classes): ${parentChildRegistrations.length}`);

    // Log details about the matched registrations
    if (parentChildRegistrations.length > 0) {
      console.log('📝 Parent-child registrations details:');
      parentChildRegistrations.slice(0, 5).forEach((registration, index) => {
        console.log(`  ${index + 1}. ${registration.student.firstName} ${registration.student.lastName} - ${registration.day} ${registration.startTime} (${registration.instrument || registration.classTitle})`);
      });
      if (parentChildRegistrations.length > 5) {
        console.log(`  ... and ${parentChildRegistrations.length - 5} more registrations`);
      }
    }

    // Get unique students with registrations (their own children only)
    const studentsWithRegistrations = parentChildRegistrations
      .map(registration => registration.student)
      .filter(student => student && student.id) // Filter out undefined students and students without IDs
      .filter((student, index, self) => self.findIndex(s => s.id === student.id) === index);

    // Get ALL children of this parent (not just those with registrations) for the registration form
    console.log('🔍 Finding ALL children for parent registration form...');
    const allParentChildren = this.students.filter(student => {
      if (!student) return false;
      
      const isChild = student.parent1Id === currentParentId || 
                     student.parent2Id === currentParentId ||
                     String(student.parent1Id) === String(currentParentId) ||
                     String(student.parent2Id) === String(currentParentId);
      
      if (isChild) {
        console.log(`  ✅ Found child: ${student.firstName} ${student.lastName} (ID: ${student.id})`);
      }
      
      return isChild;
    });
    
    console.log(`📊 Parent has ${allParentChildren.length} total children, ${studentsWithRegistrations.length} with registrations`);

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

        // Filter registrations for this student and sort by day, then start time
        console.log(`📅 Processing schedule for ${student.firstName} ${student.lastName}:`);
        const studentRegistrations = parentChildRegistrations.filter(x => x.studentId.value === student.id.value);
        console.log(`  - Found ${studentRegistrations.length} registrations for this student`);

        if (studentRegistrations.length > 0) {
          console.log('  - Sample registrations before sorting:');
          studentRegistrations.slice(0, 3).forEach((reg, index) => {
            console.log(`    ${index + 1}. ${reg.day} ${reg.startTime} - ${reg.instrument || reg.classTitle}`);
          });
        }

        const sortedStudentRegistrations = this.#sortRegistrations(studentRegistrations);

        if (sortedStudentRegistrations.length > 0) {
          console.log('  - Sample registrations after sorting:');
          sortedStudentRegistrations.slice(0, 3).forEach((reg, index) => {
            console.log(`    ${index + 1}. ${reg.day} ${reg.startTime} - ${reg.instrument || reg.classTitle}`);
          });
        }

        this.#buildWeeklySchedule(
          tableId,
          sortedStudentRegistrations
        );
      });
    }

    // Parent wait list table - Show wait list registrations for this parent's children
    console.log('🔍 Building parent wait list table...');
    
    // Filter for wait list registrations belonging to this parent's children
    const parentWaitListRegistrations = this.registrations.filter(registration => {
      const student = registration.student;
      if (!student) {
        return false;
      }

      // Check if the current parent is either parent1 or parent2 of the student
      const exactMatch = student.parent1Id === currentParentId || student.parent2Id === currentParentId;

      // Also try string comparison in case of type mismatches
      const stringMatch = !exactMatch && (
        String(student.parent1Id) === String(currentParentId) ||
        String(student.parent2Id) === String(currentParentId)
      );

      const isMatch = exactMatch || stringMatch;

      // Include only Rock Band classes (wait list classes)
      const isWaitlistClass = ClassManager.isRockBandClass(registration.classId);

      return isMatch && isWaitlistClass;
    });

    console.log(`📊 Found ${parentWaitListRegistrations.length} wait list registrations for parent's children`);

    // Show/hide the parent wait list table based on whether there are wait list registrations
    const parentWaitListTable = document.getElementById('parent-wait-list-table');
    if (parentWaitListRegistrations.length > 0) {
      // Create a title container for the wait list table
      const waitListContainer = parentWaitListTable.parentElement;
      if (waitListContainer) {
        // Remove any existing wait list title
        const existingTitle = waitListContainer.querySelector('.parent-wait-list-title');
        if (existingTitle) {
          existingTitle.remove();
        }
        
        // Create and add the wait list title
        const waitListTitle = document.createElement('h5');
        waitListTitle.className = 'parent-wait-list-title';
        waitListTitle.style.cssText = 'color: #2b68a4; margin-bottom: 15px; border-bottom: 2px solid #2b68a4; padding-bottom: 10px; margin-top: 20px;';
        waitListTitle.textContent = 'Rock Band Wait List';
        
        // Insert the title before the table
        waitListContainer.insertBefore(waitListTitle, parentWaitListTable);
      }
      
      // Build and show the wait list table
      this.parentWaitListTable = this.#buildParentWaitListTable(parentWaitListRegistrations, currentParentId);
      
      // Make the table visible
      if (parentWaitListTable) {
        parentWaitListTable.removeAttribute('hidden');
      }
      
      console.log('✅ Parent wait list table built and made visible');
    } else {
      // Hide the wait list table if no wait list registrations
      if (parentWaitListTable) {
        parentWaitListTable.setAttribute('hidden', '');
        
        // Also remove the title if it exists
        const waitListContainer = parentWaitListTable.parentElement;
        if (waitListContainer) {
          const existingTitle = waitListContainer.querySelector('.parent-wait-list-title');
          if (existingTitle) {
            existingTitle.remove();
          }
        }
      }
      
      console.log('⚠️ No wait list registrations found - hiding parent wait list table');
    }

    // registration
    // Initialize parent registration form with hybrid interface only if it doesn't exist
    // Use ALL parent's children, not just those with existing registrations
    if (!this.parentRegistrationForm) {
      this.parentRegistrationForm = new ParentRegistrationForm(
        this.instructors,
        this.students,
        this.classes,
        this.registrations, // Pass existing registrations for availability calculation
        async data => {
          // Use shared method for registration creation with enrichment
          await this.#createRegistrationWithEnrichment(data);
        },
        allParentChildren // Pass ALL parent's children, not just those with registrations
      );
    } else {
      // Update existing form with latest data instead of recreating it
      this.parentRegistrationForm.updateData(
        this.instructors,
        this.students,
        this.classes,
        this.registrations,
        allParentChildren
      );
    }

    // directory - show only instructors where parent has students with registrations
    // Filter to only show instructors who are teaching this parent's children
    const parentChildrenIds = allParentChildren.map(child => child.id?.value || child.id);
    const parentRegistrations = this.registrations.filter(registration => {
      const studentId = typeof registration.studentId === 'object' ? 
        registration.studentId.value : registration.studentId;
      return parentChildrenIds.includes(studentId);
    });
    
    // Get unique instructor IDs from parent's registrations
    const parentInstructorIds = [...new Set(parentRegistrations.map(registration => {
      return typeof registration.instructorId === 'object' ? 
        registration.instructorId.value : registration.instructorId;
    }).filter(Boolean))];
    
    console.log(`🎯 Parent has registrations with ${parentInstructorIds.length} instructors:`, parentInstructorIds);
    
    // Filter instructors to only include those teaching this parent's children
    const relevantInstructors = this.instructors.filter(instructor => 
      parentInstructorIds.includes(instructor.id)
    );
    
    const mappedEmployees = this.adminEmployees().concat(
      relevantInstructors.map(instructor => this.instructorToEmployee(instructor, true))
    );
    // Sort employees to ensure admins appear at the top
    const sortedEmployees = this.#sortEmployeesForDirectory(mappedEmployees);
    this.parentDirectoryTable = this.#buildDirectory('parent-directory-table', sortedEmployees);
  }

  /**
   * Refresh all relevant tables after a new registration is created
   * This ensures all views stay synchronized when new data is added
   */
  #refreshTablesAfterRegistration() {
    // Always update the master schedule table if it exists (for admin view)
    if (this.masterScheduleTable) {
      console.log('Refreshing master schedule table with updated registrations');
      const nonWaitlistRegistrations = this.registrations.filter(registration => {
        return !ClassManager.isRockBandClass(registration.classId);
      });
      const sortedRegistrations = this.#sortRegistrations(nonWaitlistRegistrations);
      this.masterScheduleTable.replaceRange(sortedRegistrations);
    }

    // Always update the wait list table if it exists (for admin view)
    if (this.adminWaitListTable) {
      console.log('Refreshing wait list table with updated registrations');
      const waitListRegistrations = this.registrations.filter(registration => {
        return ClassManager.isRockBandClass(registration.classId);
      });
      this.adminWaitListTable.replaceRange(waitListRegistrations);
    }

    // Update parent wait list table if it exists (for parent view)
    if (this.parentWaitListTable && this.currentUser?.parent) {
      console.log('Refreshing parent wait list table with updated registrations');
      const currentParentId = this.currentUser.parent?.id;
      
      if (currentParentId) {
        // Filter for wait list registrations belonging to this parent's children
        const parentWaitListRegistrations = this.registrations.filter(registration => {
          const student = registration.student;
          if (!student) {
            return false;
          }

          // Check if the current parent is either parent1 or parent2 of the student
          const exactMatch = student.parent1Id === currentParentId || student.parent2Id === currentParentId;

          // Also try string comparison in case of type mismatches
          const stringMatch = !exactMatch && (
            String(student.parent1Id) === String(currentParentId) ||
            String(student.parent2Id) === String(currentParentId)
          );

          const isMatch = exactMatch || stringMatch;

          // Include only Rock Band classes (wait list classes)
          const isWaitlistClass = ClassManager.isRockBandClass(registration.classId);

          return isMatch && isWaitlistClass;
        });

        this.parentWaitListTable.replaceRange(parentWaitListRegistrations);
        
        // Show/hide the table based on whether there are wait list registrations
        const parentWaitListTableElement = document.getElementById('parent-wait-list-table');
        if (parentWaitListRegistrations.length > 0) {
          if (parentWaitListTableElement) {
            parentWaitListTableElement.removeAttribute('hidden');
            
            // Ensure the title is present
            const waitListContainer = parentWaitListTableElement.parentElement;
            if (waitListContainer && !waitListContainer.querySelector('.parent-wait-list-title')) {
              const waitListTitle = document.createElement('h5');
              waitListTitle.className = 'parent-wait-list-title';
              waitListTitle.style.cssText = 'color: #2b68a4; margin-bottom: 15px; border-bottom: 2px solid #2b68a4; padding-bottom: 10px; margin-top: 20px;';
              waitListTitle.textContent = 'Rock Band Wait List';
              waitListContainer.insertBefore(waitListTitle, parentWaitListTableElement);
            }
          }
        } else {
          if (parentWaitListTableElement) {
            parentWaitListTableElement.setAttribute('hidden', '');
            
            // Remove the title if it exists
            const waitListContainer = parentWaitListTableElement.parentElement;
            if (waitListContainer) {
              const existingTitle = waitListContainer.querySelector('.parent-wait-list-title');
              if (existingTitle) {
                existingTitle.remove();
              }
            }
          }
        }
      }
    }

    // Update instructor weekly schedules if current user is an instructor
    if (this.currentUser?.instructor && this.instructorContentInitialized) {
      console.log('Refreshing instructor weekly schedule');
      this.#initInstructorContent();
    }

    // Update parent weekly schedules if current user is a parent
    if (this.currentUser?.parent && this.parentContentInitialized) {
      console.log('Refreshing parent weekly schedule');
      this.#initParentContent();
    }
  }

  /**
   * Shared method to create registration with proper enrichment
   * This method handles the API call and enriches the response with instructor and student objects
   */
  async #createRegistrationWithEnrichment(data) {
    const response = await HttpService.post(ServerFunctions.register, data);
    const newRegistration = Registration.fromApiData(response.data);

    // Enrich the registration with instructor and student objects (same logic as initial data loading)
    if (!newRegistration.student) {
      newRegistration.student = this.students.find(x => {
        const studentId = x.id?.value || x.id;
        const registrationStudentId = newRegistration.studentId?.value || newRegistration.studentId;
        return studentId === registrationStudentId;
      });

      if (!newRegistration.student) {
        console.warn(`❌ Student not found for new registration with studentId "${newRegistration.studentId?.value || newRegistration.studentId}"`);
      } else {
        console.log(`✅ Student enriched: ${newRegistration.student.firstName} ${newRegistration.student.lastName}`);
      }
    }

    if (!newRegistration.instructor) {
      newRegistration.instructor = this.instructors.find(x => {
        const instructorId = x.id?.value || x.id;
        const registrationInstructorId = newRegistration.instructorId?.value || newRegistration.instructorId;
        return instructorId === registrationInstructorId;
      });

      if (!newRegistration.instructor) {
        console.warn(`❌ Instructor not found for new registration with instructorId "${newRegistration.instructorId?.value || newRegistration.instructorId}"`);
      } else {
        console.log(`✅ Instructor enriched: ${newRegistration.instructor.firstName} ${newRegistration.instructor.lastName}`);
      }
    }

    // Add to registrations and refresh tables
    this.registrations.push(newRegistration);
    this.#refreshTablesAfterRegistration();

    return newRegistration;
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

    // Only show error content when there's actually an error message
    pageErrorContent.hidden = !errorMessage;
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
  #buildRegistrationTable(registrations) {
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
                            <a href="#" data-registration-id="${registration.id?.value || registration.id}">
                                <i class="material-icons copy-parent-emails-table-icon gray-text text-darken-4">email</i>
                            </a>
                        </td>
                        <td>
                            <a href="#" data-registration-id="${registration.id?.value || registration.id}">
                                <i class="material-icons remove-registration-table-icon red-text text-darken-4">delete</i>
                            </a>
                        </td>
                    `;
      },
      registrations,
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
   * Build wait list table for registrations with Rock Band class IDs (configured via environment)
   */
  #buildWaitListTable(registrations) {
    return new Table(
      'admin-wait-list-table',
      [
        'Student',
        'Grade',
        'Class Title',
        'Timestamp',
        'Contact',
        'Remove',
      ],
      // row
      registration => {
        // Extract primitive values for comparison
        const studentIdToFind = registration.studentId?.value || registration.studentId;

        // Find student
        const student = this.students.find(x => {
          const studentId = x.id?.value || x.id;
          return studentId === studentIdToFind;
        });

        if (!student) {
          console.warn(`Student not found for registration: ${registration.id}`);
          console.warn(`Looking for studentId: ${studentIdToFind}`);
          return '';
        }
        
        return `
                        <td>${student.firstName} ${student.lastName}</td>
                        <td>${formatGrade(student.grade) || 'N/A'}</td>
                        <td>${registration.classTitle || 'N/A'}</td>
                        <td>${formatDateTime(registration.createdAt) || 'N/A'}</td>
                        <td>
                            <a href="#" data-registration-id="${registration.id?.value || registration.id}">
                                <i class="material-icons copy-parent-emails-table-icon gray-text text-darken-4">email</i>
                            </a>
                        </td>
                        <td>
                            <a href="#" data-registration-id="${registration.id?.value || registration.id}">
                                <i class="material-icons remove-registration-table-icon red-text text-darken-4">delete</i>
                            </a>
                        </td>
                    `;
      },
      registrations,
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
        if (!currentRegistration) return;

        if (isCopy) {
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
      // filter function - no filtering for wait list
      registration => true,
      // no filter change handlers needed for wait list
      [],
      {
        pagination: true,
        itemsPerPage: 50,
        pageSizeOptions: [25, 50, 100],
        rowClassFunction: registration => {
          // All wait list items are group registrations with special styling
          return 'registration-row-waitlist';
        }
      }
    );
  }

  /**
   * Build parent wait list table for the current parent's children
   */
  #buildParentWaitListTable(registrations, currentParentId) {
    return new Table(
      'parent-wait-list-table',
      [
        'Student',
        'Grade',
        'Class Title',
      ],
      // row
      registration => {
        // Extract primitive values for comparison
        const studentIdToFind = registration.studentId?.value || registration.studentId;

        // Find student
        const student = this.students.find(x => {
          const studentId = x.id?.value || x.id;
          return studentId === studentIdToFind;
        });

        if (!student) {
          console.warn(`Student not found for registration: ${registration.id}`);
          console.warn(`Looking for studentId: ${studentIdToFind}`);
          return '';
        }
        
        return `
                        <td>${student.firstName} ${student.lastName}</td>
                        <td>${formatGrade(student.grade) || 'N/A'}</td>
                        <td>${registration.classTitle || 'N/A'}</td>
                    `;
      },
      registrations,
      // on click
      async event => {
        const isCopy = event.target.classList.contains('copy-parent-emails-table-icon');
        if (!isCopy) {
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
        if (!currentRegistration) return;

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
      },
      // filter function - no filtering for parent wait list
      registration => true,
      // no filter change handlers needed for parent wait list
      [],
      {
        rowClassFunction: registration => {
          // All wait list items are group registrations with special styling
          return 'registration-row-waitlist';
        }
      }
    );
  }

  /**
   *
   */
  #buildWeeklySchedule(tableId, enrollments) {
    console.log(`🏗️ Building weekly schedule table "${tableId}" with ${enrollments.length} enrollments`);

    let matchingSuccesses = 0;
    let matchingFailures = 0;

    return new Table(
      tableId,
      ['Weekday', 'Start Time', 'Length', 'Student', 'Grade', 'Instructor', 'Instrument/Class', 'Contact'],
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
          matchingFailures++;
          const enrollmentId = enrollment.id?.value || enrollment.id;
          const enrollmentInstructorId = enrollment.instructorId?.value || enrollment.instructorId;
          const enrollmentStudentId = enrollment.studentId?.value || enrollment.studentId;

          console.warn(`❌ Instructor or student not found for enrollment: ${enrollmentId}`);
          console.warn(`   Looking for instructorId: "${enrollmentInstructorId}" (${typeof enrollmentInstructorId}), studentId: "${enrollmentStudentId}" (${typeof enrollmentStudentId})`);

          if (!instructor) {
            console.warn(`   ❌ Instructor not found. Available instructor IDs:`, this.instructors.map(i => `"${i.id?.value || i.id}" (${typeof (i.id?.value || i.id)})`).slice(0, 10));
          }

          if (!student) {
            console.warn(`   ❌ Student not found. Available student IDs:`, this.students.map(s => `"${s.id?.value || s.id}" (${typeof (s.id?.value || s.id)})`).slice(0, 10));
          }

          // Return empty string to skip this enrollment rather than crashing
          return '';
        } else {
          matchingSuccesses++;
        }

        return `
                        <td>${enrollment.day}</td>
                        <td>${formatTime(enrollment.startTime) || 'N/A'}</td>
                        <td>${enrollment.length || 'N/A'} min</td>
                        <td>${student.firstName} ${student.lastName}</td>
                        <td>${formatGrade(student.grade) || 'N/A'}</td>
                        <td>${instructor.firstName} ${instructor.lastName}</td>
                        <td>${enrollment.registrationType === RegistrationType.GROUP ? (enrollment.classTitle || enrollment.className || 'N/A') : (enrollment.instrument || 'N/A')}</td>
                        <td>
                            <a href="#" data-registration-id="${enrollment.id?.value || enrollment.id}">
                                <i class="material-icons copy-parent-emails-table-icon gray-text text-darken-4">email</i>
                            </a>
                        </td>
                    `;
      },
      enrollments,
      // on click
      async event => {
        const isCopy = event.target.classList.contains('copy-parent-emails-table-icon');
        if (!isCopy) {
          return;
        }
        event.preventDefault();

        // Get the registration ID from the data attribute
        const linkElement = event.target.closest('a');
        const registrationId = linkElement?.getAttribute('data-registration-id');
        if (!registrationId) return;

        // Find the enrollment by ID in the enrollments array
        const currentEnrollment = enrollments.find(e =>
          (e.id?.value || e.id) === registrationId
        );
        if (!currentEnrollment) return;

        // Get the student ID from the current enrollment
        const studentIdToFind = currentEnrollment.studentId?.value || currentEnrollment.studentId;

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
      },
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

    console.log(`✅ Weekly schedule table "${tableId}" built: ${matchingSuccesses} successful matches, ${matchingFailures} failures`);
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
  // TODO: This method has been partially migrated to DomHelpers.resetMaterializeSelect()
  // Consider consolidating all select operations to use the shared utilities
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
    // Confirm delete
    if (!confirm('Are you sure you want to delete this registration?')) {
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
      
      const requestPayload = { 
        registrationId: registrationToDeleteId
      };
      console.log('Sending delete request with payload:', requestPayload);

      const response = await HttpService.post(ServerFunctions.unregister, requestPayload);
      const registrationIndex = this.registrations.findIndex(x =>
        (x.id?.value || x.id) === registrationToDeleteId
      );
      M.toast({ html: 'Registration deleted successfully.' });
      this.registrations.splice(registrationIndex, 1);

      // Refresh all relevant tables after deletion
      this.#refreshTablesAfterRegistration();
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
  instructorToEmployee(instructor, obscurePhone = false) {
    // Get instruments from either specialties or instruments field
    const instruments = instructor.specialties || instructor.instruments || [];
    const instrumentsText = instruments.length > 0 ? instruments.join(', ') : 'Instructor';

    // Format phone number using the formatPhone function
    const rawPhone = instructor.phone || instructor.phoneNumber || '';
    const formattedPhone = (rawPhone && !obscurePhone) ? formatPhone(rawPhone) : '';

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
    console.log('👩‍🎓 Loading students fresh from server (IndexedDB bypassed)...');
    const studentsStartTime = performance.now();

    const students = await HttpService.fetchAllPages(ServerFunctions.getStudents, x =>
      Student.fromApiData(x)
    );

    const studentsEndTime = performance.now();
    console.log(`👩‍🎓 Fetched ${students.length} students from server in ${(studentsEndTime - studentsStartTime).toFixed(2)}ms`);

    // Log sample student data structure
    if (students.length > 0) {
      console.log('👩‍🎓 Sample student data structure:');
      const sampleStudent = students[0];
      console.log('  Sample student:', {
        id: sampleStudent.id,
        idType: typeof sampleStudent.id,
        name: `${sampleStudent.firstName} ${sampleStudent.lastName}`,
        grade: sampleStudent.grade,
        parent1Id: sampleStudent.parent1Id,
        parent1IdType: typeof sampleStudent.parent1Id,
        parent2Id: sampleStudent.parent2Id,
        parent2IdType: typeof sampleStudent.parent2Id,
        parentEmails: sampleStudent.parentEmails
      });

      // Log ID distribution analysis
      const idTypes = {};
      const parent1IdTypes = {};
      const parent2IdTypes = {};

      students.forEach(student => {
        const idType = typeof (student.id?.value || student.id);
        const parent1IdType = typeof student.parent1Id;
        const parent2IdType = typeof student.parent2Id;

        idTypes[idType] = (idTypes[idType] || 0) + 1;
        parent1IdTypes[parent1IdType] = (parent1IdTypes[parent1IdType] || 0) + 1;
        parent2IdTypes[parent2IdType] = (parent2IdTypes[parent2IdType] || 0) + 1;
      });

      console.log('👩‍🎓 Student ID type distribution:', idTypes);
      console.log('👩‍🎓 Parent1 ID type distribution:', parent1IdTypes);
      console.log('👩‍🎓 Parent2 ID type distribution:', parent2IdTypes);
    }

    // Note: IndexedDB saving is bypassed to ensure fresh data on every load
    if (students.length === 0) {
      console.warn('⚠️ No students found from server.');
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

    // Make available globally for backward compatibility
    window.loginModal = modalElement;
    window.loginModalInstance = this.loginModal;

    // Get modal elements
    const parentTab = document.getElementById('parent-login-tab');
    const employeeTab = document.getElementById('employee-login-tab');
    const parentSection = document.getElementById('parent-login-section');
    const employeeSection = document.getElementById('employee-login-section');
    const parentPhoneInput = document.getElementById('parent-phone-input');
    const employeeCodeInput = document.getElementById('employee-access-code');
    const loginButton = document.getElementById('login-submit-btn');

    if (!parentTab || !employeeTab || !parentSection || !employeeSection || 
        !parentPhoneInput || !employeeCodeInput || !loginButton) {
      console.warn('Login modal elements not found');
      return;
    }

    // Track current login type
    this.currentLoginType = 'parent';

    // Initialize login type switching
    this.#initLoginTypeSwitching(parentTab, employeeTab, parentSection, employeeSection);

    // Initialize parent phone input
    this.#initParentPhoneInput(parentPhoneInput, loginButton);

    // Initialize employee access code input
    this.#initEmployeeCodeInput(employeeCodeInput, loginButton);

    // Handle login button click
    loginButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.#handleLogin();
    });

    // Clear inputs when modal opens - use proper Materialize events
    modalElement.addEventListener('modal:opened', () => {
      console.log('Modal opened - resetting login modal');
      this.#resetLoginModal(parentPhoneInput, employeeCodeInput, loginButton);
      setTimeout(() => {
        this.#focusCurrentInput();
        // Ensure validation runs after reset
        this.#validateCurrentInput();
      }, 100); // Small delay to ensure modal is fully rendered
    });

    // Reset state when modal closes
    modalElement.addEventListener('modal:closed', () => {
      console.log('Modal closed - resetting login modal');
      this.#resetLoginModal(parentPhoneInput, employeeCodeInput, loginButton);
    });

    // Attach keyboard handlers
    ModalKeyboardHandler.attachKeyboardHandlers(modalElement, {
      allowEscape: true,
      allowEnter: true,
      onConfirm: (event) => {
        console.log('Login modal: Enter key pressed');
        if (!loginButton.disabled) {
          this.#handleLogin();
        }
      },
      onCancel: (event) => {
        console.log('Login modal: ESC key pressed');
        this.loginModal.close();
      }
    });

    console.log('Login modal initialized successfully');
  }

  /**
   * Initialize login type switching functionality
   */
  #initLoginTypeSwitching(parentTab, employeeTab, parentSection, employeeSection) {
    // Parent tab click handler
    parentTab.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.currentLoginType !== 'parent') {
        this.currentLoginType = 'parent';
        
        // Update tab appearance
        parentTab.classList.remove('inactive-login-type');
        parentTab.classList.add('active-login-type');
        employeeTab.classList.remove('active-login-type');
        employeeTab.classList.add('inactive-login-type');
        
        // Show/hide sections
        parentSection.style.display = 'block';
        parentSection.classList.remove('inactive-section');
        parentSection.classList.add('active-section');
        employeeSection.style.display = 'none';
        employeeSection.classList.remove('active-section');
        employeeSection.classList.add('inactive-section');
        
        // Reset validation and focus
        this.#validateCurrentInput();
        this.#focusCurrentInput();
      }
    });

    // Employee tab click handler
    employeeTab.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.currentLoginType !== 'employee') {
        this.currentLoginType = 'employee';
        
        // Update tab appearance
        employeeTab.classList.remove('inactive-login-type');
        employeeTab.classList.add('active-login-type');
        parentTab.classList.remove('active-login-type');
        parentTab.classList.add('inactive-login-type');
        
        // Show/hide sections
        employeeSection.style.display = 'block';
        employeeSection.classList.remove('inactive-section');
        employeeSection.classList.add('active-section');
        parentSection.style.display = 'none';
        parentSection.classList.remove('active-section');
        parentSection.classList.add('inactive-section');
        
        // Reset validation and focus
        this.#validateCurrentInput();
        this.#focusCurrentInput();
      }
    });
  }

  /**
   * Initialize parent phone input with formatting and validation
   */
  #initParentPhoneInput(phoneInput, loginButton) {
    phoneInput.addEventListener('input', (e) => {
      // Format phone number as user types
      if (typeof window.formatPhoneAsTyped === 'function') {
        const formattedValue = window.formatPhoneAsTyped(e.target.value);
        e.target.value = formattedValue;
      } else {
        // Fallback formatting - basic cleanup
        const digits = e.target.value.replace(/\D/g, '').substring(0, 10);
        if (digits.length <= 3) {
          e.target.value = digits;
        } else if (digits.length <= 6) {
          e.target.value = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        } else {
          e.target.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
      }
      
      if (this.currentLoginType === 'parent') {
        this.#validateCurrentInput();
      }
    });

    // Handle focus events to ensure validation runs
    phoneInput.addEventListener('focus', (e) => {
      console.log('Phone input focused');
      if (this.currentLoginType === 'parent') {
        setTimeout(() => {
          this.#validateCurrentInput();
        }, 50);
      }
    });

    // Handle paste events
    phoneInput.addEventListener('paste', (e) => {
      setTimeout(() => {
        if (typeof window.formatPhoneAsTyped === 'function') {
          const formattedValue = window.formatPhoneAsTyped(e.target.value);
          e.target.value = formattedValue;
        }
        if (this.currentLoginType === 'parent') {
          this.#validateCurrentInput();
        }
      }, 0);
    });
  }

  /**
   * Initialize employee access code input with validation
   */
  #initEmployeeCodeInput(codeInput, loginButton) {
    codeInput.addEventListener('input', (e) => {
      // Only allow numeric input, max 6 digits
      const numericValue = e.target.value.replace(/[^0-9]/g, '').substring(0, 6);
      e.target.value = numericValue;
      
      if (this.currentLoginType === 'employee') {
        this.#validateCurrentInput();
      }
    });

    // Handle focus events to ensure validation runs
    codeInput.addEventListener('focus', (e) => {
      console.log('Code input focused');
      if (this.currentLoginType === 'employee') {
        setTimeout(() => {
          this.#validateCurrentInput();
        }, 50);
      }
    });
  }

  /**
   * Validate the current active input and update button state
   */
  #validateCurrentInput() {
    const loginButton = document.getElementById('login-submit-btn');
    let isValid = false;

    if (this.currentLoginType === 'parent') {
      const phoneInput = document.getElementById('parent-phone-input');
      const phoneValue = phoneInput.value;
      
      // Check if phone validation function is available
      if (typeof window.isValidPhoneNumber === 'function') {
        isValid = window.isValidPhoneNumber(phoneValue);
        console.log('Phone validation:', phoneValue, '->', isValid);
      } else {
        // Fallback validation - just check for 10 digits
        const digits = phoneValue.replace(/\D/g, '');
        isValid = digits.length === 10 && digits !== '0000000000';
        console.warn('Phone validation function not available, using fallback:', phoneValue, '->', isValid);
      }
      
      // Update input validation classes
      if (phoneValue.length > 0) {
        if (isValid) {
          phoneInput.classList.add('valid');
          phoneInput.classList.remove('invalid');
        } else {
          phoneInput.classList.add('invalid');
          phoneInput.classList.remove('valid');
        }
      } else {
        phoneInput.classList.remove('valid', 'invalid');
      }
    } else {
      const codeInput = document.getElementById('employee-access-code');
      const codeValue = codeInput.value;
      isValid = codeValue.length === 6;
      
      // Update input validation classes
      if (codeValue.length > 0) {
        if (isValid) {
          codeInput.classList.add('valid');
          codeInput.classList.remove('invalid');
        } else {
          codeInput.classList.add('invalid');
          codeInput.classList.remove('valid');
        }
      } else {
        codeInput.classList.remove('valid', 'invalid');
      }
    }

    // Update login button state (for Materialize <a> buttons)
    if (isValid) {
      loginButton.removeAttribute('disabled');
      loginButton.classList.remove('disabled');
      loginButton.style.opacity = '1';
      loginButton.style.pointerEvents = 'auto';
      loginButton.style.cursor = 'pointer';
      console.log('Login button ENABLED');
    } else {
      loginButton.setAttribute('disabled', 'disabled');
      loginButton.classList.add('disabled');
      loginButton.style.opacity = '0.6';
      loginButton.style.pointerEvents = 'none';
      loginButton.style.cursor = 'not-allowed';
      console.log('Login button DISABLED');
    }
  }

  /**
   * Focus the current active input
   */
  #focusCurrentInput() {
    if (this.currentLoginType === 'parent') {
      const phoneInput = document.getElementById('parent-phone-input');
      phoneInput.focus();
    } else {
      const codeInput = document.getElementById('employee-access-code');
      codeInput.focus();
    }
  }

  /**
   * Reset login modal to initial state
   */
  #resetLoginModal(parentPhoneInput, employeeCodeInput, loginButton) {
    // Clear inputs
    parentPhoneInput.value = '';
    employeeCodeInput.value = '';
    
    // Clear validation classes
    parentPhoneInput.classList.remove('valid', 'invalid');
    employeeCodeInput.classList.remove('valid', 'invalid');
    
    // Disable login button (for Materialize <a> buttons)
    loginButton.setAttribute('disabled', 'disabled');
    loginButton.classList.add('disabled');
    loginButton.style.opacity = '0.6';
    loginButton.style.pointerEvents = 'none';
    loginButton.style.cursor = 'not-allowed';
    
    // Reset to parent login type
    this.currentLoginType = 'parent';
    const parentTab = document.getElementById('parent-login-tab');
    const employeeTab = document.getElementById('employee-login-tab');
    const parentSection = document.getElementById('parent-login-section');
    const employeeSection = document.getElementById('employee-login-section');
    
    // Update tab appearance
    parentTab.classList.remove('inactive-login-type');
    parentTab.classList.add('active-login-type');
    employeeTab.classList.remove('active-login-type');
    employeeTab.classList.add('inactive-login-type');
    
    // Show parent section, hide employee section
    parentSection.style.display = 'block';
    parentSection.classList.remove('inactive-section');
    parentSection.classList.add('active-section');
    employeeSection.style.display = 'none';
    employeeSection.classList.remove('active-section');
    employeeSection.classList.add('inactive-section');
  }

  /**
   * Initialize all application modals (Terms, Privacy, and Login)
   */
  #initializeAllModals() {
    console.log('🔧 Initializing all application modals in ViewModel...');

    // Initialize Terms of Service modal (non-dismissible)
    this.#initTermsModal();
    
    // Initialize Privacy Policy modal (dismissible)
    this.#initPrivacyModal();
    
    // Initialize Login modal (dismissible)
    this.#initLoginModal();

    console.log('✅ All application modals initialized successfully in ViewModel');
  }

  /**
   * Initialize Terms of Service modal with non-dismissible behavior
   */
  #initTermsModal() {
    const termsModal = document.getElementById('terms-modal');
    if (!termsModal) {
      console.warn('⚠️ Terms of Service modal element not found');
      return;
    }

    const termsBtn = termsModal.querySelector('.modal-footer .modal-close');
    
    // Initialize modal with default dismissible behavior for footer links
    this.termsModal = M.Modal.init(termsModal, {
      dismissible: true,
      opacity: 0.5,
      preventScrolling: true
    });

    // Make available globally
    window.termsModal = termsModal;
    window.termsModalInstance = this.termsModal;

    // Add custom click handler for "I Understand" button
    if (termsBtn) {
      termsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if this is the initial non-dismissible terms acceptance
        const hasAcceptedTerms = window.UserSession.hasAcceptedTermsOfService();
        
        if (!hasAcceptedTerms) {
          // Mark terms as accepted for first-time users
          window.UserSession.acceptTermsOfService();
          
          // Clean up temporary event handlers if they exist
          if (termsModal._tempKeydownHandler) {
            termsModal.removeEventListener('keydown', termsModal._tempKeydownHandler);
            delete termsModal._tempKeydownHandler;
          }
          if (termsModal._tempClickHandler) {
            termsModal.removeEventListener('click', termsModal._tempClickHandler);
            delete termsModal._tempClickHandler;
          }
          
          // Restore normal dismissible behavior for future footer link clicks
          this.termsModal.destroy();
          this.termsModal = M.Modal.init(termsModal, {
            dismissible: true,
            opacity: 0.5,
            preventScrolling: true
          });
          
          // Reattach keyboard handlers after reinitializing the modal
          const newTermsBtn = termsModal.querySelector('.modal-footer .modal-close');
          ModalKeyboardHandler.attachKeyboardHandlers(termsModal, {
            allowEscape: true,
            allowEnter: true,
            onConfirm: (event) => {
              console.log('Terms modal: Enter key pressed (reattached)');
              if (newTermsBtn) {
                newTermsBtn.click();
              }
            },
            onCancel: (event) => {
              console.log('Terms modal: ESC key pressed (reattached)');
              this.termsModal.close();
            }
          });
          
          // Execute the callback if it exists (for initial login flow)
          if (window.termsOnConfirmationCallback) {
            window.termsOnConfirmationCallback();
            window.termsOnConfirmationCallback = null; // Clear after use
          }
        }

        // Close the modal normally
        this.termsModal.close();
      });
    }

    // Attach keyboard handlers for normal usage (when dismissible)
    ModalKeyboardHandler.attachKeyboardHandlers(termsModal, {
      allowEscape: true,
      allowEnter: true,
      onConfirm: (event) => {
        // Handle Enter key press for Terms of Service
        console.log('Terms modal: Enter key pressed');
        if (termsBtn) {
          termsBtn.click();
        }
      },
      onCancel: (event) => {
        // Handle ESC key press for Terms of Service
        console.log('Terms modal: ESC key pressed');
        
        // Check if this is non-dismissible mode
        const hasAcceptedTerms = window.UserSession.hasAcceptedTermsOfService();
        if (!hasAcceptedTerms && window.termsOnConfirmationCallback) {
          // In non-dismissible mode, prevent ESC
          console.log('Terms modal: ESC blocked in non-dismissible mode');
          return;
        }
        
        // Allow normal ESC behavior
        this.termsModal.close();
      }
    });

    console.log('✅ Terms of Service modal initialized');
  }

  /**
   * Initialize Privacy Policy modal with dismissible behavior
   */
  #initPrivacyModal() {
    const privacyModal = document.getElementById('privacy-modal');
    if (!privacyModal) {
      console.warn('⚠️ Privacy Policy modal element not found');
      return;
    }

    const privacyBtn = privacyModal.querySelector('.modal-footer .modal-close');

    // Initialize with normal dismissible settings
    this.privacyModal = M.Modal.init(privacyModal, {
      dismissible: true,   // Allow normal dismissal behavior
      opacity: 0.5,       // Standard opacity
      preventScrolling: true
    });

    // Make available globally
    window.privacyModal = privacyModal;
    window.privacyModalInstance = this.privacyModal;

    // Attach keyboard handlers
    ModalKeyboardHandler.attachKeyboardHandlers(privacyModal, {
      allowEscape: true,
      allowEnter: true,
      onConfirm: (event) => {
        // Handle Enter key press for Privacy Policy - trigger button click
        console.log('Privacy modal: Enter key pressed');
        if (privacyBtn) {
          privacyBtn.click();
        } else {
          this.privacyModal.close();
        }
      },
      onCancel: (event) => {
        // Handle ESC key press for Privacy Policy
        console.log('Privacy modal: ESC key pressed');
        this.privacyModal.close();
      }
    });

    console.log('✅ Privacy Policy modal initialized (dismissible)');
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
   * Handle login form submission (public method for modal event handlers)
   */
  async handleLogin() {
    let loginValue = '';
    let loginType = this.currentLoginType;

    if (loginType === 'parent') {
      const phoneInput = document.getElementById('parent-phone-input');
      const phoneValue = phoneInput.value.trim();
      
      // Validate phone number
      if (!window.isValidPhoneNumber(phoneValue)) {
        M.toast({
          html: 'Please enter a valid 10-digit phone number.',
          classes: 'red darken-1',
          displayLength: 3000
        });
        phoneInput.focus();
        return;
      }
      
      // Strip formatting for backend
      loginValue = window.stripPhoneFormatting(phoneValue);
    } else {
      const codeInput = document.getElementById('employee-access-code');
      const codeValue = codeInput.value.trim();
      
      // Validate access code
      if (codeValue.length !== 6) {
        M.toast({
          html: 'Please enter a valid 6-digit access code.',
          classes: 'red darken-1',
          displayLength: 3000
        });
        codeInput.focus();
        return;
      }
      
      loginValue = codeValue;
    }

    // Close modal before attempting login
    this.loginModal.close();

    await this.#attemptLoginWithCode(
      loginValue,
      loginType,
      () => {
        // Handle successful login
        // Clear the inputs
        document.getElementById('parent-phone-input').value = '';
        document.getElementById('employee-access-code').value = '';

        // Reset UI state after modal close to prevent scroll lock
        setTimeout(() => {
          this.#resetUIState();
        }, 200); // Small delay to let modal close animation complete

      },
      () => {
        // Handle failed login - reopen modal and focus appropriate input
        this.loginModal.open();
        setTimeout(() => {
          this.#focusCurrentInput();
        }, 300); // Delay to ensure modal is open before focusing
      }
    );
  }

  /**
   * Handle login form submission
   */
  async #handleLogin() {
    debugger
    // Delegate to public method
    await this.handleLogin();
  }

  async #attemptLoginWithCode(loginValue, loginType, onSuccessfulLogin = null, onFailedLogin = null) {

    console.log('Login attempt with value:', loginValue, 'type:', loginType);

    try {
      this.#setPageLoading(true);

      // Send login data to backend
      const authenticatedUser = await HttpService.post(ServerFunctions.authenticateByAccessCode, { 
        accessCode: loginValue,
        loginType: loginType 
      });

      // Check if authentication was successful (non-null response)
      const loginSuccess = authenticatedUser !== null;

      if (loginSuccess) {
        // Save the login value securely in the browser
        window.AccessCodeManager.saveAccessCodeSecurely(loginValue, loginType);

        // Update login button state to show "Change User"
        this.#updateLoginButtonState();

        console.log('Login successful, access code saved securely');

        onSuccessfulLogin?.();

        // Clear cached data and reset initialization flags for new user
        console.log('Clearing cached data and resetting initialization flags for new user');
        this.#resetInitializationFlags();

        // Clear cached data properties
        this.admins = null;
        this.instructors = null;
        this.students = null;
        this.registrations = null;
        this.classes = null;
        this.rooms = null;
        this.currentUser = null;

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

    // Clear parent registration form selection when user changes
    if (this.parentRegistrationForm) {
      this.parentRegistrationForm.clearSelection();
    }

    // Comprehensive UI cleanup to prevent scroll lock issues
    this.#resetUIState();
  }

  /**
   * Reset UI state to prevent scroll lock and other issues during user changes
   */
  #resetUIState() {
    try {
      // Ensure login modal is properly closed
      if (this.loginModal && this.loginModal.isOpen) {
        this.loginModal.close();
      }

      // Reset scroll position
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;

      // Reset container scroll
      const container = document.querySelector('.container');
      if (container) {
        container.scrollTop = 0;
      }

      // Reset page content scroll
      const pageContent = document.getElementById('page-content');
      if (pageContent) {
        pageContent.scrollTop = 0;

        // Ensure overflow is not locked
        pageContent.style.overflow = '';
        pageContent.style.overflowY = '';
        pageContent.style.height = '';
        pageContent.style.position = '';
      }

      // Reset body styles that might cause scroll lock
      document.body.style.overflow = '';
      document.body.style.overflowY = '';
      document.body.style.height = '';
      document.body.style.position = '';

      // Reset html styles
      document.documentElement.style.overflow = '';
      document.documentElement.style.overflowY = '';
      document.documentElement.style.height = '';

      // Hide any fixed elements that might interfere
      const fixedElements = document.querySelectorAll('[style*="position: fixed"]');
      fixedElements.forEach(element => {
        if (element.id === 'admin-selected-lesson-display') {
          element.style.display = 'none';
        }
      });

      // Remove any modal overlay classes that might be stuck
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');

      // Remove any potential overlay elements
      const overlays = document.querySelectorAll('.modal-overlay');
      overlays.forEach(overlay => overlay.remove());

      console.log('✅ UI state reset completed');

    } catch (error) {
      console.error('❌ Error resetting UI state:', error);
    }
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

  /**
   * Show Terms of Service modal with confirmation callback
   * @param {Function} onConfirmation - Callback to execute when user accepts terms
   */
  #showTermsOfService(onConfirmation) {
    console.log('Showing Terms of Service modal');

    const termsModal = document.getElementById('terms-modal');
    const hasAcceptedTerms = window.UserSession.hasAcceptedTermsOfService();

    // Store the confirmation callback globally for the modal to access
    window.termsOnConfirmationCallback = onConfirmation;

    // Configure modal as non-dismissible for first-time users
    if (!hasAcceptedTerms && this.termsModal) {
      // Temporarily make the modal non-dismissible for initial terms acceptance
      this.termsModal.destroy();
      this.termsModal = M.Modal.init(termsModal, {
        dismissible: false,
        opacity: 0.8,
        preventScrolling: true,
        onCloseStart: function() {
          return false; // Prevent closing
        }
      });
      
      // Add keyboard event prevention for non-dismissible mode (only block ESC, allow Enter)
      const keydownHandler = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          console.log('Terms modal: ESC blocked in non-dismissible mode');
        }
        // Allow Enter key to work for button activation
      };
      
      // Add click prevention for non-dismissible mode (only prevent overlay clicks)
      const clickHandler = (e) => {
        // Only prevent clicks on the overlay, not on modal content
        if (e.target === termsModal) {
          e.stopPropagation();
          e.preventDefault();
        }
      };
      
      termsModal.addEventListener('keydown', keydownHandler);
      termsModal.addEventListener('click', clickHandler);
      
      // Store handlers for cleanup
      termsModal._tempKeydownHandler = keydownHandler;
      termsModal._tempClickHandler = clickHandler;
      
      // Reattach keyboard handlers for the non-dismissible modal
      const termsBtn = termsModal.querySelector('.modal-footer .modal-close');
      ModalKeyboardHandler.attachKeyboardHandlers(termsModal, {
        allowEscape: false, // Block ESC in non-dismissible mode
        allowEnter: true,   // Allow Enter for button activation
        onConfirm: (event) => {
          console.log('Terms modal: Enter key pressed (non-dismissible mode)');
          if (termsBtn) {
            termsBtn.click();
          }
        },
        onCancel: (event) => {
          // Should not be called since allowEscape is false
          console.log('Terms modal: ESC blocked in non-dismissible mode');
        }
      });
    }

    // Open the Terms of Service modal using ViewModel's instance
    if (this.termsModal) {
      this.termsModal.open();
    } else {
      console.error('Terms of Service modal not initialized in ViewModel');
    }
  }
}

// For backwards compatibility with existing code
window.ViewModel = ViewModel;
