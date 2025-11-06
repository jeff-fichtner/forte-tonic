/**
 * Version Injection Middleware
 * Injects version hash into HTML file for cache busting
 */

import { readFileSync } from 'fs';
import { version } from '../config/environment.js';

/**
 * Cache for the processed HTML with version hashes
 * Regenerated on server restart to pick up new version
 */
let cachedVersionedHtml = null;

/**
 * Middleware to serve index.html with version hashes injected
 * @param {string} htmlPath - Path to the HTML file
 * @returns {Function} Express middleware function
 */
export function createVersionedHtmlMiddleware(htmlPath) {
  return (req, res) => {
    // In development, regenerate HTML on each request to pick up changes
    const isDevelopment = version.environment === 'development';

    if (!cachedVersionedHtml || isDevelopment) {
      const html = readFileSync(htmlPath, 'utf8');
      cachedVersionedHtml = injectVersionHashes(html, version.frontendHash);
    }

    // Set appropriate cache headers
    if (isDevelopment) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });
    } else {
      // In production, cache HTML for a short time but assets for longer
      res.set({
        'Cache-Control': 'public, max-age=300', // 5 minutes for HTML
      });
    }

    res.send(cachedVersionedHtml);
  };
}

/**
 * Inject version hash into script and link tags
 * @param {string} html - Original HTML content
 * @param {string} versionHash - Version hash to inject
 * @returns {string} Modified HTML with version parameters
 */
function injectVersionHashes(html, versionHash) {
  // Inject version into script tags
  // Match: <script ...src="..." or <script src="..."
  html = html.replace(/<script([^>]*?)\ssrc=["']([^"'?]+)["']/gi, (match, attrs, src) => {
    // Only inject for local scripts (not CDN)
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return match;
    }
    return `<script${attrs} src="${src}?v=${versionHash}"`;
  });

  // Inject version into link tags (CSS)
  html = html.replace(/<link([^>]*?)\shref=["']([^"'?]+\.css)["']/gi, (match, attrs, href) => {
    // Only inject for local stylesheets (not CDN)
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return match;
    }
    return `<link${attrs} href="${href}?v=${versionHash}"`;
  });

  return html;
}

/**
 * Clear the cached HTML (useful for testing or manual cache invalidation)
 */
export function clearVersionedHtmlCache() {
  cachedVersionedHtml = null;
}
