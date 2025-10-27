/**
 * Updated httpService to work with Node.js server instead of Google Apps Script
 * This replaces the google.script.run calls with fetch API calls to the Node.js server.
 */

/**
 *
 */
export class HttpService {
  /**
   *
   */
  static fetch(serverFunctionName, mapper = null, paginationOptions = {}, context = null, ...args) {
    const payload = paginationOptions ? [paginationOptions, ...args] : args;
    return this.#callServerFunction(serverFunctionName, payload, mapper, context, 'GET');
  }

  /**
   *
   */
  static async fetchPage(
    serverFunctionName,
    mapper,
    page = 0,
    pageSize = 1000,
    context = null,
    ...args
  ) {
    try {
      const paginationOptions = { page, pageSize };
      const response = await this.fetch(
        serverFunctionName,
        null,
        paginationOptions,
        context,
        ...args
      );
      if (!response) {
        return { data: [], total: 0 };
      }

      // Handle different response formats:
      // 1. Paginated format: { data: [...], total: 123 }
      // 2. Direct array format: [...]
      let responseData, responseTotal;

      if (response.data) {
        // Paginated format
        responseData = response.data;
        responseTotal = response.total || 0;
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

      const parsedResults = responseData.map(y => mapper(y));
      return {
        data: parsedResults,
        total: responseTotal,
      };
    } catch (error) {
      console.error(`Error fetching ${serverFunctionName} page ${page}:`, error);
      throw error;
    }
  }

  /**
   *
   */
  static async fetchAllPages(serverFunctionName, mapper, pageSize = 1000, context = null, ...args) {
    let allResults = [];
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

  /**
   *
   */
  static post(serverFunctionName, data, mapper = null, context = null, ...args) {
    // Send data directly to all endpoints (standardized format)
    return this.#callServerFunction(serverFunctionName, data, mapper, context, 'POST');
  }

  /**
   * DELETE request to server
   * @param {string} serverFunctionName - The endpoint name or path with ID (e.g., 'registrations/123')
   * @param {Function} mapper - Optional mapper function for response
   * @param {object} context - Optional context for the request
   */
  static delete(serverFunctionName, mapper = null, context = null) {
    return this.#callServerFunction(serverFunctionName, null, mapper, context, 'DELETE');
  }

  // Updated method for calling Node.js server functions via HTTP
  /**
   *
   */
  static async #callServerFunction(
    serverFunctionName,
    payload,
    mapper = null,
    _context = null,
    httpMethod = 'POST'
  ) {
    try {
      // Get stored access code for authentication
      const headers = {
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

      const fetchOptions = {
        method: httpMethod,
        headers: headers,
        credentials: 'same-origin', // Include session cookies
      };

      // Only include body for POST/PATCH/PUT requests
      if (httpMethod !== 'GET') {
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
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Successful but empty response');
      }

      try {
        // The Node.js server returns JSON.stringify'd responses to match the original behavior
        const parsedResponse = JSON.parse(responseText);

        // Auto-unwrap standardized response format for backward compatibility
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

// Make HttpService available globally for backward compatibility
window.HttpService = HttpService;
