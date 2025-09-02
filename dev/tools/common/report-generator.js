/**
 * Report generation utilities for project analysis tools
 * Provides template processing and output generation
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Template processor for generating reports
 */
export class TemplateProcessor {
  /**
   * Load and process a template file
   * @param {string} templatePath - Path to template file
   * @param {Object} data - Data to inject into template
   * @returns {Promise<string>} Processed template content
   */
  async processTemplate(templatePath, data) {
    try {
      const template = await fs.readFile(templatePath, 'utf-8');
      return this.interpolateTemplate(template, data);
    } catch (error) {
      console.error(`Error processing template ${templatePath}:`, error);
      throw error;
    }
  }

  /**
   * Interpolate template variables with data
   * @param {string} template - Template string with {{variable}} placeholders
   * @param {Object} data - Data object with values
   * @returns {string} Processed template
   */
  interpolateTemplate(template, data) {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key);
      return value !== undefined ? value : match;
    });
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to search in
   * @param {string} key - Dot-notation key (e.g., 'analysis.fileCount')
   * @returns {*} Value or undefined
   */
  getNestedValue(obj, key) {
    return key.split('.').reduce((current, part) => {
      return current && current[part] !== undefined ? current[part] : undefined;
    }, obj);
  }

  /**
   * Generate table from array data
   * @param {Array<Object>} data - Array of objects to tabulate
   * @param {Array<string>} columns - Column names to include
   * @param {Object} options - Table generation options
   * @returns {string} Markdown table
   */
  generateTable(data, columns, options = {}) {
    if (!data || data.length === 0) {
      return options.emptyMessage || '_No data available_';
    }

    const maxRows = options.maxRows || data.length;
    const tableData = data.slice(0, maxRows);

    // Generate header
    const header = '| ' + columns.join(' | ') + ' |';
    const separator = '| ' + columns.map(() => '---').join(' | ') + ' |';

    // Generate rows
    const rows = tableData.map(item => {
      const cells = columns.map(col => {
        const value = this.getNestedValue(item, col);
        return this.formatTableCell(value);
      });
      return '| ' + cells.join(' | ') + ' |';
    });

    const table = [header, separator, ...rows].join('\n');

    // Add truncation notice if needed
    if (data.length > maxRows) {
      return table + `\n\n_Showing ${maxRows} of ${data.length} entries_`;
    }

    return table;
  }

  /**
   * Format a single table cell value
   * @param {*} value - Value to format
   * @returns {string} Formatted cell content
   */
  formatTableCell(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 47) + '...';
    }
    return String(value);
  }

  /**
   * Generate progress bar for metrics
   * @param {number} value - Current value
   * @param {number} max - Maximum value
   * @param {number} width - Width of progress bar
   * @returns {string} Text progress bar
   */
  generateProgressBar(value, max, width = 20) {
    if (max === 0) return '░'.repeat(width);
    
    const percentage = Math.min(value / max, 1);
    const filled = Math.round(percentage * width);
    const empty = width - filled;
    
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(percentage * 100)}%`;
  }
}

/**
 * Report output manager
 */
export class ReportOutputManager {
  constructor(outputConfig = {}) {
    this.resultsDir = outputConfig.resultsDir || './results';
    this.historyDir = outputConfig.historyDir || './results/history';
    this.files = outputConfig.files || {};
  }

  /**
   * Ensure output directories exist
   * @returns {Promise<void>}
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.resultsDir, { recursive: true });
      await fs.mkdir(this.historyDir, { recursive: true });
      
      // Create .gitkeep files if directories are empty
      await this.createGitKeep(this.resultsDir);
      await this.createGitKeep(this.historyDir);
    } catch (error) {
      console.error('Error creating output directories:', error);
      throw error;
    }
  }

  /**
   * Create .gitkeep file if directory is empty
   * @param {string} dirPath - Directory path
   * @returns {Promise<void>}
   */
  async createGitKeep(dirPath) {
    try {
      const entries = await fs.readdir(dirPath);
      const hasContentFiles = entries.some(entry => entry !== '.gitkeep');
      
      if (!hasContentFiles) {
        const gitKeepPath = path.join(dirPath, '.gitkeep');
        await fs.writeFile(gitKeepPath, '', 'utf-8');
      }
    } catch (error) {
      // Ignore errors for .gitkeep creation
    }
  }

  /**
   * Save analysis data to JSON file
   * @param {Object} data - Analysis data to save
   * @param {string} filename - Output filename
   * @returns {Promise<void>}
   */
  async saveAnalysisData(data, filename) {
    const outputPath = path.join(this.resultsDir, filename);
    const formattedData = JSON.stringify(data, null, 2);
    
    try {
      await fs.writeFile(outputPath, formattedData, 'utf-8');
      console.log(`✅ Analysis data saved to ${outputPath}`);
    } catch (error) {
      console.error(`Error saving analysis data to ${outputPath}:`, error);
      throw error;
    }
  }

  /**
   * Save report to markdown file
   * @param {string} content - Report content
   * @param {string} filename - Output filename
   * @returns {Promise<void>}
   */
  async saveReport(content, filename) {
    const outputPath = path.join(this.resultsDir, filename);
    
    try {
      await fs.writeFile(outputPath, content, 'utf-8');
      console.log(`📄 Report saved to ${outputPath}`);
    } catch (error) {
      console.error(`Error saving report to ${outputPath}:`, error);
      throw error;
    }
  }

  /**
   * Save historical snapshot of analysis
   * @param {Object} data - Analysis data
   * @returns {Promise<void>}
   */
  async saveHistoricalSnapshot(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `analysis-${timestamp}.json`;
    const outputPath = path.join(this.historyDir, filename);
    
    const snapshotData = {
      timestamp: new Date().toISOString(),
      data: data
    };
    
    try {
      const formattedData = JSON.stringify(snapshotData, null, 2);
      await fs.writeFile(outputPath, formattedData, 'utf-8');
      console.log(`🕐 Historical snapshot saved to ${outputPath}`);
    } catch (error) {
      console.error(`Error saving historical snapshot:`, error);
      throw error;
    }
  }

  /**
   * Load previous analysis data for comparison
   * @returns {Promise<Object|null>} Previous analysis data or null
   */
  async loadPreviousAnalysis() {
    const latestFile = path.join(this.resultsDir, this.files.latestData || 'latest.json');
    
    try {
      const content = await fs.readFile(latestFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // No previous analysis found, which is fine for first run
      return null;
    }
  }

  /**
   * Load historical analysis data
   * @param {number} maxCount - Maximum number of historical analyses to load
   * @returns {Promise<Array>} Array of historical analysis data
   */
  async loadHistoricalAnalyses(maxCount = 5) {
    try {
      const files = await fs.readdir(this.historyDir);
      const analysisFiles = files
        .filter(file => file.startsWith('analysis-') && file.endsWith('.json'))
        .sort()
        .reverse() // Most recent first
        .slice(0, maxCount);

      const historicalData = [];
      
      for (const file of analysisFiles) {
        try {
          const filePath = path.join(this.historyDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          historicalData.push(data);
        } catch (error) {
          console.warn(`Warning: Could not load historical file ${file}:`, error.message);
        }
      }

      return historicalData;
    } catch (error) {
      console.warn('Warning: Could not load historical analyses:', error.message);
      return [];
    }
  }
}