# API Response Envelope Contract

All endpoints MUST return responses in this format.

## Success Response

```json
{
  "success": true,
  "data": <payload>
}
```

HTTP status: 200 (default), 201 (for creation endpoints).

## Error Response

```json
{
  "success": false,
  "error": {
    "message": "<human-readable message>",
    "code": "<error code>",
    "type": "<validation|authentication|authorization|not_found|conflict|server|client>"
  }
}
```

HTTP status: determined by error type (400, 401, 403, 404, 409, 500).

## Endpoints Currently Violating This Contract

| Endpoint | Current Behavior | Required Change |
|----------|-----------------|-----------------|
| `POST /api/authenticateByAccessCode` | Returns raw user object or `null` | Wrap in `successResponse()` / `errorResponse()` |
| `POST /api/testConnection` | Returns raw `res.json(testResult)` | Wrap in `successResponse()` |
| `POST /api/testSheetData` | Returns raw `res.json(testResult)` | Wrap in `successResponse()` |
| `POST /api/admin/clearCache` | Returns raw `res.json(cacheData)` | Wrap in `successResponse()` |

## Frontend Handling

`HttpService.#callServerFunction` auto-detects the envelope (`'success' in response && 'data' in response`) and unwraps `data` for callers. After this change, all responses will be auto-unwrapped consistently. The auth endpoint's failure case changes from returning `null` to throwing an error (which the login handler must catch).
