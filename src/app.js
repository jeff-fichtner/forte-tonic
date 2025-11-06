import express from 'express';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      setHeaders: (res, _path) => {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        });
      },
    }
  : {};

// Production cache headers for versioned assets
const productionVersionedOptions = !isDevelopment
  ? {
      setHeaders: (res, filePath, stat) => {
        // Check if request has version parameter (from req object in middleware)
        // For static middleware, we'll use a different approach
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
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

// Serve shared models for frontend access with versioned caching
app.use(
  '/shared',
  express.static(path.join(__dirname, 'shared'), {
    setHeaders: (res) => {
      if (isDevelopment) {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        });
      } else {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// Serve core utilities for frontend access with versioned caching
app.use(
  '/core',
  express.static(path.join(__dirname, 'core'), {
    setHeaders: (res) => {
      if (isDevelopment) {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        });
      } else {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// Fallback: Serve other static files from web directory (images, etc)
// This comes AFTER the static routes so version injection middleware runs first
app.use(express.static(path.join(__dirname, 'web'), developmentStaticOptions));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((error, req, res, _next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: configService.isDevelopment() ? error.message : 'Something went wrong',
  });
});

/**
 * Initialize the application services
 */
export async function initializeApp() {
  await serviceContainer.initialize();
}

export { app, PORT };
export default app;
