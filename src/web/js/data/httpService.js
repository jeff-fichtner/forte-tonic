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
    return this.#callServerFunction(serverFunctionName, payload, mapper, context);
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
      console.log(
        `Fetched page ${page} with size ${pageSize} from server function ${serverFunctionName}`
      );
      if (!response) {
        return { data: [], total: 0 };
      }

      const parsedResults = response.data.map(y => mapper(y));
      return {
        data: parsedResults,
        total: response.total || 0,
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
    console.log(`🔄 fetchAllPages starting for ${serverFunctionName} with pageSize=${pageSize}`);
    
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

      console.log(`📊 First page result for ${serverFunctionName}: ${data?.length || 0} records, total=${total}`);

      if (!data || data.length === 0) {
        console.log(`✅ No data found for ${serverFunctionName}`);
        return allResults;
      }

      allResults = allResults.concat(data);

      // Check if we got all data in the first request
      if (total !== undefined) {
        if (total <= pageSize) {
          console.log(`✅ Single request optimization: Got all ${total} records in one call for ${serverFunctionName}`);
          return allResults;
        }
        
        if (data.length < pageSize) {
          console.log(`✅ Partial page optimization: Got ${data.length} records (less than pageSize) for ${serverFunctionName}`);
          return allResults;
        }
      } else {
        // If no total provided, use data length as indicator
        if (data.length < pageSize) {
          console.log(`✅ No total provided, but got ${data.length} records (less than pageSize) for ${serverFunctionName}`);
          return allResults;
        }
      }

      // Calculate remaining pages needed
      const totalPages = Math.ceil(total / pageSize);
      console.log(`📄 Need to fetch ${totalPages - 1} more pages for ${serverFunctionName}`);
      
      currentPage++;

      // Continue fetching remaining pages only if needed
      while (currentPage < totalPages) {
        try {
          console.log(`🔄 Fetching page ${currentPage} for ${serverFunctionName}`);
          const { data: nextPageData } = await this.fetchPage(
            serverFunctionName,
            mapper,
            currentPage,
            pageSize,
            context,
            ...args
          );
          
          if (!nextPageData || nextPageData.length === 0) {
            console.log(`✅ No more data on page ${currentPage} for ${serverFunctionName}`);
            break;
          }

          allResults = allResults.concat(nextPageData);
          console.log(`📊 Page ${currentPage} added ${nextPageData.length} records for ${serverFunctionName}`);
          currentPage++;
        } catch (error) {
          console.error(
            `❌ Error fetching ${serverFunctionName} page ${currentPage}:`,
            error
          );
          break;
        }
      }
      
      console.log(`✅ fetchAllPages completed for ${serverFunctionName}: ${allResults.length} total records`);
    } catch (error) {
      console.error(
        `Error fetching ${serverFunctionName} all pages:`,
        error
      );
      return [];
    }

    return allResults;
  }

  /**
   *
   */
  static post(serverFunctionName, data, mapper = null, context = null, ...args) {
    // For new API endpoints (like registrations), send data directly
    // For legacy endpoints, wrap in the old format
    const isNewEndpoint = ['registrations'].includes(serverFunctionName);
    const payload = isNewEndpoint ? data : [{ data }, ...args];
    return this.#callServerFunction(serverFunctionName, payload, mapper, context);
  }

  // Updated method for calling Node.js server functions via HTTP
  /**
   *
   */
  static async #callServerFunction(serverFunctionName, payload, mapper = null, _context = null) {
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

      const response = await fetch(`/api/${serverFunctionName}`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload),
          credentials: 'same-origin', // Include session cookies
        });

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
