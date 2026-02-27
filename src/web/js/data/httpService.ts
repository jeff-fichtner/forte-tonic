/**
 * Updated httpService to work with Node.js server instead of Google Apps Script
 * This replaces the google.script.run calls with fetch API calls to the Node.js server.
 */

type Mapper<T = unknown> = (item: unknown) => T;

export interface HttpError {
  message: string;
  status?: number;
  type?: string | null;
  code?: string | null;
}

/** Discriminated union result — callers never need try/catch */
export type HttpResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: HttpError };

interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
}

export class HttpService {
  static async fetch<T = unknown>(
    serverFunctionName: string,
    mapper: Mapper<T> | null = null,
    paginationOptions: Record<string, unknown> = {},
    context: unknown = null,
    ...args: unknown[]
  ): Promise<HttpResult<T>> {
    const payload = paginationOptions ? [paginationOptions, ...args] : args;
    return this.#callServerFunction(serverFunctionName, payload, mapper, context, 'GET');
  }

  static async fetchPage<T = unknown>(
    serverFunctionName: string,
    mapper: Mapper<T>,
    page = 0,
    pageSize = 1000,
    context: unknown = null,
    ...args: unknown[]
  ): Promise<HttpResult<PaginatedResponse<T>>> {
    const result = await this.fetch<Record<string, unknown> | unknown[] | null>(
      serverFunctionName,
      null,
      { page, pageSize },
      context,
      ...args
    );

    if (!result.ok) return result;

    const response = result.data;

    if (!response) {
      return { ok: true, data: { data: [], total: 0 } };
    }

    let responseData: unknown[];
    let responseTotal: number;

    if (!Array.isArray(response) && (response as Record<string, unknown>).data) {
      responseData = (response as Record<string, unknown>).data as unknown[];
      responseTotal = ((response as Record<string, unknown>).total as number) || 0;
    } else if (Array.isArray(response)) {
      responseData = response;
      responseTotal = response.length;
    } else {
      console.warn(
        `⚠️ HttpService.fetchPage: Unexpected response format for ${serverFunctionName}. Response:`,
        response
      );
      return { ok: true, data: { data: [], total: 0 } };
    }

    return {
      ok: true,
      data: {
        data: responseData.map((y: unknown) => mapper(y)),
        total: responseTotal,
      },
    };
  }

  static async fetchAllPages<T = unknown>(
    serverFunctionName: string,
    mapper: Mapper<T>,
    pageSize = 1000,
    context: unknown = null,
    ...args: unknown[]
  ): Promise<HttpResult<T[]>> {
    let allResults: T[] = [];

    const firstResult = await this.fetchPage(
      serverFunctionName,
      mapper,
      0,
      pageSize,
      context,
      ...args
    );

    if (!firstResult.ok) return firstResult;

    const { data, total } = firstResult.data;

    if (!data || data.length === 0) {
      return { ok: true, data: allResults };
    }

    allResults = allResults.concat(data);

    const done = total === undefined
      ? data.length < pageSize
      : total <= pageSize || data.length < pageSize;

    if (done) {
      return { ok: true, data: allResults };
    }

    const totalPages = Math.ceil(total / pageSize);
    let currentPage = 1;

    while (currentPage < totalPages) {
      const pageResult = await this.fetchPage(
        serverFunctionName,
        mapper,
        currentPage,
        pageSize,
        context,
        ...args
      );

      if (!pageResult.ok) break; // partial result — return what we have

      const { data: nextPageData } = pageResult.data;

      if (!nextPageData || nextPageData.length === 0) break;

      allResults = allResults.concat(nextPageData);
      currentPage++;
    }

    return { ok: true, data: allResults };
  }

  static post<T = unknown>(
    serverFunctionName: string,
    data: unknown,
    mapper: Mapper<T> | null = null,
    context: unknown = null,
    ..._args: unknown[]
  ): Promise<HttpResult<T>> {
    return this.#callServerFunction(serverFunctionName, data, mapper, context, 'POST');
  }

  static patch<T = unknown>(
    serverFunctionName: string,
    data: unknown,
    mapper: Mapper<T> | null = null,
    context: unknown = null
  ): Promise<HttpResult<T>> {
    return this.#callServerFunction(serverFunctionName, data, mapper, context, 'PATCH');
  }

  static delete<T = unknown>(
    serverFunctionName: string,
    mapper: Mapper<T> | null = null,
    context: unknown = null
  ): Promise<HttpResult<T>> {
    return this.#callServerFunction(serverFunctionName, null, mapper, context, 'DELETE');
  }

  static get<T = unknown>(
    path: string,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<HttpResult<T>> {
    return this.#callServerFunction(path, null, null, null, 'GET', signal ?? null);
  }

  static async #callServerFunction<T>(
    serverFunctionName: string,
    payload: unknown,
    mapper: Mapper<T> | null = null,
    _context: unknown = null,
    httpMethod = 'POST',
    signal: AbortSignal | null = null
  ): Promise<HttpResult<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (window.AccessCodeManager) {
        const storedAuthData = window.AccessCodeManager.getStoredAuthData();
        if (storedAuthData) {
          headers['x-access-code'] = storedAuthData.accessCode;
          headers['x-login-type'] = storedAuthData.loginType;
        }
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

      const response = await fetch(`/api/${serverFunctionName}`, fetchOptions);

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
          window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
        }

        return { ok: false, error: httpError };
      }

      const responseText = await response.text();
      if (!responseText) {
        return { ok: false, error: { message: 'Successful but empty response', status: response.status } };
      }

      try {
        const parsedResponse = JSON.parse(responseText);

        const data = (
          parsedResponse &&
          typeof parsedResponse === 'object' &&
          'success' in parsedResponse &&
          'data' in parsedResponse
        )
          ? parsedResponse.data
          : parsedResponse;

        return { ok: true, data: mapper ? mapper(data) : (data as T) };
      } catch (e) {
        return { ok: false, error: { message: `Error parsing response - ${e}: ${responseText}` } };
      }
    } catch (error: unknown) {
      // AbortError is not a real failure — bubble it up as-is so callers can distinguish
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown network error';
      console.error(`Error in server function call to ${serverFunctionName}:`, error);
      return { ok: false, error: { message } };
    }
  }
}

// Expose to window for console debugging and runtime access
window.HttpService = HttpService;
