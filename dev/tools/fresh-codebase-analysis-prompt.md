# Fresh Codebase Analysis Prompt

**CRITICAL INSTRUCTION: This analysis must be based ONLY on current filesystem data. Do NOT use any previous analysis results, conversation history, or cached information. Always perform fresh scans of the actual codebase.**

## Analysis Scope

Perform a comprehensive analysis of the Tonic Music Registration System codebase at `/Users/sherlock/dev/professional/forte/tonic`. Examine the codebase as it exists RIGHT NOW by:

### 1. Current Git State (FRESH DATA ONLY)
- Execute `git branch --show-current` to determine actual current branch
- Execute `git status --porcelain` to see current modifications
- Execute `git log --oneline -10` to see recent commits
- DO NOT rely on any previous git information

### 2. Current Project Structure (FRESH SCAN)
- Execute `find . -type f -name "*.js" | wc -l` to count JavaScript files
- Execute `ls -la` to see current directory structure  
- Execute `cat package.json | grep -E '"name"|"version"|"main"'` for project info
- Scan actual directory tree with `tree` or `ls -R` commands

### 3. Current Code Quality (LIVE RESULTS)
- Execute `npm run lint` to get current linting status
- Execute `npm test` to get current test results
- DO NOT reference previous lint or test results

### 4. Current Configuration (LIVE FILES)
- Read actual environment files (`.env.example`, `.env.test`)
- Check current `package.json` scripts and dependencies
- Examine current deployment configuration files

### 5. Current Development Status (REAL-TIME DATA)
- Identify modified files from git status
- Determine work in progress from branch name and recent commits
- Look at actual file modification times and content

## Analysis Output Requirements

Provide a report structured as follows:

### Current State Summary
- Actual current branch name
- Number of modified files and what they are
- Last commit message and date

### Project Health Metrics  
- Total JavaScript files count
- Current ESLint error/warning count
- Current test pass/fail status
- Dependencies status from package.json

### Active Development Work
- What work is in progress based on current branch and modifications
- Any pending issues visible in current code
- Current configuration state

### Immediate Action Items
- Critical issues requiring attention based on fresh scan
- Quick wins available based on current lint/test results
- Next steps based on current project state

## Execution Guidelines

1. **Always start fresh** - ignore all previous analysis data
2. **Execute commands** - don't assume file contents or status  
3. **Read current files** - don't use cached information
4. **Automatically fix minor issues** - before performing analysis:
   - Run `npm run lint -- --fix` to auto-fix simple linting issues
   - Remove unused imports and variables if they don't break functionality
   - Fix obvious code quality issues (hasOwnProperty usage, unreachable code, etc.)
   - Only fix issues that are clearly safe and don't change program behavior
5. **Provide timestamps** - when was this analysis performed
6. **Base conclusions on evidence** - reference specific command outputs

## Auto-Fix Protocol

Before running the analysis:
1. Execute `npm run lint -- --fix` to handle auto-fixable issues
2. If significant ESLint errors remain (>10), attempt to fix:
   - Unused private class members (safe to remove if truly unused)
   - Unreachable code (safe to remove)
   - Unused variables and imports (safe to remove)
   - Object.prototype method usage fixes
3. Only proceed with fixes that don't require business logic understanding
4. If unsure about a fix, document it as needing manual attention
5. Re-run linting after fixes to verify improvements

**Remember: This analysis is only valuable if it reflects the current, actual state of the codebase. Any reference to previous analysis invalidates this report. Auto-fixes should be conservative and safe.**