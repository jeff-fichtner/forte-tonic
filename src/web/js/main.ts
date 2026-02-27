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
import './components/navTabs.js';
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
import './extensions/durationExtensions.js';
import './extensions/numberExtensions.js';
import './extensions/stringExtensions.js';
import { ViewModel } from './viewModel.js';
import type { AppConfigurationResponse, Period } from '../../models/shared/responses/appConfigurationResponse.js';

// Tab-based architecture
import { TabController } from './core/tabController.js';
import { EmployeeDirectoryTab } from './tabs/employeeDirectoryTab.js';
import { InstructorWeeklyScheduleTab } from './tabs/instructorWeeklyScheduleTab.js';
import { ParentContactTab } from './tabs/parentContactTab.js';
import { ParentWeeklyScheduleTab } from './tabs/parentWeeklyScheduleTab.js';
import { ParentRegistrationTab } from './tabs/parentRegistrationTab.js';
import { AdminWaitListTab } from './tabs/adminWaitListTab.js';
import { AdminMasterScheduleTab } from './tabs/adminMasterScheduleTab.js';
import { AdminRegistrationTab } from './tabs/adminRegistrationTab.js';

// ---------------------------------------------------------------------------
// Local type aliases (mirrors of non-exported interfaces from global.d.ts)
// ---------------------------------------------------------------------------

/** Local alias matching AccessCodeManagerType from global.d.ts */
interface AccessCodeManagerShape {
  _accessCodeCache: { accessCode: string; loginType: string } | null;
  saveAccessCodeSecurely(accessCode: string, loginType?: string): void;
  generateSessionId(): string;
  getStoredAccessCode(): string | null;
  getStoredAuthData(): { accessCode: string; loginType: string } | null;
  clearStoredAccessCode(): boolean;
}

/** Local alias matching UserSessionType from global.d.ts */
interface UserSessionShape {
  appConfig: AppConfigurationResponse | null;
  saveAppConfig(config: AppConfigurationResponse): void;
  getAppConfig(): AppConfigurationResponse | null;
  getCurrentPeriod(): Period | undefined;
  getNextPeriod(): Period | undefined;
  clearAppConfig(): void;
  hasAcceptedTermsOfService(): boolean;
  acceptTermsOfService(): void;
  unacceptTermsOfService(): void;
}

/** Shape of the /api/version response */
interface VersionInfo {
  number: string;
  environment: string;
  gitCommit: string;
  gitTag?: string;
  buildDate: string;
  displayVersion?: boolean;
}

/** Shape of the /api/admin/clear-cache response */
interface ClearCacheResponse {
  clearedBy: string;
  message: string;
}


/**
 * Access code manager for secure storage and retrieval of access codes
 */
