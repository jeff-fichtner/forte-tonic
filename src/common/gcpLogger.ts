/**
 * GCP Cloud Logging Integration
 * Wraps the application logger to provide GCP-compatible structured logging
 * with httpRequest fields for request correlation and proper severity levels.
 */

import type { Request, Response } from 'express';
import { getLogger as getAppLogger } from '../utils/logger.js';
import { LOG_SEVERITY } from './errorConstants.js';

/**
 * GCP Cloud Logging httpRequest object
 * @see https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#httprequest
 */
interface HttpRequestLog {
  requestMethod: string;
  requestUrl: string;
  status: number;
  userAgent: string | undefined;
  remoteIp: string | undefined;
  referer: string | undefined;
  latency: string;
}

/** Structured log data that can be passed to the cloud logger */
interface LogData {
  message?: string;
  traceId?: string;
  httpRequest?: HttpRequestLog;
  severity?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code: string;
  };
  '@type'?: string;
  [key: string]: unknown;
}

/** GCP-formatted log entry */
interface CloudLogEntry {
  severity: string;
  message?: string;
  'logging.googleapis.com/trace'?: string;
  [key: string]: unknown;
}

/** Cloud logger interface with severity-level methods */
export interface CloudLogger {
  info: (data: string | LogData) => void;
  warning: (data: string | LogData) => void;
  error: (data: string | LogData) => void;
}

/**
 * Build an httpRequest object for GCP Cloud Logging
 * This enables request correlation and latency tracking in Cloud Logging
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param startTime - Request start timestamp (from Date.now())
 * @param statusCode - HTTP status code (optional, defaults to res.statusCode)
 * @returns GCP Cloud Logging httpRequest object
 * @see https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#httprequest
 */
export function buildHttpRequestLog(
  req: Request,
  res: Response,
  startTime: number,
  statusCode: number | null = null
): HttpRequestLog {
  const latencyMs = Date.now() - startTime;

  return {
    requestMethod: req.method,
    requestUrl: req.originalUrl || req.url,
    status: statusCode || res.statusCode,
    userAgent: req.get('user-agent') || undefined,
    remoteIp: req.ip || req.socket?.remoteAddress || undefined,
    referer: req.get('referer') || undefined,
    latency: `${(latencyMs / 1000).toFixed(3)}s`,
  };
}

/**
 * Format data for GCP Cloud Logging
 * Ensures proper structure with severity field and optional trace context
 *
 * @param data - Log data (string message or structured object)
 * @param severity - GCP log severity level
 * @returns Formatted log entry for GCP
 */
function formatForCloudLogging(data: string | LogData, severity: string): CloudLogEntry {
  // If data is a simple string, wrap it in an object
  if (typeof data === 'string') {
    return {
      severity,
      message: data,
    };
  }

  // If data is already an object, add severity and optionally trace context
  const logEntry: CloudLogEntry = {
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
 * Fields required for Cloud Error Reporting aggregation.
 * Both @type and serviceContext must be present or Error Reporting ignores the entry.
 * @see https://cloud.google.com/error-reporting/docs/formatting-error-messages
 */
export function buildErrorReportingFields(): {
  '@type': string;
  serviceContext: { service: string; version: string };
} {
  const service = process.env.NODE_ENV === 'production' ? 'tonic-production' : 'tonic-staging';
  const version = process.env.BUILD_GIT_TAG ?? process.env.npm_package_version ?? 'unknown';
  return {
    '@type': 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
    serviceContext: { service, version },
  };
}

/**
 * Write a structured log entry for Cloud Logging.
 *
 * Cloud Run captures stdout and parses lines that are valid JSON as
 * jsonPayload. Lines written to stderr (or prefixed with emoji) arrive as
 * textPayload — Cloud Error Reporting cannot read fields from textPayload.
 *
 * In development we also mirror to the emoji logger so local output stays
 * readable, but the authoritative write is always process.stdout.
 */
function writeCloudEntry(data: string | LogData, severity: string): void {
  const formatted = formatForCloudLogging(data, severity);
  process.stdout.write(JSON.stringify(formatted) + '\n');

  if (process.env.NODE_ENV === 'development') {
    const appLogger = getAppLogger();
    const preview = typeof data === 'string' ? data : (data.message ?? severity);
    if (severity === LOG_SEVERITY.ERROR) appLogger.error(preview);
    else if (severity === LOG_SEVERITY.WARNING) appLogger.warn(preview);
    else appLogger.info(preview);
  }
}

/**
 * Get a Cloud Logging-compatible logger.
 * All methods write structured JSON to stdout so Cloud Run stores entries
 * as jsonPayload (required for Cloud Error Reporting aggregation).
 *
 * @returns Logger with info, warning, error methods
 */
export function getCloudLogger(): CloudLogger {
  return {
    info: (data: string | LogData): void => writeCloudEntry(data, LOG_SEVERITY.INFO),
    warning: (data: string | LogData): void => writeCloudEntry(data, LOG_SEVERITY.WARNING),
    error: (data: string | LogData): void => writeCloudEntry(data, LOG_SEVERITY.ERROR),
  };
}
