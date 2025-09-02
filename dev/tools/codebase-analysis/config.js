/**
 * Configuration for Tonic Codebase Analysis Tool
 */

export const CONFIG = {
  // Analysis scope and patterns
  analysis: {
    // Directories to analyze (relative to project root)
    includeDirs: [
      'src',
      'dev/tools',
      'tests'
    ],
    
    // Directories to exclude
    excludeDirs: [
      'node_modules',
      '.git',
      'build',
      'dist',
      'coverage',
      'docs/generated'
    ],
    
    // File patterns to analyze
    filePatterns: {
      javascript: ['**/*.js', '**/*.mjs'],
      html: ['**/*.html'],
      markdown: ['**/*.md'],
      config: ['**/package.json', '**/*.json', '**/*.yml', '**/*.yaml']
    },
    
    // Code patterns to identify
    codePatterns: {
      // Authentication patterns
      auth: {
        middleware: /export.*auth|auth.*middleware/gi,
        controllers: /authenticate|login|logout/gi,
        routes: /\/auth|\/login|authenticate/gi,
        accessCodes: /accessCode|access.*code/gi
      },
      
      // API patterns  
      api: {
        controllers: /export class.*Controller/gi,
        routes: /router\.(get|post|put|delete)/gi,
        endpoints: /\/api\//gi,
        middleware: /export.*middleware/gi
      },
      
      // Data model patterns
      models: {
        classes: /export class/gi,
        repositories: /Repository/gi,
        services: /Service/gi,
        responses: /Response/gi
      },
      
      // Frontend patterns
      frontend: {
        viewModel: /ViewModel/gi,
        components: /component/gi,
        utilities: /utility|util|helper/gi,
        workflows: /workflow/gi
      }
    }
  },
  
  // Output configuration
  output: {
    // Where to store analysis results
    resultsDir: './results',
    historyDir: './results/history',
    
    // Output file names
    files: {
      latestData: 'latest.json',
      summary: 'summary.md',
      detailed: 'detailed.md'
    },
    
    // Template configuration
    templates: {
      summary: 'dev/tools/codebase-analysis/templates/summary.md.template',
      detailed: 'dev/tools/codebase-analysis/templates/detailed.md.template'
    }
  },
  
  // Self-reference configuration
  selfReference: {
    // Enable comparison with previous analysis
    enableComparison: true,
    
    // Maximum number of historical analyses to compare
    maxHistoryComparisons: 5,
    
    // Metrics to track over time
    trackMetrics: [
      'fileCount',
      'authPatternCount', 
      'apiEndpointCount',
      'modelCount',
      'componentCount'
    ]
  },
  
  // Logging configuration
  logging: {
    level: 'info', // debug, info, warn, error
    showProgress: true,
    showTimestamp: true
  }
};

// Helper function to get project root
export function getProjectRoot() {
  // Detect if running from tools directory or project root
  const cwd = process.cwd();
  if (cwd.includes('dev/tools')) {
    return cwd.split('/dev/tools')[0];
  }
  return cwd;
}

// Helper function to resolve paths relative to project root
export function resolvePath(relativePath) {
  const projectRoot = getProjectRoot();
  return `${projectRoot}/${relativePath}`;
}