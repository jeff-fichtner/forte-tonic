import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Set root to src/web for clean output structure
  root: resolve(process.cwd(), 'src/web'),

  // Public directory for static assets
  publicDir: resolve(process.cwd(), 'src/web'),

  // Build configuration
  build: {
    outDir: resolve(process.cwd(), 'dist/web'), // Output to dist/web
    emptyOutDir: true,

    // Generate hashed filenames for cache busting
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'src/web/index.html'),
      },
      output: {
        // Hash everything for cache busting
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',

        // Manual chunks for better caching (Vite will auto-split by dynamic imports)
        manualChunks(id) {
          // Separate vendor code
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          // Let Vite handle automatic code splitting by dynamic imports
        },
      },
    },

    // Minification
    minify: 'esbuild',

    // Source maps for production debugging
    sourcemap: true,

    // Asset size warnings
    chunkSizeWarningLimit: 500,
  },

  // Dev server (for local development)
  server: {
    port: 5173,
    strictPort: false,
    fs: {
      // Allow serving files from parent directory (for /models and /utils)
      allow: ['..'],
    },
    proxy: {
      // Proxy API calls to Express backend during dev
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  // Public base path
  base: '/',

  // Module resolution
  resolve: {
    alias: {
      // Aliases for cleaner imports (optional)
      '@': resolve(process.cwd(), 'src/web/js'),
      '@models': resolve(process.cwd(), 'src/models'),
      '@utils': resolve(process.cwd(), 'src/utils'),
      // Handle absolute paths from web root (critical for Express compatibility)
      '/models': resolve(process.cwd(), 'src/models'),
      '/utils': resolve(process.cwd(), 'src/utils'),
    },
  },
});
