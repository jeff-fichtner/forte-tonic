/**
 * File utilities for project analysis tools
 * Provides file system scanning, pattern matching, and content analysis
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

/**
 * Scan directories and files based on patterns
 */
export class FileScanner {
  constructor(config = {}) {
    this.includeDirs = config.includeDirs || [];
    this.excludeDirs = config.excludeDirs || [];
    this.filePatterns = config.filePatterns || {};
  }

  /**
   * Get all files matching specified patterns
   * @param {string} rootDir - Root directory to scan from
   * @param {Array<string>} patterns - Glob patterns to match
   * @returns {Promise<Array<string>>} Array of file paths
   */
  async getMatchingFiles(rootDir, patterns) {
    const allFiles = [];
    
    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: rootDir,
        ignore: this.excludeDirs.map(dir => `${dir}/**`),
        absolute: false
      });
      // glob v11 always returns an array
      allFiles.push(...files);
    }
    
    // Remove duplicates and sort
    return [...new Set(allFiles)].sort();
  }

  /**
   * Get files by category (javascript, html, etc.)
   * @param {string} rootDir - Root directory to scan from
   * @returns {Promise<Object>} Object with file categories
   */
  async getFilesByCategory(rootDir) {
    const filesByCategory = {};
    
    for (const [category, patterns] of Object.entries(this.filePatterns)) {
      filesByCategory[category] = await this.getMatchingFiles(rootDir, patterns);
    }
    
    return filesByCategory;
  }

  /**
   * Get directory structure
   * @param {string} rootDir - Root directory to scan from
   * @param {number} maxDepth - Maximum depth to scan
   * @returns {Promise<Object>} Directory structure object
   */
  async getDirectoryStructure(rootDir, maxDepth = 3) {
    const structure = {};
    
    async function scanDir(dirPath, currentDepth = 0) {
      if (currentDepth >= maxDepth) return null;
      
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const dirInfo = {
          files: [],
          directories: {}
        };
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(rootDir, fullPath);
          
          // Skip excluded directories
          if (this.excludeDirs.some(excluded => relativePath.startsWith(excluded))) {
            continue;
          }
          
          if (entry.isDirectory()) {
            const subStructure = await scanDir(fullPath, currentDepth + 1);
            if (subStructure) {
              dirInfo.directories[entry.name] = subStructure;
            }
          } else {
            dirInfo.files.push(entry.name);
          }
        }
        
        return dirInfo;
      } catch (error) {
        console.warn(`Warning: Could not scan directory ${dirPath}:`, error.message);
        return null;
      }
    }
    
    return await scanDir(rootDir);
  }
}

/**
 * Pattern matching utilities for code analysis
 */
export class PatternMatcher {
  /**
   * Find pattern matches in file content
   * @param {string} content - File content to search
   * @param {Object} patterns - Pattern definitions
   * @returns {Object} Match results organized by pattern category
   */
  findPatterns(content, patterns) {
    const results = {};
    
    for (const [category, categoryPatterns] of Object.entries(patterns)) {
      results[category] = {};
      
      for (const [patternName, regex] of Object.entries(categoryPatterns)) {
        const matches = content.match(regex) || [];
        results[category][patternName] = {
          count: matches.length,
          matches: matches.slice(0, 10) // Limit to first 10 matches for performance
        };
      }
    }
    
    return results;
  }

  /**
   * Analyze file content for various metrics
   * @param {string} content - File content to analyze
   * @param {string} filePath - Path to the file (for context)
   * @returns {Object} Analysis results
   */
  analyzeContent(content, filePath) {
    const lines = content.split('\n');
    const fileExtension = path.extname(filePath);
    
    return {
      filePath,
      fileType: fileExtension,
      metrics: {
        lineCount: lines.length,
        nonEmptyLineCount: lines.filter(line => line.trim().length > 0).length,
        characterCount: content.length,
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length
      },
      structure: this.analyzeStructure(content, fileExtension),
      dependencies: this.extractDependencies(content, fileExtension)
    };
  }

  /**
   * Analyze code structure based on file type
   * @param {string} content - File content
   * @param {string} fileExtension - File extension
   * @returns {Object} Structure analysis
   */
  analyzeStructure(content, fileExtension) {
    const structure = {
      exports: [],
      imports: [],
      classes: [],
      functions: []
    };

    if (fileExtension === '.js' || fileExtension === '.mjs') {
      // Find imports
      const importMatches = content.match(/import\s+.*from\s+['"]([^'"]+)['"]/g) || [];
      structure.imports = importMatches.map(match => {
        const moduleMatch = match.match(/from\s+['"]([^'"]+)['"]/);
        return moduleMatch ? moduleMatch[1] : null;
      }).filter(Boolean);

      // Find exports  
      const exportMatches = content.match(/export\s+(class|function|const|let|var)\s+(\w+)/g) || [];
      structure.exports = exportMatches.map(match => {
        const nameMatch = match.match(/export\s+(?:class|function|const|let|var)\s+(\w+)/);
        return nameMatch ? nameMatch[1] : null;
      }).filter(Boolean);

      // Find classes
      const classMatches = content.match(/(?:export\s+)?class\s+(\w+)/g) || [];
      structure.classes = classMatches.map(match => {
        const nameMatch = match.match(/class\s+(\w+)/);
        return nameMatch ? nameMatch[1] : null;
      }).filter(Boolean);

      // Find functions
      const functionMatches = content.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g) || [];
      structure.functions = functionMatches.map(match => {
        const nameMatch = match.match(/function\s+(\w+)/);
        return nameMatch ? nameMatch[1] : null;
      }).filter(Boolean);
    }

    return structure;
  }

  /**
   * Extract dependencies from file content
   * @param {string} content - File content
   * @param {string} fileExtension - File extension
   * @returns {Array} Array of dependency names
   */
  extractDependencies(content, fileExtension) {
    const dependencies = new Set();

    if (fileExtension === '.js' || fileExtension === '.mjs') {
      // ES6 imports
      const importMatches = content.match(/import\s+.*from\s+['"]([^'"]+)['"]/g) || [];
      importMatches.forEach(match => {
        const moduleMatch = match.match(/from\s+['"]([^'"]+)['"]/);
        if (moduleMatch) {
          dependencies.add(moduleMatch[1]);
        }
      });

      // require() calls
      const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
      requireMatches.forEach(match => {
        const moduleMatch = match.match(/require\(['"]([^'"]+)['"]\)/);
        if (moduleMatch) {
          dependencies.add(moduleMatch[1]);
        }
      });
    }

    return Array.from(dependencies);
  }
}

/**
 * File content reader with error handling
 */
export class FileReader {
  /**
   * Read file content safely
   * @param {string} filePath - Path to file
   * @returns {Promise<string|null>} File content or null if error
   */
  async readFile(filePath) {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Read multiple files
   * @param {Array<string>} filePaths - Array of file paths
   * @returns {Promise<Array<Object>>} Array of {path, content} objects
   */
  async readFiles(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      const content = await this.readFile(filePath);
      if (content !== null) {
        results.push({ path: filePath, content });
      }
    }
    
    return results;
  }
}