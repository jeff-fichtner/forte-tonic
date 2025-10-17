import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Development cache headers to prevent caching issues
const developmentHeaders = isDevelopment
  ? {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    }
  : {};

// Serve the main HTML file at root
router.get('/', (req, res) => {
  if (isDevelopment) {
    // Set headers to prevent caching in development
    Object.entries(developmentHeaders).forEach(([key, value]) => {
      res.set(key, value);
    });
  }
  res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
});

// Use Express.js built-in static middleware for efficient file serving
const webPath = path.join(__dirname, '..', 'web');

// Serve JavaScript files with correct MIME type
router.use(
  '/js',
  express.static(path.join(webPath, 'js'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.set('Content-Type', 'text/javascript');
      }
      // Add development cache headers
      if (isDevelopment) {
        Object.entries(developmentHeaders).forEach(([key, value]) => {
          res.set(key, value);
        });
      }
    },
  })
);

// Serve CSS files with correct MIME type
router.use(
  '/css',
  express.static(path.join(webPath, 'css'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.css')) {
        res.set('Content-Type', 'text/css');
      }
      // Add development cache headers
      if (isDevelopment) {
        Object.entries(developmentHeaders).forEach(([key, value]) => {
          res.set(key, value);
        });
      }
    },
  })
);

// Serve image files
router.use('/images', express.static(path.join(webPath, 'images')));

// Serve model files for frontend imports
router.use(
  '/models',
  express.static(path.join(__dirname, '..', 'models'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.set('Content-Type', 'text/javascript');
      }
      // Add development cache headers
      if (isDevelopment) {
        Object.entries(developmentHeaders).forEach(([key, value]) => {
          res.set(key, value);
        });
      }
    },
  })
);

// Serve utility files for frontend imports
router.use(
  '/utils',
  express.static(path.join(__dirname, '..', 'utils'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.set('Content-Type', 'text/javascript');
      }
      // Add development cache headers
      if (isDevelopment) {
        Object.entries(developmentHeaders).forEach(([key, value]) => {
          res.set(key, value);
        });
      }
    },
  })
);

export default router;
