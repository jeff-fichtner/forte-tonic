# GitHub Branch Protection Configuration

To ensure code quality and prevent accidental direct pushes to production branches, configure branch protection rules in GitHub.

## Main Branch Protection

Navigate to: **GitHub Repo → Settings → Branches → Add rule**

### Protection Settings for `main` branch:

#### Pull Request Requirements

- ✅ **Require a pull request before merging**
  - Required approvals: 0 (or 1 if you want human approval)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (optional)

#### Status Checks

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required status checks:**
    - `Validate Code Quality` (from main-branch.yml validate job)

#### Additional Restrictions

- ✅ **Do not allow bypassing the above settings**
- ❌ **Allow force pushes** (should be DISABLED)
- ❌ **Allow deletions** (should be DISABLED)

#### Optional Settings

- ⚪ Require deployments to succeed before merging (if using GitHub Environments)
- ⚪ Require conversation resolution before merging
- ⚪ Require signed commits
- ⚪ Restrict who can push to matching branches

## Why These Settings Matter

### Prevents Direct Pushes

Without branch protection, developers could accidentally:

```bash
git push origin main  # Would push directly to main (BAD!)
```

With branch protection, direct pushes are blocked and require a PR.

### Ensures Tests Pass

The "validate" job from `main-branch.yml` must pass before PR can merge:

- Linting must pass
- Formatting must pass
- Tests must pass

If any check fails, the PR cannot be merged.

### Enforces Workflow

Ensures all code follows the proper flow:

```
feature branch → dev → (PR) → main
```

Cannot bypass dev branch and merge feature branches directly to main.

## Verifying Branch Protection

Test that branch protection is working:

1. Try to push directly to main:

   ```bash
   git checkout main
   git commit --allow-empty -m "test"
   git push origin main
   ```

   Should see error: `remote: error: GH006: Protected branch update failed`

2. Create a PR with failing tests:
   - PR should show ❌ "Some checks were not successful"
   - Merge button should be disabled

3. Fix tests, push again:
   - PR should show ✅ "All checks have passed"
   - Merge button should be enabled

## Admin Override

Repository admins can bypass these restrictions if needed. However, this should be avoided except for emergencies.

To temporarily disable protection:

1. Go to Settings → Branches → Edit rule
2. Uncheck "Do not allow bypassing the above settings"
3. Perform emergency action
4. Re-enable protection immediately after

## Documentation

For more information on branch protection:
https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
