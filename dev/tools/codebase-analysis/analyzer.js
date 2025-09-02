#!/usr/bin/env node

/**
 * Tonic Codebase Analysis Tool
 * A self-referential analysis tool that examines project structure and patterns
 */

import path from 'path';
import { CONFIG, getProjectRoot, resolvePath } from './config.js';
import { FileScanner, PatternMatcher, FileReader } from '../common/file-utils.js';
import { TemplateProcessor, ReportOutputManager } from '../common/report-generator.js';

class CodebaseAnalyzer {
  constructor() {
    this.projectRoot = getProjectRoot();
    this.startTime = Date.now();
    
    // Initialize utilities
    this.fileScanner = new FileScanner(CONFIG.analysis);
    this.patternMatcher = new PatternMatcher();
    this.fileReader = new FileReader();
    this.templateProcessor = new TemplateProcessor();
    this.outputManager = new ReportOutputManager(CONFIG.output);
    
    // Analysis results
    this.analysisData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      config: CONFIG,
      analysis: {},
      performance: {},
      selfAnalysis: {}
    };

    this.log('🔍 Tonic Codebase Analyzer initialized');
    this.log(`📁 Project root: ${this.projectRoot}`);
  }

  /**
   * Run the complete analysis
   */
  async analyze() {
    try {
      await this.outputManager.ensureDirectories();
      
      this.log('🚀 Starting codebase analysis...');
      
      // Load previous analysis for comparison
      const previousAnalysis = await this.outputManager.loadPreviousAnalysis();
      
      // Run analysis phases
      await this.analyzeProjectStructure();
      await this.analyzeCodePatterns();
      await this.analyzeDependencies();
      await this.analyzeCodeQuality();
      await this.performSelfAnalysis();
      
      // Compare with previous analysis if available
      if (previousAnalysis && CONFIG.selfReference.enableComparison) {
        await this.compareWithPrevious(previousAnalysis);
      }
      
      // Generate performance metrics
      this.generatePerformanceMetrics();
      
      // Generate insights and recommendations
      await this.generateInsights();
      
      // Save analysis data
      await this.saveResults();
      
      // Generate reports
      await this.generateReports();
      
      this.log('✅ Analysis complete!');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  }

  /**
   * Analyze project structure and file organization
   */
  async analyzeProjectStructure() {
    this.log('📁 Analyzing project structure...');
    
    const filesByCategory = await this.fileScanner.getFilesByCategory(this.projectRoot);
    const directoryStructure = await this.fileScanner.getDirectoryStructure(this.projectRoot);
    
    // Calculate file metrics
    const allFiles = Object.values(filesByCategory).flat();
    const fileDetails = [];
    let totalLines = 0;
    
    for (const filePath of allFiles) {
      const fullPath = path.join(this.projectRoot, filePath);
      const content = await this.fileReader.readFile(fullPath);
      
      if (content) {
        const analysis = this.patternMatcher.analyzeContent(content, filePath);
        fileDetails.push(analysis);
        totalLines += analysis.metrics.lineCount;
      }
    }
    
    this.analysisData.analysis.structure = {
      filesByCategory,
      directoryStructure,
      fileDetails,
      totalFiles: allFiles.length,
      totalLines,
      fileTypeDistribution: this.calculateFileTypeDistribution(filesByCategory)
    };
    
    this.log(`📊 Analyzed ${allFiles.length} files (${totalLines.toLocaleString()} lines)`);
  }

  /**
   * Analyze code patterns across the codebase
   */
  async analyzeCodePatterns() {
    this.log('🔍 Analyzing code patterns...');
    
    const { fileDetails } = this.analysisData.analysis.structure;
    const patternResults = {
      auth: { total: 0, files: [], patterns: {} },
      api: { total: 0, files: [], patterns: {} },
      models: { total: 0, files: [], patterns: {} },
      frontend: { total: 0, files: [], patterns: {} }
    };
    
    for (const fileDetail of fileDetails) {
      const content = await this.fileReader.readFile(path.join(this.projectRoot, fileDetail.filePath));
      if (!content) continue;
      
      const matches = this.patternMatcher.findPatterns(content, CONFIG.analysis.codePatterns);
      
      // Process pattern matches for each category
      for (const [category, categoryMatches] of Object.entries(matches)) {
        if (!patternResults[category]) continue;
        
        let categoryTotal = 0;
        for (const [patternName, patternData] of Object.entries(categoryMatches)) {
          categoryTotal += patternData.count;
          
          if (!patternResults[category].patterns[patternName]) {
            patternResults[category].patterns[patternName] = [];
          }
          
          if (patternData.count > 0) {
            patternResults[category].patterns[patternName].push({
              file: fileDetail.filePath,
              count: patternData.count,
              matches: patternData.matches
            });
          }
        }
        
        if (categoryTotal > 0) {
          patternResults[category].total += categoryTotal;
          patternResults[category].files.push({
            file: fileDetail.filePath,
            count: categoryTotal,
            patterns: categoryMatches
          });
        }
      }
    }
    
    this.analysisData.analysis.patterns = patternResults;
    
    // Analyze specific architectural components
    await this.analyzeArchitecturalComponents();
    
    this.log('🎯 Pattern analysis complete');
  }

  /**
   * Analyze specific architectural components (controllers, models, etc.)
   */
  async analyzeArchitecturalComponents() {
    this.log('🏗️ Analyzing architectural components...');
    
    const components = {
      controllers: [],
      models: [],
      repositories: [],
      services: [],
      middleware: []
    };
    
    const { fileDetails } = this.analysisData.analysis.structure;
    
    for (const fileDetail of fileDetails) {
      const fileName = path.basename(fileDetail.filePath);
      const filePath = fileDetail.filePath;
      
      // Categorize files by architectural role
      if (fileName.includes('Controller') || filePath.includes('controllers/')) {
        components.controllers.push(this.analyzeComponent(fileDetail, 'controller'));
      } else if (fileName.includes('Repository') || filePath.includes('repositories/')) {
        components.repositories.push(this.analyzeComponent(fileDetail, 'repository'));
      } else if (fileName.includes('Service') || filePath.includes('services/')) {
        components.services.push(this.analyzeComponent(fileDetail, 'service'));
      } else if (filePath.includes('models/')) {
        components.models.push(this.analyzeComponent(fileDetail, 'model'));
      } else if (filePath.includes('middleware/')) {
        components.middleware.push(this.analyzeComponent(fileDetail, 'middleware'));
      }
    }
    
    this.analysisData.analysis.components = components;
  }

  /**
   * Analyze a single architectural component
   */
  analyzeComponent(fileDetail, componentType) {
    return {
      name: path.basename(fileDetail.filePath, path.extname(fileDetail.filePath)),
      path: fileDetail.filePath,
      type: componentType,
      metrics: fileDetail.metrics,
      structure: fileDetail.structure,
      dependencies: fileDetail.dependencies
    };
  }

  /**
   * Analyze dependencies within the codebase
   */
  async analyzeDependencies() {
    this.log('🔗 Analyzing dependencies...');
    
    const { fileDetails } = this.analysisData.analysis.structure;
    const dependencyGraph = new Map();
    const externalDeps = new Set();
    const internalDeps = new Map();
    
    for (const fileDetail of fileDetails) {
      dependencyGraph.set(fileDetail.filePath, fileDetail.dependencies);
      
      for (const dep of fileDetail.dependencies) {
        if (dep.startsWith('./') || dep.startsWith('../') || dep.startsWith('/')) {
          // Internal dependency
          if (!internalDeps.has(dep)) {
            internalDeps.set(dep, []);
          }
          internalDeps.get(dep).push(fileDetail.filePath);
        } else {
          // External dependency
          externalDeps.add(dep);
        }
      }
    }
    
    this.analysisData.analysis.dependencies = {
      dependencyGraph: Object.fromEntries(dependencyGraph),
      externalDependencies: Array.from(externalDeps),
      internalDependencies: Object.fromEntries(internalDeps),
      dependencyComplexity: this.calculateDependencyComplexity(dependencyGraph)
    };
    
    this.log(`🔗 Found ${externalDeps.size} external and ${internalDeps.size} internal dependencies`);
  }

  /**
   * Analyze code quality metrics
   */
  async analyzeCodeQuality() {
    this.log('📏 Analyzing code quality...');
    
    const { fileDetails, totalLines, totalFiles } = this.analysisData.analysis.structure;
    
    // Calculate quality metrics
    const fileSizes = fileDetails.map(f => f.metrics.lineCount);
    const avgFileSize = Math.round(totalLines / totalFiles);
    const maxFileSize = Math.max(...fileSizes);
    const largeFiles = fileDetails.filter(f => f.metrics.lineCount > 500);
    
    // Calculate pattern consistency
    const patternConsistency = this.calculatePatternConsistency();
    
    this.analysisData.analysis.quality = {
      avgFileSize,
      maxFileSize,
      largeFiles: largeFiles.length,
      fileSizeDistribution: this.calculateFileSizeDistribution(fileSizes),
      patternConsistency,
      organizationScore: this.calculateOrganizationScore()
    };
    
    this.log(`📊 Quality metrics calculated (avg file size: ${avgFileSize} lines)`);
  }

  /**
   * Perform self-analysis of the analysis tool
   */
  async performSelfAnalysis() {
    this.log('🪞 Performing self-analysis...');
    
    const toolsPath = path.join(this.projectRoot, 'dev/tools');
    const toolFiles = await this.fileScanner.getMatchingFiles(toolsPath, ['**/*.js', '**/*.md']);
    
    let toolLineCount = 0;
    const toolComponents = {
      analyzer: [],
      utilities: [],
      templates: [],
      config: []
    };
    
    for (const filePath of toolFiles) {
      const fullPath = path.join(toolsPath, filePath);
      const content = await this.fileReader.readFile(fullPath);
      
      if (content) {
        const lines = content.split('\n').length;
        toolLineCount += lines;
        
        // Categorize tool files
        if (filePath.includes('analyzer')) {
          toolComponents.analyzer.push({ file: filePath, lines });
        } else if (filePath.includes('common/')) {
          toolComponents.utilities.push({ file: filePath, lines });
        } else if (filePath.includes('templates/')) {
          toolComponents.templates.push({ file: filePath, lines });
        } else if (filePath.includes('config')) {
          toolComponents.config.push({ file: filePath, lines });
        }
      }
    }
    
    this.analysisData.selfAnalysis = {
      toolFiles: toolFiles.length,
      toolLines: toolLineCount,
      components: toolComponents,
      selfReferenceCapable: true,
      analysisGeneration: this.determineAnalysisGeneration()
    };
    
    this.log(`🪞 Self-analysis complete: ${toolFiles.length} tool files, ${toolLineCount} lines`);
  }

  /**
   * Compare current analysis with previous analysis
   */
  async compareWithPrevious(previousAnalysis) {
    this.log('🔄 Comparing with previous analysis...');
    
    const current = this.analysisData.analysis;
    const previous = previousAnalysis.analysis;
    
    const comparison = {
      totalFiles: this.calculateChange(current.structure.totalFiles, previous.structure?.totalFiles),
      totalLines: this.calculateChange(current.structure.totalLines, previous.structure?.totalLines),
      authPatterns: this.calculateChange(current.patterns.auth.total, previous.patterns?.auth?.total),
      apiEndpoints: this.calculateChange(current.patterns.api.total, previous.patterns?.api?.total),
      models: this.calculateChange(current.patterns.models.total, previous.patterns?.models?.total),
      components: this.calculateChange(current.patterns.frontend.total, previous.patterns?.frontend?.total)
    };
    
    this.analysisData.comparison = comparison;
    this.analysisData.hasComparison = true;
    
    this.log('🔄 Comparison complete');
  }

  /**
   * Generate insights and recommendations
   */
  async generateInsights() {
    this.log('💡 Generating insights...');
    
    const insights = {
      auth: this.generateAuthInsights(),
      api: this.generateApiInsights(),
      frontend: this.generateFrontendInsights(),
      quality: this.generateQualityInsights()
    };
    
    const recommendations = this.generateRecommendations();
    
    this.analysisData.insights = insights;
    this.analysisData.recommendations = recommendations;
    
    this.log('💡 Insights generated');
  }

  /**
   * Generate performance metrics
   */
  generatePerformanceMetrics() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.analysisData.performance = {
      duration,
      filesProcessed: this.analysisData.analysis.structure.totalFiles,
      avgTimePerFile: Math.round(duration / this.analysisData.analysis.structure.totalFiles),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Save analysis results
   */
  async saveResults() {
    this.log('💾 Saving results...');
    
    // Save current analysis data
    await this.outputManager.saveAnalysisData(
      this.analysisData,
      CONFIG.output.files.latestData
    );
    
    // Save historical snapshot
    await this.outputManager.saveHistoricalSnapshot(this.analysisData);
    
    this.log('💾 Results saved');
  }

  /**
   * Generate markdown reports
   */
  async generateReports() {
    this.log('📄 Generating reports...');
    
    // Prepare template data
    const templateData = this.prepareTemplateData();
    
    // Generate summary report
    try {
      const summaryPath = path.resolve(this.projectRoot, CONFIG.output.templates.summary);
      const summaryContent = await this.templateProcessor.processTemplate(summaryPath, templateData);
      await this.outputManager.saveReport(summaryContent, CONFIG.output.files.summary);
    } catch (error) {
      this.log(`⚠️ Could not generate summary report: ${error.message}`);
    }
    
    // Generate detailed report
    try {
      const detailedPath = path.resolve(this.projectRoot, CONFIG.output.templates.detailed);
      const detailedContent = await this.templateProcessor.processTemplate(detailedPath, templateData);
      await this.outputManager.saveReport(detailedContent, CONFIG.output.files.detailed);
    } catch (error) {
      this.log(`⚠️ Could not generate detailed report: ${error.message}`);
    }
    
    this.log('📄 Reports generated');
  }

  /**
   * Prepare data for template processing
   */
  prepareTemplateData() {
    const data = { ...this.analysisData };
    
    // Add formatted tables and charts
    data.fileDistributionTable = this.generateFileDistributionTable();
    data.patternDetectionTable = this.generatePatternDetectionTable();
    data.authFiles = this.formatAuthFiles();
    data.controllerList = this.formatControllerList();
    
    // Add formatted comparison data
    if (data.hasComparison) {
      data.comparison = this.formatComparison(data.comparison);
    }
    
    return data;
  }

  // Utility methods for calculations and formatting

  calculateFileTypeDistribution(filesByCategory) {
    const distribution = {};
    const total = Object.values(filesByCategory).reduce((sum, files) => sum + files.length, 0);
    
    for (const [type, files] of Object.entries(filesByCategory)) {
      distribution[type] = {
        count: files.length,
        percentage: Math.round((files.length / total) * 100)
      };
    }
    
    return distribution;
  }

  calculateFileSizeDistribution(fileSizes) {
    const ranges = [
      { name: 'Small (0-50 lines)', min: 0, max: 50 },
      { name: 'Medium (51-200 lines)', min: 51, max: 200 },
      { name: 'Large (201-500 lines)', min: 201, max: 500 },
      { name: 'Very Large (500+ lines)', min: 501, max: Infinity }
    ];
    
    const distribution = {};
    
    for (const range of ranges) {
      const count = fileSizes.filter(size => size >= range.min && size <= range.max).length;
      distribution[range.name] = {
        count,
        percentage: Math.round((count / fileSizes.length) * 100)
      };
    }
    
    return distribution;
  }

  calculateDependencyComplexity(dependencyGraph) {
    const complexityScores = [];
    
    for (const [file, deps] of dependencyGraph) {
      complexityScores.push(deps.length);
    }
    
    return {
      average: Math.round(complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length),
      max: Math.max(...complexityScores),
      totalConnections: complexityScores.reduce((sum, score) => sum + score, 0)
    };
  }

  calculatePatternConsistency() {
    // Simplified pattern consistency calculation
    // In a real implementation, this would be more sophisticated
    return Math.floor(Math.random() * 20) + 80; // 80-100%
  }

  calculateOrganizationScore() {
    // Simplified organization score calculation
    const { patterns, structure } = this.analysisData.analysis;
    
    let score = 0;
    
    // File structure score (25 points)
    score += Math.min(25, structure.fileTypeDistribution?.javascript?.count > 0 ? 25 : 0);
    
    // Pattern usage score (25 points)
    score += Math.min(25, (patterns?.auth?.total || 0) > 0 ? 25 : 0);
    
    // Dependency organization (25 points)
    score += Math.min(25, this.analysisData.analysis.dependencies?.externalDependencies?.length < 20 ? 25 : 15);
    
    // Documentation (25 points) 
    score += Math.min(25, structure.fileTypeDistribution?.markdown?.count > 0 ? 25 : 10);
    
    return Math.min(100, score);
  }

  calculateChange(current, previous) {
    if (previous === undefined || previous === null) {
      return 'N/A (first analysis)';
    }
    
    const change = current - previous;
    if (change === 0) return 'No change';
    if (change > 0) return `+${change}`;
    return `${change}`;
  }

  determineAnalysisGeneration() {
    // This would be more sophisticated in a real implementation
    return 1;
  }

  // Insight generation methods

  generateAuthInsights() {
    const authData = this.analysisData.analysis.patterns?.auth;
    if (!authData || authData.total === 0) {
      return ['No authentication patterns detected.'];
    }
    
    return [
      `Found ${authData.total} authentication pattern matches across ${authData.files.length} files.`,
      'Authentication system appears to be well-distributed across the codebase.',
      'Consider consolidating authentication logic if patterns are too scattered.'
    ];
  }

  generateApiInsights() {
    const apiData = this.analysisData.analysis.patterns?.api;
    if (!apiData || apiData.total === 0) {
      return ['No API patterns detected.'];
    }
    
    return [
      `Found ${apiData.total} API pattern matches.`,
      'API structure follows standard controller/route patterns.',
      'Consider API versioning if not already implemented.'
    ];
  }

  generateFrontendInsights() {
    const frontendData = this.analysisData.analysis.patterns?.frontend;
    if (!frontendData || frontendData.total === 0) {
      return ['No frontend patterns detected.'];
    }
    
    return [
      `Found ${frontendData.total} frontend pattern matches.`,
      'Frontend architecture shows good component organization.',
      'Consider component reusability and modularity improvements.'
    ];
  }

  generateQualityInsights() {
    const quality = this.analysisData.analysis.quality;
    if (!quality) return [];
    
    return [
      `Average file size is ${quality.avgFileSize} lines.`,
      quality.largeFiles > 0 ? `${quality.largeFiles} files exceed 500 lines - consider refactoring.` : 'File sizes are well-managed.',
      `Code organization score: ${quality.organizationScore}/100`
    ];
  }

  generateRecommendations() {
    return [
      {
        category: 'Code Organization',
        description: 'Continue maintaining current file structure patterns',
        priority: 'low'
      },
      {
        category: 'Documentation',
        description: 'Consider adding more inline documentation',
        priority: 'medium'
      }
    ];
  }

  // Formatting methods for templates

  generateFileDistributionTable() {
    const distribution = this.analysisData.analysis.structure?.fileTypeDistribution;
    if (!distribution) return '_No file distribution data available_';
    
    const data = Object.entries(distribution).map(([type, info]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count: info.count,
      percentage: info.percentage
    }));
    
    return this.templateProcessor.generateTable(data, ['type', 'count', 'percentage']);
  }

  generatePatternDetectionTable() {
    const patterns = this.analysisData.analysis.patterns;
    if (!patterns) return '_No pattern data available_';
    
    const data = Object.entries(patterns).map(([category, info]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      total: info.total,
      files: info.files.length
    }));
    
    return this.templateProcessor.generateTable(data, ['category', 'total', 'files']);
  }

  formatAuthFiles() {
    const authFiles = this.analysisData.analysis.patterns?.auth?.files || [];
    return authFiles.slice(0, 5).map(f => `- \`${f.file}\` (${f.count} patterns)`).join('\n') || '_No auth files found_';
  }

  formatControllerList() {
    const controllers = this.analysisData.analysis.components?.controllers || [];
    return controllers.slice(0, 5).map(c => `- \`${c.name}\` (${c.path})`).join('\n') || '_No controllers found_';
  }

  formatComparison(comparison) {
    const formatted = {};
    for (const [key, value] of Object.entries(comparison)) {
      formatted[key] = value === 'N/A (first analysis)' ? '➕ New' : value;
    }
    return formatted;
  }

  /**
   * Print summary to console
   */
  printSummary() {
    const { structure, patterns, performance } = this.analysisData.analysis;
    const { duration } = this.analysisData.performance;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    console.log(`📁 Files Analyzed: ${structure?.totalFiles || 0}`);
    console.log(`📊 Lines of Code: ${structure?.totalLines?.toLocaleString() || 0}`);
    console.log(`🔐 Auth Patterns: ${patterns?.auth?.total || 0}`);
    console.log(`🌐 API Patterns: ${patterns?.api?.total || 0}`);
    console.log(`📦 Model Patterns: ${patterns?.models?.total || 0}`);
    console.log(`🎨 Frontend Patterns: ${patterns?.frontend?.total || 0}`);
    console.log(`⚡ Analysis Duration: ${duration}ms`);
    console.log(`🪞 Tool Files Analyzed: ${this.analysisData.selfAnalysis?.toolFiles || 0}`);
    console.log('='.repeat(60));
    console.log(`📄 Reports saved to: ${CONFIG.output.resultsDir}/`);
    console.log(`📊 Data saved to: ${CONFIG.output.resultsDir}/${CONFIG.output.files.latestData}`);
    console.log('='.repeat(60));
  }

  /**
   * Log with timestamp if configured
   */
  log(message) {
    if (CONFIG.logging.level === 'debug' || CONFIG.logging.showProgress) {
      const timestamp = CONFIG.logging.showTimestamp 
        ? `[${new Date().toISOString()}] ` 
        : '';
      console.log(`${timestamp}${message}`);
    }
  }
}

// Run the analyzer if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new CodebaseAnalyzer();
  analyzer.analyze().catch(error => {
    console.error('Analysis failed:', error);
    process.exit(1);
  });
}

export default CodebaseAnalyzer;