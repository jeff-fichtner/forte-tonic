# GCP Project & CI/CD Management Plan (with Trigger Patterns)

## 1. Folder-Based Project Management
- All GCP operations (`setup-gcp`, `status-gcp`, `cleanup-gcp`, `destroy-gcp`) are performed at the folder level.
- The folder is specified by ID only (no name resolution).
- All bash logic is shared for DRY code.

## 2. Single Unified Setup
- `./manage-gcp-cicd.sh setup-gcp --folder=FOLDER_ID`
- Creates both staging and production projects in the specified folder.
- Project IDs are generated with GCP’s unique suffixes (not hardcoded).
- Each project gets its own isolated secrets and configuration.

## 3. Environment-Isolated Secrets
- Each project (staging, production) has its own set of secrets with the same names.
- Secrets are created using shared bash functions.
- No cross-environment access.

## 4. Optional IAM Replication
- Optionally replicate IAM access from a template project.
- If no template is provided, skip this step.

## 5. Folder-Based Lifecycle Commands
- `status-gcp`, `cleanup-gcp`, and `destroy-gcp` commands operate on all Tonic projects in the folder.
- Projects are discovered by label (`application=tonic`).

## 6. GitHub Actions & Cloud Build Triggers
### a. Staging/Dev Trigger
- The Cloud Build trigger for the dev/staging project only fires on tags matching the strict semver regex:  
  `^v[0-9]+\.[0-9]+\.[0-9]+$`
- This ensures only tags like `v1.2.3` trigger the build for dev/staging.
- Pre-releases and other tag formats are ignored.

### b. Production/Main Trigger
- The Cloud Build trigger for the production project fires on all pushes to the main branch (e.g., `refs/heads/main`).
- No tag or version restriction for production; every push to main triggers the build/deploy.

## 7. Example Command Interface
```bash
./manage-gcp-cicd.sh setup-gcp --folder=FOLDER_ID
./manage-gcp-cicd.sh status-gcp --folder=FOLDER_ID
./manage-gcp-cicd.sh cleanup-gcp --folder=FOLDER_ID
./manage-gcp-cicd.sh destroy-gcp --folder=FOLDER_ID
```

## 8. Safety & Access
- All destructive actions require confirmation.
- A separate one-time script is provided to update user permissions for least-privilege access.

### Permission Update Function (in manage script)

**Purpose:**
- To remove the `Owner` role from a specified user on a given project and grant all necessary non-secret, non-billing edit permissions.
- Ensures users retain the ability to manage resources and CI/CD, but cannot access secrets or billing settings.

**What the Function Does:**
- Removes the `roles/owner` binding for the specified user.
- Grants the following roles:
  - `roles/editor` (general edit permissions)
  - `roles/iam.serviceAccountUser` (to allow use of service accounts)
  - Any other roles required for CI/CD, except those related to Secret Manager or Billing.
- Does **not** grant:
  - `roles/secretmanager.admin` or `roles/secretmanager.secretAccessor`
  - `roles/billing.admin` or any billing-related roles

**Usage Example:**
```bash
./manage-gcp-cicd.sh update-permissions --project=PROJECT_ID --user=user@example.com
```

**Function Steps:**
1. Remove `roles/owner` from the user:
   ```bash
   gcloud projects remove-iam-policy-binding PROJECT_ID \
     --member="user:user@example.com" \
     --role="roles/owner"
   ```
2. Add `roles/editor` and `roles/iam.serviceAccountUser`:
   ```bash
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="user:user@example.com" \
     --role="roles/editor"

   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="user:user@example.com" \
     --role="roles/iam.serviceAccountUser"
   ```
3. (Optional) Add any other required roles for CI/CD, except secrets/billing.

**Notes:**
- This function is intended for one-time use per user per project, typically after initial setup.
- It is auditable and can be run by a project admin or automation.
- Always verify permissions after running the function to ensure least-privilege is enforced.
## 9. Cloud Build Pipeline Update

**Purpose:** Update the `cloudbuild.yaml` file to remove version incrementing, the related secret, and the unit test run, so that Cloud Build focuses solely on build and deploy.

Update the `cloudbuild.yaml` file as follows:

- **Remove all version incrementing and tagging logic from the pipeline.**
- **Remove the secret required for version incrementing (e.g., `GITHUB_TOKEN`).**
- **Remove the step that runs unit tests.**

This ensures that version management and test gating are handled in GitHub Actions, not in Cloud Build. The Cloud Build pipeline will focus solely on building and deploying the application.
## 10. GitHub Actions Workflow for Dev Branch

**Purpose:** Create a GitHub Actions workflow that builds and tests all pushes to `dev`, and if successful, tags/releases a new version and increments the version in the repository.

Add a new GitHub Actions workflow with the following behavior:

- **Trigger:** On all pushes to the `dev` branch.
- **Steps:**
  1. Build the application (install dependencies, lint, etc.).
  2. Run unit tests. If tests fail, the workflow fails and stops.
  3. If tests pass:
     - Publish a new version tag on the `dev` branch (e.g., `v1.1.0`).
     - Increment the version in `package.json` and commit the change back to the repository.

This workflow ensures that only code passing all tests is versioned and tagged, and that version management is handled in GitHub, not in Cloud Build.

---

**Summary of Trigger Logic:**
- **Dev/Staging:** Only tags matching `^v[0-9]+\.[0-9]+\.[0-9]+$` trigger builds.
- **Production/Main:** All pushes to the main branch trigger builds.
