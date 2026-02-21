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

interface AccessCodeManagerType {
  _accessCodeCache: { accessCode: string; loginType: string } | null;
  saveAccessCodeSecurely(accessCode: string, loginType?: string): void;
  generateSessionId(): string;
  getStoredAccessCode(): string | null;
  getStoredAuthData(): { accessCode: string; loginType: string; sessionId?: string } | null;
  clearStoredAccessCode(): void;
}

interface UserSessionType {
  appConfig: Record<string, unknown> | null;
  saveAppConfig(config: Record<string, unknown>): void;
  getAppConfig(): Record<string, unknown> | null;
  getCurrentPeriod(): Record<string, unknown> | undefined;
  getNextPeriod(): Record<string, unknown> | undefined;
  clearAppConfig(): void;
  hasAcceptedTermsOfService(): boolean;
  acceptTermsOfService(): void;
  unacceptTermsOfService(): void;
}

interface ViewModelType {
  [key: string]: unknown;
}

declare global {
  interface Window {
    // Core framework
    M: Materialize;

    // Application singletons
    ViewModel: ViewModelType;
    ModalKeyboardHandler: typeof ModalKeyboardHandler;
    AccessCodeManager: AccessCodeManagerType;
    UserSession: UserSessionType;
    ClassManager: typeof ClassManager;
    HttpService: typeof HttpService;

    // UI components
    Table: unknown;
    Select: unknown;
    NavTabs: unknown;

    // Data layer
    IndexedDbClient: unknown;

    // Utilities
    DomHelpers: unknown;
    DurationHelpers: unknown;
    PromiseHelpers: unknown;

    // Date/time (from constants.ts)
    DateTime: typeof DateTime;
    Duration: typeof Duration;
    DateHelpers: typeof DateHelpers;

    // Constants (from constants.ts)
    MonthNames: string[];
    Sections: Record<string, string>;
    ServerFunctions: Record<string, string>;
    DataStores: Record<string, string>;
    RegistrationType: Record<string, string>;
    FilterValue: Record<string, string>;
    FORTE_PROGRAM_EMAIL: string;
    FORTE_PROGRAM_PHONE: string;
    UserType: Readonly<{ ADMIN: string; INSTRUCTOR: string; PARENT: string }>;

    // Phone helpers (from phoneHelpers.ts)
    formatPhone: (phoneNumber: string) => string;
    isValidUnformattedPhone: (phoneNumber: string) => boolean;
    stripPhoneFormatting: (phoneNumber: string) => string;
    formatPhoneAsTyped: (value: string) => string;
    isValidPhoneNumber: (phoneNumber: string) => boolean;
  }

  // Allow direct access without window. prefix
  const ViewModel: ViewModelType;
  const ModalKeyboardHandler: Window['ModalKeyboardHandler'];
  const AccessCodeManager: AccessCodeManagerType;
  const UserSession: UserSessionType;
  const ClassManager: typeof ClassManager;
}

export {};
