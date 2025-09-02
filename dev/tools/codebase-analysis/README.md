# AI-Powered Codebase Analysis System

A comprehensive, self-evolving analysis system specifically designed for the Tonic Music Registration System. This tool goes beyond simple pattern counting to provide deep semantic analysis of code, documentation, architecture, and feature evolution.

## System Overview

### Core Philosophy
Unlike traditional static analysis tools that just count patterns, this system:
- **Understands Context**: Knows it's analyzing a music registration system with specific patterns
- **Evolves Over Time**: Learns from previous analyses to improve future ones  
- **Self-References**: Analyzes its own evolution and capabilities
- **Focuses on Real Issues**: Finds actual inconsistencies, not just metrics

### Architecture

```
ai-analysis-system.js       # Main orchestrator with Tonic-specific knowledge
├── Historical Context      # Loads last 10 analyses to understand evolution
├── Prompt Evolution        # Adapts analysis focus based on recurring issues  
├── Analysis Phases         # 5 comprehensive analysis areas
└── Self-Evolution          # Analyzes the analysis tool itself

analyzer.js                 # Utility script for basic metrics collection
├── Pattern Counting        # Regex-based pattern detection
├── File Scanning           # Glob-based file discovery
└── Report Generation       # Markdown report creation

config.js                   # Tonic-specific configuration
common/                     # Shared utilities
├── file-utils.js          # File scanning, pattern matching, content analysis
└── report-generator.js    # Template processing, historical tracking
```

## Analysis Capabilities

### 1. Code-Documentation Synchronization
**Purpose**: Find where code and documentation are out of sync

**Tonic-Specific Analysis**:
- AccessCode authentication flow documentation vs implementation
- Controller-Repository pattern documentation accuracy
- Google Apps Script integration documentation completeness
- Frontend ViewModel pattern documentation alignment
- Configuration and environment setup accuracy

### 2. Architecture Consistency Analysis  
**Purpose**: Identify architectural inconsistencies and pattern violations

**Tonic-Specific Focus**:
- Controller pattern consistency across src/controllers/
- Repository pattern implementation uniformity
- AccessCode authentication pattern consistency
- Frontend ViewModel pattern adherence
- Google Apps Script integration pattern consistency
- File organization and structure validation

### 3. Test Coverage and Quality Analysis
**Purpose**: Analyze test completeness and identify critical gaps

**Tonic-Specific Testing**:
- AccessCode authentication test coverage
- Controller and repository operation testing
- Google Apps Script integration test gaps
- Frontend ViewModel and user flow testing
- Critical business logic test coverage
- Integration and end-to-end test analysis

### 4. Documentation Consolidation Audit
**Purpose**: Find redundant, scattered, or conflicting documentation

**Tonic-Specific Documentation**:
- AccessCode authentication documentation consolidation
- Setup and deployment documentation overlap
- API and integration documentation redundancy
- User guide and workflow documentation gaps
- Development and contribution documentation organization
- Documentation structure and navigation issues

### 5. Feature Lifecycle Analysis
**Purpose**: Track feature evolution and find documentation drift

**Tonic-Specific Evolution**:
- AccessCode authentication feature changes
- Registration and attendance feature updates
- Google Apps Script integration evolution
- Frontend and user experience updates
- Configuration and environment changes
- Deprecated feature reference cleanup

## Self-Evolution System

### Historical Context Loading
- Maintains last 10 analysis results for comparison
- Identifies recurring issues across analyses
- Tracks architectural drift over time
- Monitors tool capability evolution

### Prompt Evolution
- Automatically adjusts analysis focus based on historical patterns
- Increases attention on frequently occurring issues
- Adapts to emerging architectural trends
- Learns from past analysis effectiveness

### Self-Analysis
- Analyzes the analysis tool's own code structure
- Tracks tool capability changes over time
- Suggests self-improvements based on usage patterns
- Maintains analysis tool quality and consistency

## Usage

### Quick Analysis
```bash
cd dev/tools/codebase-analysis
node ai-analysis-system.js
```

### What It Does
1. **Loads Historical Context**: Reviews last 10 analyses to understand trends
2. **Evolves Prompts**: Adjusts analysis focus based on learning from history
3. **Runs Basic Metrics**: Uses existing analyzer.js as utility for pattern counts
4. **Performs Deep Analysis**: Runs 5 comprehensive AI-powered analysis phases
5. **Self-Analyzes**: Examines its own evolution and improvement opportunities
6. **Generates Reports**: Creates comprehensive analysis with actionable recommendations
7. **Saves History**: Stores analysis for future evolution (maintains 10-item history)

### Output Files
- `results/ai-analysis-report.md` - Comprehensive analysis report
- `results/history/ai-analysis-*.json` - Historical analysis data (last 10)
- `results/summary.md` & `results/detailed.md` - Basic metrics reports (from analyzer.js)

## Tonic-Specific Knowledge Base

The system maintains deep knowledge about the Tonic Music Registration System:

```javascript
tonicKnowledge: {
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
  }
}
```

## Evolution Tracking

The system automatically:
- Tracks file count growth and architectural drift
- Monitors authentication complexity changes
- Identifies recurring issues for increased focus
- Suggests analysis improvements based on usage patterns
- Maintains tool evolution history and capability tracking

## Future Integration

This system is designed to be integrated with:
- CI/CD pipelines for continuous analysis
- AI services (Claude, GPT-4) for actual semantic analysis
- Development workflows for proactive issue detection
- Documentation generation for automated updates

---

**Note**: Currently, the AI analysis phases return simulated results. To enable full functionality, integrate with an AI service API to process the comprehensive, context-aware prompts generated by the system.