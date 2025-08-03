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
    pageSize = 100,
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
  static async fetchAllPages(serverFunctionName, mapper, pageSize = 100, context = null, ...args) {
    let allResults = [];
    let currentPage = 0;
    let totalPages = null;

    while (!totalPages || currentPage < totalPages) {
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
          break;
        }

        allResults = allResults.concat(data);

        if (!totalPages && total !== undefined) {
          totalPages = Math.ceil(total / pageSize);
        }

        if (!totalPages) {
          throw new Error('Total pages not defined');
        }

        currentPage++;
      } catch (error) {
        console.error(
          `Error fetching ${serverFunctionName} all pages at page ${currentPage}:`,
          error
        );
        return [];
      }
    }

    return allResults;
  }

  /**
   *
   */
  static post(serverFunctionName, data, mapper = null, context = null, ...args) {
    const payload = [{ data }, ...args];
    return this.#callServerFunction(serverFunctionName, payload, mapper, context);
  }

  // Updated method for calling Node.js server functions via HTTP
  /**
   *
   */
  static #callServerFunction(serverFunctionName, payload, mapper = null, context = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`/api/${serverFunctionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
          reject(new Error('Successful but empty response'));
          return;
        }

        try {
          // The Node.js server returns JSON.stringify'd responses to match the original behavior
          const parsedResponse = JSON.parse(responseText);
          resolve(mapper ? mapper(parsedResponse) : parsedResponse);
        } catch (e) {
          reject(new Error(`Error parsing response - ${e}: ${responseText}`));
        }
      } catch (error) {
        console.error(`Error in server function call to ${serverFunctionName}:`, error);
        reject(error);
      }
    });
  }
}

// Make HttpService available globally for backward compatibility
window.HttpService = HttpService;
