/**
 * Environment detection helpers.
 * Wraps window.TONIC_ENV access to avoid scattering direct window reads across tabs.
 */

/** True when running in development mode (local dev server) */
export function isDevelopment(): boolean {
  return window.TONIC_ENV?.isDevelopment ?? false;
}
