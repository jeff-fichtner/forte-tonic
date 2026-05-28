/**
 * Modern ES Module entry point for Tonic
 * This file uses ES module imports to load all required dependencies
 */

// Import all required modules
import './constants.js';
import { HttpService } from './data/httpService.js';
import '/models/shared/responses/authenticatedUserResponse.js';
import '/models/shared/admin.js';
import '/models/shared/class.js';
import '/models/shared/instructor.js';
import '/models/shared/parent.js';
import '/models/shared/registration.js';
import '/models/shared/room.js';
import '/models/shared/student.js';
import './components/select.js';
import './components/table.js';
import './workflows/adminRegistrationForm.js';
import './workflows/parentRegistrationForm.js';
import './utilities/domHelpers.js';
import './utilities/durationHelpers.js';
import './utilities/promiseHelpers.js';
import './utilities/phoneHelpers.js';
import './utilities/modalKeyboardHandler.js';
import './utilities/classManager.js';
import './extensions/numberExtensions.js';
import './extensions/stringExtensions.js';
import { NavTabs } from './components/navTabs.js';
import { FeedbackManager } from './feedback.js';
import * as LoginModal from './auth/loginModal.js';
import * as TermsModal from './auth/termsModal.js';
import { AccessCodeManager, UserSession } from './auth/session.js';
import { initializeVersionDisplay, loadDirectorInfo } from './startup/versionAndDirector.js';
import { DomHelpers } from './utilities/domHelpers.js';
import { Sections, ServerFunctions } from './constants.js';
import {
  AppConfigurationResponse,
  AppConfigurationResponseData,
} from '../../models/shared/responses/appConfigurationResponse.js';
import { PeriodType } from '/utils/values/periodType.js';

// Tab-based architecture
import { setPageLoading } from './ui/pageLoading.js';
import { TabController } from './core/tabController.js';
import { getTabController, setTabController } from './core/tabControllerInstance.js';
import { EmployeeDirectoryTab } from './tabs/employeeDirectoryTab.js';
import { InstructorWeeklyScheduleTab } from './tabs/instructorWeeklyScheduleTab.js';
import { ParentContactTab } from './tabs/parentContactTab.js';
import { ParentWeeklyScheduleTab } from './tabs/parentWeeklyScheduleTab.js';
import { ParentRegistrationTab } from './tabs/parentRegistrationTab.js';
import { AdminWaitListTab } from './tabs/adminWaitListTab.js';
import { AdminMasterScheduleTab } from './tabs/adminMasterScheduleTab.js';
import { AdminRegistrationTab } from './tabs/adminRegistrationTab.js';

// ---------------------------------------------------------------------------
// Local type aliases
// ---------------------------------------------------------------------------

/** Authenticated user shape returned from HttpService.post (raw JSON, not model class) */
interface AuthenticatedUser {
  email?: string;
  admin?: Record<string, unknown> | null;
  instructor?: Record<string, unknown> | null;
  parent?: Record<string, unknown> | null;
  systemError?: boolean;
  error?: string;
  [key: string]: unknown;
}

