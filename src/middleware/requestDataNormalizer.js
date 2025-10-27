/**
 * Middleware to normalize request data for paginated endpoints
 */

/**
 * Middleware that extracts pagination and other arguments from request
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
