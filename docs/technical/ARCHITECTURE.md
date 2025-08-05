# Server Architecture - Separated Concerns

This refactoring separates the monolithic `server.js` file into focused, maintainable modules following professional Node.js patterns.

## New Structure

```
src/
├── app.js              # Express app configuration & middleware
├── server.js           # Server startup (entry point)
├── middleware/
│   └── auth.js         # Authentication & authorization middleware
├── routes/
│   ├── api.js          # API endpoint handlers
│   └── static.js       # Static file serving routes
└── utils/
    └── helpers.js      # Utility functions (pagination, data processing)
```

## Separated Concerns

### 1. **app.js** - Application Configuration

- Express app setup
- Middleware configuration (CORS, Helmet, etc.)
- Route mounting
- Error handling
- **Exports**: `{ app, PORT }`

### 2. **server.js** - Server Entry Point

- Simple server startup (no conditional logic needed)
- Imports configured app from app.js
- **Exports**: `app` (default)

### 3. **middleware/auth.js** - Authentication

- User context initialization
- Authentication checks
- Authorization middleware
- **Exports**: `{ initializeUserContext, requireAuth, requireOperator }`

### 4. **routes/api.js** - API Routes

- All `/api/*` endpoint handlers
- Business logic for each endpoint
- **Exports**: Express router (default)

### 5. **routes/static.js** - Static Routes

- File serving (`/`, `/include/*`)
- Static asset handling
- **Exports**: Express router (default)

### 6. **utils/helpers.js** - Utility Functions

- Data processing functions
- Pagination logic
- Request/response helpers
- **Exports**: `{ _fetchData, _respond, paginate, _retrieveDataFromRequest }`

## Benefits

### ✅ **Maintainability**

- Each file has a single responsibility
- Easier to locate and modify specific functionality
- Reduced cognitive load when working on features

### ✅ **Testability**

- Individual modules can be unit tested in isolation
- Easier to mock specific components
- Integration tests remain unchanged

### ✅ **Reusability**

- Middleware can be reused across different route groups
- Utilities can be imported where needed
- Modular design supports future expansion

### ✅ **Professional Standards**

- Follows Node.js/Express best practices
- Matches patterns used in enterprise applications
- Easier onboarding for new developers

## Usage

### Development

```bash
# Start server (same as before)
node src/server.js

# Run tests (unchanged)
npm test
npm run test:integration
```

### Testing

```javascript
// Import for integration testing (now imports app.js directly)
import { app } from '../src/app.js';

// Individual module testing
import { initializeUserContext } from '../src/middleware/auth.js';
import { _fetchData } from '../src/utils/helpers.js';
```

## Migration Notes

- **No breaking changes** - All existing functionality preserved
- **Tests updated** - Integration tests now import `app.js` instead of `server.js` to avoid starting server
- **Cleaner entry point** - `src/server.js` is now a simple startup file
- **No conditional execution** - Import.meta.url check removed as it's no longer needed

This refactoring maintains full backward compatibility while significantly improving code organization and maintainability.