/** Shape of the /api/admin/clear-cache response */
interface ClearCacheResponse {
  clearedBy: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Module-level state (replaces ViewModel instance fields)
// ---------------------------------------------------------------------------

let currentUser: AuthenticatedUser | null = null;
let navTabs: NavTabs | null = null;
let feedbackManager: FeedbackManager | null = null;
let roleToClick: string | null = null;

// ---------------------------------------------------------------------------
// Plain module-level functions (absorbed from ViewModel)
// ---------------------------------------------------------------------------

function showMaintenanceMode(message: string | null): void {
  const overlay = document.getElementById('maintenance-mode-overlay');
  const messageText = document.getElementById('maintenance-message-text');

  if (overlay) {
    if (message && messageText) {
      messageText.textContent = message;
    }

    overlay.classList.add('active');

    const loadingContainer = document.getElementById('page-loading-container');
    const pageContent = document.getElementById('page-content');
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (pageContent) pageContent.hidden = true;
  }
}

function showConfigError(): void {
  const pageContent = document.getElementById('page-content');
  const loadingContainer = document.getElementById('page-loading-container');
  if (loadingContainer) loadingContainer.style.display = 'none';
  if (pageContent) {
    pageContent.hidden = false;
    pageContent.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; text-align: center; padding: 24px;">
        <i class="material-icons" style="font-size: 48px; color: #c62828; margin-bottom: 16px;">error_outline</i>
        <h5 style="color: #c62828; margin-bottom: 8px;">Unable to Load Application</h5>
        <p style="color: #555; margin-bottom: 24px;">Unable to load application configuration. Please reload the page.</p>
        <button class="btn red darken-2" onclick="window.location.reload()">Reload</button>
      </div>
    `;
  }
}

function hideMaintenanceMode(): void {
  const overlay = document.getElementById('maintenance-mode-overlay');
  const pageContent = document.getElementById('page-content');

  if (overlay) {
    overlay.classList.remove('active');
    if (pageContent) pageContent.hidden = false;
  }
}

function updateEnrollmentBanner(): void {
  const currentPeriod = UserSession.getCurrentPeriod();
  const banner = document.getElementById('enrollment-period-banner');
  const bannerText = document.getElementById('enrollment-banner-text');

  if (!banner || !bannerText) {
    return;
  }

  if (!currentPeriod) {
    banner.style.display = 'none';
    return;
  }

  if (currentPeriod.periodType === PeriodType.PRIORITY_ENROLLMENT) {
    banner.style.display = 'block';
    banner.className = 'enrollment-banner priority';
    bannerText.textContent = 'Priority Enrollment is now open for returning families';
  } else if (currentPeriod.periodType === PeriodType.OPEN_ENROLLMENT) {
    banner.style.display = 'block';
    banner.className = 'enrollment-banner open';
    bannerText.textContent = 'Open Enrollment is now available for all families';
  } else if (currentPeriod.periodType === PeriodType.INTENT) {
    banner.style.display = 'none';
  } else {
    banner.style.display = 'none';
  }
}

function resetUIState(): void {
  try {
    LoginModal.closeIfOpen();

    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    const container = document.querySelector('.container');
    if (container) {
      (container as HTMLElement).scrollTop = 0;
    }

    const pageContent = document.getElementById('page-content');
    if (pageContent) {
      pageContent.scrollTop = 0;
      pageContent.style.overflow = '';
      pageContent.style.overflowY = '';
      pageContent.style.height = '';
      pageContent.style.position = '';
    }

    document.body.style.overflow = '';
    document.body.style.overflowY = '';
    document.body.style.height = '';
    document.body.style.position = '';

    document.documentElement.style.overflow = '';
    document.documentElement.style.overflowY = '';
    document.documentElement.style.height = '';

    const fixedElements = document.querySelectorAll('[style*="position: fixed"]');
    fixedElements.forEach((element: Element) => {
      if ((element as HTMLElement).id === 'admin-selected-lesson-display') {
        (element as HTMLElement).style.display = 'none';
      }
    });

    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');

    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach((overlay: Element) => overlay.remove());
  } catch (error: unknown) {
    console.error('❌ Error resetting UI state:', error);
  }
}

async function resetInitializationFlags(): Promise<void> {
  if (getTabController()) {
    try {
      await getTabController()!.cleanup();
    } catch (error: unknown) {
      console.error('Error unloading tab during user switch:', error);
    }
  }

  resetUIState();
}

async function loadUserData(
  user: AuthenticatedUser | null,
  roleToClickArg: string | null = null
): Promise<void> {
  if (!user || (!user.admin && !user.instructor && !user.parent)) {
    return;
  }

  const pageContent = document.getElementById('page-content');
  if (pageContent) pageContent.hidden = false;

  await DomHelpers.waitForDocumentReadyAsync();

  M.AutoInit();

  currentUser = user;

  let defaultSection: string | undefined;
  if (user.admin) {
    defaultSection = Sections.ADMIN;
  }
  if (user.instructor) {
    defaultSection = Sections.INSTRUCTOR;
  }
  if (user.parent) {
    defaultSection = Sections.PARENT;
  }

  if (navTabs) {
    navTabs.destroy();
  }
  navTabs = new NavTabs(defaultSection as string);
  navTabs.setCurrentUser(currentUser as Record<string, unknown>);
  setPageLoading(false);

  if (!feedbackManager) {
    feedbackManager = new FeedbackManager({ currentUser, navTabs });
  }

  roleToClick = roleToClickArg;

  if (roleToClickArg && getTabController()) {
    const navLink = document.querySelector<HTMLAnchorElement>(
      `a[data-section="${roleToClickArg}"]`
    );
    if (navLink) {
      navLink.click();
    }
  }

  updateEnrollmentBanner();

  setTimeout(() => {
    resetUIState();
  }, 300);
}

// ---------------------------------------------------------------------------
// Auto-login helper
// ---------------------------------------------------------------------------

async function attemptAutoLogin(accessCode: string, loginType: string): Promise<void> {
  setPageLoading(true);

  const authResult = await HttpService.post<AuthenticatedUser>(
    ServerFunctions.authenticateByAccessCode,
    {
      accessCode,
      loginType,
    }
  );

  const authenticatedUser = authResult.ok ? authResult.data : null;
  const loginSuccess = authenticatedUser !== null && !authenticatedUser?.systemError;

  if (loginSuccess) {
    AccessCodeManager.saveAccessCodeSecurely(accessCode, loginType);
    LoginModal.updateLoginButtonState(LoginModal.extractFirstName(authenticatedUser));

    await resetInitializationFlags();
    currentUser = null;

    let role: string | null = null;
    if (authenticatedUser!.admin) {
      role = 'admin';
    } else if (authenticatedUser!.instructor) {
      role = 'instructor';
    } else if (authenticatedUser!.parent) {
      role = 'parent';
    }

    await loadUserData(authenticatedUser, role);
    initTabController();
  } else {
    if (authenticatedUser?.systemError && authenticatedUser?.error) {
      M.toast({
        html: authenticatedUser.error as string,
        classes: 'red darken-1',
        displayLength: 4000,
      });
    } else if (!authResult.ok) {
      M.toast({
        html: authResult.error.message || 'Login failed. Please try again.',
        classes: 'red darken-1',
        displayLength: 4000,
      });
    } else {
      const isPhoneNumber = accessCode.length === 10 && /^\d{10}$/.test(accessCode);
      M.toast({
        html: isPhoneNumber ? 'Invalid phone number' : 'Invalid access code',
        classes: 'red darken-1',
        displayLength: 3000,
      });
    }

    setPageLoading(false);
    LoginModal.open();
  }
}

// ---------------------------------------------------------------------------
// TabController initialization
// ---------------------------------------------------------------------------

function initTabController(): void {
  const tabController = new TabController();
  tabController.initialize();

  tabController.registerTab('instructor-forte-directory', new EmployeeDirectoryTab());
  tabController.registerTab('parent-contact-us', new ParentContactTab());
  tabController.registerTab('admin-wait-list', new AdminWaitListTab());
  tabController.registerTab('instructor-weekly-schedule', new InstructorWeeklyScheduleTab());
  tabController.registerTab('parent-weekly-schedule', new ParentWeeklyScheduleTab());
  tabController.registerTab('admin-master-schedule', new AdminMasterScheduleTab());
  tabController.registerTab('parent-registration', new ParentRegistrationTab());
  tabController.registerTab('admin-registration', new AdminRegistrationTab());

  setTabController(tabController);

  if (roleToClick) {
    const navLink = document.querySelector<HTMLAnchorElement>(`a[data-section="${roleToClick}"]`);
    if (navLink) {
      navLink.click();
    }
  }
}

// ---------------------------------------------------------------------------
// Application initialization
// ---------------------------------------------------------------------------

async function initializeApplication(): Promise<void> {
  try {
    // Register session expiry handler — HttpService calls this on 401 responses
    HttpService.onSessionExpired(() => {
      AccessCodeManager.clearStoredAccessCode();
      UserSession.clearAppConfig();
      LoginModal.init(loadUserData);
      TermsModal.init();
      LoginModal.open();
    });

    // Initialize login and terms modals
    LoginModal.init(loadUserData);
    TermsModal.init();

    // Get application configuration
    const configResult = await HttpService.get<AppConfigurationResponseData>(
      ServerFunctions.getAppConfiguration
    );

    const appConfig = configResult.ok ? new AppConfigurationResponse(configResult.data) : null;

    if (!appConfig) {
      showConfigError();
      return;
    }

    UserSession.saveAppConfig(appConfig);

    const hasOverride = sessionStorage.getItem('maintenance_mode_override') === 'true';
    if (appConfig.maintenanceMode && !hasOverride) {
      showMaintenanceMode(appConfig.maintenanceMessage);
      return;
    }

    LoginModal.updateLoginButtonState();
    LoginModal.showLoginButton();

    exposeConsoleHelpers();
    loadDirectorInfo();

    const storedAuthData = AccessCodeManager.getStoredAuthData();
    if (storedAuthData) {
      await attemptAutoLogin(storedAuthData.accessCode, storedAuthData.loginType);
      return;
    }

    setPageLoading(false);

    const hasAcceptedTermsOfService = UserSession.hasAcceptedTermsOfService();
    if (!hasAcceptedTermsOfService) {
      TermsModal.showIfNeeded(() => {
        LoginModal.open();
      });
      initTabController();
      return;
    }

    LoginModal.open();
    initTabController();
  } catch (error) {
    console.error('✗ Error initializing application:', error);

    const message = (error as Error).message;
    if (message.includes('authorize') || message.includes('authenticated')) {
      alert('Please authorize the application to access your account.');
    } else {
      alert(
        `Failed to initialize the application: ${message}

Please refresh the page and try again.`
      );
    }

    throw error;
  }
}

function exposeConsoleHelpers(): void {
  window.overrideMaintenanceMode = function (): boolean {
    try {
      sessionStorage.setItem('maintenance_mode_override', 'true');
      hideMaintenanceMode();
      LoginModal.init(loadUserData);
      TermsModal.init();
      LoginModal.updateLoginButtonState();
      LoginModal.showLoginButton();
      setPageLoading(false);

      const hasAcceptedTerms = UserSession.hasAcceptedTermsOfService();
      if (!hasAcceptedTerms) {
        TermsModal.showIfNeeded(() => {
          LoginModal.open();
        });
      } else {
        const stored = AccessCodeManager.getStoredAuthData();
        if (stored) {
          attemptAutoLogin(stored.accessCode, stored.loginType);
        } else {
          LoginModal.open();
        }
      }

      return true;
    } catch (error: unknown) {
      console.error('✗ Failed to override maintenance mode:', error);
      return false;
    }
  };

  window.clearServerCache = async function (): Promise<boolean> {
    try {
      console.log('🧹 Clearing server cache...');
      const result = await HttpService.post<ClearCacheResponse>('admin/clear-cache', {});
      if (!result.ok) {
        console.error('✗ Error clearing server cache:', result.error.message);
        return false;
      }
      const cacheData = result.data;
      console.log('✓ Server cache cleared successfully by:', cacheData.clearedBy);
      console.log('  Message:', cacheData.message);
      return true;
    } catch (error) {
      console.error('✗ Error clearing server cache:', error);
      return false;
    }
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  try {
    try {
      await initializeVersionDisplay();
    } catch (error) {
      console.warn('Version display initialization failed:', error);
    }

    await initializeApplication();
  } catch (error) {
    console.error('Fatal error starting application:', error);
  }
}

main();
