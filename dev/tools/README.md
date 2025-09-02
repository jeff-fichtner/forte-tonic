# Project-Specific Reusable Tools

This directory contains reusable development tools specifically designed for the Tonic project.

## Available Tools

### 📊 Codebase Analysis Tool
Location: `codebase-analysis/`

A self-referential analysis tool that examines the project structure, patterns, and architecture:

- **Self-aware**: References previous analysis results to track evolution over time
- **Comprehensive**: Analyzes authentication flows, API patterns, model structures
- **Configurable**: Customizable analysis patterns and output formats
- **Template-based**: Generates reports using customizable markdown templates
- **Historical**: Maintains analysis history for trend tracking

**Usage:**
```bash
# From project root
node dev/tools/codebase-analysis/analyzer.js

# From tools directory
cd dev/tools/codebase-analysis
node analyzer.js
```

## Common Utilities

The `common/` directory contains shared utilities used across multiple tools:

- **`file-utils.js`** - File system scanning, pattern matching, and content analysis
- **`report-generator.js`** - Template processing and output generation

## Tool Development Guidelines

When creating new tools in this directory:

1. **Follow existing patterns**: Use ES modules and consistent logging format
2. **Use shared utilities**: Leverage `common/` utilities where possible
3. **Document thoroughly**: Include README with usage examples
4. **Store results**: Save analysis results for potential self-reference
5. **Template outputs**: Use customizable templates for report generation

## Configuration

Tools can be configured through:
- Individual `config.js` files in each tool directory
- Environment variables for sensitive settings
- Command-line arguments for runtime options

## Output Management

Tool outputs are organized as:
- **Results data**: JSON files for programmatic access
- **Reports**: Markdown files for human consumption
- **History**: Timestamped analysis for tracking changes

All output directories include `.gitkeep` files to ensure proper version control structure while excluding generated content.