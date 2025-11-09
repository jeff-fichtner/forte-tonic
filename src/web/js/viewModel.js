import { HttpService } from './data/httpService.js';
import {
  ServerFunctions,
  Sections,
  RegistrationType,
  MonthNames,
  SessionConfig,
  FilterValue,
} from './constants.js';
import { AppConfigurationResponse } from '../../models/shared/responses/appConfigurationResponse.js';
import {
  Registration,
} from '../../models/shared/index.js';
import { DomHelpers } from './utilities/domHelpers.js';
import { NavTabs } from './components/navTabs.js';
import { Table } from './components/table.js';
import { AdminRegistrationForm } from './workflows/adminRegistrationForm.js';
import { ParentRegistrationForm } from './workflows/parentRegistrationForm.js';
import { formatPhone } from './utilities/phoneHelpers.js';
import { formatGrade, formatTime } from './extensions/numberExtensions.js';
import { ClassManager } from './utilities/classManager.js';
import { INTENT_LABELS } from './constants/intentConstants.js';
import { PeriodType } from './constants/periodTypeConstants.js';
import { Trimester, TRIMESTER_SEQUENCE } from './constants/trimesterConstants.js';
import { FeedbackManager } from './feedback.js';

/**
 * Capitalize the first letter of a string (for display purposes)
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get the next trimester in the annual sequence
 * fall → winter → spring → fall (cycles)
 * @param {string} currentTrimester - "fall", "winter", or "spring"
 * @returns {string} Next trimester name in lowercase
 * @throws {Error} If invalid trimester name
 */
