# Development Scripts

This directory contains various analysis and testing scripts for the Tonic project's Google Sheets integration and performance testing.

## Scripts Overview

### 📊 Analysis Scripts

- **`analyze_sheets.js`** - Comprehensive analysis of Google Sheets data structure and relationships
  - Analyzes data distribution across different entity types (students, parents, instructors, etc.)
  - Identifies data quality issues and potential optimizations
  - Provides detailed statistics and recommendations

- **`analyze_structure.js`** - Deep structural analysis with optimization recommendations
  - Examines current data structure and suggests improvements
  - Analyzes performance bottlenecks and data access patterns
  - Provides architectural recommendations for better performance

- **`deep_analyze.js`** - In-depth analysis focusing on data relationships and integrity
  - Performs cross-reference analysis between different data entities
  - Identifies orphaned records and data inconsistencies
  - Provides detailed relationship mapping

### ⚡ Performance Scripts

- **`benchmark_optimizations.js`** - Performance benchmarking for optimization testing
  - Compares performance between different client implementations
  - Measures response times for various data operations
  - Tests caching effectiveness and optimization strategies

- **`test_client.js`** - Basic client functionality and performance testing
  - Tests Google Sheets client initialization and basic operations
  - Measures performance for standard CRUD operations
  - Validates client configuration and authentication

### 🔧 Utility Scripts

- **`run_structural_upgrade.js`** - Automated structural improvements and migrations
  - Applies structural changes to improve data organization
  - Implements performance optimizations
  - Handles data migration tasks

## Prerequisites

All scripts require:
- Google Sheets API credentials in `../credentials/temp_credentials.json`
- Node.js environment with ES modules support
- Access to the Tonic Google Sheets database

## Usage

Run any script from the project root or from this directory:

```bash
# From project root
node dev/scripts/script-name.js

# From dev/scripts directory
cd dev/scripts
node script-name.js
```

## Configuration

Scripts automatically detect their execution location and load Google Sheets credentials from the appropriate path:
- When run from the scripts directory: `../credentials/temp_credentials.json` 
- When run from project root: `dev/credentials/temp_credentials.json`

No additional configuration is typically required.

## Output

Most scripts provide detailed console output with:
- 🔍 Analysis results and recommendations
- 📊 Performance metrics and statistics
- ✅ Success indicators and progress updates
- ⚠️  Warnings about potential issues

## Development

These scripts are primarily used for:
- Performance analysis and optimization
- Data quality assessment
- Development and testing of new features
- Migration and structural improvements

When modifying these scripts, ensure they maintain compatibility with the main application's data models and Google Sheets client implementation.
