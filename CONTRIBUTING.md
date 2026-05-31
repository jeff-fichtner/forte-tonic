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

4. **Update affected reference docs:**

   If your change affects anything documented in [docs/technical/ARCHITECTURE.md](docs/technical/ARCHITECTURE.md), [docs/technical/API.md](docs/technical/API.md), or [docs/technical/FRONTEND.md](docs/technical/FRONTEND.md), update the relevant document in the same PR. Each of those docs opens with a maintenance-contract header listing the code surface area whose changes trigger an update.

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

## Versioning

This project uses [semantic versioning](https://semver.org/). Use the npm scripts — they bump `package.json`, update `package-lock.json`, and commit atomically:

```bash
npm run version:increment          # patch — bug fixes (1.4.x → 1.4.x+1)
npm run version:increment:minor    # minor — new features / new behavior (1.4.x → 1.5.0)
npm run version:increment:major    # major — breaking changes (1.x.x → 2.0.0)
```

**When to bump:**

- **Patch**: bug fixes, dependency updates, internal refactors with no observable behavior change
- **Minor**: new user-facing behavior, new endpoints, new capabilities (e.g. error visibility pipeline)
- **Major**: breaking API changes, auth contract changes, schema migrations requiring manual intervention

Do not call `scripts/version-manager.sh` directly — the npm scripts wrap it and handle the commit.

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
   - `npm run check:all` (runs format:check, lint, and tests)
   - OR individually: `npm run format`, `npm run lint`, `npm run test:unit`

2. **Review changes** with `git status` and `git diff`

3. **Stage files explicitly**:

   ```bash
   git add path/to/specific/file.js
   ```

4. **Never** use:
   - ❌ `git add -A` or `git add .`
   - ❌ `git commit -a`
   - ❌ **`git push`** - AI should NEVER push code

5. **Verify staged** with `git diff --staged`

6. **Commit with clear message** describing what changed and why

7. **⚠️ CRITICAL: NEVER PUSH CODE** - User will push manually after review
