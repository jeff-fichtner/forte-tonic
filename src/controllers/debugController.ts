/**
 * Debug Controller — error visibility verification.
 *
 * Three endpoints:
 *  - POST /api/debug/throw       — throws synchronously inside the route
 *                                  handler, exercising the errorResponse →
 *                                  gcpLogger → Cloud Logging → Error
 *                                  Reporting (5xx auto-aggregation) path.
 *  - POST /api/debug/throw?async=1 — schedules a throw via setImmediate so
 *                                    it escapes the Express stack,
 *                                    exercising the process-level
 *                                    uncaughtException handler instead.
 *                                    Responds 202 before the throw fires.
 *  - POST /api/client-error      — receives an error payload from the
 *                                  browser's window.onerror /
 *                                  window.onunhandledrejection handlers
 *                                  and logs it through gcpLogger. No auth
 *                                  required so login-screen errors are
 *                                  reportable.
 *
 * These exist permanently, in every environment. They are the verification
 * tool for the full error-visibility pipeline; calling them from the
 * browser console (window.throwUIError / window.throwBackendError) is the
 * easiest way to confirm that errors anywhere in the app end up in Cloud
 * Logging.
 */

import { getLogger } from '../utils/logger.js';
import type { Request, Response } from 'express';
import { successResponse, errorResponse } from '../common/responseHelpers.js';
import { getCloudLogger, buildErrorReportingFields } from '../common/gcpLogger.js';
import { ERROR_CODE } from '../common/errorConstants.js';

const logger = getLogger();

export class DebugController {
  /**
   * POST /api/debug/throw
   *
   * Synchronously throws an Error. The Express error handler catches it,
   * routes it through errorResponse → gcpLogger; the client receives a
   * standard 500 error envelope. Use ?async=1 to throw asynchronously
   * instead (escapes Express; exercises the process-level handler).
   */
  static async throwError(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const isAsync = req.query.async === '1' || req.query.async === 'true';

    if (isAsync) {
      // Schedule a throw outside the Express stack. The setImmediate
      // callback executes after the current event-loop tick, after the
      // response has been sent. The error escapes to the process-level
      // uncaughtException handler installed in server.ts.
      const message = `Debug async throw triggered at ${new Date().toISOString()}`;
      setImmediate(() => {
        throw new Error(message);
      });
      successResponse(
        res,
        { triggered: true, mode: 'async', message },
        {
          message: 'Async throw scheduled; check Cloud Logging for the uncaughtException entry.',
          statusCode: 202,
          req,
          startTime,
          context: { controller: 'DebugController', method: 'throwError', mode: 'async' },
        }
      );
      return;
    }

    try {
      // Synchronous throw — caught by the try/catch below and routed to
      // errorResponse like any other 5xx.
      throw new Error(`Debug sync throw triggered at ${new Date().toISOString()}`);
    } catch (error) {
      logger.error('Debug sync throw:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'DebugController', method: 'throwError', mode: 'sync' },
      });
    }
  }

  /**
   * POST /api/client-error
   *
   * Receives an error payload from the browser and logs it through
   * gcpLogger so frontend errors land in the same Cloud Logging stream
   * as backend errors. No auth required: errors from a logged-out user
   * (login-screen crash, etc.) should still be reportable.
   *
   * Expected body shape (all fields optional except message):
   *   { message, stack?, source?, url?, userAgent?, path?, userType? }
   */
  static async reportClientError(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const {
        message = '(no message provided)',
        stack,
        source,
        url,
        userAgent,
        path,
        userType,
      } = (req.body ?? {}) as Record<string, unknown>;

      const cloudLogger = getCloudLogger();
      cloudLogger.error({
        message: `Client error: ${String(message)}`,
        error: {
          name: 'ClientError',
          message: String(message),
          stack: typeof stack === 'string' ? stack : undefined,
          code: ERROR_CODE.INTERNAL_ERROR,
        },
        ...buildErrorReportingFields(),
        context: {
          source: typeof source === 'string' ? source : 'window',
          url: typeof url === 'string' ? url : undefined,
          userAgent: typeof userAgent === 'string' ? userAgent : undefined,
          path: typeof path === 'string' ? path : undefined,
          userType: typeof userType === 'string' ? userType : undefined,
          ip: req.ip,
        },
      });

      successResponse(
        res,
        { received: true },
        {
          statusCode: 204,
          req,
          startTime,
          context: { controller: 'DebugController', method: 'reportClientError' },
        }
      );
    } catch (error) {
      // Belt and braces: a failure to log a client error must not itself
      // crash; log it and respond gracefully.
      logger.error('Error processing client error report:', error);
      errorResponse(res, error, {
        req,
        startTime,
        context: { controller: 'DebugController', method: 'reportClientError' },
      });
    }
  }
}
