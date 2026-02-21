/**
 * Updated httpService to work with Node.js server instead of Google Apps Script
 * This replaces the google.script.run calls with fetch API calls to the Node.js server.
 */

type Mapper<T = unknown> = (item: unknown) => T;

interface HttpError extends Error {
  status?: number;
  type?: string | null;
  code?: string | null;
}

interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
}

export class HttpService {
  static fetch(
    serverFunctionName: string,
    mapper: Mapper | null = null,
    paginationOptions: Record<string, unknown> = {},
    context: unknown = null,
    ...args: unknown[]
  ): Promise<unknown> {
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
  ): Promise<PaginatedResponse<T>> {
    try {
      const paginationOptions = { page, pageSize };
      const response = (await this.fetch(
        serverFunctionName,
        null,
        paginationOptions,
        context,
        ...args
      )) as Record<string, unknown> | unknown[] | null;
      if (!response) {
        return { data: [], total: 0 };
      }

      // Handle different response formats:
      // 1. Paginated format: { data: [...], total: 123 }
      // 2. Direct array format: [...]
      let responseData: unknown[];
      let responseTotal: number;

      if (!Array.isArray(response) && (response as Record<string, unknown>).data) {
        // Paginated format
        responseData = (response as Record<string, unknown>).data as unknown[];
        responseTotal = ((response as Record<string, unknown>).total as number) || 0;
      } else if (Array.isArray(response)) {
        // Direct array format
        responseData = response;
        responseTotal = response.length;
      } else {
        console.warn(
          `⚠️ HttpService.fetchPage: Unexpected response format for ${serverFunctionName}. Response:`,
          response
        );
        return { data: [], total: 0 };
      }

      const parsedResults = responseData.map((y: unknown) => mapper(y));
      return {
        data: parsedResults,
        total: responseTotal,
      };
    } catch (error) {
      console.error(`Error fetching ${serverFunctionName} page ${page}:`, error);
      throw error;
    }
  }

  static async fetchAllPages<T = unknown>(
    serverFunctionName: string,
    mapper: Mapper<T>,
    pageSize = 1000,
    context: unknown = null,
    ...args: unknown[]
  ): Promise<T[]> {
    let allResults: T[] = [];
    let currentPage = 0;

    // First request to get data and determine total size
    try {
      const { data, total } = await this.fetchPage(
        serverFunctionName,
        mapper,
        currentPage,
        pageSize,
        context,
        ...args
      );

      if (!data || data.length === 0) {
        return allResults;
      }

      allResults = allResults.concat(data);

      // Check if we got all data in the first request
      if (total !== undefined) {
        if (total <= pageSize) {
          return allResults;
        }

        if (data.length < pageSize) {
          return allResults;
        }
      } else {
        // If no total provided, use data length as indicator
        if (data.length < pageSize) {
          return allResults;
        }
      }

      // Calculate remaining pages needed
      const totalPages = Math.ceil(total / pageSize);

      currentPage++;

      // Continue fetching remaining pages only if needed
      while (currentPage < totalPages) {
        try {
          const { data: nextPageData } = await this.fetchPage(
            serverFunctionName,
            mapper,
            currentPage,
            pageSize,
            context,
            ...args
          );

          if (!nextPageData || nextPageData.length === 0) {
            break;
          }

          allResults = allResults.concat(nextPageData);
          currentPage++;
        } catch (error) {
          console.error(`Error fetching ${serverFunctionName} page ${currentPage}:`, error);
          break;
        }
      }
    } catch (error) {
      console.error(`Error fetching ${serverFunctionName} all pages:`, error);
      return [];
    }

    return allResults;
  }

  static post(
    serverFunctionName: string,
    data: unknown,
    mapper: Mapper | null = null,
    context: unknown = null,
    ..._args: unknown[]
  ): Promise<unknown> {
    // Send data directly to all endpoints (standardized format)
    return this.#callServerFunction(serverFunctionName, data, mapper, context, 'POST');
  }

  /**
   * PATCH request to server
   */
  static patch(
    serverFunctionName: string,
    data: unknown,
    mapper: Mapper | null = null,
    context: unknown = null
  ): Promise<unknown> {
    return this.#callServerFunction(serverFunctionName, data, mapper, context, 'PATCH');
  }

  /**
   * DELETE request to server
   */
  static delete(
    serverFunctionName: string,
    mapper: Mapper | null = null,
    context: unknown = null
  ): Promise<unknown> {
    return this.#callServerFunction(serverFunctionName, null, mapper, context, 'DELETE');
  }

  /**
   * Simple GET request with abort signal support.
   * Returns the auto-unwrapped response data (envelope handled internally).
   */
  static get(
    path: string,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<unknown> {
    return this.#callServerFunction(path, null, null, null, 'GET', signal ?? null);
  }

  // Updated method for calling Node.js server functions via HTTP
  static async #callServerFunction(
    serverFunctionName: string,
    payload: unknown,
    mapper: Mapper | null = null,
    _context: unknown = null,
    httpMethod = 'POST',
    signal: AbortSignal | null = null
  ): Promise<unknown> {
    try {
      // Get stored access code for authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include access code and login type in header if available
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
        credentials: 'same-origin', // Include session cookies
        ...(signal && { signal }),
      };

      // Only include body for POST/PATCH/PUT requests (not GET or DELETE)
      if (httpMethod !== 'GET' && httpMethod !== 'DELETE') {
        fetchOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(`/api/${serverFunctionName}`, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          // Redirect to login if unauthorized
          window.location.href = '/auth/google';
          return;
        }

        // Try to parse error response as JSON to get error type
        let errorData: Record<string, unknown> | null = null;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use text as-is
        }

        const errorInfo = errorData?.error as Record<string, unknown> | undefined;
        const error: HttpError = new Error(
          (errorInfo?.message as string) || `HTTP ${response.status}: ${errorText}`
        );
        error.status = response.status;
        error.type = (errorInfo?.type as string) || null;
        error.code = (errorInfo?.code as string) || null;
        throw error;
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Successful but empty response');
      }

      try {
        // The Node.js server returns JSON.stringify'd responses to match the original behavior
        const parsedResponse = JSON.parse(responseText);

        // Auto-unwrap standardized response format
        // New format: { success: true, data: {...} }
        // Old format: {...} (raw data)
        // This allows backend to use standardized responses without breaking frontend
        if (
          parsedResponse &&
          typeof parsedResponse === 'object' &&
          'success' in parsedResponse &&
          'data' in parsedResponse
        ) {
          return mapper ? mapper(parsedResponse.data) : parsedResponse.data;
        }

        return mapper ? mapper(parsedResponse) : parsedResponse;
      } catch (e) {
        throw new Error(`Error parsing response - ${e}: ${responseText}`);
      }
    } catch (error) {
      console.error(`Error in server function call to ${serverFunctionName}:`, error);
      throw error;
    }
  }
}

// Expose to window for console debugging and runtime access
window.HttpService = HttpService;
