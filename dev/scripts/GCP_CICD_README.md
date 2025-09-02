# GCP CI/CD Management Scripts

This directory contains scripts for managing GCP projects, CI/CD, and permissions for the Tonic application using an environment-based, extensible architecture.

## Key Features

✨ **Environment-Specific Service Accounts**: Each environment gets its own dedicated service account for better security isolation  
🔧 **Extensible Architecture**: Easily add new environments by updating configuration  
🔐 **Automated Key Management**: Service account keys are generated and stored automatically  
📦 **Template-Based Creation**: Consistent patterns across all environments  

## Environment Configuration

The script supports multiple environments configured in the `ENVIRONMENTS` array:

- **staging**: Triggered by semver tags (v1.2.3)
- **production**: Triggered by main branch pushes
- **NEW**: Add custom environments easily!

### Adding New Environments

To add a new environment (e.g., "dev"), update the script configuration:

```bash
ENVIRONMENTS=(
    ["staging"]="semver_tags:^v[0-9]+\.[0-9]+\.[0-9]+$:Staging environment for semver tag deployments"
    ["production"]="main_branch:^main$:Production environment for main branch deployments"
    ["dev"]="dev_branch:^dev$:Development environment for dev branch testing"
    ["qa"]="qa_branch:^qa$:QA environment for quality assurance testing"
)
```

## Usage

All commands require explicit parameters:
- `--folder=FOLDER_ID` for folder-based operations
- `--project=PROJECT_ID` for single project operations  
- `--organization` for organization-wide operations (if supported)

### Setup (Creates ALL Configured Environments)
```bash
# Creates projects for staging, production, and any other configured environments
./manage-gcp-cicd.sh setup-gcp --folder=FOLDER_ID
./manage-gcp-cicd.sh setup-gcp --organization
```

**What gets created for EACH environment:**
- Dedicated GCP project (e.g., `tonic-staging-123456`, `tonic-production-789012`)
- Environment-specific service account (e.g., `tonic-staging-sa@project.iam.gserviceaccount.com`)
- Automatically generated and stored service account keys
- Environment-isolated secrets in Secret Manager
- Build triggers with environment-specific patterns
- Proper IAM permissions

### Status
```bash
./manage-gcp-cicd.sh status-gcp --folder=FOLDER_ID      # All environments in folder
./manage-gcp-cicd.sh status-gcp --project=PROJECT_ID    # Single project
./manage-gcp-cicd.sh status-gcp --organization          # All environments in org
```

### Cleanup (Removes CI/CD Infrastructure, Keeps Services Running)
```bash
./manage-gcp-cicd.sh cleanup-gcp --folder=FOLDER_ID     # All environments in folder
./manage-gcp-cicd.sh cleanup-gcp --project=PROJECT_ID   # Single project  
./manage-gcp-cicd.sh cleanup-gcp --organization         # All environments in org
```

### Destroy (⚠️ PERMANENT DELETION)
```bash
./manage-gcp-cicd.sh destroy-gcp --folder=FOLDER_ID     # All environments in folder
./manage-gcp-cicd.sh destroy-gcp --project=PROJECT_ID   # Single project
```

### Update Permissions
```bash
./manage-gcp-cicd.sh update-permissions --project=PROJECT_ID --user=USER_EMAIL
```

## Service Account Management

### Environment-Specific Service Accounts

Each environment now gets its own dedicated service account with:

- **Unique naming**: `tonic-{environment}-sa@{project-id}.iam.gserviceaccount.com`
- **Minimal permissions**: Only what's needed for that environment
- **Automated key generation**: Keys are created and stored in Secret Manager
- **Isolated access**: No cross-environment access

### Service Account Permissions

Each service account receives these roles:
- `roles/run.admin` - Cloud Run management
- `roles/secretmanager.secretAccessor` - Secret access
- `roles/iam.serviceAccountUser` - Service account usage
- `roles/storage.admin` - Container image management
- `roles/logging.logWriter` - Write logs
- `roles/monitoring.metricWriter` - Write metrics

### Secrets Automatically Populated

✅ **google-service-account-email**: Populated with actual SA email  
✅ **google-private-key**: Populated with generated private key  
⚠️ **working-spreadsheet-id**: Still needs environment-specific values  
⚠️ **operator-email**: Still needs your email address  
⚠️ **rock-band-class-ids**: Still needs class IDs  

## Extensibility Examples

### Adding a QA Environment

1. **Update Environment Configuration:**
```bash
# In manage-gcp-cicd.sh, add to ENVIRONMENTS array:
["qa"]="qa_branch:^qa$:QA environment for quality assurance testing"
```

2. **Run Setup:**
```bash
./manage-gcp-cicd.sh setup-gcp --folder=FOLDER_ID
```

This automatically creates:
- `tonic-qa-{unique-id}` project  
- `tonic-qa-sa@tonic-qa-{unique-id}.iam.gserviceaccount.com` service account
- QA-specific secrets and build triggers

### Creating Custom Environments

Use the template function for one-off environments:
```bash
# This would be added as a new command option
create_new_environment "demo" "feature_branch" "^demo-.*$" "Demo environment for feature branches" "$FOLDER_ID"
```

## Migration from Legacy System

### What Changed
- **Before**: Single Cloud Build service account used by all environments
- **After**: Dedicated service account per environment  
- **Before**: Manual service account key management
- **After**: Automated key generation and storage
- **Before**: Hard to add new environments  
- **After**: Add to config array and re-run setup

### Security Improvements
- ✅ **Environment isolation**: Each environment has its own service account
- ✅ **Principle of least privilege**: Minimal required permissions per environment
- ✅ **Automated key rotation**: Easier to regenerate keys per environment
- ✅ **Audit trail**: Clear separation of which environment did what

## See script help (`./manage-gcp-cicd.sh --help`) for all options and examples.
