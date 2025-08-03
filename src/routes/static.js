import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Serve the main HTML file at root
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
});

// Use Express.js built-in static middleware for efficient file serving
const webPath = path.join(__dirname, '..', 'web');

// Serve JavaScript files with correct MIME type
router.use('/js', express.static(path.join(webPath, 'js'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'text/javascript');
    }
  }
}));

// Serve CSS files with correct MIME type
router.use('/css', express.static(path.join(webPath, 'css'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

// Serve image files
router.use('/images', express.static(path.join(webPath, 'images')));

export default router;
