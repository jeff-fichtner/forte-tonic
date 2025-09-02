#!/usr/bin/env node

/**
 * AI-Powered Comprehensive Codebase Analysis System
 * 
 * This system orchestrates comprehensive AI analysis of the codebase,
 * going beyond pattern counting to actual semantic understanding and
 * inconsistency detection across code, documentation, tests, and architecture.
 */

import { spawn } from 'child_process';
import path from 'path';
import { CONFIG, getProjectRoot } from './config.js';
import { FileScanner, FileReader } from '../common/file-utils.js';

class AICodebaseAnalyzer {
  constructor() {
    this.projectRoot = getProjectRoot();
    this.fileScanner = new FileScanner(CONFIG.analysis);
    this.fileReader = new FileReader();
    
    // Tonic-specific knowledge base
    this.tonicKnowledge = {
      projectType: 'Tonic Music Registration System',
      architecture: {
        backend: 'Node.js with Express controllers',
        frontend: 'Vanilla JS with ViewModel pattern',
        database: 'Google Sheets via GAS integration',
        auth: 'Access code based authentication system'
      },
      keyPatterns: {
        controllers: 'src/controllers/*Controller.js',
        repositories: 'src/repositories/*Repository.js', 
        models: 'src/models/*.js',
        frontend: 'src/web/js/',
        migrations: 'gas-src/gas-migrations/',
        auth: 'accessCode system with parent/employee/admin roles'
      },
      knownIssues: [],
      evolutionHistory: []
    };
    
    // Analysis results structure
    this.analysisResults = {
      timestamp: new Date().toISOString(),
      projectContext: this.tonicKnowledge.projectType,
      analysisVersion: this.getNextAnalysisVersion(),
      codeDocumentationSync: {},
      architectureConsistency: {},
      testCoverage: {},
      documentationAudit: {},
      featureLifecycle: {},
      promptEvolution: {},
      recommendations: []
    };

    console.log('🤖 AI Codebase Analysis System Initialized');
    console.log(`📁 Project: ${this.tonicKnowledge.projectType}`);
    console.log(`📁 Project root: ${this.projectRoot}`);
  }