function getNextTrimester(currentTrimester) {
  if (!currentTrimester || typeof currentTrimester !== 'string') {
    throw new Error(`Invalid trimester: ${currentTrimester}`);
  }
  const index = TRIMESTER_SEQUENCE.findIndex(
    t => t.toLowerCase() === currentTrimester.toLowerCase()
  );
  if (index === -1) {
    throw new Error(`Invalid trimester: ${currentTrimester}`);
  }
  return TRIMESTER_SEQUENCE[(index + 1) % TRIMESTER_SEQUENCE.length];
}

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
    const month = MonthNames[date.getMonth()];
    const day = date.getDate();
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
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

    // Trimester selection properties
    this.selectedTrimester = null;
    this.defaultTrimester = null;
    this.lastRenderedTrimester = null; // Track what trimester is currently displayed in tables
    this.currentTrimesterData = {
      registrations: [],
      classes: [],
      students: [],
    };
  }

  async initializeAsync() {
    // Get application configuration when page first loads
    const appConfig = await HttpService.fetch(ServerFunctions.getAppConfiguration, data =>
      AppConfigurationResponse.fromApiData(data)
    );

    // Save entire app configuration in user session
    // ClassManager will read rockBandClassIds from here directly
    if (appConfig) {
      window.UserSession.saveAppConfig(appConfig);

      // Check if maintenance mode is enabled
      // Allow override via session storage for debugging/admin purposes
      const hasOverride = sessionStorage.getItem('maintenance_mode_override') === 'true';
      if (appConfig.maintenanceMode && !hasOverride) {
        this.#showMaintenanceMode(appConfig.maintenanceMessage);
        return; // Block further initialization
      } else if (appConfig.maintenanceMode && hasOverride) {
        console.log('⚠️  Maintenance mode is active but bypassed via override');
      }
    }

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
    // Only proceed if we have a valid user with backing data
    if (!user || (!user.admin && !user.instructor && !user.parent)) {
      return;
    }

    // Show content area
    document.getElementById('page-content').hidden = false;

    // Phase 5: Aggressive Cleanup - Removed global data fetching
    // Tabs now fetch their own scoped data via TabController pattern.
    // No backward compatibility - all data is now fetched by individual tabs.
    await DomHelpers.waitForDocumentReadyAsync();

    M.AutoInit();

    // Initialize empty arrays - tabs will fetch their own data
    this.admins = [];
    this.instructors = [];
    this.students = [];
    this.registrations = [];
    this.classes = [];
    this.rooms = [];

    // Store current user for access throughout the application
    this.currentUser = user;

    let defaultSection;
    if (user.admin) {
      if (!this.adminContentInitialized) {
        this.#initAdminContent();
        this.adminContentInitialized = true;
      } else {
        // Reinitialize trimester selector on user switch
        this.#initTrimesterSelector('admin');
      }
      defaultSection = Sections.ADMIN;
    }
    if (user.instructor) {
      if (!this.instructorContentInitialized) {
        this.#initInstructorContent();
        this.instructorContentInitialized = true;
      }
      defaultSection = Sections.INSTRUCTOR;
    }
    if (user.parent) {
      if (!this.parentContentInitialized) {
        // Check if we're in enrollment period and fetch next trimester data
        const currentPeriod = window.UserSession?.getCurrentPeriod?.();
        const isEnrollmentPeriod =
          currentPeriod &&
          (currentPeriod.periodType === PeriodType.PRIORITY_ENROLLMENT ||
            currentPeriod.periodType === PeriodType.OPEN_ENROLLMENT);

        if (isEnrollmentPeriod) {
          // Fetch next trimester registrations
          try {
            const nextTrimesterRegs = await HttpService.fetchAllPages(
              ServerFunctions.getNextTrimesterRegistrations,
              x => Registration.fromApiData(x)
            );

            console.log(
              `📥 Fetched ${nextTrimesterRegs.length} next trimester registrations from API`
            );
            nextTrimesterRegs.forEach((reg, i) => {
              console.log(
                `  [${i}] classId: "${reg.classId || ''}", classTitle: "${reg.classTitle || ''}", type: ${reg.registrationType}`
              );
            });

            // Enrich next trimester registrations with student and instructor objects
            this.nextTrimesterRegistrations = nextTrimesterRegs.map(registration => {
              if (!registration.student) {
                registration.student = this.students.find(x => {
                  const studentId = x.id?.value || x.id;
                  const registrationStudentId =
                    registration.studentId?.value || registration.studentId;
                  return studentId === registrationStudentId;
                });
              }

              if (!registration.instructor) {
                registration.instructor = this.instructors.find(x => {
                  const instructorId = x.id?.value || x.id;
                  const registrationInstructorId =
                    registration.instructorId?.value || registration.instructorId;
                  return instructorId === registrationInstructorId;
                });
              }
              return registration;
            });

            console.log(
              `📅 Loaded ${this.nextTrimesterRegistrations.length} next trimester registrations for parent view`
            );
          } catch (error) {
            console.error('Error loading next trimester registrations:', error);
            this.nextTrimesterRegistrations = [];
          }
        }

        this.#initParentContent();
        this.parentContentInitialized = true;
      }
      defaultSection = Sections.PARENT;
    }

    // Use the default section based on user's role
    this.navTabs = new NavTabs(defaultSection);
    this.#setPageLoading(false);

    // Initialize feedback system
    if (!this.feedbackManager) {
      this.feedbackManager = new FeedbackManager(this);
    }

    // Auto-click the specified role tab if provided
    if (roleToClick) {
      const navLink = document.querySelector(`a[data-section="${roleToClick}"]`);
      if (navLink) {
        navLink.click();
      }
    }

    // Update enrollment banner based on current period
    this._updateEnrollmentBanner();

    // Reset UI state after data load to prevent scroll lock issues
    setTimeout(() => {
      this.#resetUIState();
    }, 300); // Allow time for content to render and nav click to complete
  }

  /**
   * Update enrollment period banner based on current period
   * Shows different messages for intent, priority enrollment, and open enrollment
   * Hides banner during regular registration periods
   */
  _updateEnrollmentBanner() {
    const currentPeriod = window.UserSession.getCurrentPeriod();
    const banner = document.getElementById('enrollment-period-banner');
    const bannerText = document.getElementById('enrollment-banner-text');

    if (!banner || !bannerText) {
      // Banner elements not in DOM yet
      return;
    }

    if (!currentPeriod) {
      banner.style.display = 'none';
      return;
    }

    // Show appropriate message based on period type
    if (currentPeriod.periodType === PeriodType.PRIORITY_ENROLLMENT) {
      banner.style.display = 'block';
      banner.className = 'enrollment-banner priority';
      bannerText.textContent = 'Priority Enrollment is now open for returning families';
    } else if (currentPeriod.periodType === PeriodType.OPEN_ENROLLMENT) {
      banner.style.display = 'block';
      banner.className = 'enrollment-banner open';
      bannerText.textContent = 'Open Enrollment is now available for all families';
    } else if (currentPeriod.periodType === 'intent') {
      // Don't show this banner during intent period - the intent-banner with count is shown instead
      banner.style.display = 'none';
    } else {
      banner.style.display = 'none';
    }
  }

  /**
   *
   */
  #initAdminContent() {
    // First make sure the tabs container is visible
    const tabsContainer = document.querySelector('.tabs');
    if (tabsContainer) {
      tabsContainer.hidden = false;
    }

    // Initialize trimester selector for admins
    this.#initTrimesterSelector('admin');

    // Store initial registrations in currentTrimesterData
    this.currentTrimesterData.registrations = this.registrations;

    // master schedule tab - exclude wait list classes from master schedule
    const nonWaitlistRegistrations = this.registrations.filter(registration => {
      return !ClassManager.isRockBandClass(registration.classId);
    });
    const sortedRegistrations = this.#sortRegistrations(nonWaitlistRegistrations);
    this.masterScheduleTable = this.#buildRegistrationTable(sortedRegistrations);
    this.#populateFilterDropdowns(nonWaitlistRegistrations);

    // wait list tab - filter registrations with Rock Band class IDs (configured via environment)
    const waitListRegistrations = this.registrations.filter(registration => {
      return ClassManager.isRockBandClass(registration.classId);
    });
    this.adminWaitListTable = this.#buildWaitListTable(waitListRegistrations);

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

    // Update intent banner (will hide for non-parent users)
    this.#updateIntentBanner();

    // Add tab click listeners to sync tables when switching back to master schedule
    this.#setupAdminTabSyncListeners();
  }

  /**
   * Setup listeners to sync admin tables when switching tabs
   * Ensures tables display correct trimester data when returning to master schedule/wait list tabs
   */
  #setupAdminTabSyncListeners() {
    const masterScheduleTab = document.querySelector('a[href="#admin-master-schedule"]');
    const waitListTab = document.querySelector('a[href="#admin-wait-list"]');

    // Initialize lastRenderedTrimester to track what's currently shown in tables
    // Tables are initially built with default trimester data
    this.lastRenderedTrimester = this.defaultTrimester;

    const syncTables = () => {
      // Only rebuild if the selected trimester has changed since last render
      if (this.selectedTrimester !== this.lastRenderedTrimester) {
        console.log(
          `🔄 Syncing admin tables from ${this.lastRenderedTrimester} to ${this.selectedTrimester}`
        );
        this.#rebuildAdminTables();
        this.lastRenderedTrimester = this.selectedTrimester;
      }
    };

    if (masterScheduleTab) {
      masterScheduleTab.addEventListener('click', syncTables);
    }
    if (waitListTab) {
      waitListTab.addEventListener('click', syncTables);
    }
  }

  /**
   *
   */
  #initInstructorContent() {
    // Update intent banner (will hide for non-parent users)
    this.#updateIntentBanner();

    // Get the current instructor's ID
    const currentInstructorId = this.currentUser.instructor?.id;

    if (!currentInstructorId) {
      console.warn('No instructor ID found for current user');
      return;
    }

    // Filter registrations to only show those for the current instructor
    const instructorRegistrations = this.registrations.filter(registration => {
      const registrationInstructorId =
        registration.instructorId?.value || registration.instructorId;
      return registrationInstructorId === currentInstructorId;
    });

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
      dayHeader.style.cssText =
        'color: #2b68a4; margin-bottom: 15px; margin-top: 20px; font-weight: bold;';
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

      this.#buildWeeklySchedule(tableId, dayRegistrations, 'instructor');
    });

    const mappedEmployees = this.adminEmployees().concat(
      this.instructors.map(instructor => this.instructorToEmployee(instructor))
    );
    // Sort employees to ensure admins appear at the top
    const sortedEmployees = this.#sortEmployeesForDirectory(mappedEmployees);
    // this may be set in admin section
    this.employeeDirectoryTable ??= this.#buildDirectory(
      'employee-directory-table',
      sortedEmployees
    );
  }
  /**
   *
   */
  #initParentContent() {
    // Get the current parent's ID
    const currentParentId = this.currentUser.parent?.id;

    if (!currentParentId) {
      console.warn('No parent ID found for current user');
      return;
    }

    // Set default trimester for parents (they don't get a selector, but need the default value)
    const config = window.UserSession?.getAppConfig();
    if (config?.defaultTrimester) {
      this.defaultTrimester = config.defaultTrimester;
      this.selectedTrimester = config.defaultTrimester;
      console.log(`📌 Parent trimester set to default: ${this.defaultTrimester}`);
    }

    // Store initial registrations in currentTrimesterData
    this.currentTrimesterData.registrations = this.registrations;

    // Get ALL children of this parent (not just those with registrations) for the registration form
    const allParentChildren = this.students.filter(student => {
      if (!student) return false;

      return (
        student.parent1Id === currentParentId ||
        student.parent2Id === currentParentId ||
        String(student.parent1Id) === String(currentParentId) ||
        String(student.parent2Id) === String(currentParentId)
      );
    });

    const parentWeeklyScheduleTables = document.getElementById('parent-weekly-schedule-tables');

    // Clear existing content
    parentWeeklyScheduleTables.innerHTML = '';

    // Check if we're in an enrollment period
    const currentPeriod = window.UserSession?.getCurrentPeriod?.();
    const isEnrollmentPeriod =
      currentPeriod &&
      (currentPeriod.periodType === PeriodType.PRIORITY_ENROLLMENT ||
        currentPeriod.periodType === PeriodType.OPEN_ENROLLMENT);

    // Check if parent has ANY registrations across all trimesters to determine if we should show "No Matching Registrations"
    const hasAnyRegistrations = this.#parentHasAnyRegistrations(
      currentParentId,
      isEnrollmentPeriod
    );

    if (!hasAnyRegistrations) {
      // Show single "No Matching Registrations" message if parent has no registrations in any trimester
      const noRegistrationsMessage = document.createElement('div');
      noRegistrationsMessage.className = 'card-panel orange lighten-4';
      noRegistrationsMessage.style.cssText = 'text-align: center; padding: 30px; margin: 20px 0;';
      noRegistrationsMessage.innerHTML = `
        <h5 style="color: #e65100; margin-bottom: 10px;">No Matching Registrations</h5>
        <p style="color: #bf360c; font-size: 16px; margin: 0;">
          Your children have no active lesson registrations for this trimester.
        </p>
      `;
      parentWeeklyScheduleTables.appendChild(noRegistrationsMessage);
    } else if (isEnrollmentPeriod) {
      // During enrollment: Show upcoming trimester wait list + schedule, then current trimester wait list + schedule
      console.log('📅 Enrollment period detected - showing both trimesters');

      // 1. Upcoming trimester (next trimester) schedules
      if (this.nextTrimesterRegistrations && this.nextTrimesterRegistrations.length > 0) {
        // Render wait list for next trimester
        this.#renderParentWaitListSection(
          this.nextTrimesterRegistrations,
          currentParentId,
          parentWeeklyScheduleTables,
          'next'
        );

        // Render schedules for next trimester
        this.#renderParentScheduleSection(
          this.nextTrimesterRegistrations,
          currentParentId,
          parentWeeklyScheduleTables,
          'next',
          false // Don't show "No Matching Registrations" - we handle it above
        );
      }

      // 2. Current trimester schedules (no wait list during enrollment)
      // Render schedules for current trimester only (skip wait list)
      this.#renderParentScheduleSection(
        this.registrations,
        currentParentId,
        parentWeeklyScheduleTables,
        'current',
        false // Don't show "No Matching Registrations" - we handle it above
      );
    } else {
      // During registration or intent period: Show only current trimester
      // Render wait list for current trimester
      this.#renderParentWaitListSection(
        this.registrations,
        currentParentId,
        parentWeeklyScheduleTables,
        'current'
      );

      // Render schedules for current trimester
      this.#renderParentScheduleSection(
        this.registrations,
        currentParentId,
        parentWeeklyScheduleTables,
        'current',
        false // Don't show "No Matching Registrations" - we handle it above
      );
    }

    // Show/hide the legacy wait list table (keep for backwards compatibility)
    const parentWaitListTable = document.getElementById('parent-wait-list-table');
    if (parentWaitListTable) {
      parentWaitListTable.setAttribute('hidden', '');
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
        allParentChildren, // Pass ALL parent's children, not just those with registrations
        this.nextTrimesterRegistrations || [] // Pass next trimester registrations for enrollment options
      );
    } else {
      // Update existing form with latest data instead of recreating it
      this.parentRegistrationForm.updateData(
        this.instructors,
        this.students,
        this.classes,
        this.registrations,
        allParentChildren,
        this.nextTrimesterRegistrations || []
      );
    }

    // directory - show only instructors where parent has students with registrations
    // Filter to only show instructors who are teaching this parent's children
    const parentChildrenIds = allParentChildren.map(child => child.id?.value || child.id);
    const parentRegistrations = this.registrations.filter(registration => {
      const studentId =
        typeof registration.studentId === 'object'
          ? registration.studentId.value
          : registration.studentId;
      return parentChildrenIds.includes(studentId);
    });

    // Get unique instructor IDs from parent's registrations
    const parentInstructorIds = [
      ...new Set(
        parentRegistrations
          .map(registration => {
            return typeof registration.instructorId === 'object'
              ? registration.instructorId.value
              : registration.instructorId;
          })
          .filter(Boolean)
      ),
    ];

    console.log(
      `🎯 Parent has registrations with ${parentInstructorIds.length} instructors:`,
      parentInstructorIds
    );

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

    // Update intent banner
    this.#updateIntentBanner();

    // Attach intent dropdown listeners
    this.#attachIntentDropdownListeners();
  }

  /**
   * Render parent wait list section for a given set of registrations
   * @param {Array} registrations - Registrations to filter for wait list
   * @param {string} currentParentId - Current parent's ID
   * @param {HTMLElement} container - Container element to append to
   * @param {string} trimesterType - 'current' or 'next'
   * @private
   */
  #renderParentWaitListSection(registrations, currentParentId, container, trimesterType) {
    console.log(`📋 Rendering parent waitlist section for ${trimesterType} trimester`);
    console.log(`Total registrations to check: ${registrations?.length || 0}`);
    console.log(
      `Rock Band class IDs configured: ${JSON.stringify(ClassManager.getRockBandClassIds())}`
    );

    // Filter for wait list registrations belonging to this parent's children
    const parentWaitListRegistrations = registrations.filter(registration => {
      const student = registration.student;
      if (!student) {
        return false;
      }

      // Check if the current parent is either parent1 or parent2 of the student
      const exactMatch =
        student.parent1Id === currentParentId || student.parent2Id === currentParentId;

      // Also try string comparison in case of type mismatches
      const stringMatch =
        !exactMatch &&
        (String(student.parent1Id) === String(currentParentId) ||
          String(student.parent2Id) === String(currentParentId));

      const isMatch = exactMatch || stringMatch;

      // Include only Rock Band classes (wait list classes)
      const classId = registration.classId?.value || registration.classId;
      const isWaitlistClass = ClassManager.isRockBandClass(registration.classId);

      if (isMatch) {
        console.log(`Registration classId: ${classId}, isWaitlistClass: ${isWaitlistClass}`);
      }

      return isMatch && isWaitlistClass;
    });

    console.log(`Found ${parentWaitListRegistrations.length} parent waitlist registrations`);

    if (parentWaitListRegistrations.length > 0) {
      // Create wait list section
      const waitListSection = document.createElement('div');
      waitListSection.className = 'wait-list-section';
      waitListSection.style.cssText = 'margin-bottom: 30px;';

      // Create wait list title with trimester name
      const waitListTitle = document.createElement('h5');
      waitListTitle.style.cssText =
        'color: #2b68a4; margin-bottom: 15px; border-bottom: 2px solid #2b68a4; padding-bottom: 10px;';

      // Determine trimester name for title
      let trimesterName;
      if (trimesterType === 'next') {
        const currentTrimester = this.selectedTrimester;
        if (!currentTrimester) {
          console.error('selectedTrimester not set');
          return;
        }
        const nextTrimester = getNextTrimester(currentTrimester);
        trimesterName = capitalize(nextTrimester);
      } else {
        if (!this.selectedTrimester) {
          console.error('selectedTrimester not set');
          return;
        }
        trimesterName = capitalize(this.selectedTrimester);
      }

      waitListTitle.textContent = `${trimesterName} Rock Band Wait List`;
      waitListSection.appendChild(waitListTitle);

      // Create wait list table
      const waitListTable = document.createElement('table');
      const tableId = `parent-wait-list-${trimesterType}`;
      waitListTable.id = tableId;
      waitListSection.appendChild(waitListTable);

      container.appendChild(waitListSection);

      // Build the wait list table
      this.#buildParentWaitListTable(parentWaitListRegistrations, currentParentId, tableId);
    }
  }

  /**
   * Check if parent has any registrations across all relevant trimesters
   * @param {string} currentParentId - Current parent's ID
   * @param {boolean} isEnrollmentPeriod - Whether we're in an enrollment period
   * @returns {boolean} True if parent has at least one registration
   * @private
   */
  #parentHasAnyRegistrations(currentParentId, isEnrollmentPeriod) {
    const allRegistrations = isEnrollmentPeriod
      ? [...(this.registrations || []), ...(this.nextTrimesterRegistrations || [])]
      : this.registrations || [];

    return allRegistrations.some(registration => {
      const student = registration.student;
      if (!student) {
        return false;
      }

      // Check if the current parent is either parent1 or parent2 of the student
      const exactMatch =
        student.parent1Id === currentParentId || student.parent2Id === currentParentId;

      // Also try string comparison in case of type mismatches
      const stringMatch =
        !exactMatch &&
        (String(student.parent1Id) === String(currentParentId) ||
          String(student.parent2Id) === String(currentParentId));

      const isMatch = exactMatch || stringMatch;

      // Exclude Rock Band classes (wait list classes) from count
      const isWaitlistClass = ClassManager.isRockBandClass(registration.classId);

      return isMatch && !isWaitlistClass;
    });
  }

  /**
   * Render parent schedule section for a given set of registrations
   * @param {Array} registrations - Registrations to render
   * @param {string} currentParentId - Current parent's ID
   * @param {HTMLElement} container - Container element to append to
   * @param {string} trimesterType - 'current' or 'next'
   * @param {boolean} showNoRegistrationsMessage - Whether to show "No Matching Registrations" message (default true)
   * @private
   */
  #renderParentScheduleSection(
    registrations,
    currentParentId,
    container,
    trimesterType,
    showNoRegistrationsMessage = true
  ) {
    // Filter registrations for this parent's children, excluding wait list classes
    const parentChildRegistrations = registrations.filter(registration => {
      const student = registration.student;
      if (!student) {
        return false;
      }

      // Check if the current parent is either parent1 or parent2 of the student
      const exactMatch =
        student.parent1Id === currentParentId || student.parent2Id === currentParentId;

      // Also try string comparison in case of type mismatches
      const stringMatch =
        !exactMatch &&
        (String(student.parent1Id) === String(currentParentId) ||
          String(student.parent2Id) === String(currentParentId));

      const isMatch = exactMatch || stringMatch;

      // Exclude Rock Band classes (wait list classes) from parent weekly schedule
      const isWaitlistClass = ClassManager.isRockBandClass(registration.classId);

      return isMatch && !isWaitlistClass;
    });

    // Get unique students with registrations (their own children only)
    const studentsWithRegistrations = parentChildRegistrations
      .map(registration => registration.student)
      .filter(student => student && student.id)
      .filter((student, index, self) => self.findIndex(s => s.id === student.id) === index);

    // Show 'no matching registrations' message if no children have registrations (and enabled)
    if (studentsWithRegistrations.length === 0 && showNoRegistrationsMessage) {
      const noRegistrationsMessage = document.createElement('div');
      noRegistrationsMessage.className = 'card-panel orange lighten-4';
      noRegistrationsMessage.style.cssText = 'text-align: center; padding: 30px; margin: 20px 0;';
      noRegistrationsMessage.innerHTML = `
        <h5 style="color: #e65100; margin-bottom: 10px;">No Matching Registrations</h5>
        <p style="color: #bf360c; font-size: 16px; margin: 0;">
          Your children have no active lesson registrations for this trimester.
        </p>
      `;
      container.appendChild(noRegistrationsMessage);
    } else if (studentsWithRegistrations.length > 0) {
      // Create a separate table for each child
      studentsWithRegistrations.forEach(student => {
        // Create a container for each child's schedule
        const studentContainer = document.createElement('div');
        studentContainer.className = 'student-schedule-container';
        studentContainer.style.cssText = 'margin-bottom: 30px;';

        // Add student name header with trimester
        const studentHeader = document.createElement('h5');
        studentHeader.style.cssText =
          'color: #2b68a4; margin-bottom: 15px; border-bottom: 2px solid #2b68a4; padding-bottom: 10px;';

        // Determine trimester name for header
        let trimesterName;
        if (trimesterType === 'next') {
          const currentTrimester = this.selectedTrimester;
          if (!currentTrimester) {
            console.error('selectedTrimester not set');
            return;
          }
          const nextTrimester = getNextTrimester(currentTrimester);
          trimesterName = capitalize(nextTrimester);
        } else {
          if (!this.selectedTrimester) {
            console.error('selectedTrimester not set');
            return;
          }
          trimesterName = capitalize(this.selectedTrimester);
        }

        studentHeader.textContent = `${student.firstName} ${student.lastName}'s ${trimesterName} Schedule`;
        studentContainer.appendChild(studentHeader);

        // Create table for this student
        const tableId = `parent-weekly-schedule-${trimesterType}-${student.id}`;
        const newTable = document.createElement('table');
        newTable.id = tableId;
        studentContainer.appendChild(newTable);

        container.appendChild(studentContainer);

        // Filter registrations for this student and sort by day, then start time
        const studentRegistrations = parentChildRegistrations.filter(
          x => x.studentId.value === student.id.value
        );
        const sortedStudentRegistrations = this.#sortRegistrations(studentRegistrations);

        this.#buildWeeklySchedule(tableId, sortedStudentRegistrations, 'parent');
      });
    }
  }

  /**
   * Attach event listeners to intent dropdown selectors
   */
  #attachIntentDropdownListeners() {
    const dropdowns = document.querySelectorAll('.intent-dropdown');

    // Initialize Materialize select elements
    M.FormSelect.init(dropdowns);

    dropdowns.forEach(dropdown => {
      // Store the previous value
      let previousValue = dropdown.value;

      // Add listener (listeners are idempotent when refreshing tables)
      dropdown.addEventListener('change', async event => {
        const registrationId = event.target.getAttribute('data-registration-id');
        const intent = event.target.value;

        if (!intent) {
          M.toast({ html: 'Please select an intent option.' });
          return;
        }

        // Show confirmation modal
        const confirmed = await this.#showIntentConfirmationModal(intent, registrationId);

        if (!confirmed) {
          // User cancelled - reset to previous value
          event.target.value = previousValue;
          M.FormSelect.init(dropdown); // Reinitialize to show the reset value
          return;
        }

        // Find the status indicator for this dropdown
        const statusIndicator = document.querySelector(
          `.intent-status-indicator[data-registration-id="${registrationId}"]`
        );

        try {
          // Disable dropdown while submitting
          event.target.disabled = true;

          // Show loading spinner using animated Material Icon
          if (statusIndicator) {
            statusIndicator.style.display = 'flex';
            statusIndicator.style.alignItems = 'center';
            statusIndicator.style.justifyContent = 'center';
            statusIndicator.innerHTML =
              '<i class="material-icons blue-text" style="font-size: 20px; animation: spin 1s linear infinite;">sync</i>';
          }

          await this.submitIntent(registrationId, intent);

          // Update previous value on success
          previousValue = intent;

          // Show success checkmark
          if (statusIndicator) {
            statusIndicator.style.display = 'flex';
            statusIndicator.style.alignItems = 'center';
            statusIndicator.style.justifyContent = 'center';
            statusIndicator.innerHTML =
              '<i class="material-icons green-text" style="font-size: 20px;">check_circle</i>';
            // Hide after 3 seconds (increased from 2)
            setTimeout(() => {
              if (statusIndicator) {
                statusIndicator.style.display = 'none';
              }
            }, 3000);
          }
        } catch (error) {
          // Show error X
          if (statusIndicator) {
            statusIndicator.style.display = 'flex';
            statusIndicator.style.alignItems = 'center';
            statusIndicator.style.justifyContent = 'center';
            statusIndicator.innerHTML =
              '<i class="material-icons red-text" style="font-size: 20px;">cancel</i>';
            // Hide after 3 seconds
            setTimeout(() => {
              if (statusIndicator) {
                statusIndicator.style.display = 'none';
              }
            }, 3000);
          }
          // Reset to previous value on error
          event.target.value = previousValue;
          M.FormSelect.init(dropdown);
          console.error('Intent submission error:', error);
        } finally {
          // Re-enable dropdown if it still exists in the DOM
          if (event.target && document.body.contains(event.target)) {
            event.target.disabled = false;
            // Reinitialize Materialize select after re-enabling
            M.FormSelect.init(dropdown);
          }
        }
      });
    });
  }

  /**
   * Show intent confirmation modal and return promise that resolves to true/false
   */
  async #showIntentConfirmationModal(intent, registrationId) {
    return new Promise(resolve => {
      const modal = document.getElementById('intent-confirmation-modal');
      const messageEl = document.getElementById('intent-confirmation-message');
      const confirmBtn = document.getElementById('intent-confirmation-confirm');
      const cancelBtn = document.getElementById('intent-confirmation-cancel');

      if (!modal || !messageEl || !confirmBtn || !cancelBtn) {
        console.error('Intent confirmation modal elements not found');
        resolve(false);
        return;
      }

      // Find the registration to get lesson details
      const registration = this.registrations.find(r => (r.id?.value || r.id) === registrationId);

      let lessonDetails = 'this lesson';
      if (registration) {
        const instructor = this.instructors.find(
          i =>
            (i.id?.value || i.id) ===
            (registration.instructorId?.value || registration.instructorId)
        );
        const instructorName = instructor
          ? `${instructor.firstName} ${instructor.lastName}`
          : 'Unknown';

        // For group registrations, show the class title; for private lessons, show the instrument
        const isGroupClass = registration.registrationType === 'group';
        const lessonName = isGroupClass
          ? registration.classTitle || 'Unknown Class'
          : registration.instrument || 'Unknown';

        lessonDetails = `<strong>${lessonName}</strong> with <strong>${instructorName}</strong> on <strong>${registration.day}</strong>`;
      }

      // Set the message based on intent
      let intentMessages;
      if (intent === 'drop') {
        // For drop, include next priority enrollment period info
        const nextPeriod = window.UserSession?.getNextPeriod();
        let periodInfo = '';
        if (nextPeriod?.periodType === PeriodType.PRIORITY_ENROLLMENT && nextPeriod?.startDate) {
          const startDate = new Date(nextPeriod.startDate);
          const formattedDate = startDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
          periodInfo = `<br><br>You can change your response until the next priority enrollment period begins on <strong>${formattedDate}</strong>.`;
        }
        intentMessages = {
          keep: `Are you sure you want to <strong>keep</strong> ${lessonDetails}?<br><br>This confirms your intention to continue with this lesson.`,
          drop: `Are you sure you want to <strong>drop</strong> ${lessonDetails}?<br><br>This indicates you do not wish to continue with this lesson.${periodInfo}`,
          change: `Are you sure you want to <strong>change</strong> ${lessonDetails}?<br><br>You won't lose this lesson until you select a different lesson.`,
        };
      } else {
        intentMessages = {
          keep: `Are you sure you want to <strong>keep</strong> ${lessonDetails}?<br><br>This confirms your intention to continue with this lesson.`,
          drop: `Are you sure you want to <strong>drop</strong> ${lessonDetails}?<br><br>This indicates you do not wish to continue with this lesson.`,
          change: `Are you sure you want to <strong>change</strong> ${lessonDetails}?<br><br>You won't lose this lesson until you select a different lesson.`,
        };
      }

      messageEl.innerHTML =
        intentMessages[intent] || 'Are you sure you want to update your intent?';

      // Track if promise has been resolved to prevent double resolution
      let isResolved = false;

      // Cleanup function to destroy modal and restore scroll
      const cleanup = () => {
        if (modalInstance) {
          modalInstance.destroy();
        }
        // Remove any lingering overlays
        document.querySelectorAll('.modal-overlay').forEach(overlay => overlay.remove());
        // Ensure body scroll is restored
        document.body.style.overflow = '';
      };

      // Initialize modal
      const modalInstance = M.Modal.init(modal, {
        dismissible: true,
        onCloseEnd: () => {
          cleanup();
          // Only resolve if not already resolved (handles dismissal via escape or backdrop click)
          if (!isResolved) {
            isResolved = true;
            resolve(false);
          }
        },
      });

      // Handle confirm button
      const confirmHandler = () => {
        if (!isResolved) {
          isResolved = true;
          confirmBtn.removeEventListener('click', confirmHandler);
          cancelBtn.removeEventListener('click', cancelHandler);
          modalInstance.close();
          resolve(true);
        }
      };

      // Handle cancel button
      const cancelHandler = () => {
        if (!isResolved) {
          isResolved = true;
          confirmBtn.removeEventListener('click', confirmHandler);
          cancelBtn.removeEventListener('click', cancelHandler);
          modalInstance.close();
          resolve(false);
        }
      };

      confirmBtn.addEventListener('click', confirmHandler);
      cancelBtn.addEventListener('click', cancelHandler);

      // Open modal
      modalInstance.open();
    });
  }

  /**
   * Refresh all relevant tables after a new registration is created
   * This ensures all views stay synchronized when new data is added
   */
  #refreshTablesAfterRegistration() {
    // Always update the master schedule table if it exists (for admin view)
    if (this.masterScheduleTable) {
      const nonWaitlistRegistrations = this.currentTrimesterData.registrations.filter(
        registration => {
          return !ClassManager.isRockBandClass(registration.classId);
        }
      );
      const sortedRegistrations = this.#sortRegistrations(nonWaitlistRegistrations);
      this.masterScheduleTable.replaceRange(sortedRegistrations);

      // Repopulate filter dropdowns based on the actual registrations shown in the table
      this.#populateFilterDropdowns(nonWaitlistRegistrations);
    }

    // Always update the wait list table if it exists (for admin view)
    if (this.adminWaitListTable) {
      const waitListRegistrations = this.currentTrimesterData.registrations.filter(registration => {
        return ClassManager.isRockBandClass(registration.classId);
      });
      this.adminWaitListTable.replaceRange(waitListRegistrations);
    }

    // Update parent wait list table if it exists (for parent view)
    if (this.parentWaitListTable && this.currentUser?.parent) {
      const currentParentId = this.currentUser.parent?.id;

      if (currentParentId) {
        // Filter for wait list registrations belonging to this parent's children
        const parentWaitListRegistrations = this.registrations.filter(registration => {
          const student = registration.student;
          if (!student) {
            return false;
          }

          // Check if the current parent is either parent1 or parent2 of the student
          const exactMatch =
            student.parent1Id === currentParentId || student.parent2Id === currentParentId;

          // Also try string comparison in case of type mismatches
          const stringMatch =
            !exactMatch &&
            (String(student.parent1Id) === String(currentParentId) ||
              String(student.parent2Id) === String(currentParentId));

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
              waitListTitle.style.cssText =
                'color: #2b68a4; margin-bottom: 15px; border-bottom: 2px solid #2b68a4; padding-bottom: 10px; margin-top: 20px;';
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
      this.#initInstructorContent();
    }

    // Update parent weekly schedules if current user is a parent
    if (this.currentUser?.parent && this.parentContentInitialized) {
      this.#initParentContent();
    }

    // Update admin registration form's trimester registrations list if it exists
    // This ensures the registration selector dropdown reflects the current state
    if (this.adminRegistrationForm && this.currentUser?.admin) {
      this.adminRegistrationForm.setTrimesterRegistrations(this.currentTrimesterData.registrations);
    }
  }

  /**
   * Shared method to create registration with proper enrichment
   * This method handles the API call and enriches the response with instructor and student objects
   * Routes to next trimester endpoint during enrollment periods (for parents only)
   * Admins always use the regular endpoint regardless of period
   */
  async #createRegistrationWithEnrichment(data) {
    // Admins always use the regular endpoint - they can create registrations for any trimester
    const isAdmin = this.currentUser?.admin !== undefined;

    // Determine which endpoint to use based on enrollment period (for non-admin users)
    const currentPeriod = window.UserSession?.getCurrentPeriod?.();
    const isEnrollmentPeriod =
      currentPeriod &&
      (currentPeriod.periodType === PeriodType.PRIORITY_ENROLLMENT ||
        currentPeriod.periodType === PeriodType.OPEN_ENROLLMENT);

    // Admins always use regular endpoint, parents use next trimester endpoint during enrollment
    const endpoint =
      isEnrollmentPeriod && !isAdmin
        ? ServerFunctions.createNextTrimesterRegistration
        : ServerFunctions.register;

    // If replacing an existing registration (has replaceRegistrationId),
    // delete the old registration first (this creates an audit record for the deletion)
    // The old registration being deleted may have linkedPreviousRegistrationId, which will be in the audit record
    if (data.replaceRegistrationId) {
      console.log(
        `🔄 Replacing registration - deleting old registration: ${data.replaceRegistrationId}`
      );
      try {
        // Use the appropriate delete endpoint based on enrollment period
        // Admins always use regular endpoint
        // For next trimester during enrollment: registrations/next-trimester/{id}
        // For current trimester: registrations/{id}
        const deleteEndpoint =
          isEnrollmentPeriod && !isAdmin
            ? `registrations/next-trimester/${data.replaceRegistrationId}`
            : `registrations/${data.replaceRegistrationId}`;

        await HttpService.delete(deleteEndpoint);

        // Remove the old registration from local state (from ALL relevant arrays)
        // This is critical to prevent the old registration from persisting in the UI
        if (isEnrollmentPeriod && !isAdmin && this.nextTrimesterRegistrations) {
          const oldRegIndex = this.nextTrimesterRegistrations.findIndex(reg => {
            const regId = reg.id?.value || reg.id;
            return regId === data.replaceRegistrationId;
          });

          if (oldRegIndex !== -1) {
            this.nextTrimesterRegistrations.splice(oldRegIndex, 1);
            console.log(`✅ Old registration removed from next trimester registrations`);
          }
        } else {
          const oldRegIndex = this.registrations.findIndex(reg => {
            const regId = reg.id?.value || reg.id;
            return regId === data.replaceRegistrationId;
          });

          if (oldRegIndex !== -1) {
            this.registrations.splice(oldRegIndex, 1);
            console.log(`✅ Old registration removed from current trimester registrations`);
          }
        }

        // ALSO remove from currentTrimesterData.registrations (used by master schedule table)
        const currentTrimesterIndex = this.currentTrimesterData.registrations.findIndex(reg => {
          const regId = reg.id?.value || reg.id;
          return regId === data.replaceRegistrationId;
        });

        if (currentTrimesterIndex !== -1) {
          this.currentTrimesterData.registrations.splice(currentTrimesterIndex, 1);
          console.log(`✅ Old registration removed from currentTrimesterData`);
        }

        // Remove the replaceRegistrationId from the data object before creating the new registration
        // The new registration should NOT have linkedPreviousRegistrationId - that's only for migrations
        delete data.replaceRegistrationId;
      } catch (error) {
        console.error('Error deleting old registration:', error);
        throw new Error(`Failed to delete old registration: ${error.message}`);
      }
    }

    const response = await HttpService.post(endpoint, data);
    // HttpService auto-unwraps { success, data } responses, so response is already the registration data
    const newRegistration = Registration.fromApiData(response);

    // Enrich the registration with instructor and student objects (same logic as initial data loading)
    if (!newRegistration.student) {
      newRegistration.student = this.students.find(x => {
        const studentId = x.id?.value || x.id;
        const registrationStudentId = newRegistration.studentId?.value || newRegistration.studentId;
        return studentId === registrationStudentId;
      });

      if (!newRegistration.student) {
        console.warn(
          `❌ Student not found for new registration with studentId "${newRegistration.studentId?.value || newRegistration.studentId}"`
        );
      } else {
        console.log(
          `✅ Student enriched: ${newRegistration.student.firstName} ${newRegistration.student.lastName}`
        );
      }
    }

    if (!newRegistration.instructor) {
      newRegistration.instructor = this.instructors.find(x => {
        const instructorId = x.id?.value || x.id;
        const registrationInstructorId =
          newRegistration.instructorId?.value || newRegistration.instructorId;
        return instructorId === registrationInstructorId;
      });

      if (!newRegistration.instructor) {
        console.warn(
          `❌ Instructor not found for new registration with instructorId "${newRegistration.instructorId?.value || newRegistration.instructorId}"`
        );
      } else {
        console.log(
          `✅ Instructor enriched: ${newRegistration.instructor.firstName} ${newRegistration.instructor.lastName}`
        );
      }
    }

    // Add to appropriate registrations array
    // Admins: add to current trimester data (respects selected trimester)
    // Parents during enrollment: add to next trimester
    // Others: add to current default trimester
    if (isEnrollmentPeriod && !isAdmin) {
      // Next trimester registration - add to nextTrimesterRegistrations
      if (!this.nextTrimesterRegistrations) {
        this.nextTrimesterRegistrations = [];
      }
      this.nextTrimesterRegistrations.push(newRegistration);
      console.log(
        `✅ Added registration to next trimester (total: ${this.nextTrimesterRegistrations.length})`
      );
      console.log(
        `🔍 New registration - classId: "${newRegistration.classId || ''}", classTitle: "${newRegistration.classTitle || ''}", registrationType: "${newRegistration.registrationType}"`
      );
    } else {
      // For admins or non-enrollment periods: add to selected trimester's data
      // Always add to currentTrimesterData which reflects what's currently displayed
      this.currentTrimesterData.registrations.push(newRegistration);
      console.log(
        `✅ Added registration to ${this.selectedTrimester} trimester (total: ${this.currentTrimesterData.registrations.length})`
      );
    }

    this.#refreshTablesAfterRegistration();

    return newRegistration;
  }

  /**
   * Update the intent banner to show how many registrations need intent submission
   */
  #updateIntentBanner() {
    const banner = document.getElementById('intent-banner');
    const countElement = document.getElementById('intent-incomplete-count');

    if (!banner) return;

    // Only show banner for parent users
    if (!this.currentUser?.parent) {
      banner.style.display = 'none';
      return;
    }

    // Check if we're in the intent period
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const isIntentPeriod = currentPeriod?.periodType === PeriodType.INTENT;

    if (!isIntentPeriod) {
      banner.style.display = 'none';
      return;
    }

    // Count registrations without intent (for current parent only)
    const incompleteRegistrations = this.registrations.filter(r => {
      // Exclude wait list items (Rock Band classes)
      const isWaitlistClass = ClassManager.isRockBandClass(r.classId);
      if (isWaitlistClass) return false;

      // Check if this registration belongs to current parent's children
      const student = this.students.find(s => {
        const studentId = s.id?.value || s.id;
        const regStudentId = r.studentId?.value || r.studentId;
        return studentId === regStudentId;
      });

      if (!student) return false;

      // Check if student belongs to current parent
      const currentParentId = this.currentUser?.parent?.id;
      if (!currentParentId) return false;

      const isParentsChild =
        student.parent1Id === currentParentId || student.parent2Id === currentParentId;

      // Count if it's parent's child AND no intent submitted
      return isParentsChild && !r.reenrollmentIntent;
    });

    const count = incompleteRegistrations.length;

    console.log('Intent banner update:', {
      totalRegistrations: this.registrations.length,
      incompleteCount: count,
      incompleteRegistrations: incompleteRegistrations.map(r => ({
        id: r.id?.value || r.id,
        classId: r.classId,
        reenrollmentIntent: r.reenrollmentIntent,
      })),
    });

    if (count === 0) {
      banner.style.display = 'none';
    } else {
      banner.style.display = 'block';
      if (countElement) {
        countElement.textContent = `${count} registration${count !== 1 ? 's' : ''} need${count === 1 ? 's' : ''} your response.`;
      }
    }
  }

  /**
   * Initialize the trimester button selector
   * Sets up segmented buttons with available trimesters and default selection
   * @param {string} userType - 'admin' or 'parent'
   */
  #initTrimesterSelector(userType) {
    console.log(`🔧 initTrimesterSelector called for ${userType}`);
    console.trace('Call stack:');

    // CRITICAL: Trimester selector is ADMIN-ONLY
    // This method should NEVER be called for non-admins
    if (userType !== 'admin') {
      console.error(`❌ Trimester selector should only be initialized for admins, not ${userType}`);
      return;
    }

    if (!this.currentUser?.admin) {
      console.warn('❌ Admin trimester selector requested but user is not an admin');
      return;
    }

    const containerId = 'admin-trimester-selector-container';
    const container = document.getElementById(containerId);

    if (!container) {
      console.error(`Trimester selector container not found`);
      return;
    }

    // Get configuration from UserSession
    const config = window.UserSession?.getAppConfig();
    if (!config) {
      console.error('App configuration not available');
      return;
    }

    // Get default trimester
    this.defaultTrimester = config.defaultTrimester;
    if (!this.defaultTrimester) {
      console.error('defaultTrimester not configured in app configuration');
      return;
    }

    // Show the selector container for admins
    container.hidden = false;

    // Restore trimester from sessionStorage (persists across refresh, unique per tab)
    const sessionKey = 'admin-selected-trimester';
    const savedTrimester = sessionStorage.getItem(sessionKey);
    this.selectedTrimester = savedTrimester || this.defaultTrimester;
    console.log(`📌 Restored admin trimester from session: ${this.selectedTrimester}`);

    // Clear and rebuild the entire container to ensure clean state
    const trimesters = config.availableTrimesters;
    if (!trimesters || trimesters.length === 0) {
      console.error('availableTrimesters not configured in app configuration');
      return;
    }
    const buttonsHtml = trimesters
      .map(
        trimester =>
          `<button
            class="trimester-btn ${trimester === this.selectedTrimester ? 'active' : ''}"
            data-trimester="${trimester}"
          >
            ${capitalize(trimester)}
          </button>`
      )
      .join('');

    container.innerHTML = `
      <div class="card" style="margin: 0; border-left: 4px solid #2b68a4">
        <div class="card-content" style="padding: 20px">
          <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap">
            <div style="display: flex; align-items: center; gap: 10px">
              <i class="material-icons" style="color: #2b68a4; font-size: 24px">event</i>
              <span style="color: #666; font-size: 14px; font-weight: 500">Trimester</span>
            </div>
            <div id="admin-trimester-buttons" class="trimester-selector-container">
              ${buttonsHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    // Add click event listeners to all buttons
    const buttons = container.querySelectorAll('.trimester-btn');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const newTrimester = button.getAttribute('data-trimester');

        // Update active state - query fresh buttons from the container
        const currentButtons = container.querySelectorAll('.trimester-btn');
        currentButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Trigger change handler
        this.#handleTrimesterChange(newTrimester, 'admin');
      });
    });

    // If restored trimester differs from default, load that trimester's data
    if (this.selectedTrimester !== this.defaultTrimester) {
      console.log(`🔄 Loading saved trimester data: ${this.selectedTrimester}`);
      this.#loadTrimesterData(this.selectedTrimester)
        .then(() => {
          this.#rebuildAdminTables();
          this.lastRenderedTrimester = this.selectedTrimester; // Update tracking after rebuild
          console.log(`✅ Restored ${this.selectedTrimester} trimester data from session`);
        })
        .catch(err => {
          console.error(`Failed to load saved trimester data:`, err);
          // Fall back to default trimester
          this.selectedTrimester = this.defaultTrimester;
          sessionStorage.removeItem('admin-selected-trimester');
        });
    }
  }

  /**
   * Handle trimester selection change
   * Loads new data and rebuilds tables based on user type
   * @param {string} trimester - Selected trimester ('Fall', 'Winter', 'Spring')
   * @param {string} userType - 'admin' or 'parent'
   */
  async #handleTrimesterChange(trimester, userType) {
    if (trimester === this.selectedTrimester) {
      return; // No change
    }

    this.selectedTrimester = trimester;

    // Save admin's selected trimester to sessionStorage (persists across refresh, unique per tab)
    if (userType === 'admin') {
      sessionStorage.setItem('admin-selected-trimester', trimester);
      console.log(`💾 Saved admin trimester to session: ${trimester}`);
    }

    // Show loading state
    this.#showLoadingState(true, userType);

    try {
      if (userType === 'admin') {
        // Load data for selected trimester
        await this.#loadTrimesterData(trimester);

        // Rebuild all admin tables with new data
        this.#rebuildAdminTables();
      } else if (userType === 'parent') {
        // Load parent's children's registrations for selected trimester
        const currentParentId = this.currentUser.parent?.id;
        if (!currentParentId) {
          throw new Error('No parent ID found');
        }

        await this.#loadParentTrimesterData(trimester, currentParentId);

        // Rebuild parent weekly schedule
        this.#rebuildParentWeeklySchedule(currentParentId);
      }
    } catch (error) {
      console.error('Error loading trimester data:', error);
      M.toast({
        html: 'Error loading trimester data. Please try again.',
        classes: 'red darken-2',
      });

      // Show permanent error overlay to indicate data is stale/inaccessible
      this.#showTrimesterErrorOverlay(userType, trimester, error.message);
    } finally {
      this.#showLoadingState(false, userType);
    }
  }

  /**
   * Show error overlay when trimester data fails to load
   * Covers the content area to indicate data is stale/inaccessible
   * @param {string} userType - 'admin' or 'parent'
   * @param {string} trimester - The trimester that failed to load
   * @param {string} errorMessage - Error message to display
   */
  #showTrimesterErrorOverlay(userType, trimester, errorMessage) {
    // Find all visible tab content areas for the given user type
    let visibleContainers = [];

    if (userType === 'admin') {
      // Find all admin tabs (master schedule, wait list, registration)
      const adminTabs = ['admin-master-schedule', 'admin-wait-list', 'admin-registration'];
      visibleContainers = adminTabs
        .map(id => document.getElementById(id))
        .filter(el => el && !el.hidden);
    } else {
      // Find all parent tabs (weekly schedule, registration, contact us)
      const parentTabs = ['parent-weekly-schedule', 'parent-registration', 'parent-contact-us'];
      visibleContainers = parentTabs
        .map(id => document.getElementById(id))
        .filter(el => el && !el.hidden);
    }

    if (visibleContainers.length === 0) {
      console.error(`No visible ${userType} tabs found for error overlay`);
      return;
    }

    // Apply overlay to all visible tab containers
    visibleContainers.forEach(container => {
      // Remove any existing error overlay in this container
      const existingOverlay = container.querySelector('.trimester-error-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }

      // Create error overlay
      const overlay = document.createElement('div');
      overlay.className = 'trimester-error-overlay';
      overlay.innerHTML = `
        <div class="trimester-error-content">
          <i class="material-icons" style="font-size: 48px; color: #f44336; margin-bottom: 16px">error_outline</i>
          <h5 style="margin: 0 0 8px 0; font-weight: 500">Failed to Load ${this.#capitalizeTrimester(trimester)} Trimester</h5>
          <p style="margin: 0 0 16px 0; color: #666; max-width: 500px">
            The data displayed may be outdated or incomplete. Please refresh the page or try selecting a different trimester.
          </p>
          <button class="btn waves-effect waves-light trimester-error-refresh">
            <i class="material-icons left">refresh</i>
            Refresh Page
          </button>
          ${errorMessage ? `<p style="margin-top: 16px; font-size: 12px; color: #999; font-family: monospace">${errorMessage}</p>` : ''}
        </div>
      `;

      // Add event listener to refresh button
      const refreshBtn = overlay.querySelector('.trimester-error-refresh');
      refreshBtn.addEventListener('click', () => {
        window.location.reload();
      });

      // Insert overlay at the beginning of the container
      container.style.position = 'relative';
      container.insertBefore(overlay, container.firstChild);
    });
  }

  /**
   * Helper to capitalize trimester names
   * @param {string} trimester
   * @returns {string}
   */
  #capitalizeTrimester(trimester) {
    if (!trimester) return '';
    return trimester.charAt(0).toUpperCase() + trimester.slice(1).toLowerCase();
  }

  /**
   * Load all data for a specific trimester
   * Fetches registrations for the selected trimester
   * @param {string} trimester - The trimester to load
   */
  async #loadTrimesterData(trimester) {
    try {
      // Fetch registrations for the trimester
      const response = await fetch(`/api/admin/registrations/${trimester}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${trimester} data: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle both direct array response and wrapped {success, data} response
      const registrations = data.data || data;

      // Update current trimester data
      this.currentTrimesterData.registrations = registrations;

      return registrations;
    } catch (error) {
      console.error('Error in loadTrimesterData:', error);
      throw error;
    }
  }

  /**
   * Rebuild all admin tables with current trimester data
   */
  #rebuildAdminTables() {
    const registrations = this.currentTrimesterData.registrations;

    // Rebuild master schedule (exclude Rock Band classes)
    const nonWaitlistRegistrations = registrations.filter(registration => {
      return !ClassManager.isRockBandClass(registration.classId);
    });
    const sortedRegistrations = this.#sortRegistrations(nonWaitlistRegistrations);
    this.masterScheduleTable = this.#buildRegistrationTable(sortedRegistrations);
    this.#populateFilterDropdowns(nonWaitlistRegistrations);

    // Rebuild wait list (Rock Band classes only)
    const waitListRegistrations = registrations.filter(registration => {
      return ClassManager.isRockBandClass(registration.classId);
    });
    this.adminWaitListTable = this.#buildWaitListTable(waitListRegistrations);

    // Update registration form with current trimester context and registrations
    if (this.adminRegistrationForm) {
      this.adminRegistrationForm.setTrimester(this.selectedTrimester);
      this.adminRegistrationForm.setTrimesterRegistrations(registrations);
    }
  }

  /**
   * Load parent's children's registrations for a specific trimester
   * @param {string} trimester - The trimester to load
   * @param {string} parentId - The parent's ID
   */
  async #loadParentTrimesterData(trimester, parentId) {
    try {
      // Fetch registrations for the trimester
      const response = await fetch(`/api/admin/registrations/${trimester}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${trimester} data: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle both direct array response and wrapped {success, data} response
      const allRegistrations = data.data || data;

      // Filter to only this parent's children's registrations
      const parentChildRegistrations = allRegistrations.filter(registration => {
        const student = registration.student;
        if (!student) return false;

        const exactMatch = student.parent1Id === parentId || student.parent2Id === parentId;

        const stringMatch =
          !exactMatch &&
          (String(student.parent1Id) === String(parentId) ||
            String(student.parent2Id) === String(parentId));

        const isMatch = exactMatch || stringMatch;

        // Exclude Rock Band classes (wait list classes) from parent weekly schedule
        const isWaitlistClass = ClassManager.isRockBandClass(registration.classId);

        return isMatch && !isWaitlistClass;
      });

      // Update current trimester data
      this.currentTrimesterData.registrations = parentChildRegistrations;

      return parentChildRegistrations;
    } catch (error) {
      console.error('Error in loadParentTrimesterData:', error);
      throw error;
    }
  }

  /**
   * Rebuild parent weekly schedule with current trimester data
   * @param {string} parentId - The parent's ID
   */
  #rebuildParentWeeklySchedule(parentId) {
    const parentChildRegistrations = this.currentTrimesterData.registrations;

    // Get unique students with registrations (their own children only)
    const studentsWithRegistrations = parentChildRegistrations
      .map(registration => registration.student)
      .filter(student => student && student.id)
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
        Your children have no active lesson registrations for this trimester.
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

        // Add student name header with trimester
        const studentHeader = document.createElement('h5');
        studentHeader.style.cssText =
          'color: #2b68a4; margin-bottom: 15px; border-bottom: 2px solid #2b68a4; padding-bottom: 10px;';
        if (!this.selectedTrimester) {
          console.error('selectedTrimester not set');
          return;
        }
        const trimesterName = capitalize(this.selectedTrimester);
        studentHeader.textContent = `${student.firstName} ${student.lastName}'s ${trimesterName} Schedule`;
        studentContainer.appendChild(studentHeader);

        // Create table for this student
        const tableId = `parent-weekly-schedule-table-${student.id}`;
        const newTable = document.createElement('table');
        newTable.id = tableId;
        studentContainer.appendChild(newTable);

        parentWeeklyScheduleTables.appendChild(studentContainer);

        // Filter registrations for this student and sort by day, then start time
        const studentRegistrations = parentChildRegistrations.filter(
          x => x.studentId.value === student.id.value
        );
        const sortedStudentRegistrations = this.#sortRegistrations(studentRegistrations);

        this.#buildWeeklySchedule(tableId, sortedStudentRegistrations, 'parent');
      });
    }
  }

  /**
   * Show/hide loading state for tables
   * @param {boolean} isLoading - Whether to show loading state
   * @param {string} userType - 'admin' or 'parent'
   */
  #showLoadingState(isLoading, userType) {
    let tables = [];
    let buttonsContainerId = '';

    if (userType === 'admin') {
      tables = ['master-schedule-table', 'admin-wait-list-table'];
      buttonsContainerId = 'admin-trimester-buttons';
    } else if (userType === 'parent') {
      // Parent weekly schedule is dynamically generated, so we target the container
      const container = document.getElementById('parent-weekly-schedule-tables');
      if (container) {
        container.style.opacity = isLoading ? '0.5' : '1';
        container.style.pointerEvents = isLoading ? 'none' : 'auto';
      }
      buttonsContainerId = 'parent-trimester-buttons';
    }

    tables.forEach(tableId => {
      const table = document.getElementById(tableId);
      if (table) {
        table.style.opacity = isLoading ? '0.5' : '1';
        table.style.pointerEvents = isLoading ? 'none' : 'auto';
      }
    });

    // Disable the buttons during loading
    const buttonsContainer = document.getElementById(buttonsContainerId);
    if (buttonsContainer) {
      const buttons = buttonsContainer.querySelectorAll('.trimester-btn');
      buttons.forEach(button => {
        button.disabled = isLoading;
        button.style.opacity = isLoading ? '0.5' : '1';
        button.style.cursor = isLoading ? 'not-allowed' : 'pointer';
      });
    }
  }

  /**
   * Show maintenance mode overlay
   * @param {string} message - Custom maintenance message
   */
  #showMaintenanceMode(message) {
    const overlay = document.getElementById('maintenance-mode-overlay');
    const messageText = document.getElementById('maintenance-message-text');

    if (overlay) {
      // Update message if provided
      if (message && messageText) {
        messageText.textContent = message;
      }

      // Show the overlay
      overlay.classList.add('active');

      // Hide loading spinner and page content
      const loadingContainer = document.getElementById('page-loading-container');
      const pageContent = document.getElementById('page-content');
      if (loadingContainer) loadingContainer.style.display = 'none';
      if (pageContent) pageContent.hidden = true;
    }
  }

  /**
   * Hide maintenance mode overlay and reinitialize the application
   * Used for debugging or emergency admin override
   */
  #hideMaintenanceMode() {
    const overlay = document.getElementById('maintenance-mode-overlay');
    const pageContent = document.getElementById('page-content');

    if (overlay) {
      // Hide the overlay
      overlay.classList.remove('active');

      // Show page content
      if (pageContent) pageContent.hidden = false;

      console.log('✓ Maintenance mode override activated');
    }
  }

  /**
   * Override maintenance mode for this session
   * Accessible via console: window.overrideMaintenanceMode()
   */
  overrideMaintenanceMode() {
    try {
      // Set session storage flag to persist override for this session
      sessionStorage.setItem('maintenance_mode_override', 'true');
      console.log('✓ Maintenance mode override flag set');

      // Hide maintenance overlay and continue initialization
      this.#hideMaintenanceMode();

      // Reinitialize the application
      this.#initializeAllModals();
      this.#updateLoginButtonState();
      this.#showLoginButton();
      this.#setPageLoading(false);

      // Check if user has accepted terms
      const hasAcceptedTermsOfService = window.UserSession.hasAcceptedTermsOfService();
      if (!hasAcceptedTermsOfService) {
        this.#showTermsOfService(() => {
          this.loginModal.open();
        });
      } else {
        // Try auto-login if credentials exist
        const storedAuthData = window.AccessCodeManager.getStoredAuthData();
        if (storedAuthData) {
          this.#attemptLoginWithCode(storedAuthData.accessCode, storedAuthData.loginType);
        } else {
          // Open login modal
          this.loginModal.open();
        }
      }

      console.log('✓ Application reinitialized with maintenance mode bypassed');
      return true;
    } catch (error) {
      console.error('✗ Failed to override maintenance mode:', error);
      return false;
    }
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
   * @param {Array} registrations - The registrations to use for populating filters (defaults to non-waitlist registrations)
   */
  #populateFilterDropdowns(registrations = null) {
    // Use provided registrations or fall back to non-waitlist registrations
    const regsToUse =
      registrations ||
      this.registrations.filter(registration => {
        return !ClassManager.isRockBandClass(registration.classId);
      });

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

      // Get unique instructor IDs from registrations
      const registeredInstructorIds = [
        ...new Set(regsToUse.map(reg => reg.instructorId?.value || reg.instructorId)),
      ];

      // Only show instructors who have active registrations
      this.instructors
        .filter(instructor => registeredInstructorIds.includes(instructor.id))
        .forEach(instructor => {
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

      // Get unique days from registrations, filtering out null/undefined/empty values
      const uniqueDays = [
        ...new Set(regsToUse.map(reg => reg.day).filter(day => day && day.trim() !== '')),
      ];

      // Sort days in logical weekday order
      const dayOrder = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];
      uniqueDays
        .sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))
        .forEach(day => {
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
      const registeredStudentIds = regsToUse.map(reg => reg.studentId?.value || reg.studentId);
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

    // Populate intent dropdown (only during intent period)
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const isIntentPeriod = currentPeriod?.periodType === PeriodType.INTENT;

    const intentFilterContainer = document.getElementById(
      'master-schedule-intent-filter-container'
    );
    const intentSelect = document.getElementById('master-schedule-intent-filter-select');

    // Adjust column widths based on whether intent filter is shown
    // Need to go up TWO levels: select -> select-wrapper (Materialize) -> input-field (has col classes)
    const instructorFilter = document.getElementById('master-schedule-instructor-filter-select')
      ?.parentElement?.parentElement;
    const dayFilter = document.getElementById('master-schedule-day-filter-select')?.parentElement
      ?.parentElement;
    const gradeFilter = document.getElementById('master-schedule-grade-filter-select')
      ?.parentElement?.parentElement;

    if (isIntentPeriod && intentSelect) {
      // Show the intent filter and use 4-column layout
      if (intentFilterContainer) {
        intentFilterContainer.hidden = false;
      }

      // Set all filters to s3 (25% width for 4 columns)
      [instructorFilter, dayFilter, gradeFilter].forEach(filter => {
        if (filter) {
          filter.classList.remove('s4');
          filter.classList.add('s3');
        }
      });

      // Clear existing options except the first (placeholder)
      while (intentSelect.children.length > 1) {
        intentSelect.removeChild(intentSelect.lastChild);
      }

      // Ensure first option is disabled and not selected
      if (intentSelect.firstElementChild) {
        intentSelect.firstElementChild.disabled = true;
        intentSelect.firstElementChild.selected = false;
      }

      // Get unique intent values from registrations (including null/undefined as 'none')
      const intentValues = regsToUse.map(reg => reg.reenrollmentIntent || 'none');
      const uniqueIntents = [...new Set(intentValues)];

      // Define all possible intent options with their display properties
      const allIntentOptions = [
        { value: 'none', label: 'None' },
        { value: 'keep', label: INTENT_LABELS.keep },
        { value: 'drop', label: INTENT_LABELS.drop },
        { value: 'change', label: INTENT_LABELS.change },
      ];

      // Only add options that exist in the current registrations data
      allIntentOptions
        .filter(option => uniqueIntents.includes(option.value))
        .forEach(({ value, label }) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = label;
          intentSelect.appendChild(option);
        });
    } else if (intentFilterContainer) {
      // Hide the intent filter and use 3-column layout
      intentFilterContainer.hidden = true;

      // Set remaining filters to s4 (33% width for 3 columns)
      [instructorFilter, dayFilter, gradeFilter].forEach(filter => {
        if (filter) {
          filter.classList.remove('s3');
          filter.classList.add('s4');
        }
      });
    }

    // Reinitialize Materialize select elements after all DOM changes
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
  #buildRegistrationTable(registrations) {
    // Check if we're in the intent period to show the Intent column
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const isIntentPeriod = currentPeriod?.periodType === PeriodType.INTENT;

    // Check if we're in development to show the Recurring column
    const showRecurringColumn = window.TONIC_ENV?.isDevelopment;

    const headers = [];

    // Add Recurring column first (only in dev)
    if (showRecurringColumn) {
      headers.push('Recurring');
    }

    headers.push(
      'Weekday',
      'Start Time',
      'Length',
      'Student',
      'Grade',
      'Instructor',
      'Instrument/Class'
    );

    if (isIntentPeriod) {
      headers.push('Intent');
    }

    headers.push('Contact', 'Remove');

    // Build onFilterChanges array conditionally
    const onFilterChanges = [
      {
        filterId: 'master-schedule-instructor-filter-select',
        type: 'select-multiple',
      },
      {
        filterId: 'master-schedule-day-filter-select',
        type: 'select-multiple',
      },
      {
        filterId: 'master-schedule-grade-filter-select',
        type: 'select-multiple',
      },
    ];

    // Add intent filter only during intent period
    if (isIntentPeriod) {
      onFilterChanges.push({
        filterId: 'master-schedule-intent-filter-select',
        type: 'select-multiple',
      });
    }

    return new Table(
      'master-schedule-table',
      headers,
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
          console.warn(
            `Looking for instructorId: ${instructorIdToFind}, studentId: ${studentIdToFind}`
          );
          console.warn('Available instructor IDs:', this.instructors.map(i => i.id).slice(0, 5));
          console.warn(
            'Available student IDs:',
            this.students.map(s => s.id?.value || s.id).slice(0, 5)
          );
          return '';
        }

        // Build recurring cell (only in dev/staging)
        let recurringCell = '';
        if (showRecurringColumn) {
          const hasLinkedPrevious = !!(
            registration.linkedPreviousRegistrationId?.value ||
            registration.linkedPreviousRegistrationId
          );

          if (hasLinkedPrevious) {
            recurringCell = `<td style="text-align: center;">
              <i class="material-icons green-text text-darken-2" style="font-size: 20px;">check_circle</i>
            </td>`;
          } else {
            recurringCell = `<td style="text-align: center;">—</td>`;
          }
        }

        // Build intent cell (non-editable, nullable) - only during intent period
        let intentCell = '';
        if (isIntentPeriod) {
          const intentValue = registration.reenrollmentIntent;

          if (intentValue) {
            // Map intent values to badge styles and icons
            const intentStyles = {
              keep: {
                bgClass: 'teal lighten-5',
                textClass: 'teal-text text-darken-2',
                icon: 'check_circle',
                label: INTENT_LABELS[intentValue],
              },
              drop: {
                bgClass: 'red lighten-5',
                textClass: 'red-text text-darken-2',
                icon: 'cancel',
                label: INTENT_LABELS[intentValue],
              },
              change: {
                bgClass: 'amber lighten-5',
                textClass: 'amber-text text-darken-3',
                icon: 'swap_horiz',
                label: INTENT_LABELS[intentValue],
              },
            };

            const style = intentStyles[intentValue] || {
              bgClass: 'grey lighten-4',
              textClass: 'grey-text text-darken-1',
              icon: 'help_outline',
              label: intentValue,
            };

            intentCell = `<td>
              <span class="chip ${style.bgClass} ${style.textClass}" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.9em; padding: 6px 12px; border-radius: 16px;">
                <i class="material-icons" style="font-size: 16px;">${style.icon}</i>
                ${style.label}
              </span>
            </td>`;
          } else {
            // No intent set
            intentCell = `<td class="grey-text text-lighten-1" style="text-align: center;">—</td>`;
          }
        }

        return `
                        ${recurringCell}
                        <td>${registration.day}</td>
                        <td>${formatTime(registration.startTime) || 'N/A'}</td>
                        <td>${registration.length || 'N/A'} min</td>
                        <td>${student.firstName} ${student.lastName}</td>
                        <td>${formatGrade(student.grade) || 'N/A'}</td>
                        <td>${instructor.firstName} ${instructor.lastName}</td>
                        <td>${registration.registrationType === RegistrationType.GROUP ? registration.classTitle || 'N/A' : registration.instrument || 'N/A'}</td>
                        ${intentCell}
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

        // Find the registration by ID in the registrations passed to this table
        const currentRegistration = registrations.find(
          r => (r.id?.value || r.id) === registrationId
        );
        if (!currentRegistration) return;
        if (isCopy) {
          // Get the student ID from the current registration
          const studentIdToFind =
            currentRegistration.studentId?.value || currentRegistration.studentId;

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
        const instructorSelect = document.getElementById(
          'master-schedule-instructor-filter-select'
        );
        const daySelect = document.getElementById('master-schedule-day-filter-select');
        const gradeSelect = document.getElementById('master-schedule-grade-filter-select');
        const intentSelect = document.getElementById('master-schedule-intent-filter-select');

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
        const selectedIntents = intentSelect
          ? Array.from(intentSelect.selectedOptions)
              .map(option => option.value)
              .filter(value => value !== '')
          : []; // Exclude empty placeholder values

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

        // Filter by selected intents (if any selected, otherwise show all)
        if (selectedIntents.length > 0) {
          const intentValue = registration.reenrollmentIntent;
          const actualIntentValue = intentValue || 'none';

          if (!selectedIntents.includes(actualIntentValue)) {
            return false;
          }
        }

        return true;
      },
      onFilterChanges,
      {
        pagination: true,
        itemsPerPage: 100,
        pageSizeOptions: [25, 50, 75, 100],
        rowClassFunction: registration => {
          // Return CSS class based on registration type
          return registration.registrationType === RegistrationType.GROUP
            ? 'registration-row-group'
            : 'registration-row-private';
        },
        onCountChange: (filteredCount, totalCount) => {
          const countEl = document.getElementById('master-schedule-count');
          if (countEl) {
            if (filteredCount === totalCount) {
              countEl.textContent = `Showing ${totalCount} registration${totalCount !== 1 ? 's' : ''}`;
            } else {
              countEl.textContent = `Showing ${filteredCount} of ${totalCount} registration${totalCount !== 1 ? 's' : ''}`;
            }
          }
        },
      }
    );
  }
  /**
   * Build wait list table for registrations with Rock Band class IDs (configured via environment)
   */
  #buildWaitListTable(registrations) {
    // Check if we're in development to show the Recurring column
    const showRecurringColumn = window.TONIC_ENV?.isDevelopment;

    const headers = [];

    // Add Recurring column first (only in dev)
    if (showRecurringColumn) {
      headers.push('Recurring');
    }

    headers.push('Student', 'Grade', 'Class Title', 'Timestamp', 'Contact', 'Remove');

    return new Table(
      'admin-wait-list-table',
      headers,
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

        // Build recurring cell (only in dev/staging)
        let recurringCell = '';
        if (showRecurringColumn) {
          const hasLinkedPrevious = !!(
            registration.linkedPreviousRegistrationId?.value ||
            registration.linkedPreviousRegistrationId
          );

          if (hasLinkedPrevious) {
            recurringCell = `<td style="text-align: center;">
      <i class="material-icons green-text text-darken-2" style="font-size: 20px;">check_circle</i>
    </td>`;
          } else {
            recurringCell = `<td style="text-align: center;">—</td>`;
          }
        }

        return `
                        ${recurringCell}
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

        // Find the registration by ID in the registrations passed to this table
        const currentRegistration = registrations.find(
          r => (r.id?.value || r.id) === registrationId
        );
        if (!currentRegistration) return;

        if (isCopy) {
          // Get the student ID from the current registration
          const studentIdToFind =
            currentRegistration.studentId?.value || currentRegistration.studentId;

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
        },
      }
    );
  }

  /**
   * Build parent wait list table for the current parent's children
   */
  #buildParentWaitListTable(registrations, currentParentId, tableId = 'parent-wait-list-table') {
    return new Table(
      tableId,
      ['Student', 'Grade', 'Class Title'],
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

        // Find the registration by ID in the registrations passed to this table
        const currentRegistration = registrations.find(
          r => (r.id?.value || r.id) === registrationId
        );
        if (!currentRegistration) return;

        // Get the student ID from the current registration
        const studentIdToFind =
          currentRegistration.studentId?.value || currentRegistration.studentId;

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
        },
      }
    );
  }

  /**
   *
   */
  #buildWeeklySchedule(tableId, enrollments, viewContext = 'instructor') {
    console.log(
      `🏗️ Building weekly schedule table "${tableId}" with ${enrollments.length} enrollments for ${viewContext} view`
    );

    let matchingSuccesses = 0;
    let matchingFailures = 0;

    // Add Intent column for parent view during intent period
    const headers = [
      'Weekday',
      'Start Time',
      'Length',
      'Student',
      'Grade',
      'Instructor',
      'Instrument/Class',
      'Contact',
    ];

    // Check if we're in the intent period to show the Intent column
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    const isIntentPeriod = currentPeriod?.periodType === PeriodType.INTENT;

    if (viewContext === 'parent' && isIntentPeriod) {
      headers.splice(7, 0, 'Intent'); // Insert before 'Contact'
    }

    const table = new Table(
      tableId,
      headers,
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
          console.warn(
            `   Looking for instructorId: "${enrollmentInstructorId}" (${typeof enrollmentInstructorId}), studentId: "${enrollmentStudentId}" (${typeof enrollmentStudentId})`
          );

          if (!instructor) {
            console.warn(
              `   ❌ Instructor not found. Available instructor IDs:`,
              this.instructors
                .map(i => `"${i.id?.value || i.id}" (${typeof (i.id?.value || i.id)})`)
                .slice(0, 10)
            );
          }

          if (!student) {
            console.warn(
              `   ❌ Student not found. Available student IDs:`,
              this.students
                .map(s => `"${s.id?.value || s.id}" (${typeof (s.id?.value || s.id)})`)
                .slice(0, 10)
            );
          }

          // Return empty string to skip this enrollment rather than crashing
          return '';
        } else {
          matchingSuccesses++;
        }

        // Build intent cell for parent view during intent period only
        let intentCell = '';
        if (viewContext === 'parent' && isIntentPeriod) {
          const enrollmentId = enrollment.id?.value || enrollment.id;
          const intentValue = enrollment.reenrollmentIntent;

          // Show dropdown for selecting intent
          const selectedKeep = intentValue === 'keep' ? 'selected' : '';
          const selectedDrop = intentValue === 'drop' ? 'selected' : '';
          const selectedChange = intentValue === 'change' ? 'selected' : '';
          const selectedNone = !intentValue ? 'selected' : '';

          intentCell = `<td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <select class="intent-dropdown" data-registration-id="${enrollmentId}">
                <option value="" ${selectedNone}>Select intent...</option>
                <option value="keep" ${selectedKeep}>${INTENT_LABELS.keep}</option>
                <option value="drop" ${selectedDrop}>${INTENT_LABELS.drop}</option>
                <option value="change" ${selectedChange}>${INTENT_LABELS.change}</option>
              </select>
              <span class="intent-status-indicator" data-registration-id="${enrollmentId}" style="display: none;"></span>
            </div>
          </td>`;
        }

        return `
                        <td>${enrollment.day}</td>
                        <td>${formatTime(enrollment.startTime) || 'N/A'}</td>
                        <td>${enrollment.length || 'N/A'} min</td>
                        <td>${student.firstName} ${student.lastName}</td>
                        <td>${formatGrade(student.grade) || 'N/A'}</td>
                        <td>${instructor.firstName} ${instructor.lastName}</td>
                        <td>${enrollment.registrationType === RegistrationType.GROUP ? enrollment.classTitle || enrollment.className || 'N/A' : enrollment.instrument || 'N/A'}</td>
                        ${intentCell}
                        <td>
                            <a href="#" data-registration-id="${enrollment.id?.value || enrollment.id}" data-view-context="${viewContext}">
                                <i class="material-icons copy-emails-table-icon gray-text text-darken-4">email</i>
                            </a>
                        </td>
                    `;
      },
      enrollments,
      // on click
      async event => {
        const isCopy = event.target.classList.contains('copy-emails-table-icon');
        if (!isCopy) {
          return;
        }
        event.preventDefault();

        // Get the registration ID and view context from the data attributes
        const linkElement = event.target.closest('a');
        const registrationId = linkElement?.getAttribute('data-registration-id');
        const viewContext = linkElement?.getAttribute('data-view-context') || 'instructor';

        if (!registrationId) return;

        // Find the enrollment by ID in the enrollments array
        const currentEnrollment = enrollments.find(e => (e.id?.value || e.id) === registrationId);
        if (!currentEnrollment) return;

        if (viewContext === 'parent') {
          // Parent view: show instructor emails
          const instructorIdToFind =
            currentEnrollment.instructorId?.value || currentEnrollment.instructorId;
          const instructor = this.instructors.find(x => {
            const instructorId = x.id?.value || x.id;
            return instructorId === instructorIdToFind;
          });

          if (instructor && instructor.email && instructor.email.trim()) {
            await this.#copyToClipboard(instructor.email);
          } else {
            M.toast({ html: 'No instructor email available.' });
          }
        } else {
          // Instructor view: show parent emails
          const studentIdToFind = currentEnrollment.studentId?.value || currentEnrollment.studentId;
          const fullStudent = this.students.find(x => {
            const studentId = x.id?.value || x.id;
            return studentId === studentIdToFind;
          });

          if (fullStudent && fullStudent.parentEmails && fullStudent.parentEmails.trim()) {
            await this.#copyToClipboard(fullStudent.parentEmails);
          } else {
            M.toast({ html: 'No parent email available for this student.' });
          }
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
        },
      }
    );

    console.log(
      `✅ Weekly schedule table "${tableId}" built: ${matchingSuccesses} successful matches, ${matchingFailures} failures`
    );
    return table;
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
      const getAdminPriority = employee => {
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
  /**
   *
   */
  async #requestDeleteRegistrationAsync(registrationToDeleteId) {
    // Confirm delete
    if (!confirm('Are you sure you want to delete this registration?')) {
      return;
    }

    if (!registrationToDeleteId) {
      console.error('No registration ID provided for deletion');
      M.toast({ html: 'Error: No registration ID provided for deletion.' });
      return;
    }

    try {
      this.#setAdminRegistrationLoading(true);

      console.log('Sending DELETE request for registration:', registrationToDeleteId);

      const response = await HttpService.delete(`registrations/${registrationToDeleteId}`);

      // Remove from current trimester data
      const registrationIndex = this.currentTrimesterData.registrations.findIndex(
        x => (x.id?.value || x.id) === registrationToDeleteId
      );
      if (registrationIndex !== -1) {
        this.currentTrimesterData.registrations.splice(registrationIndex, 1);
      }

      M.toast({ html: 'Registration deleted successfully.' });

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
   * Submit intent for a registration
   * @param {string} registrationId - Registration ID
   * @param {string} intent - One of: 'keep', 'drop', 'change'
   * @returns {Promise<object>} Updated registration
   * @throws {Error} If submission fails
   */
  async submitIntent(registrationId, intent) {
    // Build headers with authentication
    const headers = {
      'Content-Type': 'application/json',
    };

    if (window.AccessCodeManager) {
      const storedAuthData = window.AccessCodeManager.getStoredAuthData();
      if (storedAuthData) {
        headers['x-access-code'] = storedAuthData.accessCode;
        headers['x-login-type'] = storedAuthData.loginType;
      }
    }

    try {
      const response = await fetch(`/api/registrations/${registrationId}/intent`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({ intent }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to submit intent`);
      }

      const result = await response.json();

      console.log('Intent submission response:', result);

      // Update local registration data
      const registration = this.registrations.find(r => (r.id?.value || r.id) === registrationId);
      console.log('Found registration to update:', registration);

      if (registration && result.data) {
        console.log('Updating registration with intent:', result.data.reenrollmentIntent);
        registration.reenrollmentIntent = result.data.reenrollmentIntent;
        registration.intentSubmittedAt = result.data.intentSubmittedAt;
        registration.intentSubmittedBy = result.data.intentSubmittedBy;
      } else {
        console.warn('Could not update registration:', {
          hasRegistration: !!registration,
          hasResultData: !!result.data,
        });
      }

      // Just refresh the weekly schedule tables to show updated intent
      // Don't rebuild the entire parent form as that causes errors
      if (this.parentWeeklyScheduleTables && Array.isArray(this.parentWeeklyScheduleTables)) {
        this.parentWeeklyScheduleTables.forEach(table => {
          if (table && table.replaceRange) {
            const studentRegistrations = this.registrations.filter(r => {
              const student = this.students.find(
                s => (s.id?.value || s.id) === (r.studentId?.value || r.studentId)
              );
              return student && table.tableId.includes(student.id?.value || student.id);
            });
            table.replaceRange(studentRegistrations);
          }
        });
      }

      // Update intent banner
      this.#updateIntentBanner();

      M.toast({ html: 'Intent submitted successfully.' });
      return result;
    } catch (error) {
      console.error('Error submitting intent:', error);
      M.toast({ html: error.message || 'Error submitting intent.' });
      throw error;
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
    const formattedPhone = rawPhone && !obscurePhone ? formatPhone(rawPhone) : '';

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
  // Phase 5: Removed #getStudents() - no longer needed
  // Tabs fetch their own data via dedicated endpoints

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
      outDuration: 200,
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

    if (
      !parentTab ||
      !employeeTab ||
      !parentSection ||
      !employeeSection ||
      !parentPhoneInput ||
      !employeeCodeInput ||
      !loginButton
    ) {
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
    loginButton.addEventListener('click', e => {
      e.preventDefault();
      this.#handleLogin();
    });

    // Clear inputs when modal opens - use proper Materialize events
    modalElement.addEventListener('modal:opened', () => {
      this.#resetLoginModal(parentPhoneInput, employeeCodeInput, loginButton);
      setTimeout(() => {
        this.#focusCurrentInput();
        // Ensure validation runs after reset
        this.#validateCurrentInput();
      }, 100); // Small delay to ensure modal is fully rendered
    });

    // Reset state when modal closes
    modalElement.addEventListener('modal:closed', () => {
      this.#resetLoginModal(parentPhoneInput, employeeCodeInput, loginButton);
    });

    // Attach keyboard handlers
    ModalKeyboardHandler.attachKeyboardHandlers(modalElement, {
      allowEscape: true,
      allowEnter: true,
      onConfirm: event => {
        if (!loginButton.disabled) {
          this.#handleLogin();
        }
      },
      onCancel: event => {
        this.loginModal.close();
      },
    });
  }

  /**
   * Initialize login type switching functionality
   */
  #initLoginTypeSwitching(parentTab, employeeTab, parentSection, employeeSection) {
    // Parent tab click handler
    parentTab.addEventListener('click', e => {
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
    employeeTab.addEventListener('click', e => {
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
    phoneInput.addEventListener('input', e => {
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
    phoneInput.addEventListener('focus', e => {
      if (this.currentLoginType === 'parent') {
        setTimeout(() => {
          this.#validateCurrentInput();
        }, 50);
      }
    });

    // Handle paste events
    phoneInput.addEventListener('paste', e => {
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
    codeInput.addEventListener('input', e => {
      // Only allow numeric input, max 6 digits
      const numericValue = e.target.value.replace(/[^0-9]/g, '').substring(0, 6);
      e.target.value = numericValue;

      if (this.currentLoginType === 'employee') {
        this.#validateCurrentInput();
      }
    });

    // Handle focus events to ensure validation runs
    codeInput.addEventListener('focus', e => {
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
      } else {
        // Fallback validation - just check for 10 digits
        const digits = phoneValue.replace(/\D/g, '');
        isValid = digits.length === 10 && digits !== '0000000000';
        console.warn(
          'Phone validation function not available, using fallback:',
          phoneValue,
          '->',
          isValid
        );
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
    } else {
      loginButton.setAttribute('disabled', 'disabled');
      loginButton.classList.add('disabled');
      loginButton.style.opacity = '0.6';
      loginButton.style.pointerEvents = 'none';
      loginButton.style.cursor = 'not-allowed';
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
    // Initialize Terms of Service modal (non-dismissible)
    this.#initTermsModal();

    // Initialize Privacy Policy modal (dismissible)
    this.#initPrivacyModal();

    // Initialize Login modal (dismissible)
    this.#initLoginModal();
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
      preventScrolling: true,
    });

    // Make available globally
    window.termsModal = termsModal;
    window.termsModalInstance = this.termsModal;

    // Add custom click handler for "I Understand" button
    if (termsBtn) {
      termsBtn.addEventListener('click', e => {
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
            preventScrolling: true,
          });

          // Reattach keyboard handlers after reinitializing the modal
          const newTermsBtn = termsModal.querySelector('.modal-footer .modal-close');
          ModalKeyboardHandler.attachKeyboardHandlers(termsModal, {
            allowEscape: true,
            allowEnter: true,
            onConfirm: event => {
              if (newTermsBtn) {
                newTermsBtn.click();
              }
            },
            onCancel: event => {
              this.termsModal.close();
            },
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
      onConfirm: event => {
        // Handle Enter key press for Terms of Service
        if (termsBtn) {
          termsBtn.click();
        }
      },
      onCancel: event => {
        // Handle ESC key press for Terms of Service

        // Check if this is non-dismissible mode
        const hasAcceptedTerms = window.UserSession.hasAcceptedTermsOfService();
        if (!hasAcceptedTerms && window.termsOnConfirmationCallback) {
          // In non-dismissible mode, prevent ESC
          return;
        }

        // Allow normal ESC behavior
        this.termsModal.close();
      },
    });
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
      dismissible: true, // Allow normal dismissal behavior
      opacity: 0.5, // Standard opacity
      preventScrolling: true,
    });

    // Make available globally
    window.privacyModal = privacyModal;
    window.privacyModalInstance = this.privacyModal;

    // Attach keyboard handlers
    ModalKeyboardHandler.attachKeyboardHandlers(privacyModal, {
      allowEscape: true,
      allowEnter: true,
      onConfirm: event => {
        // Handle Enter key press for Privacy Policy - trigger button click
        if (privacyBtn) {
          privacyBtn.click();
        } else {
          this.privacyModal.close();
        }
      },
      onCancel: event => {
        // Handle ESC key press for Privacy Policy
        this.privacyModal.close();
      },
    });
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

    // Check if there's a stored access code
    const storedCode = window.AccessCodeManager.getStoredAccessCode();

    if (storedCode) {
      // Change button text to "Change User" if access code exists
      const buttonTextNode = loginButton.childNodes[loginButton.childNodes.length - 1];
      if (buttonTextNode && buttonTextNode.nodeType === Node.TEXT_NODE) {
        buttonTextNode.textContent = 'Change User';
      }
    } else {
      // Ensure button text is "Login" if no stored code
      const buttonTextNode = loginButton.childNodes[loginButton.childNodes.length - 1];
      if (buttonTextNode && buttonTextNode.nodeType === Node.TEXT_NODE) {
        buttonTextNode.textContent = 'Login';
      }
    }
  }

  /**
   * Handle login form submission (public method for modal event handlers)
   */
  async handleLogin() {
    let loginValue = '';
    const loginType = this.currentLoginType;

    if (loginType === 'parent') {
      const phoneInput = document.getElementById('parent-phone-input');
      const phoneValue = phoneInput.value.trim();

      // Validate phone number
      if (!window.isValidPhoneNumber(phoneValue)) {
        M.toast({
          html: 'Please enter a valid 10-digit phone number.',
          classes: 'red darken-1',
          displayLength: 3000,
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
          displayLength: 3000,
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
    // Delegate to public method
    await this.handleLogin();
  }

  async #attemptLoginWithCode(
    loginValue,
    loginType,
    onSuccessfulLogin = null,
    onFailedLogin = null
  ) {
    console.log('Login attempt with value:', loginValue, 'type:', loginType);

    try {
      this.#setPageLoading(true);

      // Send login data to backend
      const authenticatedUser = await HttpService.post(ServerFunctions.authenticateByAccessCode, {
        accessCode: loginValue,
        loginType: loginType,
      });

      // Check if authentication was successful (non-null response)
      const loginSuccess = authenticatedUser !== null && !authenticatedUser?.systemError;

      if (loginSuccess) {
        // Save the login value securely in the browser
        window.AccessCodeManager.saveAccessCodeSecurely(loginValue, loginType);

        // Update login button state to show "Change User"
        this.#updateLoginButtonState();

        onSuccessfulLogin?.();

        // Clear cached data and reset initialization flags for new user
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

        // Determine default role to click (admin -> instructor -> parent)
        let roleToClick = null;
        if (authenticatedUser.admin) {
          roleToClick = 'admin';

          // For admin users, we'll explicitly show admin tabs and click the first one
        } else if (authenticatedUser.instructor) {
          roleToClick = 'instructor';
        } else if (authenticatedUser.parent) {
          roleToClick = 'parent';
        }

        // Load user data and navigate to the appropriate section
        await this.loadUserData(authenticatedUser, roleToClick);
      } else {
        // Check if it's a system error or just no match found
        if (authenticatedUser?.systemError && authenticatedUser?.error) {
          // Server-side system error (Google Sheets, DB connection, etc.)
          M.toast({
            html: authenticatedUser.error,
            classes: 'red darken-1',
            displayLength: 4000,
          });
        } else {
          // No match found - client-side validation message
          const isPhoneNumber = loginValue.length === 10 && /^\d{10}$/.test(loginValue);
          const errorMessage = isPhoneNumber ? 'Invalid phone number' : 'Invalid access code';
          M.toast({
            html: errorMessage,
            classes: 'red darken-1',
            displayLength: 3000,
          });
        }
        onFailedLogin?.();
      }
    } catch (error) {
      console.error('Login error:', error);
      M.toast({
        html: 'Login failed. Please try again.',
        classes: 'red darken-1',
        displayLength: 4000,
      });
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
    } catch (error) {
      console.error('❌ Error resetting UI state:', error);
    }
  }

  /**
   * Show the login button after app configuration loads
   */
  #showLoginButton() {
    try {
      const loginButtonContainer = document.getElementById('login-button-container');
      if (loginButtonContainer) {
        loginButtonContainer.hidden = false;
      }
    } catch (error) {
      console.error('❌ Error showing login button:', error);
    }
  }

  /**
   * Show Terms of Service modal with confirmation callback
   * @param {Function} onConfirmation - Callback to execute when user accepts terms
   */
  #showTermsOfService(onConfirmation) {
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
        onCloseStart: function () {
          return false; // Prevent closing
        },
      });

      // Add keyboard event prevention for non-dismissible mode (only block ESC, allow Enter)
      const keydownHandler = e => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
        // Allow Enter key to work for button activation
      };

      // Add click prevention for non-dismissible mode (only prevent overlay clicks)
      const clickHandler = e => {
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
        allowEnter: true, // Allow Enter for button activation
        onConfirm: event => {
          if (termsBtn) {
            termsBtn.click();
          }
        },
        onCancel: event => {
          // Should not be called since allowEscape is false
        },
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
