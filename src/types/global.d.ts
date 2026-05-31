/**
 * Global type declarations for browser-side globals
 *
 * Only items that MUST live on window are declared here:
 * - Materialize (CDN-loaded, not an ES module)
 * - Modal instances (created by Materialize at runtime)
 * - TONIC_ENV (populated from API response)
 * - Console helper functions
 */

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
  // Prototype extension declarations
  interface String {
    capitalize(): string;
  }

  interface Number {
    formatGrade(): string;
  }

  interface Window {
    // Core framework (CDN-loaded)
    M: Materialize;

    // Modal instances (created by Materialize at runtime)
    loginModal: Element;
    loginModalInstance: MaterializeModalInstance;
    termsModal: Element;
    termsModalInstance: MaterializeModalInstance;
    privacyModal: Element;
    privacyModalInstance: MaterializeModalInstance;

    // Environment (populated from /api/version response)
    TONIC_ENV: TonicEnv;

    // Console helper functions
    overrideMaintenanceMode: () => boolean;
    clearServerCache: () => Promise<boolean>;
  }
}

export {};
