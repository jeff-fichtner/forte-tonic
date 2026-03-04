import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';
import staticRoutes from './routes/static.js';
import { initializeRepositories } from './middleware/auth.js';
import { configService } from './services/configurationService.js';
import { createLogger } from './utils/logger.js';
import { serviceContainer } from './infrastructure/container/serviceContainer.js';
import { errorResponse } from './common/responseHelpers.js';
import { ERROR_CODE, ERROR_TYPE } from './common/errorConstants.js';
import { runPendingMigrations } from './infrastructure/migration/migrationRunner.js';

const appDir = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Initialize logger
const logger = createLogger(configService);

// Get configuration from config service
const serverConfig = configService.getServerConfig();
const PORT = serverConfig.port;
const BASE_URL = configService.getBaseUrl();

logger.info(`Environment: ${serverConfig.nodeEnv}`);
logger.info(`Base URL: ${BASE_URL}`);

// Security and CORS middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Allow inline scripts
          'https://cdnjs.cloudflare.com',
          'https://cdn.jsdelivr.net',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Allow inline styles
          'https://cdnjs.cloudflare.com',
          'https://fonts.googleapis.com',
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com',
          'https://static.juicer.io',
          'data:',
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
      },
    },
  })
);

app.use(
  cors({
    origin: serverConfig.isDevelopment ? `http://localhost:${PORT}` : BASE_URL,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Check if we're in development mode
const isDevelopment = serverConfig.nodeEnv === 'development';

// Development cache headers to prevent caching issues
const developmentStaticOptions = isDevelopment
  ? {
      setHeaders: (res: Response, _path: string): void => {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        });
      },
    }
  : {};

// Apply authentication middleware to API routes (with exceptions)
// Apply repository initialization to all API routes (no authentication)
app.use('/api', initializeRepositories);

// Route handlers - IMPORTANT: Static routes must come before generic static middleware
// so that the version injection middleware for index.html runs first
app.use('/', staticRoutes);
app.use('/api', apiRoutes);

// Serve shared model classes for frontend ES module imports
// Only expose models/shared/ — not the full models/ directory
app.use(
  '/models/shared',
  express.static(path.join(appDir, 'models', 'shared'), {
    setHeaders: (res: Response): void => {
      if (isDevelopment) {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        });
      } else {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      res.set('Content-Type', 'text/javascript; charset=utf-8');
    },
  })
);

// Serve shared value constants for frontend ES module imports
// Only expose utils/values/ (enums, constants) — not the full utils/ directory
app.use(
  '/utils/values',
  express.static(path.join(appDir, 'utils', 'values'), {
    setHeaders: (res: Response): void => {
      if (isDevelopment) {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        });
      } else {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      res.set('Content-Type', 'text/javascript; charset=utf-8');
    },
  })
);

// Fallback: Serve other static files from web directory (images, etc)
// This comes AFTER the static routes so version injection middleware runs first
app.use(express.static(path.join(appDir, 'web'), developmentStaticOptions));

// 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: ERROR_CODE.NOT_FOUND,
      type: ERROR_TYPE.NOT_FOUND,
    },
  });
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', error);
  errorResponse(res, error, { req, context: { source: 'globalErrorHandler' } });
});

/**
 * Initialize the application services
 */
export async function initializeApp() {
  await serviceContainer.initialize();
  if (serviceContainer.dbClient) {
    await runPendingMigrations(serviceContainer.dbClient);
  }
}

export { app, PORT };
export default app;
