/**
 * Middleware to normalize HttpService.post request body format
 *
 * HttpService.post sends data as [{ data: actualData }, ...args]
 * This middleware provides utilities to extract the data properly.
 */

/**
 * Middleware that extracts the first data object from HttpService.post format
 * Use this for routes that expect a single object (like access code authentication)
 */
export function extractSingleRequestData(req, res, next) {
  if (Array.isArray(req.body) && req.body[0]?.data) {
    // Extract data from HttpService.post format: [{ data: { accessCode: "123456" } }]
    req.body = req.body[0].data;
  }
  next();
}

/**
 * Middleware that extracts pagination and other arguments from HttpService.post format
 * Use this for routes that expect pagination data (like getStudents)
 */
export function extractPaginatedRequestData(req, res, next) {
  if (Array.isArray(req.body) && req.body[0]) {
    // Keep the array structure but make the first element easily accessible
    req.requestData = req.body[0];
    req.paginationArgs = req.body.slice(1);
  } else {
    req.requestData = req.body || {};
    req.paginationArgs = [];
  }
  next();
}

/**
 * Helper function to safely extract data from either format
 * Use this in controllers that might receive data in different formats
 */
export function extractRequestData(reqBody) {
  if (Array.isArray(reqBody) && reqBody[0]?.data) {
    return reqBody[0].data;
  }
  return reqBody;
}
