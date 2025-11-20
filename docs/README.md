# Documentation Index

This directory contains all documentation for the Tonic Music Program Registration System. For AI assistants working on this project, see the [Claude Codebase Cache](../CLAUDE_CODEBASE_CACHE.md) for quick reference and development commands.

Documentation is organized into two main categories:

## 📋 Business Documentation (`business/`)
*Documents for administrators, stakeholders, and decision-makers*

### Planning & Operations
- **[TECHNICAL_HOSTING_PROPOSAL.md](business/TECHNICAL_HOSTING_PROPOSAL.md)** - Hosting options and recommendations for school administration
- **[PRIVACY_POLICY.md](business/PRIVACY_POLICY.md)** - Privacy policy for student data handling
- **[DEPLOYMENT_CHECKLIST.md](business/DEPLOYMENT_CHECKLIST.md)** - Pre-deployment verification checklist

### Setup & Administration
- **[NODE_SETUP.md](business/NODE_SETUP.md)** - Setup instructions for administrators
- **[RENDER_WINDDOWN_PROCEDURE.md](business/RENDER_WINDDOWN_PROCEDURE.md)** - Historical record of migration from Render to GCP

---

## ⚙️ Technical Documentation (`technical/`)
*Documents for developers and technical implementation*

### Architecture & Design
- **[ARCHITECTURE.md](technical/ARCHITECTURE.md)** - System architecture overview
- **[ARCHITECTURE_COMPLETE.md](technical/ARCHITECTURE_COMPLETE.md)** - Detailed architecture documentation
- **[DDD_ARCHITECTURE_SUMMARY.md](technical/DDD_ARCHITECTURE_SUMMARY.md)** - Domain-driven design summary

### Configuration & Environment
- **[ENVIRONMENT_VARIABLES.md](technical/ENVIRONMENT_VARIABLES.md)** - Environment variable configuration
- **[ENV_CONSOLIDATION.md](technical/ENV_CONSOLIDATION.md)** - Environment setup consolidation
- **[CONFIG_CLEANUP_SUMMARY.md](technical/CONFIG_CLEANUP_SUMMARY.md)** - Configuration cleanup documentation

### Migration & Upgrades
- **[MIGRATION_SUMMARY.md](technical/MIGRATION_SUMMARY.md)** - Migration from Google Apps Script to Node.js
- **[FRONTEND_ES_MODULES_MIGRATION.md](technical/FRONTEND_ES_MODULES_MIGRATION.md)** - Frontend modernization guide
- **[JS_MODULE_MIGRATION.md](technical/JS_MODULE_MIGRATION.md)** - JavaScript module migration

### Development & Maintenance
- **[BUG_FIX_VIEWMODEL_ID_COMPARISON.md](technical/BUG_FIX_VIEWMODEL_ID_COMPARISON.md)** - Bug fix documentation
- **[TEST_CLEANUP.md](technical/TEST_CLEANUP.md)** - Testing setup and cleanup
- **[FORMATTING_SETUP.md](technical/FORMATTING_SETUP.md)** - Code formatting configuration

### Integration & Services
- **[GOOGLE_SHEETS_CLIENT_CONSOLIDATION.md](technical/GOOGLE_SHEETS_CLIENT_CONSOLIDATION.md)** - Google Sheets integration
- **[FACTORY_PATTERN_EXAMPLE.md](technical/FACTORY_PATTERN_EXAMPLE.md)** - Design pattern examples
- **[DUAL_CONSTRUCTOR_ANALYSIS.md](technical/DUAL_CONSTRUCTOR_ANALYSIS.md)** - Constructor pattern analysis

### Versioning & Deployment
- **[VERSION_DISPLAY.md](technical/VERSION_DISPLAY.md)** - Version display implementation
- **[BRANCH_PROTECTION.md](technical/BRANCH_PROTECTION.md)** - Branch protection and CI/CD workflow
- **[Build Configuration](../src/build/README.md)** - Docker and Cloud Build deployment guide

---

## 📁 Generated Documentation
- **[generated/](generated/)** - Auto-generated API documentation and reports

---

## Document Categories Explained

### 📋 Business Documents
These documents are written for:
- School administrators and decision-makers
- Non-technical stakeholders
- Budget and planning purposes
- Compliance and policy requirements

### ⚙️ Technical Documents
These documents are written for:
- Software developers and engineers
- System administrators and DevOps
- Technical implementation and maintenance
- Code architecture and development practices

---

## 🔧 Analysis & Development Tools
- **[Development Tools](../dev/tools/README.md)** - Codebase analysis and development utilities
- **[Analysis Results](../dev/tools/codebase-analysis/results/)** - Generated analysis reports and metrics

## 📖 Quick Navigation

### For New Developers
1. Start with [README.md](../README.md) for project overview
2. Review [Claude Codebase Cache](../CLAUDE_CODEBASE_CACHE.md) for development setup
3. Check [Architecture](technical/ARCHITECTURE.md) for system design
4. See [Environment Variables](technical/ENVIRONMENT_VARIABLES.md) for configuration

### For Administrators
1. Review [Technical Hosting Decision](business/TECHNICAL_HOSTING_PROPOSAL.md)
2. Follow [Node Setup Guide](business/NODE_SETUP.md)
3. Check [Build Configuration](../src/build/README.md) for deployment

### For AI Assistants
1. Always refer to [Claude Codebase Cache](../CLAUDE_CODEBASE_CACHE.md) first
2. Use development tools in [dev/tools/](../dev/tools/) for analysis
3. Check recent analysis results for current codebase state

---

*Last updated: November 18, 2025*
