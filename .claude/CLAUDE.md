# Project Instructions for Claude Code

## Implementation Philosophy

**Implement exactly what is requested. Nothing more, nothing less.**

When implementing features, do NOT add complexity that wasn't explicitly requested:

- No expiration timers unless specifically asked for
- No configuration options unless specifically asked for
- No validation beyond what's necessary for the feature to work
- No "best practices" or "common patterns" unless specifically discussed
- No edge case handling beyond what was explicitly mentioned

### Examples of what NOT to do:

❌ Request: "auto-login with stored access code on page load"
   Bad: Add max age config, 8-hour expiration, session timeout warnings
   Good: Load access code and log in. Done.

❌ Request: "add a button to submit feedback"
   Bad: Add character limits, email validation, rate limiting, analytics
   Good: Add a button that submits feedback. Done.

❌ Request: "fix the registration form bug"
   Bad: Fix bug + refactor surrounding code + add error handling + update tests
   Good: Fix the specific bug. Done.

### General Rules

- Only implement what was explicitly requested
- If you identify additional improvements, STOP and ASK first
- Resist the urge to add features "while you're in there"
- Don't assume requirements that weren't stated

**When in doubt: Ask first, code second.**
