import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';
import staticRoutes from './routes/static.js';
import { initializeUserContext, requireAuth, requireOperator } from './middleware/auth.js';
import { configService } from './core/services/configurationService.js';
import { createLogger } from './core/utilities/logger.js';
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

// Serve static files
app.use(express.static(path.join(__dirname, 'web')));

// Serve shared models for frontend access
app.use('/shared', express.static(path.join(__dirname, 'shared')));

// Serve core utilities for frontend access
app.use('/core', express.static(path.join(__dirname, 'core')));

// Apply authentication middleware to API routes
app.use('/api', initializeUserContext);
app.use('/api', requireAuth);
app.use('/api', requireOperator);

// Route handlers
app.use('/', staticRoutes);
app.use('/api', apiRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
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
