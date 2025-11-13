import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createVersionedHtmlMiddleware } from '../middleware/versionInjection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const isDevelopment =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  !process.env.NODE_ENV;

// In production, serve from dist/web (built by Vite with hashed filenames)
// In development/test, serve from src/web (source files with manual version injection)
const webPath = isDevelopment
  ? path.join(__dirname, '..', 'web')
  : path.join(__dirname, '..', '..', 'dist', 'web');

console.log(
  `🌐 Serving static files from: ${webPath} (${isDevelopment ? 'development' : 'production'})`
);

// Serve the main HTML file at root
if (isDevelopment) {
  // Development: use version injection middleware for cache busting
  const htmlPath = path.join(webPath, 'index.html');
  router.get('/', createVersionedHtmlMiddleware(htmlPath));
} else {
  // Production: serve pre-built HTML with hashed assets from Vite
  router.get('/', (req, res) => {
    const htmlPath = path.join(webPath, 'index.html');
    res.set({
      'Cache-Control': 'no-cache, must-revalidate', // Always check for new HTML
      ETag: `"${process.env.BUILD_GIT_COMMIT || 'latest'}"`,
    });
    res.sendFile(htmlPath);
  });
}

// Serve all other static assets with appropriate caching
router.use(
  express.static(webPath, {
    setHeaders: (res, filePath) => {
      if (isDevelopment) {
        // Development: no cache for fast iteration
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        });
      } else {
        // Production: check if file has hash in filename (Vite output)
        // Pattern: main.abc123.js, main.abc123.css, etc.
        if (filePath.match(/\.[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i)) {
          // Hashed files: cache forever (immutable)
          res.set('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          // Non-hashed files: short cache with revalidation
          res.set('Cache-Control', 'public, max-age=300, must-revalidate');
        }
      }

      // Set correct MIME types with charset
      if (filePath.endsWith('.js')) {
        res.set('Content-Type', 'text/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.set('Content-Type', 'text/css; charset=utf-8');
      }
    },
  })
);

export default router;
