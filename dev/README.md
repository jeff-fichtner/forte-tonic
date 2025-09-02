# Development Tools & Utilities

This directory contains development-specific tools, analysis scripts, and credentials for the Tonic project.

> 📖 **For general project information**, see the main [README.md](../README.md) in the root directory.

## Directory Structure

### 🛠️ `tools/` - Development Analysis Tools
Advanced project analysis and development workflow utilities:

- **Codebase Analysis Tool**: Self-referential analyzer examining project structure, patterns, and evolution
- **Shared Utilities**: File scanning, pattern matching, and report generation
- **Template System**: Customizable markdown report generation

**Quick Commands:**
```bash
# Run comprehensive codebase analysis
node dev/tools/codebase-analysis/analyzer.js

# View generated analysis reports
open dev/tools/codebase-analysis/results/
```

### 📊 `scripts/` - Google Sheets Integration Testing
Specialized scripts for Google Sheets API testing and data analysis:

- **Connection Testing**: Validate Google Sheets API connectivity
- **Data Structure Analysis**: Schema validation and optimization recommendations  
- **Performance Benchmarking**: API performance testing and optimization
- **Migration Utilities**: Data migration and transformation tools

**Quick Commands:**
```bash
# Test Google Sheets connectivity
node dev/scripts/test_client.js

# Analyze spreadsheet structure
node dev/scripts/analyze_sheets.js

# Run performance benchmarks
node dev/scripts/benchmark_optimizations.js
```

### 🔐 `credentials/` - Development Credentials
Secure storage for development environment credentials:

- `temp_credentials.json` - Service account credentials for Google Sheets API
- **Security**: Directory is gitignored and excluded from version control

## Development Workflow

### Initial Setup
1. **Place credentials**: Add Google Sheets service account JSON to `credentials/temp_credentials.json`
2. **Verify access**: Run connection tests to validate Google Sheets API access
3. **Run analysis**: Use codebase analysis tools to understand project structure

### Daily Development
```bash
# Quick connectivity check
node dev/scripts/test_client.js

# Analyze changes impact on data structure  
node dev/scripts/analyze_sheets.js

# Generate fresh codebase analysis
node dev/tools/codebase-analysis/analyzer.js
```

### Performance Testing
```bash
# Benchmark Google Sheets operations
node dev/scripts/benchmark_optimizations.js

# Analyze query performance
node dev/scripts/deep_analyze.js
```

## Tool Categories

### Analysis & Reporting
- **Codebase Analysis**: Project structure, patterns, technical debt analysis
- **Data Analysis**: Google Sheets schema and data quality analysis
- **Performance Analysis**: API performance metrics and bottleneck identification

### Testing & Validation  
- **Connection Testing**: Google Cloud/Sheets API connectivity validation
- **Data Integrity**: Spreadsheet data validation and consistency checks
- **Performance Testing**: Load testing and optimization verification

### Development Utilities
- **Migration Tools**: Data migration and schema evolution utilities  
- **Debug Tools**: Development debugging and troubleshooting utilities
- **Report Generation**: Automated documentation and analysis report generation

## Security & Credentials

### Development Credentials Management
- **Location**: `dev/credentials/temp_credentials.json`
- **Source**: Google Cloud Console → Service Accounts → Download JSON key
- **Permissions**: Google Sheets API access for development spreadsheets
- **Security**: Never commit to repository (gitignored automatically)

### Service Account Setup
1. **Google Cloud Console**: Create or select project
2. **Enable APIs**: Google Sheets API and Google Drive API  
3. **Create Service Account**: Generate development service account
4. **Download Key**: Save JSON key file as `dev/credentials/temp_credentials.json`
5. **Share Spreadsheet**: Grant service account email access to development spreadsheet

## Development Scripts Reference

### Core Scripts
| Script | Purpose | Output |
|--------|---------|--------|
| `test_client.js` | Connectivity testing | Connection status, auth validation |
| `analyze_sheets.js` | Data structure analysis | Schema analysis, recommendations |
| `benchmark_optimizations.js` | Performance testing | Timing metrics, bottleneck analysis |
| `deep_analyze.js` | Comprehensive analysis | Detailed performance and structure analysis |

### Analysis Tools
| Tool | Purpose | Output |
|------|---------|--------|
| `codebase-analysis/analyzer.js` | Project analysis | Structure reports, pattern analysis |
| `codebase-analysis/ai-analysis-system.js` | AI-powered analysis | Advanced code insights, suggestions |

## Related Documentation

- **Main Project**: [../README.md](../README.md) - Full project documentation
- **Architecture**: [../docs/technical/ARCHITECTURE.md](../docs/technical/ARCHITECTURE.md) - System architecture
- **Google Sheets**: [../docs/technical/GOOGLE_SHEETS_CLIENT_CONSOLIDATION.md](../docs/technical/GOOGLE_SHEETS_CLIENT_CONSOLIDATION.md) - API integration
- **Environment Setup**: [../docs/technical/ENVIRONMENT_VARIABLES.md](../docs/technical/ENVIRONMENT_VARIABLES.md) - Configuration guide

---

**Note**: This directory is for development tools only. For production deployment, environment setup, or general usage, refer to the main project documentation.
