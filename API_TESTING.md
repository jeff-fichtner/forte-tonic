# API Testing

The canonical API testing artifacts are:

- **Postman collection**: [scripts/postman/tonic-api.postman_collection.json](scripts/postman/tonic-api.postman_collection.json) — import into Postman alongside one of the environment files in [scripts/postman/](scripts/postman/) (`local.postman_environment.json`, `staging.postman_environment.json`, or `production.postman_environment.json`).
- **Route definitions**: [src/routes/api.ts](src/routes/api.ts) — the source of truth for every endpoint, method, path, and auth requirement.

## Local server

```bash
npm run dev
```

Server runs on `http://localhost:3000` by default. See [docs/technical/ENVIRONMENT_VARIABLES.md](docs/technical/ENVIRONMENT_VARIABLES.md) for configurable settings.

## Authentication

Every endpoint except the four public ones (`/health`, `/version`, `/configuration`, `/auth/access-code`) requires the `x-access-code` and `x-login-type` request headers. The Postman collection's `local` environment includes a test access code; or sign in through the running UI at `http://localhost:3000` and copy the `forte_auth_session` localStorage value to construct headers manually.

## Response envelope

All responses follow the standard envelope:

- Success: `{ "success": true, "data": ... }`
- Error: `{ "success": false, "error": { "message": "...", "code": "...", "type": "..." } }`
