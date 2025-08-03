# Development Directory

This directory contains development tools, analysis scripts, and credentials for the Tonic project.

## Directory Structure

### 📁 `scripts/`
Contains various analysis and testing scripts for the Tonic project's Google Sheets integration:

- **Analysis Scripts**: Comprehensive data structure analysis and optimization recommendations
- **Performance Scripts**: Benchmarking and performance testing tools
- **Utility Scripts**: Automated improvements and migration tools

See [scripts/README.md](scripts/README.md) for detailed information about each script.

### 🔐 `credentials/`
Contains Google Sheets API credentials and other sensitive development files:

- `temp_credentials.json` - Service account credentials for Google Sheets API access
- This directory is gitignored to prevent accidental credential commits

## Security Notes

⚠️ **Important**: The `credentials/` directory contains sensitive authentication information and is excluded from version control. Ensure credentials are kept secure and never committed to the repository.

## Quick Start

1. **Set up credentials**: Place your Google Sheets service account credentials in `credentials/temp_credentials.json`
2. **Run analysis scripts**: Use any script from the `scripts/` directory to analyze or test the system
3. **Review results**: Scripts provide detailed console output with recommendations and metrics

## Usage Examples

```bash
# Run basic client testing
node dev/scripts/test_client.js

# Analyze data structure
node dev/scripts/analyze_sheets.js

# Performance benchmarking
node dev/scripts/benchmark_optimizations.js
```

For more detailed usage instructions, see the README file in the `scripts/` directory.
