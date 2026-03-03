/**
 * HttpService - Typed HTTP client for the Tonic API.
 * All methods return HttpResult<T> — callers never need try/catch.
 */

import { AccessCodeManager } from '../auth/session.js';

export interface HttpError {
  message: string;
  status?: number;
  type?: string | null;
  code?: string | null;
}

/** Discriminated union result — callers never need try/catch */
export type HttpResult<T> = { ok: true; data: T } | { ok: false; error: HttpError };

export class HttpService {
  static #onSessionExpired: (() => void) | null = null;

  /** Register a callback for 401 responses. Called once from main.ts startup. */
  static onSessionExpired(handler: () => void): void {
    this.#onSessionExpired = handler;
  }

  static get<T = unknown>(
    path: string,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<HttpResult<T>> {
    return this.#callServerFunction(path, null, 'GET', signal ?? null);
  }

  static post<T = unknown>(
    path: string,
    data: unknown,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<HttpResult<T>> {
    return this.#callServerFunction(path, data, 'POST', signal ?? null);
  }

  static patch<T = unknown>(
    path: string,
    data: unknown,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<HttpResult<T>> {
    return this.#callServerFunction(path, data, 'PATCH', signal ?? null);
  }

  static delete<T = unknown>(
    path: string,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<HttpResult<T>> {
    return this.#callServerFunction(path, null, 'DELETE', signal ?? null);
  }

  static async #callServerFunction<T>(
    path: string,
    payload: unknown,
    httpMethod: string,
    signal: AbortSignal | null
  ): Promise<HttpResult<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const storedAuthData = AccessCodeManager.getStoredAuthData();
      if (storedAuthData) {
        headers['x-access-code'] = storedAuthData.accessCode;
        headers['x-login-type'] = storedAuthData.loginType;
      }

      const fetchOptions: RequestInit = {
        method: httpMethod,
        headers: headers,
        credentials: 'same-origin',
        ...(signal && { signal }),
      };

      if (httpMethod !== 'GET' && httpMethod !== 'DELETE') {
        fetchOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(`/api/${path}`, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();

        let errorData: Record<string, unknown> | null = null;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use text as-is
        }

        const errorInfo = errorData?.error as Record<string, unknown> | undefined;
        const httpError: HttpError = {
          message: (errorInfo?.message as string) || `HTTP ${response.status}: ${errorText}`,
          status: response.status,
          type: (errorInfo?.type as string) || null,
          code: (errorInfo?.code as string) || null,
        };

        if (response.status === 401) {
          M.toast({ html: 'Session expired. Please log in again.' });
          this.#onSessionExpired?.();
        }

        return { ok: false, error: httpError };
      }

      const responseText = await response.text();
      if (!responseText) {
        return {
          ok: false,
          error: { message: 'Successful but empty response', status: response.status },
        };
      }

      try {
        const parsedResponse = JSON.parse(responseText);

        const data =
          parsedResponse &&
          typeof parsedResponse === 'object' &&
          'success' in parsedResponse &&
          'data' in parsedResponse
            ? parsedResponse.data
            : parsedResponse;

        return { ok: true, data: data as T };
      } catch (e) {
        return { ok: false, error: { message: `Error parsing response - ${e}: ${responseText}` } };
      }
    } catch (error: unknown) {
      // AbortError is not a real failure — bubble it up as-is so callers can distinguish
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown network error';
      console.error(`Error in server function call to ${path}:`, error);
      return { ok: false, error: { message } };
    }
  }
}
