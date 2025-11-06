import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createVersionedHtmlMiddleware } from '../middleware/versionInjection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Development cache headers for non-HTML files
const developmentHeaders = isDevelopment
  ? {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    }
  : {};

// Production cache headers for versioned assets (long cache)
const productionAssetHeaders = !isDevelopment
  ? {
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year for versioned assets
    }
  : {};

// Serve the main HTML file at root with version injection
const htmlPath = path.join(__dirname, '..', 'web', 'index.html');
router.get('/', createVersionedHtmlMiddleware(htmlPath));

// Use Express.js built-in static middleware for efficient file serving
const webPath = path.join(__dirname, '..', 'web');

// Serve JavaScript files with correct MIME type and versioned cache headers
router.use(
  '/js',
  express.static(path.join(webPath, 'js'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.set('Content-Type', 'text/javascript');
      }

      // Apply cache headers based on environment
      if (isDevelopment) {
        Object.entries(developmentHeaders).forEach(([key, value]) => {
          res.set(key, value);
        });
      } else {
        // In production, use long cache for versioned assets
        // Since we inject version params in HTML, all JS will have ?v=hash
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// Serve CSS files with correct MIME type and versioned cache headers
router.use(
  '/css',
  express.static(path.join(webPath, 'css'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.css')) {
        res.set('Content-Type', 'text/css');
      }

      // Apply cache headers based on environment
      if (isDevelopment) {
        Object.entries(developmentHeaders).forEach(([key, value]) => {
          res.set(key, value);
        });
      } else {
        // In production, use long cache for versioned assets
        // Since we inject version params in HTML, all CSS will have ?v=hash
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// Serve image files
router.use('/images', express.static(path.join(webPath, 'images')));

// Serve model files for frontend imports with versioned cache headers
router.use(
  '/models',
  express.static(path.join(__dirname, '..', 'models'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.set('Content-Type', 'text/javascript');
      }

      // Apply cache headers based on environment
      if (isDevelopment) {
        Object.entries(developmentHeaders).forEach(([key, value]) => {
          res.set(key, value);
        });
      } else {
        // In production, use long cache for versioned assets
        // Since we inject version params in HTML, all imports will have ?v=hash
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// Serve utility files for frontend imports with versioned cache headers
router.use(
  '/utils',
  express.static(path.join(__dirname, '..', 'utils'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.set('Content-Type', 'text/javascript');
      }

      // Apply cache headers based on environment
      if (isDevelopment) {
        Object.entries(developmentHeaders).forEach(([key, value]) => {
          res.set(key, value);
        });
      } else {
        // In production, use long cache for versioned assets
        // Since we inject version params in HTML, all imports will have ?v=hash
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

export default router;
