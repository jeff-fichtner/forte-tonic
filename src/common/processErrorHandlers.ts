/**
 * Process-level error handlers.
 *
 * Catches errors that escape Express — uncaughtException (synchronous throws
 * outside a route handler) and unhandledRejection (top-level promise
 * rejections nobody awaited). Without these, such errors crash the Node
 * process with only Node's default stack trace; with them, they land in the
 * same Cloud Logging stream as Express-routed errors via gcpLogger.
 *
 * Standard Node practice for uncaughtException is to log and exit — process
 * state may be corrupted. Cloud Run respawns the instance.
 */

import { getCloudLogger } from './gcpLogger.js';
import { ERROR_CODE } from './errorConstants.js';

/**
 * Install process-level error handlers. Call once at server startup, before
 * app.listen(). Idempotent guard via a module-level flag prevents
 * double-registration if called twice.
 */
let installed = false;

export function installProcessErrorHandlers(): void {
  if (installed) return;
  installed = true;

  const logger = getCloudLogger();

  process.on('uncaughtException', (error: Error) => {
    logger.error({
      message: `Uncaught exception: ${error.message}`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: ERROR_CODE.INTERNAL_ERROR,
      },
      '@type': 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
      context: { source: 'uncaughtException' },
    });
    // Process state may be corrupted. Exit so Cloud Run can respawn.
    // Use exit code 1 to signal abnormal termination.
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const error =
      reason instanceof Error
        ? reason
        : new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
    logger.error({
      message: `Unhandled promise rejection: ${error.message}`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: ERROR_CODE.INTERNAL_ERROR,
      },
      '@type': 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
      context: { source: 'unhandledRejection' },
    });
    // Do NOT exit on unhandledRejection — process state is usually fine.
    // Node will become strict about this in future versions; explicit log
    // gives us visibility while keeping behavior predictable today.
  });
}
