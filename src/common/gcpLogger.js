/**
 * GCP Cloud Logging Integration
 * Wraps the application logger to provide GCP-compatible structured logging
 * with httpRequest fields for request correlation and proper severity levels.
 */

import { getLogger as getAppLogger } from '../utils/logger.js';
import { LOG_SEVERITY } from './errorConstants.js';

/**
 * Build an httpRequest object for GCP Cloud Logging
 * This enables request correlation and latency tracking in Cloud Logging
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {number} startTime - Request start timestamp (from Date.now())
 * @param {number} statusCode - HTTP status code (optional, defaults to res.statusCode)
 * @returns {object} GCP Cloud Logging httpRequest object
 * @see https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#httprequest
 */
export function buildHttpRequestLog(req, res, startTime, statusCode = null) {
  const latencyMs = Date.now() - startTime;

  return {
    requestMethod: req.method,
    requestUrl: req.originalUrl || req.url,
    status: statusCode || res.statusCode,
    userAgent: req.get('user-agent') || undefined,
    remoteIp: req.ip || req.connection?.remoteAddress || undefined,
    referer: req.get('referer') || undefined,
    latency: `${(latencyMs / 1000).toFixed(3)}s`,
  };
}

/**
 * Format data for GCP Cloud Logging
 * Ensures proper structure with severity field and optional trace context
 *
 * @param {string|object} data - Log data (string message or structured object)
 * @param {string} severity - GCP log severity level
 * @returns {object} Formatted log entry for GCP
 */
function formatForCloudLogging(data, severity) {
  // If data is a simple string, wrap it in an object
  if (typeof data === 'string') {
    return {
      severity,
      message: data,
    };
  }

  // If data is already an object, add severity and optionally trace context
  const logEntry = {
    severity,
    ...data,
  };

  // Add trace context if available (for distributed tracing)
  // GCP_PROJECT_ID should be set in Cloud Run environment
  if (data.traceId && process.env.GCP_PROJECT_ID) {
    logEntry['logging.googleapis.com/trace'] =
      `projects/${process.env.GCP_PROJECT_ID}/traces/${data.traceId}`;
  }

  return logEntry;
}

/**
 * Get a Cloud Logging-compatible logger
 * Wraps the application logger to output structured JSON logs
 * that GCP Cloud Logging can parse and index.
 *
 * @returns {object} Logger with info, warning, error methods
 */
export function getCloudLogger() {
  const logger = getAppLogger();

  return {
    /**
     * Log informational message (INFO severity)
     * Use for successful operations, request completion
     */
    info: data => {
      const formatted = formatForCloudLogging(data, LOG_SEVERITY.INFO);
      // When the data is an object, stringify it for GCP to parse
      if (typeof formatted === 'object') {
        logger.info(JSON.stringify(formatted));
      } else {
        logger.info(formatted);
      }
    },

    /**
     * Log warning message (WARNING severity)
     * Use for 4xx client errors, recoverable issues
     */
    warning: data => {
      const formatted = formatForCloudLogging(data, LOG_SEVERITY.WARNING);
      if (typeof formatted === 'object') {
        logger.warn(JSON.stringify(formatted));
      } else {
        logger.warn(formatted);
      }
    },

    /**
     * Log error message (ERROR severity)
     * Use for 5xx server errors, critical issues
     */
    error: data => {
      const formatted = formatForCloudLogging(data, LOG_SEVERITY.ERROR);
      if (typeof formatted === 'object') {
        logger.error(JSON.stringify(formatted));
      } else {
        logger.error(formatted);
      }
    },
  };
}
