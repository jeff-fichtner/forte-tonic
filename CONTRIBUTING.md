# Contributing Guidelines

## Pre-Commit Checklist

**ALWAYS** run these commands before committing:

1. **Format code:**

   ```bash
   npm run format
   ```

2. **Lint code:**

   ```bash
   npm run lint
   ```

   - Must have **zero errors** (warnings are acceptable)

3. **Run unit tests:**

   ```bash
   npm run test:unit
   ```

   - All tests must pass

## Commit Practices

### ✅ DO:

- **Review all changes** before committing:
  ```bash
  git status
  git diff
  ```
- **Commit files explicitly** (never use `git add -A` or `git commit -a`):
  ```bash
  git add src/specific/file.js
  git commit -m "Clear, descriptive message"
  ```
- **Verify staged changes** before committing:
  ```bash
  git diff --staged
  ```

### ❌ DON'T:

- ❌ Never use `git add -A` or `git add .`
- ❌ Never use `git commit -a`
- ❌ Never commit without running format/lint/tests
- ❌ Never commit "all changes" without reviewing each file

## Commit Message Format

```
Short descriptive title (50 chars or less)

- Bullet point describing specific change
- Another specific change
- Test results if applicable (e.g., "All 127 tests pass")
```

## For AI Assistants

When assisting with this codebase:

1. **Before ANY commit**, MUST run:
   - `npm run format`
   - `npm run lint` (check for errors)
   - `npm run test:unit` (all must pass)

2. **Review changes** with `git status` and `git diff`

3. **Stage files explicitly**:

   ```bash
   git add path/to/specific/file.js
   ```

4. **Never** use `git add -A`, `git add .`, or `git commit -a`

5. **Verify staged** with `git diff --staged`

6. **Commit with clear message** describing what changed and why
