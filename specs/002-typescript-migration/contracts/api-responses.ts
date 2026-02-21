/**
 * API Response Type Contracts
 *
 * These types define the response envelope used by all API endpoints.
 * See Constitution Principle IV: Uniform API Responses.
 */

// Success response envelope
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// Error detail object
export interface ApiErrorDetail {
  message: string;
  code: string;
  type: string;
  requestData?: Record<string, unknown>;
}

// Error response envelope
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

// Union type for all API responses
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Success response options (used by successResponse helper)
export interface SuccessResponseOptions {
  message?: string | null;
  statusCode?: number;
  req?: import('express').Request | null;
  startTime?: number | null;
  context?: Record<string, unknown>;
}

// Error response options (used by errorResponse helper)
export interface ErrorResponseOptions {
  req?: import('express').Request | null;
  startTime?: number | null;
  context?: Record<string, unknown>;
  includeRequestData?: boolean;
}
