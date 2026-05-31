/**
 * Console-callable throw helpers.
 *
 * Attaches `window.throwUIError()` and `window.throwBackendError()` so
 * either error path can be exercised from the browser DevTools console
 * in any environment.
 *
 * Why these are useful: they verify that error visibility actually
 * works. After a deploy you can open the console, call each, and
 * confirm the entries appear in Cloud Logging (and 5xx ones in Cloud
 * Error Reporting). If they don't, the visibility pipeline is broken
 * and the production system is shipping errors blindly.
 *
 * Why setTimeout for the UI throw: a `throw` typed directly into the
 * DevTools console is caught by the console's eval wrapper. Throwing
 * inside a setTimeout escapes that wrapper and fires the global window
 * error handler — which is the path we want to test.
 *
 * The backend throw goes through HttpService so it carries the standard
 * `x-access-code` and `x-login-type` headers — the /api/debug/throw
 * endpoint requires auth, so the caller must be logged in.
 */

import { HttpService, type HttpResult } from '../data/httpService.js';

declare global {
  interface Window {
    throwUIError: (message?: string) => Promise<void>;
    throwBackendError: (mode?: 'sync' | 'async') => Promise<HttpResult<unknown>>;
  }
}

/**
 * Throw an error from a setTimeout callback so it escapes the console's
 * eval wrapper and fires the global window error handler. Returns a
 * Promise that resolves once the throw has been scheduled (useful in
 * tests; in console use you call it and ignore the return).
 */
async function throwUIError(message?: string): Promise<void> {
  const text = message ?? `Test UI error triggered at ${new Date().toISOString()}`;
  await new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
      // resolve before the throw so the caller's await completes; the
      // throw still fires immediately after.
      throw new Error(text);
    }, 0);
  });
}

/**
 * Trigger a backend error via /api/debug/throw. `mode === 'async'` uses
 * the async query variant which exercises the process-level
 * uncaughtException handler; otherwise the route handler throws
 * synchronously and the standard errorResponse pipeline runs.
 *
 * Goes through HttpService so the request carries the user's auth
 * headers — /api/debug/throw is authenticated. If the caller isn't
 * logged in, the result will be a 401 (and the frontend's standard
 * logout-on-401 will fire). Sync mode returns the error envelope (ok:
 * false); async mode returns a 202 envelope (ok: true) before the
 * throw fires server-side.
 */
async function throwBackendError(mode: 'sync' | 'async' = 'sync'): Promise<HttpResult<unknown>> {
  const path = mode === 'async' ? 'debug/throw?async=1' : 'debug/throw';
  return HttpService.post<unknown>(path, {});
}

/**
 * Attach the helpers to `window`. Idempotent: re-running is safe.
 */
let installed = false;

export function installDebugThrows(): void {
  if (installed) return;
  installed = true;
  window.throwUIError = throwUIError;
  window.throwBackendError = throwBackendError;
}