const AccessCodeManager: AccessCodeManagerShape = {
  // Private cache for memory fallback
  _accessCodeCache: null as { accessCode: string; loginType: string } | null,

  /**
   * Save access code securely in the browser
   * @param {string} accessCode - The access code to save
   * @param {string} loginType - The type of login ('parent' or 'employee')
   */
  saveAccessCodeSecurely(accessCode: string, loginType: string = 'employee'): void {
    try {
      const secureData = {
        accessCode: accessCode,
        loginType: loginType,
        sessionId: this.generateSessionId(),
      };

      const encodedData = btoa(JSON.stringify(secureData));
      localStorage.setItem('forte_auth_session', encodedData);
    } catch (error) {
      console.error('Failed to save access code securely:', error);
      this._accessCodeCache = {
        accessCode: accessCode,
        loginType: loginType,
      };
    }
  },

  /**
   * Generate a unique session ID
   * @returns {string} A unique session identifier
   */
  generateSessionId(): string {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Retrieve the securely stored access code
   * @returns {string|null} The stored access code or null if not found
   */
  getStoredAccessCode(): string | null {
    const authData = this.getStoredAuthData();
    return authData?.accessCode || null;
  },

  /**
   * Retrieve the securely stored access code and login type
   * @returns {object | null} Object with accessCode and loginType, or null if not found
   */
  getStoredAuthData(): { accessCode: string; loginType: string } | null {
    try {
      const encodedData = localStorage.getItem('forte_auth_session');
      if (!encodedData) {
        if (!this._accessCodeCache) {
          return null;
        }
        if (!this._accessCodeCache.loginType) {
          console.error('loginType not found in access code cache');
          return null;
        }
        return {
          accessCode: this._accessCodeCache.accessCode,
          loginType: this._accessCodeCache.loginType,
        };
      }

      const secureData = JSON.parse(atob(encodedData));

      if (!secureData.loginType) {
        console.error('loginType not found in stored auth data');
        return null;
      }

      return {
        accessCode: secureData.accessCode,
        loginType: secureData.loginType,
      };
    } catch (error) {
      console.error('Failed to retrieve stored auth data:', error);
      if (!this._accessCodeCache) {
        return null;
      }
      if (!this._accessCodeCache.loginType) {
        console.error('loginType not found in access code cache');
        return null;
      }
      return {
        accessCode: this._accessCodeCache.accessCode,
        loginType: this._accessCodeCache.loginType,
      };
    }
  },

  /**
   * Clear the stored access code (for logout)
   */
  clearStoredAccessCode(): boolean {
    try {
      localStorage.removeItem('forte_auth_session');
      this._accessCodeCache = null;
      return true;
    } catch (error) {
      console.error('Failed to clear stored access code:', error);
      return false;
    }
  },
};

/**
 * User session storage for current user data
 */
const UserSession: UserSessionShape = {
  appConfig: null as AppConfigurationResponse | null,

  saveAppConfig(config: AppConfigurationResponse): void {
    this.appConfig = config;
  },

  getAppConfig(): AppConfigurationResponse | null {
    return this.appConfig;
  },

  getCurrentPeriod(): Period | undefined {
    return this.appConfig?.currentPeriod ?? undefined;
  },

  getNextPeriod(): Period | undefined {
    return this.appConfig?.nextPeriod ?? undefined;
  },

  clearAppConfig(): void {
    this.appConfig = null;
  },

  /**
   * Check if the user has accepted the Terms of Service
   * @returns {boolean} True if terms have been accepted
   */
  hasAcceptedTermsOfService(): boolean {
    return localStorage.getItem('hasAcceptedTermsOfService') === 'true';
  },

  /**
   * Mark that the user has accepted the Terms of Service
   */
  acceptTermsOfService(): void {
    localStorage.setItem('hasAcceptedTermsOfService', 'true');
  },

  /**
   * Mark that the user has not accepted the Terms of Service (for testing/reset purposes)
   */
  unacceptTermsOfService(): void {
    localStorage.removeItem('hasAcceptedTermsOfService');
  },
};

/**
 * Load director information from app config and populate HTML elements
 */
function loadDirectorInfo(): void {
  const director = UserSession.getAppConfig()?.director;

  if (!director) {
    return;
  }

  const nameElement = document.getElementById('director-name');
  const emailElement = document.getElementById('director-email');
  const phoneElement = document.getElementById('director-phone');

  if (nameElement) nameElement.textContent = director.fullName;
  if (emailElement) emailElement.textContent = director.displayEmail || director.email;
  if (phoneElement) phoneElement.textContent = director.displayPhone || director.phone || 'N/A';
}

/**
 * Initialize application
 */
async function initializeApplication(): Promise<void> {
  try {
    // Log version information
    try {
      const versionInfo = (await HttpService.get('version')) as VersionInfo;
      console.log(
        `Tonic v${versionInfo.number} (${versionInfo.environment}) [${versionInfo.gitCommit.substring(0, 7)}]`
      );
    } catch (error) {
      console.warn('Could not fetch version info:', error);
    }

    // Make UserSession and AccessCodeManager available globally before ViewModel initialization
    window.UserSession = UserSession;
    window.AccessCodeManager = AccessCodeManager;

    // Initialize the main ViewModel
    const viewModel = new ViewModel();
    await viewModel.initializeAsync();

    // Store globally for debugging and other scripts
    window.viewModel = viewModel as unknown as typeof window.viewModel;

    // Initialize TabController for tab-based architecture
    const tabController = new TabController();
    tabController.initialize();

    // Register tabs
    const employeeDirectoryTab = new EmployeeDirectoryTab();
    tabController.registerTab('instructor-forte-directory', employeeDirectoryTab);

    const parentContactTab = new ParentContactTab();
    tabController.registerTab('parent-contact-us', parentContactTab);

    const adminWaitListTab = new AdminWaitListTab();
    tabController.registerTab('admin-wait-list', adminWaitListTab);

    const instructorWeeklyScheduleTab = new InstructorWeeklyScheduleTab();
    tabController.registerTab('instructor-weekly-schedule', instructorWeeklyScheduleTab);

    const parentWeeklyScheduleTab = new ParentWeeklyScheduleTab();
    tabController.registerTab('parent-weekly-schedule', parentWeeklyScheduleTab);

    const adminMasterScheduleTab = new AdminMasterScheduleTab();
    tabController.registerTab('admin-master-schedule', adminMasterScheduleTab);

    const parentRegistrationTab = new ParentRegistrationTab();
    tabController.registerTab('parent-registration', parentRegistrationTab);

    const adminRegistrationTab = new AdminRegistrationTab();
    tabController.registerTab('admin-registration', adminRegistrationTab);

    // Make TabController available globally for NavTabs integration
    window.tabController = tabController;

    // Now that TabController is ready, auto-click the default section if specified
    const roleToClick = (viewModel as unknown as Record<string, unknown>).roleToClick as string | null;
    if (roleToClick) {
      const navLink = document.querySelector<HTMLAnchorElement>(`a[data-section="${roleToClick}"]`);
      if (navLink) {
        navLink.click();
      }
    }

    // Expose maintenance mode override function globally
    // Usage: window.overrideMaintenanceMode() in browser console
    window.overrideMaintenanceMode = function (): boolean {
      if (viewModel && typeof viewModel.overrideMaintenanceMode === 'function') {
        return viewModel.overrideMaintenanceMode();
      } else {
        console.error('✗ Override function not available. Please refresh and try again.');
        return false;
      }
    };

    // Expose server cache clearing function globally (admin only)
    // Usage: window.clearServerCache() in browser console
    // Uses the already-authenticated user's access code from the x-access-code header
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

    // Load director info for Terms of Service display
    // This is a non-critical operation, so we don't await it
    loadDirectorInfo();
  } catch (error) {
    console.error('✗ Error initializing application:', error);

    // Show user-friendly error messages
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

/**
 * Environment constants (must match backend NodeEnv values)
 */
const NodeEnv = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
  TEST: 'test',
};

/**
 * Initialize version display for staging environments
 */
async function initializeVersionDisplay(): Promise<void> {
  try {
    const versionInfo = (await HttpService.get('version')) as VersionInfo;

    // Set global environment information for use throughout the application
    window.TONIC_ENV = {
      environment: versionInfo.environment,
      isDevelopment: versionInfo.environment === NodeEnv.DEVELOPMENT,
      isStaging: versionInfo.environment === NodeEnv.STAGING,
      isProduction: versionInfo.environment === NodeEnv.PRODUCTION,
      version: versionInfo.number,
      gitCommit: versionInfo.gitCommit,
      // Export NodeEnv constants for use throughout the app
      NodeEnv,
    };

    if (versionInfo.displayVersion) {
      const versionDisplay = document.getElementById('version-display');
      const versionNumber = document.getElementById('version-number-text');
      const versionEnv = document.getElementById('version-env');
      const versionCommit = document.getElementById('version-commit');

      if (versionDisplay && versionNumber && versionEnv && versionCommit) {
        versionNumber.textContent = versionInfo.number;
        versionEnv.textContent = versionInfo.environment.toUpperCase();
        versionCommit.textContent = versionInfo.gitCommit.substring(0, 7);

        versionDisplay.style.display = 'block';

        // Add click handler to copy commit ID and show detailed version info
        versionDisplay.addEventListener('click', async () => {
          // Copy commit ID to clipboard
          try {
            await navigator.clipboard.writeText(versionInfo.gitCommit);
          } catch (error) {
            console.warn('Failed to copy commit ID:', error);
          }

          const details = `
Version: ${versionInfo.number}
${versionInfo.gitTag ? `Git Tag: ${versionInfo.gitTag}\n` : ''}Environment: ${versionInfo.environment}
Build Date: ${new Date(versionInfo.buildDate).toLocaleString()}
Git Commit: ${versionInfo.gitCommit}

✓ Commit ID copied to clipboard!
          `.trim();

          alert(details);
        });
      }
    }
  } catch (error) {
    // Don't throw - version display is not critical
  }
}

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    // Initialize version info first so window.TONIC_ENV is available during app initialization
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
