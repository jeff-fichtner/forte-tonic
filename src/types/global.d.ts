/**
 * Global type declarations for browser-side globals
 *
 * These objects are attached to `window` in various frontend modules
 * and accessed globally throughout the frontend codebase.
 */

import type { ClassManager } from '../web/js/utilities/classManager.js';
import type { ModalKeyboardHandler } from '../web/js/utilities/modalKeyboardHandler.js';
import type { HttpService } from '../web/js/data/httpService.js';
import type { Duration, DateTime, DateHelpers } from '../utils/nativeDateTimeHelpers.js';
import type {
  AppConfigurationResponse,
  Period,
} from '../models/shared/responses/appConfigurationResponse.js';
import type { TabController } from '../web/js/core/tabController.js';
import type { Table } from '../web/js/components/table.js';
import type { Select } from '../web/js/components/select.js';
import type { NavTabs } from '../web/js/components/navTabs.js';
import type { DomHelpers } from '../web/js/utilities/domHelpers.js';
import type { DurationHelpers } from '../web/js/utilities/durationHelpers.js';
import type { PromiseHelpers } from '../web/js/utilities/promiseHelpers.js';

interface AccessCodeManagerType {
  _accessCodeCache: { accessCode: string; loginType: string } | null;
  saveAccessCodeSecurely(accessCode: string, loginType?: string): void;
  generateSessionId(): string;
  getStoredAccessCode(): string | null;
  getStoredAuthData(): { accessCode: string; loginType: string; sessionId?: string } | null;
  clearStoredAccessCode(): void;
}

interface UserSessionType {
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

interface TonicEnv {
  environment: string;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  version: string;
  gitCommit: string;
  NodeEnv: Record<string, string>;
}

declare global {

  // Prototype extension declarations (T003)
  interface String {
    capitalize(): string;
  }

  interface Number {
    formatGrade(): string;
  }

  interface Window {
    // Core framework
    M: Materialize;

    // Application singletons
    ModalKeyboardHandler: typeof ModalKeyboardHandler;
    AccessCodeManager: AccessCodeManagerType;
    UserSession: UserSessionType;
    ClassManager: typeof ClassManager;
    HttpService: typeof HttpService;

    // UI components
    Table: typeof Table;
    Select: typeof Select;
    NavTabs: typeof NavTabs;

    // Utilities
    DomHelpers: typeof DomHelpers;
    DurationHelpers: typeof DurationHelpers;
    PromiseHelpers: typeof PromiseHelpers;

    // Date/time (from constants.ts)
    DateTime: typeof DateTime;
    Duration: typeof Duration;
    DateHelpers: typeof DateHelpers;

    // Constants (from constants.ts)
    Sections: Record<string, string>;
    ServerFunctions: Record<string, string>;
    RegistrationType: Record<string, string>;
    FORTE_PROGRAM_EMAIL: string;
    FORTE_PROGRAM_PHONE: string;
    UserType: Readonly<{ ADMIN: string; INSTRUCTOR: string; PARENT: string }>;

    // Phone helpers (from phoneHelpers.ts)
    formatPhone: (phoneNumber: string) => string;
    isValidUnformattedPhone: (phoneNumber: string) => boolean;
    stripPhoneFormatting: (phoneNumber: string) => string;
    formatPhoneAsTyped: (value: string) => string;
    isValidPhoneNumber: (phoneNumber: string) => boolean;

    // Instance globals (assigned at runtime in main.ts)
    tabController: TabController;

    // Modal instances (assigned at runtime in viewModel.ts)
    loginModal: Element;
    loginModalInstance: MaterializeModalInstance;
    termsModal: Element;
    termsModalInstance: MaterializeModalInstance;
    privacyModal: Element;
    privacyModalInstance: MaterializeModalInstance;
    termsOnConfirmationCallback: (() => void) | null;

    // Environment (assigned at runtime in main.ts)
    TONIC_ENV: TonicEnv;

    // Console helper functions (assigned at runtime in main.ts)
    overrideMaintenanceMode: () => boolean;
    clearServerCache: () => Promise<boolean>;
  }

  // Allow direct access without window. prefix
  const ModalKeyboardHandler: Window['ModalKeyboardHandler'];
  const AccessCodeManager: AccessCodeManagerType;
  const UserSession: UserSessionType;
  const ClassManager: typeof ClassManager;
}

export {};
