/**
 * Version Injection Middleware
 * Injects version hash into HTML file for cache busting
 */

import type { Request, Response } from 'express';
import { readFileSync } from 'fs';
import { version } from '../config/environment.js';

/**
 * Cache for the processed HTML with version hashes
 * Regenerated on server restart to pick up new version
 */
let cachedVersionedHtml: string | null = null;

/**
 * Middleware to serve index.html with version hashes injected
 * @param htmlPath - Path to the HTML file
 * @returns Express middleware function
 */
export function createVersionedHtmlMiddleware(htmlPath: string): (req: Request, res: Response) => void {
  return (req: Request, res: Response): void => {
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
      // In production, use ETag-based revalidation
      // Browser must check with server on each load to see if version changed
      // If ETag matches, server responds 304 Not Modified (fast)
      // If ETag differs (new deployment), server sends new HTML
      res.set({
        'Cache-Control': 'no-cache, must-revalidate',
        ETag: `"${version.frontendHash}"`,
      });
    }

    res.send(cachedVersionedHtml);
  };
}

/**
 * Inject version hash into script and link tags
 * @param html - Original HTML content
 * @param versionHash - Version hash to inject
 * @returns Modified HTML with version parameters
 */
function injectVersionHashes(html: string, versionHash: string): string {
  // Inject version into script tags
  // Match: <script ...src="..." or <script src="..."
  html = html.replace(/<script([^>]*?)\ssrc=["']([^"'?]+)["']/gi, (match: string, attrs: string, src: string): string => {
    // Only inject for local scripts (not CDN)
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return match;
    }
    return `<script${attrs} src="${src}?v=${versionHash}"`;
  });

  // Inject version into link tags (CSS)
  html = html.replace(/<link([^>]*?)\shref=["']([^"'?]+\.css)["']/gi, (match: string, attrs: string, href: string): string => {
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
export function clearVersionedHtmlCache(): void {
  cachedVersionedHtml = null;
}