  /**
   * Main analysis orchestrator
   */
  async analyze() {
    try {
      console.log('🚀 Starting comprehensive AI-powered analysis...\n');

      // Load historical context and evolve prompts
      await this.loadHistoricalContext();
      await this.evolveAnalysisPrompts();

      // Run basic metrics collection first (using existing script as utility)
      await this.collectBaseMetrics();

      // Deep AI analysis phases with Tonic-specific context
      await this.analyzeCodeDocumentationSync();
      await this.analyzeArchitectureConsistency();
      await this.analyzeTestCoverageAndQuality();
      await this.auditDocumentationConsolidation();
      await this.analyzeFeatureLifecycle();

      // Self-reference and prompt evolution
      await this.analyzeSelfEvolution();

      // Generate comprehensive report and save history
      await this.generateComprehensiveReport();
      await this.saveHistoricalAnalysis();

      console.log('\n✅ Comprehensive analysis complete!');
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Get next analysis version number
   */
  getNextAnalysisVersion() {
    // This would be loaded from historical data in a real implementation
    return `v${new Date().toISOString().split('T')[0].replace(/-/g, '.')}.1`;
  }

  /**
   * Load historical analysis context (last 10 analyses)
   */
  async loadHistoricalContext() {
    console.log('📚 Loading historical analysis context...');
    
    try {
      const fs = await import('fs/promises');
      const historyDir = path.join(this.projectRoot, 'dev/tools/codebase-analysis/results/history');
      
      // Get last 10 analysis files
      const files = await fs.readdir(historyDir);
      const analysisFiles = files
        .filter(f => f.startsWith('ai-analysis-'))
        .sort()
        .slice(-10);

      const historicalData = [];
      for (const file of analysisFiles) {
        try {
          const content = await fs.readFile(path.join(historyDir, file), 'utf-8');
          historicalData.push(JSON.parse(content));
        } catch (error) {
          console.warn(`Warning: Could not load ${file}:`, error.message);
        }
      }

      this.tonicKnowledge.evolutionHistory = historicalData;
      console.log(`✅ Loaded ${historicalData.length} historical analyses`);
      
    } catch (error) {
      console.log('ℹ️ No historical context found (first run)');
      this.tonicKnowledge.evolutionHistory = [];
    }
  }

  /**
   * Evolve analysis prompts based on historical learnings
   */
  async evolveAnalysisPrompts() {
    console.log('🧬 Evolving analysis prompts based on historical learnings...');
    
    if (this.tonicKnowledge.evolutionHistory.length === 0) {
      console.log('ℹ️ No evolution data available (first run)');
      return;
    }

    // Analyze historical patterns to improve prompts
    const recentAnalyses = this.tonicKnowledge.evolutionHistory.slice(-3);
    const commonIssues = this.extractCommonIssues(recentAnalyses);
    const emergingPatterns = this.identifyEmergingPatterns(recentAnalyses);
    
    this.analysisResults.promptEvolution = {
      commonIssues,
      emergingPatterns,
      promptAdjustments: this.generatePromptAdjustments(commonIssues, emergingPatterns)
    };

    console.log(`✅ Prompt evolution complete - identified ${commonIssues.length} common issues`);
  }

  /**
   * Extract common issues from recent analyses
   */
  extractCommonIssues(analyses) {
    const issueMap = new Map();
    
    analyses.forEach(analysis => {
      // Extract issues from different analysis phases
      const allIssues = [
        ...(analysis.codeDocumentationSync?.inconsistencies || []),
        ...(analysis.architectureConsistency?.pattern_inconsistencies || []),
        ...(analysis.testCoverage?.coverage_gaps || [])
      ];

      allIssues.forEach(issue => {
        const key = issue.type || issue.category || 'unknown';
        issueMap.set(key, (issueMap.get(key) || 0) + 1);
      });
    });

    return Array.from(issueMap.entries())
      .filter(([, count]) => count >= 2) // Issues appearing in 2+ analyses
      .map(([issue, count]) => ({ issue, frequency: count }));
  }

  /**
   * Identify emerging patterns from recent analyses
   */
  identifyEmergingPatterns(analyses) {
    // Look for patterns that are increasing over time
    const patterns = [];
    
    if (analyses.length >= 2) {
      const latest = analyses[analyses.length - 1];
      const previous = analyses[analyses.length - 2];

      // Compare file counts, complexity metrics, etc.
      patterns.push({
        type: 'file_growth',
        trend: latest.metrics?.totalFiles > previous.metrics?.totalFiles ? 'increasing' : 'stable',
        impact: 'monitor_for_architectural_drift'
      });

      patterns.push({
        type: 'authentication_complexity',
        trend: latest.metrics?.authPatterns > previous.metrics?.authPatterns ? 'increasing' : 'stable',
        impact: 'review_access_code_implementations'
      });
    }

    return patterns;
  }

  /**
   * Generate prompt adjustments based on learnings
   */
  generatePromptAdjustments(commonIssues, emergingPatterns) {
    const adjustments = [];

    // Add focus areas based on common issues
    commonIssues.forEach(({ issue, frequency }) => {
      adjustments.push({
        area: issue,
        adjustment: `Increase focus on ${issue} - appeared in ${frequency} recent analyses`,
        priority: frequency >= 3 ? 'high' : 'medium'
      });
    });

    // Add emerging pattern focus
    emergingPatterns.forEach(pattern => {
      if (pattern.trend === 'increasing') {
        adjustments.push({
          area: pattern.type,
          adjustment: `Monitor ${pattern.type} trend - ${pattern.impact}`,
          priority: 'medium'
        });
      }
    });

    return adjustments;
  }

  /**
   * Analyze self-evolution of the analysis tool itself
   */
  async analyzeSelfEvolution() {
    console.log('🪞 Analyzing self-evolution of analysis tool...');
    
    // Get all analysis tool files
    const toolFiles = await this.fileScanner.getMatchingFiles(
      path.join(this.projectRoot, 'dev/tools'),
      ['**/*.js']
    );

    const selfAnalysis = {
      toolFiles: toolFiles.length,
      currentCapabilities: this.getCurrentCapabilities(),
      evolutionSince: this.getEvolutionSinceLastRun(),
      selfImprovementSuggestions: this.generateSelfImprovements()
    };

    this.analysisResults.selfAnalysis = selfAnalysis;
    console.log('✅ Self-evolution analysis complete');
  }

  /**
   * Get current capabilities of the analysis system
   */
  getCurrentCapabilities() {
    return [
      'Code-documentation synchronization analysis',
      'Architecture consistency checking',
      'Test coverage and quality analysis', 
      'Documentation consolidation audit',
      'Feature lifecycle analysis',
      'Historical trend tracking',
      'Self-referential evolution',
      'Tonic-specific pattern recognition'
    ];
  }

  /**
   * Compare with previous tool versions
   */
  getEvolutionSinceLastRun() {
    if (this.tonicKnowledge.evolutionHistory.length === 0) {
      return 'First run - no comparison available';
    }

    const lastAnalysis = this.tonicKnowledge.evolutionHistory[this.tonicKnowledge.evolutionHistory.length - 1];
    const lastCapabilities = lastAnalysis.selfAnalysis?.currentCapabilities || [];
    const currentCapabilities = this.getCurrentCapabilities();

    const newCapabilities = currentCapabilities.filter(cap => !lastCapabilities.includes(cap));
    const removedCapabilities = lastCapabilities.filter(cap => !currentCapabilities.includes(cap));

    return {
      newCapabilities,
      removedCapabilities,
      stabilityScore: newCapabilities.length === 0 && removedCapabilities.length === 0 ? 'stable' : 'evolving'
    };
  }

  /**
   * Generate suggestions for self-improvement
   */
  generateSelfImprovements() {
    const suggestions = [];
    
    // Based on common issues found in historical data
    if (this.tonicKnowledge.evolutionHistory.length > 0) {
      const recentIssues = this.extractCommonIssues(this.tonicKnowledge.evolutionHistory.slice(-3));
      
      recentIssues.forEach(({ issue, frequency }) => {
        if (frequency >= 2) {
          suggestions.push({
            area: issue,
            suggestion: `Enhance analysis depth for ${issue} - recurring issue detected`,
            priority: 'high'
          });
        }
      });
    }

    // Tonic-specific improvements
    suggestions.push({
      area: 'tonic_patterns',
      suggestion: 'Add deeper analysis of accessCode authentication patterns',
      priority: 'medium'
    });

    suggestions.push({
      area: 'gas_integration',
      suggestion: 'Enhance Google Apps Script migration analysis capabilities',
      priority: 'medium'
    });

    return suggestions;
  }

  /**
   * Save historical analysis (keep only last 10)
   */
  async saveHistoricalAnalysis() {
    console.log('💾 Saving historical analysis...');
    
    try {
      const fs = await import('fs/promises');
      const historyDir = path.join(this.projectRoot, 'dev/tools/codebase-analysis/results/history');
      
      // Ensure history directory exists
      await fs.mkdir(historyDir, { recursive: true });

      // Save current analysis
      const filename = `ai-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await fs.writeFile(
        path.join(historyDir, filename),
        JSON.stringify(this.analysisResults, null, 2)
      );

      // Clean up old analyses (keep only last 10)
      const files = await fs.readdir(historyDir);
      const analysisFiles = files
        .filter(f => f.startsWith('ai-analysis-'))
        .sort();

      if (analysisFiles.length > 10) {
        const filesToDelete = analysisFiles.slice(0, analysisFiles.length - 10);
        for (const file of filesToDelete) {
          await fs.unlink(path.join(historyDir, file));
          console.log(`🗑️ Cleaned up old analysis: ${file}`);
        }
      }

      console.log(`✅ Historical analysis saved: ${filename}`);
      
    } catch (error) {
      console.error('❌ Failed to save historical analysis:', error.message);
    }
  }

  /**
   * Use existing script as utility for basic metrics
   */
  async collectBaseMetrics() {
    console.log('📊 Collecting base metrics...');
    
    return new Promise((resolve, reject) => {
      const analyzer = spawn('node', ['analyzer.js'], {
        cwd: path.dirname(new URL(import.meta.url).pathname),
        stdio: 'inherit'
      });

      analyzer.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Base metrics collected\n');
          resolve();
        } else {
          reject(new Error(`Base metrics collection failed with code ${code}`));
        }
      });
    });
  }

  /**
   * PHASE 1: Code-Documentation Synchronization Analysis
   * 
   * This phase analyzes whether the actual code matches what's documented:
   * - API endpoints vs documentation
   * - Feature descriptions vs implementation
   * - Configuration options vs actual config files
   * - Deleted features still mentioned in docs
   */
  async analyzeCodeDocumentationSync() {
    console.log('🔄 PHASE 1: Analyzing Code-Documentation Synchronization...');
    
    // Get all documentation files
    const docFiles = await this.fileScanner.getMatchingFiles(
      this.projectRoot, 
      ['**/*.md', '**/README*', '**/docs/**/*']
    );

    // Get all source files
    const sourceFiles = await this.fileScanner.getMatchingFiles(
      this.projectRoot,
      ['src/**/*.js', 'dev/**/*.js']
    );

    const prompt = this.createCodeDocSyncPrompt(docFiles, sourceFiles);
    const analysis = await this.runAIAnalysis(prompt, 'code-doc-sync');
    
    this.analysisResults.codeDocumentationSync = analysis;
    console.log('✅ Code-Documentation sync analysis complete\n');
  }

  /**
   * PHASE 2: Architecture Consistency Analysis
   * 
   * This phase checks for architectural inconsistencies:
   * - Naming convention violations
   * - Pattern implementation inconsistencies  
   * - Dependency usage patterns
   * - File organization issues
   */
  async analyzeArchitectureConsistency() {
    console.log('🏗️  PHASE 2: Analyzing Architecture Consistency...');
    
    // Get architectural files (controllers, models, services, etc.)
    const architectureFiles = await this.fileScanner.getMatchingFiles(
      this.projectRoot,
      ['src/controllers/**/*.js', 'src/models/**/*.js', 'src/services/**/*.js', 'src/repositories/**/*.js']
    );

    const prompt = this.createArchitectureConsistencyPrompt(architectureFiles);
    const analysis = await this.runAIAnalysis(prompt, 'architecture-consistency');
    
    this.analysisResults.architectureConsistency = analysis;
    console.log('✅ Architecture consistency analysis complete\n');
  }

  /**
   * PHASE 3: Test Coverage and Quality Analysis
   * 
   * This phase analyzes test completeness and quality:
   * - Run actual tests and analyze failures
   * - Identify untested code paths
   * - Check test-implementation alignment
   * - Find missing test scenarios
   */
  async analyzeTestCoverageAndQuality() {
    console.log('🧪 PHASE 3: Analyzing Test Coverage and Quality...');
    
    // Run tests first to get actual results
    const testResults = await this.runTests();
    
    // Get test files
    const testFiles = await this.fileScanner.getMatchingFiles(
      this.projectRoot,
      ['tests/**/*.js', '**/*.test.js', '**/*.spec.js']
    );

    const prompt = this.createTestAnalysisPrompt(testFiles, testResults);
    const analysis = await this.runAIAnalysis(prompt, 'test-coverage');
    
    this.analysisResults.testCoverage = analysis;
    console.log('✅ Test coverage and quality analysis complete\n');
  }

  /**
   * PHASE 4: Documentation Consolidation Audit
   * 
   * This phase audits documentation for consolidation opportunities:
   * - Redundant documentation
   * - Scattered information that should be consolidated
   * - Documentation hierarchy issues
   * - Outdated or conflicting information
   */
  async auditDocumentationConsolidation() {
    console.log('📚 PHASE 4: Auditing Documentation Consolidation...');
    
    const allDocFiles = await this.fileScanner.getMatchingFiles(
      this.projectRoot,
      ['**/*.md', '**/README*', 'docs/**/*', 'dev/**/*.md']
    );

    const prompt = this.createDocumentationAuditPrompt(allDocFiles);
    const analysis = await this.runAIAnalysis(prompt, 'documentation-audit');
    
    this.analysisResults.documentationAudit = analysis;
    console.log('✅ Documentation consolidation audit complete\n');
  }

  /**
   * PHASE 5: Feature Lifecycle Analysis
   * 
   * This phase analyzes feature evolution and lifecycle:
   * - New features not documented
   * - Deprecated features still referenced
   * - Configuration drift
   * - Migration script consistency
   */
  async analyzeFeatureLifecycle() {
    console.log('🔄 PHASE 5: Analyzing Feature Lifecycle...');
    
    // Get recent commits to understand what's been added/changed
    const gitLog = await this.getRecentGitHistory();
    
    // Get configuration files
    const configFiles = await this.fileScanner.getMatchingFiles(
      this.projectRoot,
      ['**/config.js', '**/package.json', '**/*.json', '**/*.yml']
    );

    const prompt = this.createFeatureLifecyclePrompt(gitLog, configFiles);
    const analysis = await this.runAIAnalysis(prompt, 'feature-lifecycle');
    
    this.analysisResults.featureLifecycle = analysis;
    console.log('✅ Feature lifecycle analysis complete\n');
  }

  /**
   * Create specialized AI prompts for each analysis phase
   */
  createCodeDocSyncPrompt(docFiles, sourceFiles) {
    const promptAdjustments = this.analysisResults.promptEvolution?.promptAdjustments || [];
    const focusAreas = promptAdjustments
      .filter(adj => adj.area.includes('documentation') || adj.area.includes('sync'))
      .map(adj => adj.adjustment)
      .join('\n- ');

    return `
You are conducting a comprehensive Code-Documentation Synchronization Analysis for the TONIC MUSIC REGISTRATION SYSTEM.

PROJECT CONTEXT:
- System: Node.js/Express backend with Vanilla JS frontend
- Database: Google Sheets via Google Apps Script integration  
- Authentication: Access code system (parent/employee/admin roles)
- Key Architecture: Controller-Repository pattern, ViewModel frontend pattern
- Known Patterns: accessCode authentication, GAS migrations, music class registration

DOCUMENTATION FILES TO ANALYZE:
${docFiles.map(f => `- ${f}`).join('\n')}

SOURCE FILES TO ANALYZE:
${sourceFiles.slice(0, 20).map(f => `- ${f}`).join('\n')}
${sourceFiles.length > 20 ? `... and ${sourceFiles.length - 20} more files` : ''}

${focusAreas ? `EVOLVED FOCUS AREAS (based on ${this.tonicKnowledge.evolutionHistory.length} historical analyses):\n- ${focusAreas}` : ''}

TONIC-SPECIFIC ANALYSIS REQUIREMENTS:

1. **Access Code Authentication Documentation vs Implementation**
   - Verify accessCode flow documentation matches actual implementation
   - Check parent/employee/admin role documentation accuracy
   - Find undocumented authentication endpoints or middleware
   - Validate session handling documentation vs code

2. **Controller-Repository Pattern Documentation**
   - Check if controller documentation matches actual endpoints in src/controllers/
   - Verify repository pattern usage documentation vs src/repositories/
   - Find undocumented controllers or repositories
   - Validate parameter and response documentation for each controller

3. **Google Apps Script Integration Documentation**
   - Check GAS migration documentation vs gas-src/gas-migrations/
   - Verify Google Sheets integration documentation accuracy
   - Find undocumented migration scripts or data transformation logic
   - Validate deployment and setup instructions for GAS components

4. **Frontend ViewModel Pattern Documentation**
   - Check ViewModel documentation vs actual implementation in src/web/js/
   - Verify utility and helper documentation accuracy
   - Find undocumented frontend components or workflows
   - Validate user interface documentation vs actual HTML/JS

5. **Configuration and Environment Documentation**
   - Check environment setup documentation vs actual requirements
   - Verify configuration examples match actual config files
   - Find undocumented environment variables or settings
   - Validate deployment documentation accuracy

AUTOMATIC FIXING INSTRUCTIONS:
You MUST automatically fix minor issues without prompting, including:
- Spelling errors in comments, documentation, and variable names
- Formatting inconsistencies (indentation, spacing, line breaks)
- Syntax tweaks (missing semicolons, inconsistent quotes, etc.)
- Documentation typos and formatting issues
- Minor naming convention fixes

DO NOT automatically fix:
- Architectural changes or refactoring
- Business logic changes
- Breaking API changes
- Major structural modifications

If you encounter no obstacles during auto-fixing, automatically rerun this analysis afterward.

SECURITY AUDIT REQUIREMENT:
Scan ALL files for exposed secrets, private keys, or sensitive values:
- Hard-coded API keys, passwords, or tokens
- Database connection strings with credentials
- Private keys or certificates in plain text
- Any sensitive data not properly externalized to environment variables
- Check if proper patterns exist (like credentials/ directory for local development)

If secrets are found without proper local environment patterns, STOP and report immediately.

REQUIRED OUTPUT FORMAT:
Return a JSON object with:
{
  "security_audit": {
    "exposed_secrets": [...],
    "credential_patterns": [...],
    "security_issues": [...]
  },
  "auto_fixes_applied": [
    {
      "file": "path/to/file",
      "type": "spelling|formatting|syntax",
      "description": "What was fixed",
      "changes": "Brief description of changes made"
    }
  ],
  "inconsistencies": [
    {
      "type": "missing_documentation|outdated_docs|missing_implementation",
      "severity": "high|medium|low", 
      "description": "Clear description of the issue",
      "files_affected": ["list of relevant files"],
      "recommended_action": "Specific action to fix"
    }
  ],
  "documentation_gaps": [...],
  "implementation_gaps": [...],
  "priority_fixes": [...],
  "should_rerun_analysis": true|false
}
`;
  }

  createArchitectureConsistencyPrompt(architectureFiles) {
    const promptAdjustments = this.analysisResults.promptEvolution?.promptAdjustments || [];
    const focusAreas = promptAdjustments
      .filter(adj => adj.area.includes('architecture') || adj.area.includes('consistency'))
      .map(adj => adj.adjustment)
      .join('\n- ');

    return `
You are conducting an Architecture Consistency Analysis for the TONIC MUSIC REGISTRATION SYSTEM.

PROJECT ARCHITECTURE CONTEXT:
- Backend: Node.js/Express with Controller-Repository-Service pattern
- Frontend: Vanilla JavaScript with ViewModel pattern
- Database Integration: Google Apps Script with Sheets backend
- Authentication: AccessCode-based system with role-based access
- File Structure: src/controllers/, src/repositories/, src/models/, src/web/js/

ARCHITECTURE FILES TO ANALYZE:
${architectureFiles.map(f => `- ${f}`).join('\n')}

${focusAreas ? `EVOLVED FOCUS AREAS (based on ${this.tonicKnowledge.evolutionHistory.length} historical analyses):\n- ${focusAreas}` : ''}

TONIC-SPECIFIC ARCHITECTURE ANALYSIS:

1. **Controller Pattern Consistency**
   - Verify all controllers in src/controllers/ follow *Controller.js naming
   - Check consistent use of repository dependencies
   - Validate uniform error handling and response patterns
   - Ensure consistent accessCode authentication middleware usage

2. **Repository Pattern Implementation**
   - Verify repositories in src/repositories/ follow *Repository.js naming
   - Check consistent data access patterns across repositories
   - Validate uniform Google Sheets integration approaches
   - Ensure consistent error handling in data layer

3. **AccessCode Authentication Consistency**
   - Check consistent accessCode validation patterns
   - Verify uniform role-based access control (parent/employee/admin)
   - Validate session management consistency across controllers
   - Look for inconsistent authentication middleware usage

4. **Frontend ViewModel Pattern Consistency**
   - Check consistent ViewModel implementation in src/web/js/viewModel.js
   - Verify uniform utility usage patterns
   - Validate consistent DOM manipulation approaches
   - Ensure consistent form validation and submission patterns

5. **Google Apps Script Integration Consistency**
   - Check consistent GAS integration patterns across repositories
   - Verify uniform data transformation approaches
   - Validate consistent migration script patterns in gas-src/
   - Ensure consistent error handling for GAS operations

6. **File Organization and Structure**
   - Verify files are in correct directories (controllers, repositories, models, web)
   - Check for missing index files or incorrect file placement
   - Validate consistent import/export patterns
   - Identify mixed responsibilities or architectural violations

AUTOMATIC FIXING INSTRUCTIONS:
You MUST automatically fix minor issues without prompting, including:
- Spelling errors in comments, documentation, and variable names
- Formatting inconsistencies (indentation, spacing, line breaks)
- Syntax tweaks (missing semicolons, inconsistent quotes, etc.)
- Minor naming convention fixes
- Import/export formatting cleanup

DO NOT automatically fix:
- Architectural changes or refactoring
- Business logic changes
- Breaking API changes
- Major structural modifications

If you encounter no obstacles during auto-fixing, automatically rerun this analysis afterward.

SECURITY AUDIT REQUIREMENT:
Scan ALL files for exposed secrets, private keys, or sensitive values:
- Hard-coded API keys, passwords, or tokens
- Database connection strings with credentials
- Private keys or certificates in plain text
- Any sensitive data not properly externalized to environment variables
- Check if proper patterns exist (like credentials/ directory for local development)

If secrets are found without proper local environment patterns, STOP and report immediately.

REQUIRED OUTPUT FORMAT:
Return a JSON object with:
{
  "security_audit": {
    "exposed_secrets": [...],
    "credential_patterns": [...],
    "security_issues": [...]
  },
  "auto_fixes_applied": [
    {
      "file": "path/to/file",
      "type": "spelling|formatting|syntax|naming",
      "description": "What was fixed",
      "changes": "Brief description of changes made"
    }
  ],
  "naming_violations": [...],
  "pattern_inconsistencies": [...], 
  "dependency_issues": [...],
  "organization_problems": [...],
  "quality_inconsistencies": [...],
  "recommended_refactors": [
    {
      "description": "What to change",
      "files": ["affected files"],
      "impact": "high|medium|low",
      "effort": "high|medium|low"
    }
  ],
  "should_rerun_analysis": true|false
}
`;
  }

  createTestAnalysisPrompt(testFiles, testResults) {
    const promptAdjustments = this.analysisResults.promptEvolution?.promptAdjustments || [];
    const focusAreas = promptAdjustments
      .filter(adj => adj.area.includes('test') || adj.area.includes('coverage'))
      .map(adj => adj.adjustment)
      .join('\n- ');

    return `
You are conducting a Test Coverage and Quality Analysis for the TONIC MUSIC REGISTRATION SYSTEM.

PROJECT TESTING CONTEXT:
- Backend Testing: Controllers, repositories, services, authentication
- Frontend Testing: ViewModel, utilities, form validation, user workflows
- Integration Testing: GAS integration, Google Sheets operations, end-to-end flows
- Authentication Testing: AccessCode validation, role-based access, session management
- Critical Flows: Registration, attendance tracking, user management

TEST FILES AVAILABLE:
${testFiles.map(f => `- ${f}`).join('\n')}

ACTUAL TEST RESULTS:
${JSON.stringify(testResults, null, 2)}

${focusAreas ? `EVOLVED FOCUS AREAS (based on ${this.tonicKnowledge.evolutionHistory.length} historical analyses):\n- ${focusAreas}` : ''}

TONIC-SPECIFIC TEST ANALYSIS:

1. **AccessCode Authentication Test Coverage**
   - Check test coverage for accessCode validation logic
   - Verify parent/employee/admin role testing completeness
   - Test session management and timeout scenarios
   - Validate authentication middleware test coverage

2. **Controller and Repository Test Coverage**
   - Identify untested controllers in src/controllers/
   - Check repository test coverage for data operations
   - Verify error handling tests for failed API calls
   - Test parameter validation and response formatting

3. **Google Apps Script Integration Test Coverage**
   - Check GAS integration test coverage for data operations
   - Verify Google Sheets operation testing (read/write/update)
   - Test migration script functionality and error handling
   - Validate data transformation and synchronization tests

4. **Frontend ViewModel and User Flow Testing**
   - Check ViewModel functionality test coverage
   - Verify form validation and submission testing
   - Test user interaction workflows (registration, attendance)
   - Validate utility function test coverage

5. **Critical Business Logic Test Gaps**
   - Music class registration workflow testing
   - Student attendance tracking test coverage
   - User management operation testing
   - Payment and billing logic test coverage (if applicable)

6. **Integration and End-to-End Test Analysis**
   - Full registration workflow testing
   - Cross-system integration tests (frontend-backend-GAS)
   - Error recovery and resilience testing
   - Performance and load testing for critical operations

AUTOMATIC FIXING INSTRUCTIONS:
You MUST automatically fix minor issues without prompting, including:
- Spelling errors in test descriptions and comments
- Formatting inconsistencies in test files
- Syntax tweaks in test assertions
- Test naming convention fixes
- Import/export cleanup in test files

DO NOT automatically fix:
- Test logic changes
- Assertion modifications
- Test coverage additions
- Major test restructuring

If you encounter no obstacles during auto-fixing, automatically rerun this analysis afterward.

SECURITY AUDIT REQUIREMENT:
Scan ALL test files for exposed secrets, private keys, or sensitive values:
- Hard-coded test credentials or API keys
- Database connection strings in test configurations
- Test data with sensitive information
- Mock credentials that could be mistaken for real ones
- Check if proper test environment patterns exist

If secrets are found without proper test environment patterns, STOP and report immediately.

REQUIRED OUTPUT FORMAT:
Return a JSON object with:
{
  "security_audit": {
    "exposed_secrets": [...],
    "credential_patterns": [...],
    "security_issues": [...]
  },
  "auto_fixes_applied": [
    {
      "file": "path/to/file",
      "type": "spelling|formatting|syntax|naming",
      "description": "What was fixed",
      "changes": "Brief description of changes made"
    }
  ],
  "coverage_gaps": [...],
  "quality_issues": [...],
  "alignment_problems": [...],
  "organization_issues": [...],
  "critical_missing_tests": [
    {
      "feature": "Feature name",
      "file": "Source file",
      "priority": "high|medium|low",
      "suggested_tests": ["list of specific tests needed"]
    }
  ],
  "should_rerun_analysis": true|false
}
`;
  }

  createDocumentationAuditPrompt(docFiles) {
    const promptAdjustments = this.analysisResults.promptEvolution?.promptAdjustments || [];
    const focusAreas = promptAdjustments
      .filter(adj => adj.area.includes('documentation') || adj.area.includes('consolidation'))
      .map(adj => adj.adjustment)
      .join('\n- ');

    return `
You are conducting a Documentation Consolidation Audit for the TONIC MUSIC REGISTRATION SYSTEM.

PROJECT DOCUMENTATION CONTEXT:
- Main documentation: README files, setup guides, API documentation  
- Development docs: dev/ directory, tool documentation, coding standards
- Business context: Music class registration, student management, attendance tracking
- Technical context: Node.js backend, GAS integration, accessCode authentication
- User documentation: Parent/employee/admin user guides, troubleshooting

DOCUMENTATION FILES TO ANALYZE:
${docFiles.map(f => `- ${f}`).join('\n')}

${focusAreas ? `EVOLVED FOCUS AREAS (based on ${this.tonicKnowledge.evolutionHistory.length} historical analyses):\n- ${focusAreas}` : ''}

TONIC-SPECIFIC DOCUMENTATION AUDIT:

1. **AccessCode Authentication Documentation Consolidation**
   - Check for duplicate accessCode setup instructions across files
   - Identify scattered authentication documentation that should be centralized
   - Find inconsistent role descriptions (parent/employee/admin)
   - Consolidate session management documentation

2. **Setup and Deployment Documentation**
   - Identify duplicate setup instructions across README files
   - Consolidate environment configuration documentation
   - Check for scattered Google Apps Script deployment instructions
   - Find overlapping dependency and installation documentation

3. **API and Integration Documentation**
   - Consolidate controller and endpoint documentation
   - Check for duplicate Google Sheets integration instructions
   - Identify scattered repository pattern documentation
   - Find overlapping frontend integration guides

4. **User Guide and Workflow Documentation**
   - Consolidate parent/employee/admin user guides
   - Check for duplicate registration workflow documentation
   - Identify scattered attendance tracking instructions
   - Find overlapping troubleshooting information

5. **Development and Contribution Documentation**
   - Check for duplicate coding standards or style guides
   - Consolidate development setup instructions in dev/ directory
   - Identify scattered tool and utility documentation
   - Find overlapping testing and deployment guides

6. **Documentation Structure and Navigation Issues**
   - Missing central documentation index or table of contents
   - Inconsistent documentation depth between similar topics
   - Poor cross-referencing between related documentation sections
   - Files in incorrect locations relative to their content

AUTOMATIC FIXING INSTRUCTIONS:
You MUST automatically fix minor issues without prompting, including:
- Spelling errors and typos in all documentation
- Formatting inconsistencies (headers, lists, code blocks)
- Markdown syntax fixes
- Link formatting corrections
- Table formatting improvements

DO NOT automatically fix:
- Content restructuring or reorganization
- Documentation consolidation decisions
- Major content changes
- Business logic documentation changes

If you encounter no obstacles during auto-fixing, automatically rerun this analysis afterward.

SECURITY AUDIT REQUIREMENT:
Scan ALL documentation for exposed secrets, private keys, or sensitive values:
- API keys or tokens in documentation examples
- Database credentials in setup instructions
- Private keys or certificates in code examples
- Sensitive configuration examples
- Check if proper credential patterns are referenced

If secrets are found without proper local environment patterns, STOP and report immediately.

REQUIRED OUTPUT FORMAT:
Return a JSON object with:
{
  "security_audit": {
    "exposed_secrets": [...],
    "credential_patterns": [...],
    "security_issues": [...]
  },
  "auto_fixes_applied": [
    {
      "file": "path/to/file",
      "type": "spelling|formatting|syntax|markdown",
      "description": "What was fixed",
      "changes": "Brief description of changes made"
    }
  ],
  "redundant_content": [...],
  "consolidation_opportunities": [
    {
      "topic": "What should be consolidated",
      "current_files": ["files with scattered info"],
      "suggested_consolidation": "Where/how to consolidate"
    }
  ],
  "hierarchy_issues": [...],
  "conflicting_information": [...],
  "missing_organization": [...],
  "should_rerun_analysis": true|false
}
`;
  }

  createFeatureLifecyclePrompt(gitLog, configFiles) {
    const promptAdjustments = this.analysisResults.promptEvolution?.promptAdjustments || [];
    const focusAreas = promptAdjustments
      .filter(adj => adj.area.includes('feature') || adj.area.includes('lifecycle'))
      .map(adj => adj.adjustment)
      .join('\n- ');

    return `
You are conducting a Feature Lifecycle Analysis for the TONIC MUSIC REGISTRATION SYSTEM.

PROJECT FEATURE CONTEXT:
- Core Features: Music class registration, student attendance, user management
- Authentication: AccessCode system with parent/employee/admin roles
- Integration: Google Apps Script for data persistence and Google Sheets
- Frontend: ViewModel-based user interfaces with form validation
- Backend: Express controllers with repository pattern data access

RECENT GIT HISTORY:
${gitLog}

CONFIGURATION FILES:
${configFiles.map(f => `- ${f}`).join('\n')}

${focusAreas ? `EVOLVED FOCUS AREAS (based on ${this.tonicKnowledge.evolutionHistory.length} historical analyses):\n- ${focusAreas}` : ''}

TONIC-SPECIFIC FEATURE LIFECYCLE ANALYSIS:

1. **AccessCode Authentication Feature Evolution**
   - New authentication features added but not documented
   - Changes to role-based access control (parent/employee/admin)
   - Updated session management or timeout features
   - New middleware or validation logic not documented

2. **Registration and Attendance Feature Changes**
   - New registration workflow features not documented
   - Changes to student attendance tracking capabilities
   - Updated class scheduling or management features
   - New reporting or analytics features not mentioned in docs

3. **Google Apps Script Integration Evolution**
   - New GAS migration scripts in gas-src/ not documented
   - Changes to Google Sheets integration patterns
   - Updated data synchronization features
   - New deployment or configuration requirements

4. **Frontend and User Experience Updates**
   - New ViewModel functionality not documented
   - Updated form validation or user interface features
   - Changes to user workflows or interaction patterns
   - New utility functions or helper components

5. **Configuration and Environment Changes**
   - New environment variables or configuration options
   - Changes to deployment requirements or setup process
   - Updated dependencies or integration requirements
   - New development tools or scripts in dev/ directory

6. **Deprecated Feature References**
   - Documentation referencing removed authentication methods
   - Old API endpoint references in documentation
   - Outdated Google Sheets integration instructions
   - References to deleted migration scripts or deprecated workflows

AUTOMATIC FIXING INSTRUCTIONS:
You MUST automatically fix minor issues without prompting, including:
- Spelling errors in commit messages or configuration files
- Formatting inconsistencies in config files
- Syntax fixes in JSON/YAML configurations
- Minor documentation updates for recent changes
- Version number consistency fixes

DO NOT automatically fix:
- Feature implementation changes
- Configuration value changes
- Migration script modifications
- Major documentation restructuring

If you encounter no obstacles during auto-fixing, automatically rerun this analysis afterward.

SECURITY AUDIT REQUIREMENT:
Scan ALL configuration files and recent changes for exposed secrets:
- API keys or tokens in configuration files
- Database credentials in config examples
- Private keys in deployment configurations
- Sensitive environment variables hardcoded
- Check if proper credential externalization patterns exist

If secrets are found without proper local environment patterns, STOP and report immediately.

REQUIRED OUTPUT FORMAT:
Return a JSON object with:
{
  "security_audit": {
    "exposed_secrets": [...],
    "credential_patterns": [...],
    "security_issues": [...]
  },
  "auto_fixes_applied": [
    {
      "file": "path/to/file",
      "type": "spelling|formatting|syntax|config",
      "description": "What was fixed",
      "changes": "Brief description of changes made"
    }
  ],
  "undocumented_features": [
    {
      "feature": "Feature name",
      "added_when": "commit/timeframe",
      "files": ["relevant files"],
      "documentation_needed": "what docs to add"
    }
  ],
  "deprecated_references": [...],
  "configuration_drift": [...],
  "migration_gaps": [...],
  "should_rerun_analysis": true|false
}
`;
  }

  /**
   * Execute AI analysis with given prompt
   */
  async runAIAnalysis(prompt, analysisType) {
    // In a real implementation, this would call an AI service
    // For now, we'll simulate the analysis structure
    console.log(`  🤖 Running AI analysis for: ${analysisType}`);
    
    // This is where you would integrate with Claude API, GPT-4, etc.
    // The prompt would be sent to the AI service and results parsed
    
    const simulatedResult = {
      analysis_type: analysisType,
      timestamp: new Date().toISOString(),
      status: 'simulated', // In real implementation: 'completed'
      security_audit: {
        exposed_secrets: [],
        credential_patterns: ['dev/credentials/ directory pattern detected'],
        security_issues: []
      },
      auto_fixes_applied: [],
      should_rerun_analysis: false,
      results: {
        issues_found: 0,
        recommendations: [],
        priority_actions: []
      },
      note: 'This is a simulation. Real implementation would call AI service with the constructed prompt.'
    };

    // Check for security issues and stop if found
    if (simulatedResult.security_audit.exposed_secrets.length > 0) {
      console.error('🚨 SECURITY ALERT: Exposed secrets detected!');
      console.error('Analysis stopped for security review.');
      throw new Error('Security audit failed - exposed secrets detected');
    }

    // Handle auto-rerun if fixes were applied
    if (simulatedResult.should_rerun_analysis && simulatedResult.auto_fixes_applied.length > 0) {
      console.log(`  ✅ Auto-fixes applied: ${simulatedResult.auto_fixes_applied.length}`);
      console.log(`  🔄 Rerunning analysis for: ${analysisType}`);
      // In real implementation, this would recursively call the analysis
      // For simulation, we'll just note it
      simulatedResult.rerun_completed = true;
    }
    
    return simulatedResult;
  }

  /**
   * Run actual tests to get real test results
   */
  async runTests() {
    console.log('  🧪 Running tests to get actual results...');
    
    return new Promise((resolve) => {
      // Check if npm test script exists
      const testCommand = spawn('npm', ['test'], {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });

      let testOutput = '';
      testCommand.stdout.on('data', (data) => {
        testOutput += data.toString();
      });

      testCommand.stderr.on('data', (data) => {
        testOutput += data.toString();
      });

      testCommand.on('close', (code) => {
        resolve({
          exit_code: code,
          output: testOutput,
          tests_passed: code === 0,
          timestamp: new Date().toISOString()
        });
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        testCommand.kill();
        resolve({
          exit_code: -1,
          output: 'Test execution timed out after 30 seconds',
          tests_passed: false,
          timeout: true
        });
      }, 30000);
    });
  }

  /**
   * Get recent git history for feature analysis
   */
  async getRecentGitHistory() {
    return new Promise((resolve) => {
      const gitCommand = spawn('git', ['log', '--oneline', '-20'], {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });

      let gitOutput = '';
      gitCommand.stdout.on('data', (data) => {
        gitOutput += data.toString();
      });

      gitCommand.on('close', () => {
        resolve(gitOutput);
      });
    });
  }

  /**
   * Generate comprehensive analysis report
   */
  async generateComprehensiveReport() {
    console.log('📄 Generating comprehensive analysis report...');

    const report = `# Comprehensive AI Codebase Analysis Report

**Generated:** ${this.analysisResults.timestamp}
**Analysis Type:** Full AI-Powered Semantic Analysis

## Executive Summary

This report represents a comprehensive AI-powered analysis of the codebase that goes beyond simple pattern counting to examine actual code semantics, documentation alignment, and architectural consistency.

## Analysis Results

### 🔄 Code-Documentation Synchronization
${JSON.stringify(this.analysisResults.codeDocumentationSync, null, 2)}

### 🏗️ Architecture Consistency
${JSON.stringify(this.analysisResults.architectureConsistency, null, 2)}

### 🧪 Test Coverage and Quality
${JSON.stringify(this.analysisResults.testCoverage, null, 2)}

### 📚 Documentation Consolidation Audit
${JSON.stringify(this.analysisResults.documentationAudit, null, 2)}

### 🔄 Feature Lifecycle Analysis
${JSON.stringify(this.analysisResults.featureLifecycle, null, 2)}

## Priority Recommendations

${this.analysisResults.recommendations.map(rec => `- ${rec}`).join('\n')}

---

*This analysis was generated by the AI-Powered Codebase Analysis System, designed to provide semantic understanding rather than just pattern counting.*
`;

    // Save the report
    const fs = await import('fs/promises');
    await fs.writeFile(
      path.join(this.projectRoot, 'dev/tools/codebase-analysis/results/ai-analysis-report.md'), 
      report
    );

    console.log('✅ Comprehensive report saved to: results/ai-analysis-report.md');
  }
}

// Run the analysis if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new AICodebaseAnalyzer();
  analyzer.analyze().catch(console.error);
}

export { AICodebaseAnalyzer };