/**
 * Browser global error handlers.
 *
 * Installs window.addEventListener('error', ...) and
 * window.addEventListener('unhandledrejection', ...) so uncaught errors
 * and unawaited promise rejections in the SPA get POSTed to
 * /api/client-error. Without these handlers, frontend errors live and
 * die in the user's browser console.
 *
 * The endpoint logs through gcpLogger so client errors land in the same
 * Cloud Logging stream as backend errors. No auth required: login-screen
 * crashes (the user is not yet authenticated) must still be reportable.
 *
 * Failures inside the handler are swallowed — there is nowhere else to
 * report them, and we must not create an error reporting loop.
 */

interface ClientErrorPayload {
  message: string;
  stack?: string;
  source?: string;
  url?: string;
  userAgent?: string;
  path?: string;
  userType?: string;
}

const CLIENT_ERROR_ENDPOINT = '/api/client-error';

/**
 * Read the currently-authenticated user type from localStorage's stored
 * auth session, if present. Used as a debugging breadcrumb in error
 * reports; failures are silent (this code path must never throw).
 */
function getUserType(): string | undefined {
  try {
    const raw = localStorage.getItem('forte_auth_session');
    if (!raw) return undefined;
    const decoded = JSON.parse(atob(raw)) as { loginType?: string };
    return decoded.loginType;
  } catch {
    return undefined;
  }
}

/**
 * Send a payload to the client-error sink. Uses fetch directly (not
 * HttpService) so the report still goes out if HttpService itself is
 * the source of the error being reported. Best-effort: any failure is
 * swallowed to avoid an error-reporting loop.
 */
async function sendErrorReport(payload: ClientErrorPayload): Promise<void> {
  try {
    await fetch(CLIENT_ERROR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // keepalive lets the request finish even if the page is being unloaded
      keepalive: true,
    });
  } catch {
    // Swallow — nothing useful to do here, and we must not loop.
  }
}

/**
 * Install the two global handlers. Idempotent: a module-level flag
 * prevents double-registration if called twice.
 */
let installed = false;

export function installBrowserErrorHandlers(): void {
  if (installed) return;
  installed = true;

  window.addEventListener('error', event => {
    const error = event.error as Error | undefined;
    void sendErrorReport({
      message: event.message || error?.message || 'window error',
      stack: error?.stack,
      source: 'window.error',
      url: event.filename || window.location.href,
      userAgent: navigator.userAgent,
      path: window.location.pathname,
      userType: getUserType(),
    });
  });

  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason as Error | string | undefined;
    const error = reason instanceof Error ? reason : undefined;
    const message =
      error?.message ?? (typeof reason === 'string' ? reason : 'unhandled promise rejection');
    void sendErrorReport({
      message,
      stack: error?.stack,
      source: 'window.unhandledrejection',
      url: window.location.href,
      userAgent: navigator.userAgent,
      path: window.location.pathname,
      userType: getUserType(),
    });
  });
}
